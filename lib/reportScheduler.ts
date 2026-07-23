import { runRecap } from "@/lib/reportRecapRunner";

// Dependency-free in-app scheduler. Started once per server process from instrumentation.ts.
// Fires the auto-recap during a window (not a single instant) so a VPS that was briefly down
// still catches up; the DB lock in runRecap guarantees each period runs only once.
//
//   Weekly  → Jumat, jam >= 17:00 (window sampai tengah malam) → semua divisi + all terangkum
//   Monthly → tanggal 1, jam >= 00:30 (window sepanjang hari-1) → bulan yang baru berakhir terangkum
//
// Times are SERVER-LOCAL — set the server timezone (e.g. TZ=Asia/Jakarta) accordingly.

const g = globalThis as unknown as { __flowbeeRecapScheduler?: boolean };

export function startReportScheduler() {
  if (g.__flowbeeRecapScheduler) return; // guard against dev hot-reload / duplicate starts
  g.__flowbeeRecapScheduler = true;

  let running = false;
  const tick = async () => {
    if (running) return;
    const now = new Date();
    const weeklyWindow = now.getDay() === 5 && now.getHours() >= 17; // Jumat sore
    const monthlyWindow = now.getDate() === 1 && (now.getHours() > 0 || now.getMinutes() >= 30);
    if (!weeklyWindow && !monthlyWindow) return;

    running = true;
    try {
      if (monthlyWindow) {
        const r = await runRecap({ type: 'monthly' });
        if (r.ran) console.log('[recap] monthly generated', r.period);
      }
      if (weeklyWindow) {
        const r = await runRecap({ type: 'weekly' });
        if (r.ran) console.log('[recap] weekly generated', r.period);
      }
    } catch (e) {
      console.warn('[recap] scheduler tick error:', e);
    } finally {
      running = false;
    }
  };

  // Catch-up shortly after boot, then check every minute (lock dedups, so re-checks are cheap).
  setTimeout(tick, 15_000);
  const interval = setInterval(tick, 60_000);
  if (typeof interval.unref === 'function') interval.unref();
  console.log('[recap] in-app scheduler started (weekly Fri>=17:00, monthly day1>=00:30, server-local time)');
}
