"use client";

import React from "react";
import { HP_TOKENS } from "@/lib/constants";

interface ConfettiProps {
  show: boolean;
}

export default function Confetti({ show }: ConfettiProps) {
  if (!show) return null;
  
  const pieces = Array.from({ length: 24 }).map((_, i) => {
    const c = [HP_TOKENS.sage, HP_TOKENS.blue, HP_TOKENS.yellow, HP_TOKENS.coral, '#A89BC9'][i % 5];
    const dx = (Math.random() - 0.5) * 240;
    const dy = -160 - Math.random() * 140;
    const size = 6 + Math.random() * 8;
    const isRound = Math.random() > 0.5;
    
    return (
      <div 
        key={i} 
        style={{
          position: 'absolute', 
          left: '50%', 
          top: '50%',
          width: size, 
          height: size, 
          background: c,
          borderRadius: isRound ? '50%' : 2,
          //@ts-ignore - Dynamic CSS variables
          '--dx': `${dx}px`, 
          '--dy': `${dy}px`,
          animation: `hpConfetti ${0.9 + Math.random() * 0.5}s ease-out forwards`,
        }}
      />
    );
  });
  
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 200 }}>
      {pieces}
    </div>
  );
}
