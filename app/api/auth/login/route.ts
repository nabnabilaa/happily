import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    const res = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email]
    });

    const userRow = res.rows[0];

    if (!userRow) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, userRow.password_hash as string);

    if (!isValid) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      points: userRow.points,
      coins: userRow.coins || 0,
      level: userRow.level,
      rank: userRow.rank,
      streak: userRow.streak,
      avatarImage: userRow.avatar_image,
      userRole: userRow.user_role_context || userRow.role,
      onboarded: !!userRow.is_onboarded
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Gagal login" }, { status: 500 });
  }
}

