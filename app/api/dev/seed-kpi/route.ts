import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DEV ONLY — tambah dummy KPI ke user berdasarkan email/name
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  const { userEmail, userName } = await request.json();

  if (!userEmail && !userName) {
    return NextResponse.json({ error: "Kirim userEmail atau userName" }, { status: 400 });
  }

  // Cari user
  const sql = userEmail
    ? `SELECT id, name, email FROM users WHERE email = ? LIMIT 1`
    : `SELECT id, name, email FROM users WHERE name LIKE ? LIMIT 1`;
  const args = userEmail ? [userEmail] : [`%${userName}%`];

  const userRes = await db.execute({ sql, args });
  if (!userRes.rows.length) {
    return NextResponse.json({ error: "User tidak ditemukan", query: { userEmail, userName } }, { status: 404 });
  }

  const target = userRes.rows[0];
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();

  const kpis = [
    { title: "Selesaikan 5 modul pelatihan", target: 5, unit: "modul", desc: "Tuntaskan modul dalam LMS bulan ini" },
    { title: "Tingkatkan kepuasan pelanggan ke 90%", target: 90, unit: "%", desc: "Score dari survey akhir bulan" },
    { title: "Kurangi waktu respons tiket < 2 jam", target: 10, unit: "tiket", desc: "10 tiket dengan respons < 2 jam" },
  ];

  const created: any[] = [];

  for (const k of kpis) {
    const id = "kpi_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    await db.execute({
      sql: `INSERT INTO monthly_kpis (id, title, target_description, weight, month, year, assigned_to, assigned_by, scope, metric_target, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      args: [id, k.title, k.desc, 33, m, y, target.id, target.id, "assigned", k.target],
    });
    created.push({ id, title: k.title });
    await new Promise(r => setTimeout(r, 10)); // hindari id collision
  }

  return NextResponse.json({
    success: true,
    user: { id: target.id, name: target.name, email: target.email },
    kpisCreated: created,
  });
}
