import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TASK_STATUS, normalizeTaskStatus } from "@/lib/taskStatus";

// PATCH /api/priorities/complete
// Immediately persists task completion to DB so refetches don't see stale state.
export async function PATCH(request: Request) {
  try {
    const { id, done, partialProgress, status, proofLinks, notes, metricValue, isProject, completedAt } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Completing a task hands it to the manager for verification. This used to
    // write "accepted", a status nothing read and which no queue matched, so
    // submitted work never reached the manager's review list.
    const nextStatus =
      normalizeTaskStatus(status) ||
      (done ? TASK_STATUS.PENDING_REVIEW : TASK_STATUS.IN_PROGRESS);

    // Re-submitting after a revision clears the previous review verdict.
    const isSubmission = nextStatus === TASK_STATUS.PENDING_REVIEW;

    await db.execute({
      sql: `UPDATE daily_priorities
            SET is_done = ?,
                partial_progress = ?,
                status = ?,
                proof_link = ?,
                proof_notes = ?,
                metric_value = ?,
                is_project = ?,
                completed_at = ?,
                submitted_at = ?,
                is_verified = CASE WHEN ? = 1 THEN 0 ELSE is_verified END
            WHERE id = ?`,
      args: [
        done ? 1 : 0,
        partialProgress ?? 0,
        nextStatus,
        proofLinks?.length ? JSON.stringify(proofLinks) : null,
        notes || null,
        metricValue ?? null,
        isProject ? 1 : 0,
        done ? (completedAt ? new Date(completedAt).toISOString().slice(0, 19).replace("T", " ") : now) : null,
        isSubmission ? now : null,
        isSubmission ? 1 : 0,
        id,
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Priority complete error:", error);
    return NextResponse.json({ error: "Gagal menyimpan task" }, { status: 500 });
  }
}
