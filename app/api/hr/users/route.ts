import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequesterAccess, canManageTeam } from "@/lib/hrAuth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('adminId') || searchParams.get('requesterId');

    if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await getRequesterAccess(requesterId);
    if (!canManageTeam(requester.role, requester.hrAccess)) {
      return NextResponse.json({ error: "Unauthorized. Only HR and Managers can view user lists." }, { status: 403 });
    }

    // SELECT * agar aman jika kolom hr_access belum dimigrasi (kolom hilang → undefined).
    const res = await db.execute("SELECT * FROM users ORDER BY created_at DESC");
    
    return NextResponse.json({ users: res.rows });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
