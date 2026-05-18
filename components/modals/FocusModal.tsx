"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPBar from "@/components/ui/HPBar";
import BeeMascot from "@/components/ui/BeeMascot";

interface FocusModalProps {
  onClose: () => void;
}

const iconBtnStyle: React.CSSProperties = {
  position: 'relative', width: 40, height: 40, borderRadius: 20, border: 'none',
  background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

export default function FocusModal({ onClose }: FocusModalProps) {
  const { state } = useHP();
  const [duration, setDuration] = useState(25);
  const [started, setStarted] = useState(false);
  const [secs, setSecs] = useState(25 * 60);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [started]);

  if (!state) return null;

  const focusTask = state.priorities.find((p: any) => !p.done)?.title || "General Focus";
  const mins = Math.floor(secs / 60);
  const ss = secs % 60;

  return (
    <div style={{
      position: 'absolute', 
      inset: 0, 
      zIndex: 100,
      background: `linear-gradient(180deg, ${HP_TOKENS.sage} 0%, #2D4F3A 100%)`,
      color: '#fff', 
      fontFamily: HP_FONT,
      display: 'flex', 
      flexDirection: 'column', 
      animation: 'hpFadeIn 300ms',
    }}>
      <div style={{ padding: '60px 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onClose} style={iconBtnStyle}>
          <HPGlyph name="close" size={18} color="#fff"/>
        </button>
        <div style={{ ...HP_TEXT.small, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>FOCUS MODE</div>
        <div style={{ width: 40 }}/>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 20, textAlign: 'center' }}>
        {!started ? (
          <>
            <BeeMascot mood="happy" size={100} showSpeech="Ayo kita selesaikan ini!" />
            <div style={{ ...HP_TEXT.display, fontSize: 28, color: '#fff', marginTop: 16 }}>Deep work tanpa gangguan</div>
            <div style={{ ...HP_TEXT.body, color: 'rgba(255,255,255,0.75)', marginTop: 8, maxWidth: 280 }}>
              Notifikasi off. Kita fokus selesaikan: <br/>
              <span style={{ fontWeight: 800 }}>"{focusTask}"</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 36 }}>
              {[25, 45, 90].map(d => (
                <button 
                  key={d} 
                  onClick={() => { setDuration(d); setSecs(d * 60); }} 
                  style={{
                    padding: '14px 22px', 
                    borderRadius: 99,
                    background: duration === d ? '#fff' : 'rgba(255,255,255,0.15)',
                    color: duration === d ? HP_TOKENS.sage : '#fff',
                    border: 'none', 
                    fontFamily: HP_FONT, 
                    fontWeight: 800, 
                    fontSize: 15, 
                    cursor: 'pointer',
                  }}
                >
                  {d} min
                </button>
              ))}
            </div>
            <button 
              onClick={() => setStarted(true)} 
              style={{
                marginTop: 32, 
                padding: '16px 40px', 
                borderRadius: 99,
                background: HP_TOKENS.yellow, 
                color: HP_TOKENS.ink, 
                border: 'none',
                fontFamily: HP_FONT, 
                fontWeight: 800, 
                fontSize: 16, 
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(245,200,66,0.4)',
              }}
              className="hp-tap"
            >
              Mulai fokus
            </button>
          </>
        ) : (
          <>
            <BeeMascot mood="sleepy" size={100} showSpeech="Aku nemenin di sini ya..." />
            <div style={{ fontSize: 72, fontWeight: 800, fontFamily: HP_FONT, letterSpacing: -2, marginTop: 24 }}>
              {String(mins).padStart(2,'0')}:{String(ss).padStart(2,'0')}
            </div>
            <div style={{ ...HP_TEXT.body, color: 'rgba(255,255,255,0.8)', marginTop: 12 }}>
              {focusTask}
            </div>
            <div style={{ marginTop: 40, width: 200 }}>
              <HPBar value={((duration * 60 - secs) / (duration * 60)) * 100} tone="yellow" height={4}/>
            </div>
            <button 
              onClick={onClose} 
              style={{
                marginTop: 36, 
                padding: '12px 28px', 
                borderRadius: 99,
                background: 'rgba(255,255,255,0.15)', 
                color: '#fff', 
                border: '1px solid rgba(255,255,255,0.3)',
                fontFamily: HP_FONT, 
                fontWeight: 700, 
                fontSize: 14, 
                cursor: 'pointer',
              }}
              className="hp-tap"
            >
              Selesai lebih awal
            </button>
          </>
        )}
      </div>
    </div>
  );
}

