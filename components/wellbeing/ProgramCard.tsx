"use client";

import React from "react";
import { HP_TEXT, HP_TOKENS } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPBar from "@/components/ui/HPBar";
import HPPlaceholder from "@/components/ui/HPPlaceholder";

interface ProgramCardProps {
  title: string;
  progress: number;
  joined: number;
  tone: 'sage' | 'yellow' | 'blue' | 'coral' | 'lavender';
  day: string;
}

export default function ProgramCard({ 
  title, 
  progress, 
  joined, 
  tone, 
  day 
}: ProgramCardProps) {
  return (
    <HPCard padding={14}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <HPPlaceholder label="" h={56} tone={tone as any}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{title}</div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 3 }}>
            {day} · {joined} orang ikut
          </div>
          <div style={{ marginTop: 8 }}>
            <HPBar value={progress} tone={tone as any} height={5}/>
          </div>
        </div>
      </div>
    </HPCard>
  );
}
