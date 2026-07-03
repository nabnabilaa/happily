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
  const { state, updateState } = useHP();
  if (!state) return null;

  const wishlistId = state.wishlistId || null;
  const rewards = state.rewards || [];
  const wishlistReward = rewards.find((r: any) => r.id === wishlistId);
  const userCoins = state.points ?? 0;
  
  const [currentPage, setCurrentPage] = useState(1);

  const sortedRewards = [...rewards].sort((a: any, b: any) => {
    if (a.id === wishlistId) return -1;
    if (b.id === wishlistId) return 1;
    return 0;
  });

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Rewards" subtitle="Tukarkan poin atau pantau wishlist kamu" />

      {/* Points badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: '24px 20px', borderRadius: 24,
        background: `linear-gradient(135deg, ${HP_TOKENS.primary}, #E65A20)`,
        boxShadow: '0 12px 32px rgba(255, 107, 53, 0.25)',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', right: -20, top: -40, width: 120, height: 120, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', filter: 'blur(20px)' }} />
        
        <div style={{ 
          width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.2)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)', zIndex: 1
        }}>
          <span style={{ fontSize: 36 }}>🏆</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1 }}>
          <div style={{ ...HP_TEXT.tiny, color: 'rgba(255,255,255,0.9)', letterSpacing: 1, fontWeight: 800 }}>POIN BELANJA</div>
          <div style={{ ...HP_TEXT.display, fontSize: 36, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {userCoins.toLocaleString()} <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>poin</span>
          </div>
        </div>
      </div>

      {/* Rewards */}
      <SectionHeader icon="trophy" label="Reward Tersedia" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {(() => {
          const itemsPerPage = 6;
          const totalPages = Math.ceil(sortedRewards.length / itemsPerPage);
          const start = (currentPage - 1) * itemsPerPage;
          const currentRewards = sortedRewards.slice(start, start + itemsPerPage);

          return (
            <>
              {currentRewards.map((r: any) => (
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
                    isWishlist={wishlistId === r.id}
                    onToggleWishlist={(e) => {
                      e.stopPropagation();
                      updateState((s: any) => ({
                        ...s,
                        wishlistId: s.wishlistId === r.id ? null : r.id
                      }));
                    }}
                  />
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
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

      {/* Riwayat Penukaran */}
      <div style={{ marginTop: 32, marginBottom: 32 }}>
        <SectionHeader icon="clock" label="Riwayat Penukaran" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(!state.rewardHistory || state.rewardHistory.length === 0) ? (
            <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute, border: `1.5px dashed ${HP_TOKENS.line}`, borderRadius: 20 }}>
              Belum ada riwayat penukaran.
            </div>
          ) : (
            state.rewardHistory.map((h: any, idx: number) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px', borderRadius: 16, border: `1.5px solid ${HP_TOKENS.lineSoft}`,
                background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: HP_TOKENS.blueWash, color: HP_TOKENS.blue,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <HPGlyph name="gift" size={20} />
                  </div>
                  <div>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{h.title}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                      {new Date(h.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.coral }}>
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
