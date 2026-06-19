import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'ManagerId missing' }, { status: 400 });

    // 1. Fetch Team Members (Direct Reports)
    const membersRes = await db.execute({
      sql: `SELECT u.*, 
            (SELECT mood_key FROM mood_checkins WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as mood,
            (SELECT COUNT(*) FROM daily_priorities WHERE user_id = u.id AND is_done = 1 AND DATE(created_at) = CURDATE()) as tasks_done,
            (SELECT COUNT(*) FROM daily_priorities WHERE user_id = u.id AND DATE(created_at) = CURDATE()) as tasks_total,
            (SELECT COUNT(*) FROM daily_priorities WHERE user_id = u.id AND is_done = 1) as all_tasks_done,
            (SELECT COUNT(*) FROM daily_priorities WHERE user_id = u.id) as all_tasks_total
            FROM users u WHERE u.manager_id = ?`,
      args: [userId]
    });

    const members = membersRes.rows.map(m => ({
      id: m.id,
      name: m.name,
      role: m.job_title || 'Team Member',
      mood: m.mood || 'neutral',
      wellbeing: m.mood === 'joy' ? 90 : m.mood === 'stress' ? 30 : 70,
      tasks: { done: Number(m.tasks_done), total: Number(m.tasks_total) },
      streak: m.streak || 0,
      status: Number(m.tasks_done) === Number(m.tasks_total) && Number(m.tasks_total) > 0 ? 'Excellent' : 'On track',
      statusTone: m.mood === 'stress' ? 'coral' : 'sage'
    }));

    // Legacy goals are replaced by KPIs, which are fetched separately via /api/kpi
    const goals: any[] = [];
    const approvals: any[] = [];

    const memberIdsOnly = members.map(m => String(m.id));
    const memberPlaceholders = memberIdsOnly.length > 0 ? memberIdsOnly.map(() => '?').join(',') : "''";

    // 4. Fetch Team Tasks (for verification)
    let teamTasks: any[] = [];
    if (memberIdsOnly.length > 0) {
      const tasksRes = await db.execute({
        sql: `SELECT dp.*, u.name as user_name FROM daily_priorities dp 
              JOIN users u ON dp.user_id = u.id
              WHERE dp.user_id IN (${memberPlaceholders})`,
        args: memberIdsOnly
      });
      teamTasks = tasksRes.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        title: r.title,
        goalId: r.kpi_id || r.goal_id,
        done: !!r.is_done,
        verified: !!r.is_verified,
        status: r.status,
        energy: r.energy_level,
        est: r.est_time,
        tone: r.tone,
        createdAt: r.created_at
      }));
    }

    return NextResponse.json({ members, goals, approvals, teamTasks });
  } catch (error) {
    console.error("Manager Dashboard Error:", error);
    return NextResponse.json({ error: 'Failed to fetch manager data' }, { status: 500 });
  }
}

