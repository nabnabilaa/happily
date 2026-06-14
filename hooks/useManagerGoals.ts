import { useState, useEffect, useMemo } from 'react';

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

        setApiKpis([...managerKpis, ...personalKpis]);
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
    if (!state?.goals || !user?.id) return [];
    return state.goals.filter((g: any) => 
      (g.scope === 'assigned' && String(g.assignedById) === String(user.id)) || 
      (String(g.ownerId) !== String(user.id) && g.scope !== 'company')
    );
  }, [state?.goals, user?.id]);

  const topLevelGoals = useMemo(() => {
    return assignedGoals.filter((g: any) => {
      if (!g.parent_id) return true;
      return !assignedGoals.some((p: any) => String(p.id) === String(g.parent_id));
    });
  }, [assignedGoals]);

  const handleVerifyTask = async (taskId: string, goalId: string) => {
    try {
      const res = await fetch("/api/manager/verify-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, goalId, managerId: user.id })
      });
      if (!res.ok) throw new Error("Failed to verify");

      updateState((s: any) => {
        const newTeamTasks = s.managerData?.teamTasks?.map((t: any) => 
          t.id === taskId ? { ...t, verified: true, done: true } : t
        ) || [];
        
        const tasksForGoal = newTeamTasks.filter((t: any) => String(t.goalId) === String(goalId));
        const verifiedCount = tasksForGoal.filter((t: any) => t.verified).length;
        
        const newGoals = s.goals.map((g: any) => 
          String(g.id) === String(goalId) 
            ? { ...g, metric: `${verifiedCount}/${tasksForGoal.length} verified` } 
            : g
        );

        return {
          ...s,
          goals: newGoals,
          managerData: {
            ...s.managerData,
            teamTasks: newTeamTasks
          }
        };
      });
    } catch (e) {
      console.error(e);
      alert("Gagal memverifikasi tugas.");
    }
  };

  const handleRejectTask = async (taskId: string, goalId: string, action: 'reject' | 'revision') => {
    try {
      const res = await fetch("/api/manager/reject-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, managerId: user.id, action })
      });
      if (!res.ok) throw new Error("Failed to process");

      updateState((s: any) => {
        const newTeamTasks = s.managerData?.teamTasks?.map((t: any) => 
          t.id === taskId ? { ...t, verified: false, done: false, status: action } : t
        ) || [];
        
        return {
          ...s,
          managerData: {
            ...s.managerData,
            teamTasks: newTeamTasks
          }
        };
      });
      notify('Berhasil', action === 'reject' ? 'Task ditolak' : 'Task dikembalikan untuk direvisi', 'info');
    } catch (e) {
      console.error(e);
      alert("Gagal memproses tugas.");
    }
  };

  const executeDeleteGoal = async (goalId: string) => {
    updateState((s: any) => ({
      ...s,
      goals: s.goals.filter((g: any) => String(g.id) !== String(goalId))
    }));
    try {
      await fetch('/api/goals/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId })
      });
    } catch (e) { console.error('Failed to delete goal:', e); }
  };

  const handleEditProgress = async (goalId: string, newProgress: number) => {
    updateState((s: any) => ({
      ...s,
      goals: s.goals.map((goal: any) =>
        String(goal.id) === String(goalId)
          ? { ...goal, progress: newProgress }
          : goal
      )
    }));
    try {
      await fetch('/api/goals/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, updates: { progress: newProgress } })
      });
      notify('Progress Tersimpan', `Progress KPI diupdate menjadi ${newProgress}%.`, 'info');
    } catch (e) { console.error('Failed to save progress:', e); }
  };

  const handleApproveGoal = async (goalId: string) => {
    updateState((s: any) => ({
      ...s,
      goals: s.goals.map((goal: any) =>
        String(goal.id) === String(goalId) ? { ...goal, status: 'approved' } : goal
      )
    }));
    try {
      await fetch('/api/goals/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, updates: { status: 'approved' } })
      });
      notify('KPI Approved', `Goal telah disetujui.`, 'success');
    } catch (e) { console.error('Failed to approve:', e); }
  };

  const handleRejectGoal = async (goalId: string) => {
    updateState((s: any) => ({
      ...s,
      goals: s.goals.map((goal: any) =>
        String(goal.id) === String(goalId) ? { ...goal, status: 'rejected' } : goal
      )
    }));
    try {
      await fetch('/api/goals/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, updates: { status: 'rejected' } })
      });
      notify('KPI Rejected', `Goal telah ditolak.`, 'error');
    } catch (e) { console.error('Failed to reject:', e); }
  };

  const handleRevisionGoal = async (goalId: string) => {
    updateState((s: any) => ({
      ...s,
      goals: s.goals.map((goal: any) =>
        String(goal.id) === String(goalId) ? { ...goal, status: 'revision' } : goal
      )
    }));
    try {
      await fetch('/api/goals/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, updates: { status: 'revision' } })
      });
      notify('KPI Revision', `Goal membutuhkan perbaikan (revisi).`, 'warning');
    } catch (e) { console.error('Failed to request revision:', e); }
  };

  return {
    loadingKpis,
    combinedMyGoals,
    assignedGoals,
    topLevelGoals,
    handleVerifyTask,
    handleRejectTask,
    executeDeleteGoal,
    handleEditProgress,
    handleApproveGoal,
    handleRejectGoal,
    handleRevisionGoal
  };
}
