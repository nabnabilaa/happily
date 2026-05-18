"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Modal from "@/components/ui/Modal";

export default function ManagePrioritiesModal({ onClose, initialGoalId }: { onClose: () => void; initialGoalId?: string }) {
  const { state, updateState, user, notify } = useHP();
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [targetDate, setTargetDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedKpiId, setSelectedKpiId] = useState<string>(initialGoalId || "");

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
    const managerGoals = goals
      .filter((g: any) => g.scope === 'assigned' && String(g.ownerId) === uid)
      .map((g: any) => ({
        id: g.id, title: g.title, weight: g.alignment || 0,
        metricUnit: g.metricUnit || '', source: 'manager', isGoal: true
      }));

    const personalGoals = goals
      .filter((g: any) => g.scope === 'personal' && String(g.ownerId) === uid)
      .map((g: any) => ({
        id: g.id, title: g.title, weight: 0,
        metricUnit: g.metricUnit || '', source: 'personal', isGoal: true
      }));

    // Merge API KPIs with state.goals, deduplicating by id or title
    const apiManager = apiKpis.filter((k: any) => k.source === 'manager');
    const apiPersonal = apiKpis.filter((k: any) => k.source === 'personal');

    const combinedManager = [...apiManager];
    managerGoals.forEach((mg: any) => {
      if (!combinedManager.some((k: any) => String(k.id) === String(mg.id) || k.title.toLowerCase() === mg.title.toLowerCase())) {
        combinedManager.push(mg);
      }
    });

    const combinedPersonal = [...apiPersonal];
    personalGoals.forEach((pg: any) => {
      if (!combinedPersonal.some((k: any) => String(k.id) === String(pg.id) || k.title.toLowerCase() === pg.title.toLowerCase())) {
        combinedPersonal.push(pg);
      }
    });

    return [...combinedManager, ...combinedPersonal];
  }, [apiKpis, state?.goals, user?.id]);

  if (!state) return null;

  // Anti-abuse: minimum 20 characters for task title (Spec v2)
  const MIN_TASK_CHARS = 20;
  const titleTooShort = newTitle.length > 0 && newTitle.length < MIN_TASK_CHARS;
  const canAdd = newTitle.length >= MIN_TASK_CHARS;

  const addPriority = () => {
    if (!canAdd) return;
    const selectedKpi = myKpis.find((k: any) => String(k.id) === String(selectedKpiId));
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
    if (selectedKpiId) {
      fetch('/api/kpi/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: String(newP.id), kpiId: selectedKpiId })
      }).catch(e => console.error('Failed to create KPI link:', e));
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
  };

  const deletePriority = (id: number) => {
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
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: 14, borderRadius: 12, 
    border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 14, background: '#fff', outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <Modal onClose={onClose} title="📋 Kelola Task Harian">
      <div style={{ marginTop: 4 }}>
        
        {/* Active tasks list */}
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 8 }}>TASK AKTIF HARI INI</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {state.priorities.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', background: HP_TOKENS.paper, borderRadius: 16, border: `1.5px dashed ${HP_TOKENS.line}` }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📝</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Belum ada task. Tambahkan di bawah.</div>
            </div>
          ) : (
            state.priorities.map((p: any) => (
              <div 
                key={p.id} 
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14,
                  background: p.done ? HP_TOKENS.sageWash : HP_TOKENS.card, 
                  border: `1.5px solid ${p.done ? HP_TOKENS.sage + '30' : HP_TOKENS.line}`,
                }}
              >
                <div style={{ 
                  width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                  background: p.done ? HP_TOKENS.sage : 'transparent',
                  border: `2px solid ${p.done ? HP_TOKENS.sage : HP_TOKENS.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {p.done && <HPGlyph name="check" size={12} color="#fff"/>}
                </div>
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
                  <button 
                    onClick={() => deletePriority(p.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                  >
                    <HPGlyph name="close" size={14} color={HP_TOKENS.coral}/>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add new task form — SIMPLIFIED */}
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 8 }}>TAMBAH TASK BARU</div>
        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: 10, 
          padding: 16, borderRadius: 16, background: HP_TOKENS.paper, border: `1.5px solid ${HP_TOKENS.line}` 
        }}>
          <input 
            type="text" 
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPriority()}
            placeholder="Deskripsikan task (min. 20 karakter)..."
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

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>
                TANGGAL PELAKSANAAN
              </div>
              <input 
                type="date" 
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            
            <div style={{ flex: 2 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>
                TERKAIT KPI MANA?
              </div>
              {myKpis.length > 0 ? (
                <select 
                  value={selectedKpiId}
                  onChange={(e) => setSelectedKpiId(e.target.value)}
                  style={inputStyle}
                >
                <option value="">Umum (tidak terkait KPI spesifik)</option>
                {myKpis.filter((k: any) => k.source === 'personal').length > 0 && (
                  <optgroup label="KPI Mandiri">
                    {myKpis.filter((k: any) => k.source === 'personal').map((k: any) => {
                      const goal = state.goals?.find((g: any) => String(g.id) === String(k.id));
                      const parent = goal?.parent_id ? state.goals?.find((g: any) => String(g.id) === String(goal.parent_id)) : null;
                      const alignmentText = parent ? ` (Aligned: ${parent.title})` : '';
                      return (
                        <option key={k.id} value={k.id}>
                          {k.title}{alignmentText}{k.metricUnit ? ` (${k.metricUnit})` : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>
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
            onClick={addPriority}
            disabled={!canAdd}
            style={{
              padding: 14, borderRadius: 12, border: 'none',
              background: HP_TOKENS.sage, color: '#fff',
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: canAdd ? 'pointer' : 'default',
              opacity: !canAdd ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            + Tambah Task
          </button>
        </div>
      </div>
    </Modal>
  );
}
