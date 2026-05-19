import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

// ══════════════════════════════════════════════════════════════
// XP Values — Spec v2 (Flowbee Feature Spec Revisi 2)
// ══════════════════════════════════════════════════════════════
const XP_VALUES: Record<string, number> = {
  // Attendance
  check_in_ontime: 10,        // Clock-in sebelum 08:00
  check_in_late_minor: 5,     // Terlambat 1–15 menit
  check_in_late: 0,           // Terlambat > 15 menit
  check_out: 100,             // Clock-out (Tutup Hari) -> Match Guide

  // Tasks
  task_approved: 50,           // Task disetujui Manager -> Match Guide
  task_revised_approved: 25,   // Task direvisi lalu disetujui
  priority_complete: 50,       // Legacy alias -> Match Guide

  // Wellbeing
  mood_checkin: 5,             // Isi Mood & Energy (1x per hari)

  // Recognition
  apresiasi_received: 20,      // Dapat Kudos dari Manager

  // KPI
  kpi_achieved: 150,           // KPI Bulanan tercapai (verified)
  kpi_exceeded: 250,           // KPI Bulanan melampaui target

  // Streaks
  streak_5: 25,                // 5 hari kerja berturut-turut
  streak_monthly: 200,         // 1 bulan penuh (semua hari kerja)
  streak_7: 25,                // Legacy alias (keeping for compat)
  streak_30: 200,              // Legacy alias (keeping for compat)

  // Survey
  survey_complete: 5,          // Per survey diisi

  // Other (legacy)
  habit_complete: 20,          // Match Guide
  daily_reflection: 100,       // Match Guide
  focus_session: 5,
  check_in: 10,                // Legacy fallback
  goal_complete: 150,          // Legacy fallback → maps to kpi_achieved
  learning_complete: 100,      // Match Guide
};

// Daily cap for task-related XP (anti-abuse: max 3 tasks completed per day)
const DAILY_TASK_XP_CAP = 150;
const DAILY_GLOBAL_XP_CAP = 300; // Global limit: max 300 points per day
const TASK_ACTION_TYPES = ['task_approved', 'task_revised_approved', 'priority_complete'];

