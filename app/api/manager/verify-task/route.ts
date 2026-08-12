import { NextResponse } from 'next/server';
import { reviewTask } from '@/lib/taskReview';
import { normalizeReviewAction, TASK_STATUS } from '@/lib/taskStatus';
import { requireActor } from "@/lib/apiAuth";

export async function POST(request: Request) {
  try {
    const { taskId, goalId, managerId, action = 'approve', note } = await request.json();

    if (!taskId) return NextResponse.json({ error: 'TaskId missing' }, { status: 400 });

    /*
     * Peninjau ditentukan cookie, bukan body.
     *
     * `reviewTask` sudah memeriksa apakah peninjau berhak memutuskan pekerjaan
     * orang ini sebelum poinnya dicairkan — tapi selama `managerId` datang dari
     * body, karyawan cukup menuliskan id atasannya untuk meng-ACC pekerjaannya
     * sendiri dan mencairkan poinnya. Pemeriksaannya benar; asal identitasnya
     * yang salah.
     */
    const actor = await requireActor(request, managerId);
    if ("response" in actor) return actor.response;
    const verifiedManagerId = actor.userId;

    const reviewAction = normalizeReviewAction(action);
    if (!reviewAction) {
      return NextResponse.json(
        { error: `Action tidak dikenal: ${action}. Gunakan ${TASK_STATUS.APPROVED}, ${TASK_STATUS.REVISION}, atau ${TASK_STATUS.REJECTED}.` },
        { status: 400 }
      );
    }

    const result = await reviewTask({
      taskId,
      action: reviewAction,
      managerId: verifiedManagerId,
      goalId,
      reviewNote: note,
      origin: new URL(request.url).origin,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }

    return NextResponse.json({ success: true, status: reviewAction });
  } catch (error: any) {
    console.error("Verify Task Error:", error);
    return NextResponse.json({ error: 'Failed to process task', details: error.message }, { status: 500 });
  }
}
