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

      {/* Gamified Hero Banner */}
      <HPCard 
        style={{ 
          background: `linear-gradient(135deg, ${HP_TOKENS.primaryLight}, ${HP_TOKENS.primary})`,
          border: 'none', 
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden'
        }} 
        padding={24}
      >
        <div style={{ position: 'absolute', right: -20, top: -40, width: 150, height: 150, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)' }} />
        <div style={{ position: 'absolute', left: '20%', bottom: -30, width: 100, height: 100, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(15px)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {wishlistReward ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ ...HP_TEXT.display, color: '#fff', fontSize: 36, marginBottom: 4, textShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FFEC99, #FFD43B)',
                    border: '2px solid #F59F00',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 8px rgba(245, 159, 0, 0.4)'
                  }}>
                    <HPGlyph name="star" size={16} color="#E67700" />
                  </div>
                  <div>
                    {userCoins.toLocaleString()} <span style={{ fontSize: 18, fontWeight: 700, opacity: 0.9 }}>poin</span>
                  </div>
                </div>
                <div style={{ ...HP_TEXT.body, color: '#fff', opacity: 0.9 }}>
                  {userCoins >= wishlistReward.points 
                    ? `Selamat! Poin kamu cukup untuk menukar ${wishlistReward.title}!` 
                    : `${(wishlistReward.points - userCoins).toLocaleString()} poin lagi menuju wishlist-mu! 🔥`}
                </div>
              </div>
              <div style={{ 
                width: 60, height: 60, borderRadius: 20, background: 'rgba(255,255,255,0.2)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)'
              }}>
                <HPGlyph name="star" size={32} color="#FFD43B" />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ ...HP_TEXT.display, color: '#fff', fontSize: 36, marginBottom: 4, textShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FFEC99, #FFD43B)',
                    border: '2px solid #F59F00',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 8px rgba(245, 159, 0, 0.4)'
                  }}>
                    <HPGlyph name="star" size={16} color="#E67700" />
                  </div>
                  <div>
                    {userCoins.toLocaleString()} <span style={{ fontSize: 18, fontWeight: 700, opacity: 0.9 }}>poin</span>
                  </div>
                </div>
                <div style={{ ...HP_TEXT.body, color: '#fff', opacity: 0.9 }}>
                  Kumpulkan terus poinmu dan jadikan reward favorit sebagai Wishlist! 🎁
                </div>
              </div>
              <div style={{ 
                width: 60, height: 60, borderRadius: 20, background: 'rgba(255,255,255,0.2)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)'
              }}>
                <HPGlyph name="trophy" size={32} color="#FFD43B" />
              </div>
            </div>
          )}
        </div>
      </HPCard>

      {/* Rewards */}
      <SectionHeader icon="trophy" label="Reward Tersedia" action="Semua" onAction={() => openModal('all_rewards')} />
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
    </div>
  );
}
