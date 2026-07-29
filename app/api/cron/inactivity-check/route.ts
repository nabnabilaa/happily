import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isWibWeekend, sqlWibDate, SQL_WIB_TODAY } from "@/lib/timeUtils";

// GET: Cron endpoint — check for users who haven't completed any task in 3+ hours
// Spec v2: Nudge notification if no task activity after 3 hours since check-in
// Call this every 2-3 hours during work hours (e.g., 11:00, 14:00, 16:00)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Skip weekends (akhir pekan menurut WIB, bukan menurut jam server)
    if (isWibWeekend()) {
      return NextResponse.json({ message: "Weekend, skipping", sent: 0 });
    }

    const now = new Date();

    // Cari user yang: sudah check-in hari ini (WIB), belum check-out, belum ada
    // task selesai, dan belum di-nudge hari ini.
    //
    // Catatan: sebelum ini ada satu query pembuka yang hasilnya tidak pernah
    // dipakai, dan SQL-nya memuat placeholder `?` tanpa args — mysql2 melempar
    // error untuk itu, jadi endpoint ini selalu berakhir 500 dan nudge-nya tidak
    // pernah terkirim sama sekali. Query mati itu dihapus.
    let sent = 0;
    const results: string[] = [];

    const checkedInUsersRes = await db.execute(`
      SELECT u.id, u.name, a.check_in_at
      FROM users u
      JOIN attendance a ON u.id = a.user_id
        AND ${sqlWibDate('a.check_in_at')} = ${SQL_WIB_TODAY}
        AND a.check_out_at IS NULL
      WHERE u.role IN ('employee', 'manager')
    `);

    for (const user of checkedInUsersRes.rows) {
      const userId = String(user.id);
      const checkInTime = new Date(user.check_in_at as string);
      const hoursSinceCheckIn = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      // Only nudge if they've been checked in for 3+ hours
      if (hoursSinceCheckIn < 3) continue;

      // Check if they've had recent task activity
      const recentActivity = await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM daily_priorities
              WHERE user_id = ? AND is_done = 1
              AND ${sqlWibDate('created_at')} = ${SQL_WIB_TODAY}`,
        args: [userId]
      });

      const tasksDone = Number(recentActivity.rows[0]?.cnt) || 0;
      if (tasksDone > 0) continue; // They have activity, skip

      // Check if we already nudged today
      const alreadyNudged = await db.execute({
        sql: `SELECT id FROM notifications
              WHERE user_id = ? AND type = 'nudge'
              AND ${sqlWibDate('created_at')} = ${SQL_WIB_TODAY}`,
        args: [userId]
      });
      if (alreadyNudged.rows.length > 0) continue;

      // Send nudge
      const notifId = "n_nudge_" + Date.now().toString(36) + "_" + sent;
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [
          notifId, userId,
          "💡 Belum ada task selesai hari ini",
          `Kamu sudah ${Math.floor(hoursSinceCheckIn)} jam kerja tapi belum ada task yang dicentang. Yuk tambah task dan mulai kerjakan! 🚀`,
          'nudge'
        ]
      });
      sent++;
      results.push(`${user.name}: ${Math.floor(hoursSinceCheckIn)}h since check-in, 0 tasks done`);
    }

    return NextResponse.json({
      message: `Inactivity check complete. ${sent} nudge(s) sent.`,
      sent,
      results
    });
  } catch (error: any) {
    console.error("Cron Inactivity Error:", error);
    return NextResponse.json({ error: "Cron failed", details: error.message }, { status: 500 });
  }
}

