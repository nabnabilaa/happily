"use client";

import React from "react";
import { HP_TOKENS } from "@/lib/constants";

interface HPBarProps {
  value: number;
  tone?: 'sage' | 'blue' | 'yellow' | 'coral' | 'lavender';
  height?: number;
}

export default function HPBar({ 
  value, 
  tone = 'sage', 
  height = 6 
}: HPBarProps) {
  const map: Record<string, string> = { 
    sage: HP_TOKENS.sage, 
    blue: HP_TOKENS.blue, 
    yellow: HP_TOKENS.yellow, 
    coral: HP_TOKENS.coral, 
    lavender: HP_TOKENS.lavender 
  };
  
  return (
    <div style={{ width: '100%', height, background: HP_TOKENS.lineSoft, borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, value))}%`, 
        height: '100%',
        background: map[tone] || HP_TOKENS.sage, 
        borderRadius: 99,
        transition: 'width 500ms cubic-bezier(.2,.8,.2,1)',
      }} />
    </div>
  );
}
