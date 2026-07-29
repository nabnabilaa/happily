"use client";

import { useEffect, useState } from "react";
import type { DepartmentRow } from "@/lib/onboardingUtils";

/**
 * Live HR department list, enriched for onboarding.
 *
 * The "divisi" step is not free text — it must offer exactly the departments HR
 * maintains, so the answer matches a real department row and the employee joins
 * it straight away.
 *
 * It reads `/api/onboarding/departments`, which adds the headcount, the manager
 * and a few names on top of the plain list, because the step renders a team
 * card rather than a bare label. If that endpoint isn't reachable (older
 * deploy, offline) it falls back to the plain HR list and the cards simply
 * render without those extras.
 *
 * Kept as state (not a ref) so the step re-renders once the list lands; the
 * old implementation wrote into a ref and whichever render happened to be
 * first won.
 */
export function useDepartments() {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const read = async (url: string): Promise<DepartmentRow[]> => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      return Array.isArray(data?.departments) ? data.departments : [];
    };

    (async () => {
      let rows: DepartmentRow[] = [];
      try {
        rows = await read("/api/onboarding/departments");
        if (rows.length === 0) rows = await read("/api/hr/departments");
      } catch {
        try {
          rows = await read("/api/hr/departments");
        } catch {
          /* offline / not seeded — the step falls back to its saved options */
        }
      }
      if (!alive) return;
      setDepartments(rows.filter((d) => d && String(d.name || "").trim()));
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { departments, loading };
}

/** Finds the department row whose name matches a chosen option label. */
export function matchDepartment(
  departments: DepartmentRow[],
  label: string | null | undefined,
): DepartmentRow | null {
  if (!label) return null;
  const wanted = label.trim().toLowerCase();
  return departments.find((d) => String(d.name).trim().toLowerCase() === wanted) ?? null;
}
