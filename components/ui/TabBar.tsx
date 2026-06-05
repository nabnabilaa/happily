"use client";

import React from "react";
import { HP_TOKENS, HP_FONT } from "@/lib/constants";

interface TabBarOption {
  key: string;
  label: string;
}

interface TabBarProps {
  options: TabBarOption[];
  value: string;
  onChange: (value: string) => void;
}

export default function TabBar({ options, value, onChange }: TabBarProps) {
  return (
    <div style={{ display: 'flex', gap: 6, background: HP_TOKENS.lineSoft, padding: 4, borderRadius: 99 }}>
      {options.map(o => (
        <button 
          key={o.key} 
          onClick={() => onChange(o.key)} 
          style={{
            flex: 1, 
            padding: '9px 12px', 
            borderRadius: 99, 
            border: 'none',
            background: value === o.key ? HP_TOKENS.card : 'transparent',
            color: value === o.key ? HP_TOKENS.ink : HP_TOKENS.inkMute,
            fontFamily: HP_FONT, 
            fontWeight: 800, 
            fontSize: 13, 
            cursor: 'pointer',
            boxShadow: value === o.key ? '0 1px 3px rgba(26,29,35,0.06)' : 'none',
            transition: 'all 200ms',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
