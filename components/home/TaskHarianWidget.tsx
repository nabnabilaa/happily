"use client";

import React, { useState, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import {
  HP_TOKENS,
  HP_TEXT,
  HPGlyph,
  HPCard,
  HPBar,
  HPButton,
  EmptyState,
  Stack,
  Row,
  IconBadge,
  FadeIn,
  CountUp,
} from "@/components/ui";
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
        completed_at: nowFullyDone ? (data.completedAt ? new Date(data.completedAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ')) : null,
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

  const focusTask = state.focusTaskId
    ? priorities.find((p: any) => p.id === state.focusTaskId)
    : null;

  return (
    <section id="task-harian-section">
      <SectionHeader
        icon="target"
        label="Task Harian"
        count={`${done}/${total}`}
        action="Tambah"
        onAction={() => openModal('manage_priorities')}
      />

      {/* Progress summary */}
      <HPCard padding={18} style={{ marginBottom: 14 }}>
        <Row justify="space-between" align="flex-end" gap={4}>
          <div style={{ minWidth: 0 }}>
            <div style={HP_TEXT.tiny}>Progress hari ini</div>
            <Row gap={2} align="baseline" style={{ marginTop: 4 }}>
              <span style={{ ...HP_TEXT.metric, fontSize: 30 }}>
                <CountUp value={partialProgressPct} suffix="%" />
              </span>
              <span style={{ ...HP_TEXT.small }}>tercapai</span>
            </Row>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ ...HP_TEXT.bodyStrong, fontVariantNumeric: 'tabular-nums' }}>
              {done}/{total}
            </div>
            <div style={{ ...HP_TEXT.small, fontSize: 12 }}>selesai</div>
          </div>
        </Row>

        <div style={{ marginTop: 14 }}>
          <HPBar value={partialProgressPct} label="Progress task hari ini" height={8} />
        </div>

        {/* Live focus session. Rendered only when active — animating a
            collapsed element's max-height just to hide it wastes a paint. */}
        {focusTask && (
          <FadeIn style={{ marginTop: 14 }}>
            <Row gap={3} p={3} style={{ background: HP_TOKENS.sunken, borderRadius: HP_TOKENS.radiusMd }}>
              <IconBadge size={32} tone={HP_TOKENS.yellowSoft}>
                <HPGlyph name="sparkle" size={15} color={HP_TOKENS.yellowDark} />
              </IconBadge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={HP_TEXT.tiny}>Sedang fokus</div>
                <div style={{ ...HP_TEXT.sub, fontSize: 13.5, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {focusTask.title || 'Focus task'}
                </div>
              </div>
              <span style={{ ...HP_TEXT.bodyStrong, color: HP_TOKENS.yellowDark, fontVariantNumeric: 'tabular-nums' }}>
                {state.focusProgress || 0}%
              </span>
            </Row>
          </FadeIn>
        )}
      </HPCard>

      <Stack gap={3}>
        {paginatedPriorities.length > 0 ? (
          paginatedPriorities.map((p: any) => {
            const highlighted = String(p.id) === String(highlightedTaskId);
            return (
              <div
                key={p.id}
                id={`task-card-${p.id}`}
                style={{
                  borderRadius: HP_TOKENS.radius,
                  // Ring only — no shadow bloom, and no layout shift.
                  outline: highlighted ? `2px solid ${HP_TOKENS.primary}` : 'none',
                  outlineOffset: 2,
                  transition: 'outline-color 220ms var(--hp-ease)',
                }}
              >
                <PriorityCard
                  p={p}
                  onToggle={() => togglePriority(p.id)}
                  onDelete={() => deletePriority(p.id)}
                  onEdit={() => openModal('manage_priorities', { editTask: p })}
                />
              </div>
            );
          })
        ) : (
          <HPCard variant="outline" padding={0} style={{ borderStyle: 'dashed' }}>
            <EmptyState
              icon="target"
              title="Belum ada task hari ini"
              description="Tambahkan target harian supaya progresmu bisa dilacak."
              action={
                <HPButton variant="primary" size="sm" icon="plus" onClick={() => openModal('manage_priorities')}>
                  Tambah task
                </HPButton>
              }
            />
          </HPCard>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Row justify="center" gap={3} style={{ marginTop: 4 }} aria-label="Navigasi halaman task">
            <HPButton
              size="sm"
              icon="chevronLeft"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Halaman sebelumnya"
            >
              Sebelumnya
            </HPButton>

            <span
              aria-live="polite"
              style={{ ...HP_TEXT.small, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
            >
              {currentPage} / {totalPages}
            </span>

            <HPButton
              size="sm"
              iconEnd="chevronRight"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Halaman berikutnya"
            >
              Berikutnya
            </HPButton>
          </Row>
        )}

        {priorities.length > 0 && (
          <HPButton
            variant="primary"
            size="lg"
            icon="sparkle"
            fullWidth
            onClick={() => openModal('focus')}
            style={{ marginTop: 4 }}
          >
            Mulai sesi fokus
          </HPButton>
        )}
      </Stack>

      {completingTask && (
        <TaskCompleteModal
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onConfirm={confirmTaskComplete}
        />
      )}
    </section>
  );
}
