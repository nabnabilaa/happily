"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPChip from "@/components/ui/HPChip";
import Mascot from "@/components/home/Mascot";

interface EmotionalHeroProps {
  state: any;
  moodObj?: any;
  energyObj?: any;
  onOpenCheckIn: () => void;
}

export default function EmotionalHero({ 
  state, 
  moodObj, 
  energyObj, 
  onOpenCheckIn 
}: EmotionalHeroProps) {
  if (moodObj && energyObj) {
    return (
      <div 
        className="hp-tap" 
        onClick={onOpenCheckIn} 
        style={{
          position: 'relative', 
          borderRadius: 24, 
          padding: '20px', 
          cursor: 'pointer',
          background: HP_TOKENS.card,
          border: `1px solid ${HP_TOKENS.line}`,
          boxShadow: '0 4px 12px rgba(26,29,35,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: moodObj.tone === 'yellow' ? HP_TOKENS.yellowSoft : HP_TOKENS.blueSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <HPGlyph name={moodObj.glyph} size={32} color={moodObj.tone === 'yellow' ? HP_TOKENS.yellow : HP_TOKENS.blue} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, textTransform: 'uppercase' }}>Kondisi Saat Ini</div>
            <div style={{ ...HP_TEXT.h, fontSize: 18, marginTop: 4 }}>{moodObj.label}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: HP_TOKENS.blueWash, color: HP_TOKENS.blue, fontSize: 11, fontWeight: 700 }}>
                <HPGlyph name="zap" size={10} color={HP_TOKENS.blue} /> {energyObj.label}
              </div>
              {state.tag && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: HP_TOKENS.yellowWash, color: HP_TOKENS.ink, fontSize: 11, fontWeight: 700 }}>
                  #{state.tag}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="hp-tap" 
      onClick={onOpenCheckIn} 
      style={{
        position: 'relative', 
        borderRadius: 24, 
        padding: '24px 20px', 
        cursor: 'pointer',
        background: HP_TOKENS.paper,
        border: `1px solid ${HP_TOKENS.line}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: HP_TOKENS.yellow,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <HPGlyph name="sparkle" size={28} color={HP_TOKENS.ink} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, textTransform: 'uppercase' }}>Sapa Diri Sendiri</div>
          <div style={{ ...HP_TEXT.h, fontSize: 20, marginTop: 4 }}>Bagaimana perasaan Anda?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: HP_TOKENS.blue, fontSize: 13, fontWeight: 800 }}>
            <span>Mulai check-in</span>
            <HPGlyph name="arrow" size={14} color={HP_TOKENS.blue} />
          </div>
        </div>
      </div>
    </div>
  );
}
