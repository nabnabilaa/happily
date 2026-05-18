"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";

interface ProgramCardInteractiveProps {
  p: any;
  onToggleJoin: (id: number) => void;
}

export default function ProgramCardInteractive({ p, onToggleJoin }: ProgramCardInteractiveProps) {
  const isJoined = p.joinedByMe;

  return (
    <HPCard padding={16} style={{ 
      border: isJoined ? `2px solid ${HP_TOKENS[p.tone as keyof typeof HP_TOKENS] || HP_TOKENS.sage}` : `1.5px solid ${HP_TOKENS.line}`,
      background: isJoined ? `${HP_TOKENS[p.tone + 'Wash' as keyof typeof HP_TOKENS] || '#F0F7F2'}` : '#fff',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16,
          background: HP_TOKENS[p.tone + 'Soft' as keyof typeof HP_TOKENS] || HP_TOKENS.sageSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0
        }}>
          <HPGlyph name={p.glyph || 'leaf'} size={24} color={HP_TOKENS[p.tone as keyof typeof HP_TOKENS] || HP_TOKENS.sage} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{p.title}</div>
            <div style={{
              fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
              background: p.source === 'hr' ? HP_TOKENS.lavenderSoft : HP_TOKENS.blueSoft,
              color: p.source === 'hr' ? HP_TOKENS.lavender : HP_TOKENS.blue,
            }}>
              {p.source === 'hr' ? 'ORG-WIDE' : 'TIM'}
            </div>
          </div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, marginBottom: 12, lineHeight: 1.4 }}>
            {p.desc}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, display: 'flex', alignItems: 'center', gap: 4 }}>
                <HPGlyph name="calendar" size={12} color={HP_TOKENS.inkFade} /> {p.duration}
              </div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, display: 'flex', alignItems: 'center', gap: 4 }}>
                <HPGlyph name="people" size={12} color={HP_TOKENS.inkFade} /> {p.enrolledTeam}/{p.totalTeam} Join
              </div>
            </div>
            
            <button 
              onClick={() => onToggleJoin(p.id)}
              className="hp-tap"
              style={{
                padding: '8px 16px', borderRadius: 12, border: 'none',
                background: isJoined ? HP_TOKENS.lineSoft : (HP_TOKENS[p.tone as keyof typeof HP_TOKENS] || HP_TOKENS.sage),
                color: isJoined ? HP_TOKENS.inkSoft : '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isJoined ? 'Tinggalkan' : 'Ikuti Program'}
            </button>
          </div>
        </div>
      </div>
    </HPCard>
  );
}
