import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { requesterId, name, email, password, role: newUserRole, jobTitle, department } = await request.json();

    if (!requesterId || !name || !email || !password) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Verify if requester is HR
    const requesterCheck = await db.execute({
      sql: "SELECT role FROM users WHERE id = ?",
      args: [requesterId]
    });

    const requesterRole = requesterCheck.rows[0]?.role;
    if (requesterRole !== 'hr') {
      return NextResponse.json({ error: "Unauthorized. Only HR can create users." }, { status: 403 });
    }

    // Check if email already exists
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email]
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = "u_" + Math.random().toString(36).substring(2, 11);
    
    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, password_hash, job_title, department, points, \`level\`, \`rank\`, streak) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 'Rookie', 0)`,
      args: [userId, email, name, newUserRole || 'employee', password_hash, jobTitle || '', department || '']
    });

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Create User Error:", error);
    return NextResponse.json({ error: "Gagal membuat user baru" }, { status: 500 });
  }
}

