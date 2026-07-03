import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { requesterId, targetUserId, newRole, jobTitle, department, name } = await request.json();

    if (!requesterId || !targetUserId) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Verify if requester is hr
    const requesterCheck = await db.execute({
      sql: "SELECT role FROM users WHERE id = ?",
      args: [requesterId]
    });

    const role = requesterCheck.rows[0]?.role;
    if (role !== 'hr') {
      return NextResponse.json({ error: "Unauthorized. Only HR can manage users." }, { status: 403 });
    }

    // Update fields
    if (name !== undefined) {
      await db.execute({
        sql: "UPDATE users SET name = ? WHERE id = ?",
        args: [name, targetUserId]
      });
    }

    if (newRole) {
      await db.execute({
        sql: "UPDATE users SET role = ?, user_role_context = ? WHERE id = ?",
        args: [newRole, newRole, targetUserId]
      });
    }



    if (jobTitle !== undefined) {
      await db.execute({
        sql: "UPDATE users SET job_title = ? WHERE id = ?",
        args: [jobTitle, targetUserId]
      });
    }

    if (department !== undefined) {
      await db.execute({
        sql: "UPDATE users SET department = ? WHERE id = ?",
        args: [department, targetUserId]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update User Error:", error);
    return NextResponse.json({ error: "Gagal update data user" }, { status: 500 });
  }
}
