"use client";

import React from "react";
import { HP_TOKENS } from "@/lib/constants";

interface BeeMascotProps {
  mood?: 'happy' | 'neutral' | 'sad' | 'sleepy' | 'surprised';
  size?: number;
  showSpeech?: string;
}

export default function BeeMascot({ mood = 'happy', size = 80, showSpeech }: BeeMascotProps) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {showSpeech && (
        <div style={{
          marginBottom: 12,
          padding: '10px 16px',
          borderRadius: '16px 16px 16px 4px',
          background: '#fff',
          border: `1.5px solid ${HP_TOKENS.line}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          maxWidth: 200,
          position: 'relative',
          animation: 'hpFadeIn 0.3s ease-out'
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: HP_TOKENS.ink }}>{showSpeech}</div>
          <div style={{
            position: 'absolute',
            bottom: -8,
            left: 8,
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `8px solid ${HP_TOKENS.line}`
          }} />
        </div>
      )}
      
      {/* 3D Cute Bee Mascot Image */}
      <div style={{
        width: size,
        height: size,
        position: 'relative',
        animation: 'hpFloat 3s ease-in-out infinite',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img 
          src="/cute-bee.png" 
          alt="Bee Mascot" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))'
          }} 
        />
      </div>

      <style jsx global>{`
        @keyframes hpFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hpFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
