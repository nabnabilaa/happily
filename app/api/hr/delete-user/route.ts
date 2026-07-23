import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequesterAccess, canHrAdmin } from '@/lib/hrAuth';

export async function POST(req: Request) {
  try {
    const { requesterId, targetUserId } = await req.json();

    if (!requesterId || !targetUserId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Verify requester can manage HR (role hr OR hr_access)
    const requester = await getRequesterAccess(requesterId);
    if (!canHrAdmin(requester.role, requester.hrAccess)) {
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
