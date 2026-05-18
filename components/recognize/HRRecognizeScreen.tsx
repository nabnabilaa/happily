"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";

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
      <ScreenHeader title="Rewards" subtitle="Kelola inventory reward organisasi" />

      {/* Reward management */}
      <SectionHeader icon="trophy" label="Kelola Inventory Reward" action="+ Add Reward" onAction={handleAddReward} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rewards.map((r: any) => (
          <HPCard key={r.id} padding={16} style={{ border: r.stock === 0 ? `1.5px solid ${HP_TOKENS.coral}40` : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: HP_TOKENS[r.tone as keyof typeof HP_TOKENS] + '15' || HP_TOKENS.lineSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                opacity: r.stock === 0 ? 0.5 : 1
              }}>
                {r.title.toLowerCase().includes('cuti') ? '🏖️' : r.title.toLowerCase().includes('lunch') ? '🍱' : r.title.toLowerCase().includes('workshop') ? '🎨' : '🎁'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 14, color: r.stock === 0 ? HP_TOKENS.inkMute : HP_TOKENS.ink }}>{r.title}</div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginTop: 4 }}>
                  <span style={{ color: HP_TOKENS.blue }}>{r.points} KOIN</span>
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
