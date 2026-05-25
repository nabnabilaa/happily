"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import RewardCard from "@/components/recognize/RewardCard";
import StatBlock from "@/components/recognize/StatBlock";

interface Props { openModal: (name: string, props?: any) => void; }

export default function ManagerRecognizeScreen({ openModal }: Props) {
  const { state } = useHP();
  if (!state) return null;

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Rewards" subtitle="Tukarkan poin atau pantau reward tim" />

      {/* Stats */}
      <HPCard style={{ background: `linear-gradient(135deg, ${HP_TOKENS.yellowWash}, ${HP_TOKENS.blueWash})`, border: 'none', marginBottom: 20 }} padding={16}>
        <div style={{ display: 'flex', gap: 20 }}>
          <StatBlock label="Poin kamu" value={state.points.toLocaleString()} icon="trophy" tone="yellow" />
        </div>
      </HPCard>

      {/* Rewards */}
      <SectionHeader icon="trophy" label="Reward Tersedia" action="Semua" onAction={() => openModal('all_rewards')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(state.rewards || []).slice(0, 4).map((r: any) => (
          <div 
            key={r.id} 
            onClick={() => openModal('all_rewards', { selected: r.id })} 
            className="hp-tap"
            style={{ opacity: r.stock === 0 ? 0.6 : 1 }}
          >
            <RewardCard 
              title={r.title} 
              points={r.points} 
              tone={r.tone as any} 
              glyph={r.glyph}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
