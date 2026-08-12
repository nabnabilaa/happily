/**
 * Canonical status vocabulary for `daily_priorities.status`.
 *
 * Before this existed, three write paths invented their own spellings:
 * the employee completion path wrote `accepted`, the manager verify/reject
 * routes wrote `reject`, and the pending-review PUT wrote `rejected`. Readers
 * were split across all three, so a rejected task rendered as "active" on the
 * manager board and showed no banner at all on the employee card.
 */
export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  /** Employee marked it done; waiting for the manager to ACC. */
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REVISION: "revision",
  REJECTED: "rejected",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

/** Statuses a manager may set when reviewing a submitted task. */
export const REVIEW_ACTIONS = [
  TASK_STATUS.APPROVED,
  TASK_STATUS.REVISION,
  TASK_STATUS.REJECTED,
] as const;

export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

/**
 * Ejaan lama dari jalur tulis sebelum kosakata ini dikanonkan, plus bentuk kata
 * kerja pendek yang dikirim klien versi lama sebagai `action`.
 *
 * Kolom `status` di basis data SUDAH dinormalkan (2026-08-10): tinggal lima
 * nilai kanonik, tidak ada lagi NULL. Jadi peta ini bukan lagi penerjemah untuk
 * data tersimpan — ia tetap ada semata sebagai penjaga MASUKAN, karena klien
 * lama dan ekstensi yang belum diperbarui masih bisa mengirim ejaan-ejaan ini.
 *
 * Catatan pemetaan: `done` dan `accepted` menjadi PENDING_REVIEW, bukan
 * APPROVED. Keduanya dulu ditulis oleh jalur penyelesaian milik KARYAWAN —
 * artinya "saya sudah mengerjakan", bukan "manajer sudah menyetujui". Hanya
 * `verified` yang benar-benar berasal dari verifikasi manajer.
 */
const ALIASES: Record<string, TaskStatus> = {
  accepted: TASK_STATUS.PENDING_REVIEW,
  approve: TASK_STATUS.APPROVED,
  reject: TASK_STATUS.REJECTED,
  revise: TASK_STATUS.REVISION,
  done: TASK_STATUS.PENDING_REVIEW,
  verified: TASK_STATUS.APPROVED,
  pending: TASK_STATUS.PENDING_REVIEW,
};

export function normalizeTaskStatus(raw: unknown): TaskStatus | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (ALIASES[key]) return ALIASES[key];
  const known = Object.values(TASK_STATUS) as string[];
  return known.includes(key) ? (key as TaskStatus) : null;
}

/** Maps a client-supplied review verb onto a canonical terminal status. */
export function normalizeReviewAction(raw: unknown): ReviewAction | null {
  const status = normalizeTaskStatus(raw);
  return status && (REVIEW_ACTIONS as readonly string[]).includes(status)
    ? (status as ReviewAction)
    : null;
}

/**
 * True when the task is sitting in the manager's queue.
 *
 * Deliberately derived from `done`/`verified` rather than from `status` alone:
 * rows written before the status column was populated have `status = NULL` but
 * are still legitimately awaiting an ACC.
 */
export function isAwaitingReview(task: {
  done?: boolean | number;
  verified?: boolean | number;
  status?: unknown;
}): boolean {
  const status = normalizeTaskStatus(task.status);
  if (status === TASK_STATUS.APPROVED) return false;
  if (status === TASK_STATUS.REJECTED || status === TASK_STATUS.REVISION) return false;
  return Boolean(task.done) && !task.verified;
}

/** SQL fragment matching the same rows as {@link isAwaitingReview}. */
export const AWAITING_REVIEW_SQL = `(dp.is_done = 1 AND dp.is_verified = 0
   AND (dp.status IS NULL OR dp.status NOT IN ('approved', 'rejected', 'reject', 'revision', 'verified')))`;
