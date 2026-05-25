import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { requesterId, targetUserId } = await req.json();

    if (!requesterId || !targetUserId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Verify requester is an HR/Admin
    const adminResult = await db.execute({
      sql: "SELECT role FROM users WHERE id = ?",
      args: [requesterId]
    });
    
    const adminUser = adminResult.rows[0];
    
    if (!adminUser || adminUser.role !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized. HR access required.' }, { status: 403 });
    }

    // 2. Delete the user
    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [targetUserId]
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

