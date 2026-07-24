"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Modal from "@/components/ui/Modal";
import TaskCompleteModal from "@/components/modals/TaskCompleteModal";

export default function ManagePrioritiesModal({ onClose, initialGoalId, editTask }: { onClose: () => void; initialGoalId?: string; editTask?: any }) {
  const { state, updateState, user, notify, awardXP, syncSkillProgress } = useHP();
  const [editingTaskId, setEditingTaskId] = useState<number | null>(editTask?.id || null);
  const [newTitle, setNewTitle] = useState(editTask?.title || "");
  const [newDescription, setNewDescription] = useState(editTask?.description || "");
  const [targetDate, setTargetDate] = useState<string>(editTask?.targetDate || (() => new Date().toISOString().split('T')[0]));
  const [dueDate, setDueDate] = useState<string>(editTask?.due_date || "");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completingTask, setCompletingTask] = useState<any>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const xpAwardedRef = React.useRef<Set<any>>(new Set());

  // Weekly Targets — load semua dari semua KPI sekaligus
  // Format: { kpiId, kpiTitle, targets: [...] }
  const [allWeeklyTargetGroups, setAllWeeklyTargetGroups] = useState<{ kpiId: string; kpiTitle: string; targets: any[] }[]>([]);
  const [selectedWeeklyTargetId, setSelectedWeeklyTargetId] = useState<string>(editTask?.weekly_target_id || "");
  const [showWeeklyTargetDropdown, setShowWeeklyTargetDropdown] = useState(false);
  const [loadingWeeklyTargets, setLoadingWeeklyTargets] = useState(false);

  // Fetch semua KPI lalu semua weekly targets-nya sekaligus
  useEffect(() => {
    async function fetchAll() {
      if (!user?.id) return;
      setLoadingWeeklyTargets(true);
      try {
        const m = new Date().getMonth() + 1;
        const y = new Date().getFullYear();
        const [mRes, pRes] = await Promise.all([
          fetch(`/api/kpi?userId=${user.id}&role=employee&month=${m}&year=${y}`),
          fetch(`/api/kpi/personal?userId=${user.id}&month=${m}&year=${y}`),
        ]);
        const mData = await mRes.json();
        const pData = await pRes.json();
        const allKpis = [
          ...(mData.kpis || []).map((k: any) => ({ id: String(k.id), title: k.title })),
          ...(pData.kpis || []).map((k: any) => ({ id: String(k.id), title: k.title })),
        ];
        const groups = await Promise.all(allKpis.map(async (k) => {
          try {
            const r = await fetch(`/api/kpi/weekly-targets?kpiId=${k.id}`);
            const d = await r.json();
            return { kpiId: k.id, kpiTitle: k.title, targets: d.weeklyTargets || [] };
          } catch { return { kpiId: k.id, kpiTitle: k.title, targets: [] }; }
        }));
        setAllWeeklyTargetGroups(groups.filter(g => g.targets.length > 0));
      } catch (e) { console.error(e); } finally {
        setLoadingWeeklyTargets(false);
      }
    }
    fetchAll();
  }, [user?.id]);

  // Auto-select weekly target saat dibuka dari TargetTab (initialGoalId)
  useEffect(() => {
    if (!initialGoalId || selectedWeeklyTargetId || !allWeeklyTargetGroups.length) return;
    const group = allWeeklyTargetGroups.find(g => String(g.kpiId) === String(initialGoalId));
    if (!group) return;
    if (group.targets.length === 1) {
      setSelectedWeeklyTargetId(String(group.targets[0].id));
    } else if (group.targets.length > 1) {
      setShowWeeklyTargetDropdown(true);
    }
  }, [allWeeklyTargetGroups, initialGoalId]);

  // Sort groups: kalau ada initialGoalId, tampilkan KPI itu di atas
  const sortedWeeklyTargetGroups = React.useMemo(() => {
    if (!initialGoalId) return allWeeklyTargetGroups;
    return [...allWeeklyTargetGroups].sort((a, b) => {
      if (String(a.kpiId) === String(initialGoalId)) return -1;
      if (String(b.kpiId) === String(initialGoalId)) return 1;
      return 0;
    });
  }, [allWeeklyTargetGroups, initialGoalId]);

  // Helper: cari kpiId dari weekly target yang dipilih
  const selectedWeeklyTarget = React.useMemo(() => {
    for (const g of allWeeklyTargetGroups) {
      const t = g.targets.find((t: any) => String(t.id) === String(selectedWeeklyTargetId));
      if (t) return { ...t, kpiId: g.kpiId, kpiTitle: g.kpiTitle };
    }
    return null;
  }, [allWeeklyTargetGroups, selectedWeeklyTargetId]);

  const togglePriority = useCallback((id: number) => {
    const priority = state?.priorities?.find((p: any) => p.id === id);
    if (!priority) return;
    
    if (!priority.done) {
      setCompletingTask(priority);
    } else {
      updateState((s: any) => {
        const newPriorities = s.priorities.map((p: any) => 
          p.id === id ? { ...p, done: false } : p
        );

        const task = s.priorities.find((p: any) => p.id === id);
        const targetId = task?.goal_id || task?.kpi_id;
        const updatedGoals = s.goals.map((goal: any) => {
          if (targetId && String(goal.id) === String(targetId)) {
            let total = 0;
            let completed = 0;
            const match = String(goal.metric || '').match(/^(\d+)\/(\d+)\s+task/);
            if (match) {
              completed = parseInt(match[1]);
              total = parseInt(match[2]);
            } else {
              const todayTasks = newPriorities.filter((p: any) => (p.goal_id && String(p.goal_id) === String(goal.id)) || (p.kpi_id && String(p.kpi_id) === String(goal.id)));
              total = todayTasks.length;
              completed = todayTasks.filter((p: any) => p.done).length;
            }

            const newCompleted = Math.max(0, completed - 1);
            const newProgress = total > 0 ? Math.round((newCompleted / total) * 100) : goal.progress;
            return { ...goal, progress: newProgress, metric: total > 0 ? `${newCompleted}/${total} task selesai` : goal.metric };
          }
          return goal;
        });

        return { ...s, priorities: newPriorities, goals: updatedGoals };
      });
    }
  }, [state, updateState]);

  const confirmTaskComplete = useCallback(async (data: {
    proofLinks: string[]; isProject: boolean; metricValue?: number; notes?: string; completionPercent: number; completedAt?: string;
  }) => {
    if (!completingTask) return;
    const id = completingTask.id;
    const isPartial = (data.completionPercent ?? 100) < 100;
    const pct = data.completionPercent ?? 100;

    const prevProgress = completingTask.partial_progress || 0;
    const newProgress = Math.min(100, prevProgress + pct);
    const nowFullyDone = newProgress >= 100;
    const progressDelta = newProgress - prevProgress;

    // Await PATCH before updating local state — prevents race condition with SSE-triggered fetchData
    try {
      await fetch('/api/priorities/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, done: nowFullyDone,
          partialProgress: nowFullyDone ? 100 : newProgress,
          status: nowFullyDone ? 'accepted' : 'in_progress',
          proofLinks: data.proofLinks, notes: data.notes,
          metricValue: data.metricValue, isProject: data.isProject || isPartial,
          completedAt: data.completedAt || null,
        }),
      });
    } catch (e) {
      console.error('Task persist failed:', e);
    }

    if (nowFullyDone && !completingTask.done && progressDelta > 0 && !xpAwardedRef.current.has(id)) {
      xpAwardedRef.current.add(id);
      awardXP('priority_complete', `Selesaikan: ${completingTask.title}`);
    }

    // Side effects OUTSIDE updateState (React may call the callback multiple times in StrictMode)
    if (data.metricValue && completingTask.kpi_id && progressDelta > 0) {
      const metricDelta = data.metricValue * progressDelta / 100;
      fetch('/api/kpi/daily-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id, kpiId: completingTask.kpi_id,
          date: new Date().toISOString().slice(0, 10),
          value: metricDelta, notes: data.notes || completingTask.title,
          proofLink: data.proofLinks[0] || null,
        })
      }).catch(e => console.error('KPI input failed:', e));
    }
    if (progressDelta > 0 && completingTask.weekly_target_id) {
      const linkedForTarget = (state?.priorities || []).filter((p: any) =>
        p.weekly_target_id && String(p.weekly_target_id) === String(completingTask.weekly_target_id)
      );
      const totalLinked = Math.max(1, linkedForTarget.length);
      const metricDelta = data.metricValue ? (data.metricValue * progressDelta / 100) : null;
      const targetDelta = metricDelta ?? (progressDelta / totalLinked);
      fetch('/api/kpi/weekly-targets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: completingTask.weekly_target_id, delta: targetDelta })
      }).catch(e => console.error('Weekly target update failed:', e));
    }

    syncSkillProgress(completingTask.title + " " + (completingTask.kpi_title || ""), 2);

    updateState((s: any) => {
      const pIndex = s.priorities.findIndex((p: any) => p.id === id);
      if (pIndex === -1) return s;

      const newPriorities = [...s.priorities];

      newPriorities[pIndex] = {
        ...newPriorities[pIndex],
        done: nowFullyDone,
        status: nowFullyDone ? 'accepted' : 'in_progress',
        proof_links: data.proofLinks,
        is_project: data.isProject || isPartial,
        metric_value: data.metricValue || null,
        completion_notes: data.notes || null,
        partial_progress: nowFullyDone ? 100 : newProgress,
        completed_at: nowFullyDone ? (data.completedAt ? new Date(data.completedAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ')) : null,
      };

      const now = new Date();
      const newLog = nowFullyDone ? {
        id: Date.now(),
        type: 'quest_completion',
        title: newPriorities[pIndex].title,
        points: 50,
        date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        day: now.toLocaleDateString('id-ID', { weekday: 'long' }),
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      } : null;

      const task = newPriorities[pIndex];
      const targetId = task.goal_id || task.kpi_id;
      const updatedGoals = s.goals.map((goal: any) => {
        if (targetId && String(goal.id) === String(targetId)) {
          let total = 0;
          let completed = 0;
          const match = String(goal.metric || '').match(/^(\d+)\/(\d+)\s+task/);
          if (match) {
            completed = parseInt(match[1]);
            total = parseInt(match[2]);
          } else {
            const todayTasks = newPriorities.filter((p: any) => (p.goal_id && String(p.goal_id) === String(goal.id)) || (p.kpi_id && String(p.kpi_id) === String(goal.id)));
            total = todayTasks.length;
            completed = todayTasks.filter((p: any) => p.done).length;
          }

          const newCompleted = Math.max(0, Math.min(total, completed + 1));
          const newProgress = total > 0 ? Math.round((newCompleted / total) * 100) : goal.progress;
          return { ...goal, progress: newProgress, metric: total > 0 ? `${newCompleted}/${total} task selesai` : goal.metric };
        }
        return goal;
      });

      return {
        ...s,
        priorities: newPriorities,
        goals: updatedGoals,
        logbook: newLog ? [newLog, ...(s.logbook || [])] : (s.logbook || []),
        lastActivityDate: now.toISOString(),
        penaltyActive: false,
      };
    });

    setCompletingTask(null);
  }, [completingTask, updateState, awardXP, syncSkillProgress, user]);

  if (!state) return null;

  // Anti-abuse: minimum characters for task title
  const MIN_TASK_CHARS = 5;
  const titleTooShort = newTitle.length > 0 && newTitle.length < MIN_TASK_CHARS;
  const canAdd = newTitle.length >= MIN_TASK_CHARS;

  const savePriority = async () => {
    if (!canAdd || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const derivedKpiId = selectedWeeklyTarget?.kpiId || null;
      const derivedKpiTitle = selectedWeeklyTarget?.kpiTitle || null;
      
      // Validasi Duplikat: Jangan perbolehkan judul yang sama persis jika membuat baru, atau jika edit tapi judul diubah
      const isDuplicate = state.priorities?.some((p: any) => 
        p.title.toLowerCase().trim() === newTitle.toLowerCase().trim() && 
        p.id !== editingTaskId
      );
      
      if (isDuplicate) {
        notify("Gagal Menyimpan", "Task dengan judul ini sudah ada. Harap gunakan nama lain.", "error");
        setIsSubmitting(false);
        return;
      }
      
      if (editingTaskId) {
      // Edit mode
      updateState((s: any) => {
        const newPriorities = s.priorities.map((p: any) => {
          if (p.id === editingTaskId) {
            return {
              ...p,
              title: newTitle,
              description: newDescription,
              targetDate: targetDate,
              due_date: dueDate || null,
              kpi_id: derivedKpiId,
              kpi_title: derivedKpiTitle,
              goal_id: derivedKpiId,
              goal: derivedKpiTitle,
              weekly_target_id: selectedWeeklyTargetId || null,
              weekly_target_title: selectedWeeklyTarget?.title || null,
              status: 'todo',
              done: false,
            };
          }
          return p;
        });
        return { ...s, priorities: newPriorities };
      });
      notify("Task Berhasil Diperbarui", `${newTitle} diperbarui pada ${targetDate}`, "success");
      setEditingTaskId(null);
      setNewTitle("");
      setNewDescription("");
      setDueDate("");
      setSelectedWeeklyTargetId("");
      return;
    }

    // Create mode
    const newP = {
      id: Math.floor(Math.random() * 2000000000),
      title: newTitle,
      description: newDescription,
      targetDate: targetDate,
      kpi_id: derivedKpiId,
      kpi_title: derivedKpiTitle,
      goal_id: derivedKpiId,
      goal: derivedKpiTitle,
      weekly_target_id: selectedWeeklyTargetId || null,
      weekly_target_title: selectedWeeklyTarget?.title || null,
      due_date: dueDate || null,
      energy: 'mid',
      est: "30m",
      done: false,
      points: 15,
      tone: 'sage',
      proof_links: [] as string[],
      is_project: false,
    };

    // Create task_kpi_links if KPI is selected
    // We wrap this in a timeout to prevent the immediate DB insert from triggering an SSE refresh
    // which would overwrite our optimistic state before the auto-sync has a chance to POST to /api/storage.
    if (derivedKpiId) {
      setTimeout(() => {
        fetch('/api/kpi/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: String(newP.id),
            kpiId: derivedKpiId,
            weeklyTargetId: selectedWeeklyTargetId || null
          })
        }).catch(e => console.error('Failed to create KPI link:', e));
      }, 1500);
    }

    updateState((s: any) => {
      const newPriorities = [...s.priorities, newP];
      
      // Recalculate goal progress for linked goals
      const updatedGoals = s.goals.map((goal: any) => {
        if (newP.goal_id && String(goal.id) === String(newP.goal_id)) {
          let total = 0;
          let completed = 0;
          const match = String(goal.metric || '').match(/^(\d+)\/(\d+)\s+task/);
          if (match) {
            completed = parseInt(match[1]);
            total = parseInt(match[2]);
          } else {
            const todayTasks = newPriorities.filter((p: any) => (p.goal_id && String(p.goal_id) === String(goal.id)) || (p.kpi_id && String(p.kpi_id) === String(goal.id)));
            total = todayTasks.length;
            completed = todayTasks.filter((p: any) => p.done).length;
          }

          // A new task is added, so increment total by 1
          total += 1;
          const newProgress = total > 0 ? Math.round((completed / total) * 100) : goal.progress;
          return { ...goal, progress: newProgress, metric: `${completed}/${total} task selesai` };
        }
        return goal;
      });

      return {
        ...s,
        priorities: newPriorities,
        goals: updatedGoals
      };
    });
    
      notify("Task Berhasil Ditambahkan", `${newTitle} dijadwalkan pada ${targetDate}`, "success");

      setNewTitle("");
      setNewDescription("");
      setDueDate("");
      setSelectedWeeklyTargetId("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDeletePriority = () => {
    if (taskToDelete === null) return;
    const id = taskToDelete;
    updateState((s: any) => {
      const taskToDelete = s.priorities.find((p: any) => String(p.id) === String(id));
      const newPriorities = s.priorities.filter((p: any) => String(p.id) !== String(id));
      
      // Recalculate goal progress for linked goals
      const updatedGoals = s.goals.map((goal: any) => {
        const targetId = taskToDelete?.goal_id || taskToDelete?.kpi_id;
        if (targetId && String(goal.id) === String(targetId)) {
          let total = 0;
          let completed = 0;
          const match = String(goal.metric || '').match(/^(\d+)\/(\d+)\s+task/);
          if (match) {
            completed = parseInt(match[1]);
            total = parseInt(match[2]);
          } else {
            const todayTasks = newPriorities.filter((p: any) => (p.goal_id && String(p.goal_id) === String(goal.id)) || (p.kpi_id && String(p.kpi_id) === String(goal.id)));
            total = todayTasks.length;
            completed = todayTasks.filter((p: any) => p.done).length;
          }

          // A task is deleted, so decrement total by 1, and if it was done, decrement completed
          total = Math.max(0, total - 1);
          if (taskToDelete?.done) {
            completed = Math.max(0, completed - 1);
          }
          const newProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
          return { ...goal, progress: newProgress, metric: total > 0 ? `${completed}/${total} task selesai` : '0/0 task selesai' };
        }
        return goal;
      });

      return {
        ...s,
        priorities: newPriorities,
        goals: updatedGoals
      };
    });
    setTaskToDelete(null);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: 14, borderRadius: 12, 
    border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 14, background: HP_TOKENS.card, outline: 'none',
    boxSizing: 'border-box',
  };

  const itemsPerPage = 5;
  const totalTasks = state.priorities.length;
  const totalPages = Math.ceil(totalTasks / itemsPerPage);
  
  const paginatedTasks = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return state.priorities.slice(start, start + itemsPerPage);
  }, [state.priorities, currentPage]);

  return (
    <Modal onClose={onClose} title="📋 Kelola Task Harian">
      <div style={{ marginTop: 4 }}>
        
        {/* Add/Edit task form */}
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 8 }}>
          {editingTaskId ? "EDIT TASK" : "TAMBAH TASK BARU"}
          {editingTaskId && (
            <button 
              onClick={() => {
                setEditingTaskId(null);
                setNewTitle("");
                setNewDescription("");
                setSelectedWeeklyTargetId("");
              }}
              style={{ background: 'none', border: 'none', color: HP_TOKENS.blue, fontWeight: 800, cursor: 'pointer', marginLeft: 8 }}
            >
              (Batal Edit)
            </button>
          )}
        </div>
        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: 10, 
          padding: 16, borderRadius: 16, background: HP_TOKENS.paper, border: `1.5px solid ${HP_TOKENS.line}`,
          marginBottom: 24
        }}>
          <input 
            type="text" 
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && savePriority()}
            placeholder={`Deskripsikan task (min. ${MIN_TASK_CHARS} karakter)...`}
            style={{
              ...inputStyle,
              borderColor: titleTooShort ? HP_TOKENS.coral : HP_TOKENS.line,
            }}
          />
          {/* Character count & validation — Spec v2 Anti-Abuse */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -4 }}>
            {titleTooShort ? (
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.coral, fontWeight: 700, fontSize: 10 }}>
                ⚠️ Minimal {MIN_TASK_CHARS} karakter ({MIN_TASK_CHARS - newTitle.length} lagi)
              </div>
            ) : newTitle.length > 0 ? (
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 700, fontSize: 10 }}>
                ✓ Deskripsi cukup
              </div>
            ) : (
              <div />
            )}
            <div style={{ ...HP_TEXT.tiny, color: titleTooShort ? HP_TOKENS.coral : HP_TOKENS.inkFade, fontSize: 10 }}>
              {newTitle.length}/{MIN_TASK_CHARS}
            </div>
          </div>
          
          <textarea 
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Detail task (opsional)..."
            style={{
              ...inputStyle,
              minHeight: 60, resize: 'vertical'
            }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>TANGGAL MULAI / PELAKSANAAN</div>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{ ...inputStyle, height: 48 }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>DEADLINE / TENGGAT (opsional)</div>
              <input
                type="date"
                value={dueDate}
                min={targetDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ ...inputStyle, height: 48 }}
              />
            </div>
          </div>

          {/* Satu dropdown: pilih target langsung (dikelompokkan per KPI) */}
          <div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>TERKAIT TARGET MANA? (opsional)</div>
            {loadingWeeklyTargets ? (
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, padding: 12 }}>Memuat target...</div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setShowWeeklyTargetDropdown(!showWeeklyTargetDropdown)}
                  style={{
                    ...inputStyle, height: 48,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                    {selectedWeeklyTarget
                      ? `${selectedWeeklyTarget.kpiTitle} · ${selectedWeeklyTarget.title}`
                      : 'Tidak terkait target mingguan'}
                  </span>
                  <HPGlyph name="chevron-down" size={16} color={HP_TOKENS.inkMute} />
                </div>

                {showWeeklyTargetDropdown && (
                  <>
                    <div
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                      onClick={() => setShowWeeklyTargetDropdown(false)}
                    />
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                      background: '#fff', borderRadius: 16,
                      boxShadow: '0 8px 32px rgba(26,29,35,0.12)', border: `1px solid ${HP_TOKENS.line}`,
                      zIndex: 101, maxHeight: 260, overflowY: 'auto', padding: 8,
                    }}>
                      <div
                        className="hp-tap"
                        onClick={() => { setSelectedWeeklyTargetId(""); setShowWeeklyTargetDropdown(false); }}
                        style={{
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                          background: selectedWeeklyTargetId === "" ? HP_TOKENS.blueWash : 'transparent',
                          ...HP_TEXT.body, color: selectedWeeklyTargetId === '' ? HP_TOKENS.blue : HP_TOKENS.inkMute, fontSize: 13,
                        }}
                      >
                        Tidak terkait target mingguan
                      </div>

                      {sortedWeeklyTargetGroups.length === 0 && (
                        <div style={{ padding: '10px 12px', ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontSize: 12 }}>
                          💡 Belum ada target mingguan. Buat di halaman Target terlebih dahulu.
                        </div>
                      )}

                      {sortedWeeklyTargetGroups.map(group => (
                        <div key={group.kpiId} style={{ marginBottom: 6 }}>
                          <div style={{ padding: '4px 12px', ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>
                            🎯 {group.kpiTitle}
                          </div>
                          {group.targets.map((w: any) => {
                            const isSelected = String(w.id) === String(selectedWeeklyTargetId);
                            return (
                              <div
                                key={w.id}
                                className="hp-tap"
                                onClick={() => { setSelectedWeeklyTargetId(w.id); setShowWeeklyTargetDropdown(false); }}
                                style={{
                                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                                  background: isSelected ? HP_TOKENS.blueWash : 'transparent',
                                  ...HP_TEXT.body, color: isSelected ? HP_TOKENS.blue : HP_TOKENS.ink, fontSize: 13,
                                  display: 'flex', alignItems: 'center', gap: 8,
                                }}
                              >
                                <div style={{ padding: '2px 6px', borderRadius: 4, background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue, fontSize: 9, fontWeight: 900 }}>
                                  W{w.weekNumber}
                                </div>
                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {w.title}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ 
            padding: 10, borderRadius: 10, background: HP_TOKENS.sageWash, border: `1px solid ${HP_TOKENS.sage}20`,
            ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.sage, fontWeight: 600,
          }}>
            💡 Link bukti pengerjaan diisi nanti saat mencentang task selesai. Poin masuk setelah Manager ACC.
          </div>

          <button 
            onClick={savePriority}
            disabled={!canAdd || isSubmitting}
            style={{
              padding: 14, borderRadius: 12, border: 'none',
              background: HP_TOKENS.sage, color: '#F4F7F9',
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: canAdd && !isSubmitting ? 'pointer' : 'default',
              opacity: (!canAdd || isSubmitting) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {isSubmitting ? "Menyimpan..." : (editingTaskId ? "Simpan Perubahan" : "+ Tambah Task")}
          </button>
        </div>

        {/* Active tasks list */}
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 8 }}>TASK AKTIF HARI INI</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {state.priorities.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', background: HP_TOKENS.paper, borderRadius: 16, border: `1.5px dashed ${HP_TOKENS.line}` }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📝</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Belum ada task. Tambahkan di atas.</div>
            </div>
          ) : (
            paginatedTasks.map((p: any) => (
              <div 
                key={p.id} 
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14,
                  background: p.done ? HP_TOKENS.sageWash : HP_TOKENS.card, 
                  border: `1.5px solid ${p.done ? HP_TOKENS.sage + '30' : HP_TOKENS.line}`,
                }}
              >
                <button 
                  onClick={() => togglePriority(p.id)}
                  style={{ 
                    width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                    background: p.done ? HP_TOKENS.sage : 'transparent',
                    border: `2px solid ${p.done ? HP_TOKENS.sage : HP_TOKENS.line}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0
                  }}>
                  {p.done && <HPGlyph name="check" size={12} color="#F4F7F9"/>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    ...HP_TEXT.body, fontSize: 13, fontWeight: 600, 
                    color: p.done ? HP_TOKENS.inkFade : HP_TOKENS.ink,
                    textDecoration: p.done ? 'line-through' : 'none',
                  }}>
                    {p.title}
                  </div>
                  {p.description && (
                    <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontSize: 11, marginTop: 2 }}>
                      {p.description}
                    </div>
                  )}
                  {/* KPI tag */}
                  {(() => {
                    const goalId = p.goal_id || p.kpi_id;
                    const fallbackTitle = p.kpi_title || p.goal || 'KPI';
                    if (!goalId) return null;
                    const goal = state.goals?.find((g: any) => String(g.id) === String(goalId));
                    if (!goal) {
                      return (
                        <div style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                          padding: '2px 8px', borderRadius: 6, 
                          background: HP_TOKENS.blueSoft, 
                        }}>
                          <span style={{ fontSize: 10 }}>🎯</span>
                          <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 800, fontSize: 9 }}>
                            {fallbackTitle}
                          </span>
                        </div>
                      );
                    }
                    const parent = goal.parent_id ? state.goals?.find((g: any) => String(g.id) === String(goal.parent_id)) : null;
                    const displayTag = parent ? `${goal.title} (Aligned to: ${parent.title})` : goal.title;
                    return (
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                        padding: '2px 8px', borderRadius: 6, 
                        background: HP_TOKENS.blueSoft, 
                      }}>
                        <span style={{ fontSize: 10 }}>🎯</span>
                        <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 800, fontSize: 9 }}>
                          {displayTag}
                        </span>
                      </div>
                    );
                  })()}
                  {/* Partial progress bar */}
                  {!p.done && p.partial_progress > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ ...HP_TEXT.tiny, fontSize: 9, color: HP_TOKENS.blue }}>Progress hari ini</span>
                        <span style={{ fontFamily: HP_FONT, fontSize: 9, fontWeight: 900, color: HP_TOKENS.blue }}>{p.partial_progress}%</span>
                      </div>
                      <div style={{ height: 5, background: HP_TOKENS.lineSoft, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99, width: `${p.partial_progress}%`,
                          background: `${HP_TOKENS.blue}`,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  )}
                  {/* Proof links indicator */}
                  {p.proof_links && p.proof_links.length > 0 && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, marginLeft: 4,
                      padding: '2px 8px', borderRadius: 6, background: HP_TOKENS.sageSoft,
                    }}>
                      <span style={{ fontSize: 10 }}>📎</span>
                      <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 800, fontSize: 9 }}>
                        {p.proof_links.length} link
                      </span>
                    </div>
                  )}
                  {/* Project tag */}
                  {p.is_project && (
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, marginLeft: 4,
                      padding: '2px 8px', borderRadius: 6, background: HP_TOKENS.lavenderSoft,
                    }}>
                      <span style={{ fontSize: 10 }}>📁</span>
                      <span style={{ ...HP_TEXT.tiny, color: '#6B5F8E', fontWeight: 800, fontSize: 9 }}>
                        Jangka Panjang
                      </span>
                    </div>
                  )}
                </div>
                {!p.done && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button 
                      onClick={() => {
                        setNewTitle(p.title);
                        setNewDescription(p.description || "");
                        setTargetDate(p.targetDate || new Date().toISOString().split('T')[0]);
                        setSelectedWeeklyTargetId(p.weekly_target_id || "");
                        setEditingTaskId(p.id);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <HPGlyph name="edit" size={14} color={HP_TOKENS.inkFade}/>
                    </button>
                    <button 
                      onClick={() => setTaskToDelete(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <HPGlyph name="close" size={14} color={HP_TOKENS.coral}/>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 8 }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                background: currentPage === 1 ? HP_TOKENS.lineSoft : '#fff',
                color: currentPage === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                cursor: currentPage === 1 ? 'default' : 'pointer',
                opacity: currentPage === 1 ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              Sebelumnya
            </button>
            <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                background: currentPage === totalPages ? HP_TOKENS.lineSoft : '#fff',
                color: currentPage === totalPages ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                cursor: currentPage === totalPages ? 'default' : 'pointer',
                opacity: currentPage === totalPages ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
      {completingTask && (
        <TaskCompleteModal 
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onConfirm={confirmTaskComplete}
        />
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: 32,
            width: '100%', maxWidth: 400, textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            animation: 'hpPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: HP_TOKENS.coralWash, color: HP_TOKENS.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <HPGlyph name="trash" size={32} />
            </div>
            <div style={{ ...HP_TEXT.h, fontSize: 20, marginBottom: 8 }}>Hapus Task Harian?</div>
            <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, marginBottom: 24 }}>
              Task ini akan dihapus dari prioritas harianmu.
            </div>
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <button onClick={executeDeletePriority} className="hp-tap" style={{
                padding: '16px', borderRadius: 16, border: 'none',
                background: HP_TOKENS.coral, color: '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Ya, Hapus
              </button>
              <button onClick={() => setTaskToDelete(null)} className="hp-tap" style={{
                padding: '16px', borderRadius: 16, border: 'none',
                background: HP_TOKENS.lineSoft, color: HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
