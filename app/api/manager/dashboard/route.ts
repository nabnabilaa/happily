import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveManagerTeam, placeholdersFor } from '@/lib/managerTeam';
import { AWAITING_REVIEW_SQL, isAwaitingReview, normalizeTaskStatus } from '@/lib/taskStatus';
import { sqlTaskWibDay, SQL_WIB_TODAY } from '@/lib/timeUtils';
import { requireSelfOrHrAdmin } from "@/lib/apiAuth";

/** How far back the team task board reaches, in days. */
const TASK_WINDOW_DAYS = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Identitas dari cookie sesi. Dashboard manajer memuat data seluruh timnya.
    const access = await requireSelfOrHrAdmin(request, userId);
    if ("response" in access) return access.response;
    const windowDays = Number(searchParams.get('windowDays')) || TASK_WINDOW_DAYS;

    if (!userId) return NextResponse.json({ error: 'ManagerId missing' }, { status: 400 });

    const { memberIds, department } = await resolveManagerTeam(userId);

    if (memberIds.length === 0) {
      return NextResponse.json({ members: [], goals: [], approvals: [], teamTasks: [], department });
    }

    const memberPlaceholders = placeholdersFor(memberIds);

    // 1. Team members, with today's task counts and their latest mood check-in.
    const membersRes = await db.execute({
      sql: `SELECT u.id, u.name, u.job_title, u.streak, u.role,
            (SELECT mood_key FROM mood_checkins WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as mood,
            (SELECT created_at FROM mood_checkins WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as mood_at,
            (SELECT COUNT(*) FROM daily_priorities WHERE user_id = u.id AND is_done = 1 AND ${sqlTaskWibDay()} = ${SQL_WIB_TODAY}) as tasks_done,
            (SELECT COUNT(*) FROM daily_priorities WHERE user_id = u.id AND ${sqlTaskWibDay()} = ${SQL_WIB_TODAY}) as tasks_total,
            (SELECT COUNT(*) FROM daily_priorities dp WHERE dp.user_id = u.id AND ${AWAITING_REVIEW_SQL}) as tasks_awaiting_review
            FROM users u WHERE u.id IN (${memberPlaceholders})`,
      args: memberIds,
    });

    const members = membersRes.rows.map(m => {
      const done = Number(m.tasks_done) || 0;
      const total = Number(m.tasks_total) || 0;
      const mood = (m.mood as string) || null;
      return {
        id: m.id,
        name: m.name,
        role: m.job_title || 'Team Member',
        mood: mood || 'neutral',
        // Null rather than a fabricated 70: the members list renders a
        // percentage bar, and inventing one for someone who never checked in
        // reads as real data.
        wellbeing: moodToWellbeing(mood),
        moodAt: m.mood_at || null,
        tasks: { done, total, awaitingReview: Number(m.tasks_awaiting_review) || 0 },
        streak: Number(m.streak) || 0,
        status: deriveStatus(done, total, mood),
        statusTone: deriveStatusTone(done, total, mood),
      };
    });

    // 2. Team KPIs — these back the "avg progress" ring and the approvals queue
    //    on the manager home screen, both of which used to read a hardcoded [].
    const now = new Date();
    const kpisRes = await db.execute({
      sql: `SELECT k.*, u.name as assignee_name
            FROM monthly_kpis k
            LEFT JOIN users u ON k.assigned_to = u.id
            WHERE k.assigned_to IN (${memberPlaceholders}) AND k.month = ? AND k.year = ?
            ORDER BY k.weight DESC`,
      args: [...memberIds, now.getMonth() + 1, now.getFullYear()],
    });

    const goals = kpisRes.rows.map(k => {
      const target = Number(k.metric_target) || 0;
      const current = Number(k.metric_current) || 0;
      const progress = k.final_score !== null && k.final_score !== undefined
        ? Math.round(Number(k.final_score))
        : target > 0
          ? Math.min(100, Math.round((current / target) * 100))
          : 0;

      return {
        id: String(k.id),
        title: k.title,
        progress,
        metric: k.target_description || `${current}/${target} ${k.metric_unit || ''}`.trim(),
        weight: Number(k.weight) || 0,
        ownerId: String(k.assigned_to),
        owner: k.assignee_name || 'Team Member',
        assignedById: k.assigned_by ? String(k.assigned_by) : null,
        scope: k.scope || 'assigned',
        status: k.status || 'active',
        reviewStatus: k.review_status || null,
        is_kpi: true,
        isApiKpi: true,
      };
    });

    // A KPI is "awaiting the manager" when it is not yet active, or when a
    // review flagged it and nobody has cleared the flag.
    const approvals = goals.filter(g => g.status === 'pending' || g.status === 'draft');

    // 3. Team tasks. Scoped to a rolling window plus anything still open or
    //    still awaiting an ACC — this used to return every task ever created by
    //    every member, which is what made the board unusable.
    const tasksRes = await db.execute({
      sql: `SELECT dp.*, u.name as user_name FROM daily_priorities dp
            JOIN users u ON dp.user_id = u.id
            WHERE dp.user_id IN (${memberPlaceholders})
              AND (
                dp.created_at >= CONVERT_TZ(DATE_SUB(${SQL_WIB_TODAY}, INTERVAL ? DAY), '+07:00', '+00:00')
                OR dp.is_done = 0
                OR ${AWAITING_REVIEW_SQL}
              )
            ORDER BY COALESCE(dp.submitted_at, dp.completed_at, dp.created_at) DESC`,
      args: [...memberIds, windowDays],
    });

    const teamTasks = tasksRes.rows.map(r => {
      const base = {
        done: !!r.is_done,
        verified: !!r.is_verified,
        status: normalizeTaskStatus(r.status),
      };
      return {
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        title: r.title,
        goalId: r.kpi_id || r.goal_id,
        goalTitle: r.goal_title || null,
        weekly_target_id: r.weekly_target_id,
        weeklyTargetId: r.weekly_target_id,
        ...base,
        awaitingReview: isAwaitingReview(base),
        energy: r.energy_level,
        est: r.est_time,
        tone: r.tone,
        createdAt: r.created_at,
        submittedAt: r.submitted_at || r.completed_at || null,
        completedAt: r.completed_at || null,
        partial_progress: Number(r.partial_progress) || 0,
        partialProgress: Number(r.partial_progress) || 0,
        description: r.description || null,
        notes: r.proof_notes || null,
        reviewNote: r.review_note || null,
        reviewedAt: r.reviewed_at || null,
        metricValue: r.metric_value !== null && r.metric_value !== undefined ? Number(r.metric_value) : null,
        proofLinks: parseProofLinks(r.proof_link),
      };
    });

    return NextResponse.json({ members, goals, approvals, teamTasks, department });
  } catch (error) {
    console.error("Manager Dashboard Error:", error);
    return NextResponse.json({ error: 'Failed to fetch manager data' }, { status: 500 });
  }
}

function moodToWellbeing(mood: string | null): number | null {
  if (!mood) return null;
  switch (mood) {
    case 'joy': return 90;
    case 'calm': return 80;
    case 'neutral': return 65;
    case 'tired': return 45;
    case 'stress': return 30;
    case 'burnout': return 15;
    default: return 65;
  }
}

function deriveStatus(done: number, total: number, mood: string | null): string {
  if (mood === 'burnout' || mood === 'stress') return 'Perlu perhatian';
  if (total === 0) return 'Belum mulai';
  if (done === total) return 'Excellent';
  if (done / total >= 0.5) return 'On track';
  return 'Tertinggal';
}

function deriveStatusTone(done: number, total: number, mood: string | null): string {
  if (mood === 'burnout' || mood === 'stress') return 'coral';
  if (total === 0) return 'yellow';
  if (done === total) return 'sage';
  if (done / total >= 0.5) return 'sage';
  return 'yellow';
}

function parseProofLinks(raw: any): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw as string);
    return Array.isArray(v) ? v : [raw];
  } catch {
    return [raw];
  }
}
