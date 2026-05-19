"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";
import HPCard from "@/components/ui/HPCard";
import HPChip from "@/components/ui/HPChip";
import HPBar from "@/components/ui/HPBar";
import HPGlyph from "@/components/ui/HPGlyph";

interface GoalCardProps {
  g: any;
  isReadOnly?: boolean;
  tasks?: any[];
  onEditProgress?: (progress: number) => void;
}

export default function GoalCard({ g, isReadOnly, tasks, onEditProgress }: GoalCardProps) {
  const { state, updateState, awardXP, notify } = useHP();
  const tones: Record<string, string> = { 
    sage: HP_TOKENS.sage, 
    blue: HP_TOKENS.blue, 
    lavender: HP_TOKENS.lavender || '#6B5F8E',
    yellow: HP_TOKENS.yellow,
    coral: HP_TOKENS.coral,
  };

  const [showHistory, setShowHistory] = useState(false);
  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setLoadingHistory(true);
    setShowHistory(true);
    try {
      const res = await fetch(`/api/kpi/tasks?goalId=${g.id}`);
      const data = await res.json();
      if (data.tasks) setHistoryTasks(data.tasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const parentGoal = g.parent_id ? state?.goals.find((item: any) => String(item.id) === String(g.parent_id)) : null;

  // Link to actual priorities (tasks) in state that are connected to this goal
  const prioritiesToUse = tasks || state?.priorities || [];
  // For `tasks` from manager, they might use `goalId` instead of `goal_id`.
  const linkedTasks = prioritiesToUse.filter((p: any) => (p.goal_id && String(p.goal_id) === String(g.id)) || (p.goalId && String(p.goalId) === String(g.id)));
  const hasTodayTasks = linkedTasks.length > 0;
  const hasTasks = hasTodayTasks || (g.metric && String(g.metric).includes('task selesai'));
  const doneTaskCount = linkedTasks.filter((p: any) => p.done).length;
  const taskProgress = hasTodayTasks ? Math.round((doneTaskCount / linkedTasks.length) * 100) : null;
  
  // Progress from child goals (aligned to this goal)
  const childGoals = state?.goals?.filter((item: any) => String(item.parent_id) === String(g.id)) || [];
  const hasChildren = childGoals.length > 0;
  const childrenProgress = hasChildren 
    ? Math.round(childGoals.reduce((acc, curr) => acc + (curr.progress || 0), 0) / childGoals.length)
    : null;

  // Final display progress
  const displayProgress = g.progress || 0;

  const deleteGoal = () => {
    if (isReadOnly) return;
    if (confirm(`Hapus goal "${g.title}"?`)) {
      updateState((s: any) => ({
        ...s,
        goals: s.goals.filter((item: any) => String(item.id) !== String(g.id))
      }));
      notify('Goal Dihapus', `Goal "${g.title}" telah dihapus.`, 'info');
    }
  };

  const toggleTask = (taskId: number) => {
    if (isReadOnly) return;
    const task = state?.priorities?.find((p: any) => String(p.id) === String(taskId));
    if (!task) return;
    
    const wasDone = task.done;
    
    // Award XP and show confetti if completing
    if (!wasDone) {
      awardXP('priority_complete', `Selesaikan: ${task.title}`);
      notify('Task Selesai! 🎉', `${task.title} berhasil diselesaikan.`, 'success');
    }

    updateState((s: any) => {
      const taskIndex = s.priorities.findIndex((p: any) => String(p.id) === String(taskId));
      if (taskIndex === -1) return s;

      const newPriorities = [...s.priorities];
      newPriorities[taskIndex] = { ...newPriorities[taskIndex], done: !wasDone };

      // Recalculate goal progress
      const updatedGoals = s.goals.map((goal: any) => {
        if (String(goal.id) === String(g.id)) {
          let total = 0;
          let completed = 0;
          const match = String(goal.metric || '').match(/^(\d+)\/(\d+)\s+task/);
          if (match) {
            completed = parseInt(match[1]);
            total = parseInt(match[2]);
          } else {
            const tasksForGoal = newPriorities.filter((p: any) => p.goal_id && String(p.goal_id) === String(goal.id));
            total = tasksForGoal.length;
            completed = tasksForGoal.filter((p: any) => p.done).length;
          }

          // Apply completion state change
          const diff = !wasDone ? 1 : -1;
          const newCompleted = Math.max(0, Math.min(total, completed + diff));
          const newProgress = total > 0 ? Math.round((newCompleted / total) * 100) : goal.progress;

          return { ...goal, progress: newProgress, metric: total > 0 ? `${newCompleted}/${total} task selesai` : goal.metric };
        }
        return goal;
      });

      return {
        ...s,
        priorities: newPriorities,
        goals: updatedGoals,
        lastActivityDate: !wasDone ? new Date().toISOString() : s.lastActivityDate
      };
    });
  };

  const toneColor = tones[g.tone] || HP_TOKENS.sage;

  // Editable progress state (for manager)
  const [editingProgress, setEditingProgress] = useState(false);
  const [tempProgress, setTempProgress] = useState(String(displayProgress));
  
  return (
    <HPCard padding={16} style={{ 
      border: `1.5px solid ${HP_TOKENS.line}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ 
              width: 24, height: 24, borderRadius: 8, 
              background: `${toneColor}15`, 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <HPGlyph name="target" size={14} color={toneColor} />
            </div>
            <div style={{ ...HP_TEXT.h, fontSize: 16 }}>{g.title}</div>
            {g.status && (
              <div style={{ 
                padding: '2px 8px', borderRadius: 6, 
                background: g.status === 'approved' ? HP_TOKENS.sageSoft : g.status === 'rejected' ? HP_TOKENS.coralSoft : g.status === 'revision' ? HP_TOKENS.yellowSoft : HP_TOKENS.yellowSoft, 
                color: g.status === 'approved' ? HP_TOKENS.sage : g.status === 'rejected' ? HP_TOKENS.coral : '#8A6814',
                fontSize: 9, fontWeight: 900, letterSpacing: 0.5
              }}>
                {g.status === 'approved' ? 'ACCEPT' : g.status === 'revision' ? 'REVISI' : g.status === 'rejected' ? 'REJECT' : 'PENDING'}
              </div>
            )}
            {displayProgress >= 100 && (
              <div style={{ 
                padding: '2px 8px', borderRadius: 6, 
                background: HP_TOKENS.sageSoft, color: HP_TOKENS.sage,
                fontSize: 9, fontWeight: 900, letterSpacing: 0.5
              }}>DONE</div>
            )}
            {!isReadOnly && (
              <button 
                onClick={(e) => { e.stopPropagation(); deleteGoal(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
              >
                <div style={{ width: 14, height: 14, borderRadius: 7, background: HP_TOKENS.lineSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: HP_TOKENS.inkFade, fontWeight: 900 }}>×</span>
                </div>
              </button>
            )}
          </div>
          {parentGoal && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 32 }}>
              <HPGlyph name="link" size={10} color={HP_TOKENS.blue} />
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 800, fontSize: 10 }}>
                Aligned to: {parentGoal.title}
              </div>
            </div>
          )}
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 6, marginLeft: 32, fontSize: 12 }}>
             {hasChildren ? `${childGoals.length} Sub-KPI` : hasTodayTasks ? `${doneTaskCount}/${linkedTasks.length} task selesai` : (g.metric && String(g.metric).includes('task selesai')) ? g.metric : (displayProgress >= 100 ? 'Target Tercapai ✨' : (g.metric || 'Progress'))} · <span style={{ fontWeight: 700 }}>Due:</span> {g.due}
          </div>
        </div>
        <HPChip tone={g.tone} size="sm">{g.alignment}% align</HPChip>
      </div>

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
             <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>PROGRESS</span>
             {editingProgress ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="range" min="0" max="100"
                    value={tempProgress}
                    onChange={(e) => setTempProgress(e.target.value)}
                    style={{
                      flex: 1, accentColor: toneColor, cursor: 'pointer', height: 6
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 900, color: toneColor, minWidth: 35, textAlign: 'right' }}>
                    {tempProgress}%
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const val = Math.max(0, Math.min(100, Number(tempProgress)));
                      onEditProgress?.(val);
                      setEditingProgress(false);
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 8, border: 'none',
                      background: HP_TOKENS.sage, color: '#fff', fontSize: 11,
                      fontWeight: 900, cursor: 'pointer',
                      boxShadow: `0 2px 8px ${HP_TOKENS.sage}40`
                    }}
                  >✓ Simpan</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingProgress(false); }}
                    style={{
                      padding: '5px 8px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                      background: '#fff', color: HP_TOKENS.inkFade, fontSize: 11,
                      fontWeight: 900, cursor: 'pointer'
                    }}
                  >✕ Batal</button>
                </div>
              ) : (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: onEditProgress ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    if (onEditProgress) {
                      e.stopPropagation();
                      setTempProgress(String(displayProgress));
                      setEditingProgress(true);
                    }
                  }}
                >
                  <span style={{ ...HP_TEXT.h, fontSize: 13, color: toneColor }}>{displayProgress}%</span>
                  {onEditProgress && (
                    <span style={{
                      fontSize: 10, color: toneColor, opacity: 0.6,
                      padding: '2px 6px', borderRadius: 6, background: `${toneColor}10`,
                      fontWeight: 800
                    }}>✏️ edit</span>
                  )}
                </div>
              )}
          </div>
          <HPBar value={displayProgress} tone={g.tone} height={8}/>
        </div>
      </div>

      {(linkedTasks.length > 0 || hasTasks) && (
        <div style={{ 
          marginTop: 16, 
          padding: '12px', 
          background: HP_TOKENS.paper,
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 900, fontSize: 9, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              LINKED QUESTS {g.metric ? `(${g.metric.split(' ')[0]})` : ''}
              <button
                onClick={fetchHistory}
                style={{ 
                  background: 'none', border: 'none', padding: '2px 6px', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  color: HP_TOKENS.blue, fontSize: 9, fontWeight: 900, letterSpacing: 0.5,
                  backgroundColor: HP_TOKENS.blueWash
                }}
              >
                {showHistory ? 'SEMBUNYIKAN' : 'LIHAT SEMUA'}
              </button>
            </div>
            {!isReadOnly && (
              <button 
                onClick={(e) => { e.stopPropagation(); updateState((s: any) => ({ ...s, modal: { name: 'manage_priorities', props: { initialGoalId: String(g.id) } } })); }}
                style={{ background: HP_TOKENS.sageSoft, border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <HPGlyph name="target" size={8} color={HP_TOKENS.sage} />
                <span style={{ fontSize: 8, fontWeight: 900, color: HP_TOKENS.sage }}>QUICK ADD</span>
              </button>
            )}
          </div>
          
          {loadingHistory && (
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, textAlign: 'center', padding: '10px 0' }}>
              Memuat task...
            </div>
          )}

          {(showHistory ? historyTasks : linkedTasks).map((sg: any) => (
            <div 
              key={sg.id} 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (!showHistory) toggleTask(sg.id); 
              }}
              className={showHistory ? "" : "hp-tap"}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: showHistory ? 'default' : 'pointer', opacity: showHistory ? 0.8 : 1 }}
            >
              <div style={{ 
                width: 14, height: 14, borderRadius: 4, 
                background: sg.done ? toneColor : 'transparent',
                border: `1.5px solid ${sg.done ? toneColor : HP_TOKENS.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {sg.done && <HPGlyph name="check" size={8} color="#fff" stroke={4}/>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <div style={{ 
                  ...HP_TEXT.small, 
                  fontSize: 12, 
                  color: sg.done ? HP_TOKENS.inkFade : HP_TOKENS.ink,
                  textDecoration: sg.done ? 'line-through' : 'none',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  {sg.title}
                  {showHistory && sg.targetDate && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: HP_TOKENS.inkMute, background: HP_TOKENS.lineSoft, padding: '2px 4px', borderRadius: 4, textDecoration: 'none' }}>
                      {sg.targetDate.slice(0, 10)}
                    </span>
                  )}
                </div>
                {sg.description && (
                  <div style={{ 
                    ...HP_TEXT.small, 
                    fontSize: 10, 
                    color: HP_TOKENS.inkMute,
                    marginTop: 2,
                    lineHeight: 1.3
                  }}>
                    {sg.description}
                  </div>
                )}
              </div>
            </div>
          ))}

          {showHistory && historyTasks.length === 0 && !loadingHistory && (
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, textAlign: 'center', padding: '10px 0' }}>
              Belum ada riwayat task.
            </div>
          )}
        </div>
      )}

      {!hasTasks && !isReadOnly && (
        <div style={{ 
          marginTop: 12, padding: '10px 14px', 
          background: HP_TOKENS.yellowWash, borderRadius: 10,
          border: `1px dashed ${HP_TOKENS.yellow}60`,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <HPGlyph name="info" size={12} color={HP_TOKENS.yellow} />
          <div style={{ ...HP_TEXT.tiny, color: '#8A6814', fontWeight: 700, fontSize: 10 }}>
            Tambahkan task di Task Harian & hubungkan ke KPI ini untuk tracking progress otomatis.
          </div>
        </div>
      )}
    </HPCard>
  );
}

