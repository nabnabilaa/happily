import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/priorities/complete
// Immediately persists task completion to DB so refetches don't see stale state.
export async function PATCH(request: Request) {
  try {
    const { id, done, partialProgress, status, proofLinks, notes, metricValue, isProject, completedAt } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    await db.execute({
      sql: `UPDATE daily_priorities
            SET is_done = ?,
                partial_progress = ?,
                status = ?,
                proof_link = ?,
                proof_notes = ?,
                metric_value = ?,
                is_project = ?,
                completed_at = ?
            WHERE id = ?`,
      args: [
        done ? 1 : 0,
        partialProgress ?? 0,
        status || (done ? "accepted" : "in_progress"),
        proofLinks?.length ? JSON.stringify(proofLinks) : null,
        notes || null,
        metricValue ?? null,
        isProject ? 1 : 0,
        done ? (completedAt ? new Date(completedAt).toISOString().slice(0, 19).replace("T", " ") : now) : null,
        id,
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Priority complete error:", error);
    return NextResponse.json({ error: "Gagal menyimpan task" }, { status: 500 });
  }
}
