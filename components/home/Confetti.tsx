"use client";

import React, { useEffect, useState } from "react";
import { HP_TOKENS } from "@/lib/constants";

interface ConfettiProps {
  show: boolean;
}

export default function Confetti({ show }: ConfettiProps) {
  const [pieces, setPieces] = useState<any[]>([]);

  useEffect(() => {
    if (show) {
      // Generate 150 particles for a rich confetti effect similar to the HTML concept
      const newPieces = Array.from({ length: 150 }).map((_, i) => {
        // Use Flowbuddy's token colors + some bright accents
        const colors = [HP_TOKENS.sage, HP_TOKENS.blue, HP_TOKENS.yellow, HP_TOKENS.coral, '#F97316', '#FCA5A5', '#93C5FD', '#FFF'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const size = Math.random() * 8 + 5; // 5px to 13px
        const left = Math.random() * 100; // 0% to 100% viewport width
        const delay = Math.random() * 600; // staggered start
        const dur = Math.random() * 1200 + 1200; // 1.2s to 2.4s falling duration
        const isRound = Math.random() > 0.5;

        return {
          id: i,
          size,
          left,
          delay,
          dur,
          color,
          isRound
        };
      });
      setPieces(newPieces);
    } else {
      setPieces([]);
    }
  }, [show]);

  if (!show) return null;
  
  return (
    <>
      <style>
        {`
          @keyframes hpFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}
      </style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999999, overflow: 'hidden' }}>
        {pieces.map((p) => (
          <div 
            key={p.id} 
            style={{
              position: 'absolute', 
              left: `${p.left}%`, 
              top: '-20px',
              width: p.size, 
              height: p.size, 
              background: p.color,
              borderRadius: p.isRound ? '50%' : '3px',
              animation: `hpFall ${p.dur}ms linear forwards`,
              animationDelay: `${p.delay}ms`,
            }}
          />
        ))}
      </div>
    </>
  );
}
