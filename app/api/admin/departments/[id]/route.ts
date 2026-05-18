import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/turso";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { requesterId } = await request.json();
    const { id } = await params;

    if (!requesterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify HR
    const roleCheck = await db.execute({
      sql: "SELECT role FROM users WHERE id = ?",
      args: [requesterId]
    });
    if (roleCheck.rows[0]?.role !== 'hr') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await db.execute({
      sql: "DELETE FROM departments WHERE id = ?",
      args: [id]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus departemen" }, { status: 500 });
  }
}
