import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequesterAccess, canManageTeam } from "@/lib/hrAuth";

// GET: Fetch division report data for export (Logbook, KPI, Weekly target, Monthly summary)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('adminId') || searchParams.get('requesterId');
    const type = searchParams.get('type') || 'logbook'; // 'logbook' | 'kpi' | 'weekly' | 'monthly'
    const department = searchParams.get('department') || 'all';
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1;
    const year = Number(searchParams.get('year')) || new Date().getFullYear();

    if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await getRequesterAccess(requesterId);
    if (!canManageTeam(requester.role, requester.hrAccess)) {
      return NextResponse.json({ error: "Unauthorized. Hanya HR dan Manager yang dapat mengakses laporan." }, { status: 403 });
    }

    // Cakupan orang: HR/hr_access = semua; Manager = otomatis dibatasi ke anggota timnya.
    const isFullAccess = requester.role === 'hr' || requester.hrAccess;
    const managerScope = (!isFullAccess && requester.role === 'manager') ? requesterId : null;
    const userIdsParam = searchParams.get('userIds');
    const userIdList = userIdsParam ? userIdsParam.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Bangun filter user (prefix = alias tabel users, mis. 'u.').
    const userScope = (prefix: string) => {
      const parts: string[] = [];
      const a: any[] = [];
      if (managerScope) { parts.push(`${prefix}manager_id = ?`); a.push(managerScope); }
      if (userIdList.length) {
        parts.push(`${prefix}id IN (${userIdList.map(() => '?').join(',')})`);
        a.push(...userIdList);
      } else if (department !== 'all') {
        parts.push(`${prefix}department = ?`);
        a.push(department);
      }
      return { clause: parts.length ? ' AND ' + parts.join(' AND ') : '', args: a };
    };

    if (type === 'logbook') {
      let sql = `
        SELECT dp.id, dp.title, dp.description, dp.target_date, dp.due_date, dp.completed_at,
               dp.is_done, dp.is_verified, dp.status, dp.is_project,
               dp.energy_level, dp.est_time, dp.time_tracked, dp.partial_progress,
               dp.weekly_target_title, dp.goal_title, dp.proof_link, dp.proof_notes, dp.metric_value,
               dp.created_at,
               u.name as user_name, u.department
        FROM daily_priorities dp
        JOIN users u ON dp.user_id = u.id
        WHERE MONTH(COALESCE(dp.target_date, dp.created_at)) = ?
          AND YEAR(COALESCE(dp.target_date, dp.created_at)) = ?
      `;
      const args: any[] = [month, year];

      const scope = userScope('u.');
      sql += scope.clause;
      args.push(...scope.args);
      sql += " ORDER BY u.name ASC, COALESCE(dp.target_date, dp.created_at) DESC";

      const res = await db.execute({ sql, args });
      return NextResponse.json({ data: res.rows });
    }

    if (type === 'kpi') {
      let sql = `
        SELECT mk.id, mk.title, mk.target_description, mk.weight, mk.final_score, mk.status, mk.manager_notes,
               u.name as user_name, u.department
        FROM monthly_kpis mk
        JOIN users u ON mk.assigned_to = u.id
        WHERE mk.month = ? AND mk.year = ?
      `;
      const args: any[] = [month, year];

      const scope = userScope('u.');
      sql += scope.clause;
      args.push(...scope.args);
      sql += " ORDER BY u.name ASC, mk.created_at DESC";

      const res = await db.execute({ sql, args });
      return NextResponse.json({ data: res.rows });
    }

    if (type === 'weekly') {
      const week = Number(searchParams.get('week')) || 0; // 0 = semua minggu
      let sql = `
        SELECT wt.id, wt.title, wt.week_number, wt.target_value, wt.current_value, wt.metric_unit, wt.status, wt.created_at, wt.timeframe,
               mk.title as kpi_title, mk.weight as kpi_weight, u.name as user_name, u.department
        FROM weekly_targets wt
        JOIN monthly_kpis mk ON wt.kpi_id = mk.id
        JOIN users u ON mk.assigned_to = u.id
        WHERE mk.month = ? AND mk.year = ?
      `;
      const args: any[] = [month, year];
      if (week > 0) { sql += " AND wt.week_number = ?"; args.push(week); }

      const scope = userScope('u.');
      sql += scope.clause;
      args.push(...scope.args);
      sql += " ORDER BY u.name ASC, mk.title ASC, wt.week_number ASC";

      const res = await db.execute({ sql, args });
      return NextResponse.json({ data: res.rows });
    }

    if (type === 'monthly') {
      // Compile real-time monthly reports for all users in the division
      const mScope = userScope('u.');
      let usersSql = "SELECT u.id, u.name, u.department, u.job_title FROM users u WHERE 1=1" + mScope.clause;
      const usersArgs: any[] = [...mScope.args];
      usersSql += " ORDER BY u.name ASC";

      const usersRes = await db.execute({ sql: usersSql, args: usersArgs });
      const users = usersRes.rows as any[];

      const monthlyData: any[] = [];
      const totalWorkingDays = getWorkingDaysInMonth(month, year);

      for (const u of users) {
        // Get tasks stats
        const tasksRes = await db.execute({
          sql: `SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
                FROM daily_priorities WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
          args: [u.id, month, year]
        });

        // Get unique active days (tasks created days)
        const daysRes = await db.execute({
          sql: `SELECT COUNT(DISTINCT DATE(created_at)) as days
                FROM daily_priorities WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
          args: [u.id, month, year]
        });

        // Get attendance days
        const attendanceRes = await db.execute({
          sql: `SELECT COUNT(*) as days FROM attendance 
                WHERE user_id = ? AND MONTH(check_in_at) = ? AND YEAR(check_in_at) = ?`,
          args: [u.id, month, year]
        });

        // Get saved report. NB: monthly_reports has no quality_score column — it is always computed below.
        const reportRes = await db.execute({
          sql: "SELECT kpi_score, status, manager_summary FROM monthly_reports WHERE user_id = ? AND month = ? AND year = ?",
          args: [u.id, month, year]
        });

        // Get average KPI scores from actual monthly_kpis table
        const kpisRes = await db.execute({
          sql: `SELECT final_score, weight FROM monthly_kpis WHERE assigned_to = ? AND month = ? AND year = ?`,
          args: [u.id, month, year]
        });

        const totalTasks = Number(tasksRes.rows[0]?.total) || 0;
        const tasksCompleted = Number(tasksRes.rows[0]?.done) || 0;
        const activeDays = Number(daysRes.rows[0]?.days) || 0;
        const attendanceDays = Number(attendanceRes.rows[0]?.days) || 0;
        const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

        let computedKpiScore = 0;
        let totalWeight = 0;
        for (const k of kpisRes.rows as any[]) {
          if (k.final_score !== null) {
            computedKpiScore += (Number(k.final_score) * Number(k.weight)) / 100;
            totalWeight += Number(k.weight);
          }
        }
        if (totalWeight > 0) computedKpiScore = Math.round(computedKpiScore);

        const attendanceScore = Math.min(100, Math.round((attendanceDays / totalWorkingDays) * 100));
        const consistencyScore = Math.min(100, Math.round((activeDays / totalWorkingDays) * 100));
        const computedQualityScore = Math.round(attendanceScore * 0.3 + completionRate * 0.4 + consistencyScore * 0.3);

        const savedReport = reportRes.rows[0] as any;

        monthlyData.push({
          user_name: u.name,
          department: u.department,
          job_title: u.job_title,
          total_tasks: totalTasks,
          tasks_completed: tasksCompleted,
          active_days: Math.max(activeDays, attendanceDays),
          total_working_days: totalWorkingDays,
          kpi_score: savedReport && savedReport.kpi_score != null ? Number(savedReport.kpi_score) : computedKpiScore,
          quality_score: computedQualityScore,
          completion_rate: completionRate,
          attendance_days: attendanceDays,
          manager_summary: savedReport ? savedReport.manager_summary : '',
          status: savedReport ? savedReport.status : 'draft'
        });
      }

      return NextResponse.json({ data: monthlyData });
    }

    return NextResponse.json({ error: "Tipe laporan tidak didukung." }, { status: 400 });
  } catch (error: any) {
    console.error("Export API error:", error);
    return NextResponse.json({ error: "Gagal memproses data laporan", details: error.message }, { status: 500 });
  }
}

// Helper: Get exact working days in a month (excluding weekends)
function getWorkingDaysInMonth(month: number, year: number): number {
  let count = 0;
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    date.setDate(date.getDate() + 1);
  }
  return count || 22;
}
