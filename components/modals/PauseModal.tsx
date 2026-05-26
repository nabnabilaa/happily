"use client";

import React, { useState, useEffect } from "react";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import { useHP } from "@/lib/HPContext";

interface PauseModalProps {
  onClose: () => void;
}

export default function PauseModal({ onClose }: PauseModalProps) {
  const { awardXP } = useHP();
  const [phase, setPhase] = useState<'inhale' | 'hold_in' | 'exhale' | 'hold_out'>('inhale');
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [cycle, setCycle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [xpAwarded, setXpAwarded] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        } else {
          // Time to switch phases
          setPhase((currentPhase) => {
            switch (currentPhase) {
              case 'inhale':
                return 'hold_in';
              case 'hold_in':
                return 'exhale';
              case 'exhale':
                return 'hold_out';
              case 'hold_out':
                // Completed one full cycle of Box Breathing!
                setCycle((c) => c + 1);
                return 'inhale';
              default:
                return 'inhale';
            }
          });
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  // Labels and messages for Indonesian
  const phaseInfo = {
    inhale: {
      label: 'Tarik Napas',
      desc: 'Tarik napas perlahan lewat hidung Anda...',
      scale: 1.35,
      color: HP_TOKENS.sage,
      bg: `radial-gradient(circle at center, ${HP_TOKENS.sageWash} 0%, #fff 100%)`,
    },
    hold_in: {
      label: 'Tahan',
      desc: 'Tahan napas sejenak, rasakan ketenangan...',
      scale: 1.35,
      color: HP_TOKENS.blue,
      bg: `radial-gradient(circle at center, ${HP_TOKENS.blueWash} 0%, ${HP_TOKENS.sageWash} 100%)`,
    },
    exhale: {
      label: 'Hembuskan',
      desc: 'Keluarkan napas perlahan lewat mulut...',
      scale: 0.85,
      color: HP_TOKENS.coral,
      bg: `radial-gradient(circle at center, #FFF0ED 0%, #fff 100%)`,
    },
    hold_out: {
      label: 'Tahan',
      desc: 'Jeda sejenak sebelum menarik napas kembali...',
      scale: 0.85,
      color: HP_TOKENS.yellow,
      bg: `radial-gradient(circle at center, ${HP_TOKENS.yellowWash} 0%, ${HP_TOKENS.paper} 100%)`,
    },
  };

  const currentInfo = phaseInfo[phase];

  const handleComplete = async () => {
    if (cycle >= 1 && !xpAwarded) {
      setXpAwarded(true);
      await awardXP('focus_session', 'Mindful Box Breathing');
      alert('Selamat! Anda mendapatkan +5 Poin atas latihan kesadaran hari ini. 🧘‍♂️✨');
    }
    onClose();
  };

  return (
    <div style={{
      position: 'absolute', 
      inset: 0, 
      zIndex: 100,
      background: currentInfo.bg,
      backdropFilter: 'blur(30px)',
      display: 'flex', 
      flexDirection: 'column', 
      fontFamily: HP_FONT, 
      animation: 'hpFadeIn 500ms ease-out',
      transition: 'background 1s ease-in-out',
    }}>
      {/* Top Header */}
      <div style={{ padding: '60px 24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🧘‍♂️</span>
          <div style={{ ...HP_TEXT.h, fontSize: 16, color: HP_TOKENS.ink }}>Pojok Tenang</div>
        </div>
        <button 
          onClick={onClose} 
          style={{
            width: 44, height: 44, borderRadius: 22, border: `1px solid ${HP_TOKENS.line}`,
            background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }} 
          className="hp-tap"
        >
          <HPGlyph name="close" size={20} color={HP_TOKENS.inkSoft}/>
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 20 }}>
        
        {/* Cycle Count */}
        <div style={{ 
          ...HP_TEXT.tiny, 
          background: 'rgba(255,255,255,0.7)',
          padding: '6px 16px',
          borderRadius: 99,
          border: `1px solid ${HP_TOKENS.line}`,
          color: HP_TOKENS.inkSoft, 
          fontWeight: 800, 
          letterSpacing: '0.05em',
        }}>
          BOX BREATHING · SIKLUS {cycle + 1}
        </div>

        {/* Breathing Circle Visualization */}
        <div style={{ position: 'relative', marginTop: 50, marginBottom: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Animated Glow Circles */}
          <div style={{
            position: 'absolute',
            width: 260, height: 260, borderRadius: 130,
            background: currentInfo.color, 
            opacity: 0.15,
            transform: `scale(${currentInfo.scale * 1.3})`,
            transition: 'transform 4s cubic-bezier(0.4, 0, 0.2, 1), background 1s ease-in-out',
            filter: 'blur(30px)',
          }}/>
          
          <div style={{
            position: 'absolute',
            width: 220, height: 220, borderRadius: 110,
            border: `2px dashed ${currentInfo.color}`,
            opacity: 0.25,
            transform: `scale(${currentInfo.scale * 1.15})`,
            transition: 'transform 4s cubic-bezier(0.4, 0, 0.2, 1), border-color 1s ease-in-out',
          }}/>

          {/* Main Breathing Circle */}
          <div style={{
            width: 180, 
            height: 180, 
            borderRadius: 90, 
            background: '#fff',
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            transform: `scale(${currentInfo.scale})`, 
            transition: 'transform 4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s ease-out',
            boxShadow: isPlaying ? '0 20px 50px rgba(0,0,0,0.06)' : '0 8px 20px rgba(0,0,0,0.04)',
            border: `2px solid ${isPlaying ? currentInfo.color : HP_TOKENS.line}`,
          }}>
            <div style={{ ...HP_TEXT.h, fontSize: 32, fontWeight: 900, color: currentInfo.color, transition: 'color 1s ease-in-out' }}>
              {secondsLeft}
            </div>
            <div style={{ ...HP_TEXT.tiny, fontWeight: 800, color: HP_TOKENS.inkMute, marginTop: 4, letterSpacing: '0.1em' }}>
              DETIK
            </div>
          </div>
        </div>

        {/* Phase Text & Guidelines */}
        <div style={{ minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ ...HP_TEXT.h, fontSize: 24, color: currentInfo.color, transition: 'color 1s ease-in-out' }}>
            {currentInfo.label}
          </div>
          <div style={{ ...HP_TEXT.body, fontSize: 15, marginTop: 12, maxWidth: 290, color: HP_TOKENS.inkSoft, lineHeight: 1.6 }}>
            {currentInfo.desc}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 280, marginTop: 40 }}>
          {/* Play/Pause Button */}
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="hp-tap"
            style={{
              padding: '14px', borderRadius: 16,
              background: '#fff', color: HP_TOKENS.ink,
              border: `1.5px solid ${HP_TOKENS.line}`,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}
          >
            <HPGlyph name={isPlaying ? 'pause' : 'refresh'} size={16} color={HP_TOKENS.ink} />
            <span>{isPlaying ? 'Jeda Latihan' : 'Lanjutkan'}</span>
          </button>

          {/* Finish/Complete Button */}
          <button 
            onClick={handleComplete}
            className="hp-tap"
            disabled={cycle < 1}
            style={{
              padding: '16px', borderRadius: 16, border: 'none',
              background: cycle >= 1 ? HP_TOKENS.sage : HP_TOKENS.lineSoft, 
              color: cycle >= 1 ? '#fff' : HP_TOKENS.inkFade,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: cycle >= 1 ? 'pointer' : 'default',
              boxShadow: cycle >= 1 ? `0 6px 20px ${HP_TOKENS.sage}30` : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {cycle >= 1 ? 'Selesai & Ambil +5 Point 🎉' : 'Selesaikan 1 Siklus Lengkap'}
          </button>
        </div>
      </div>
    </div>
  );
}
