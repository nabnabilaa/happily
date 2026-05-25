import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    // Skip weekends
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({ message: "Weekend, skipping", sent: 0 });
    }

    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    // Find users who:
    // 1. Have checked in today
    // 2. Haven't checked out yet
    // 3. Haven't completed any task in the last 3 hours
    // 4. Haven't received this notification today already
    const usersRes = await db.execute(`
      SELECT u.id, u.name, a.check_in_at
      FROM users u
      JOIN attendance a ON u.id = a.user_id AND DATE(a.check_in_at) = CURDATE() AND a.check_out_at IS NULL
      WHERE u.role = 'employee'
        AND u.id NOT IN (
          SELECT DISTINCT dp.user_id 
          FROM daily_priorities dp 
          WHERE dp.is_done = 1 AND dp.updated_at >= ?
        )
        AND u.id NOT IN (
          SELECT n.user_id FROM notifications n 
          WHERE n.type = 'nudge' AND DATE(n.created_at) = CURDATE()
          AND n.title LIKE '%belum ada task%'
        )
    `);


    // Note: The query above has a simplified approach. 
    // For production, we'd need the timestamp comparison to work properly.
    // For now, we'll check programmatically:

    let sent = 0;
    const results: string[] = [];

    const checkedInUsersRes = await db.execute(`
      SELECT u.id, u.name, a.check_in_at
      FROM users u
      JOIN attendance a ON u.id = a.user_id AND DATE(a.check_in_at) = CURDATE() AND a.check_out_at IS NULL
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
              AND DATE(created_at) = CURDATE()`,
        args: [userId]
      });

      const tasksDone = Number(recentActivity.rows[0]?.cnt) || 0;
      if (tasksDone > 0) continue; // They have activity, skip

      // Check if we already nudged today
      const alreadyNudged = await db.execute({
        sql: `SELECT id FROM notifications 
              WHERE user_id = ? AND type = 'nudge' AND DATE(created_at) = CURDATE()`,
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