export async function POST(request: Request) {
  try {
    const { userId, actionType, description, targetUserId } = await request.json();

    if (!userId || !actionType) {
      return NextResponse.json({ error: "UserId and ActionType required" }, { status: 400 });
    }

    // Determine who gets the XP (default: userId, but targetUserId for apresiasi_received)
    const recipientId = targetUserId || userId;

    const amount = XP_VALUES[actionType] || 5;

    // ── Anti-Abuse: Global Daily XP/Point Cap ───────────────────────
    try {
      const todayGlobalXP = await db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total 
              FROM xp_transactions 
              WHERE user_id = ? 
                AND DATE(created_at) = CURDATE()`,
        args: [recipientId]
      });
      const currentGlobalTotal = Number(todayGlobalXP.rows[0]?.total) || 0;

      if (currentGlobalTotal >= DAILY_GLOBAL_XP_CAP) {
        return NextResponse.json({ 
          success: true, 
          awarded: 0, 
          awardedCoins: 0,
          capped: true,
          message: `Batas poin harian tercapai (${DAILY_GLOBAL_XP_CAP} Poin). Aktivitas tetap tercatat tapi Poin tidak bertambah.`,
          newTotal: 0,
          newCoins: 0,
          recipientId
        });
      }

      // Check remaining global cap
      let finalAmount = amount;
      const remainingGlobalCap = DAILY_GLOBAL_XP_CAP - currentGlobalTotal;
      if (finalAmount > remainingGlobalCap) {
        finalAmount = remainingGlobalCap;
      }

      // ── Anti-Abuse: Daily Task XP Cap ──────────────────────────────
      if (TASK_ACTION_TYPES.includes(actionType)) {
        const todayTaskXP = await db.execute({
          sql: `SELECT COALESCE(SUM(amount), 0) as total 
                FROM xp_transactions 
                WHERE user_id = ? 
                  AND action_type IN ('task_approved', 'task_revised_approved', 'priority_complete')
                  AND DATE(created_at) = CURDATE()`,
          args: [recipientId]
        });
        const currentDailyTotal = Number(todayTaskXP.rows[0]?.total) || 0;
        
        if (currentDailyTotal >= DAILY_TASK_XP_CAP) {
          return NextResponse.json({ 
            success: true, 
            awarded: 0, 
            awardedCoins: 0,
            capped: true,
            message: `Batas Poin harian dari task tercapai (${DAILY_TASK_XP_CAP} Poin). Task tetap tercatat tapi Poin tidak bertambah.`,
            newTotal: 0,
            newCoins: 0,
            recipientId
          });
        }
        
        // Reduce amount if it would exceed task cap
        const remainingTaskCap = DAILY_TASK_XP_CAP - currentDailyTotal;
        if (finalAmount > remainingTaskCap) {
          finalAmount = remainingTaskCap;
        }
      }

      if (finalAmount <= 0) {
        return NextResponse.json({ 
          success: true, 
          awarded: 0, 
          awardedCoins: 0,
          recipientId 
        });
      }

      return await awardXPInternal(recipientId, finalAmount, actionType, description, request);
    } catch (e) {
      console.warn("Daily cap check failed, awarding normally:", e);
      return await awardXPInternal(recipientId, amount, actionType, description, request);
    }
  } catch (error) {
    console.error("XP Award Error:", error);
    return NextResponse.json({ error: "Failed to award XP & Coins" }, { status: 500 });
  }
}

async function awardXPInternal(
  recipientId: string, 
  amount: number, 
  actionType: string, 
  description: string | undefined,
  request: Request
) {
  if (amount <= 0) {
    return NextResponse.json({ success: true, awarded: 0, awardedCoins: 0, recipientId });
  }

  const coinsAmount = amount; // 1:1 Ratio (Koin and Poin are the same)
  const txId = "tx_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

  // 1. Log Transaction
  try {
    await db.execute({
      sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
      args: [txId, recipientId, amount, actionType, description || actionType]
    });
  } catch (e) {
    console.warn("Failed to log XP transaction:", e);
  }

  // 2. Update User Points & Coins
  await db.execute({
    sql: "UPDATE users SET points = points + ?, coins = coins + ? WHERE id = ?",
    args: [amount, coinsAmount, recipientId]
  });

  // 3. Fetch new totals
  const res = await db.execute({
    sql: "SELECT points, coins, streak FROM users WHERE id = ?",
    args: [recipientId]
  });

  const newPoints = Number(res.rows[0]?.points) || 0;
  const newCoins = Number(res.rows[0]?.coins) || 0;
  const streak = Number(res.rows[0]?.streak) || 0;

  // 4. Check for streak milestones and auto-award bonus
  if (actionType === 'check_in' || actionType === 'check_in_ontime' || actionType === 'check_in_late_minor') {
    // 5-day streak bonus
    if (streak === 5) {
      try {
        const bonusTxId = "tx_s5_" + Date.now().toString(36);
        await db.execute({
          sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
          args: [bonusTxId, recipientId, 25, 'streak_5', '🔥 Streak 5 hari kerja!']
        });
        await db.execute({
          sql: "UPDATE users SET points = points + 25 WHERE id = ?",
          args: [recipientId]
        });
        await db.execute({
          sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
          args: ["n_s5_" + Date.now().toString(36), recipientId, '🔥 Streak 5 Hari!', 'Bonus +25 XP! Konsistensi hebat!', 'success']
        });
      } catch (e) { console.warn("Streak 5 bonus error:", e); }
    }
    // 7-day streak bonus (legacy compat)
    else if (streak === 7) {
      try {
        const bonusTxId = "tx_s7_" + Date.now().toString(36);
        await db.execute({
          sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
          args: [bonusTxId, recipientId, 25, 'streak_7', '🔥 Streak 7 hari!']
        });
        await db.execute({
          sql: "UPDATE users SET points = points + 25 WHERE id = ?",
          args: [recipientId]
        });
        await db.execute({
          sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
          args: ["n_s7_" + Date.now().toString(36), recipientId, '🔥 Streak 7 Hari!', 'Bonus +25 XP! Kamu luar biasa!', 'success']
        });
      } catch (e) { console.warn("Streak 7 bonus error:", e); }
    }
  }

  // ── Level-up notification ──
  const { level: oldLevel } = calculateLevelAndRank(newPoints - amount);
  const { level: newLevel, rank: newRank } = calculateLevelAndRank(newPoints);
  if (newLevel > oldLevel) {
    try {
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [
          "n_lvl_" + Date.now().toString(36), 
          recipientId, 
          `🚀 Naik ke Level ${newLevel}!`, 
          `Kamu sekarang ${newRank}! Terus pertahankan konsistensimu!`, 
          'success'
        ]
      });
    } catch (e) { console.warn("Level-up notification error:", e); }
  }

  // ── Auto-log to Logbook ──────────────────────────────────────
  try {
    const logId = "log_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const logMeta = LOGBOOK_META[actionType] || { title: actionType, type: 'activity', emoji: '⚡' };
    const logTitle = `${logMeta.emoji} ${description || logMeta.title}`;

    await db.execute({
      sql: `INSERT INTO logbook_entries (id, user_id, type, title, description, xp_earned, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      args: [logId, recipientId, logMeta.type, logTitle, description || logMeta.title, amount]
    });
  } catch (e) { console.warn("Logbook auto-log error:", e); }

  return NextResponse.json({ 
    success: true, 
    awarded: amount, 
    awardedCoins: coinsAmount,
    newTotal: newPoints,
    newCoins: newCoins,
    recipientId
  });
}

