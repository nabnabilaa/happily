"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_TEXT, HP_FONT } from "@/lib/constants";
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
  managerMode?: boolean;
  onManagerVerify?: (taskId: string) => void;
  onManagerReject?: (taskId: string, wtId: string, action: 'revision' | 'reject', taskPct: number, totalWtTasks: number) => void;
  onViewDetails?: () => void;
}

export default function GoalCard({ g, isReadOnly, tasks, onEditProgress, managerMode, onManagerVerify, onManagerReject, onViewDetails }: GoalCardProps) {
  const { state, updateState, awardXP, notify } = useHP();
  const xpAwardedRef = React.useRef<Set<any>>(new Set());
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Weekly Targets
  const [weeklyTargets, setWeeklyTargets] = useState<any[]>([]);
  const [loadingWeeklyTargets, setLoadingWeeklyTargets] = useState(false);
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [newTargetTitle, setNewTargetTitle] = useState('');
  const [newTargetValue, setNewTargetValue] = useState('100');
  const [newTargetUnit, setNewTargetUnit] = useState('%');
  const [savingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    async function fetchWeeklyTargets() {
      if (!g.id) return;
      setLoadingWeeklyTargets(true);
      try {
        const res = await fetch(`/api/kpi/weekly-targets?kpiId=${g.id}`);
        const data = await res.json();
        setWeeklyTargets(data.weeklyTargets || []);
      } catch (e) {
        console.error("Failed to load weekly targets for GoalCard:", e);
      } finally {
        setLoadingWeeklyTargets(false);
      }
    }
    fetchWeeklyTargets();

    const handleUpdate = () => {
      fetchWeeklyTargets();
    };
    window.addEventListener('hp_db_update', handleUpdate);
    return () => window.removeEventListener('hp_db_update', handleUpdate);
  }, [g.id]);

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

  // All priorities from state (used for weekly_target_id lookups which don't need goal filtering)
  const allPriorities = tasks || state?.priorities || [];
  // Link to actual priorities (tasks) in state that are connected to this goal
  const linkedTasks = allPriorities.filter((p: any) =>
    (p.goal_id && String(p.goal_id) === String(g.id)) ||
    (p.goalId && String(p.goalId) === String(g.id)) ||
    (p.kpi_id && String(p.kpi_id) === String(g.id)) ||
    (p.kpiId && String(p.kpiId) === String(g.id))
  );
  const hasTodayTasks = linkedTasks.length > 0;
  const hasTasks = hasTodayTasks || (g.metric && String(g.metric).includes('task selesai'));
  const doneTaskCount = linkedTasks.filter((p: any) => p.done).length;
  // Hitung progress dengan mempertimbangkan partial_progress (anti double-count)
  const taskProgress = hasTodayTasks
    ? Math.round(linkedTasks.reduce((sum: number, t: any) => {
        const contrib = t.done ? 100 : (t.partial_progress || 0);
        return sum + contrib;
      }, 0) / linkedTasks.length)
    : null;
  
  // Untuk KPI dari API: hitung dari task count per weekly target (bukan DB currentValue)
  // Pakai allPriorities (bukan linkedTasks) karena task lama mungkin tidak punya goal_id yang cocok
  const weeklyTargetsProgress = weeklyTargets.length > 0
    ? Math.round(
        weeklyTargets.reduce((sum: number, wt: any) => {
          const wtTasks = allPriorities.filter((t: any) =>
            (t.weekly_target_id && String(t.weekly_target_id) === String(wt.id)) ||
            (t.weeklyTargetId && String(t.weeklyTargetId) === String(wt.id))
          );
          const pct = wtTasks.length > 0
            ? Math.round(wtTasks.reduce((s: number, t: any) => s + (t.done ? 100 : (t.partial_progress || 0)), 0) / wtTasks.length)
            : Math.min(100, Math.round(((wt.currentValue || 0) / (wt.targetValue || 100)) * 100));
          return sum + pct;
        }, 0) / weeklyTargets.length
      )
    : null;

  // Final display progress: weekly targets progress (untuk KPI) > task progress > stored progress
  const displayProgress = g.isApiKpi && weeklyTargetsProgress !== null
    ? weeklyTargetsProgress
    : hasTodayTasks && taskProgress !== null
      ? taskProgress
      : (g.progress || 0);

  const deleteGoal = () => {
    if (isReadOnly) return;
    updateState((s: any) => ({
      ...s,
      goals: s.goals.filter((item: any) => String(item.id) !== String(g.id))
    }));
    notify('Goal Dihapus', `Goal "${g.title}" telah dihapus.`, 'info');
    setShowDeleteModal(false);
  };

  const toggleTask = (taskId: number) => {
    if (isReadOnly) return;
    const task = state?.priorities?.find((p: any) => String(p.id) === String(taskId));
    if (!task) return;
    
    const wasDone = task.done;
    
    // Award XP only on first completion in this session (guards undo→redo exploit)
    if (!wasDone && !xpAwardedRef.current.has(taskId)) {
      xpAwardedRef.current.add(taskId);
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

  // Manager mode: expandable task detail
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  };

  // Editable progress state (for manager)
  const [editingProgress, setEditingProgress] = useState(false);
  const [tempProgress, setTempProgress] = useState(String(displayProgress));
  
  return (
    <HPCard padding={16} style={{ 
      border: `1.5px solid ${HP_TOKENS.line}`,
      boxShadow: '0 4px 12px rgba(26,29,35,0.01)',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: 10, 
          background: `${toneColor}15`, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <HPGlyph name="target" size={16} color={toneColor} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {g.status && (
                <div style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: g.status === 'approved' ? HP_TOKENS.sageSoft : g.status === 'rejected' ? HP_TOKENS.coralSoft : g.status === 'revision' ? HP_TOKENS.yellowSoft : HP_TOKENS.yellowSoft,
                  color: g.status === 'approved' ? HP_TOKENS.sage : g.status === 'rejected' ? HP_TOKENS.coral : '#8A6814',
                  fontSize: 10, fontWeight: 900, letterSpacing: 0.5
                }}>
                  {g.status === 'approved' ? 'ACCEPT' : g.status === 'revision' ? 'REVISI' : g.status === 'rejected' ? 'REJECT' : 'PENDING'}
                </div>
              )}
              {/* Review status badge from HR/Manager */}
              {g.reviewStatus === 'revision' && (
                <div style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: '#FFF3CC', color: '#8A6814',
                  fontSize: 10, fontWeight: 900, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 3
                }}>⚠️ PERLU REVISI</div>
              )}
              {g.reviewStatus === 'rejected' && (
                <div style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral,
                  fontSize: 10, fontWeight: 900, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 3
                }}>❌ DITOLAK</div>
              )}
              {displayProgress >= 100 && !g.reviewStatus && (
                <div style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: HP_TOKENS.sageSoft, color: HP_TOKENS.sage,
                  fontSize: 10, fontWeight: 900, letterSpacing: 0.5
                }}>DONE</div>
              )}
            </div>
            
            {!isReadOnly && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 9, background: HP_TOKENS.lineSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: HP_TOKENS.inkFade, fontWeight: 900, lineHeight: 1 }}>×</span>
                </div>
              </button>
            )}
          </div>

          <div style={{ ...HP_TEXT.h, fontSize: 16, lineHeight: 1.4, color: HP_TOKENS.ink, marginTop: 4 }}>
            {g.title}
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: 20, padding: 12, borderRadius: 12,
        background: 'linear-gradient(to bottom, #F9FAFB, #F3F4F6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HPGlyph name="calendar" size={12} color={HP_TOKENS.inkFade} />
            <span style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkFade, fontSize: 11 }}>
              Due: {g.due ? g.due.split(' ')[0] : '-'}
            </span>
          </div>
          <div style={{ ...HP_TEXT.small, fontWeight: 800, color: HP_TOKENS.ink, fontSize: 12 }}>
            {weeklyTargets.length > 0
              ? `${weeklyTargets.length} target mingguan`
              : hasTodayTasks
                ? `${doneTaskCount}/${linkedTasks.length} task selesai` 
                : (g.metric && String(g.metric).includes('task selesai')) 
                  ? String(g.metric) 
                  : (displayProgress >= 100 ? 'Target Tercapai ✨' : (g.metric || 'Progress'))
            }
          </div>
        </div>

        {/* Bar Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                        background: HP_TOKENS.sage, color: '#F4F7F9', fontSize: 11,
                        fontWeight: 900, cursor: 'pointer',
                        boxShadow: `0 2px 8px ${HP_TOKENS.sage}40`
                      }}
                    >
                      ✓ Simpan
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingProgress(false); }}
                      style={{
                        padding: '5px 8px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                        background: HP_TOKENS.card, color: HP_TOKENS.inkFade, fontSize: 11,
                        fontWeight: 900, cursor: 'pointer'
                      }}
                    >
                      ✕ Batal
                    </button>
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
      </div>

      {/* Review Note Banner — shown to employee when flagged */}
      {g.reviewStatus && g.reviewNote && (
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 10,
          background: g.reviewStatus === 'rejected' ? HP_TOKENS.coralSoft : '#FFF3CC',
          border: `1px solid ${g.reviewStatus === 'rejected' ? HP_TOKENS.coral + '40' : '#F0C040'}`,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>{g.reviewStatus === 'rejected' ? '❌' : '⚠️'}</span>
          <div>
            <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, color: g.reviewStatus === 'rejected' ? HP_TOKENS.coral : '#8A6814', marginBottom: 2 }}>
              {g.reviewStatus === 'rejected' ? 'KPI Ditolak oleh HR/Manager' : 'Catatan Revisi dari HR/Manager'}
            </div>
            <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkSoft, lineHeight: 1.4 }}>{g.reviewNote}</div>
            {g.penaltyPct > 0 && (
              <div style={{ marginTop: 4, fontFamily: HP_FONT, fontSize: 10, fontWeight: 700, color: HP_TOKENS.coral }}>
                Penalti progress: -{g.penaltyPct}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Button Lihat Detail */}
      {onViewDetails && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            className="hp-tap"
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: `1.5px solid ${HP_TOKENS.lineSoft}`,
              background: '#fff', color: HP_TOKENS.ink,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            Lihat Detail Target & Task <span>➔</span>
          </button>
        </div>
      )}



      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: 32,
            width: '100%', maxWidth: 400, textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            animation: 'hpPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: HP_TOKENS.coralWash, color: HP_TOKENS.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <HPGlyph name="target" size={32} />
            </div>
            <div style={{ ...HP_TEXT.h, fontSize: 20, marginBottom: 8 }}>Hapus Target/KPI?</div>
            <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, marginBottom: 24 }}>
              Apakah Anda yakin ingin menghapus Target/KPI <b>"{g.title}"</b>?
            </div>
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <button onClick={(e) => { e.stopPropagation(); deleteGoal(); }} className="hp-tap" style={{
                padding: '16px', borderRadius: 16, border: 'none',
                background: HP_TOKENS.coral, color: '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Ya, Hapus
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(false); }} className="hp-tap" style={{
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
    </HPCard>
  );
}

