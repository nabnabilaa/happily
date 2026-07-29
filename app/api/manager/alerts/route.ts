import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveManagerTeam, placeholdersFor } from '@/lib/managerTeam';
import { AWAITING_REVIEW_SQL } from '@/lib/taskStatus';

const INACTIVITY_HOURS = 48;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId') || searchParams.get('userId');

    if (!managerId) {
      return NextResponse.json({ error: 'managerId required' }, { status: 400 });
    }

    const { memberIds } = await resolveManagerTeam(managerId);
    if (memberIds.length === 0) {
      return NextResponse.json({ alerts: [] });
    }

    const placeholders = placeholdersFor(memberIds);

    // The previous query selected `mood`, `energy` and `last_activity` from
    // `users` and filtered on the legacy `team_id`. None of those three columns
    // exist — the real ones are `mood_key` and `last_activity_at`, and there is
    // no energy column at all — so every call to this route threw ER_BAD_FIELD.
    const membersRes = await db.execute({
      sql: `SELECT u.id, u.name, u.last_activity_at,
            (SELECT mood_key FROM mood_checkins WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as mood_key,
            (SELECT COUNT(*) FROM daily_priorities dp WHERE dp.user_id = u.id AND ${AWAITING_REVIEW_SQL}) as awaiting_review
            FROM users u WHERE u.id IN (${placeholders})`,
      args: memberIds,
    });

    const alerts: any[] = [];
    const now = Date.now();

    for (const member of membersRes.rows) {
      const mood = member.mood_key as string | null;

      if (mood === 'burnout' || mood === 'stress' || mood === 'sad') {
        alerts.push({
          type: 'mood',
          userId: member.id,
          userName: member.name,
          message: `${member.name} melaporkan mood: ${mood}`,
          priority: mood === 'burnout' ? 'high' : 'medium',
        });
      }

      if (member.last_activity_at) {
        const lastAct = new Date(member.last_activity_at as string).getTime();
        if (!Number.isNaN(lastAct)) {
          const diffHours = (now - lastAct) / (1000 * 60 * 60);
          if (diffHours > INACTIVITY_HOURS) {
            alerts.push({
              type: 'inactivity',
              userId: member.id,
              userName: member.name,
              message: `${member.name} belum aktif selama lebih dari 2 hari.`,
              priority: 'medium',
            });
          }
        }
      }

      const awaiting = Number(member.awaiting_review) || 0;
      if (awaiting > 0) {
        alerts.push({
          type: 'pending_review',
          userId: member.id,
          userName: member.name,
          message: `${awaiting} tugas dari ${member.name} menunggu ACC kamu.`,
          priority: awaiting >= 5 ? 'high' : 'low',
          count: awaiting,
        });
      }
    }

    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3));

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error('Manager alerts fetch error:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}
