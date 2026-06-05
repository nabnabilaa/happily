"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";

interface IntentionCardProps {
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
}

import HPGlyph from "@/components/ui/HPGlyph";

interface IntentionCardProps {
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
}

const primaryBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 12, border: 'none', background: HP_TOKENS.ink,
  color: HP_TOKENS.yellow, fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 12, border: `1px solid ${HP_TOKENS.line}`, background: 'transparent',
  color: HP_TOKENS.inkMute, fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
};

export default function IntentionCard({ state, setState }: IntentionCardProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(state.intention || '');

  const save = () => { 
    setState((s: any) => {
      // Try to find a priority task that matches this intention title
      const matchingTask = s.priorities.find((p: any) => p.title === draft);
      return { 
        ...s, 
        intention: draft,
        focusTaskId: matchingTask ? matchingTask.id : null,
        focusProgress: matchingTask ? (matchingTask.progress || 0) : 0
      };
    }); 
    setEditing(false); 
  };

  if (!state.intention && !editing) {
    return (
      <button 
        onClick={() => setEditing(true)} 
        className="hp-tap" 
        style={{
          width: '100%', 
          padding: '16px', 
          borderRadius: 20,
          background: HP_TOKENS.card, 
          border: `1.5px dashed ${HP_TOKENS.yellow}`,
          display: 'flex', 
          alignItems: 'center', 
          gap: 16, 
          cursor: 'pointer', 
          fontFamily: HP_FONT, 
          textAlign: 'left',
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: HP_TOKENS.yellowSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HPGlyph name="target" size={20} color={HP_TOKENS.ink} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, textTransform: 'uppercase' }}>Focus Today</div>
          <div style={{ ...HP_TEXT.body, fontSize: 14, fontWeight: 700, marginTop: 2, color: HP_TOKENS.inkSoft }}>
            What is your main intention?
          </div>
        </div>
      </button>
    );
  }

  if (editing) {
    return (
      <HPCard padding={16} style={{ borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <HPGlyph name="target" size={16} color={HP_TOKENS.ink} />
          <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Set Your Focus</div>
        </div>
        <div style={{ position: 'relative' }}>
          <select 
            autoFocus 
            value={draft} 
            onChange={e => setDraft(e.target.value)} 
            style={{
              width: '100%', 
              padding: '14px 40px 14px 14px', 
              borderRadius: 12,
              border: `1.5px solid ${HP_TOKENS.yellow}`, 
              fontFamily: HP_FONT, 
              fontSize: 15, 
              fontWeight: 700,
              color: HP_TOKENS.ink, 
              outline: 'none', 
              background: HP_TOKENS.card, 
              boxSizing: 'border-box',
              appearance: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">-- Pilih Target Fokus --</option>
            {state.goals && state.goals.length > 0 ? (
              state.goals.map((g: any) => (
                <option key={g.id} value={g.title}>{g.title} ({g.scope})</option>
              ))
            ) : (
              <option disabled>Belum ada OKR yang tersedia</option>
            )}
            <option value="General Focus">General Focus / Lainnya</option>
          </select>
          <div style={{ 
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' 
          }}>
            <HPGlyph name="arrow" size={12} color={HP_TOKENS.inkMute} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={() => setEditing(false)} style={ghostBtn}>Cancel</button>
          <button onClick={save} style={primaryBtn}>Save Focus</button>
        </div>
      </HPCard>
    );
  }

  return (
    <HPCard 
      padding={16} 
      onClick={() => { setDraft(state.intention); setEditing(true); }} 
      style={{ cursor: 'pointer', borderRadius: 20, background: HP_TOKENS.card }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: HP_TOKENS.yellowSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HPGlyph name="target" size={20} color={HP_TOKENS.ink} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, textTransform: 'uppercase' }}>Current Focus</div>
          <div style={{ ...HP_TEXT.h, fontSize: 16, marginTop: 2 }}>{state.intention}</div>
        </div>
      </div>
    </HPCard>
  );
}
