import { NextResponse } from "next/server";
import { getRequesterAccess, canManageTeam } from "@/lib/hrAuth";
import { aggregateReport } from "@/lib/reportAggregate";

// GET: Aggregated report metrics for the HR/Manager report dashboard (charts + per-person cards).
// Scope: HR/hr_access = semua; Manager = otomatis dibatasi ke timnya.
// Params: requesterId|adminId, month, year, week(0=semua), department(all|<name>), userIds(csv)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('adminId') || searchParams.get('requesterId');
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1;
    const year = Number(searchParams.get('year')) || new Date().getFullYear();
    const week = Number(searchParams.get('week')) || 0;
    const department = searchParams.get('department') || 'all';

    if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await getRequesterAccess(requesterId);
    if (!canManageTeam(requester.role, requester.hrAccess)) {
      return NextResponse.json({ error: "Unauthorized. Hanya HR dan Manager yang dapat mengakses laporan." }, { status: 403 });
    }

    const isFullAccess = requester.role === 'hr' || requester.hrAccess;
    const managerScope = (!isFullAccess && requester.role === 'manager') ? requesterId : null;
    const userIdsParam = searchParams.get('userIds');
    const userIds = userIdsParam ? userIdsParam.split(',') : [];

    const { team, people } = await aggregateReport({ month, year, week, department, userIds, managerScope });
    return NextResponse.json({ period: { month, year, week }, team, people });
  } catch (error: any) {
    console.error("Dashboard report error:", error);
    return NextResponse.json({ error: "Gagal memproses data dashboard", details: error.message }, { status: 500 });
  }
}
