import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { goalId } = await request.json();
    if (!goalId) return NextResponse.json({ error: 'goalId missing' }, { status: 400 });

    await db.execute({
      sql: `DELETE FROM goals WHERE id = ?`,
      args: [String(goalId)]
    });

    // Also delete sub_goals
    await db.execute({
      sql: `DELETE FROM sub_goals WHERE goal_id = ?`,
      args: [String(goalId)]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Goal deletion error:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}

