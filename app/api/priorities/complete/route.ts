import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TASK_STATUS, normalizeTaskStatus } from "@/lib/taskStatus";
import { getAuthUserId } from "@/lib/authSession";
import { resolveManagerFor } from "@/lib/managerTeam";
import { triggerRealtimeUpdate } from "@/lib/realtime";
import { dispatchNotification } from "@/lib/notificationService";
import { recalcKpiProgress } from "@/lib/kpiProgress";

// PATCH /api/priorities/complete
// Immediately persists task completion to DB so refetches don't see stale state.
export async function PATCH(request: Request) {
  try {
    const { id, done, partialProgress, status, proofLinks, notes, metricValue, isProject, completedAt } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // ── Barisnya harus ada sebelum kita mengaku berhasil ──
    //
    // Dulu route ini menjalankan UPDATE lalu mengembalikan `success: true` tanpa
    // melihat apakah ada baris yang tersentuh. Klien mempercayainya dan langsung
    // membayar poin — jadi penyelesaian yang tidak pernah tersimpan tetap
    // menghanguskan kunci `task:<id>` selamanya: poinnya sudah dibayar sekali,
    // dan task-nya kembali "belum selesai" setelah refresh, tanpa jalan pulang.
    //
    // Diperiksa lewat SELECT, bukan `affectedRows`. MySQL menghitung baris yang
    // BERUBAH, bukan yang cocok, jadi menyelesaikan ulang task yang sudah
    // selesai menghasilkan 0 dan akan terbaca keliru sebagai "tidak ditemukan".
    const sessionUserId = getAuthUserId(request);
    // `user_id` dan `title` ikut diambil karena dibutuhkan untuk memberi tahu
    // manajer di akhir — bukan sekadar untuk memastikan barisnya ada.
    const owner = await db.execute({
      sql: sessionUserId
        ? "SELECT id, user_id, title, kpi_id, is_verified FROM daily_priorities WHERE id = ? AND user_id = ? LIMIT 1"
        : "SELECT id, user_id, title, kpi_id, is_verified FROM daily_priorities WHERE id = ? LIMIT 1",
      args: sessionUserId ? [String(id), String(sessionUserId)] : [String(id)],
    });

    if (owner.rows.length === 0) {
      return NextResponse.json(
        { error: "Task tidak ditemukan atau bukan milikmu.", notFound: true },
        { status: 404 },
      );
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Completing a task hands it to the manager for verification. This used to
    // write "accepted", a status nothing read and which no queue matched, so
    // submitted work never reached the manager's review list.
    const nextStatus =
      normalizeTaskStatus(status) ||
      (done ? TASK_STATUS.PENDING_REVIEW : TASK_STATUS.IN_PROGRESS);

    // Re-submitting after a revision clears the previous review verdict.
    const isSubmission = nextStatus === TASK_STATUS.PENDING_REVIEW;

    await db.execute({
      sql: `UPDATE daily_priorities
            SET is_done = ?,
                partial_progress = ?,
                status = ?,
                proof_link = ?,
                proof_notes = ?,
                metric_value = ?,
                is_project = ?,
                completed_at = ?,
                submitted_at = ?,
                is_verified = CASE WHEN ? = 1 THEN 0 ELSE is_verified END
            WHERE id = ?`,
      args: [
        done ? 1 : 0,
        partialProgress ?? 0,
        nextStatus,
        proofLinks?.length ? JSON.stringify(proofLinks) : null,
        notes || null,
        metricValue ?? null,
        isProject ? 1 : 0,
        done ? (completedAt ? new Date(completedAt).toISOString().slice(0, 19).replace("T", " ") : now) : null,
        isSubmission ? now : null,
        isSubmission ? 1 : 0,
        String(id),
      ],
    });

    /*
     * ── Beri tahu manajer bahwa ada yang perlu di-ACC ──────────────────────
     *
     * Sampai sekarang jalur task tidak memancarkan sinyal apa pun. Karyawan
     * mengumpulkan, barisnya masuk DB dengan benar, dan di sana berhenti:
     * layar manajer baru berubah kalau ia menekan F5. Dari sisi karyawan itu
     * terlihat persis seperti "task-ku tidak tersimpan".
     *
     * Dua hal dikirim, dan keduanya ke MANAJER, bukan ke karyawan yang
     * bertindak — `triggerRealtimeUpdate` menembak channel `user-{id}`, jadi
     * memakai id karyawan (satu-satunya pemakaian yang ada sebelumnya) tidak
     * pernah sampai ke siapa pun yang perlu tahu.
     *
     * Sengaja hanya saat `isSubmission`: menyimpan progres parsial bukan
     * permintaan ACC, dan mengirimi manajer notifikasi tiap geseran slider akan
     * membuat notifikasinya diabaikan.
     *
     * Dibungkus try/catch sendiri: task-nya SUDAH tersimpan di atas. Kegagalan
     * memberi tahu tidak boleh berubah menjadi 500 yang membuat klien mengira
     * penyimpanannya gagal lalu mencoba lagi.
     */
    /*
     * ── KPI harus berhenti menghitung task yang verifikasinya baru dicabut ──
     *
     * Progres KPI SENGAJA hanya menghitung task yang sudah di-ACC
     * (`lib/kpiProgress.ts`: COUNT WHERE is_verified = 1). Karena itu memanggil
     * hitung ulang pada pengumpulan BIASA tidak ada gunanya — angkanya sama.
     *
     * Kecuali satu kasus: mengumpulkan ULANG task yang sebelumnya sudah di-ACC.
     * UPDATE di atas menurunkan `is_verified` dari 1 ke 0, jadi jumlah yang sah
     * berkurang satu — tapi `monthly_kpis.metric_current` tidak ikut bergerak
     * sampai ada ACC berikutnya yang kebetulan memicunya. Di antara keduanya,
     * KPI melaporkan angka yang lebih tinggi dari kenyataan.
     *
     * Syaratnya sempit dengan sengaja: hanya saat verifikasi benar-benar
     * dicabut, supaya jalur submit normal tidak membayar biaya query ini.
     */
    const wasVerified = Number((owner.rows[0] as any).is_verified) === 1;
    const kpiId = (owner.rows[0] as any).kpi_id;
    if (isSubmission && wasVerified && kpiId) {
      try {
        await recalcKpiProgress(String(kpiId));
      } catch (kpiError) {
        console.warn("[priorities/complete] Gagal menghitung ulang KPI:", kpiError);
      }
    }

    if (isSubmission) {
      try {
        const taskRow = owner.rows[0] as any;
        const employeeId = String(taskRow.user_id);
        const managerId = await resolveManagerFor(employeeId);

        if (managerId) {
          const empRes = await db.execute({
            sql: "SELECT name FROM users WHERE id = ? LIMIT 1",
            args: [employeeId],
          });
          const employeeName = (empRes.rows[0] as any)?.name || "Rekan tim";

          await triggerRealtimeUpdate(managerId, { type: "refresh", slice: "tasks" });
          await dispatchNotification(managerId, "task_submitted", {
            employee_name: employeeName,
            task_title: String(taskRow.title || "Task"),
          });
        }
      } catch (notifyError) {
        console.warn("[priorities/complete] Gagal memberi tahu manajer:", notifyError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Priority complete error:", error);
    return NextResponse.json({ error: "Gagal menyimpan task" }, { status: 500 });
  }
}
