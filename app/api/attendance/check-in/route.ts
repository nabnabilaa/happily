import { NextResponse } from "next/server";
import { db } from "@/lib/turso";
import { hpEventEmitter } from "@/lib/events";

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
        sql: `SELECT DISTINCT DATE(check_in_at) as d 
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

    // 6. Award check-in XP — Spec v2: time-based
    // Before 08:00 = +10 XP, 08:01-08:15 = +5 XP, after 08:15 = 0 XP
    try {
      const nowTime = new Date();
      const hour = nowTime.getHours();
      const minute = nowTime.getMinutes();
      const totalMinutes = hour * 60 + minute;
      const workStart = 8 * 60; // 08:00

      let xpAmount = 0;
      let actionType = 'check_in_late';
      let xpLabel = 'Terlambat > 15 menit';

      if (totalMinutes < workStart) {
        xpAmount = 10;
        actionType = 'check_in_ontime';
        xpLabel = 'Tepat waktu! 🎯';
      } else if (totalMinutes <= workStart + 15) {
        xpAmount = 5;
        actionType = 'check_in_late_minor';
        xpLabel = `Terlambat ${totalMinutes - workStart} menit`;
      }

      if (xpAmount > 0) {
        const coinsAmount = Math.floor(xpAmount / 4);
        await db.execute({
          sql: "INSERT INTO xp_transactions (user_id, amount, activity_type, reference_id) VALUES (?, ?, ?, ?)",
          args: [userId, xpAmount, actionType, `Check-in ${checkInType}`]
        });
        await db.execute({
          sql: "UPDATE users SET points = points + ?, coins = coins + ? WHERE id = ?",
          args: [xpAmount, coinsAmount, userId]
        });
      }
    } catch (e) {
      console.warn("XP award error on checkin:", e);
    }

    // 7. Streak milestone notifications — Spec v2
    // 5-day streak = +25 XP, 7-day = +25 XP bonus
    // Monthly full streak (+200 XP) is handled by cron job checking work_calendar
    const streakMilestones: Record<number, { bonus: number; emoji: string }> = {
      5: { bonus: 25, emoji: '🔥' },
      7: { bonus: 25, emoji: '🔥' },
      14: { bonus: 50, emoji: '⚡' },
      21: { bonus: 100, emoji: '🏆' },
    };
    
    if (streakMilestones[streak]) {
      const { bonus, emoji } = streakMilestones[streak];
      try {
        await db.execute({
          sql: "INSERT INTO xp_transactions (user_id, amount, activity_type, reference_id) VALUES (?, ?, ?, ?)",
          args: [userId, bonus, `streak_${streak}`, `${emoji} Streak ${streak} hari`]
        });
        await db.execute({
          sql: "UPDATE users SET points = points + ? WHERE id = ?",
          args: [bonus, userId]
        });
        await db.execute({
          sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
          args: ["n_" + Date.now().toString(36), userId, `${emoji} Streak ${streak} Hari!`, `Bonus +${bonus} XP! Konsistensi yang luar biasa!`, 'success']
        });
      } catch (e) { console.warn("Streak bonus error:", e); }
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
