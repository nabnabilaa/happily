"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface PriorityCardProps {
  p: any;
  onToggle: () => void;
}

export default function PriorityCard({ p, onToggle }: PriorityCardProps) {
  const { state, updateState } = useHP();
  const [showPoints, setShowPoints] = useState(false);
  const [showFocusToast, setShowFocusToast] = useState(false);

  const toneMap: Record<string, any> = {
    sage: { bg: HP_TOKENS.yellowSoft, fg: HP_TOKENS.ink, wash: HP_TOKENS.yellowWash },
    blue: { bg: HP_TOKENS.blueSoft, fg: HP_TOKENS.blue, wash: HP_TOKENS.blueWash },
    lavender: { bg: HP_TOKENS.lavenderSoft, fg: '#6B5F8E', wash: HP_TOKENS.lavenderSoft },
  };
  
  const t = toneMap[p.tone] || toneMap.sage;
  const energyIcon = p.energy === 'high' ? 'zap' : p.energy === 'mid' ? 'activity' : 'sparkle';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!p.done) {
      setShowPoints(true);
      setTimeout(() => setShowPoints(false), 1200);
    }
    onToggle();
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
      gap: 16, 
      padding: '18px',
      background: p.done ? HP_TOKENS.card : '#fff',
      border: `1.5px solid ${state?.focusTaskId === p.id ? HP_TOKENS.yellow : (p.done ? HP_TOKENS.line : HP_TOKENS.line)}`,
      borderRadius: 20, 
      boxShadow: state?.focusTaskId === p.id ? `0 8px 24px ${HP_TOKENS.yellow}20` : (p.done ? 'none' : '0 4px 12px rgba(0,0,0,0.02)'),
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Floating +50 Poin */}
      {showPoints && (
        <div style={{
          position: 'absolute', top: -10, right: 20,
          background: HP_TOKENS.ink, color: HP_TOKENS.yellow,
          fontSize: 10, fontWeight: 900, fontFamily: HP_FONT,
          padding: '4px 10px', borderRadius: 10,
          animation: 'hpRise 1.2s ease-out forwards',
          pointerEvents: 'none', zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          +{p.points || 50} EXP
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
          zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
             <HPGlyph name={energyIcon} size={11} color={HP_TOKENS.inkMute} />
             <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>
               {p.est}
             </span>
             
             {p.targetDate && (
               <>
                 <span style={{ color: HP_TOKENS.line, fontSize: 10 }}>•</span>
                 <HPGlyph name="calendar" size={11} color={HP_TOKENS.inkMute} />
                 <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>
                   {p.targetDate}
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

      <div style={{ display: 'flex', gap: 8 }}>
        {!p.done && (
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
        )}
        
        <div style={{ 
          width: 32, height: 32, borderRadius: 16, background: HP_TOKENS.paper,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
           <HPGlyph name="arrow" size={14} color={HP_TOKENS.line} />
        </div>
      </div>
    </div>
  );
}
