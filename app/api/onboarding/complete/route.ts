import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { userId, department } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    // Pastikan kolom department_status ada
    try {
      await db.execute("ALTER TABLE users ADD COLUMN department_status VARCHAR(20) DEFAULT NULL");
    } catch (_) {
      // Kolom sudah ada — abaikan error
    }

    // Simpan divisi self-reported + tandai sebagai pending persetujuan HR
    await db.execute({
      sql: `UPDATE users
            SET is_onboarded = 1,
                department = ?,
                department_status = ?
            WHERE id = ?`,
      args: [
        department || null,
        department ? "pending" : null,
        userId,
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data onboarding" }, { status: 500 });
  }
}
