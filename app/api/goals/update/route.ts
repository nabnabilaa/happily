import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/notificationService';

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: Request) {
  try {
    const { goalId, updates } = await request.json();
    if (!goalId) return NextResponse.json({ error: 'goalId missing' }, { status: 400, headers: getCorsHeaders(request) });

    // 0. Fetch Goal info before update for notification dispatching
    const goalRes = await db.execute({
      sql: "SELECT owner_id, title, assigned_by_id FROM goals WHERE id = ?",
      args: [String(goalId)]
    });
    const goalRow = goalRes.rows[0];

    const fields: string[] = [];
    const args: any[] = [];

    if (updates.progress !== undefined) {
      fields.push('progress = ?');
      args.push(updates.progress);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      args.push(updates.status);
    }

    if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: getCorsHeaders(request) });

    args.push(String(goalId));

    await db.execute({
      sql: `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`,
      args
    });

    // 1. Dispatch Notification on status changes
    if (updates.status !== undefined && goalRow) {
      const employeeId = goalRow.owner_id;
      const goalTitle = goalRow.title;
      const managerId = goalRow.assigned_by_id;
      
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

      let triggerKey = "";
      if (updates.status === 'approved') triggerKey = 'task_approved';
      else if (updates.status === 'revision') triggerKey = 'task_revision';
      else if (updates.status === 'rejected') triggerKey = 'task_rejected';

      if (triggerKey) {
        await dispatchNotification(employeeId, triggerKey, {
          task_title: goalTitle,
          manager_name: managerName
        });
      }
    }

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(request) });
  } catch (error: any) {
    console.error('Goal update error:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500, headers: getCorsHeaders(request) });
  }
}

