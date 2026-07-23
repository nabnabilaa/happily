import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedDemoData } from "@/lib/demo-data";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    // 1. Cek di local database dulu (Bypass/Developer login untuk testing lokal)
    const fbRes = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email]
    });

    let fbUserRow = fbRes.rows[0];

    if (fbUserRow && fbUserRow.password_hash) {
      const isMatch = await bcrypt.compare(password, fbUserRow.password_hash);
      if (isMatch) {
        const user = {
          id: fbUserRow.id,
          email: fbUserRow.email,
          name: fbUserRow.name,
          role: fbUserRow.role,
          points: fbUserRow.points,
          coins: fbUserRow.coins || 0,
          level: fbUserRow.level,
          rank: fbUserRow.rank,
          streak: fbUserRow.streak,
          avatarImage: fbUserRow.avatar_image,
          userRole: fbUserRow.user_role_context || fbUserRow.role,
          onboarded: !!fbUserRow.is_onboarded,
          hrAccess: Number(fbUserRow.hr_access) === 1
        };
        return NextResponse.json({ user });
      }
    }

    // 2. Cek kredensial ke Laravel Maxy API (SOT) jika local check terlewati

    const apiUrl = process.env.MAXY_M2M_API_URL || 'https://cms.maxy.academy/api/m2m';
    const serviceKey = process.env.MAXY_SERVICE_KEY || '';

    const lmsRes = await fetch(`${apiUrl}/auth/verify-credential`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': serviceKey
      },
      body: JSON.stringify({ email, password })
    });

    const lmsData = await lmsRes.json();

    if (!lmsRes.ok) {
      let errStr = lmsData.error || "Gagal verifikasi dari Maxy LMS";
      if (errStr.includes("Maxy") || errStr.includes("LMS") || errStr.includes("Akun tidak ditemukan")) {
        errStr = "Akun tidak ditemukan. Silakan coba daftar menggunakan Google.";
      }
      return NextResponse.json({ error: errStr }, { status: lmsRes.status });
    }

    const lmsUser = lmsData.user;

    // 2. Sinkronisasi dengan Flowbee database
    const syncRes = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email]
    });

    fbUserRow = syncRes.rows[0];


    // Jika belum ada di Flowbee, buat otomatis (Auto-sync)
    if (!fbUserRow) {
      const newId = "u_" + Math.random().toString(36).substring(2, 9);
      const role = "employee"; // Default role di Flowbee

      await db.execute({
        sql: `INSERT INTO users (id, email, name, role, password_hash, points, coins, level, \`rank\`, streak, is_onboarded) 
              VALUES (?, ?, ?, ?, ?, 0, 0, 1, 'E', 0, 0)`,
        args: [newId, email, lmsUser.name, role, lmsUser.password]
      });

      // Seed data agar dashboard Flowbee tidak kosong
      try {
        await seedDemoData(newId, lmsUser.name);
      } catch (e) {
        console.error("Demo seed warning:", e);
      }

      // Ambil ulang user yang baru di-insert
      const newlyCreatedRes = await db.execute({
        sql: "SELECT * FROM users WHERE id = ?",
        args: [newId]
      });
      fbUserRow = newlyCreatedRes.rows[0];
    } else {
      // Jika nama berubah di LMS, update di Flowbee
      if (fbUserRow.name !== lmsUser.name) {
        await db.execute({
          sql: "UPDATE users SET name = ? WHERE id = ?",
          args: [lmsUser.name, fbUserRow.id]
        });
        fbUserRow.name = lmsUser.name;
      }
    }

    // 3. Return user untuk login session Flowbee
    const user = {
      id: fbUserRow.id,
      email: fbUserRow.email,
      name: fbUserRow.name,
      role: fbUserRow.role,
      points: fbUserRow.points,
      coins: fbUserRow.coins || 0,
      level: fbUserRow.level,
      rank: fbUserRow.rank,
      streak: fbUserRow.streak,
      avatarImage: fbUserRow.avatar_image,
      userRole: fbUserRow.user_role_context || fbUserRow.role,
      onboarded: !!fbUserRow.is_onboarded,
      hrAccess: Number(fbUserRow.hr_access) === 1
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memproses login" }, { status: 500 });
  }
}
