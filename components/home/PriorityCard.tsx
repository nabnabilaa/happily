"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface PriorityCardProps {
  p: any;
  onToggle: () => void;
  openModal?: (name: string, props?: any) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export default function PriorityCard({ p, onToggle, openModal, onDelete, onEdit }: PriorityCardProps) {
  const { state, updateState } = useHP();
  const [showPoints, setShowPoints] = useState(false);
  const [showFocusToast, setShowFocusToast] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [editingBukti, setEditingBukti] = useState(false);
  const [editProofLinks, setEditProofLinks] = useState<string[]>(['']);
  const [editNotes, setEditNotes] = useState('');
  const [savingBukti, setSavingBukti] = useState(false);

  const handleEditBukti = () => {
    setEditProofLinks(p.proof_links?.length ? [...p.proof_links] : ['']);
    setEditNotes(p.completion_notes || p.proof_notes || '');
    setEditingBukti(true);
  };

  const handleSaveBukti = async () => {
    setSavingBukti(true);
    const cleanLinks = editProofLinks.filter(l => l.trim().length > 0);
    try {
      await fetch('/api/priorities/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: p.id, done: true, partialProgress: 100, status: 'accepted',
          proofLinks: cleanLinks, notes: editNotes || undefined,
          completedAt: p.completed_at || new Date().toISOString(),
        }),
      });
      updateState((s: any) => {
        const idx = s.priorities.findIndex((t: any) => String(t.id) === String(p.id));
        if (idx === -1) return s;
        const newP = [...s.priorities];
        newP[idx] = { ...newP[idx], proof_links: cleanLinks, completion_notes: editNotes || null };
        return { ...s, priorities: newP };
      });
      setEditingBukti(false);
    } catch (e) {
      console.error('Gagal menyimpan bukti:', e);
    } finally {
      setSavingBukti(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const executeDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
    setShowDeleteModal(false);
  };

  // Show "+X Point" popup only when task actually transitions from not-done to done
  const prevDoneRef = React.useRef(p.done);
  React.useEffect(() => {
    if (!prevDoneRef.current && p.done) {
      setShowPoints(true);
      setTimeout(() => setShowPoints(false), 1200);
    }
    prevDoneRef.current = p.done;
  }, [p.done]);

  React.useEffect(() => {
    if (!p.timer_started_at) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      const startTime = new Date(p.timer_started_at).getTime();
      const diffSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsed(diffSeconds);
    }, 1000);

    // Initial run
    const startTime = new Date(p.timer_started_at).getTime();
    setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));

    return () => clearInterval(interval);
  }, [p.timer_started_at]);

  const toneMap: Record<string, any> = {
    sage: { bg: HP_TOKENS.yellowSoft, fg: HP_TOKENS.ink, wash: HP_TOKENS.yellowWash },
    blue: { bg: HP_TOKENS.blueSoft, fg: HP_TOKENS.blue, wash: HP_TOKENS.blueWash },
    lavender: { bg: HP_TOKENS.lavenderSoft, fg: '#6B5F8E', wash: HP_TOKENS.lavenderSoft },
  };
  
  const t = toneMap[p.tone] || toneMap.sage;
  const energyIcon = p.energy === 'high' ? 'zap' : p.energy === 'mid' ? 'activity' : 'sparkle';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (p.done) {
      // Task sudah selesai — tampilkan hasil kerja
      setEditingBukti(false);
      setShowResults(true);
      return;
    }

    // Task belum done (partial atau fresh) — buka completion modal
    let updatedPriorities = (state?.priorities || []).map((item: any) => {
      if (item.id === p.id && item.timer_started_at) {
        const startTime = new Date(item.timer_started_at).getTime();
        const sessionSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        return { ...item, time_tracked: (item.time_tracked || 0) + sessionSeconds, timer_started_at: null };
      }
      return item;
    });
    updateState({ priorities: updatedPriorities });
    onToggle();
  };

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!state) return;
    
    const updatedPriorities = state.priorities.map((item: any) => {
      if (item.id === p.id) {
        if (item.timer_started_at) {
          // Pause timer
          const startTime = new Date(item.timer_started_at).getTime();
          const sessionSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          return {
            ...item,
            time_tracked: (item.time_tracked || 0) + sessionSeconds,
            timer_started_at: null
          };
        } else {
          // Start timer
          return {
            ...item,
            timer_started_at: new Date().toISOString()
          };
        }
      } else {
        return item;
      }
    });

    updateState({ priorities: updatedPriorities });
  };

  const formatTrackedTime = (seconds: number, timerStartedAt?: string) => {
    const totalSeconds = seconds + (timerStartedAt ? elapsed : 0);
    if (totalSeconds <= 0) return "0d";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h}j`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}d`);
    return parts.join(" ");
  };

  const setAsFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateState({ intention: p.title, focusTaskId: p.id, focusProgress: p.progress || 0 });
    setShowFocusToast(true);
    setTimeout(() => setShowFocusToast(false), 2000);

    // Sync with Chrome Extension
    if (typeof window !== "undefined") {
      window.postMessage({
        type: "FLOWBEE_SET_FOCUS",
        goal: p.title,
        progress: p.progress || 0
      }, "*");
    }
  };
  
  return (
    <div style={{
      position: 'relative',
      display: 'flex', 
      alignItems: 'center', 
      flexWrap: 'wrap',
      gap: '12px 16px', 
      padding: '18px',
      background: p.done ? HP_TOKENS.card : '#fff',
      border: `1.5px solid ${state?.focusTaskId === p.id ? HP_TOKENS.yellow : (p.done ? HP_TOKENS.line : HP_TOKENS.line)}`,
      borderRadius: 20, 
      boxShadow: state?.focusTaskId === p.id ? `0 8px 24px ${HP_TOKENS.yellow}20` : (p.done ? 'none' : '0 4px 12px rgba(26,29,35,0.02)'),
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Floating +30 Poin */}
      {showPoints && (
        <div style={{
          position: 'absolute', top: -10, right: 20,
          background: HP_TOKENS.ink, color: HP_TOKENS.yellow,
          fontSize: 10, fontWeight: 900, fontFamily: HP_FONT,
          padding: '4px 10px', borderRadius: 10,
          animation: 'hpRise 1.2s ease-out forwards',
          pointerEvents: 'none', zIndex: 10,
          boxShadow: '0 4px 12px rgba(26,29,35,0.1)'
        }}>
          +{p.points || 30} Point
        </div>
      )}

      {/* Focus Toast */}
      {showFocusToast && (
        <div style={{
          position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
          background: HP_TOKENS.yellow, color: HP_TOKENS.ink,
          fontSize: 11, fontWeight: 800, fontFamily: HP_FONT,
          padding: '6px 12px', borderRadius: 10,
          animation: 'hpRise 0.3s ease-out',
          zIndex: 20, boxShadow: '0 4px 12px rgba(26,29,35,0.1)',
          whiteSpace: 'nowrap'
        }}>
          🎯 Jadi Fokus Utama!
        </div>
      )}

      <button 
        onClick={handleToggle} 
        className="hp-tap" 
        style={{
          width: 28, 
          height: 28, 
          borderRadius: 10, 
          border: `2.5px solid ${p.done ? t.bg : HP_TOKENS.line}`,
          background: p.done ? t.bg : 'transparent', 
          cursor: 'pointer', 
          flexShrink: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: 0,
          transition: '0.2s'
        }}
      >
        {p.done && <HPGlyph name="check" size={16} color={t.fg} stroke={4}/>}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          ...HP_TEXT.h,
          fontSize: 15,
          color: HP_TOKENS.ink,
          lineHeight: 1.4,
          fontWeight: 700
        }}>
          {p.title}
        </div>
        
        {p.description && (
          <div style={{
            ...HP_TEXT.small,
            color: HP_TOKENS.inkMute,
            fontSize: 12,
            marginTop: 4,
            lineHeight: 1.4
          }}>
            {p.description}
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
           {/* KPI Tag */}
           {(() => {
             const goalId = p.goal_id || p.kpi_id;
             const fallbackTitle = p.kpi_title || p.goal;
             if (!goalId && !fallbackTitle) return null;
             const goal = state?.goals?.find((g: any) => String(g.id) === String(goalId));
             if (!goal) {
               return (
                 <div style={{ 
                   display: 'flex', alignItems: 'center', gap: 4, 
                   background: p.done ? HP_TOKENS.lineSoft : `${HP_TOKENS.blueWash}80`, 
                   padding: '2px 8px', borderRadius: 6 
                 }}>
                   <span style={{ fontSize: 10 }}>🎯</span>
                   <span style={{ 
                     ...HP_TEXT.tiny, 
                     color: p.done ? HP_TOKENS.inkMute : HP_TOKENS.blue, 
                     fontWeight: 800,
                     fontSize: 10
                   }}>
                     {fallbackTitle || 'KPI'}
                   </span>
                 </div>
               );
             }
             const parent = goal.parent_id ? state?.goals?.find((g: any) => String(g.id) === String(goal.parent_id)) : null;
             const displayTag = parent ? `${goal.title} (Aligned to: ${parent.title})` : goal.title;
             return (
               <div style={{ 
                 display: 'flex', alignItems: 'center', gap: 4, 
                 background: p.done ? HP_TOKENS.lineSoft : `${HP_TOKENS.blueWash}80`, 
                 padding: '2px 8px', borderRadius: 6 
               }}>
                 <span style={{ fontSize: 10 }}>🎯</span>
                 <span style={{ 
                   ...HP_TEXT.tiny, 
                   color: p.done ? HP_TOKENS.inkMute : HP_TOKENS.blue, 
                   fontWeight: 800,
                   fontSize: 10
                 }}>
                   {displayTag}
                 </span>
               </div>
             );
           })()}

           {/* Status badge */}
           {p.status === 'pending_review' && (
             <div style={{
               display: 'flex', alignItems: 'center', gap: 4,
               background: HP_TOKENS.yellowSoft, padding: '2px 8px', borderRadius: 6,
             }}>
               <span style={{ fontSize: 10 }}>⏳</span>
               <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.yellow, fontWeight: 800, fontSize: 10 }}>Menunggu Review</span>
             </div>
           )}
           {p.status === 'revision' && (
             <div style={{
               display: 'flex', alignItems: 'center', gap: 4,
               background: HP_TOKENS.coralSoft, padding: '2px 8px', borderRadius: 6,
             }}>
               <span style={{ fontSize: 10 }}>✍️</span>
               <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.coral, fontWeight: 800, fontSize: 10 }}>Revisi</span>
             </div>
           )}
           {p.status === 'rejected' && (
             <div style={{
               display: 'flex', alignItems: 'center', gap: 4,
               background: HP_TOKENS.coralSoft, padding: '2px 8px', borderRadius: 6,
             }}>
               <span style={{ fontSize: 10 }}>❌</span>
               <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.coral, fontWeight: 800, fontSize: 10 }}>Ditolak</span>
             </div>
           )}
           
           {/* Proof links badge */}
           {p.proof_links && p.proof_links.length > 0 && (
             <div style={{
               display: 'flex', alignItems: 'center', gap: 3,
               background: HP_TOKENS.sageSoft, padding: '2px 6px', borderRadius: 6,
             }}>
               <span style={{ fontSize: 9 }}>📎</span>
               <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 800, fontSize: 9 }}>
                 {p.proof_links.length}
               </span>
             </div>
           )}

           {/* Project badge */}
           {p.is_project && (
             <div style={{
               display: 'flex', alignItems: 'center', gap: 3,
               background: HP_TOKENS.lavenderSoft, padding: '2px 6px', borderRadius: 6,
             }}>
               <span style={{ fontSize: 9 }}>📁</span>
               <span style={{ ...HP_TEXT.tiny, color: '#6B5F8E', fontWeight: 800, fontSize: 9 }}>Project</span>
             </div>
           )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
             
             {p.targetDate && (
               <>
                 <span style={{ color: HP_TOKENS.line, fontSize: 10 }}>•</span>
                 <HPGlyph name="calendar" size={11} color={HP_TOKENS.inkMute} />
                 <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>
                   {p.targetDate}
                 </span>
               </>
             )}

             {/* Timesheet Tracked Badge */}
             {(p.time_tracked > 0 || p.timer_started_at) && (
               <>
                 <span style={{ color: HP_TOKENS.line, fontSize: 10 }}>•</span>
                 <span style={{ fontSize: 11, cursor: 'default' }}>⏱️</span>
                 <span style={{ 
                   ...HP_TEXT.tiny, 
                   color: p.timer_started_at ? HP_TOKENS.sage : HP_TOKENS.inkMute, 
                   fontWeight: 800,
                   background: p.timer_started_at ? `${HP_TOKENS.sageSoft}50` : 'transparent',
                   padding: p.timer_started_at ? '2px 6px' : '0',
                   borderRadius: 6,
                   animation: p.timer_started_at ? 'hpPulse 1.5s infinite' : 'none'
                 }}>
                   {p.timer_started_at ? 'Sedang kerja: ' : 'Durasi: '}
                   {formatTrackedTime(p.time_tracked || 0, p.timer_started_at)}
                 </span>
               </>
             )}
          </div>
          
          {/* Partial progress badge */}
          {!p.done && (p.partial_progress || 0) > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3,
              background: HP_TOKENS.blueWash, padding: '2px 8px', borderRadius: 6,
            }}>
              <span style={{ fontSize: 9 }}>📊</span>
              <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 800, fontSize: 9 }}>
                {p.partial_progress}% progress
              </span>
            </div>
          )}

          {/* Progress Bar — partial_progress (for in-progress tasks) or focus progress */}
          {(!p.done && (p.partial_progress || 0) > 0) || state?.focusTaskId === p.id ? (
            <div style={{ width: '100%', height: 4, background: HP_TOKENS.lineSoft, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${state?.focusTaskId === p.id ? (state?.focusProgress || 0) : (p.partial_progress || p.progress || 0)}%`,
                height: '100%',
                background: state?.focusTaskId === p.id ? HP_TOKENS.yellow : HP_TOKENS.blue,
                borderRadius: 2,
                transition: '0.3s ease'
              }} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="hp-priority-actions">
        {!p.done && (
          <>
             <button 
              onClick={toggleTimer}
              className="hp-tap"
              title={p.timer_started_at ? "Jeda Pekerjaan" : "Mulai Pekerjaan"}
              style={{ 
                width: 32, height: 32, borderRadius: 16, 
                background: p.timer_started_at ? HP_TOKENS.sageSoft : HP_TOKENS.lineSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none',
                cursor: 'pointer',
                boxShadow: p.timer_started_at ? `0 0 8px ${HP_TOKENS.sage}50` : 'none',
              }}
            >
               {p.timer_started_at ? (
                 <span style={{ fontSize: 11, animation: 'hpPulse 1s infinite' }}>⏸️</span>
               ) : (
                 <span style={{ fontSize: 11 }}>▶️</span>
               )}
            </button>

            <button 
              onClick={setAsFocus}
              className="hp-tap"
              title="Set as Focus Today"
              style={{ 
                width: 32, height: 32, borderRadius: 16, background: HP_TOKENS.yellowSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none',
                cursor: 'pointer'
              }}
            >
               <HPGlyph name="sparkle" size={14} color={HP_TOKENS.yellow} />
            </button>
          </>
        )}
        
        {(onEdit && (!p.done || p.status === 'revision' || p.status === 'rejected')) && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="hp-tap"
            title="Edit Task"
            style={{ 
              width: 32, height: 32, borderRadius: 16, background: HP_TOKENS.blueWash,
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none',
              cursor: 'pointer'
            }}
          >
            <HPGlyph name="edit" size={14} color={HP_TOKENS.blue} />
          </button>
        )}

        <button 
          onClick={handleDelete}
          className="hp-tap"
          title="Hapus Task"
          style={{ 
            width: 32, height: 32, borderRadius: 16, background: HP_TOKENS.coralSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none',
            cursor: 'pointer'
          }}
        >
          <HPGlyph name="trash" size={14} color={HP_TOKENS.coral} />
        </button>

      </div>

      {/* Hasil Kerja — muncul saat click task yang sudah selesai */}
      {showResults && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, backdropFilter: 'blur(4px)'
        }} onClick={(e) => { e.stopPropagation(); setShowResults(false); setEditingBukti(false); }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: 24,
            width: '100%', maxWidth: 400, maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22,
                background: editingBukti ? HP_TOKENS.blueWash : HP_TOKENS.sageWash,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <HPGlyph name={editingBukti ? 'edit' : 'check'} size={22} color={editingBukti ? HP_TOKENS.blue : HP_TOKENS.sage} stroke={3} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 15, color: HP_TOKENS.ink }}>
                  {editingBukti ? 'Edit Bukti Kerja' : 'Hasil Kerja'}
                </div>
                <div style={{ fontFamily: HP_FONT, fontSize: 12, color: HP_TOKENS.inkMute, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); if (editingBukti) { setEditingBukti(false); } else { setShowResults(false); } }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
              >
                <HPGlyph name="close" size={18} color={HP_TOKENS.inkMute} />
              </button>
            </div>

            {editingBukti ? (
              /* ─── Edit Mode ─── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ fontFamily: HP_FONT, fontSize: 10, fontWeight: 800, color: HP_TOKENS.inkMute, marginBottom: 8 }}>
                    📎 LINK HASIL KERJA
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {editProofLinks.map((link, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="url"
                          value={link}
                          onChange={e => {
                            const next = [...editProofLinks];
                            next[i] = e.target.value;
                            setEditProofLinks(next);
                          }}
                          placeholder={`Link hasil kerja ${editProofLinks.length > 1 ? `#${i+1}` : ''}...`}
                          style={{
                            flex: 1, padding: '10px 12px', borderRadius: 10,
                            border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT,
                            fontSize: 13, outline: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink,
                          }}
                        />
                        {editProofLinks.length > 1 && (
                          <button
                            onClick={() => setEditProofLinks(editProofLinks.filter((_, j) => j !== i))}
                            style={{ background: HP_TOKENS.coralSoft, border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            <HPGlyph name="close" size={12} color={HP_TOKENS.coral} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setEditProofLinks([...editProofLinks, ''])}
                      style={{ background: 'none', border: `1.5px dashed ${HP_TOKENS.line}`, borderRadius: 10, padding: '8px', cursor: 'pointer', fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.blue }}
                    >
                      + Tambah Link
                    </button>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: HP_FONT, fontSize: 10, fontWeight: 800, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                    📝 CATATAN
                  </div>
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Catatan singkat..."
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10, minHeight: 60,
                      border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT,
                      fontSize: 13, outline: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink,
                      resize: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingBukti(false); }}
                    style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1.5px solid ${HP_TOKENS.line}`, background: HP_TOKENS.card, fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: HP_TOKENS.inkMute }}
                  >
                    Batal
                  </button>
                  <button
                    disabled={savingBukti}
                    onClick={(e) => { e.stopPropagation(); handleSaveBukti(); }}
                    style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: HP_TOKENS.sage, color: '#fff', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: savingBukti ? 'default' : 'pointer', opacity: savingBukti ? 0.7 : 1 }}
                  >
                    {savingBukti ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            ) : (
              /* ─── View Mode ─── */
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {p.completed_at && (
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: HP_TOKENS.sageWash, border: `1px solid ${HP_TOKENS.sage}25`, fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.sage }}>
                      ✅ Selesai: {new Date(p.completed_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                  {p.metric_value != null && (
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: HP_TOKENS.blueWash, border: `1px solid ${HP_TOKENS.blueSoft}`, fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.blue }}>
                      📊 Pencapaian: {p.metric_value}
                    </div>
                  )}
                  {(p.completion_notes || p.proof_notes) && (
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: HP_TOKENS.paper, border: `1.5px solid ${HP_TOKENS.line}` }}>
                      <div style={{ fontFamily: HP_FONT, fontSize: 10, fontWeight: 800, color: HP_TOKENS.inkMute, marginBottom: 4 }}>📝 CATATAN</div>
                      <div style={{ fontFamily: HP_FONT, fontSize: 13, color: HP_TOKENS.ink }}>{p.completion_notes || p.proof_notes}</div>
                    </div>
                  )}
                  {((p.proof_links && p.proof_links.length > 0) || p.proof_link) && (
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: HP_TOKENS.paper, border: `1.5px solid ${HP_TOKENS.line}` }}>
                      <div style={{ fontFamily: HP_FONT, fontSize: 10, fontWeight: 800, color: HP_TOKENS.inkMute, marginBottom: 8 }}>📎 BUKTI KERJA</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(p.proof_links?.length > 0 ? p.proof_links : [p.proof_link]).filter(Boolean).map((link: string, i: number) => (
                          <a key={i} href={link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                            style={{ display: 'block', fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.blue, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            🔗 {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {!p.completed_at && !p.metric_value && !(p.proof_links?.length) && !p.proof_link && !p.completion_notes && !p.proof_notes && (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: HP_TOKENS.inkMute, fontFamily: HP_FONT, fontSize: 13 }}>
                      Tidak ada bukti kerja yang dilampirkan.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowResults(false); }}
                    style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1.5px solid ${HP_TOKENS.line}`, background: HP_TOKENS.card, fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: HP_TOKENS.inkMute }}
                  >
                    Tutup
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditBukti(); }}
                    style={{ flex: 1, padding: '12px', borderRadius: 14, border: 'none', background: HP_TOKENS.blueWash, color: HP_TOKENS.blue, fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowResults(false); setShowUndoConfirm(true); }}
                    style={{ flex: 1, padding: '12px', borderRadius: 14, border: 'none', background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral, fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
                  >
                    ↩ Reset
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Undo Confirmation — triggered from Reset button in results panel */}
      {showUndoConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, backdropFilter: 'blur(4px)'
        }} onClick={(e) => { e.stopPropagation(); setShowUndoConfirm(false); }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: 28,
            width: '100%', maxWidth: 380, textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: HP_TOKENS.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ fontSize: 26 }}>↩️</span>
            </div>
            <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 17, color: HP_TOKENS.ink, marginBottom: 8 }}>
              Reset Progress?
            </div>
            <div style={{ fontFamily: HP_FONT, fontSize: 13, color: HP_TOKENS.inkSoft, marginBottom: 16 }}>
              "{p.title}"
            </div>
            <div style={{ fontFamily: HP_FONT, fontSize: 12, color: HP_TOKENS.coral, fontWeight: 700, marginBottom: 20, padding: '8px 12px', borderRadius: 10, background: HP_TOKENS.coralSoft }}>
              Task akan dikembalikan ke belum selesai dan semua progress direset.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowUndoConfirm(false); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 14, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: HP_TOKENS.card, fontFamily: HP_FONT, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', color: HP_TOKENS.inkMute,
                }}
              >
                Batal
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowUndoConfirm(false); onToggle(); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 14, border: 'none',
                  background: HP_TOKENS.coral, color: '#fff',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                }}
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, backdropFilter: 'blur(4px)'
        }} onClick={(e) => { e.stopPropagation(); setShowDeleteModal(false); }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: 32,
            width: '100%', maxWidth: 400, textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            animation: 'hpPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: HP_TOKENS.coralWash, color: HP_TOKENS.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <HPGlyph name="trash" size={32} />
            </div>
            <div style={{ ...HP_TEXT.h, fontSize: 20, marginBottom: 8 }}>Hapus Task?</div>
            <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, marginBottom: 24 }}>
              Apakah Anda yakin ingin menghapus task <b>"{p.title}"</b>?
            </div>
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <button onClick={executeDelete} className="hp-tap" style={{
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
    </div>
  );
}
