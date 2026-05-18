"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";

import HPGlyph from "@/components/ui/HPGlyph";

interface InsightCardProps {
  ins: any;
  idx: number;
}

export default function InsightCard({ ins, idx }: InsightCardProps) {
  const tones: Record<string, any> = {
    sage: { 
      bg: HP_TOKENS.yellowSoft, 
      border: HP_TOKENS.yellow, 
      fg: HP_TOKENS.ink, 
      glyph: 'sparkle', 
    },
    blue: { 
      bg: HP_TOKENS.blueWash, 
      border: HP_TOKENS.blueSoft, 
      fg: HP_TOKENS.blue, 
      glyph: 'activity', 
    },
    yellow: { 
      bg: HP_TOKENS.yellowWash, 
      border: HP_TOKENS.yellowSoft, 
      fg: HP_TOKENS.ink, 
      glyph: 'target', 
    },
    coral: {
      bg: HP_TOKENS.coralSoft,
      border: HP_TOKENS.coral,
      fg: HP_TOKENS.coral,
      glyph: 'zap',
    },
    lavender: {
      bg: HP_TOKENS.lavenderSoft,
      border: HP_TOKENS.lavender,
      fg: HP_TOKENS.lavender,
      glyph: 'sparkle',
    },
  };
  
  const t = tones[ins.tone] || tones.sage;
  
  return (
    <div 
      className="hp-tap" 
      style={{
        padding: '16px', 
        borderRadius: 16, 
        background: HP_TOKENS.card, 
        border: `1px solid ${HP_TOKENS.line}`,
        display: 'flex', 
        gap: 16, 
        alignItems: 'center', 
        cursor: 'pointer',
      }}
    >
      <div style={{ 
        width: 40, 
        height: 40, 
        borderRadius: 10, 
        background: t.bg, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexShrink: 0 
      }}>
        <HPGlyph name={t.glyph} size={18} color={t.fg} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.ink }}>{ins.title}</div>
        <div style={{ ...HP_TEXT.body, fontSize: 13, marginTop: 2, color: HP_TOKENS.inkMute }}>{ins.body}</div>
      </div>
    </div>
  );
}
