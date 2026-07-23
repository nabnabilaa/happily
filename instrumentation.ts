// Runs once when a Next.js server instance boots (Node runtime).
// Starts the in-app auto-recap scheduler for self-hosted / VPS deploys.
// Skipped on: edge runtime, Vercel (use vercel.json crons there), or when explicitly disabled.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.VERCEL) return;
  if (process.env.ENABLE_INAPP_SCHEDULER === 'false') return;

  const { startReportScheduler } = await import('./lib/reportScheduler');
  startReportScheduler();
}
