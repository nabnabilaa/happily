import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Aggregate KPI data by department
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || String(new Date().getMonth() + 1);
    const year = searchParams.get("year") || String(new Date().getFullYear());

    // Get all departments
    const deptRes = await db.execute("SELECT DISTINCT name FROM departments ORDER BY name");
    
    const departments: any[] = [];

    for (const dept of deptRes.rows) {
      const deptName = String((dept as any).name);

      // Get users in this department
      const usersRes = await db.execute({
        sql: "SELECT id, name, job_title FROM users WHERE department = ?",
        args: [deptName]
      });

      const userIds = (usersRes.rows as any[]).map(u => u.id);
      if (userIds.length === 0) {
        departments.push({
          department: deptName,
          headcount: 0,
          totalKpis: 0,
          avgScore: 0,
          totalTasks: 0,
          approvedTasks: 0,
          users: []
        });
        continue;
      }

      // Get KPIs assigned to users in this department
      const placeholders = userIds.map(() => '?').join(',');
      const kpisRes = await db.execute({
        sql: `SELECT mk.*, u.name as assignee_name 
              FROM monthly_kpis mk
              JOIN users u ON mk.assigned_to = u.id
              WHERE mk.assigned_to IN (${placeholders}) AND mk.month = ? AND mk.year = ?`,
        args: [...userIds, Number(month), Number(year)]
      });

      const kpis = kpisRes.rows as any[];
      const scoredKpis = kpis.filter(k => k.final_score !== null);
      const avgScore = scoredKpis.length > 0
        ? Math.round(scoredKpis.reduce((sum, k) => sum + Number(k.final_score), 0) / scoredKpis.length)
        : 0;

      // Get task link stats
      const kpiIds = kpis.map(k => k.id);
      let totalTasks = 0;
      let approvedTasks = 0;

      if (kpiIds.length > 0) {
        const kpiPlaceholders = kpiIds.map(() => '?').join(',');
        const linksRes = await db.execute({
          sql: `SELECT status, COUNT(*) as cnt FROM task_kpi_links 
                WHERE kpi_id IN (${kpiPlaceholders}) GROUP BY status`,
          args: kpiIds
        });
        for (const row of linksRes.rows as any[]) {
          totalTasks += Number(row.cnt);
          if (row.status === 'approved') approvedTasks += Number(row.cnt);
        }
      }

      departments.push({
        department: deptName,
        headcount: userIds.length,
        totalKpis: kpis.length,
        avgScore,
        totalTasks,
        approvedTasks,
        users: (usersRes.rows as any[]).map(u => {
          const userKpis = kpis.filter(k => k.assigned_to === u.id);
          const userScored = userKpis.filter(k => k.final_score !== null);
          return {
            id: u.id,
            name: u.name,
            jobTitle: u.job_title,
            kpiCount: userKpis.length,
            avgScore: userScored.length > 0
              ? Math.round(userScored.reduce((s: number, k: any) => s + Number(k.final_score), 0) / userScored.length)
              : null,
          };
        })
      });
    }

    // Sort by headcount descending
    departments.sort((a, b) => b.headcount - a.headcount);

    return NextResponse.json({
      departments,
      month: Number(month),
      year: Number(year),
    });
  } catch (error: any) {
    console.error("KPI by Department Error:", error);
    return NextResponse.json({ error: "Failed", details: error.message }, { status: 500 });
  }
}

