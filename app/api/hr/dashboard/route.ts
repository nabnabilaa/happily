import { NextResponse } from 'next/server';
import { buildHrDashboard } from '@/lib/hrDashboard';

/**
 * Seluruh perhitungannya ada di `lib/hrDashboard.ts`, dipakai bersama dengan
 * cabang HR di `/api/ext/sync`. Sebelumnya kedua tempat itu berisi salinan
 * logika yang sama dan sudah terbukti menyimpang satu sama lain.
 */
export async function GET() {
  try {
    const data = await buildHrDashboard();

    return NextResponse.json({
      metrics: data.metrics,
      // Hanya lima teratas yang ditampilkan kartu "butuh perhatian".
      atRiskEmployees: data.atRiskEmployees.slice(0, 5),
      deptPulse: data.deptPulse,
      programs: data.programs,
      // Layar ini hanya memakai identitas dan divisinya; bentuk ringkas ini
      // dipertahankan supaya klien yang sudah ada tidak perlu ikut berubah.
      members: data.members.map(m => ({
        id: m.id,
        name: m.name,
        role: m.role,
        team: m.dept,
      })),
    });
  } catch (error) {
    console.error("HR Dashboard Error:", error);
    return NextResponse.json({ error: 'Failed to fetch HR data' }, { status: 500 });
  }
}
