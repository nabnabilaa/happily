import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

export async function POST(request: Request) {
  try {
    const { userId, mood, notes } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    // Find today's open attendance record
    const todayRecord = await db.execute({
      sql: `SELECT id, check_in_at FROM attendance 
            WHERE user_id = ? AND DATE(check_in_at) = CURDATE() AND check_out_at IS NULL
            ORDER BY check_in_at DESC LIMIT 1`,
      args: [userId]
    });

    if (todayRecord.rows.length === 0) {
      return NextResponse.json({ error: "Tidak ada record check-in hari ini yang belum clock-out" }, { status: 404 });
    }

    const record = todayRecord.rows[0] as any;
    const checkInAt = new Date(record.check_in_at);
    const checkOutAt = new Date();
    const durationMinutes = Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000);

    // Determine status based on duration and work schedule
    let status = 'present';
    if (durationMinutes < 240) { // Less than 4 hours
      status = 'early_leave';
    }

    // Update attendance record with check-out time, duration, and mood
    await db.execute({
      sql: `UPDATE attendance 
            SET check_out_at = NOW(), 
                duration_minutes = ?,
                status = ?,
                mood = COALESCE(?, mood)
            WHERE id = ?`,
      args: [durationMinutes, status, mood || null, record.id]
    });

    // Award XP for completing the workday — Spec v2: +5 XP
    try {
      await db.execute({
        sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
        args: [
          "tx_co_" + Date.now().toString(36), 
          userId, 
          5, 
          "check_out", 
          `Clock-out · ${Math.floor(durationMinutes / 60)}j${durationMinutes % 60}m kerja`
        ]
      });
      await db.execute({
        sql: "UPDATE users SET points = points + 5 WHERE id = ?",
        args: [userId]
      });
    } catch (e) {
      console.warn("XP award error on checkout:", e);
    }

    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;

    // Fetch today's XP total for the summary
    let todayXP = 0;
    try {
      const xpRes = await db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total 
              FROM xp_transactions 
              WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
        args: [userId]
      });
      todayXP = Number(xpRes.rows[0]?.total) || 0;
    } catch (e) { /* ignore */ }

    // Auto-create daily logbook summary entry
    try {
      const existingLog = await db.execute({
        sql: `SELECT id FROM logbook_entries 
              WHERE user_id = ? AND type = 'daily_summary' AND DATE(created_at) = CURDATE()`,
        args: [userId]
      });
      
      if (existingLog.rows.length === 0) {
        const logId = "log_" + Date.now().toString(36);
        await db.execute({
          sql: `INSERT INTO logbook_entries (id, user_id, type, title, content, metadata_json) 
                VALUES (?, ?, 'daily_summary', ?, ?, ?)`,
          args: [
            logId, userId,
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

