import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'ManagerId missing' }, { status: 400 });

    const membersRes = await db.execute({
      sql: `SELECT id FROM users WHERE manager_id = ?`,
      args: [userId]
    });

    const memberIds = membersRes.rows.map(m => String(m.id));
    if (memberIds.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const placeholders = memberIds.map(() => '?').join(',');

    const tasksRes = await db.execute({
      sql: `SELECT dp.*, u.name as user_name FROM daily_priorities dp 
            JOIN users u ON dp.user_id = u.id
            WHERE dp.user_id IN (${placeholders}) AND dp.status = 'pending_review'`,
      args: memberIds
    });

    const tasks = tasksRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      title: r.title,
      description: r.description,
      kpiId: r.kpi_id,
      goalTitle: r.goal_title,
      proofLink: r.proof_link,
      proofNotes: r.proof_notes,
      metricValue: r.metric_value,
      status: r.status,
      submittedAt: r.submitted_at || r.created_at,
    }));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Pending Tasks Error:", error);
    return NextResponse.json({ error: 'Failed to fetch pending tasks' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { taskId, status, notes } = await request.json();

    if (!taskId || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // status can be 'approved', 'revision', 'rejected'
    let is_done = 0;
    let is_verified = 0;
    if (status === 'approved') {
      is_done = 1;
      is_verified = 1;
    }

    await db.execute({
      sql: `UPDATE daily_priorities SET status = ?, is_done = ?, is_verified = ?, proof_notes = ? WHERE id = ?`,
      args: [status, is_done, is_verified, notes || null, taskId]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update Task Status Error:", error);
    return NextResponse.json({ error: 'Failed to update task status' }, { status: 500 });
  }
}
