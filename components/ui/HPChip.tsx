"use client";

import React from "react";
import { HP_TOKENS, HP_FONT } from "@/lib/constants";

interface HPChipProps {
  children: React.ReactNode;
  tone?: 'sage' | 'blue' | 'yellow' | 'coral' | 'lavender' | 'neutral';
  size?: 'sm' | 'lg';
  style?: React.CSSProperties;
}

export default function HPChip({ 
  children, 
  tone = 'sage', 
  size = 'sm', 
  style = {} 
}: HPChipProps) {
  const map = {
    sage: { bg: HP_TOKENS.sageSoft, fg: HP_TOKENS.sage },
    blue: { bg: HP_TOKENS.blueSoft, fg: HP_TOKENS.blue },
    yellow: { bg: HP_TOKENS.yellowSoft, fg: '#8A6814' },
    coral: { bg: HP_TOKENS.coralSoft, fg: '#B5574A' },
    lavender: { bg: HP_TOKENS.lavenderSoft, fg: '#6B5F8E' },
    neutral: { bg: HP_TOKENS.lineSoft, fg: HP_TOKENS.inkSoft },
  };
  
  const c = map[tone] || map.neutral;
  const sz = size === 'lg' ? { padding: '6px 12px', fontSize: 13 } : { padding: '3px 9px', fontSize: 11 };
  
  return (
    <span style={{
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: 4,
      background: c.bg, 
      color: c.fg, 
      borderRadius: 99,
      fontFamily: HP_FONT, 
      fontWeight: 700, 
      letterSpacing: 0.1,
      ...sz, 
      ...style,
    }}>
      {children}
    </span>
  );
}
