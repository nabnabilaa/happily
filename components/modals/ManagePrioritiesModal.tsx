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
  const [selectedKpiId, setSelectedKpiId] = useState<string>(editTask?.kpi_id || initialGoalId || "");
  const [showKpiDropdown, setShowKpiDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completingTask, setCompletingTask] = useState<any>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  // Fetch KPIs from API (manager monthly_kpis + personal_kpis tables) — only once
  const [apiKpis, setApiKpis] = useState<any[]>([]);
  useEffect(() => {
    async function fetchApiKPIs() {
      try {
        const m = new Date().getMonth() + 1;
        const y = new Date().getFullYear();
        
        const managerRes = await fetch(`/api/kpi?userId=${user?.id}&role=employee&month=${m}&year=${y}`);
        const managerData = await managerRes.json();
        const managerKpisApi = (managerData.kpis || []).map((k: any) => ({ ...k, source: 'manager' }));
        
        const personalRes = await fetch(`/api/kpi/personal?userId=${user?.id}&month=${m}&year=${y}`);
        const personalData = await personalRes.json();
        const personalKpisApi = (personalData.kpis || []).map((k: any) => ({ ...k, weight: 0, source: 'personal' }));
        
        setApiKpis([...managerKpisApi, ...personalKpisApi]);
      } catch (e) { console.error(e); }
    }
    if (user?.id) fetchApiKPIs();
  }, [user?.id]);

  // Derive the full KPI list by merging API KPIs with state.goals (always live/current)
  const myKpis = React.useMemo(() => {
    const goals = state?.goals || [];
    const uid = String(user?.id || '');
    
    // Goals from state that this user owns
    const teamGoals = goals
      .filter((g: any) => g.scope === 'team' && String(g.ownerId) === uid)
      .map((g: any) => ({
        id: g.id, title: g.title, weight: g.alignment || 0,
        metricUnit: g.metricUnit || '', scope: 'team', isGoal: true
      }));

    const assignedGoals = goals
      .filter((g: any) => g.scope === 'assigned' && String(g.ownerId) === uid)
      .map((g: any) => ({
        id: g.id, title: g.title, weight: 0,
        metricUnit: g.metricUnit || '', scope: 'assigned', isGoal: true
      }));

    // Merge API KPIs with state.goals, deduplicating by id or title
    const apiTeam = apiKpis.filter((k: any) => k.scope === 'team');
    const apiAssigned = apiKpis.filter((k: any) => k.scope === 'assigned');

    const combinedTeam = [...apiTeam];
    teamGoals.forEach((mg: any) => {
      if (!combinedTeam.some((k: any) => String(k.id) === String(mg.id) || k.title.toLowerCase() === mg.title.toLowerCase())) {
        combinedTeam.push(mg);
      }
    });

    const combinedAssigned = [...apiAssigned];
    assignedGoals.forEach((pg: any) => {
      if (!combinedAssigned.some((k: any) => String(k.id) === String(pg.id) || k.title.toLowerCase() === pg.title.toLowerCase())) {
        combinedAssigned.push(pg);
      }
    });

    return [...combinedTeam, ...combinedAssigned];
  }, [apiKpis, state?.goals, user?.id]);

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
        points: 50,
        date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        day: now.toLocaleDateString('id-ID', { weekday: 'long' }),
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

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
      const selectedKpi = myKpis.find((k: any) => String(k.id) === String(selectedKpiId));
      
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
              kpi_id: selectedKpiId || null,
              kpi_title: selectedKpi?.title || null,
              goal_id: selectedKpiId || null,
              goal: selectedKpi?.title || null,
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
      setSelectedKpiId("");
      return;
    }

    // Create mode
    const newP = {
      id: Math.floor(Math.random() * 2000000000),
      title: newTitle,
      description: newDescription,
      targetDate: targetDate,
      kpi_id: selectedKpiId || null,
      kpi_title: selectedKpi?.title || null,
      goal_id: selectedKpiId || null,
      goal: selectedKpi?.title || null,
      energy: 'mid',
      est: "30m",
      done: false,
      points: 15, // Spec v2: task_approved = 15 XP
      tone: 'sage',
      proof_links: [] as string[], // Will be filled when completing
      is_project: false, // Will be asked when completing
    };

    // Create task_kpi_links if KPI is selected
    // We wrap this in a timeout to prevent the immediate DB insert from triggering an SSE refresh
    // which would overwrite our optimistic state before the auto-sync has a chance to POST to /api/storage.
    if (selectedKpiId) {
      setTimeout(() => {
        fetch('/api/kpi/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: String(newP.id), kpiId: selectedKpiId })
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
      setSelectedKpiId("");
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
                setSelectedKpiId("");
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

          <div className="hp-form-row">
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>
                TANGGAL PELAKSANAAN
              </div>
              <input 
                type="date" 
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{ ...inputStyle, height: 48 }}
              />
            </div>
            
            <div style={{ flex: 2, minWidth: 200 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>
                TERKAIT KPI MANA?
              </div>
              {myKpis.length > 0 ? (
                <div style={{ position: 'relative' }}>
                  <div 
                    onClick={() => setShowKpiDropdown(!showKpiDropdown)}
                    style={{ 
                      ...inputStyle, 
                      height: 48, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {myKpis.find((k: any) => String(k.id) === String(selectedKpiId))?.title || "Umum (tidak terkait KPI spesifik)"}
                    </span>
                    <HPGlyph name="chevron-down" size={16} color={HP_TOKENS.inkMute} />
                  </div>
                  
                  {showKpiDropdown && (
                    <>
                      <div 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                        onClick={() => setShowKpiDropdown(false)}
                      />
                      <div style={{ 
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, 
                        background: '#fff', borderRadius: 16, 
                        boxShadow: '0 8px 32px rgba(26,29,35,0.12)', border: `1px solid ${HP_TOKENS.line}`,
                        zIndex: 101, maxHeight: 250, overflowY: 'auto', padding: 8
                      }}>
                        <div 
                          className="hp-tap"
                          onClick={() => { setSelectedKpiId(""); setShowKpiDropdown(false); }}
                          style={{
                            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                            background: selectedKpiId === "" ? HP_TOKENS.blueWash : 'transparent',
                            ...HP_TEXT.body, color: selectedKpiId === '' ? HP_TOKENS.blue : HP_TOKENS.ink, fontSize: 13, fontWeight: selectedKpiId === "" ? 700 : 500,
                            marginBottom: 4
                          }}
                        >
                          Umum (tidak terkait KPI spesifik)
                        </div>
                        
                        {myKpis.filter((k: any) => k.scope === 'team').length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ padding: '4px 12px', ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>
                              KPI Team
                            </div>
                            {myKpis.filter((k: any) => k.scope === 'team').map((k: any) => {
                              const isSelected = String(k.id) === String(selectedKpiId);
                              return (
                                <div 
                                  key={k.id}
                                  className="hp-tap"
                                  onClick={() => { setSelectedKpiId(k.id); setShowKpiDropdown(false); }}
                                  style={{
                                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                                    background: isSelected ? HP_TOKENS.blueWash : 'transparent',
                                    ...HP_TEXT.body, color: isSelected ? HP_TOKENS.blue : HP_TOKENS.ink, fontSize: 13, fontWeight: isSelected ? 700 : 500,
                                    display: 'flex', alignItems: 'center', gap: 8
                                  }}
                                >
                                  <div style={{ width: 4, height: 16, borderRadius: 2, background: HP_TOKENS.blue, opacity: isSelected ? 1 : 0.2 }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.title}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {myKpis.filter((k: any) => k.scope === 'assigned').length > 0 && (
                          <div>
                            <div style={{ padding: '4px 12px', ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>
                              KPI Saya (Assigned)
                            </div>
                            {myKpis.filter((k: any) => k.scope === 'assigned').map((k: any) => {
                              const isSelected = String(k.id) === String(selectedKpiId);
                              return (
                                <div 
                                  key={k.id}
                                  className="hp-tap"
                                  onClick={() => { setSelectedKpiId(k.id); setShowKpiDropdown(false); }}
                                  style={{
                                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                                    background: isSelected ? HP_TOKENS.blueWash : 'transparent',
                                    ...HP_TEXT.body, color: isSelected ? HP_TOKENS.blue : HP_TOKENS.ink, fontSize: 13, fontWeight: isSelected ? 700 : 500,
                                    display: 'flex', alignItems: 'center', gap: 8
                                  }}
                                >
                                  <div style={{ width: 4, height: 16, borderRadius: 2, background: HP_TOKENS.sage, opacity: isSelected ? 1 : 0.2 }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.title}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
            ) : (
              <div style={{ 
                padding: 12, borderRadius: 10, 
                background: HP_TOKENS.blueWash, border: `1px solid ${HP_TOKENS.blue}20`,
                ...HP_TEXT.small, fontSize: 12, color: HP_TOKENS.inkMute
              }}>
                💡 Belum ada KPI. Hubungi manager untuk KPI bulanan.
              </div>
            )}
          </div>
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
                        setSelectedKpiId(p.kpi_id || p.goal_id || "");
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
