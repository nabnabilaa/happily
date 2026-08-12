import { db } from "@/lib/db";
import { dispatchNotification } from "@/lib/notificationService";
import { recalcKpiProgress } from "@/lib/kpiProgress";
import { triggerRollupForGoal } from "@/lib/rollup";
import { TASK_STATUS, type ReviewAction } from "@/lib/taskStatus";
import { awardPoints, reversePoints, refFor, taskReviewRound, taskApprovalRef } from "@/lib/points";
import { authorizeReview } from "@/lib/reviewAuth";
import { triggerRealtimeUpdate } from "@/lib/realtime";

const NOTIF_TRIGGER: Record<ReviewAction, string> = {
  [TASK_STATUS.APPROVED]: "task_approved",
  [TASK_STATUS.REVISION]: "task_revision",
  [TASK_STATUS.REJECTED]: "task_rejected",
};

export interface ReviewTaskInput {
  taskId: string;
  action: ReviewAction;
  managerId?: string | null;
  /** Manager's note. Stored separately so the employee's proof notes survive. */
  reviewNote?: string | null;
  /** Optional override; otherwise taken from the task row. */
  goalId?: string | null;
  /** Base URL used to call the XP service. */
  origin?: string;
  /**
   * Lewati pemeriksaan izin karena pemanggil sudah melakukannya di tingkat yang
   * lebih tinggi — dan hanya untuk itu.
   *
   * Dipakai dua tempat. `/api/kpi/review` memutuskan satu KPI lalu mencairkan
   * semua task di bawahnya; izinnya diperiksa terhadap KPI-nya, termasuk kasus
   * sah "manajer meng-ACC KPI yang ia tugaskan ke orang di luar timnya" —
   * memeriksa ulang per task justru akan menolak kasus itu.
   * `/api/tasks/unlinked-review` memutuskan satu grup milik satu karyawan dan
   * sudah memanggil `authorizeReview` untuk karyawan tersebut.
   */
  preauthorized?: boolean;
}

export interface ReviewTaskResult {
  ok: boolean;
  status?: number;
  error?: string;
  employeeId?: string;
  taskTitle?: string;
  goalId?: string | null;
}

/**
 * Single implementation of "manager decides on a submitted task".
 *
 * All three manager entry points (`verify-task`, `reject-task` and the
 * `tasks/pending` PUT) funnel through here. They previously each had their own
 * copy: only one of them triggered the goal rollup, only two of them notified
 * the employee, and the third silently overwrote the employee's proof notes
 * with the manager's review note.
 */
