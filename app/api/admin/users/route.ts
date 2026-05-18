import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('adminId') || searchParams.get('requesterId');

    if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roleCheck = await db.execute({
      sql: "SELECT role FROM users WHERE id = ?",
      args: [requesterId]
    });

    const role = roleCheck.rows[0]?.role;
    if (role !== 'hr' && role !== 'manager') {
      return NextResponse.json({ error: "Unauthorized. Only HR and Managers can view user lists." }, { status: 403 });
    }

    const res = await db.execute("SELECT id, name, email, role, level, points, job_title, department, manager_id, password_hash, avatar_image FROM users ORDER BY created_at DESC");
    
    return NextResponse.json({ users: res.rows });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
