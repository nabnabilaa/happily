"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";

interface ReadinessRingProps {
  value: number;
}

export default function ReadinessRing({ value }: ReadinessRingProps) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  
  return (
    <div style={{ position: 'relative', width: 64, height: 64 }}>
      <svg width="64" height="64">
        <circle cx="32" cy="32" r={r} stroke={HP_TOKENS.lineSoft} strokeWidth="6" fill="none"/>
        <circle 
          cx="32" 
          cy="32" 
          r={r} 
          stroke={HP_TOKENS.sage} 
          strokeWidth="6" 
          fill="none"
          strokeDasharray={c} 
          strokeDashoffset={off} 
          strokeLinecap="round"
          transform="rotate(-90 32 32)" 
          style={{ transition: 'stroke-dashoffset 600ms' }}
        />
      </svg>
      <div style={{
        position: 'absolute', 
        inset: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        ...HP_TEXT.h, 
        fontSize: 15, 
        color: HP_TOKENS.sage,
      }}>
        {value}%
      </div>
    </div>
  );
}
