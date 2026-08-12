import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hpEventEmitter } from "@/lib/events";
import { awardPoints, refFor } from "@/lib/points";
import { wibDateString, wibMinutesOfDay, sqlWibDate, SQL_WIB_TODAY } from "@/lib/timeUtils";
import { requireSelfOrHrAdmin } from "@/lib/apiAuth";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export async function POST(request: Request) {
  try {
    const { userId, token, lat, lng, mood, checkInType = 'WFO', officeId, notes } = await request.json();

    // Identitas dari cookie sesi. Clock-in atas nama orang lain memalsukan catatan kehadiran.
    const access = await requireSelfOrHrAdmin(request, userId);
    if ("response" in access) return access.response;

    if (!userId || !token) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    if (checkInType !== 'WFO' && !notes) {
      return NextResponse.json({ error: "Catatan/alasan wajib diisi untuk WFA atau Dinas" }, { status: 400 });
    }

    if (checkInType === 'WFO' && !officeId) {
      return NextResponse.json({ error: "Pilih lokasi kantor untuk check-in WFO" }, { status: 400 });
    }

    // 1. Verify Token
    if (token !== 'manual_checkin') {
      console.log(`[Attendance] Verifying token for user ${userId}: ${token.substring(0, 8)}...`);
      const tokenCheck = await db.execute({
        sql: "SELECT expires_at FROM attendance_tokens WHERE token = ?",
        args: [token]
      });

      if (tokenCheck.rows.length === 0) {
        console.warn(`[Attendance] Invalid token attempt: ${token}`);
        return NextResponse.json({ error: "QR Code tidak valid atau sudah kadaluarsa" }, { status: 400 });
      }

      const expiresAt = new Date(tokenCheck.rows[0].expires_at as string);
      if (expiresAt < new Date()) {
        console.warn(`[Attendance] Token expired: ${token}`);
        return NextResponse.json({ error: "QR Code sudah kadaluarsa" }, { status: 400 });
      }
    } else {
      console.log(`[Attendance] Manual check-in for user ${userId}`);
    }

    // 2. Verify Location (Geofencing) only for WFO if coordinates provided
    if (checkInType === 'WFO' && lat && lng) {
      console.log(`[Attendance] Verifying location for WFO at office ${officeId}`);
      const officeCheck = await db.execute({
        sql: "SELECT lat, lng, radius FROM office_locations WHERE id = ?",
        args: [officeId]
      });

      if (officeCheck.rows.length > 0) {
        const office = officeCheck.rows[0] as unknown as { lat: number, lng: number, radius: number };
        const distance = calculateDistance(lat, lng, office.lat, office.lng);
        console.log(`[Attendance] Distance check: ${Math.round(distance)}m from office (max ${office.radius}m)`);
        if (distance > office.radius) {
          return NextResponse.json({ error: `Anda berada di luar area kantor. Jarak Anda: ${Math.round(distance)}m, Maksimal: ${office.radius}m` }, { status: 403 });
        }
      }
    }

    // 3. Record Attendance
    //
    // Satu check-in per hari. Tanpa penjaga ini route bisa dipanggil berkali-
    // kali sehari dan tiap panggilan menambah baris kehadiran baru — yang dulu
    // juga berarti tambahan poin tiap kali, karena poinnya ditulis langsung ke
    // DB tanpa kunci idempoten.
    const existingToday = await db.execute({
      sql: `SELECT id FROM attendance
             WHERE user_id = ? AND ${sqlWibDate('check_in_at')} = ${SQL_WIB_TODAY}
             LIMIT 1`,
      args: [userId],
    });

    if (existingToday.rows.length > 0) {
      return NextResponse.json(
        { error: "Kamu sudah check-in hari ini." },
        { status: 409 },
      );
    }

    console.log(`[Attendance] Recording attendance for user ${userId} (${checkInType})`);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL DATETIME format
    await db.execute({
      sql: "INSERT INTO attendance (user_id, location_lat, location_lng, mood, check_in_type, office_id, notes, check_in_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [userId, lat || null, lng || null, mood || null, checkInType, officeId || null, notes || null, now]
    });

    // 4. Delete Token (Single Use)
    if (token !== 'manual_checkin') {
      await db.execute({
        sql: "DELETE FROM attendance_tokens WHERE token = ?",
        args: [token]
      });
    }

    // 5. Calculate Streak (consecutive days with check-in)
    let streak = 1;
    try {
      const streakRes = await db.execute({
        sql: `SELECT DISTINCT DATE(CONVERT_TZ(check_in_at, '+00:00', '+07:00')) as d 
              FROM attendance WHERE user_id = ? 
              ORDER BY d DESC LIMIT 60`,
        args: [userId]
      });
      
      const dates = streakRes.rows.map(r => r.d as string);
      if (dates.length > 0) {
        streak = 1;
        for (let i = 1; i < dates.length; i++) {
          const curr = new Date(dates[i - 1]);
          const prev = new Date(dates[i]);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
          // Allow weekends (skip Sat/Sun)
          if (diffDays === 1 || (diffDays <= 3 && prev.getDay() === 5)) {
            streak++;
          } else {
            break;
          }
        }
      }

      // Update user streak
      await db.execute({
        sql: "UPDATE users SET streak = ? WHERE id = ?",
        args: [streak, userId]
      });
    } catch (e) {
      console.warn("Streak calc error:", e);
    }

    // 6. Poin check-in — berbasis jam WIB.
    // Sebelum 08:00 = +10, 08:01–08:15 = +5, lewat itu = 0 (tetap tercatat).
    //
    // Dulu blok ini menulis `UPDATE users SET points = points + ?` langsung ke
    // DB, sehingga melewati kuota dan kunci idempoten sekaligus — check-in
    // berkali-kali sehari membayar +10 tiap kali. Sekarang lewat lib/points.ts
    // dengan kunci tanggal WIB, jadi hanya hari pertama yang dibayar.
    //
    // `getHours()` juga diganti helper WIB: di server Vercel (TZ=UTC) jam lokal
    // meleset 7 jam, sehingga check-in jam 08:30 WIB terbaca 01:30 dan dinilai
    // "tepat waktu".
    try {
      const totalMinutes = wibMinutesOfDay();
      const workStart = 8 * 60; // 08:00 WIB

      let action = 'check_in_late';
      let xpLabel = 'Terlambat > 15 menit';

      if (totalMinutes < workStart) {
        action = 'check_in_ontime';
        xpLabel = 'Tepat waktu! 🎯';
      } else if (totalMinutes <= workStart + 15) {
        action = 'check_in_late_minor';
        xpLabel = `Terlambat ${totalMinutes - workStart} menit`;
      }

      await awardPoints({
        userId,
        action,
        refId: refFor.day(wibDateString()),
        description: `Check-in ${checkInType} — ${xpLabel}`,
      });
    } catch (e) {
      console.warn("Gagal memberi poin check-in:", e);
    }

    // 7. Bonus milestone streak.
    //
    // Kuncinya `streak:<n>:<tanggal>`. Tanggal ikut supaya milestone bisa diraih
    // lagi setelah streak putus dan dibangun ulang — tapi tetap mustahil dobel
    // dalam satu hari. Versi lama menembak setiap kali route ini dipanggil
    // selama `streak` masih bernilai 5, jadi tiga kali check-in di hari yang
    // sama menghasilkan tiga kali bonus.
    const STREAK_MILESTONES: Record<number, string> = {
      5: 'streak_5',
      14: 'streak_14',
      30: 'streak_30',
    };

    const milestoneAction = STREAK_MILESTONES[streak];
    if (milestoneAction) {
      try {
        const result = await awardPoints({
          userId,
          action: milestoneAction,
          refId: refFor.streak(streak, wibDateString()),
          description: `🔥 Streak ${streak} hari kerja!`,
        });

        if (result.status === 'awarded') {
          await db.execute({
            sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
            args: [
              "n_streak_" + Date.now().toString(36),
              userId,
              `🔥 Streak ${streak} Hari!`,
              `Bonus +${result.awarded} Poin! Konsistensi yang luar biasa!`,
              'success',
            ],
          });
        }
      } catch (e) { console.warn("Gagal memberi bonus streak:", e); }
    }

    console.log(`[Attendance] Check-in successful for user ${userId}, streak: ${streak}`);
    
    // Emit db_update to trigger real-time SSE refresh for all active clients
    try {
      hpEventEmitter.emit("db_update", { type: "refresh", timestamp: Date.now() });
    } catch (sseErr) {
      console.warn("Failed to emit checkin SSE event:", sseErr);
    }

    return NextResponse.json({ success: true, streak });
  } catch (error) {
    console.error("Check-in Error:", error);
    return NextResponse.json({ error: "Gagal check-in" }, { status: 500 });
  }
}

