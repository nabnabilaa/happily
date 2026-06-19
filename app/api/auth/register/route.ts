import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { seedDemoData } from "@/lib/demo-data";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nama, email, dan password wajib diisi." },
        { status: 400 }
      );
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: "Format email tidak valid." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingRes = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email]
    });

    if (existingRes.rows.length > 0) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Silakan login." },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newId = "u_" + uuidv4().substring(0, 8);
    const role = "employee"; // Default role

    // Insert to DB
    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, password_hash, points, coins, level, \`rank\`, streak, is_onboarded) 
            VALUES (?, ?, ?, ?, ?, 0, 0, 1, 'E', 0, 0)`,
      args: [newId, email, name, role, hashedPassword]
    });

    // Seed data
    try {
      await seedDemoData(newId, name);
    } catch (e) {
      console.error("Demo seed error during register:", e);
    }

    return NextResponse.json(
      { message: "Registrasi berhasil! Silakan login." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat registrasi." },
      { status: 500 }
    );
  }
}
