"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import HPBar from "@/components/ui/HPBar";
import HPCard from "@/components/ui/HPCard";
import TaskCompleteModal from "@/components/modals/TaskCompleteModal";

interface WorkCheckInModalProps {
  onClose: () => void;
  openModal?: (name: string, props?: any) => void;
}

export default function WorkCheckInModal({ onClose, openModal }: WorkCheckInModalProps) {
  const { state, updateState, user, awardXP, notify } = useHP();
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [selectedMood, setSelectedMood] = useState(state?.mood || 'calm');
  const [completingTask, setCompletingTask] = useState<any>(null);
  const [localProgress, setLocalProgress] = useState<Record<number, number>>({});

  if (!state) return null;

  const priorities = state.priorities || [];
  const doneCount = priorities.filter((p: any) => p.done).length;
  const totalCount = priorities.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const askAI = async () => {
    setIsLoading(true);
    try {
      const taskList = priorities.map((p: any) => `- ${p.title} (${p.done ? 'Selesai' : 'Belum'})`).join('\n');
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Ini daftar target kerja saya hari ini:\n${taskList}\n\nBantu saya:
1. Berikan feedback singkat (fun & supportive) tentang progress saya.
2. Kasih 1 saran spesifik supaya saya tetap fokus (deep work).
3. Jika saya merasa "belum kerja beneran", ingatkan saya apa yang sudah saya capai.
Jawab dengan tone yang asik dan menyemangati.`,
          systemPrompt: "You are Flow, a fun and supportive productivity coach. IMPORTANT: You MUST ALWAYS communicate in Indonesian (Bahasa Indonesia) regardless of the user's language."
        })
      });
      const data = await res.json();
      if (data.text) setAiResponse(data.text);
    } catch (e) {
      console.error(e);
      setAiResponse("Koneksiku agak terputus, tapi kamu tetap hebat! Terus lanjut ya! 🌿");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTask = (id: number) => {
    const priority = state?.priorities?.find((p: any) => p.id === id);
    if (!priority) return;

    if (!priority.done) {
      setCompletingTask(priority);
    } else {
      updateState((s: any) => {
        const newPriorities = s.priorities.map((p: any) => p.id === id ? { ...p, done: false } : p);
        
        // Recalculate goal progress for linked goals
        const task = s.priorities.find((p: any) => p.id === id);
        const targetId = task?.goal_id || task?.kpi_id;
        const updatedGoals = s.goals.map((goal: any) => {
          if (targetId && String(goal.id) === String(targetId)) {
            const tasksForGoal = newPriorities.filter((p: any) => (p.goal_id && String(p.goal_id) === String(goal.id)) || (p.kpi_id && String(p.kpi_id) === String(goal.id)));
            const doneCount = tasksForGoal.filter((p: any) => p.done).length;
            const newProgress = tasksForGoal.length > 0 ? Math.round((doneCount / tasksForGoal.length) * 100) : goal.progress;
            const newMetric = doneCount + "/" + tasksForGoal.length + " task selesai";
            return { ...goal, progress: newProgress, metric: newMetric };
          }
          return goal;
        });

        return {
          ...s,
          priorities: newPriorities,
          goals: updatedGoals
        };
      });
    }
  };

  const confirmTaskComplete = React.useCallback((data: {
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

      if (s.syncSkillProgress) s.syncSkillProgress(newPriorities[pIndex].title + " " + (newPriorities[pIndex].kpi_title || ""), 2);

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
  }, [completingTask, updateState, awardXP, user]);


  const updateTaskProgress = (taskId: number, val: number) => {
    updateState((s: any) => {
      const newPriorities = s.priorities.map((p: any) => p.id === taskId ? { ...p, progress: val } : p);
      const updatedTask = newPriorities.find((p: any) => p.id === taskId);
      
      let newGoals = s.goals;
      
      if (updatedTask?.goal_id && s.goals) {
        newGoals = s.goals.map((g: any) => {
          if (String(g.id) === String(updatedTask.goal_id)) {
            const tasksForGoal = newPriorities.filter((p: any) => p.goal_id && String(p.goal_id) === String(g.id));
            const totalProgress = tasksForGoal.reduce((sum: number, task: any) => 
              sum + (task.done ? 100 : (task.progress || 0)), 0
            );
            const doneCount = tasksForGoal.filter((p: any) => p.done).length;
            const newProgress = Math.round(totalProgress / tasksForGoal.length);
            
            return { 
              ...g, 
              progress: newProgress, 
              metric: `${doneCount}/${tasksForGoal.length} task selesai (${newProgress}%)` 
            };
          }
          return g;
        });
      } 

      return {
        ...s,
        priorities: newPriorities,
        goals: newGoals
      };
    });
  };

  const saveRealisasi = async () => {
    const undoneTasks = priorities.filter((p: any) => !p.done);
    const avgProgress = undoneTasks.length > 0 
      ? Math.round(undoneTasks.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / undoneTasks.length) 
      : 100;

    try {
      await fetch('/api/logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          type: 'realization_check',
          title: "Mid-Day Check-In",
          content: notes,
          points: 0,
          metadata: { 
            progress: avgProgress
          }
        })
      });
    } catch (e) {
      console.error("Failed to save logbook entry", e);
    }

    awardXP('realization_check', 'Mid-Day Check-in');

    const log = {
      id: Date.now(),
      type: 'realization_check',
      title: "Mid-Day Check-In",
      progress: avgProgress,
      notes: notes,
      date: new Date().toLocaleDateString('id-ID'),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      metadata_json: JSON.stringify({ progress: avgProgress })
    };

    updateState((s: any) => ({
      ...s,
      mood: selectedMood,
      moods: [...(s.moods || []), { time: new Date().toISOString(), mood: selectedMood }],
      logbook: [log, ...(s.logbook || [])],
      lastMidDayCheckIn: new Date().toISOString().split('T')[0]
    }));
    
    setShowNotes(false);
    setNotes("");
    notify("Mid-Day Check-in", "Update siang ini & Mood berhasil disimpan! ✨", "success");
    onClose();
  };

  const getMoodColor = (mood: string) => {
    if (mood === 'joy') return HP_TOKENS.sage;
    if (mood === 'calm') return HP_TOKENS.blue;
    if (mood === 'tired') return HP_TOKENS.coral;
    if (mood === 'stress') return HP_TOKENS.yellow;
    return HP_TOKENS.lineSoft;
  };

  const getMoodEmoji = (mood: string) => {
    if (mood === 'joy') return '😊';
    if (mood === 'calm') return '😌';
    if (mood === 'tired') return '😩';
    if (mood === 'stress') return '🤯';
    return '😐';
  };

  const getMoodLabel = (mood: string) => {
    if (mood === 'joy') return 'Semangat';
    if (mood === 'calm') return 'Tenang';
    if (mood === 'tired') return 'Lelah';
    if (mood === 'stress') return 'Kewalahan';
    return '';
  };

  return (
    <Modal onClose={onClose} title="Mid-Day Check-In 🍯">
      <div style={{ marginBottom: 24, padding: '24px 20px', background: `linear-gradient(135deg, ${HP_TOKENS.sageWash} 0%, ${HP_TOKENS.card} 100%)`, borderRadius: 24, border: `1px solid ${HP_TOKENS.sage}30`, boxShadow: '0 8px 32px rgba(26,29,35,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>OVERALL PROGRESS</div>
            <div style={{ ...HP_TEXT.h, fontSize: 24 }}>{Math.round(progress)}% <span style={{ fontSize: 14, color: HP_TOKENS.inkFade, fontWeight: 600 }}>Tercapai</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...HP_TEXT.h, fontSize: 18, color: HP_TOKENS.sage }}>{doneCount}/{totalCount}</div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>Target Selesai</div>
          </div>
        </div>
        <div style={{ height: 12, background: HP_TOKENS.lineSoft, borderRadius: 6, overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(26,29,35,0.02)' }}>
          <div style={{ 
            width: `${progress}%`, height: '100%', 
            background: `linear-gradient(to right, ${HP_TOKENS.sage}, #4ADE80)`,
            transition: '1.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
            boxShadow: `0 0 12px ${HP_TOKENS.sage}40`
          }} />
        </div>
      </div>




      <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 900, fontSize: 10, letterSpacing: 1, marginBottom: 12 }}>DAFTAR TARGET HARI INI</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {priorities.map((p: any) => (
          <HPCard key={p.id} padding={14} style={{ 
            background: p.done ? `${HP_TOKENS.sageWash}40` : HP_TOKENS.card,
            border: `1.5px solid ${p.done ? HP_TOKENS.sage : HP_TOKENS.line}`,
            opacity: p.done ? 0.7 : 1,
            transition: '0.2s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button 
                onClick={() => toggleTask(p.id)}
                style={{
                  width: 24, height: 24, borderRadius: 8,
                  background: p.done ? HP_TOKENS.sage : 'transparent',
                  border: `2px solid ${p.done ? HP_TOKENS.sage : HP_TOKENS.line}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: '0.2s'
                }}
              >
                {p.done && <HPGlyph name="check" size={14} color="#F4F7F9" stroke={4}/>}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  ...HP_TEXT.body, fontSize: 14, fontWeight: 700, 
                  textDecoration: p.done ? 'line-through' : 'none',
                  color: p.done ? HP_TOKENS.inkFade : HP_TOKENS.ink
                }}>
                  {p.title}
                </div>
                {(() => {
                  const goalId = p.goal_id || p.kpi_id;
                  const fallbackTitle = p.kpi_title || p.goal;
                  if (!goalId && !fallbackTitle) return null;
                  const goal = state?.goals?.find((g: any) => String(g.id) === String(goalId));
                  const displayGoal = goal ? goal.title : fallbackTitle;
                  const parent = goal?.parent_id ? state?.goals?.find((g: any) => String(g.id) === String(goal.parent_id)) : null;
                  const displayTag = parent ? `${displayGoal} (Aligned to: ${parent.title})` : displayGoal;
                  return (
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2, fontWeight: 600 }}>
                      Linked to: <span style={{ color: HP_TOKENS.blue }}>{displayTag}</span>
                    </div>
                  );
                })()}
                {!p.done && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>Progres:</div>
                      <div style={{ ...HP_TEXT.small, fontWeight: 800, color: HP_TOKENS.yellow }}>
                        {localProgress[p.id] !== undefined ? localProgress[p.id] : (p.progress || 0)}%
                      </div>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={localProgress[p.id] !== undefined ? localProgress[p.id] : (p.progress || 0)} 
                      onChange={(e) => setLocalProgress(prev => ({ ...prev, [p.id]: parseInt(e.target.value) }))}
                      onMouseUp={(e) => updateTaskProgress(p.id, parseInt((e.target as HTMLInputElement).value))}
                      onTouchEnd={(e) => updateTaskProgress(p.id, parseInt((e.target as HTMLInputElement).value))}
                      style={{ 
                        width: '100%', 
                        height: 6,
                        borderRadius: 3,
                        accentColor: HP_TOKENS.yellow,
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </HPCard>
        ))}
        {totalCount === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 20px', color: HP_TOKENS.inkMute, background: HP_TOKENS.card, borderRadius: 16, border: `1.5px dashed ${HP_TOKENS.line}` }}>
            <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 500 }}>Belum ada target untuk hari ini.</div>
            <button 
              onClick={() => {
                onClose();
                openModal?.('manage_priorities');
              }}
              className="hp-tap"
              style={{
                padding: '12px 24px', borderRadius: 99,
                background: 'var(--hp-primary)', color: '#fff',
                border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13,
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,107,53,0.3)'
              }}
            >
              + Tambah Task
            </button>
          </div>
        )}
      </div>

      <div style={{ background: HP_TOKENS.card, padding: 16, borderRadius: 16, border: `1px solid ${HP_TOKENS.line}`, marginBottom: 24 }}>
        <div style={{ ...HP_TEXT.small, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <HPGlyph name="book" size={14} color={HP_TOKENS.ink} />
          Catatan Mid-Day Jurnal
        </div>
        
        <textarea 
          placeholder="Ceritakan progres siang ini secara umum... Apa saja yang sudah dikerjakan? Ada kendala apa?"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${HP_TOKENS.lineSoft}`,
            fontFamily: HP_FONT, fontSize: 13, minHeight: 100, boxSizing: 'border-box',
            background: HP_TOKENS.card, outline: 'none', transition: '0.2s',
            lineHeight: 1.5, resize: 'vertical'
          }}
        />

        <div style={{ marginTop: 12 }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 8 }}>MOOD SIANG INI:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['joy', 'calm', 'tired', 'stress'].map(m => (
              <button key={m} onClick={() => setSelectedMood(m)} style={{
                flex: 1, padding: '8px 0', borderRadius: 12,
                background: selectedMood === m ? `${getMoodColor(m)}20` : HP_TOKENS.paper,
                border: selectedMood === m ? `1.5px solid ${getMoodColor(m)}` : `1.5px solid ${HP_TOKENS.lineSoft}`,
                cursor: 'pointer', transition: '0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}>
                <span style={{ fontSize: 24 }}>{getMoodEmoji(m)}</span>
                <span style={{ ...HP_TEXT.tiny, fontWeight: 700, color: selectedMood === m ? getMoodColor(m) : HP_TOKENS.inkMute }}>
                  {getMoodLabel(m)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={saveRealisasi}
          disabled={!notes.trim()}
          className="hp-tap"
          style={{ 
            marginTop: 16, width: '100%', padding: '14px', borderRadius: 12,
            background: notes.trim() ? HP_TOKENS.ink : HP_TOKENS.line, 
            color: notes.trim() ? HP_TOKENS.yellow : HP_TOKENS.inkFade, 
            border: 'none',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: notes.trim() ? 'pointer' : 'default',
            boxShadow: notes.trim() ? '0 4px 12px rgba(26,29,35,0.1)' : 'none'
          }}
        >
          Simpan Progres & Catatan
        </button>
      </div>

      <button 
        onClick={onClose}
        style={{
          width: '100%', marginTop: 12, padding: '14px', borderRadius: 99,
          background: 'transparent', color: HP_TOKENS.inkMute, border: 'none',
          fontFamily: HP_FONT, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}
      >
        Lanjut kerja dulu
      </button>

      {completingTask && (
        <TaskCompleteModal 
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onConfirm={confirmTaskComplete}
        />
      )}
    </Modal>
  );
}
