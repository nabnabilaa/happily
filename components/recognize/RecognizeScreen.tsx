"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import StatBlock from "@/components/recognize/StatBlock";
import AppreciationCard from "@/components/recognize/AppreciationCard";
import RewardCard from "@/components/recognize/RewardCard";
import { ORG_REWARDS_CATALOG } from "@/lib/mockData";

interface RecognizeScreenProps {
  openModal: (name: string, props?: any) => void;
}

import { useState } from "react";
import LeaderboardScreen from "@/components/growth/LeaderboardScreen";

export default function RecognizeScreen({ openModal }: RecognizeScreenProps) {
  const { state } = useHP();

  if (!state) return null;

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Rewards" subtitle="Tukarkan poin kamu dengan berbagai hadiah menarik"/>

      <HPCard style={{ background: `linear-gradient(135deg, ${HP_TOKENS.yellowWash}, ${HP_TOKENS.sageWash})`, border: 'none', marginBottom: 20 }} padding={16}>
        <div style={{ display: 'flex', gap: 20 }}>
          <StatBlock label="Koin kamu" value={state.coins.toLocaleString()} icon="trophy" tone="yellow"/>
        </div>
      </HPCard>

      <SectionHeader 
        icon="trophy" 
        label="Tukar koin" 
        action="Semua"
        onAction={() => openModal('all_rewards')}
      />
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
            />
          </div>
        ))}
      </div>
    </div>
  );
}

