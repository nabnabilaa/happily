import { db } from "@/lib/db";

// Helper to trigger recalculation of a goal and its ancestors
export async function recalculateGoalProgress(goalId: string): Promise<void> {
  if (!goalId) return;

  await db.transaction(async (conn) => {
    // 1. Calculate progress from daily tasks linked to this goal
    // We assume the progress of a Goal is (completed_tasks / total_tasks) * 100
    // If a goal has sub-goals (KPI -> Target), its progress is the average progress of sub-goals.
    // Let's check if this goal has sub-goals or daily tasks.

    // First check if it has sub-goals
    const [subGoalsRows]: any = await conn.execute(
      "SELECT progress FROM goals WHERE parent_id = ?",
      [goalId]
    );

    let newProgress = 0;

    if (subGoalsRows.length > 0) {
      // It has sub-goals, calculate average progress of sub-goals
      const totalProgress = subGoalsRows.reduce((sum: number, row: any) => sum + (Number(row.progress) || 0), 0);
      newProgress = Math.round(totalProgress / subGoalsRows.length);
    } else {
      // It's a leaf goal (Target), calculate from daily_priorities
      const [tasksRows]: any = await conn.execute(
        "SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done FROM daily_priorities WHERE goal_id = ?",
        [goalId]
      );
      const totalTasks = Number(tasksRows[0]?.total) || 0;
      const doneTasks = Number(tasksRows[0]?.done) || 0;

      if (totalTasks > 0) {
        // If there are tasks, progress is ratio of completed tasks
        newProgress = Math.round((doneTasks / totalTasks) * 100);
      } else {
        // If no tasks, leave progress as is? Or 0? Let's keep it 0 if no tasks and no subgoals.
        // Wait, maybe the user wants to leave it as 0 if there's nothing.
        newProgress = 0;
      }
    }

    // Update the goal's progress
    await conn.execute(
      "UPDATE goals SET progress = ? WHERE id = ?",
      [newProgress, goalId]
    );

    // 2. Rollup to parent goal
    const [parentRows]: any = await conn.execute(
      "SELECT parent_id FROM goals WHERE id = ?",
      [goalId]
    );
    const parentId = parentRows[0]?.parent_id;

    if (parentId) {
      // Recursively recalculate parent progress
      // (Since we are in a transaction, the recursive call must use the same connection if we want it to be atomic,
      // but recalculateGoalProgress uses a new transaction by default.
      // So we should extract the inner logic)
    }
  });
}

// Inner recursive function that uses the same connection
export async function recalculateGoalProgressRecursive(conn: any, goalId: string): Promise<void> {
  if (!goalId) return;

  const [subGoalsRows]: any = await conn.execute(
    "SELECT progress FROM goals WHERE parent_id = ?",
    [goalId]
  );

  let newProgress = 0;

  if (subGoalsRows.length > 0) {
    const totalProgress = subGoalsRows.reduce((sum: number, row: any) => sum + (Number(row.progress) || 0), 0);
    newProgress = Math.round(totalProgress / subGoalsRows.length);
  } else {
    const [tasksRows]: any = await conn.execute(
      "SELECT COUNT(*) as total, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done FROM daily_priorities WHERE goal_id = ?",
      [goalId]
    );
    const totalTasks = Number(tasksRows[0]?.total) || 0;
    const doneTasks = Number(tasksRows[0]?.done) || 0;

    if (totalTasks > 0) {
      newProgress = Math.round((doneTasks / totalTasks) * 100);
    }
  }

  await conn.execute(
    "UPDATE goals SET progress = ? WHERE id = ?",
    [newProgress, goalId]
  );

  const [parentRows]: any = await conn.execute(
    "SELECT parent_id FROM goals WHERE id = ?",
    [goalId]
  );
  const parentId = parentRows[0]?.parent_id;

  if (parentId) {
    await recalculateGoalProgressRecursive(conn, parentId);
  }
}

export async function triggerRollupForGoal(goalId: string): Promise<void> {
  if (!goalId) return;
  try {
    await db.transaction(async (conn) => {
      await recalculateGoalProgressRecursive(conn, goalId);
    });
  } catch (error) {
    console.error("Rollup failed for goal", goalId, error);
  }
}
