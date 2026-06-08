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
  padding = 18, 
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
        borderRadius: 24,
        padding,
        border: `1px solid ${HP_TOKENS.line}`,
        boxShadow: soft ? 'none' : 'var(--hp-shadow-sm)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
