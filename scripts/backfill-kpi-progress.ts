/**
 * Recomputes `monthly_kpis.metric_current` for every KPI that has tasks.
 *
 * Needed once because task review used to roll progress into the `goals` table
 * instead of `monthly_kpis` (see lib/kpiProgress.ts), so no approval that ever
 * happened is reflected in a KPI's measurement. Everything from here on is kept
 * current by `reviewTask`; this only repairs the accumulated gap.
 *
 * Prints a before/after diff and does not touch KPIs that are under manager
 * review, since those carry a deliberate penalty adjustment.
 *
 *   npx tsx scripts/backfill-kpi-progress.ts          # dry run
 *   npx tsx scripts/backfill-kpi-progress.ts --apply  # write
 */
import { db } from "../lib/db";
import { recalcKpiProgress } from "../lib/kpiProgress";

async function main() {
  const apply = process.argv.includes("--apply");

  const res = await db.execute(`
    SELECT mk.id, mk.title, mk.kpi_type, mk.metric_current, mk.metric_target, mk.review_status,
           (SELECT COUNT(*) FROM daily_priorities dp WHERE dp.kpi_id = mk.id) AS tasks,
           (SELECT COUNT(*) FROM daily_priorities dp WHERE dp.kpi_id = mk.id AND dp.is_verified = 1) AS verified
    FROM monthly_kpis mk
    WHERE EXISTS (SELECT 1 FROM daily_priorities dp WHERE dp.kpi_id = mk.id)
    ORDER BY mk.year, mk.month, mk.title
  `);

  if (res.rows.length === 0) {
    console.log("Tidak ada KPI yang punya task. Tidak ada yang perlu di-backfill.");
    process.exit(0);
  }

  const changes: any[] = [];
  let underReview = 0;
  let noInputs = 0;

  for (const k of res.rows) {
    const before = k.metric_current === null ? null : Number(k.metric_current);

    if (k.review_status) {
      underReview++;
      continue;
    }

    // Mirror recalcKpiProgress's arithmetic so the dry run is honest about what
    // --apply would do, instead of reporting a value it never computed —
    // including its refusal to overwrite a metric KPI that has no daily inputs
    // backing it.
    let after: number;
    if (String(k.kpi_type) === "metric") {
      const s = await db.execute({
        sql: `SELECT COUNT(*) AS n, COALESCE(SUM(value), 0) AS total
              FROM kpi_daily_inputs WHERE kpi_id = ?`,
        args: [String(k.id)],
      });
      if (Number(s.rows[0]?.n) === 0) {
        noInputs++;
        continue;
      }
      after = Number(s.rows[0]?.total) || 0;
    } else {
      after = Number(k.verified) || 0;
    }

    if (before !== after) {
      changes.push({
        id: k.id,
        judul: String(k.title).slice(0, 34),
        tipe: k.kpi_type,
        task: Number(k.tasks),
        acc: Number(k.verified),
        sebelum: before,
        sesudah: after,
        target: k.metric_target === null ? null : Number(k.metric_target),
      });
    }
  }

  console.log(
    `KPI dengan task: ${res.rows.length}` +
    ` | dilewati krn sedang direview: ${underReview}` +
    ` | dilewati krn belum ada kpi_daily_inputs: ${noInputs}` +
    ` | berubah: ${changes.length}\n`
  );
  if (changes.length > 0) console.table(changes);

  if (!apply) {
    console.log("\nDry run. Jalankan ulang dengan --apply untuk menulis perubahan.");
    process.exit(0);
  }

  for (const c of changes) {
    await recalcKpiProgress(String(c.id));
  }
  console.log(`\nSelesai. ${changes.length} KPI diperbarui.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
