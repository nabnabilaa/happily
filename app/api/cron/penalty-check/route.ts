import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Cron endpoint — check for inactive users and apply XP penalty
// Spec v2: −15 XP/day starting from day 4 of inactivity (3 consecutive work days without activity)
// Call this daily at 09:00 via cron
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Skip weekends
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({ message: "Weekend, skipping penalty check", penalized: 0 });
    }

    // Find users who have NOT had any attendance check-in for 3+ consecutive work days
    // We check by looking at the last check-in date per user
    const usersRes = await db.execute(`
      SELECT u.id, u.name, u.points,
             MAX(a.check_in_at) as last_checkin
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id
      WHERE u.role = 'employee' OR u.role = 'manager'
      GROUP BY u.id
    `);

    let penalized = 0;
    const penaltyAmount = 15;
    const thresholdDays = 3;
    const results: string[] = [];

    for (const user of usersRes.rows) {
      const lastCheckin = user.last_checkin ? new Date(user.last_checkin as string) : null;
      
      if (!lastCheckin) continue; // Never checked in, skip
      
      // Calculate work days since last check-in (excluding weekends)
      const diffMs = today.getTime() - lastCheckin.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      
      // Rough work-day calculation (exclude ~2 weekend days per 7)
      const workDaysSince = Math.floor(diffDays * 5 / 7);
      
      if (workDaysSince > thresholdDays) {
        // Check if we already penalized this user today
        const alreadyPenalized = await db.execute({
          sql: `SELECT id FROM xp_transactions 
                WHERE user_id = ? AND action_type = 'penalty_inactive' 
                AND DATE(created_at) = CURDATE()`,
          args: [String(user.id)]
        });
        
        if (alreadyPenalized.rows.length > 0) continue; // Already penalized today
        
        // Don't let points go below 0
        const currentPoints = Number(user.points) || 0;
        const actualPenalty = Math.min(penaltyAmount, currentPoints);
        
        if (actualPenalty <= 0) continue;
        
        // Apply penalty
        const txId = "tx_pen_" + Date.now().toString(36) + "_" + penalized;
        await db.execute({
          sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
          args: [txId, String(user.id), -actualPenalty, 'penalty_inactive', `Tidak aktif ${workDaysSince} hari kerja. -${actualPenalty} XP`]
        });
        
        await db.execute({
          sql: "UPDATE users SET points = points - ? WHERE id = ?",
          args: [actualPenalty, String(user.id)]
        });
        
        // Notify user
        const notifId = "n_pen_" + Date.now().toString(36) + "_" + penalized;
        await db.execute({
          sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
          args: [notifId, String(user.id), '⚠️ Penalti Tidak Aktif', `Kamu sudah tidak aktif ${workDaysSince} hari kerja. -${actualPenalty} XP. Yuk kembali aktif!`, 'warning']
        });
        
        penalized++;
        results.push(`${user.name}: -${actualPenalty} XP (${workDaysSince} hari tidak aktif)`);
      }
    }

    return NextResponse.json({ 
      message: `Penalty check complete. ${penalized} user(s) penalized.`,
      penalized,
      results
    });
  } catch (error: any) {
    console.error("Cron Penalty Error:", error);
    return NextResponse.json({ error: "Cron failed", details: error.message }, { status: 500 });
  }
}

