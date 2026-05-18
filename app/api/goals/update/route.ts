import { NextResponse } from 'next/server';
import { db } from '@/lib/turso';

export async function POST(request: Request) {
  try {
    const { goalId, updates } = await request.json();
    if (!goalId) return NextResponse.json({ error: 'goalId missing' }, { status: 400 });

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

    if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    args.push(String(goalId));

    await db.execute({
      sql: `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`,
      args
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Goal update error:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}
