import { db } from "@/lib/db";
import { aggregateReport } from "@/lib/reportAggregate";
import { generateReportNarrative, normScope } from "@/lib/reportNarrative";

// Core auto-recap runner shared by the HTTP cron route AND the in-app scheduler.
// Generates + stores AI narratives for every scope (all + each division) for a resolved period.
// A DB lock (cron_run_locks) makes it safe to fire from multiple instances / repeated ticks.

export interface RecapResult {
  ran: boolean;
  skipped?: boolean;
  type: 'weekly' | 'monthly';
  period: { month: number; year: number; week: number };
  scopes?: { scope: string; people: number; generatedByAI: boolean }[];
}

let lockTableReady = false;
async function ensureLockTable() {
  if (lockTableReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS cron_run_locks (
    lock_key VARCHAR(140) PRIMARY KEY,
    run_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  lockTableReady = true;
}

// Atomic: returns true only for the first caller to insert this key (INSERT IGNORE + affectedRows).
async function acquireRunLock(key: string): Promise<boolean> {
  await ensureLockTable();
  return db.transaction(async (conn) => {
    const [res]: any = await conn.execute("INSERT IGNORE INTO cron_run_locks (lock_key, run_at) VALUES (?, NOW())", [key]);
    return (res?.affectedRows ?? 0) > 0;
  });
}

export function resolvePeriod(type: 'weekly' | 'monthly', o: { month?: number; year?: number; week?: number } = {}) {
  const now = new Date();
  let month = o.month || 0, year = o.year || 0, week = o.week != null ? o.week : -1;
  if (type === 'weekly') {
    if (!month) month = now.getMonth() + 1;
    if (!year) year = now.getFullYear();
    if (week < 0) week = Math.min(5, Math.max(1, Math.ceil(now.getDate() / 7)));
  } else {
    week = 0;
    if (!month || !year) {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      if (!month) month = prev.getMonth() + 1;
      if (!year) year = prev.getFullYear();
    }
  }
  return { month, year, week };
}

export async function runRecap(opts: { type: 'weekly' | 'monthly'; month?: number; year?: number; week?: number; force?: boolean }): Promise<RecapResult> {
  const type = opts.type;
  const { month, year, week } = resolvePeriod(type, opts);

  // Dedup unless forced. One lock per (type, resolved period).
  if (!opts.force) {
    const lockKey = `recap_${type}_${year}_${month}_${week}`;
    const acquired = await acquireRunLock(lockKey);
    if (!acquired) return { ran: false, skipped: true, type, period: { month, year, week } };
  }

  const deptRes = await db.execute("SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != ''");
  const departments = (deptRes.rows as any[]).map(r => String(r.department));
  const scopes = ['all', ...departments];

  const results: { scope: string; people: number; generatedByAI: boolean }[] = [];
  for (const scope of scopes) {
    const department = scope === 'all' ? 'all' : scope;
    const { team, people } = await aggregateReport({ month, year, week, department });
    if (!people.length) { results.push({ scope, people: 0, generatedByAI: false }); continue; }
    const { generatedByAI } = await generateReportNarrative({
      team, people, month, year, week, scope: normScope(department),
      scopeLabel: scope === 'all' ? 'Semua Divisi' : scope,
    });
    results.push({ scope, people: people.length, generatedByAI });
  }

  return { ran: true, type, period: { month, year, week }, scopes: results };
}
