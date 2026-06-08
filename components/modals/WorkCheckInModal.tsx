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

interface WorkCheckInModalProps {
  onClose: () => void;
}

export default function WorkCheckInModal({ onClose }: WorkCheckInModalProps) {
  const { state, updateState, user, awardXP } = useHP();
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [selectedMood, setSelectedMood] = useState(state?.mood || 'neutral');

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
    updateState((s: any) => {
      const newPriorities = s.priorities.map((p: any) => p.id === id ? { ...p, done: !p.done } : p);
      
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
  };

  const updateFocusProgress = (val: number) => {
    updateState((s: any) => {
      const newPriorities = s.priorities.map((p: any) => p.id === s.focusTaskId ? { ...p, progress: val } : p);
      const updatedTask = s.focusTaskId ? newPriorities.find((p: any) => p.id === s.focusTaskId) : null;
      
      let newGoals = s.goals;
      
      // Case 1: Linked via specific Task ID
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
      // Case 2: Fallback - Match by intention title directly to a Goal (if no task linked)
      else if (!s.focusTaskId && s.intention && s.goals) {
        newGoals = s.goals.map((g: any) => {
          if (g.title === s.intention) {
            return { ...g, progress: val, metric: `Realisasi Fokus (${val}%)` };
          }
          return g;
        });
      }

      return {
        ...s,
        focusProgress: val,
        priorities: newPriorities,
        goals: newGoals
      };
    });
  };

  const saveRealisasi = async () => {
    if (!state.focusTaskId) return;
    const task = priorities.find((p: any) => p.id === state.focusTaskId);
    
    // Save to Logbook DB
    try {
      await fetch('/api/logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          type: 'realization_check',
          title: task?.title || "Focus Task",
          content: notes,
          points: 0,
          metadata: { 
            progress: state.focusProgress,
            proof_link: task?.proof_link,
            metric_value: task?.metric_value
          }
        })
      });
    } catch (e) {
      console.error("Failed to save logbook entry", e);
    }

    awardXP('realization_check', 'Mid-Day Check-in Focus');

    // Still update local state for immediate UI feedback if needed
    const log = {
      id: Date.now(),
      type: 'realization_check',
      title: task?.title || "Focus Task",
      progress: state.focusProgress,
      notes: notes,
      date: new Date().toLocaleDateString('id-ID'),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      metadata_json: JSON.stringify({ progress: state.focusProgress })
    };
    updateState((s: any) => ({
      ...s,
      mood: selectedMood,
      moods: [...(s.moods || []), { time: new Date().toISOString(), mood: selectedMood }],
      logbook: [log, ...(s.logbook || [])]
    }));
    
    setShowNotes(false);
    setNotes("");
    alert("Realisasi & Mood berhasil disimpan! ✨");
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

      {(state.focusTaskId || state.intention) ? (
        <HPCard padding={20} style={{ 
          marginBottom: 24, 
          background: `linear-gradient(135deg, ${HP_TOKENS.yellowWash} 0%, ${HP_TOKENS.card} 100%)`, 
          border: `1.5px solid ${HP_TOKENS.yellow}`,
          boxShadow: '0 8px 24px rgba(253,185,19,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: HP_TOKENS.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HPGlyph name="sparkle" size={18} color={HP_TOKENS.ink} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.ink, fontWeight: 900, letterSpacing: 0.5 }}>TARGET FOKUS SAAT INI</div>
              <div style={{ ...HP_TEXT.h, fontSize: 16, color: HP_TOKENS.ink }}>
                {state.focusTaskId 
                  ? priorities.find((p: any) => p.id === state.focusTaskId)?.title 
                  : state.intention}
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
              <div style={{ ...HP_TEXT.small, fontWeight: 800, color: HP_TOKENS.ink }}>Realisasi: <span style={{ color: HP_TOKENS.yellow, fontSize: 18 }}>{state.focusProgress || 0}%</span></div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>Geser untuk update</div>
            </div>
            <input 
              type="range" min="0" max="100" 
              value={state.focusProgress || 0} 
              onChange={(e) => updateFocusProgress(parseInt(e.target.value))}
              style={{ 
                width: '100%', 
                height: 8,
                borderRadius: 4,
                accentColor: HP_TOKENS.yellow,
                cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ background: HP_TOKENS.paper, padding: 16, borderRadius: 16, border: `1px solid ${HP_TOKENS.line}` }}>
            <div style={{ ...HP_TEXT.small, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HPGlyph name="book" size={14} color={HP_TOKENS.ink} />
              Catatan Progres (Realisasi)
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <input 
                type="text"
                placeholder="Link Bukti Kerja (Figma/Docs/dll) - Opsional"
                value={state.focusTaskId ? priorities.find((p: any) => p.id === state.focusTaskId)?.proof_link || "" : ""}
                onChange={e => updateState((s: any) => ({
                  ...s, priorities: s.priorities.map((p: any) => p.id === s.focusTaskId ? { ...p, proof_link: e.target.value } : p)
                }))}
                style={{
                  flex: 2, padding: '12px', borderRadius: 12, border: `1px solid ${HP_TOKENS.lineSoft}`,
                  fontFamily: HP_FONT, fontSize: 13, boxSizing: 'border-box', outline: 'none',
                  background: 'transparent', color: HP_TOKENS.ink
                }}
              />
              <input 
                type="number"
                placeholder="Nilai Metrik (Rp / Qty) - Opsional"
                value={state.focusTaskId ? priorities.find((p: any) => p.id === state.focusTaskId)?.metric_value || "" : ""}
                onChange={e => updateState((s: any) => ({
                  ...s, priorities: s.priorities.map((p: any) => p.id === s.focusTaskId ? { ...p, metric_value: e.target.value } : p)
                }))}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${HP_TOKENS.lineSoft}`,
                  fontFamily: HP_FONT, fontSize: 13, boxSizing: 'border-box', outline: 'none',
                  background: 'transparent', color: HP_TOKENS.ink
                }}
              />
            </div>

            <textarea 
              placeholder="Ceritakan progresmu... Kenapa baru segini? Apa yang sudah selesai? Ada kendala apa? (misal: Nunggu feedback tim, butuh riset lebih dalam)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${HP_TOKENS.lineSoft}`,
                fontFamily: HP_FONT, fontSize: 13, minHeight: 80, boxSizing: 'border-box',
                background: 'transparent', color: HP_TOKENS.ink, outline: 'none', transition: '0.2s',
                lineHeight: 1.5
              }}
            />

            <div style={{ marginTop: 12 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 8 }}>MOOD SIANG INI:</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['joy', 'calm', 'tired', 'stress'].map(m => (
                  <button key={m} onClick={() => setSelectedMood(m)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 12,
                    background: selectedMood === m ? `${getMoodColor(m)}20` : HP_TOKENS.card,
                    border: selectedMood === m ? `1.5px solid ${getMoodColor(m)}` : `1.5px solid ${HP_TOKENS.lineSoft}`,
                    fontSize: 20, cursor: 'pointer', transition: '0.2s'
                  }}>
                    {getMoodEmoji(m)}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={saveRealisasi}
              disabled={!notes.trim()}
              className="hp-tap"
              style={{ 
                marginTop: 12, width: '100%', padding: '14px', borderRadius: 12,
                background: notes.trim() ? HP_TOKENS.ink : HP_TOKENS.line, 
                color: notes.trim() ? HP_TOKENS.yellow : HP_TOKENS.inkFade, 
                border: 'none',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: notes.trim() ? 'pointer' : 'default',
                boxShadow: notes.trim() ? '0 4px 12px rgba(26,29,35,0.1)' : 'none'
              }}
            >
              Simpan ke Logbook Activity
            </button>
          </div>
        </HPCard>
      ) : (
        <HPCard padding={20} style={{ marginBottom: 24, textAlign: 'center', background: HP_TOKENS.paper, border: `1.5px dashed ${HP_TOKENS.line}` }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
          <div style={{ ...HP_TEXT.h, fontSize: 15, color: HP_TOKENS.ink }}>Belum ada Task yang di-Set sebagai Fokus.</div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4 }}>Klik ikon ✨ pada daftar target di bawah untuk mulai fokus.</div>
        </HPCard>
      )}

      <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 900, fontSize: 10, letterSpacing: 1, marginBottom: 12 }}>DAFTAR TARGET HARI INI</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {priorities.map((p: any) => (
          <HPCard key={p.id} padding={14} style={{ 
            background: p.done ? `${HP_TOKENS.sageWash}40` : '#fff',
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
              </div>
            </div>
          </HPCard>
        ))}
        {totalCount === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: HP_TOKENS.inkMute }}>
            Belum ada target untuk hari ini.
          </div>
        )}
      </div>

      {!aiResponse ? (
        <button 
          onClick={askAI}
          disabled={isLoading}
          className="hp-tap"
          style={{
            width: '100%', padding: '16px', borderRadius: 20,
            background: HP_TOKENS.blue, color: '#F4F7F9', border: 'none',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: `0 8px 24px ${HP_TOKENS.blueSoft}`,
          }}
        >
          {isLoading ? (
            "Meminta saran Flow..."
          ) : (
            <>
              <HPGlyph name="sparkle" size={18} color="#F4F7F9" />
              Bantu Aku Fokus (AI)
            </>
          )}
        </button>
      ) : (
        <HPCard padding={16} style={{ background: HP_TOKENS.blueWash, border: 'none', position: 'relative' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: HP_TOKENS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HPGlyph name="sparkle" size={16} color="#F4F7F9" />
            </div>
            <div style={{ ...HP_TEXT.body, fontSize: 13, lineHeight: 1.5, color: HP_TOKENS.ink }}>
              {aiResponse}
            </div>
          </div>
          <button 
            onClick={() => setAiResponse(null)}
            style={{ 
              marginTop: 12, width: '100%', padding: '8px', borderRadius: 10, 
              border: `1px solid ${HP_TOKENS.blue}`, background: 'transparent',
              color: HP_TOKENS.blue, fontFamily: HP_FONT, fontWeight: 800, fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Tanya lagi
          </button>
        </HPCard>
      )}
      
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
    </Modal>
  );
}
