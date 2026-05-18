"use client";

import React from "react";
import { HP_TOKENS } from "@/lib/constants";

interface HPPlaceholderProps {
  label: string;
  h?: number;
  tone?: 'sage' | 'blue' | 'yellow' | 'coral';
}

export default function HPPlaceholder({ 
  label, 
  h = 120, 
  tone = 'sage' 
}: HPPlaceholderProps) {
  const map = { 
    sage: HP_TOKENS.sageSoft, 
    blue: HP_TOKENS.blueSoft, 
    yellow: HP_TOKENS.yellowSoft, 
    coral: HP_TOKENS.coralSoft 
  };
  
  return (
    <div style={{
      height: h, 
      borderRadius: 16, 
      overflow: 'hidden',
      background: `repeating-linear-gradient(45deg, ${map[tone]} 0 10px, ${HP_TOKENS.paper} 10px 20px)`,
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 11, 
      color: HP_TOKENS.inkMute, 
      letterSpacing: 0.5,
    }}>
      {label}
    </div>
  );
}
