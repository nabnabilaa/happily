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
  onTaskComplete?: () => void;
}

export default function TaskHarianWidget({ openModal, onTaskComplete }: Props) {
  const { state, updateState, user, awardXP, syncSkillProgress } = useHP();
  const [completingTask, setCompletingTask] = useState<any>(null);

  const togglePriority = useCallback((id: number) => {
    const priority = state?.priorities?.find((p: any) => p.id === id);
    if (!priority) return;
    
    if (!priority.done) {
      // Task is being marked DONE → open completion modal
      setCompletingTask(priority);
    } else {
      // Task is being un-checked → just toggle
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

  const confirmTaskComplete = useCallback((data: {
    proofLinks: string[]; isProject: boolean; metricValue?: number; notes?: string;
  }) => {
    if (!completingTask) return;
    const id = completingTask.id;

    awardXP('priority_complete', `Selesaikan: ${completingTask.title}`);

    updateState((s: any) => {
      const pIndex = s.priorities.findIndex((p: any) => p.id === id);
      if (pIndex === -1) return s;

      const newPriorities = [...s.priorities];
      newPriorities[pIndex] = { 
        ...newPriorities[pIndex], 
        done: true,
        proof_links: data.proofLinks,
        is_project: data.isProject,
        metric_value: data.metricValue || null,
        completion_notes: data.notes || null,
        completed_at: new Date().toISOString(),
      };

      const now = new Date();
      const newLog = {
        id: Date.now(),
        type: 'quest_completion',
        title: newPriorities[pIndex].title,
        points: 15, // Spec v2: task_approved = 15 XP
        date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        day: now.toLocaleDateString('id-ID', { weekday: 'long' }),
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      // Submit metric value to KPI daily input API if applicable
      if (data.metricValue && newPriorities[pIndex].kpi_id) {
        fetch('/api/kpi/daily-input', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            kpiId: newPriorities[pIndex].kpi_id,
            date: new Date().toISOString().slice(0, 10),
            value: data.metricValue,
            notes: data.notes || newPriorities[pIndex].title,
            proofLink: data.proofLinks[0] || null,
          })
        }).catch(e => console.error('KPI input failed:', e));
      }

      syncSkillProgress(newPriorities[pIndex].title + " " + (newPriorities[pIndex].kpi_title || ""), 2);

      // Recalculate goal progress for linked goals
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
        logbook: [newLog, ...(s.logbook || [])],
        lastActivityDate: now.toISOString(),
        penaltyActive: false,
      };
    });

    onTaskComplete?.();
    setCompletingTask(null);
  }, [completingTask, updateState, awardXP, syncSkillProgress, user, onTaskComplete]);

  if (!state || !user) return null;

  const priorities = state.priorities || [];
  const done = priorities.filter((p: any) => p.done).length;
  const total = priorities.length;

  return (
    <div style={{ marginTop: 24 }}>
      <SectionHeader 
        icon="target" 
        label="Task Harian" 
        count={`${done}/${total}`} 
        action="+ Tambah Task"
        onAction={() => openModal('manage_priorities')}
      />
      
      {/* Realization Progress Card */}
      <HPCard padding={20} style={{ 
        marginBottom: 20, 
        background: `linear-gradient(135deg, ${HP_TOKENS.sageWash} 0%, #fff 100%)`, 
        border: `1.5px solid ${HP_TOKENS.sage}20`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ 
          position: 'absolute', right: -20, top: -20, width: 100, height: 100, 
          borderRadius: 50, background: `${HP_TOKENS.sage}10`, zIndex: 0 
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>PROGRESS TASK HARI INI</div>
              <div style={{ ...HP_TEXT.h, fontSize: 28, color: HP_TOKENS.ink }}>
                {total > 0 ? Math.round((done / total) * 100) : 0}% 
                <span style={{ fontSize: 14, color: HP_TOKENS.inkFade, fontWeight: 600, marginLeft: 8 }}>Tercapai</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...HP_TEXT.h, fontSize: 18, color: HP_TOKENS.sage }}>{done}/{total}</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>Task Selesai</div>
            </div>
          </div>
          
          <div style={{ position: 'relative', height: 12, background: HP_TOKENS.lineSoft, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ 
               width: `${total > 0 ? (done / total) * 100 : 0}%`, 
               height: '100%', 
               background: `linear-gradient(to right, ${HP_TOKENS.sage}, #4ADE80)`, 
               borderRadius: 6,
               transition: '1s cubic-bezier(0.2, 0.8, 0.2, 1)',
               boxShadow: `0 0 12px ${HP_TOKENS.sage}40`
            }} />
          </div>

          {/* Focus Task Sync Display */}
          {state.focusTaskId && (
            <div style={{ 
              marginTop: 16, padding: '12px 16px', borderRadius: 12, 
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
          )}
        </div>
      </HPCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {priorities.length > 0 ? (
          priorities.map((p: any) => (
            <PriorityCard key={p.id} p={p} onToggle={() => togglePriority(p.id)}/>
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
        
        {priorities.length > 0 && (
          <button onClick={() => openModal('focus')} className="hp-tap" style={{
            padding: '18px', borderRadius: 20, border: 'none',
            background: HP_TOKENS.sage,
            color: '#fff', cursor: 'pointer', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            marginTop: 8,
            boxShadow: `0 8px 24px ${HP_TOKENS.sage}30`
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
