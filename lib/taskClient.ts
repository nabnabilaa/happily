/**
 * Client-side writers for a single task.
 *
 * Task state used to ride along in the debounced `POST /api/storage` blob, so a
 * component could mutate React state and the row would eventually follow. That
 * replay is gone — it deleted rows a stale tab had never heard of and reverted
 * manager approvals — so every mutation now needs an explicit write. These
 * wrappers exist so the five call sites that do it agree on the URL, the
 * payload shape and the failure behaviour.
 *
 * All of them resolve to `false` on failure rather than throwing, so callers can
 * roll their optimistic update back and tell the user instead of leaving the UI
 * showing something the database never accepted.
 */

export async function deleteTaskRemote(id: string | number, userId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/priorities?id=${encodeURIComponent(String(id))}&userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
    return res.ok;
  } catch (e) {
    console.error("Failed to delete task:", e);
    return false;
  }
}

export async function updateTaskRemote(
  id: string | number,
  userId: string,
  fields: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch("/api/priorities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userId, ...fields }),
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to update task:", e);
    return false;
  }
}

export interface TaskCompletionPatch {
  done: boolean;
  partialProgress?: number;
  status?: string;
  proofLinks?: string[];
  notes?: string | null;
  metricValue?: number | null;
  isProject?: boolean;
  completedAt?: string | null;
}

export async function completeTaskRemote(
  id: string | number,
  patch: TaskCompletionPatch
): Promise<boolean> {
  try {
    const res = await fetch("/api/priorities/complete", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to persist task completion:", e);
    return false;
  }
}
