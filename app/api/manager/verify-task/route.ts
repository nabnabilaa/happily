import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/notificationService';

export async function POST(request: Request) {
  try {
    const { taskId, goalId, managerId, action = 'approve' } = await request.json();

    if (!taskId) return NextResponse.json({ error: 'TaskId missing' }, { status: 400 });

    // 0. Fetch task and employee details for notification
    const taskRes = await db.execute({
      sql: "SELECT user_id, title FROM daily_priorities WHERE id = ?",
      args: [taskId]
    });
    const taskRow = taskRes.rows[0];

    if (!taskRow) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const employeeId = taskRow.user_id;
    const taskTitle = taskRow.title;

    let managerName = "Manager";
    if (managerId) {
      const mgrRes = await db.execute({
        sql: "SELECT name FROM users WHERE id = ?",
        args: [managerId]
      });
      if (mgrRes.rows.length > 0) {
        managerName = mgrRes.rows[0].name || "Manager";
      }
    }

    if (action === 'approve') {
      // 1. Mark task as verified
      await db.execute({
        sql: "UPDATE daily_priorities SET is_verified = 1, is_done = 1, status = 'approved' WHERE id = ?",
        args: [taskId]
      });

      // 2. Recalculate progress for the goal
      if (goalId) {
        // Trigger generic rollup which recalculates progress up the tree
        const { triggerRollupForGoal } = await import('@/lib/rollup');
        await triggerRollupForGoal(goalId);
      }

      // 3. Dispatch Notification to Employee
      await dispatchNotification(employeeId, "task_approved", {
        task_title: taskTitle,
        manager_name: managerName
      });

      // 4. Award XP via API
      try {
        const origin = new URL(request.url).origin;
        await fetch(`${origin}/api/xp/award`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: managerId,
            targetUserId: employeeId,
            actionType: 'task_approved',
            description: `Task disetujui: ${taskTitle}`
          })
        });
      } catch (e) {
        console.warn("Failed to award XP:", e);
      }
    } else if (action === 'reject' || action === 'revision') {
      // Handle reject/revision
      await db.execute({
        sql: "UPDATE daily_priorities SET is_verified = 0, is_done = 0, status = ? WHERE id = ?",
        args: [action, taskId]
      });

      const notifType = action === 'reject' ? 'task_rejected' : 'task_revision';
      await dispatchNotification(employeeId, notifType, {
        task_title: taskTitle,
        manager_name: managerName
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Verify Task Error:", error);
    return NextResponse.json({ error: 'Failed to process task', details: error.message }, { status: 500 });
  }
}

