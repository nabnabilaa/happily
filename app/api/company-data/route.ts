import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/apiAuth";

/**
 * Data milik SELURUH perusahaan, dipisahkan dari `GET /api/storage`.
 *
 * ── Kenapa dipisah ──────────────────────────────────────────────────────────
 *
 * Katalog hadiah, materi belajar, kontak, jadwal kerja, dan konfigurasi
 * onboarding sama untuk semua orang dan nyaris tidak pernah berubah. Sampai
 * sekarang kelimanya ikut dikirim pada SETIAP `GET /api/storage` — dan GET itu
 * dijalankan ulang oleh setiap event `refresh`, yang dipicu oleh setiap
 * penyimpanan. Satu perubahan mood berarti mengirim ulang seluruh katalog
 * hadiah kepada orang yang sudah memilikinya.
 *
 * ── Kenapa ETag, bukan sekadar max-age ──────────────────────────────────────
 *
 * `max-age` saja berarti perubahan yang dibuat HR baru terlihat setelah jendela
 * itu habis. ETag membuat browser bertanya "masih sama?" dan menerima 304 tanpa
 * badan pesan kalau ya — jadi perubahan tetap terlihat cepat, tapi yang lewat
 * kabel hanya beberapa puluh byte.
 *
 * `private` karena balasannya bergantung pada sesi yang sah; ia tidak boleh
 * mengendap di cache bersama milik proxy.
 */
export async function GET(request: Request) {
  try {
    // Katalog internal perusahaan — bukan untuk publik.
    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;

    const [settingsRes, rewardsRes, learningRes] = await Promise.all([
      db.execute("SELECT `key`, value FROM global_settings"),
      db.execute("SELECT id, title, points_cost, category, tone, glyph, description, stock FROM rewards"),
      db.execute("SELECT id, title, description, type, url, tone, estimated_minutes FROM learning_items")
        .catch(() => ({ rows: [] as Record<string, unknown>[] })),
    ]);

    let contacts: unknown[] = [];
    let workSchedule: Record<string, string> = {
      start: "08:00", end: "17:00", breakStart: "12:00", breakEnd: "13:00",
    };
    let onboardingConfig: unknown[] | null = null;
    let companyValues: unknown[] = [];

    for (const r of settingsRes.rows) {
      const key = String(r.key);
      const raw = r.value;
      if (!raw) continue;
      try {
        if (key === "contacts") contacts = JSON.parse(raw as string);
        else if (key === "work_schedule") workSchedule = JSON.parse(raw as string);
        else if (key === "onboardingConfig") onboardingConfig = JSON.parse(raw as string);
        else if (key === "companyValues") companyValues = JSON.parse(raw as string);
      } catch {
        // Satu setelan yang rusak formatnya tidak boleh menjatuhkan sisanya.
        console.warn(`[company-data] Nilai global_settings '${key}' bukan JSON yang sah`);
      }
    }

    /*
     * Bentuknya HARUS sama persis dengan yang dulu dikirim `GET /api/storage`,
     * termasuk `Number()`-nya.
     *
     * Alasannya bukan kerapian: `POST /api/storage` merekonsiliasi tabel
     * `rewards` terhadap payload dari klien HR dan MENGHAPUS baris yang tidak
     * ada di sana. Klien HR mengisi `state.rewards` dari endpoint ini, jadi
     * selisih bentuk apa pun di sini berakhir sebagai perubahan pada katalog
     * hadiah seluruh perusahaan.
     */
    const rewards = rewardsRes.rows.map((r) => ({
      id: r.id,
      title: r.title,
      points: Number(r.points_cost),
      category: r.category,
      tone: r.tone,
      glyph: r.glyph,
      description: r.description,
      stock: Number(r.stock),
    }));

    const learning = learningRes.rows.map((r) => ({
      id: r.id, title: r.title, description: r.description,
      type: r.type, url: r.url, tone: r.tone || "blue",
      estimatedMinutes: r.estimated_minutes || 30,
    }));

    const payload = { rewards, learning, contacts, workSchedule, onboardingConfig, companyValues };
    const bodyText = JSON.stringify(payload);
    const etag = `"${crypto.createHash("sha1").update(bodyText).digest("base64url")}"`;

    // Browser mengirim balik ETag yang ia simpan; kalau isinya tidak berubah,
    // cukup 304 tanpa badan pesan.
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, "Cache-Control": "private, max-age=0, must-revalidate" },
      });
    }

    return new NextResponse(bodyText, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Company data error:", error);
    return NextResponse.json({ error: "Gagal memuat data perusahaan" }, { status: 500 });
  }
}
