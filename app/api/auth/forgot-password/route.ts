import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: "Format email tidak valid" },
        { status: 400 }
      );
    }

    // Check if user exists in DB
    const userRes = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email]
    });

    if (userRes.rows.length === 0) {
      // Don't leak that the email doesn't exist for security reasons,
      // but in this case, we can show an error or just pretend it succeeded.
      // Usually, it's better to just return success to prevent email enumeration.
      return NextResponse.json(
        { error: "Jika email terdaftar, instruksi reset akan dikirim." },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = uuidv4();

    // Save token to DB
    await db.execute({
      sql: `REPLACE INTO password_resets (email, token, created_at) VALUES (?, ?, NOW())`,
      args: [email, token]
    });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    
    // Log link to console for local development testing
    console.log("=========================================");
    console.log("🔑 PASSWORD RESET LINK (LOCAL DEV):");
    console.log(resetLink);
    console.log("=========================================");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: `"FocusBuddy" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Reset Password FocusBuddy",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #FF6B35; text-align: center;">Reset Password Anda</h2>
            <p style="color: #333;">Halo,</p>
            <p style="color: #333;">Kami menerima permintaan untuk mereset password akun FocusBuddy Anda. Klik tombol di bawah ini untuk melanjutkan:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 12px;">Jika Anda tidak merasa melakukan permintaan ini, abaikan saja email ini.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Nodemailer Error:", error);
      return NextResponse.json(
        { error: "Gagal mengirim email reset password." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Instruksi reset password telah dikirim ke email Anda.",
    });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat memproses reset password." },
      { status: 500 }
    );
  }
}
