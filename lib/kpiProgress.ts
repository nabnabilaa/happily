import { db } from "@/lib/db";

/**
 * Recomputes a KPI's progress from the work that actually backs it.
 *
 * Why this exists: `lib/rollup.ts` was the only thing wired to task review, and
 * it updates the `goals` table — `UPDATE goals SET progress = ? WHERE id = ?`.
 * KPIs do not live in `goals`, they live in `monthly_kpis`, and tasks reference
 * them through `daily_priorities.kpi_id`. Every ACC therefore ran an UPDATE that
 * matched zero rows, committed cleanly, and moved nothing. Counted against the
 * live database: of the verified tasks that carry a target, none resolve to a
 * row in `goals` and all of them resolve to a row in `monthly_kpis`.
 *
 * `final_score` is deliberately left alone — that column is the manager's own
 * review score (`app/api/kpi/review/route.ts`) and takes precedence over the
 * derived ratio wherever progress is displayed. This function only maintains
 * `metric_current`, which is the raw measurement.
 */

export type KpiRecalcOutcome =
  | { ok: true; kpiId: string; metricCurrent: number }
  | { ok: false; kpiId: string; reason: "not_found" | "under_review" | "no_inputs" };

export async function recalcKpiProgress(kpiId: string): Promise<KpiRecalcOutcome> {
  if (!kpiId) return { ok: false, kpiId, reason: "not_found" };

  const kpiRes = await db.execute({
    sql: "SELECT id, kpi_type, review_status FROM monthly_kpis WHERE id = ?",
    args: [kpiId],
  });
  const kpi = kpiRes.rows[0];
  if (!kpi) return { ok: false, kpiId, reason: "not_found" };

  // Hanya review yang MENJATUHKAN PENALTI yang boleh membekukan angka ini.
  //
  // `revision` dan `rejected` memindahkan nilai asli ke `original_metric_current`
  // lalu menurunkan `metric_current`; menghitung ulang di sini akan menghapus
  // penalti itu. `approved` tidak menurunkan apa pun.
  //
  // Dulu syaratnya sekadar "ada review_status", jadi begitu ACC per-KPI menulis
  // 'approved' KPI tersebut berhenti melacak progres selamanya — setiap task
  // yang disetujui sesudahnya tidak lagi menggerakkan metric_current.
  if (kpi.review_status === "revision" || kpi.review_status === "rejected") {
    return { ok: false, kpiId, reason: "under_review" };
  }

  let metricCurrent: number;

  if (String(kpi.kpi_type) === "metric") {
    // Metric KPIs accumulate through `kpi_daily_inputs`; the sum is the truth —
    // but only once that flow is actually in use. A KPI whose `metric_current`
    // was set by some other route (seeding, a manual correction) has no input
    // rows at all, and summing an empty set would silently reset a real
    // measurement to zero. Own the column only when we have something to own
    // it with.
    const sumRes = await db.execute({
      sql: `SELECT COUNT(*) AS n, COALESCE(SUM(value), 0) AS total
            FROM kpi_daily_inputs WHERE kpi_id = ?`,
      args: [kpiId],
    });
    if (Number(sumRes.rows[0]?.n) === 0) {
      return { ok: false, kpiId, reason: "no_inputs" };
    }
    metricCurrent = Number(sumRes.rows[0]?.total) || 0;
  } else {
    // Completion KPIs count tasks the manager has actually approved. Counting
    // `is_done` instead would let an employee move their own KPI by ticking a
    // checkbox, which is the thing the ACC step exists to prevent.
    const countRes = await db.execute({
      sql: "SELECT COUNT(*) AS verified FROM daily_priorities WHERE kpi_id = ? AND is_verified = 1",
      args: [kpiId],
    });
    metricCurrent = Number(countRes.rows[0]?.verified) || 0;
  }

  await db.execute({
    sql: "UPDATE monthly_kpis SET metric_current = ? WHERE id = ?",
    args: [metricCurrent, kpiId],
  });

  return { ok: true, kpiId, metricCurrent };
}

/**
 * Recomputes every KPI a set of tasks points at. Used by the backfill and by
 * any flow that touches more than one task at a time.
 */
export async function recalcKpisForTasks(taskIds: string[]): Promise<void> {
  if (taskIds.length === 0) return;
  const placeholders = taskIds.map(() => "?").join(",");
  const res = await db.execute({
    sql: `SELECT DISTINCT kpi_id FROM daily_priorities
          WHERE id IN (${placeholders}) AND kpi_id IS NOT NULL AND kpi_id <> ''`,
    args: taskIds,
  });
  for (const row of res.rows) {
    await recalcKpiProgress(String(row.kpi_id));
  }
}
