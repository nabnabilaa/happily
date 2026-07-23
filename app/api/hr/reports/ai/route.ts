import { NextResponse } from "next/server";
import { getRequesterAccess, canManageTeam } from "@/lib/hrAuth";
import { getStoredNarrative, normScope, periodLabelOf } from "@/lib/reportNarrative";

// GET: fetch a stored (auto-recap or previously generated) narrative for the dashboard's scope/period.
// Params: requesterId, month, year, week, department
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('requesterId') || searchParams.get('adminId');
    if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const requester = await getRequesterAccess(requesterId);
    if (!canManageTeam(requester.role, requester.hrAccess)) return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1;
    const year = Number(searchParams.get('year')) || new Date().getFullYear();
    const week = Number(searchParams.get('week')) || 0;
    const scope = normScope(searchParams.get('department') || 'all');

    const stored = await getStoredNarrative({ scope, month, year, week });
    return NextResponse.json({ stored, periodLabel: periodLabelOf(month, year, week) });
  } catch (error: any) {
    console.error("Report AI GET error:", error);
    return NextResponse.json({ error: "Gagal memuat narasi tersimpan", details: error.message }, { status: 500 });
  }
}

// NB: Tidak ada POST (generate on-demand) — rangkuman AI dibuat HANYA lewat jadwal
// (cron/report-recap: Jumat mingguan + tanggal 1 bulanan) supaya hemat token. GET hanya membaca hasil tersimpan.
