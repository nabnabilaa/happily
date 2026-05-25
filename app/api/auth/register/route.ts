import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Semua field harus diisi" }, { status: 400 });
    }

    // Check if user exists
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email]
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = "u_" + Math.random().toString(36).substring(2, 9);
    
    // Default role is 'employee'
    const role = "employee";

    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, password_hash, points, level, rank, streak) 
            VALUES (?, ?, ?, ?, ?, 0, 1, 'E', 0)`,
      args: [userId, email, name, role, password_hash]
    });

    const user = {
      id: userId,
      email,
      name,
      role
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Gagal mendaftar" }, { status: 500 });
  }
}

