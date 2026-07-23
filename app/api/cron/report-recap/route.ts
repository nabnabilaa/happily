import { NextResponse } from "next/server";
import { runRecap } from "@/lib/reportRecapRunner";

// GET: Auto-recap cron endpoint (HTTP trigger for Vercel Cron / VPS crontab / manual).
//   ?type=weekly    → recap the current week-of-month
//   ?type=monthly   → recap the month that just ended (previous month)
// Overrides: &month= &year= &week=   ·   &force=1 bypasses the once-per-period lock
// Auth: &secret=<CRON_SECRET>  OR  header "Authorization: Bearer <CRON_SECRET>" (Vercel injects this).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const authHeader = request.headers.get('authorization') || '';
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = (searchParams.get('type') === 'weekly') ? 'weekly' : 'monthly';
    const num = (k: string) => (searchParams.get(k) != null ? Number(searchParams.get(k)) : undefined);
    const result = await runRecap({
      type, month: num('month'), year: num('year'), week: num('week'),
      force: searchParams.get('force') === '1' || searchParams.get('force') === 'true',
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Report recap cron error:", error);
    return NextResponse.json({ error: "Gagal menjalankan recap", details: error.message }, { status: 500 });
  }
}
