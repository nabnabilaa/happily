"use client";

import React, { useEffect, useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import BeeMascot from "@/components/ui/BeeMascot";

interface CelebrationOverlayProps {
  show: boolean;
  onComplete: () => void;
  message?: string;
  points?: number;
}

export default function CelebrationOverlay({ show, onComplete, message = "Hebat! Satu langkah lebih dekat.", points = 50 }: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
    onComplete();
  };

  return (
    <div 
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(255,255,255,0.9)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: 'hpFadeIn 0.3s ease-out',
        cursor: 'pointer'
      }}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        style={{
          position: 'absolute', top: 24, right: 24,
          background: HP_TOKENS.lineSoft, border: 'none',
          width: 40, height: 40, borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: HP_TOKENS.inkFade,
          fontSize: 20, fontWeight: 900
        }}
      >
        ×
      </button>

      <div style={{ transform: 'scale(1.2)', marginBottom: 32 }}>
        <BeeMascot mood="happy" size={100} showSpeech="Yeeay! 🎉" />
      </div>
      <div style={{ ...HP_TEXT.display, fontSize: 24, textAlign: 'center', maxWidth: 280, marginBottom: 12 }}>{message}</div>
      <div style={{ 
        background: HP_TOKENS.yellow, color: HP_TOKENS.ink, padding: '8px 16px', borderRadius: 99,
        fontFamily: HP_FONT, fontWeight: 900, fontSize: 18,
        animation: 'hpBounce 0.5s ease-out'
      }}>
        +{points} XP
      </div>
      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, marginTop: 32, opacity: 0.6 }}>
        Klik di mana saja untuk menutup
      </div>
    </div>
  );
}
