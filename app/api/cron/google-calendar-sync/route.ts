import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { db } from "@/lib/db";
import { syncUserCalendar, googleOAuthConfigured } from "@/lib/googleCalendar";

/**
 * Sinkronisasi terjadwal untuk semua integrasi yang aktif.
 *
 * Ini yang membuat janji "otomatis" benar-benar otomatis: meeting yang dibuat
 * di Google Calendar pagi ini sudah ada di Flowbee sebelum user membukanya,
 * jadi pengingat dan status "sedang meeting" ikut menyala tepat waktu. Tanpa
 * cron, sinkronisasi hanya terjadi saat tab Kalender kebetulan dibuka.
 *
 * Contoh vercel.json: { "path": "/api/cron/google-calendar-sync", "schedule": "*\/15 * * * *" }
 */
export async function GET(request: Request) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!googleOAuthConfigured()) {
      return NextResponse.json({ message: "Google OAuth belum dikonfigurasi", synced: 0 });
    }

    // Integrasi yang sudah ditandai `needs_reconsent` sengaja dilewati: tokennya
    // pasti ditolak lagi, dan mencobanya tiap 15 menit hanya menambah panggilan
    // gagal ke Google untuk user yang toh harus memberi izin ulang lewat UI.
    const res = await db.execute(
      `SELECT user_id FROM google_integrations WHERE status = 'active' ORDER BY last_synced_at IS NULL DESC, last_synced_at ASC LIMIT 200`
    );

    let synced = 0;
    let failed = 0;
    const needsReconsent: string[] = [];

    for (const row of res.rows) {
      const userId = String(row.user_id);
      try {
        const result = await syncUserCalendar(userId);
        if (result.status === "ok") synced++;
        else if (result.status === "needs_reconsent") needsReconsent.push(userId);
        else failed++;
      } catch (e) {
        failed++;
        console.error(`Cron sync gagal untuk ${userId}:`, e);
      }
    }

    return NextResponse.json({
      message: "Sinkronisasi Google Calendar selesai",
      total: res.rows.length,
      synced,
      failed,
      needsReconsent: needsReconsent.length,
    });
  } catch (error: any) {
    console.error("Cron Google Calendar sync error:", error);
    return NextResponse.json({ error: "Gagal menjalankan sinkronisasi" }, { status: 500 });
  }
}
