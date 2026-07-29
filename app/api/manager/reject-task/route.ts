import { NextResponse } from 'next/server';
import { reviewTask } from '@/lib/taskReview';
import { normalizeReviewAction, TASK_STATUS } from '@/lib/taskStatus';

/**
 * Thin alias over the shared review flow, kept because existing clients post
 * here for the reject/revision half of the decision. Approvals are rejected so
 * the two endpoints cannot drift apart again.
 */
export async function POST(request: Request) {
  try {
    const { taskId, goalId, managerId, action, note } = await request.json();

    if (!taskId || !action) {
      return NextResponse.json({ error: 'TaskId and action missing' }, { status: 400 });
    }

    const reviewAction = normalizeReviewAction(action);
    if (!reviewAction || reviewAction === TASK_STATUS.APPROVED) {
      return NextResponse.json(
        { error: `Action harus ${TASK_STATUS.REVISION} atau ${TASK_STATUS.REJECTED}.` },
        { status: 400 }
      );
    }

    const result = await reviewTask({
      taskId,
      action: reviewAction,
      managerId,
      goalId,
      reviewNote: note,
      origin: new URL(request.url).origin,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }

    return NextResponse.json({ success: true, status: reviewAction });
  } catch (error: any) {
    console.error("Reject/Revision Task Error:", error);
    return NextResponse.json({ error: 'Failed to process task', details: error.message }, { status: 500 });
  }
}
