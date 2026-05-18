"use client";

import React from "react";
import { HP_TOKENS, HP_TEXT } from "@/lib/constants";
import HPChip from "@/components/ui/HPChip";
import HPBar from "@/components/ui/HPBar";

interface DimensionCardProps {
  d: any;
}

export default function DimensionCard({ d }: DimensionCardProps) {
  const bgColors: Record<string, string> = { 
    sage: HP_TOKENS.sageWash, 
    blue: HP_TOKENS.blueWash, 
    yellow: HP_TOKENS.yellowWash, 
    lavender: HP_TOKENS.lavenderSoft 
  };
  const fgColors: Record<string, string> = { 
    sage: HP_TOKENS.sage, 
    blue: HP_TOKENS.blue, 
    yellow: '#8A6814', 
    lavender: '#6B5F8E' 
  };
  
  return (
    <div style={{ 
      padding: 14, 
      borderRadius: 18, 
      background: bgColors[d.tone], 
      border: `1px solid ${HP_TOKENS.line}` 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...HP_TEXT.small, color: fgColors[d.tone], fontWeight: 800 }}>{d.label}</div>
        <HPChip tone="neutral" size="sm">{d.trend}</HPChip>
      </div>
      <div style={{ ...HP_TEXT.title, fontSize: 26, marginTop: 8, color: fgColors[d.tone] }}>{d.score}</div>
      <div style={{ marginTop: 8 }}>
        <HPBar value={d.score} tone={d.tone} height={4}/>
      </div>
    </div>
  );
}