export async function reviewTask(input: ReviewTaskInput): Promise<ReviewTaskResult> {
  const { taskId, action, managerId, reviewNote, origin } = input;

  if (!taskId) return { ok: false, status: 400, error: "taskId wajib diisi" };

  const taskRes = await db.execute({
    sql: "SELECT user_id, title, goal_id, kpi_id FROM daily_priorities WHERE id = ?",
    args: [taskId],
  });
  const taskRow = taskRes.rows[0];
  if (!taskRow) return { ok: false, status: 404, error: "Task tidak ditemukan" };

  const employeeId = String(taskRow.user_id);
  const taskTitle = String(taskRow.title ?? "");
  // `goal_id` is the legacy column; KPI-linked tasks carry `kpi_id` instead.
  const goalId = input.goalId || taskRow.goal_id || taskRow.kpi_id || null;

  // ── Izin diperiksa di sini, bukan di masing-masing route ────────────────
  //
  // Fungsi ini MENCAIRKAN POIN. Tiga pintu manajer yang bermuara ke sini
  // (`verify-task`, `reject-task`, `tasks/pending` PUT) dulu hanya menerima
  // `managerId` dari body dan menuliskannya apa adanya — tidak satu pun
  // memeriksa apakah pengirimnya benar-benar manajer orang itu. Artinya siapa
  // pun yang tahu alamat endpoint-nya bisa meng-ACC task miliknya sendiri dan
  // membayar dirinya sendiri.
  //
  // Penjaganya diletakkan di dalam fungsi bersama ini, bukan disalin ke tiap
  // route, karena persis begitulah tiga pintu tadi bisa berbeda-beda sejak
  // awal: pintu keempat yang ditulis besok akan otomatis terjaga.
  if (!input.preauthorized) {
    const auth = await authorizeReview(managerId, employeeId);
    if (!auth.ok) {
      return { ok: false, status: auth.status || 403, error: auth.error };
    }
  }

  let managerName = "Manager";
  if (managerId) {
    const mgrRes = await db.execute({
      sql: "SELECT name FROM users WHERE id = ?",
      args: [managerId],
    });
    if (mgrRes.rows.length > 0) managerName = mgrRes.rows[0].name || "Manager";
  }

  const approved = action === TASK_STATUS.APPROVED;

  await db.execute({
    sql: `UPDATE daily_priorities
          SET is_verified = ?, is_done = ?, status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?
          WHERE id = ?`,
    args: [
      approved ? 1 : 0,
      approved ? 1 : 0,
      action,
      reviewNote || null,
      managerId || null,
      new Date().toISOString().slice(0, 19).replace("T", " "),
      taskId,
    ],
  });

  // Roll progress up on every outcome, not just approval — a reject flips
  // is_done back to 0, which changes the completed-task ratio just as much.
  //
  // These are two different stores and the old code only ever wrote to the
  // wrong one. `triggerRollupForGoal` updates the `goals` table; a KPI-linked
  // task carries `kpi_id`, which lives in `monthly_kpis`. Passing a kpi id to
  // the goals rollup produced an UPDATE that matched nothing, so ACC never
  // moved a KPI. Dispatch on which identifier the task actually has.
  const kpiId = taskRow.kpi_id ? String(taskRow.kpi_id) : null;
  const legacyGoalId = input.goalId || (taskRow.goal_id ? String(taskRow.goal_id) : null);

  if (kpiId) {
    const outcome = await recalcKpiProgress(kpiId);
    // A task pointing at a KPI that no longer exists means the review silently
    // achieves nothing — surface it rather than repeating the old failure mode.
    if (!outcome.ok && outcome.reason === "not_found") {
      console.warn(`reviewTask: task ${taskId} refers to unknown KPI ${kpiId}; progress not updated`);
    }
  }
  // The task creation flow writes `goal_id = kpi_id` for KPI-linked tasks, so
  // without this guard the legacy rollup would run a second time with a KPI id
  // and match nothing in `goals` — the exact no-op this change removes.
  if (legacyGoalId && legacyGoalId !== kpiId) {
    await triggerRollupForGoal(legacyGoalId);
  }

  await dispatchNotification(employeeId, NOTIF_TRIGGER[action], {
    task_title: taskTitle,
    manager_name: managerName,
    ...(reviewNote ? { note: reviewNote } : {}),
  });

  /*
   * Notifikasi saja tidak menggerakkan layar. Kartu task karyawan masih
   * menampilkan "menunggu ACC" sampai ia me-refresh, walaupun lonceng
   * notifikasinya sudah berbunyi — dua sumber kebenaran yang saling
   * bertentangan di layar yang sama.
   *
   * Manajernya ikut diberi sinyal supaya baris yang baru diputuskan hilang dari
   * antrean review tanpa perlu reload.
   *
   * Tidak boleh menggagalkan review: keputusannya sudah tersimpan di atas.
   */
  try {
    await triggerRealtimeUpdate(employeeId, { type: "refresh", slice: "tasks" });
    if (managerId) {
      await triggerRealtimeUpdate(String(managerId), { type: "refresh", slice: "tasks" });
    }
  } catch (e) {
    console.warn("[taskReview] Gagal memancarkan sinyal realtime:", e);
  }

  // ── Poin task, tahap kedua ───────────────────────────────────────────────
  //
  // Poin task dibayar dua tahap: 20 saat karyawan menandai selesai (umpan balik
  // instan), 10 lagi di sini saat manajer meng-ACC. Kalau ditolak, KEDUANYA
  // ditarik kembali — jadi mengarang task berakhir nol, bukan untung. Itulah
  // pengaman yang tidak bisa diberikan kuota sendirian: kuota membatasi
  // volume, verifikasi manajer yang membatasi kualitas.
  //
  // Kunci ACC dinomori per PUTARAN review (`task:<id>:acc`, lalu `:r1`, `:r2`…),
  // bukan sekali per task.
  //
  // Dengan satu kunci tetap, siklus tolak → revisi → ACC berakhir nol poin:
  // penolakan menarik kembali +20 dan +10, lalu persetujuan berikutnya ditolak
  // sebagai "sudah dibayar" karena baris `earn`-nya memang masih ada. Task yang
  // sah diperbaiki lalu disetujui jadi tidak dibayar sama sekali — menghukum
  // orang yang justru menuruti revisi.
  //
  // Yang TIDAK dinomori adalah `task:<id>` tahap pertama: sekali ditolak, bonus
  // penyelesaiannya hangus permanen. Jadi task bersih bernilai 30, task yang
  // sempat ditolak lalu diperbaiki bernilai 10 — tetap dihargai, tapi lebih
  // kecil, dan tidak ada gunanya sengaja minta ditolak.
  try {
    const round = await taskReviewRound(employeeId, taskId);

    if (approved) {
      await awardPoints({
        userId: employeeId,
        action: "task_approved",
        refId: taskApprovalRef(taskId, round),
        description: round === 0
          ? `Task disetujui: ${taskTitle}`
          : `Task disetujui setelah revisi: ${taskTitle}`,
      });
    } else {
      // Penolakan membatalkan kedua tahap. `reversePoints` menulis baris negatif
      // dan membiarkan baris `earn` tetap ada, jadi penyelesaian task ini tidak
      // akan pernah dibayar dua kali.
      await reversePoints({
        userId: employeeId,
        action: "task_complete",
        refId: refFor.task(taskId),
        reason: `Task ditolak: ${taskTitle}`,
      });
      // Membatalkan kunci putaran BERJALAN. Pembalikan inilah yang menaikkan
      // nomor putaran, sehingga persetujuan berikutnya memakai kunci baru.
      await reversePoints({
        userId: employeeId,
        action: "task_approved",
        refId: taskApprovalRef(taskId, round),
        reason: `Task ditolak: ${taskTitle}`,
      });
    }
  } catch (e) {
    console.warn("Gagal memproses poin review task:", e);
  }

  return { ok: true, employeeId, taskTitle, goalId: goalId ? String(goalId) : null };
}
