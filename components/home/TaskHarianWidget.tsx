"use client";

import React, { useState, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import SectionHeader from "@/components/home/SectionHeader";
import PriorityCard from "@/components/home/PriorityCard";
import TaskCompleteModal from "@/components/modals/TaskCompleteModal";

interface Props {
  openModal: (name: string, props?: any) => void;
  onTaskComplete?: (taskName?: string) => void;
}

export default function TaskHarianWidget({ openModal, onTaskComplete }: Props) {
  const { state, updateState, user, awardXP, syncSkillProgress } = useHP();
  const [completingTask, setCompletingTask] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedTaskId, setHighlightedTaskId] = useState<any>(null);
  // Tracks task IDs that already got XP this session — prevents undo→redo and link-update exploits
  const xpAwardedRef = React.useRef<Set<any>>(new Set());

  // Listen for navigation requests from GoalsScreen linked task rows
  React.useEffect(() => {
    const handler = (e: any) => {
      const { taskId } = e.detail || {};
      if (!taskId) return;

      const priorities = state?.priorities || [];
      const energyOrder: Record<string, number> = { high: 3, mid: 2, low: 1 };
      const sorted = [...priorities].sort((a: any, b: any) => {
        if (!!a.done !== !!b.done) return a.done ? 1 : -1;
        const eA = energyOrder[String(a.energy || a.energy_level || 'mid').toLowerCase()] || 2;
        const eB = energyOrder[String(b.energy || b.energy_level || 'mid').toLowerCase()] || 2;
        if (eA !== eB) return eB - eA;
        const tA = a.created_at ? new Date(a.created_at).getTime() : (isNaN(Number(a.id)) ? 0 : Number(a.id));
        const tB = b.created_at ? new Date(b.created_at).getTime() : (isNaN(Number(b.id)) ? 0 : Number(b.id));
        return tA !== tB ? tA - tB : String(a.id).localeCompare(String(b.id));
      });

      const idx = sorted.findIndex((p: any) => String(p.id) === String(taskId));
      if (idx !== -1) {
        const page = Math.ceil((idx + 1) / 5);
        setCurrentPage(page);
      }

      setHighlightedTaskId(taskId);
      setTimeout(() => {
        const el = document.getElementById('task-harian-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      setTimeout(() => setHighlightedTaskId(null), 3000);
    };
    window.addEventListener('hp_focus_task', handler);
    return () => window.removeEventListener('hp_focus_task', handler);
  }, [state?.priorities]);

  const togglePriority = useCallback((id: number) => {
    const priority = state?.priorities?.find((p: any) => p.id === id);
    if (!priority) return;
    
    if (!priority.done) {
      // Task is being marked DONE → open completion modal
      setCompletingTask(priority);
    } else {
      // Task is being un-done → reset semua progress + undo weekly target contribution
      // Immediately persist undo to DB
      fetch('/api/priorities/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, done: false, partialProgress: 0, status: 'todo' }),
      }).catch(e => console.error('Task undo persist failed:', e));

      // Revoke the points awarded for this task
      awardXP('priority_undo', `Selesaikan: ${priority.title}`);
      xpAwardedRef.current.delete(id);

      const prevPct = priority.done ? 100 : (priority.partial_progress || 0);
      if (priority.weekly_target_id && prevPct > 0) {
        const linkedForTarget = (state?.priorities || []).filter((p: any) =>
          p.weekly_target_id && String(p.weekly_target_id) === String(priority.weekly_target_id)
        );
        const totalLinked = Math.max(1, linkedForTarget.length);
        fetch('/api/kpi/weekly-targets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: priority.weekly_target_id, delta: -(prevPct / totalLinked) })
        }).catch(console.error);
      }
      updateState((s: any) => {
        const newPriorities = s.priorities.map((p: any) =>
          p.id === id ? { ...p, done: false, partial_progress: 0, status: 'todo', completed_at: null } : p
        );
        const task = s.priorities.find((p: any) => p.id === id);
        const targetId = task?.goal_id || task?.kpi_id;
        const updatedGoals = s.goals.map((goal: any) => {
          if (targetId && String(goal.id) === String(targetId)) {
            const todayTasks = newPriorities.filter((p: any) => (p.goal_id && String(p.goal_id) === String(goal.id)) || (p.kpi_id && String(p.kpi_id) === String(goal.id)));
            const total = todayTasks.length;
            const completed = todayTasks.filter((p: any) => p.done).length;
            return { ...goal, metric: total > 0 ? `${completed}/${total} task selesai` : goal.metric };
          }
          return goal;
        });
        return { ...s, priorities: newPriorities, goals: updatedGoals };
      });
    }
  }, [state, updateState]);

  const deletePriority = useCallback((id: number) => {
    updateState((s: any) => {
      const taskToDelete = s.priorities.find((p: any) => p.id === id);
      if (!taskToDelete) return s;

      const newPriorities = s.priorities.filter((p: any) => p.id !== id);

      const targetId = taskToDelete.goal_id || taskToDelete.kpi_id;
      const updatedGoals = s.goals.map((goal: any) => {
        if (targetId && String(goal.id) === String(targetId)) {
          const todayTasks = newPriorities.filter((p: any) => 
            (p.goal_id && String(p.goal_id) === String(goal.id)) || 
            (p.kpi_id && String(p.kpi_id) === String(goal.id))
          );
          const total = todayTasks.length;
          const completed = todayTasks.filter((p: any) => p.done).length;

          return { 
            ...goal, 
            metric: total > 0 ? `${completed}/${total} task selesai` : `0/0 task selesai`
          };
        }
        return goal;
      });

      const extraState: any = {};
      if (s.focusTaskId === id) {
        extraState.focusTaskId = null;
        extraState.focusProgress = 0;
        extraState.intention = "";
      }

      return { 
        ...s, 
        priorities: newPriorities, 
        goals: updatedGoals,
        ...extraState 
      };
    });
  }, [updateState]);

  const confirmTaskComplete = useCallback(async (data: {
    proofLinks: string[]; isProject: boolean; metricValue?: number; notes?: string; completionPercent: number; completedAt?: string;
  }) => {
    if (!completingTask) return;
    const id = completingTask.id;
    const pct = data.completionPercent ?? 100;
    const isPartial = pct < 100;

    // Calculate final progress outside updateState so we can persist immediately
    const prevProgress = completingTask.partial_progress || 0;
    const newProgress = Math.min(100, prevProgress + pct);
    const nowFullyDone = newProgress >= 100;
    const progressDelta = newProgress - prevProgress;

    // AWAIT the PATCH — DB must be updated BEFORE local state changes.
    // Without await, any SSE-triggered fetchData that arrives before the PATCH completes
    // reads stale done=false from DB, then the HPContext debounce timer fires with that
    // stale value and overwrites the completed state.
    try {
      await fetch('/api/priorities/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          done: nowFullyDone,
          partialProgress: nowFullyDone ? 100 : newProgress,
          status: nowFullyDone ? 'accepted' : 'in_progress',
          proofLinks: data.proofLinks,
          notes: data.notes,
          metricValue: data.metricValue,
          isProject: data.isProject || isPartial,
          completedAt: data.completedAt || null,
        }),
      });
    } catch (e) {
      console.error('Task persist failed:', e);
    }

    // Side effects OUTSIDE updateState — React may invoke updateState callbacks multiple times
    // (StrictMode dev), which would double-accumulate these API calls.
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

    // Award XP only on genuine first-time completion: task wasn't already done,
    // actual new progress was made, and this task hasn't been awarded XP this session.
    if (nowFullyDone && !completingTask.done && progressDelta > 0 && !xpAwardedRef.current.has(id)) {
      xpAwardedRef.current.add(id);
      awardXP('priority_complete', `Selesaikan: ${completingTask.title}`);
    }

    updateState((s: any) => {
      const pIndex = s.priorities.findIndex((p: any) => p.id === id);
      if (pIndex === -1) return s;

      const newPriorities = [...s.priorities];
      const prevProgress = newPriorities[pIndex].partial_progress || 0;
      const newProgress = Math.min(100, prevProgress + pct);
      const nowFullyDone = newProgress >= 100;

      newPriorities[pIndex] = {
        ...newPriorities[pIndex],
        done: nowFullyDone,
        status: nowFullyDone ? 'accepted' : 'in_progress',
        proof_links: data.proofLinks,
        is_project: data.isProject || isPartial,
        metric_value: data.metricValue || null,
        completion_notes: data.notes || null,
        partial_progress: nowFullyDone ? 100 : newProgress,
        completed_at: nowFullyDone ? (data.completedAt ? new Date(data.completedAt).toISOString() : new Date().toISOString()) : null,
      };

      syncSkillProgress(newPriorities[pIndex].title + " " + (newPriorities[pIndex].kpi_title || ""), 2);

      const now = new Date();
      const newLog = nowFullyDone ? {
        id: Date.now(), type: 'quest_completion',
        title: newPriorities[pIndex].title, points: 50,
        date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        day: now.toLocaleDateString('id-ID', { weekday: 'long' }),
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      } : null;

      const task = newPriorities[pIndex];
      const targetId = task.goal_id || task.kpi_id;
      const updatedGoals = s.goals.map((goal: any) => {
        if (targetId && String(goal.id) === String(targetId)) {
          const todayTasks = newPriorities.filter((p: any) => (p.goal_id && String(p.goal_id) === String(goal.id)) || (p.kpi_id && String(p.kpi_id) === String(goal.id)));
          const total = todayTasks.length;
          const completed = todayTasks.filter((p: any) => p.done).length;
          return { ...goal, metric: total > 0 ? `${completed}/${total} task selesai` : goal.metric };
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

    onTaskComplete?.(completingTask.title);
    setCompletingTask(null);
  }, [completingTask, updateState, awardXP, syncSkillProgress, user, onTaskComplete]);

  if (!state || !user) return null;

  const priorities = state.priorities || [];
  const done = priorities.filter((p: any) => p.done).length;
  const total = priorities.length;
  const partialProgressPct = total > 0
    ? Math.round(priorities.reduce((sum: number, p: any) => sum + (p.done ? 100 : (p.partial_progress || 0)), 0) / total)
    : 0;
  
  const sortedPriorities = React.useMemo(() => {
    const energyOrder: Record<string, number> = { high: 3, mid: 2, low: 1 };
    return [...priorities].sort((a: any, b: any) => {
      // 1. Incomplete/Active tasks first, completed/pending tasks last
      if (!!a.done !== !!b.done) {
        return a.done ? 1 : -1;
      }
      
      // 2. Sort by energy priority (high > mid > low)
      const energyA = a.energy || a.energy_level || 'mid';
      const energyB = b.energy || b.energy_level || 'mid';
      const valA = energyOrder[String(energyA).toLowerCase()] || 2;
      const valB = energyOrder[String(energyB).toLowerCase()] || 2;
      if (valA !== valB) return valB - valA;
      
      // 3. Keep stable order by creation time or ID (oldest first)
      const timeA = a.created_at ? new Date(a.created_at).getTime() : (isNaN(Number(a.id)) ? 0 : Number(a.id));
      const timeB = b.created_at ? new Date(b.created_at).getTime() : (isNaN(Number(b.id)) ? 0 : Number(b.id));
      if (timeA !== timeB) return timeA - timeB;
      
      return String(a.id).localeCompare(String(b.id));
    });
  }, [priorities]);
  
  const itemsPerPage = 5;
  const totalPages = Math.ceil(total / itemsPerPage);
  const paginatedPriorities = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedPriorities.slice(start, start + itemsPerPage);
  }, [sortedPriorities, currentPage]);

  return (
    <div id="task-harian-section" style={{ marginTop: 24 }}>
      <SectionHeader 
        icon="target" 
        label="Task Harian" 
        count={`${done}/${total}`} 
        action="+ Task"
        onAction={() => openModal('manage_priorities')}
      />
      
      {/* Realization Progress Card */}
      <HPCard padding={20} style={{ 
        marginBottom: 20, 
        background: `linear-gradient(135deg, ${HP_TOKENS.primaryWash} 0%, ${HP_TOKENS.card} 100%)`, 
        border: `1.5px solid ${HP_TOKENS.primary}20`,
        boxShadow: '0 10px 30px rgba(26,29,35,0.03)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ 
          position: 'absolute', right: -20, top: -20, width: 100, height: 100, 
          borderRadius: 50, background: `${HP_TOKENS.primary}10`, zIndex: 0 
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.primary, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>PROGRESS TASK HARI INI</div>
              <div style={{ ...HP_TEXT.h, fontSize: 28, color: HP_TOKENS.ink }}>
                {partialProgressPct}%
                <span style={{ fontSize: 14, color: HP_TOKENS.inkFade, fontWeight: 600, marginLeft: 8 }}>Tercapai</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...HP_TEXT.h, fontSize: 18, color: HP_TOKENS.primary }}>{done}/{total}</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>Task Selesai</div>
            </div>
          </div>
          
          <div style={{ position: 'relative', height: 12, background: HP_TOKENS.lineSoft, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ 
               width: `${partialProgressPct}%`,
               height: '100%', 
               background: `linear-gradient(to right, ${HP_TOKENS.primary}, #60A5FA)`, 
               borderRadius: 6,
               transition: '1s cubic-bezier(0.2, 0.8, 0.2, 1)',
               boxShadow: `0 0 12px ${HP_TOKENS.primary}40`
            }} />
          </div>

          {/* Focus Task Sync Display */}
          <div style={{ 
            marginTop: state.focusTaskId ? 16 : 0,
            maxHeight: state.focusTaskId ? 80 : 0,
            opacity: state.focusTaskId ? 1 : 0,
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{ 
              padding: '12px 16px', borderRadius: 12, 
              background: 'rgba(255,255,255,0.6)', border: `1px dashed ${HP_TOKENS.yellow}`,
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: HP_TOKENS.yellowSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HPGlyph name="sparkle" size={16} color={HP_TOKENS.yellow} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>SEDANG FOKUS:</div>
                <div style={{ ...HP_TEXT.body, fontSize: 13, fontWeight: 700, color: HP_TOKENS.ink }}>
                  {priorities.find((p: any) => p.id === state.focusTaskId)?.title || "Focus Task"}
                </div>
              </div>
              <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.yellow }}>{state.focusProgress || 0}%</div>
            </div>
          </div>
        </div>
      </HPCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {paginatedPriorities.length > 0 ? (
          paginatedPriorities.map((p: any) => (
            <div
              key={p.id}
              id={`task-card-${p.id}`}
              style={{
                borderRadius: 22,
                outline: String(p.id) === String(highlightedTaskId) ? `3px solid ${HP_TOKENS.blue}` : 'none',
                outlineOffset: 2,
                boxShadow: String(p.id) === String(highlightedTaskId) ? `0 0 0 6px ${HP_TOKENS.blue}18` : 'none',
                transition: 'outline 0.3s, box-shadow 0.3s',
                animation: String(p.id) === String(highlightedTaskId) ? 'hpPulse 0.8s ease 2' : 'none',
              }}
            >
              <PriorityCard
                p={p}
                onToggle={() => togglePriority(p.id)}
                onDelete={() => deletePriority(p.id)}
                onEdit={() => openModal('manage_priorities', { editTask: p })}
              />
            </div>
          ))
        ) : (
          <div style={{ 
            padding: '40px 20px', textAlign: 'center', 
            background: HP_TOKENS.card, borderRadius: 24, border: `1.5px dashed ${HP_TOKENS.line}`
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
            <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.inkMute }}>Belum ada target untuk hari ini.</div>
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 8 }}>
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

        {priorities.length > 0 && (
          <button onClick={() => openModal('focus')} className="hp-tap" style={{
            padding: '18px', borderRadius: 20, border: 'none',
            background: HP_TOKENS.sage,
            color: '#F4F7F9', cursor: 'pointer', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            marginTop: 8,
            boxShadow: `0 8px 24px ${HP_TOKENS.sage}40`
          }}>
            <HPGlyph name="sparkle" size={20} color={HP_TOKENS.yellow}/>
            <span>Mulai Sesi Fokus Deep Work</span>
          </button>
        )}
      </div>

      {completingTask && (
        <TaskCompleteModal 
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onConfirm={confirmTaskComplete}
        />
      )}
    </div>
  );
}
