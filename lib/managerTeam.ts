import { db } from "@/lib/db";

export interface ManagerTeam {
  managerId: string;
  department: string;
  /** Ids of the manager's direct reports. Never includes the manager. */
  memberIds: string[];
}

/**
 * Resolves the set of people a manager is responsible for.
 *
 * The schema migrated from `users.team_id` to `users.department` (see the
 * team_id → department backfill in migrate-schema), and later added an explicit
 * `users.manager_id`. Manager routes were split across all three: the dashboard
 * used `department`, while broadcast and alerts still queried the legacy
 * `team_id`, so they targeted an empty set.
 *
 * Resolution order:
 *  1. explicit `manager_id` reports — the authoritative relation when populated
 *  2. otherwise everyone sharing the manager's `department`, minus other
 *     managers/HR, so a manager does not "manage" their own peers
 */
export async function resolveManagerTeam(managerId: string): Promise<ManagerTeam> {
  const managerRes = await db.execute({
    sql: "SELECT department FROM users WHERE id = ?",
    args: [managerId],
  });
  const department = (managerRes.rows[0] as any)?.department || "";

  const directRes = await db.execute({
    sql: "SELECT id FROM users WHERE manager_id = ? AND id != ?",
    args: [managerId, managerId],
  });

  if (directRes.rows.length > 0) {
    return {
      managerId,
      department,
      memberIds: directRes.rows.map((r) => String(r.id)),
    };
  }

  if (!department) return { managerId, department, memberIds: [] };

  const deptRes = await db.execute({
    sql: `SELECT id FROM users
          WHERE department = ? AND id != ?
            AND (role IS NULL OR role NOT IN ('hr', 'admin', 'manager'))`,
    args: [department, managerId],
  });

  return {
    managerId,
    department,
    memberIds: deptRes.rows.map((r) => String(r.id)),
  };
}

/** `?, ?, ?` placeholder list for an `IN (...)` clause. */
export function placeholdersFor(ids: string[]): string {
  return ids.map(() => "?").join(",");
}
