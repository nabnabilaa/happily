import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedDemoData } from "@/lib/demo-data";

export async function POST(request: Request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: "No Google credential provided" }, { status: 400 });
    }

    // Decode JWT payload (base64url)
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);

    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    if (!email) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 400 });
    }

    // 1. Kirim data ke Laravel Maxy API (SOT)
    const apiUrl = process.env.MAXY_M2M_API_URL || 'http://127.0.0.1:8082/api/m2m';
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
      return NextResponse.json({ error: lmsData.error || "Gagal verifikasi Google dari Maxy LMS" }, { status: lmsRes.status });
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
      onboarded: !!fbUserRow.is_onboarded
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memproses login Google" }, { status: 500 });
  }
}
