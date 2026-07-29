import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/notificationService';
import { SQL_WIB_TODAY } from '@/lib/timeUtils';

const CHALLENGE_TEMPLATES = [
  {
    title: "Selesaikan 1 KPI Merah",
    description: "Selesaikan setidaknya 1 task harian yang terhubung ke KPI berstatus 'At Risk' atau 'Behind'.",
    points: 150,
    target: 1
  },
  {
    title: "Check-in Mood Harian",
    description: "Lakukan check-in mood hari ini untuk memberitahu kami kondisimu.",
    points: 50,
    target: 1
  },
  {
    title: "Sesi Deep Work",
    description: "Selesaikan 1 sesi Focus (minimal 25 menit) hari ini.",
    points: 100,
    target: 1
  },
  {
    title: "Update 3 Task",
    description: "Update status atau progress minimal 3 task harianmu hari ini.",
    points: 75,
    target: 3
  },
  {
    title: "Apresiasi Rekan Kerja",
    description: "Berikan minimal 1 Kudos kepada rekan kerja di divisimu.",
    points: 80,
    target: 1
  }
];

export async function GET(request: Request) {
  // Authentication check (e.g. Vercel Cron header or custom secret)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Expire existing active challenges
    await db.execute({
      sql: `UPDATE active_challenges SET status = 'expired' WHERE status = 'active' AND expires_at < NOW()`,
      args: []
    });

    // 2. Fetch all active employees
    const usersRes = await db.execute({
      sql: `SELECT id FROM users WHERE role IN ('employee', 'manager') AND status = 'active'`,
      args: []
    });

    let assignedCount = 0;

    for (const user of usersRes.rows) {
      // 3. Assign 3 random challenges for the day
      const shuffled = [...CHALLENGE_TEMPLATES].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);

      for (const challenge of selected) {
        const id = "chal_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        await db.execute({
          // Kedaluwarsa tengah malam WIB. `expires_at` disimpan sebagai UTC,
          // jadi tengah malam WIB besok dikonversi balik ke UTC (= 17:00 hari
          // ini). Sebelumnya DATE_ADD(CURDATE(), 1) berarti tengah malam UTC,
          // alias jam 07:00 pagi WIB — tantangan mati di tengah jam kerja.
          sql: `INSERT INTO active_challenges (id, user_id, title, description, points, target, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, CONVERT_TZ(DATE_ADD(${SQL_WIB_TODAY}, INTERVAL 1 DAY), '+07:00', '+00:00'))`,
          args: [id, user.id, challenge.title, challenge.description, challenge.points, challenge.target]
        });
        assignedCount++;
      }
      
      // Dispatch notification
      try {
        await dispatchNotification(user.id, "daily_challenges_ready", {
          title: "Daily Quests Ready! 🎯",
          message: "Ada 3 tantangan baru untukmu hari ini. Selesaikan untuk dapatkan ekstra XP!"
        });
      } catch (e) {
        // ignore push errors
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Assigned ${assignedCount} challenges to ${usersRes.rows.length} users. Expired old challenges.`
    });
  } catch (error: any) {
    console.error("Daily Challenges Cron Error:", error);
    return NextResponse.json({ error: "Failed to process daily challenges", details: error.message }, { status: 500 });
  }
}
