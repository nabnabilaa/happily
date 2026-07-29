import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * The department list as onboarding needs to see it.
 *
 * `/api/hr/departments` returns raw rows, which is all the HR editor needs. The
 * onboarding "divisi" step shows a real team card — how many people are already
 * there, who leads it, a few faces — because that is the moment the employee
 * decides which team they belong to. Giving them a bare label to pick from is
 * why that step used to feel like a dropdown rather than joining a team.
 *
 * Read-only and names-only on purpose: it runs before the employee has a
 * department, so it cannot be gated behind one.
 */

export interface OnboardingDepartment {
  id: string | number | null;
  name: string;
  /** People already sitting in this department. */
  memberCount: number;
  /** First manager found in the department, if any. */
  managerName: string | null;
  /** A handful of names, purely to render stacked initials. */
  sample: string[];
}

export async function GET() {
  try {
    const deptRes = await db.execute("SELECT id, name FROM departments ORDER BY name ASC");

    const departments = deptRes.rows
      .map((r: any) => ({ id: r.id ?? null, name: String(r.name ?? "").trim() }))
      .filter((d) => d.name.length > 0);

    if (departments.length === 0) {
      return NextResponse.json({ departments: [] as OnboardingDepartment[] });
    }

    // One pass over the roster, grouped in memory. A GROUP BY join would be
    // tighter, but department membership is matched case-insensitively on a
    // free-text column and doing that in SQL differs per dialect.
    let roster: { name: string; department: string; role: string }[] = [];
    try {
      const res = await db.execute(
        `SELECT name, department, role FROM users
         WHERE department IS NOT NULL AND TRIM(department) != ''
         LIMIT 1000`,
      );
      roster = res.rows.map((r: any) => ({
        name: String(r.name ?? "").trim(),
        department: String(r.department ?? "").trim().toLowerCase(),
        role: String(r.role ?? "").trim().toLowerCase(),
      }));
    } catch (e) {
      // Counts are a nicety — a department with no headcount still renders.
      console.error("Onboarding roster lookup failed:", e);
    }

    const payload: OnboardingDepartment[] = departments.map((d) => {
      const people = roster.filter((p) => p.department === d.name.toLowerCase());
      const manager = people.find((p) => p.role === "manager");
      return {
        id: d.id,
        name: d.name,
        memberCount: people.length,
        managerName: manager?.name || null,
        // The manager is already named next to the faces — repeating them there
        // spends one of only four slots saying the same thing twice.
        sample: people
          .filter((p) => p.name && p.name !== manager?.name)
          .slice(0, 4)
          .map((p) => p.name),
      };
    });

    return NextResponse.json({ departments: payload });
  } catch (error) {
    console.error("Onboarding departments failed:", error);
    // Never fail the onboarding over this — the step falls back to the options
    // HR saved in the onboarding config.
    return NextResponse.json({ departments: [] as OnboardingDepartment[] });
  }
}
