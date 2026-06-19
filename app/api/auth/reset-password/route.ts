import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, token, password } = await req.json();

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    // Check token in DB
    const resetRes = await db.execute({
      sql: "SELECT * FROM password_resets WHERE email = ? AND token = ?",
      args: [email, token]
    });

    if (resetRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Link reset password tidak valid atau sudah kadaluarsa." },
        { status: 400 }
      );
    }

    // Valid token. Update password in users table
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE email = ?",
      args: [hashedPassword, email]
    });

    // Delete token so it can't be used again
    await db.execute({
      sql: "DELETE FROM password_resets WHERE email = ?",
      args: [email]
    });

    return NextResponse.json({
      message: "Password berhasil diubah. Silakan login dengan password baru.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat mereset password." },
      { status: 500 }
    );
  }
}
