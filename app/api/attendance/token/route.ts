import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const token = uuidv4();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    /*
     * MySQL DATETIME menolak format ISO 8601 penuh.
     *
     * `toISOString()` menghasilkan "2026-08-07T06:22:47.014Z", dan kolom
     * DATETIME membalas "Incorrect datetime value" — sehingga route ini 500,
     * check-in lalu ditolak 400 "Data tidak lengkap", dan tidak ada seorang pun
     * bisa absen. Yang dibutuhkan "YYYY-MM-DD HH:MM:SS" dalam UTC, sama seperti
     * cap waktu lain di basis data ini.
     */
    const expiresAtSql = expiry.toISOString().slice(0, 19).replace("T", " ");

    await db.execute({
      sql: "INSERT INTO attendance_tokens (token, expires_at) VALUES (?, ?)",
      args: [token, expiresAtSql]
    });

    // Klien tetap menerima ISO — yang perlu bentuk SQL hanya basis datanya.
    return NextResponse.json({ token, expiresAt: expiry.toISOString() });
  } catch (error) {
    console.error("Token Error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}