// ── Logbook action type mapping ───────────────────────────────
const LOGBOOK_META: Record<string, { title: string; type: string; emoji: string }> = {
  check_in_ontime: { title: 'Check-in tepat waktu', type: 'checkin', emoji: '✅' },
  check_in_late_minor: { title: 'Check-in (sedikit terlambat)', type: 'checkin', emoji: '⏰' },
  check_in_late: { title: 'Check-in terlambat', type: 'checkin', emoji: '⚠️' },
  check_in: { title: 'Check-in', type: 'checkin', emoji: '📍' },
  check_out: { title: 'Check-out', type: 'checkin', emoji: '🏠' },
  task_approved: { title: 'Task disetujui manager', type: 'task_done', emoji: '✅' },
  task_revised_approved: { title: 'Task revisi disetujui', type: 'task_done', emoji: '🔄' },
  priority_complete: { title: 'Prioritas selesai', type: 'task_done', emoji: '🎯' },
  mood_checkin: { title: 'Mood check-in', type: 'mood', emoji: '💭' },
  apresiasi_received: { title: 'Menerima apresiasi', type: 'kudos', emoji: '🌟' },
  kpi_achieved: { title: 'KPI tercapai!', type: 'kpi', emoji: '🏆' },
  kpi_exceeded: { title: 'KPI melampaui target!', type: 'kpi', emoji: '🚀' },
  streak_5: { title: 'Streak 5 hari!', type: 'streak', emoji: '🔥' },
  streak_7: { title: 'Streak 7 hari!', type: 'streak', emoji: '🔥' },
  streak_monthly: { title: 'Streak sebulan penuh!', type: 'streak', emoji: '💎' },
  survey_complete: { title: 'Mengisi survey', type: 'activity', emoji: '📋' },
  habit_complete: { title: 'Kebiasaan selesai', type: 'activity', emoji: '🌱' },
  daily_reflection: { title: 'Refleksi harian', type: 'mood', emoji: '📝' },
  focus_session: { title: 'Sesi fokus selesai', type: 'activity', emoji: '⏱️' },
};

// ── Spec v2 Level System ──────────────────────────────────────
function calculateLevelAndRank(points: number): { level: number; rank: string } {
  let level = 1;
  if (points < 0) {
    level = 1;
  } else if (points < 1000) {
    level = Math.floor(points / 100) + 1;
  } else if (points < 4000) {
    const diff = points - 1000;
    level = 11 + Math.floor(diff / 300);
  } else {
    const diff = points - 4000;
    level = 21 + Math.floor(diff / 1000);
  }

  let rank = 'E';
  if (level <= 10) rank = 'E';
  else if (level <= 20) rank = 'D';
  else if (level <= 35) rank = 'C';
  else if (level <= 50) rank = 'B';
  else if (level <= 70) rank = 'A';
  else rank = 'S';

  return { level, rank };
}
