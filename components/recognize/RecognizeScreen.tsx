"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import RewardCard from "@/components/recognize/RewardCard";

interface RecognizeScreenProps {
  openModal: (name: string, props?: any) => void;
}

export default function RecognizeScreen({ openModal }: RecognizeScreenProps) {
  const { state, updateState } = useHP();
  const [currentPage, setCurrentPage] = useState(1);

  if (!state) return null;

  const rewards = state.rewards || [];
  const wishlistId = state.wishlistId || null;
  const userCoins = state.coins ?? state.points ?? 0;

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Rewards" subtitle="Tukarkan poin atau pantau wishlist kamu" />

      {/* Hero Banner Card: Full-Width Points Display */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '28px 26px',
        borderRadius: 24,
        background: '#2563EB',
        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
        marginBottom: 28,
        overflow: 'hidden'
      }}>

        {/* Left Column: Title & Point Counter */}
        <div style={{ zIndex: 2 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 900,
            color: 'rgba(255, 255, 255, 0.9)',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6
          }}>
            <HPGlyph name="sparkle" size={14} color="#60A5FA" />
            POIN BELANJA
          </div>

          <div style={{
            fontSize: 38,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-1px',
            lineHeight: 1,
            textShadow: '0 4px 16px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'baseline',
            gap: 8
          }}>
            {userCoins.toLocaleString()}
            <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255, 255, 255, 0.85)' }}>poin</span>
          </div>
        </div>

        {/* Right Column: 3D Glowing Trophy Accent */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          zIndex: 2,
          fontSize: 36
        }}>
          🏆
        </div>
      </div>

      {/* Section Header: Reward Tersedia */}
      <SectionHeader icon="sparkle" label="Reward Tersedia" />

      {/* Mixed Size Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: 18,
        marginTop: 16
      }}>
        {(() => {
          const sortedRewards = [...(state.rewards || [])].sort((a: any, b: any) => {
            if (a.id === wishlistId) return -1;
            if (b.id === wishlistId) return 1;
            return 0;
          });
          const itemsPerPage = 6;
          const totalPages = Math.ceil(sortedRewards.length / itemsPerPage);
          const start = (currentPage - 1) * itemsPerPage;
          const currentRewards = sortedRewards.slice(start, start + itemsPerPage);

          return (
            <>
              {currentRewards.map((r: any, idx: number) => {
                const isFullWidth = r.id === wishlistId;
                return (
                  <div
                    key={r.id}
                    style={{
                      opacity: r.stock === 0 ? 0.6 : 1,
                      pointerEvents: r.stock === 0 ? 'none' : 'auto'
                    }}
                  >
                    <RewardCard
                      title={r.title}
                      points={r.points}
                      tone={r.tone as any}
                      glyph={r.glyph}
                      category={r.category}
                      description={r.description}
                      index={idx}
                      isWishlist={wishlistId === r.id}
                      isFullWidth={isFullWidth}
                      onToggleWishlist={(e) => {
                        e.stopPropagation();
                        updateState((s: any) => ({
                          ...s,
                          wishlistId: s.wishlistId === r.id ? null : r.id
                        }));
                      }}
                      onRedeem={() => openModal('all_rewards', { selected: r.id })}
                    />
                  </div>
                );
              })}

              {/* Empty State */}
              {rewards.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: 40,
                  color: HP_TOKENS.inkMute,
                  border: `1.5px dashed ${HP_TOKENS.line}`,
                  borderRadius: 20,
                  background: HP_TOKENS.card
                }}>
                  Belum ada reward tersedia.
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  justify: 'center',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 16
                }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 12,
                      border: `1.5px solid ${HP_TOKENS.line}`,
                      background: currentPage === 1 ? HP_TOKENS.lineSoft : '#fff',
                      color: currentPage === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                      fontFamily: HP_FONT,
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: currentPage === 1 ? 'default' : 'pointer',
                      opacity: currentPage === 1 ? 0.6 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    Sebelumnya
                  </button>

                  <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 800, color: HP_TOKENS.inkSoft }}>
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 12,
                      border: `1.5px solid ${HP_TOKENS.line}`,
                      background: currentPage === totalPages ? HP_TOKENS.lineSoft : '#fff',
                      color: currentPage === totalPages ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                      fontFamily: HP_FONT,
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: currentPage === totalPages ? 'default' : 'pointer',
                      opacity: currentPage === totalPages ? 0.6 : 1,
                      transition: 'all 0.2s'
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

      {/* Riwayat Penukaran */}
      <div style={{ marginTop: 36 }}>
        <SectionHeader icon="clock" label="Riwayat Penukaran" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {(!state.rewardHistory || state.rewardHistory.length === 0) ? (
            <div style={{
              textAlign: 'center',
              padding: 24,
              color: HP_TOKENS.inkMute,
              border: `1.5px dashed ${HP_TOKENS.line}`,
              borderRadius: 20,
              background: HP_TOKENS.card
            }}>
              Belum ada riwayat penukaran.
            </div>
          ) : (
            state.rewardHistory.map((h: any, idx: number) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '16px 20px',
                borderRadius: 20,
                border: `1.5px solid ${HP_TOKENS.lineSoft}`,
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: HP_TOKENS.blueWash,
                    color: HP_TOKENS.blue,
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center'
                  }}>
                    <HPGlyph name="gift" size={20} />
                  </div>
                  <div>
                    <div style={{ ...HP_TEXT.h, fontSize: 14, fontWeight: 900 }}>{h.title}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                      {new Date(h.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ ...HP_TEXT.h, fontSize: 15, fontWeight: 900, color: HP_TOKENS.coral }}>
                  -{h.points} pts
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}



