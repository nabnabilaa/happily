import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAwaitingReview, normalizeTaskStatus } from "@/lib/taskStatus";

function parseProofLinks(raw: any): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw as string);
    return Array.isArray(v) ? v : [raw];
  } catch {
    return [raw];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');
    if (!goalId) return NextResponse.json({ error: "goalId required" }, { status: 400 });

    // `is_verified`, `status` dan bukti kerjanya ikut dibawa karena layar review
    // KPI memakai daftar ini sebagai dasar keputusan ACC — tanpa itu tidak ada
    // cara membedakan task yang masih menunggu dari yang sudah disetujui.
    const res = await db.execute({
      sql: `SELECT dp.id, dp.title, dp.is_done, dp.is_verified, dp.status, dp.description,
                   dp.created_at, dp.target_date, dp.completed_at,
                   dp.proof_link, dp.proof_notes, dp.metric_value,
                   dp.weekly_target_id, dp.weekly_target_title,
                   u.name AS owner_name
            FROM daily_priorities dp
            LEFT JOIN users u ON dp.user_id = u.id
            WHERE dp.goal_id = ? OR dp.kpi_id = ?
            ORDER BY dp.created_at DESC`,
      args: [goalId, goalId]
    });

    const tasks = res.rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      done: !!r.is_done,
      verified: !!r.is_verified,
      status: normalizeTaskStatus(r.status),
      awaitingReview: isAwaitingReview({ done: r.is_done, verified: r.is_verified, status: r.status }),
      description: r.description,
      ownerName: r.owner_name || null,
      createdAt: r.created_at,
      targetDate: r.target_date,
      completedAt: r.completed_at || null,
      proofLinks: parseProofLinks(r.proof_link),
      proofNotes: r.proof_notes || null,
      metricValue: r.metric_value !== null && r.metric_value !== undefined ? Number(r.metric_value) : null,
      weekly_target_id: r.weekly_target_id || null,
      weekly_target_title: r.weekly_target_title || null
    }));

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error("KPI Tasks Error:", error);
    return NextResponse.json({ error: "Failed", details: error.message }, { status: 500 });
  }
}

