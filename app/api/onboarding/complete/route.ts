import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { userId, department, answers } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    // Pastikan kolom department_status & onboarding_answers ada
    try {
      await db.execute("ALTER TABLE users ADD COLUMN department_status VARCHAR(20) DEFAULT NULL");
    } catch (_) {
      // Kolom sudah ada — abaikan error
    }
    try {
      await db.execute("ALTER TABLE users ADD COLUMN onboarding_answers TEXT DEFAULT NULL");
    } catch (_) {
      // Kolom sudah ada — abaikan error
    }

    // Simpan divisi self-reported (harus cocok dengan salah satu departemen HR) + tandai pending persetujuan HR,
    // serta simpan seluruh jawaban onboarding sebagai knowledge tambahan per user.
    await db.execute({
      sql: `UPDATE users
            SET is_onboarded = 1,
                department = ?,
                department_status = ?,
                onboarding_answers = ?
            WHERE id = ?`,
      args: [
        department || null,
        department ? "pending" : null,
        Array.isArray(answers) ? JSON.stringify(answers) : null,
        userId,
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data onboarding" }, { status: 500 });
  }
}
