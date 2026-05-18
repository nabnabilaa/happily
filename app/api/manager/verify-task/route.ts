import { NextResponse } from 'next/server';
import { db } from '@/lib/turso';

export async function POST(request: Request) {
  try {
    const { taskId, goalId, managerId } = await request.json();

    if (!taskId) return NextResponse.json({ error: 'TaskId missing' }, { status: 400 });

    // 1. Mark task as verified
    await db.execute({
      sql: "UPDATE daily_priorities SET is_verified = 1, is_done = 1 WHERE id = ?",
      args: [taskId]
    });

    // 2. Recalculate progress for the goal
    if (goalId) {
      const allTasksRes = await db.execute({
        sql: "SELECT is_verified FROM daily_priorities WHERE goal_id = ?",
        args: [goalId]
      });
      
      const totalTasks = allTasksRes.rows.length;
      const verifiedTasks = allTasksRes.rows.filter(r => r.is_verified === 1).length;
      
      const newProgress = totalTasks > 0 ? Math.round((verifiedTasks / totalTasks) * 100) : 0;
      
      await db.execute({
        sql: "UPDATE goals SET progress = ?, metric = ? WHERE id = ?",
        args: [newProgress, `${verifiedTasks}/${totalTasks} verified`, goalId]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Verify Task Error:", error);
    return NextResponse.json({ error: 'Failed to verify task', details: error.message }, { status: 500 });
  }
}
