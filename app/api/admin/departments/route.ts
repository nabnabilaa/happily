import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

export async function GET(request: Request) {
  try {
    const res = await db.execute("SELECT * FROM departments ORDER BY name ASC");
    return NextResponse.json({ departments: res.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, requesterId } = await request.json();
    if (!name || !requesterId) return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });

    const roleCheck = await db.execute({ sql: "SELECT role FROM users WHERE id = ?", args: [requesterId] });
    if (roleCheck.rows[0]?.role !== 'hr') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await db.execute({ sql: "INSERT INTO departments (name) VALUES (?)", args: [name] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menambah departemen (mungkin sudah ada)" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, requesterId } = await request.json();
    if (!id || !name || !requesterId) return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });

    const roleCheck = await db.execute({ sql: "SELECT role FROM users WHERE id = ?", args: [requesterId] });
    if (roleCheck.rows[0]?.role !== 'hr') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // Get old name to update users
    const oldDept = await db.execute({ sql: "SELECT name FROM departments WHERE id = ?", args: [id] });
    const oldName = oldDept.rows[0]?.name;

    await db.execute({ sql: "UPDATE departments SET name = ? WHERE id = ?", args: [name, id] });

    // Update users in this department
    if (oldName) {
      await db.execute({ sql: "UPDATE users SET department = ? WHERE department = ?", args: [name, oldName] });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengubah departemen" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, requesterId } = await request.json();
    if (!id || !requesterId) return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });

    const roleCheck = await db.execute({ sql: "SELECT role FROM users WHERE id = ?", args: [requesterId] });
    if (roleCheck.rows[0]?.role !== 'hr') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await db.execute({ sql: "DELETE FROM departments WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus departemen" }, { status: 500 });
  }
}
