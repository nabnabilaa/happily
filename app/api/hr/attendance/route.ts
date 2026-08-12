import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wibDateString, sqlWibDate } from "@/lib/timeUtils";
import { getRequesterAccess, canManageTeam } from "@/lib/hrAuth";
import { requireActor } from "@/lib/apiAuth";

// GET: HR views attendance data for all employees
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Default "hari ini" mengikuti kalender WIB. Dengan tanggal UTC, HR yang
    // membuka halaman ini sebelum jam 07:00 WIB melihat data kemarin.
    const date = searchParams.get('date') || wibDateString();

    // Kehadiran seluruh karyawan — siapa hadir, siapa tidak, jam berapa — bukan
    // data yang boleh dibaca siapa saja yang menebak alamat endpoint-nya.
    // Identitas dari cookie sesi; `?requesterId=` lama diabaikan. Lihat
    // catatan lengkap di app/api/hr/users/route.ts.
    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;
    const requesterId = actor.userId;
    const requester = await getRequesterAccess(requesterId);
    if (!canManageTeam(requester.role, requester.hrAccess)) {
      return NextResponse.json({ error: "Hanya HR dan manajer yang bisa melihat data kehadiran" }, { status: 403 });
    }

    /*
     * Kolom "Tim" dibaca dari `users.department`, bukan dari tabel `teams`.
     *
     * Join lama `LEFT JOIN teams t ON u.team_id = t.id` mengandalkan kolom
     * peninggalan yang tinggal dimiliki 6 dari 80 akun, jadi hampir setiap baris
     * di layar kehadiran HR tertulis "Unassigned" — padahal departemennya
     * terisi dan tampil benar di layar lain.
     */
    const attendanceRes = await db.execute({
      sql: `SELECT a.*, u.name, u.job_title, u.department AS team_name
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            WHERE ${sqlWibDate('a.check_in_at')} = ?
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
    const allUsersRes = await db.execute("SELECT u.id, u.name, u.job_title, u.department AS team_name FROM users u");
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

