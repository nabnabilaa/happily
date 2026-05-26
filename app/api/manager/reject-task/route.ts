import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/notificationService';

export async function POST(request: Request) {
  try {
    const { taskId, managerId, action } = await request.json(); // action: 'reject' | 'revision'

    if (!taskId || !action) {
      return NextResponse.json({ error: 'TaskId and action missing' }, { status: 400 });
    }

    // This is essentially just calling verify-task with action=reject/revision,
    // but we have it as a separate endpoint if needed by the frontend specifically.
    // Let's redirect logic internally to the same flow or duplicate it cleanly.
    
    // Fetch task and employee details for notification
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

    // Update status
    await db.execute({
      sql: "UPDATE daily_priorities SET is_verified = 0, is_done = 0, status = ? WHERE id = ?",
      args: [action, taskId]
    });

    const notifType = action === 'reject' ? 'task_rejected' : 'task_revision';
    await dispatchNotification(employeeId, notifType, {
      task_title: taskTitle,
      manager_name: managerName
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reject/Revision Task Error:", error);
    return NextResponse.json({ error: 'Failed to process task', details: error.message }, { status: 500 });
  }
}
