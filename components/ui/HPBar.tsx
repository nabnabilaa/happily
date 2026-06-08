"use client";

import React from "react";
import { HP_TOKENS } from "@/lib/constants";

interface HPBarProps {
  value: number;
  tone?: 'sage' | 'blue' | 'yellow' | 'coral' | 'lavender' | 'primary' | 'teal';
  height?: number;
  gradient?: boolean;
}

export default function HPBar({ 
  value, 
  tone = 'primary', 
  height = 6,
  gradient = false
}: HPBarProps) {
  const map: Record<string, string> = { 
    sage: HP_TOKENS.sage, 
    blue: HP_TOKENS.blue, 
    yellow: HP_TOKENS.yellow, 
    coral: HP_TOKENS.coral, 
    lavender: HP_TOKENS.lavender,
    primary: HP_TOKENS.primary,
    teal: HP_TOKENS.teal,
  };
  
  const fillBg = gradient 
    ? `linear-gradient(90deg, ${HP_TOKENS.primary}, ${HP_TOKENS.yellow})`
    : map[tone] || HP_TOKENS.primary;

  return (
    <div style={{ width: '100%', height, background: 'var(--hp-border)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, value))}%`, 
        height: '100%',
        background: fillBg, 
        borderRadius: 99,
        transition: 'width 600ms cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  );
}
