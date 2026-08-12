import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, sessionCookieOptions } from "@/lib/authSession";
import bcrypt from "bcryptjs";

/**
 * Login adalah satu-satunya tempat identitas diterbitkan. Semua endpoint yang
 * memakai `getAuthUserId` bergantung pada cookie yang dipasang di sini.
 */
function withSession(user: { id: any }) {
  const response = NextResponse.json({ user });
  response.cookies.set({
    ...sessionCookieOptions(),
    value: createSessionToken(String(user.id)),
  });
  return response;
}

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

    // Saat mode review menyala, `password_hash` sudah dikosongkan di lapisan
    // query — lihat catatan di `db.executeUnmasked`. Tanpa pengambilan terpisah
    // ini, `bcrypt.compare` menerima `null` dan setiap login akun lokal ditolak
    // dengan gejala yang persis sama seperti password salah. Baris yang dipakai
    // membangun sesi tetap yang tersamar, jadi nama palsu tetap yang tampil.
    let passwordHash: string | null = fbUserRow?.password_hash ?? null;
    if (fbUserRow && !passwordHash) {
      const secretRes = await db.executeUnmasked({
        sql: "SELECT password_hash FROM users WHERE id = ?",
        args: [fbUserRow.id],
      });
      passwordHash = secretRes.rows[0]?.password_hash ?? null;
    }

    if (fbUserRow && passwordHash) {
      const isMatch = await bcrypt.compare(password, passwordHash);
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
        return withSession(user);
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

      /*
       * Tidak ada lagi data contoh yang disuntikkan ke akun baru.
       *
       * `seedDemoData` dulu memberi setiap karyawan sungguhan 1500 poin, 1500
       * koin, level 6, streak 12, tiga task, tiga kebiasaan, tiga goal, empat
       * skill, catatan, event kalender, bahkan percakapan chat dari manajer
       * fiktif. Semuanya tidak bisa dibedakan dari data asli begitu masuk:
       * poinnya ikut leaderboard, task palsunya masuk antrean review manajer,
       * dan tidak ada satu pun tombol untuk membersihkannya.
       *
       * Dashboard yang kosong di hari pertama adalah keadaan yang jujur, dan
       * onboarding memang sudah menuntun pemakai mengisinya sendiri.
       */

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

    return withSession(user);
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memproses login" }, { status: 500 });
  }
}
