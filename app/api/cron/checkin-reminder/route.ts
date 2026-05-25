import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Cron endpoint — check who hasn't checked in, send reminders
// Call this at 08:15, 09:00, 10:00 via external cron/Vercel cron
// Example cron config in vercel.json: { "crons": [{ "path": "/api/cron/checkin-reminder", "schedule": "15 1 * * 1-5" }] }
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    // Simple auth to prevent abuse (set CRON_SECRET in .env.local)
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hour = new Date().getHours();

    // Get all users who haven't checked in today
    const absentRes = await db.execute(
      `SELECT u.id, u.name FROM users u 
       WHERE u.id NOT IN (
         SELECT a.user_id FROM attendance a WHERE DATE(a.check_in_at) = CURDATE()
       ) AND u.role != 'admin'`
    );

    if (absentRes.rows.length === 0) {
      return NextResponse.json({ message: "Semua sudah check-in", sent: 0 });
    }

    let title: string;
    let message: string;
    let type: string = 'reminder';

    if (hour < 9) {
      title = "🐝 Jangan lupa check-in hari ini!";
      message = "Selamat pagi! Yuk absen dulu sebelum mulai kerja.";
    } else if (hour < 10) {
      title = "⏰ Kamu belum check-in";
      message = "Sudah jam 9 nih, check-in sekarang yuk?";
    } else {
      title = "⚠️ Check-in kamu hari ini terlambat";
      message = "Segera lakukan check-in. Keterlambatan tercatat.";
      type = 'warning';
    }

    let sent = 0;
    for (const u of absentRes.rows) {
      const notifId = "n_cron_" + Date.now().toString(36) + "_" + sent;
      try {
        await db.execute({
          sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
          args: [notifId, String(u.id), title, message, type]
        });
        sent++;
      } catch (e) {
        // Skip duplicate notifications (same user, same day might already have one)
        console.warn(`Notification insert failed for ${u.id}:`, e);
      }
    }

    return NextResponse.json({ 
      message: `Reminder sent to ${sent} users`,
      sent,
      absentUsers: absentRes.rows.map(u => u.name)
    });
  } catch (error: any) {
    console.error("Cron Check-in Error:", error);
    return NextResponse.json({ error: "Cron failed", details: error.message }, { status: 500 });
  }
}

