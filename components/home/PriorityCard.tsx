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
    
    let updatedPriorities = [...(state?.priorities || [])];
    if (!p.done) {
      setShowPoints(true);
      setTimeout(() => setShowPoints(false), 1200);
      
      // Auto-pause timer if running when task is marked complete
      updatedPriorities = (state?.priorities || []).map((item: any) => {
        if (item.id === p.id && item.timer_started_at) {
          const startTime = new Date(item.timer_started_at).getTime();
          const sessionSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          return {
            ...item,
            time_tracked: (item.time_tracked || 0) + sessionSeconds,
            timer_started_at: null
          };
        }
        return item;
      });
      updateState({ priorities: updatedPriorities });
    }
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
          textDecoration: p.done ? 'line-through' : 'none',
          color: p.done ? HP_TOKENS.inkFade : HP_TOKENS.ink,
          lineHeight: 1.4,
          fontWeight: 700
        }}>
          {p.title}
        </div>
        
        {p.description && (
          <div style={{ 
            ...HP_TEXT.small, 
            color: p.done ? HP_TOKENS.inkFade : HP_TOKENS.inkMute, 
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
          
          {/* Progress Bar for all tasks that have progress or are focused */}
          {(p.progress > 0 || state?.focusTaskId === p.id) && (
            <div style={{ width: '100%', height: 4, background: HP_TOKENS.lineSoft, borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ 
                width: `${state?.focusTaskId === p.id ? (state?.focusProgress || 0) : (p.progress || 0)}%`, 
                height: '100%', 
                background: state?.focusTaskId === p.id ? HP_TOKENS.yellow : HP_TOKENS.sage, 
                borderRadius: 2,
                transition: '0.3s ease'
              }} />
            </div>
          )}
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
        
        {onEdit && !p.done && (
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
