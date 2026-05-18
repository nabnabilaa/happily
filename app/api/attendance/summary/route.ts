import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

// GET attendance summary for a user or department
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const targetUserId = searchParams.get("targetUserId");
    const month = searchParams.get("month") || String(new Date().getMonth() + 1);
    const year = searchParams.get("year") || String(new Date().getFullYear());

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const viewUserId = targetUserId || userId;

    // Get attendance records for the month
    const logsRes = await db.execute({
      sql: `SELECT check_in_at, check_out_at, duration_minutes, status, check_in_type
            FROM attendance 
            WHERE user_id = ? AND MONTH(check_in_at) = ? AND YEAR(check_in_at) = ?
            ORDER BY check_in_at ASC`,
      args: [viewUserId, Number(month), Number(year)]
    });

    const logs = logsRes.rows as any[];

    // Calculate summary
    const totalDays = logs.length;
    const totalMinutes = logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
    const presentDays = logs.filter(l => l.status === 'present' || !l.status).length;
    const lateDays = logs.filter(l => l.status === 'late').length;
    const earlyLeaveDays = logs.filter(l => l.status === 'early_leave').length;
    const wfoDays = logs.filter(l => l.check_in_type === 'WFO').length;
    const wfaDays = logs.filter(l => l.check_in_type === 'WFA').length;
    const dinasDays = logs.filter(l => l.check_in_type === 'DINAS').length;
    const withCheckout = logs.filter(l => l.check_out_at).length;

    // Calculate working days in month (exclude weekends)
    const monthNum = Number(month);
    const yearNum = Number(year);
    let workingDays = 0;
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(yearNum, monthNum - 1, d).getDay();
      if (day !== 0 && day !== 6) workingDays++;
    }

    // Today's status
    const todayRes = await db.execute({
      sql: `SELECT id, check_in_at, check_out_at, duration_minutes, check_in_type, mood
            FROM attendance 
            WHERE user_id = ? AND DATE(check_in_at) = CURDATE()
            ORDER BY check_in_at DESC LIMIT 1`,
      args: [viewUserId]
    });

    const todayRecord = todayRes.rows.length > 0 ? todayRes.rows[0] : null;
    let todayStatus: 'not_checked_in' | 'checked_in' | 'checked_out' = 'not_checked_in';
    if (todayRecord) {
      todayStatus = (todayRecord as any).check_out_at ? 'checked_out' : 'checked_in';
    }

    return NextResponse.json({
      summary: {
        totalDays,
        workingDays,
        presentDays,
        lateDays,
        earlyLeaveDays,
        alphaDays: Math.max(0, workingDays - totalDays),
        totalMinutes,
        avgMinutesPerDay: avgMinutes,
        avgHoursFormatted: `${Math.floor(avgMinutes / 60)}j ${avgMinutes % 60}m`,
        totalHoursFormatted: `${Math.floor(totalMinutes / 60)}j ${totalMinutes % 60}m`,
        wfoDays,
        wfaDays,
        dinasDays,
        completionRate: workingDays > 0 ? Math.round((totalDays / workingDays) * 100) : 0,
        withCheckout,
      },
      today: todayRecord ? {
        status: todayStatus,
        checkInAt: (todayRecord as any).check_in_at,
        checkOutAt: (todayRecord as any).check_out_at,
        duration: (todayRecord as any).duration_minutes,
        type: (todayRecord as any).check_in_type,
        mood: (todayRecord as any).mood,
      } : {
        status: todayStatus,
      },
      month: Number(month),
      year: Number(year),
    });
  } catch (error: any) {
    console.error("Attendance Summary Error:", error);
    return NextResponse.json({ error: "Failed", details: error.message }, { status: 500 });
  }
}
