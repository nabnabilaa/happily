import { NextResponse } from "next/server";
import { getAuthUserId, isInternalRequest } from "@/lib/authSession";
import { getRequesterAccess, canHrAdmin } from "@/lib/hrAuth";

/**
 * Menjadikan cookie sesi satu-satunya sumber identitas.
 *
 * Sebagian besar route lama menerima `requesterId`/`userId`/`managerId` dari
 * body atau query, lalu memeriksa PERAN ORANG YANG DISEBUT ITU. Pemeriksaannya
 * benar; yang salah adalah siapa yang diperiksa. Akibatnya terbukti runtime:
 * karyawan biasa cukup menyebut id HR untuk membaca 101 baris user berikut
 * email, mengangkat dirinya jadi HR, atau menghapus akun siapa pun.
 *
 * Helper di sini menutup celah itu tanpa mengubah bentuk request: klien boleh
 * tetap mengirim id seperti biasa, tapi yang dipakai selalu id dari cookie.
 *
 * Pola pemakaian di route:
 *
 *   const actor = await requireActor(request);
 *   if ("response" in actor) return actor.response;
 *   // actor.userId sekarang tepercaya
 */

export interface Actor {
  /** Id user yang benar-benar memanggil, dari cookie sesi. */
  userId: string;
  /** True kalau panggilan datang dari route lain lewat token internal. */
  internal: boolean;
}

type ActorResult = Actor | { response: NextResponse };

/**
 * Identitas pemanggil, atau balasan 401 yang siap dikembalikan.
 *
 * Panggilan internal antar-route (kudos → poin, review task → poin) tidak
 * membawa cookie siapa pun dan dikenali lewat token internal. Untuk jalur itu
 * `claimedId` dipercaya, karena pengirimnya adalah server ini sendiri.
 */
export async function requireActor(
  request: Request,
  claimedId?: unknown
): Promise<ActorResult> {
  if (isInternalRequest(request)) {
    return { userId: claimedId ? String(claimedId) : "", internal: true };
  }

  const sessionUserId = getAuthUserId(request);
  if (!sessionUserId) {
    return {
      response: NextResponse.json(
        { error: "Sesi kamu sudah tidak berlaku. Silakan login ulang.", needsReauth: true },
        { status: 401 }
      ),
    };
  }

  return { userId: String(sessionUserId), internal: false };
}

/**
 * Seperti `requireActor`, tapi juga menolak pemanggil yang bukan HR-Admin.
 *
 * `hr_access` diperlakukan setara peran `hr` — itu memang gunanya: employee
 * atau manajer yang dititipi konsol HR membuka antrean yang sama.
 */
export async function requireHrAdmin(
  request: Request,
  claimedId?: unknown
): Promise<ActorResult> {
  const actor = await requireActor(request, claimedId);
  if ("response" in actor) return actor;
  if (actor.internal) return actor;

  const { role, hrAccess } = await getRequesterAccess(actor.userId);
  if (!canHrAdmin(role, hrAccess)) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized. HR access required." },
        { status: 403 }
      ),
    };
  }
  return actor;
}

/**
 * Menolak permintaan yang mencoba bertindak atas nama orang lain.
 *
 * Dipakai di route milik-sendiri (catatan, mood, storage, absensi): klien
 * boleh mengirim `userId`, tapi kalau isinya bukan dirinya sendiri itu upaya
 * mengakses data orang lain — kecuali pemanggilnya HR-Admin, yang memang
 * berhak melihat lintas orang.
 */
export async function requireSelfOrHrAdmin(
  request: Request,
  targetUserId: unknown
): Promise<ActorResult> {
  const actor = await requireActor(request, targetUserId);
  if ("response" in actor) return actor;
  if (actor.internal) return actor;

  const target = targetUserId ? String(targetUserId) : "";
  if (!target || target === actor.userId) return actor;

  const { role, hrAccess } = await getRequesterAccess(actor.userId);
  if (canHrAdmin(role, hrAccess)) return actor;

  return {
    response: NextResponse.json(
      { error: "Kamu hanya bisa mengakses datamu sendiri." },
      { status: 403 }
    ),
  };
}
