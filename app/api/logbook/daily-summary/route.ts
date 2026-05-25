import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Aggregate daily data for logbook calendar
// Params: userId (required), month (1-12), year (2024+)
// Returns: array of day summaries for the month
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const specificDate = searchParams.get('date'); // optional: get one day's detail

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // If requesting a specific date detail
    if (specificDate) {
      return await getDayDetail(userId, specificDate);
    }

    // Monthly overview: one summary per day
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    // 1. Attendance data
    const attendanceRes = await db.execute({
      sql: `SELECT DATE(check_in_at) as d, 
                   check_in_at, check_out_at, check_in_type, duration_minutes, status, mood
            FROM attendance 
            WHERE user_id = ? AND DATE(check_in_at) BETWEEN ? AND ?
            ORDER BY check_in_at ASC`,
      args: [userId, startDate, endDate]
    });

    // 2. Mood check-ins
    const moodRes = await db.execute({
      sql: `SELECT DATE(created_at) as d, mood, energy
            FROM mood_checkins 
            WHERE user_id = ? AND DATE(created_at) BETWEEN ? AND ?`,
      args: [userId, startDate, endDate]
    });

    // 3. XP transactions
    const xpRes = await db.execute({
      sql: `SELECT DATE(created_at) as d, SUM(amount) as total_xp, COUNT(*) as action_count
            FROM xp_transactions 
            WHERE user_id = ? AND DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)`,
      args: [userId, startDate, endDate]
    });

    // 4. Logbook entries count per day
    const logbookRes = await db.execute({
      sql: `SELECT DATE(created_at) as d, COUNT(*) as entry_count
            FROM logbook_entries 
            WHERE user_id = ? AND DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)`,
      args: [userId, startDate, endDate]
    });

    // Build day-by-day map
    const dayMap: Record<string, any> = {};
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, i).getDay();
      dayMap[dateStr] = {
        date: dateStr,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        attendance: null,
        mood: null,
        energy: null,
        totalXP: 0,
        actionCount: 0,
        logbookEntries: 0,
        // Status: 'present' | 'late' | 'absent' | 'sick' | 'izin' | 'cuti' | 'weekend' | 'future'
        status: dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 
                new Date(dateStr) > new Date() ? 'future' : 'absent',
      };
    }

    // Fill attendance
    for (const row of attendanceRes.rows) {
      const d = String(row.d);
      if (dayMap[d]) {
        const type = String(row.check_in_type || 'WFO').toUpperCase();
        dayMap[d].attendance = {
          checkIn: row.check_in_at,
          checkOut: row.check_out_at,
          type,
          duration: row.duration_minutes,
          mood: row.mood,
        };
        // Determine status
        if (['SICK', 'SAKIT'].includes(type)) dayMap[d].status = 'sick';
        else if (['IZIN'].includes(type)) dayMap[d].status = 'izin';
        else if (['CUTI'].includes(type)) dayMap[d].status = 'cuti';
        else dayMap[d].status = 'present';
      }
    }

    // Fill mood
    for (const row of moodRes.rows) {
      const d = String(row.d);
      if (dayMap[d]) {
        dayMap[d].mood = row.mood;
        dayMap[d].energy = row.energy;
      }
    }

    // Fill XP
    for (const row of xpRes.rows) {
      const d = String(row.d);
      if (dayMap[d]) {
        dayMap[d].totalXP = Number(row.total_xp) || 0;
        dayMap[d].actionCount = Number(row.action_count) || 0;
      }
    }

    // Fill logbook
    for (const row of logbookRes.rows) {
      const d = String(row.d);
      if (dayMap[d]) {
        dayMap[d].logbookEntries = Number(row.entry_count) || 0;
      }
    }

    const days = Object.values(dayMap);

    // Month summary
    const presentDays = days.filter(d => d.status === 'present').length;
    const absentDays = days.filter(d => d.status === 'absent').length;
    const sickDays = days.filter(d => d.status === 'sick').length;
    const totalXP = days.reduce((sum, d) => sum + d.totalXP, 0);

    return NextResponse.json({
      month, year,
      days,
      summary: {
        present: presentDays,
        absent: absentDays,
        sick: sickDays,
        izin: days.filter(d => d.status === 'izin').length,
        cuti: days.filter(d => d.status === 'cuti').length,
        totalXP,
        workDays: days.filter(d => !d.isWeekend && d.status !== 'future').length,
      }
    });
  } catch (error: any) {
    console.error("Daily Summary Error:", error);
    return NextResponse.json({ error: "Failed to load daily summary", details: error.message }, { status: 500 });
  }
}

// Get detailed data for a specific day
async function getDayDetail(userId: string, date: string) {
  // 1. Attendance
  const attRes = await db.execute({
    sql: `SELECT * FROM attendance WHERE user_id = ? AND DATE(check_in_at) = ?`,
    args: [userId, date]
  });

  // 2. Mood
  const moodRes = await db.execute({
    sql: `SELECT * FROM mood_checkins WHERE user_id = ? AND DATE(created_at) = ?`,
    args: [userId, date]
  });

  // 3. XP breakdown
  const xpRes = await db.execute({
    sql: `SELECT action_type, amount, description, created_at 
          FROM xp_transactions WHERE user_id = ? AND DATE(created_at) = ?
          ORDER BY created_at ASC`,
    args: [userId, date]
  });

  // 4. Logbook entries
  const logRes = await db.execute({
    sql: `SELECT * FROM logbook_entries WHERE user_id = ? AND DATE(created_at) = ?
          ORDER BY created_at ASC`,
    args: [userId, date]
  });

  return NextResponse.json({
    date,
    attendance: attRes.rows[0] || null,
    mood: moodRes.rows[0] || null,
    xpBreakdown: xpRes.rows,
    totalXP: xpRes.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    logbookEntries: logRes.rows,
  });
}

