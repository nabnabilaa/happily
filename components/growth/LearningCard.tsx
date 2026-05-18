"use client";

import React from "react";
import { HP_TEXT, HP_TOKENS } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPChip from "@/components/ui/HPChip";
import HPPlaceholder from "@/components/ui/HPPlaceholder";

interface LearningCardProps {
  title: string;
  meta: string;
  tag: string;
  tone: 'sage' | 'blue' | 'yellow' | 'coral' | 'lavender' | 'neutral';
  onClick?: () => void;
}

export default function LearningCard({ title, meta, tag, tone, onClick }: LearningCardProps) {
  return (
    <HPCard padding={12} onClick={onClick} className="hp-tap">

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <HPPlaceholder label="" h={64} tone={tone as any}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <HPChip tone={tone}>{tag}</HPChip>
          <div style={{ ...HP_TEXT.h, fontSize: 14, marginTop: 6 }}>{title}</div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 3 }}>{meta}</div>
        </div>
      </div>
    </HPCard>
  );
}
