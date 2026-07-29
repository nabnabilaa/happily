import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Monthly KPIs live in `monthly_kpis` and carry a `kpi_`-prefixed id; legacy
 * OKRs live in `goals`. The manager screens merge both into one list, so every
 * mutation has to pick the matching endpoint — writing a KPI id to
 * /api/goals/* silently affects zero rows.
 */
function isKpiRecord(goal: any): boolean {
  if (!goal) return false;
  if (goal.isApiKpi) return true;
  return String(goal.id ?? '').startsWith('kpi_');
}

export function useManagerGoals(state: any, user: any, updateState: any, notify: any) {
  const [apiKpis, setApiKpis] = useState<any[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);

  useEffect(() => {
    async function fetchKPIs() {
      if (!user?.id) return;
      try {
        setLoadingKpis(true);
        const m = new Date().getMonth() + 1;
        const y = new Date().getFullYear();

        const managerRes = await fetch(`/api/kpi?userId=${user.id}&role=employee&month=${m}&year=${y}`);
        const managerData = await managerRes.json();
        const managerKpis = (managerData.kpis || []).map((k: any) => ({
          id: String(k.id),
          title: k.title,
          progress: k.finalScore !== null && k.finalScore !== undefined ? Number(k.finalScore) : 0,
          alignment: k.weight || 0,
          due: `${m}/${y}`,
          tone: 'lavender',
          metric: k.targetDescription || 'KPI Bulanan (Manager)',
          scope: 'assigned',
          owner: k.assigneeName || user.name || 'You',
          ownerId: String(k.assignedTo),
          status: k.status === 'active' ? 'approved' : k.status,
          is_kpi: true,
          isApiKpi: true,
          subGoals: []
        }));

        const personalRes = await fetch(`/api/kpi/personal?userId=${user.id}&month=${m}&year=${y}`);
        const personalData = await personalRes.json();
        const personalKpis = (personalData.kpis || []).map((k: any) => ({
          id: String(k.id),
          title: k.title,
          progress: k.progress || 0,
          alignment: 0,
          due: `${m}/${y}`,
          tone: 'sage',
          metric: k.targetDescription || `${k.currentValue || 0}/${k.targetValue || 0} ${k.metricUnit || ''}`,
          scope: 'personal',
          owner: user.name || 'You',
          ownerId: String(user.id),
          status: k.status || 'active',
          is_kpi: true,
          isApiKpi: true,
          subGoals: []
        }));

        const teamRes = await fetch(`/api/kpi?userId=${user.id}&role=manager&month=${m}&year=${y}`);
        const teamData = await teamRes.json();
        const teamKpis = (teamData.kpis || []).map((k: any) => ({
          id: String(k.id),
          title: k.title,
          progress: k.finalScore !== null && k.finalScore !== undefined ? Number(k.finalScore) : 0,
          alignment: k.weight || 0,
          due: `${m}/${y}`,
          tone: 'blue',
          metric: k.targetDescription || 'KPI Anggota',
          scope: k.scope || 'assigned',
          owner: k.assigneeName || 'Team Member',
          ownerId: String(k.assignedTo),
          assignedById: String(k.assignedBy),
          status: k.status || 'active',
          is_kpi: true,
          isApiKpi: true,
          subGoals: []
        }));

        setApiKpis([...managerKpis, ...personalKpis, ...teamKpis]);
      } catch (e) {
        console.error("Failed to load KPIs in ManagerGoalsScreen:", e);
      } finally {
        setLoadingKpis(false);
      }
    }
    fetchKPIs();
  }, [user?.id]);

  const goals = state?.goals || [];
  const userId = user?.id ? String(user.id) : '';

  const combinedMyGoals = useMemo(() => {
    const myAssigned = goals.filter((g: any) => g.scope === 'assigned' && String(g.ownerId) === userId);
    const myPersonal = goals.filter((g: any) => g.scope === 'personal' && String(g.ownerId) === userId);
    const combined = [...myAssigned, ...myPersonal];
    apiKpis.forEach((k: any) => {
      if (!combined.some((g: any) => String(g.id) === String(k.id) || g.title.toLowerCase() === k.title.toLowerCase())) {
        combined.push(k);
      }
    });
    return combined;
  }, [apiKpis, goals, userId]);

  const assignedGoals = useMemo(() => {
    const goalsFromState = state?.goals || [];
    const stateAssigned = goalsFromState.filter((g: any) => 
      (g.scope === 'assigned' && String(g.assignedById) === String(user?.id)) || 
      (String(g.ownerId) !== String(user?.id) && g.scope !== 'company')
    );
    
    // Add team KPIs from API
    const apiAssigned = apiKpis.filter((k: any) => 
      k.scope === 'assigned' || k.scope === 'team'
    ).filter((k: any) => 
      String(k.ownerId) !== String(user?.id) || k.scope === 'team'
    );
    
    const combined = [...stateAssigned];
    apiAssigned.forEach((k: any) => {
      if (!combined.some((g: any) => String(g.id) === String(k.id))) {
        combined.push(k);
      }
    });
    return combined;
  }, [state?.goals, user?.id, apiKpis]);

  const topLevelGoals = useMemo(() => {
    return assignedGoals.filter((g: any) => {
      if (!g.parent_id) return true;
      return !assignedGoals.some((p: any) => String(p.id) === String(g.parent_id));
    });
  }, [assignedGoals]);

  /*
   * Tidak ada lagi handler ACC/tolak per task di sini.
   *
   * Keputusan diambil sekali di tingkat KPI (POST /api/kpi/review dengan
   * action 'approved'), dan endpoint itu yang meneruskannya ke setiap task
   * lewat `reviewTask`. Menyisakan jalur per-task di klien berarti dua sumber
   * kebenaran untuk kolom `is_verified` yang sama, yang persis pernah membuat
   * ACC manajer tertimpa — lihat catatan di app/api/storage/route.ts.
   */

  /** Finds a merged goal by id across both backing stores. */
  const findGoal = useCallback((goalId: string) => {
    const fromState = (state?.goals || []).find((g: any) => String(g.id) === String(goalId));
    if (fromState) return fromState;
    return apiKpis.find((k: any) => String(k.id) === String(goalId));
  }, [state?.goals, apiKpis]);

  /** Applies a patch to whichever store actually holds the record. */
  const patchGoalLocally = useCallback((goalId: string, patch: Record<string, any>) => {
    setApiKpis(prev => prev.map((k: any) =>
      String(k.id) === String(goalId) ? { ...k, ...patch } : k
    ));
    updateState((s: any) => ({
      ...s,
      goals: (s.goals || []).map((g: any) =>
        String(g.id) === String(goalId) ? { ...g, ...patch } : g
      ),
    }));
  }, [updateState]);

  const removeGoalLocally = useCallback((goalId: string) => {
    setApiKpis(prev => prev.filter((k: any) => String(k.id) !== String(goalId)));
    updateState((s: any) => ({
      ...s,
      goals: (s.goals || []).filter((g: any) => String(g.id) !== String(goalId)),
    }));
  }, [updateState]);

  const executeDeleteGoal = async (goalId: string) => {
    const goal = findGoal(goalId);
    const snapshot = goal ? { ...goal } : null;
    const isKpi = isKpiRecord(goal) || String(goalId).startsWith('kpi_');

    removeGoalLocally(goalId);

    try {
      const res = isKpi
        ? await fetch(`/api/kpi?id=${encodeURIComponent(goalId)}`, { method: 'DELETE' })
        : await fetch('/api/goals/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goalId }),
          });

      if (!res.ok) throw new Error(await res.text());
      notify('Terhapus', isKpi ? 'KPI telah dihapus.' : 'Goal telah dihapus.', 'info');
    } catch (e) {
      console.error('Failed to delete goal:', e);
      // Put it back — the card used to vanish from the screen while the row
      // was still in the database.
      if (snapshot) {
        if (isKpi) setApiKpis(prev => [...prev, snapshot]);
        else updateState((s: any) => ({ ...s, goals: [...(s.goals || []), snapshot] }));
      }
      notify('Gagal', 'Gagal menghapus. Coba lagi.', 'error');
    }
  };

  const handleEditProgress = async (goalId: string, newProgress: number) => {
    const goal = findGoal(goalId);
    const previous = goal?.progress ?? 0;
    const isKpi = isKpiRecord(goal);

    // /api/goals/update rejects a `progress` field outright ("Progress is
    // computed automatically"), so the old call here always 403'd while still
    // showing a "Progress Tersimpan" toast. Legacy goals derive progress from
    // their tasks; only KPIs accept a manual score.
    if (!isKpi) {
      notify(
        'Tidak Bisa Diubah',
        'Progress goal dihitung otomatis dari task yang terverifikasi.',
        'warning'
      );
      return;
    }

    patchGoalLocally(goalId, { progress: newProgress });

    try {
      const res = await fetch('/api/kpi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiId: goalId, finalScore: newProgress }),
      });
      if (!res.ok) throw new Error(await res.text());
      notify('Progress Tersimpan', `Progress KPI diupdate menjadi ${newProgress}%.`, 'success');
    } catch (e) {
      console.error('Failed to save progress:', e);
      patchGoalLocally(goalId, { progress: previous });
      notify('Gagal', 'Progress tidak tersimpan. Coba lagi.', 'error');
    }
  };

  /**
   * Approve / revise / reject a target. KPIs and legacy goals live in different
   * tables with different endpoints and different status vocabularies; this
   * routes to whichever one owns the record.
   */
  const setGoalStatus = async (
    goalId: string,
    status: 'approved' | 'revision' | 'rejected',
    copy: { title: string; message: string; tone: string }
  ) => {
    const goal = findGoal(goalId);
    const previous = goal?.status;
    const isKpi = isKpiRecord(goal);

    patchGoalLocally(goalId, { status });

    try {
      let res: Response;
      if (isKpi && status === 'approved') {
        res = await fetch('/api/kpi', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kpiId: goalId, status: 'active' }),
        });
      } else if (isKpi) {
        // revision / rejected go through the KPI review flow, which records the
        // verdict and notifies the assignee.
        res = await fetch('/api/kpi/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kpiId: goalId, action: status, reviewedBy: user?.id, penaltyPct: 0 }),
        });
      } else {
        res = await fetch('/api/goals/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goalId, updates: { status } }),
        });
      }

      if (!res.ok) throw new Error(await res.text());
      notify(copy.title, copy.message, copy.tone);
    } catch (e) {
      console.error(`Failed to set goal status to ${status}:`, e);
      patchGoalLocally(goalId, { status: previous });
      notify('Gagal', 'Status tidak tersimpan. Coba lagi.', 'error');
    }
  };

  const handleApproveGoal = (goalId: string) =>
    setGoalStatus(goalId, 'approved', { title: 'KPI Approved', message: 'Target telah disetujui.', tone: 'success' });

  const handleRejectGoal = (goalId: string) =>
    setGoalStatus(goalId, 'rejected', { title: 'KPI Rejected', message: 'Target telah ditolak.', tone: 'error' });

  const handleRevisionGoal = (goalId: string) =>
    setGoalStatus(goalId, 'revision', { title: 'KPI Revision', message: 'Target dikembalikan untuk direvisi.', tone: 'warning' });

  return {
    loadingKpis,
    combinedMyGoals,
    assignedGoals,
    topLevelGoals,
    executeDeleteGoal,
    handleEditProgress,
    handleApproveGoal,
    handleRejectGoal,
    handleRevisionGoal
  };
}
