"use client";

import React from "react";
import { HP_TOKENS } from "@/lib/constants";

interface HPCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: number;
  onClick?: () => void;
  soft?: boolean;
  className?: string;
}

export default function HPCard({ 
  children, 
  style = {}, 
  padding = 16, 
  onClick, 
  soft = false,
  className
}: HPCardProps) {
  return (
    <div 
      onClick={onClick} 
      className={className}
      style={{
        background: soft ? HP_TOKENS.lineSoft : HP_TOKENS.card,
        borderRadius: 20,
        padding,
        border: `1px solid ${HP_TOKENS.line}`,
        boxShadow: soft ? 'none' : '0 1px 2px rgba(44,42,40,0.03), 0 2px 8px rgba(44,42,40,0.02)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
