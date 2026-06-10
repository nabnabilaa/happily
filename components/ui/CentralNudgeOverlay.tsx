"use client";

import React, { useEffect, useState } from "react";
import BeeMascot from "@/components/ui/BeeMascot";
import Confetti from "@/components/home/Confetti";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";

interface CentralNudgeOverlayProps {
  nudge: {
    id: string;
    type: 'kudos' | 'senggol';
    from: string;
    message: string;
  } | null;
  onClose: () => void;
}

export default function CentralNudgeOverlay({ nudge, onClose }: CentralNudgeOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (nudge) {
      setVisible(true);
      if (nudge.type === 'kudos') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
      // Auto close after 8 seconds if not dismissed
      const timer = setTimeout(() => {
        handleClose();
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [nudge]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose(), 400); // wait for fade out
  };

  if (!nudge && !visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      pointerEvents: visible ? 'auto' : 'none',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)'
    }}>
      <Confetti show={showConfetti} />
      
      <div style={{
        background: nudge?.type === 'kudos' ? `linear-gradient(135deg, #FFBE0B, #FF9F1C)` : `linear-gradient(135deg, #38bdf8, #818cf8)`,
        borderRadius: '32px',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
        color: '#fff',
        fontFamily: HP_FONT
      }}>
        {/* Glow behind the bee */}
        <div style={{
          position: 'absolute',
          top: -40, left: '50%', transform: 'translateX(-50%)',
          width: 120, height: 120,
          background: 'rgba(255,255,255,0.4)',
          borderRadius: '50%',
          filter: 'blur(30px)',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1, marginTop: -60, marginBottom: 16 }}>
          <BeeMascot mood={nudge?.type === 'kudos' ? 'happy' : 'idle'} size={120} showSpeech="" />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ ...HP_TEXT.tiny, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 900, marginBottom: 8 }}>
            {nudge?.type === 'kudos' ? '✨ Apresiasi Baru ✨' : '👀 Senggolan Masuk'}
          </div>
          
          <div style={{ fontSize: '22px', fontWeight: 900, marginBottom: 16, lineHeight: 1.3 }}>
            {nudge?.type === 'kudos' 
              ? `Wah! Kamu dapat pesan manis dari ${nudge?.from}!` 
              : `${nudge?.from} baru saja menyenggolmu!`}
          </div>

          <div style={{ 
            background: 'rgba(255,255,255,0.15)',
            padding: '16px',
            borderRadius: '16px',
            fontSize: '15px',
            fontWeight: 700,
            lineHeight: 1.5,
            border: '1.5px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(10px)',
            marginBottom: 24,
            fontStyle: nudge?.type === 'kudos' ? 'italic' : 'normal'
          }}>
            {nudge?.message && nudge.message.length > 0 ? `"${nudge.message}"` : (nudge?.type === 'kudos' ? "Kerja bagus!" : "Ayo semangat, jangan melamun!")}
          </div>

          <button
            onClick={handleClose}
            className="hp-tap"
            style={{
              padding: '14px 32px',
              borderRadius: '100px',
              border: 'none',
              background: '#fff',
              color: nudge?.type === 'kudos' ? '#FF9F1C' : '#38bdf8',
              fontFamily: HP_FONT,
              fontWeight: 900,
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
            }}
          >
            {nudge?.type === 'kudos' ? 'Yeay, Terima Kasih! 💛' : 'Oke, Siap! 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
