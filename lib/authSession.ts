import crypto from "crypto";
import { markViewer } from "@/lib/viewerContext";

/**
 * Lapisan sesi server minimal.
 *
 * Sebelum ini, identitas user sepenuhnya berasal dari `localStorage` di browser
 * dan dikirim sebagai `userId` di body request. Artinya siapa pun bisa mengaku
 * sebagai siapa pun: memberi poin ke dirinya sendiri, membubarkan ruang fokus
 * orang lain, atau menendang rekan dari sesi yang bukan miliknya.
 *
 * Cookie di sini ditandatangani HMAC-SHA256, httpOnly, dan menjadi satu-satunya
 * sumber identitas untuk endpoint yang memakai `getAuthUserId`. Body request
 * tidak pernah lagi dipercaya untuk menentukan SIAPA yang bertindak.
 *
 * Catatan cakupan: cookie ini diterbitkan saat login dan dipakai ketat oleh
 * seluruh endpoint `/api/focus/*` dan jalur poin sesi fokus. Endpoint lama
 * lainnya masih membaca `userId` dari body — memigrasinya adalah pekerjaan
 * terpisah yang menyentuh puluhan route, dan `getAuthUserId` di sini adalah
 * pintu masuk yang sudah siap dipakai saat migrasi itu dikerjakan.
 */

const COOKIE_NAME = "fb_session";
const MAX_AGE_SECS = 60 * 60 * 24 * 30; // 30 hari

let cachedSecret: string | null = null;

function getSecret(): string {
  if (cachedSecret) return cachedSecret;

  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) {
    cachedSecret = secret;
    return cachedSecret;
  }

  // Fallback produksi: turunkan kunci dari secret yang SUDAH pasti ada di
  // server. Sebelumnya di sini `throw`, dan itu membuat setiap login yang
  // kredensialnya BENAR balas 500 — gagalnya terjadi setelah verifikasi
  // berhasil, jadi tidak pernah terlihat di dev maupun saat password salah.
  //
  // Kenapa diturunkan, bukan string hardcoded seperti project lain: string di
  // source code bisa dibaca siapa pun yang punya akses repo, dan siapa pun yang
  // membacanya bisa menandatangani cookie sesi atas nama user mana pun. Nilai di
  // bawah tidak pernah masuk git dan tetap stabil antar restart maupun antar
  // instance, jadi cookie yang sudah terbit tidak ikut hangus.
  const material = [
    process.env.MYSQL_URI,
    process.env.MYSQL_PASSWORD,
    process.env.MAXY_SERVICE_KEY,
    process.env.GOOGLE_CLIENT_SECRET,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  if (material.length > 0) {
    cachedSecret = crypto
      .createHmac("sha256", material.join("|"))
      .update("flowbee-session-key-v1")
      .digest("base64url");
    return cachedSecret;
  }

  if (process.env.NODE_ENV === "production") {
    // Sampai di sini artinya kredensial DB DAN service key Maxy sama-sama kosong:
    // aplikasinya memang belum terkonfigurasi, login akan gagal di query pertama
    // jauh sebelum baris ini pun. Gagal keras di sini lebih jelas daripada
    // menerbitkan sesi yang ditandatangani nilai yang bisa ditebak.
    throw new Error(
      "SESSION_SECRET kosong dan tidak ada secret lain untuk menurunkannya di environment produksi."
    );
  }

  cachedSecret = "flowbee-dev-only-session-secret-do-not-use-in-production";
  return cachedSecret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface SessionPayload {
  uid: string;
  iat: number;
  exp: number;
}

/** Membuat nilai cookie bertanda tangan untuk seorang user. */
export function createSessionToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { uid: String(userId), iat: now, exp: now + MAX_AGE_SECS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

/** Memverifikasi token; mengembalikan null kalau rusak, dipalsukan, atau kedaluwarsa. */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, sign(encoded))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload?.uid || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

/**
 * Satu-satunya cara sah untuk mengetahui siapa yang memanggil sebuah endpoint.
 * Mengembalikan null kalau tidak ada sesi valid — pemanggil harus membalas 401.
 *
 * Sekaligus menandai permintaan ini sebagai milik user tersebut, supaya mode
 * review bisa mengecualikan identitas penonton dari penyamaran. Ditaruh di sini
 * karena inilah satu-satunya tempat cookie sesi dibaca — route tidak perlu ingat
 * melakukannya sendiri. Lihat lib/viewerContext.ts.
 */
export function getAuthUserId(request: Request): string | null {
  const uid = verifySessionToken(readCookie(request, COOKIE_NAME))?.uid ?? null;
  markViewer(uid);
  return uid;
}

/** Atribut cookie sesi, dipakai lewat `response.cookies.set(...)`. */
export function sessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECS,
  };
}

export function clearedSessionCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: 0 };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

// ── Panggilan internal server-ke-server ─────────────────────────────────────

const INTERNAL_HEADER = "x-internal-token";

/**
 * Beberapa route memanggil route lain lewat HTTP (mis. kudos dan review task
 * memanggil pemberian poin). Panggilan itu tidak membawa cookie siapa pun, jadi
 * tanpa penanda seperti ini kita harus memilih antara mematahkannya atau
 * membiarkan jalur tanpa-cookie tetap terbuka untuk siapa saja — dan jalur
 * tanpa-cookie itulah yang membuat identitas bisa dipalsukan dari browser
 * dengan `credentials: 'omit'`.
 */
export function internalToken(): string {
  return process.env.INTERNAL_API_TOKEN || sign("flowbee-internal:" + getSecret());
}

export function internalHeaders(): Record<string, string> {
  return { [INTERNAL_HEADER]: internalToken() };
}

export function isInternalRequest(request: Request): boolean {
  const supplied = request.headers.get(INTERNAL_HEADER);
  if (!supplied) return false;
  try {
    return safeEqual(supplied, internalToken());
  } catch {
    return false;
  }
}
