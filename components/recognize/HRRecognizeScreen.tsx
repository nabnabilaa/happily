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
  const [currentPage, setCurrentPage] = useState(1);
  if (!state) return null;

  const wishlistId = state.wishlistId || null;
  const rewards = state.rewards || [];
  const wishlistReward = rewards.find((r: any) => r.id === wishlistId);
  const userCoins = state.points ?? 0;

  const sortedRewards = [...rewards].sort((a: any, b: any) => {
    if (a.id === wishlistId) return -1;
    if (b.id === wishlistId) return 1;
    return 0;
  });

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

      {/* Tukar Poin Section */}
      <SectionHeader icon="trophy" label="Tukar Poin" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {(() => {
          const itemsPerPage = 6;
          const totalPages = Math.ceil(sortedRewards.length / itemsPerPage);
          const start = (currentPage - 1) * itemsPerPage;
          const paginatedRewards = sortedRewards.slice(start, start + itemsPerPage);

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
                    background: HP_TOKENS.card, color: HP_TOKENS.inkSoft,
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
