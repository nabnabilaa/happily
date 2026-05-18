"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";

interface SectionHeaderProps {
  icon: string;
  label: string;
  count?: string;
  action?: string;
  onAction?: () => void;
}

export default function SectionHeader({ 
  icon, 
  label, 
  count, 
  action,
  onAction 
}: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 4px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ 
          width: 32, 
          height: 32, 
          borderRadius: 10, 
          background: HP_TOKENS.yellowSoft, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <HPGlyph name={icon} size={16} color={HP_TOKENS.ink}/>
        </div>
        <div style={{ ...HP_TEXT.h, fontSize: 17 }}>{label}</div>
        {count && <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, fontSize: 13 }}>({count})</span>}
      </div>
      {action && (
        <button 
          onClick={onAction}
          className="hp-tap" 
          style={{ 
            background: HP_TOKENS.lavender, 
            borderRadius: 10,
            padding: '6px 12px',
            border: 'none', 
            fontFamily: HP_FONT, 
            fontWeight: 800, 
            fontSize: 12, 
            color: '#fff', 
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(123,107,181,0.2)'
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}
