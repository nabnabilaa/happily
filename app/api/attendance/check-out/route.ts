import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hpEventEmitter } from "@/lib/events";
import { awardPoints, refFor } from "@/lib/points";
import { wibDateString } from "@/lib/timeUtils";
import { requireSelfOrHrAdmin } from "@/lib/apiAuth";

export async function POST(request: Request) {
  try {
    const { userId, mood, notes } = await request.json();

    // Identitas dari cookie sesi. Clock-out atas nama orang lain memalsukan catatan kehadiran.
    const access = await requireSelfOrHrAdmin(request, userId);
    if ("response" in access) return access.response;

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    // Find today's open attendance record
    const todayRecord = await db.execute({
      sql: `SELECT id, check_in_at FROM attendance 
            WHERE user_id = ? AND DATE(CONVERT_TZ(check_in_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')) AND check_out_at IS NULL
            ORDER BY check_in_at DESC LIMIT 1`,
      args: [userId]
    });

    if (todayRecord.rows.length === 0) {
      return NextResponse.json({ error: "Tidak ada record check-in hari ini yang belum clock-out" }, { status: 404 });
    }

    const record = todayRecord.rows[0] as any;
    // Update attendance record with check-out time, duration, and mood using DB time
    await db.execute({
      sql: `UPDATE attendance 
            SET check_out_at = UTC_TIMESTAMP(), 
                duration_minutes = TIMESTAMPDIFF(MINUTE, check_in_at, UTC_TIMESTAMP()),
                status = CASE WHEN TIMESTAMPDIFF(MINUTE, check_in_at, UTC_TIMESTAMP()) < 240 THEN 'early_leave' ELSE 'present' END,
                mood = COALESCE(?, mood)
            WHERE id = ?`,
      args: [mood || null, record.id]
    });

    const updated = await db.execute({
      sql: `SELECT check_out_at, duration_minutes, status FROM attendance WHERE id = ?`,
      args: [record.id]
    });

    /*
     * `check_out_at` tidak selalu berupa string.
     *
     * Driver mysql2 mengembalikan kolom DATETIME sebagai objek `Date`, jadi
     * `.endsWith()` melempar "TypeError: o.endsWith is not a function". Karena
     * lemparan itu terjadi SETELAH UPDATE di atas berhasil, akibatnya paling
     * membingungkan: jam pulang benar-benar tersimpan, tapi pemakai melihat
     * "Gagal check-out" — dan seluruh kode di bawah ini, termasuk poin
     * "tutup hari", tidak pernah dijalankan.
     *
     * Ditangani untuk kedua bentuk: string "YYYY-MM-DD HH:MM:SS" dari driver
     * yang mengembalikan teks diperlakukan sebagai UTC, sesuai UTC_TIMESTAMP()
     * yang menulisnya.
     */
    const rawCheckOut = updated.rows[0].check_out_at as unknown;
    const checkOutAt =
      rawCheckOut instanceof Date
        ? rawCheckOut
        : new Date(
            String(rawCheckOut).endsWith('Z')
              ? String(rawCheckOut)
              : String(rawCheckOut).replace(' ', 'T') + 'Z'
          );
    const durationMinutes = Number(updated.rows[0].duration_minutes);
    let status = updated.rows[0].status as string;

    // Poin menutup hari kerja.
    //
    // "Tutup Hari" dulu dibayar DUA KALI: 5 poin di sini plus 20 poin dari
    // ReflectModal lewat `daily_reflection`, padahal keduanya satu kejadian yang
    // sama di mata user. Sekarang keduanya memakai aksi `tutup_hari` dengan
    // kunci tanggal WIB yang sama, jadi yang duluan jalan itulah yang dibayar
    // dan yang kedua jadi no-op.
    //
    // Blok lama juga menulis `UPDATE users SET points = points + 5` langsung —
    // melewati kuota, dan hanya menaikkan `points` tanpa `coins`, sehingga
    // saldo belanja diam-diam tertinggal dari poin.
    try {
      await awardPoints({
        userId,
        action: "tutup_hari",
        refId: refFor.day(wibDateString()),
        description: `Clock-out · ${Math.floor(durationMinutes / 60)}j${durationMinutes % 60}m kerja`,
      });
    } catch (e) {
      console.warn("Gagal memberi poin tutup hari:", e);
    }

    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;

    // Fetch today's XP total for the summary
    let todayXP = 0;
    try {
      const xpRes = await db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total 
              FROM xp_transactions 
              WHERE user_id = ? AND DATE(CONVERT_TZ(created_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))`,
        args: [userId]
      });
      todayXP = Number(xpRes.rows[0]?.total) || 0;
    } catch (e) { /* ignore */ }

    // Auto-create daily logbook summary entry
    try {
      const existingLog = await db.execute({
        sql: `SELECT id FROM logbook_entries 
              WHERE user_id = ? AND type = 'daily_summary' AND DATE(CONVERT_TZ(created_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))`,
        args: [userId]
      });
      
      if (existingLog.rows.length === 0) {
        // `id` dilepas ke AUTO_INCREMENT: kolomnya INT, dan "log_<base36>" yang
        // dulu dikirim di sini selalu ditolak. Lihat lib/points.ts.
        await db.execute({
          sql: `INSERT INTO logbook_entries (user_id, type, title, content, metadata_json)
                VALUES (?, 'daily_summary', ?, ?, ?)`,
          args: [
            userId,
            `Ringkasan Hari — ${hours}j ${mins}m kerja`,
            notes || '',
            JSON.stringify({
              duration: durationMinutes,
              checkIn: record.check_in_at,
              checkOut: new Date().toISOString(),
              todayXP,
              mood: mood || null,
            })
          ]
        });
      }
    } catch (e) {
      console.warn("Auto-logbook error:", e);
    }

    // Emit db_update to trigger real-time SSE refresh for all active clients
    try {
      hpEventEmitter.emit("db_update", { type: "refresh", timestamp: Date.now() });
    } catch (sseErr) {
      console.warn("Failed to emit checkout SSE event:", sseErr);
    }

    return NextResponse.json({ 
      success: true, 
      durationMinutes,
      durationFormatted: `${hours}j ${mins}m`,
      checkInAt: record.check_in_at,
      checkOutAt: checkOutAt.toISOString(),
      status,
      todayXP,
    });
  } catch (error: any) {
    console.error("Check-out Error:", error);
    return NextResponse.json({ error: "Gagal check-out", details: error.message }, { status: 500 });
  }
}


