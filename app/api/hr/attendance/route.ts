import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: HR views attendance data for all employees
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    // Today's attendance with user info
    const attendanceRes = await db.execute({
      sql: `SELECT a.*, u.name, u.job_title, u.team_id, t.name as team_name
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN teams t ON u.team_id = t.id
            WHERE DATE(a.check_in_at) = ?
            ORDER BY a.check_in_at ASC`,
      args: [date]
    });

    const checkedIn = attendanceRes.rows.map(r => ({
      userId: r.user_id,
      name: r.name,
      jobTitle: r.job_title,
      team: r.team_name || 'Unassigned',
      checkIn: r.check_in_at,
      checkOut: r.check_out_at,
      type: r.check_in_type || 'WFO',
      mood: r.mood,
      isLate: false, // Can be calculated from work schedule
    }));

    // Users who haven't checked in
    const allUsersRes = await db.execute("SELECT u.id, u.name, u.job_title, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id");
    const checkedInIds = new Set(checkedIn.map(c => c.userId));
    const notCheckedIn = allUsersRes.rows
      .filter(u => !checkedInIds.has(u.id))
      .map(u => ({
        userId: u.id,
        name: u.name,
        jobTitle: u.job_title,
        team: u.team_name || 'Unassigned',
      }));

    return NextResponse.json({
      date,
      summary: {
        total: allUsersRes.rows.length,
        present: checkedIn.length,
        absent: notCheckedIn.length,
        wfo: checkedIn.filter(c => c.type === 'WFO').length,
        wfa: checkedIn.filter(c => c.type === 'WFA').length,
      },
      checkedIn,
      notCheckedIn
    });
  } catch (error: any) {
    console.error("HR Attendance Error:", error);
    return NextResponse.json({ error: "Gagal memuat data absensi", details: error.message }, { status: 500 });
  }
}

