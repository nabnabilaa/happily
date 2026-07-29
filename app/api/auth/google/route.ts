import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedDemoData } from "@/lib/demo-data";
import { createSessionToken, sessionCookieOptions } from "@/lib/authSession";
import {
  exchangeCodeForTokens,
  decodeIdToken,
  saveIntegration,
  googleOAuthConfigured,
} from "@/lib/googleCalendar";

export async function POST(request: Request) {
  try {
    const { credential, code } = await request.json();

    if (!credential && !code) {
      return NextResponse.json({ error: "No Google credential provided" }, { status: 400 });
    }

    // Dua jalur masuk, satu tujuan.
    //
    // `code` datang dari tombol login utama (authorization code flow): satu
    // layar persetujuan memberi identitas SEKALIGUS izin Google Calendar, jadi
    // kalender tersambung tanpa user pernah menekan tombol "Hubungkan".
    //
    // `credential` adalah jalur One Tap, yang secara desain hanya bisa
    // memberikan ID token. Ia tetap didukung supaya login cepat tidak hilang —
    // izin kalender untuk user ini diminta belakangan saat mereka membuka tab
    // Kalender.
    let payload: any;
    let googleTokens: any = null;

    if (code) {
      googleTokens = await exchangeCodeForTokens(code);
      payload = googleTokens.id_token ? decodeIdToken(googleTokens.id_token) : null;
    } else {
      payload = decodeIdToken(credential);
    }

    if (!payload) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 400 });
    }

    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    if (!email) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 400 });
    }

    // 1. Kirim data ke Laravel Maxy API (SOT)
    const apiUrl = process.env.MAXY_M2M_API_URL || 'https://cms.maxy.academy/api/m2m';
    const serviceKey = process.env.MAXY_SERVICE_KEY || '';

    const lmsRes = await fetch(`${apiUrl}/auth/verify-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': serviceKey
      },
      body: JSON.stringify({ email, name })
    });

    const lmsData = await lmsRes.json();

    if (!lmsRes.ok) {
      let errStr = lmsData.error || "Gagal verifikasi Google dari Maxy LMS";
      if (errStr.includes("Maxy") || errStr.includes("LMS") || errStr.includes("Akun tidak ditemukan")) {
        errStr = "Akun tidak ditemukan. Silakan coba daftar menggunakan Google.";
      }
      return NextResponse.json({ error: errStr }, { status: lmsRes.status });
    }

    const lmsUser = lmsData.user;

    // 2. Sinkronisasi dengan Flowbee database
    const fbRes = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email]
    });

    let fbUserRow = fbRes.rows[0];

    // AUTO-SYNC / AUTO-REGISTER ke Flowbee
    if (!fbUserRow) {
      const newId = "u_" + Math.random().toString(36).substring(2, 9);
      const role = "employee"; // Default role di Flowbee

      await db.execute({
        sql: `INSERT INTO users (id, email, name, role, password_hash, points, coins, level, \`rank\`, streak, is_onboarded, avatar_image) 
              VALUES (?, ?, ?, ?, ?, 0, 0, 1, 'E', 0, 0, ?)`,
        args: [newId, email, lmsUser.name, role, lmsUser.password, picture || null]
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
      // Jika nama/avatar berubah di Google, update di Flowbee
      let updateNeeded = false;
      let sqlParams = [];
      let sqlSets = [];

      if (fbUserRow.name !== lmsUser.name) {
        sqlSets.push("name = ?");
        sqlParams.push(lmsUser.name);
        fbUserRow.name = lmsUser.name;
      }

      if (picture && fbUserRow.avatar_image !== picture) {
        sqlSets.push("avatar_image = ?");
        sqlParams.push(picture);
        fbUserRow.avatar_image = picture;
      }

      if (sqlSets.length > 0) {
        sqlParams.push(fbUserRow.id);
        await db.execute({
          sql: `UPDATE users SET ${sqlSets.join(", ")} WHERE id = ?`,
          args: sqlParams
        });
      }
    }

    // 3. Simpan izin Google Calendar kalau login lewat authorization code.
    // Kegagalan di sini tidak boleh membatalkan login: user yang kalendernya
    // gagal tersambung masih berhak masuk ke aplikasinya.
    let calendarConnected = false;
    if (googleTokens && googleOAuthConfigured()) {
      try {
        calendarConnected = await saveIntegration(String(fbUserRow.id), googleTokens, email);
      } catch (e) {
        console.error("Google Calendar link warning:", e);
      }
    }

    // 4. Return user untuk login session Flowbee
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

    const response = NextResponse.json({ user, calendarConnected });
    response.cookies.set({
      ...sessionCookieOptions(),
      value: createSessionToken(String(user.id)),
    });
    return response;
  } catch (error: any) {
    console.error("Google Auth Error:", error?.message || error);
    console.error("Google Auth Stack:", error?.stack);
    return NextResponse.json({ 
      error: "Terjadi kesalahan server saat memproses login Google",
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}
