import { NextResponse } from 'next/server';
import { reviewTask } from '@/lib/taskReview';
import { normalizeReviewAction, TASK_STATUS } from '@/lib/taskStatus';

export async function POST(request: Request) {
  try {
    const { taskId, goalId, managerId, action = 'approve', note } = await request.json();

    if (!taskId) return NextResponse.json({ error: 'TaskId missing' }, { status: 400 });

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
    console.error("Verify Task Error:", error);
    return NextResponse.json({ error: 'Failed to process task', details: error.message }, { status: 500 });
  }
}
