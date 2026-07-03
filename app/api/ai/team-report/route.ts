import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/ai/team-report?managerId=X&type=weekly|monthly&month=M&year=Y
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId');
    const type = searchParams.get('type') || 'weekly';
    const month = Number(searchParams.get('month') || new Date().getMonth() + 1);
    const year = Number(searchParams.get('year') || new Date().getFullYear());

    if (!managerId) return NextResponse.json({ error: "managerId required" }, { status: 400 });

    const deptRes = await db.execute({ sql: "SELECT department FROM users WHERE id = ?", args: [managerId] });
    const managerDept = (deptRes.rows[0] as any)?.department || "";

    // 1. Team members
    const membersRes = await db.execute({
      sql: "SELECT id, name, department, job_title FROM users WHERE department = ? AND id != ? ORDER BY name ASC",
      args: [managerDept, managerId]
    });
    if (!membersRes.rows.length) return NextResponse.json({ members: [] });

    const memberIds = membersRes.rows.map(r => String(r.id));
    const inMembers = memberIds.map(() => '?').join(',');

    // 2. All KPIs for team this month
    const kpisRes = await db.execute({
      sql: `SELECT * FROM monthly_kpis WHERE assigned_to IN (${inMembers}) AND month = ? AND year = ? ORDER BY weight DESC`,
      args: [...memberIds, month, year]
    });
    const kpiIds = kpisRes.rows.map(r => String(r.id));

    // 3. All weekly targets for those KPIs
    let weeklyTargets: any[] = [];
    if (kpiIds.length > 0) {
      const inKpis = kpiIds.map(() => '?').join(',');
      const wtRes = await db.execute({
        sql: `SELECT * FROM weekly_targets WHERE kpi_id IN (${inKpis}) ORDER BY week_number ASC, created_at ASC`,
        args: kpiIds
      });
      weeklyTargets = wtRes.rows as any[];
    }
    const wtIds = weeklyTargets.map(r => String(r.id));

    // 4. Tasks linked to weekly targets
    let tasksByWt: any[] = [];
    if (wtIds.length > 0) {
      const inWts = wtIds.map(() => '?').join(',');
      const tRes = await db.execute({
        sql: `SELECT id, title, is_done, is_verified, status, description, proof_link, proof_notes,
                     metric_value, partial_progress, created_at, completed_at,
                     weekly_target_id, kpi_id, user_id
              FROM daily_priorities
              WHERE weekly_target_id IN (${inWts})
              ORDER BY created_at DESC`,
        args: wtIds
      });
      tasksByWt = tRes.rows as any[];
    }

    // 5. Tasks linked to KPI but no weekly target (unlinked)
    let unlinkedTasks: any[] = [];
    if (kpiIds.length > 0) {
      const inKpis = kpiIds.map(() => '?').join(',');
      const utRes = await db.execute({
        sql: `SELECT id, title, is_done, is_verified, status, description, proof_link, proof_notes,
                     metric_value, created_at, completed_at, kpi_id, user_id
              FROM daily_priorities
              WHERE kpi_id IN (${inKpis})
                AND (weekly_target_id IS NULL OR weekly_target_id = '')
                AND MONTH(created_at) = ? AND YEAR(created_at) = ?
              ORDER BY created_at DESC`,
        args: [...kpiIds, month, year]
      });
      unlinkedTasks = utRes.rows as any[];
    }

    // 6. AI weekly summaries for this month
    const weekSumRes = await db.execute({
      sql: `SELECT * FROM ai_weekly_summaries WHERE user_id IN (${inMembers}) AND MONTH(week_start) = ? AND YEAR(week_start) = ? ORDER BY week_start ASC`,
      args: [...memberIds, month, year]
    });

    // 7. AI monthly analysis (if exists)
    let monthlyAnalyses: any[] = [];
    try {
      const maRes = await db.execute({
        sql: `SELECT * FROM ai_monthly_analyses WHERE user_id IN (${inMembers}) AND month = ? AND year = ?`,
        args: [...memberIds, month, year]
      });
      monthlyAnalyses = maRes.rows as any[];
    } catch { /* table may not exist yet */ }

    // Helper: parse proof links
    const parseLinks = (raw: any): string[] => {
      if (!raw) return [];
      try {
        const v = JSON.parse(String(raw));
        return Array.isArray(v) ? v.filter(Boolean) : (raw ? [String(raw)] : []);
      } catch { return raw ? [String(raw)] : []; }
    };

    // Assemble per member
    const members = membersRes.rows.map(member => {
      const uid = String(member.id);

      const memberKpis = kpisRes.rows
        .filter(k => String(k.assigned_to) === uid)
        .map(kpi => {
          const kpiId = String(kpi.id);
          const wts = weeklyTargets
            .filter(wt => String(wt.kpi_id) === kpiId)
            .map(wt => {
              const wtId = String(wt.id);
              const tv = Number(wt.target_value) || 100;
              const cv = Number(wt.current_value) || 0;
              const tasks = tasksByWt
                .filter(t => String(t.weekly_target_id) === wtId)
                .map(t => ({
                  id: String(t.id),
                  title: t.title,
                  done: !!t.is_done,
                  verified: !!t.is_verified,
                  status: t.status,
                  description: t.description || null,
                  notes: t.proof_notes || null,
                  proofLinks: parseLinks(t.proof_link),
                  metricValue: t.metric_value ? Number(t.metric_value) : null,
                  partialProgress: Number(t.partial_progress) || 0,
                  createdAt: t.created_at,
                  completedAt: t.completed_at || null,
                }));
              return {
                id: wtId,
                weekNumber: Number(wt.week_number),
                title: wt.title,
                description: wt.description || null,
                targetValue: tv,
                currentValue: cv,
                progress: tv > 0 ? Math.min(100, Math.round((cv / tv) * 100)) : 0,
                metricUnit: wt.metric_unit || '%',
                status: wt.status,
                tasks,
              };
            });

          const kpiProgress = wts.length > 0
            ? Math.round(wts.reduce((s, wt) => s + wt.progress, 0) / wts.length)
            : (kpi.final_score ? Number(kpi.final_score) : 0);

          const unlinked = unlinkedTasks
            .filter(t => String(t.kpi_id) === kpiId && String(t.user_id) === uid)
            .map(t => ({
              id: String(t.id),
              title: t.title,
              done: !!t.is_done,
              verified: !!t.is_verified,
              status: t.status,
              notes: t.proof_notes || null,
              proofLinks: parseLinks(t.proof_link),
              createdAt: t.created_at,
            }));

          return {
            id: kpiId,
            title: kpi.title,
            weight: Number(kpi.weight),
            status: kpi.status,
            progress: kpiProgress,
            weeklyTargets: wts,
            unlinkedTasks: unlinked,
          };
        });

      const aiWeekly = (weekSumRes.rows as any[])
        .filter(s => String(s.user_id) === uid)
        .map(s => ({
          weekStart: s.week_start,
          weekEnd: s.week_end,
          text: s.summary_text,
          score: Number(s.score) || 0,
        }));

      const aiMonthly = monthlyAnalyses.find(a => String(a.user_id) === uid);

      return {
        id: uid,
        name: member.name,
        department: member.department,
        jobTitle: member.job_title,
        kpis: memberKpis,
        aiWeeklySummaries: aiWeekly,
        aiMonthlyAnalysis: aiMonthly?.analysis_text || null,
      };
    });

    return NextResponse.json({ success: true, type, month, year, members });
  } catch (error: any) {
    console.error("Team Report Error:", error);
    return NextResponse.json({ error: "Gagal memuat laporan tim", details: error.message }, { status: 500 });
  }
}
