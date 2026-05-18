"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface StatBlockProps {
  label: string;
  value: string;
  icon: string;
  tone: 'yellow' | 'coral' | 'sage' | 'blue' | 'lavender';
}

export default function StatBlock({ label, value, icon, tone }: StatBlockProps) {
  const bg = { yellow: HP_TOKENS.yellowSoft, coral: HP_TOKENS.coralSoft, sage: HP_TOKENS.sageSoft, blue: HP_TOKENS.blueSoft, lavender: HP_TOKENS.lavenderSoft }[tone];
  const fg = { yellow: '#8A6814', coral: '#B5574A', sage: HP_TOKENS.sage, blue: HP_TOKENS.blue, lavender: HP_TOKENS.lavender }[tone];
  
  return (
    <div style={{ flex: 1 }}>
      <div style={{ 
        width: 28, 
        height: 28, 
        borderRadius: 8, 
        background: bg, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 6 
      }}>
        <HPGlyph name={icon} size={16} color={fg}/>
      </div>
      <div style={{ ...HP_TEXT.title, fontSize: 20 }}>{value}</div>
      <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 600 }}>{label}</div>
    </div>
  );
}
