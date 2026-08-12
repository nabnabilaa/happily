import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/authSession";
import {
  awardPoints,
  trainingGraduationPoints,
  TRAINING_GRADUATION_MIN_DAYS,
} from "@/lib/points";
import { normalizeHabitName } from "@/lib/habits";

/**
 * Menamatkan sebuah training.
 *
 * KAPAN sebuah training tamat adalah keputusan orang yang menjalaninya — berapa
 * hari yang pantas untuk "baca buku" tidak bisa ditebak di depan. Jadi tidak ada
 * gerbang jumlah hari di sini. Yang dihitung server adalah BAYARANNYA, dari
 * jumlah hari yang benar-benar tercatat (lihat `trainingGraduationPoints`).
 *
 * Ada sebagai route sendiri, bukan sekadar panggilan ke /api/xp/award, karena
 * angka itu tidak boleh datang dari klien. Dulu kelulusan bernilai 500 poin
 * flat dan /api/xp/award menerima `training_graduated` apa adanya, sehingga
 * membuat habit lalu langsung menamatkannya berulang-ulang adalah 500 poin per
 * beberapa detik.
 *
 * Route ini juga yang akhirnya benar-benar MENGHAPUS habit-nya. Sebelumnya
 * `handleFinishTraining` cuma membuangnya dari state React, dan sinkronisasi
 * blob sengaja tidak pernah menghapus baris habit (lihat catatan di
 * app/api/storage/route.ts) — jadi training yang sudah ditamatkan hidup lagi
 * begitu halaman dimuat ulang, lengkap dengan tombol "Tamat"-nya, yang
 * merayakan +500 padahal ledger tidak membayar apa-apa.
 */

export async function POST(request: Request) {
  try {
    // Penerima poin selalu diri sendiri, dan diambil dari cookie sesi — bukan
    // dari body. `userId` di body hanyalah usulan.
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Sesi kamu sudah tidak berlaku. Silakan login ulang.", needsReauth: true },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const wanted = normalizeHabitName(body?.name);
    if (!wanted) {
      return NextResponse.json({ error: "Nama training wajib diisi" }, { status: 400 });
    }

    const habitsRes = await db.execute({
      sql: "SELECT id, name, streak, target_days, completed_dates FROM habits WHERE user_id = ?",
      args: [userId],
    });
    const row = (habitsRes.rows as any[]).find((r) => normalizeHabitName(r.name) === wanted);
    if (!row) {
      return NextResponse.json(
        { error: "Training tidak ditemukan.", status: "not_found" },
        { status: 404 },
      );
    }

    // Hari yang benar-benar tercatat. `completed_dates` adalah sumber
    // kebenarannya; `streak` dipakai hanya untuk habit lama yang dibuat sebelum
    // kolom itu ada, supaya mereka tidak mendadak jadi tidak bisa ditamatkan.
    let completed = Number(row.streak) || 0;
    if (row.completed_dates) {
      try {
        const parsed =
          typeof row.completed_dates === "string"
            ? JSON.parse(row.completed_dates)
            : row.completed_dates;
        if (Array.isArray(parsed)) completed = new Set(parsed).size;
      } catch (e) {
        console.warn("[habits/graduate] completed_dates tidak terbaca:", e);
      }
    }

    // Satu-satunya syaratnya: pernah dijalani. Bukan gerbang durasi — cuma
    // menutup "buat habit, langsung tamatkan" yang tak pernah dicentang sekali
    // pun, karena itu tidak ada yang bisa dihitung sebagai hasil.
    if (completed < TRAINING_GRADUATION_MIN_DAYS) {
      return NextResponse.json(
        {
          error: "Training ini belum pernah dicentang sekali pun. Jalani dulu minimal satu hari.",
          status: "not_ready",
          completed,
        },
        { status: 409 },
      );
    }

    const payout = trainingGraduationPoints(completed);

    // Kunci idempoten sekarang memakai id baris, yang stabil walau namanya
    // diubah. Kunci lama memakai nama, dan baris ledger lama masih ada — tanpa
    // pemeriksaan ini, siapa pun yang sudah pernah lulus di skema lama akan
    // dibayar untuk kedua kalinya oleh kunci baru.
    const legacyRef = `habit:${row.name}:grad`;
    const legacy = await db.execute({
      sql: `SELECT id FROM xp_transactions
             WHERE user_id = ? AND action_type = 'training_graduated'
               AND ref_id = ? AND kind = 'earn' LIMIT 1`,
      args: [userId, legacyRef],
    });

    const description = `Tamat Training: ${row.name}`;
    const result =
      legacy.rows.length > 0
        ? null
        : await awardPoints({
            userId,
            action: "training_graduated",
            refId: `habit:${row.id}:grad`,
            description: `${description} (${completed} hari)`,
            // Nilainya variabel dan dihitung di sini, bukan diambil dari
            // registry. `dailyPointCap` pada aksinya yang menahan penumpukan
            // kalau beberapa training ditamatkan pada hari yang sama.
            overrideValue: payout,
          });

    // Dihapus SETELAH poinnya diputuskan. Urutan sebaliknya berarti kegagalan
    // pemberian poin tetap menghanguskan training-nya.
    await db.execute({
      sql: "DELETE FROM habits WHERE id = ? AND user_id = ?",
      args: [row.id, userId],
    });

    return NextResponse.json({
      success: true,
      name: row.name,
      completed,
      status: result?.status ?? "already_awarded",
      awarded: result?.awarded ?? 0,
      message: result?.message ?? "Training ini sudah pernah ditamatkan.",
      newTotal: result?.newTotal,
      newCoins: result?.newCoins,
    });
  } catch (error) {
    console.error("[habits/graduate] Gagal menamatkan training:", error);
    return NextResponse.json({ error: "Gagal menamatkan training" }, { status: 500 });
  }
}
