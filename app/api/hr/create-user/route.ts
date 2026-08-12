import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getRequesterAccess, canHrAdmin } from "@/lib/hrAuth";
import { validateManagerAssignment } from "@/lib/managerTeam";
import { requireHrAdmin } from "@/lib/apiAuth";

export async function POST(request: Request) {
  try {
    const { requesterId, name, email, password, role: newUserRole, jobTitle, department, hrAccess, managerId } = await request.json();

    if (!requesterId || !name || !email || !password) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Verify if requester can manage HR (role hr OR punya hr_access tambahan)
    // Membuat akun adalah wewenang HR; diperiksa pada pemilik cookie, bukan
    // `requesterId` dari body. Tanpa ini karyawan mana pun bisa membuat akun
    // baru — termasuk akun ber-peran HR — dengan menyebut id HR.
    const actor = await requireHrAdmin(request, requesterId);
    if ("response" in actor) return actor.response;

    const requester = await getRequesterAccess(actor.userId);
    if (!canHrAdmin(requester.role, requester.hrAccess)) {
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

    // Atasan ditetapkan sejak akun dibuat. Tanpa ini, setiap karyawan baru
    // mendarat tanpa manajer dan hanya bisa ditemukan lewat tebakan nama
    // departemen — jalan yang membuat 54 orang di basis data ini tidak dimiliki
    // manajer mana pun. Akun baru belum punya bawahan, jadi siklus mustahil,
    // tapi pemeriksaan lain (ada, ber-peran manager/HR) tetap berlaku.
    const mgrCheck = await validateManagerAssignment(userId, managerId);
    if (!mgrCheck.ok) {
      return NextResponse.json({ error: mgrCheck.error }, { status: 400 });
    }

    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, password_hash, job_title, department, manager_id, hr_access, points, \`level\`, \`rank\`, streak)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 'Rookie', 0)`,
      args: [userId, email, name, newUserRole || 'employee', password_hash, jobTitle || '', department || '', mgrCheck.value ?? null, hrAccess ? 1 : 0]
    });

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Create User Error:", error);
    return NextResponse.json({ error: "Gagal membuat user baru" }, { status: 500 });
  }
}
