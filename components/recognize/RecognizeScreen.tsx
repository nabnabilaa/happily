"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import StatBlock from "@/components/recognize/StatBlock";
import RewardCard from "@/components/recognize/RewardCard";

interface RecognizeScreenProps {
  openModal: (name: string, props?: any) => void;
}

import { useState } from "react";

export default function RecognizeScreen({ openModal }: RecognizeScreenProps) {
  const { state } = useHP();
  const [currentPage, setCurrentPage] = useState(1);

  if (!state) return null;

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Rewards" subtitle="Tukarkan poin kamu dengan berbagai hadiah menarik"/>

      <HPCard style={{ background: `linear-gradient(135deg, ${HP_TOKENS.yellowWash}, ${HP_TOKENS.sageWash})`, border: 'none', marginBottom: 20 }} padding={16}>
        <div style={{ display: 'flex', gap: 20 }}>
          <StatBlock label="Koin kamu" value={(state.coins ?? state.points).toLocaleString()} icon="trophy" tone="yellow"/>
        </div>
      </HPCard>

      <SectionHeader 
        icon="trophy" 
        label="Tukar poin" 
        action="Semua"
        onAction={() => openModal('all_rewards')}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(() => {
          const rewards = state.rewards || [];
          const itemsPerPage = 4;
          const totalPages = Math.ceil(rewards.length / itemsPerPage);
          const start = (currentPage - 1) * itemsPerPage;
          const paginatedRewards = rewards.slice(start, start + itemsPerPage);

          return (
            <>
              {paginatedRewards.map((r: any) => (
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
              
              {/* Empty State */}
              {rewards.length === 0 && (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute, border: `1.5px dashed ${HP_TOKENS.line}`, borderRadius: 20 }}>
                  Belum ada reward tersedia.
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                      background: currentPage === 1 ? HP_TOKENS.lineSoft : '#fff',
                      color: currentPage === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                      fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                      cursor: currentPage === 1 ? 'default' : 'pointer',
                      opacity: currentPage === 1 ? 0.6 : 1, transition: 'all 0.2s'
                    }}
                  >
                    Sebelumnya
                  </button>
                  <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                      background: currentPage === totalPages ? HP_TOKENS.lineSoft : '#fff',
                      color: currentPage === totalPages ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                      fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                      cursor: currentPage === totalPages ? 'default' : 'pointer',
                      opacity: currentPage === totalPages ? 0.6 : 1, transition: 'all 0.2s'
                    }}
                  >
                    Berikutnya
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

