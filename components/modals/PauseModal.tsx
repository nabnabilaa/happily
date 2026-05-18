"use client";

import React, { useState, useEffect } from "react";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface PauseModalProps {
  onClose: () => void;
}

const iconBtnStyle: React.CSSProperties = {
  position: 'relative', width: 40, height: 40, borderRadius: 20, border: 'none',
  background: HP_TOKENS.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

export default function PauseModal({ onClose }: PauseModalProps) {
  const [phase, setPhase] = useState('inhale');
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const seq = ['inhale', 'hold', 'exhale'];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % 3;
      setPhase(seq[i]);
      if (i === 0) setCycle(c => c + 1);
    }, 4500); // slightly slower, more mindful
    return () => clearInterval(id);
  }, []);

  const labels: Record<string, string> = { inhale: 'Tarik Napas', hold: 'Tahan', exhale: 'Lepaskan Pelan' };
  const label = labels[phase as keyof typeof labels] || 'Bernapas';
  
  // Phase-based scaling
  const scale = phase === 'exhale' ? 0.8 : 1.35;
  const opacity = phase === 'hold' ? 0.9 : 0.6;

  return (
    <div style={{
      position: 'absolute', 
      inset: 0, 
      zIndex: 100,
      background: `radial-gradient(circle at center, ${HP_TOKENS.blueWash} 0%, ${HP_TOKENS.sageWash} 100%)`,
      backdropFilter: 'blur(30px)',
      display: 'flex', 
      flexDirection: 'column', 
      fontFamily: HP_FONT, 
      animation: 'hpFadeIn 600ms',
    }}>
      <div style={{ padding: '60px 24px 24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={onClose} 
          style={{
            width: 44, height: 44, borderRadius: 22, border: `1px solid rgba(255,255,255,0.3)`,
            background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            backdropFilter: 'blur(10px)',
          }} 
          className="hp-tap"
        >
          <HPGlyph name="close" size={20} color={HP_TOKENS.inkSoft}/>
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 20 }}>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sage, fontWeight: 900, letterSpacing: '0.1em', opacity: 0.7 }}>
          MINDFUL RESET · SIKLUS {cycle + 1}
        </div>

        <div style={{ position: 'relative', marginTop: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer Glow Circle */}
          <div style={{
            position: 'absolute',
            width: 240, height: 240, borderRadius: 120,
            background: HP_TOKENS.sageSoft, 
            opacity: 0.2,
            transform: `scale(${scale * 1.2})`,
            transition: 'transform 4.5s ease-in-out',
            filter: 'blur(40px)',
          }}/>
          
          {/* Mid Pulse Circle */}
          <div style={{
            position: 'absolute',
            width: 200, height: 200, borderRadius: 100,
            border: `2px solid ${HP_TOKENS.sageSoft}`,
            opacity: 0.3,
            transform: `scale(${scale * 1.1})`,
            transition: 'transform 4.5s ease-in-out',
          }}/>

          {/* Main Breathing Circle */}
          <div style={{
            width: 180, 
            height: 180, 
            borderRadius: 90, 
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transform: `scale(${scale})`, 
            transition: 'transform 4.5s ease-in-out, opacity 4.5s ease-in-out',
            opacity: opacity,
            boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
            border: '1px solid rgba(255,255,255,0.4)',
          }}>
            <div style={{ ...HP_TEXT.title, fontSize: 24, fontWeight: 800, color: HP_TOKENS.sage, transition: 'opacity 500ms' }}>
              {label}
            </div>
          </div>
        </div>

        <div style={{ ...HP_TEXT.body, fontSize: 15, marginTop: 80, maxWidth: 280, color: HP_TOKENS.inkSoft, lineHeight: 1.6 }}>
          Bernapaslah mengikuti irama lingkaran.<br/>Biarkan pikiranmu tenang sejenak.
        </div>
      </div>
    </div>
  );
}

