"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import RewardCard from "@/components/recognize/RewardCard";
import StatBlock from "@/components/recognize/StatBlock";

interface Props { openModal: (name: string, props?: any) => void; }

export default function HRRecognizeScreen({ openModal }: Props) {
  const { state, updateState } = useHP();
  if (!state) return null;

  const rewards = state.rewards || [];

  const handleAddReward = () => {
    openModal('reward_editor', {
      onSave: (newReward: any) => {
        updateState({ rewards: [...rewards, newReward] });
      }
    });
  };

  const handleEditReward = (r: any) => {
    openModal('reward_editor', {
      reward: r,
      onSave: (updatedReward: any) => {
        const updated = rewards.map((item: any) => 
          item.id === r.id ? updatedReward : item
        );
        updateState({ rewards: updated });
      }
    });
  };

  const handleDeleteReward = (id: number | string) => {
    if (confirm("Hapus reward ini dari inventory?")) {
      updateState({ rewards: rewards.filter((r: any) => r.id !== id) });
    }
  };

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Rewards" subtitle="Kelola inventory atau tukarkan poin kamu" />

      {/* Stats */}
      <HPCard style={{ background: `linear-gradient(135deg, ${HP_TOKENS.yellowWash}, ${HP_TOKENS.lavenderSoft})`, border: 'none', marginBottom: 20 }} padding={16}>
        <div style={{ display: 'flex', gap: 20 }}>
          <StatBlock label="Poin kamu" value={state.points.toLocaleString()} icon="trophy" tone="yellow" />
        </div>
      </HPCard>

      {/* Tukar Poin Section */}
      <SectionHeader icon="trophy" label="Tukar Poin" action="Semua" onAction={() => openModal('all_rewards')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {rewards.slice(0, 4).map((r: any) => (
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
        {rewards.length === 0 && (
          <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute, border: `1.5px dashed ${HP_TOKENS.line}`, borderRadius: 20 }}>
            Belum ada reward tersedia.
          </div>
        )}
      </div>

      {/* Reward management */}
      <SectionHeader icon="trophy" label="Kelola Inventory Reward" action="+ Add Reward" onAction={handleAddReward} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rewards.map((r: any) => (
          <HPCard key={r.id} padding={16} style={{ border: r.stock === 0 ? `1.5px solid ${HP_TOKENS.coral}40` : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: (HP_TOKENS[r.tone as keyof typeof HP_TOKENS] || HP_TOKENS.blue) + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: r.stock === 0 ? 0.5 : 1
              }}>
                <HPGlyph name={r.glyph || "gift"} size={24} color={HP_TOKENS[r.tone as keyof typeof HP_TOKENS] || HP_TOKENS.ink} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 14, color: r.stock === 0 ? HP_TOKENS.inkMute : HP_TOKENS.ink }}>{r.title}</div>
                {r.description && (
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontSize: 11, marginTop: 2 }}>{r.description}</div>
                )}
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginTop: 4 }}>
                  <span style={{ color: HP_TOKENS.blue }}>{r.points} POIN</span>
                  <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span>
                  STOK: <span style={{ color: r.stock < 5 ? HP_TOKENS.coral : HP_TOKENS.sage, fontWeight: 900 }}>{r.stock}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => handleEditReward(r)}
                  className="hp-tap"
                  style={{
                    padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: '#fff', color: HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteReward(r.id)}
                  className="hp-tap"
                  style={{
                    width: 34, height: 34, borderRadius: 10, border: 'none',
                    background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <HPGlyph name="close" size={14} color={HP_TOKENS.coral} />
                </button>
              </div>
            </div>
          </HPCard>
        ))}
        {rewards.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute, border: `1.5px dashed ${HP_TOKENS.line}`, borderRadius: 20 }}>
            Inventory kosong. Tambahkan reward pertama Anda!
          </div>
        )}
      </div>
    </div>
  );
}
