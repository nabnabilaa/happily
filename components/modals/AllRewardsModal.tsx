"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface AllRewardsModalProps {
  onClose: () => void;
}

const CATEGORIES = ["Semua", "Wellbeing", "Lifestyle", "Growth", "Impact"];

const toneConfig: Record<string, { bg: string; soft: string; text: string }> = {
  sage:     { bg: HP_TOKENS.sage,   soft: HP_TOKENS.sageWash,   text: '#2D5A3D' },
  yellow:   { bg: HP_TOKENS.yellow, soft: HP_TOKENS.yellowWash,  text: '#7A5F10' },
  blue:     { bg: HP_TOKENS.blue,   soft: HP_TOKENS.blueWash,    text: '#234A72' },
  coral:    { bg: HP_TOKENS.coral,  soft: '#FEF0ED',             text: '#8B3A2F' },
  lavender: { bg: HP_TOKENS.lavender, soft: HP_TOKENS.lavenderSoft, text: '#4A3A6E' },
};

const GLYPH_MAP: Record<string, string> = {
  'Extra cuti 1 hari':     'tree',
  'Voucher lunch 100k':    'heart',
  'Workshop UX intensif':  'book',
  'Donasi program sosial': 'leaf',
  'Tiket bioskop 2x':      'star',
  'Pulsa / e-wallet 50k':  'zap',
  'Voucher belanja 200k':  'target',
  'Kelas online premium':  'refresh',
  'Sesi wellness 1:1':     'people',
};

export default function AllRewardsModal({ onClose }: AllRewardsModalProps) {
  const { state, updateState, updateUser, user } = useHP();
  const [view, setView] = useState<"available" | "history">("available");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [currentPageAvailable, setCurrentPageAvailable] = useState(1);
  const [currentPageHistory, setCurrentPageHistory] = useState(1);

  const rewards = state?.rewards || [];
  const history = state?.rewardHistory || [];
  const userCoins = state?.coins ?? state?.points ?? 0;

  const filtered = activeCategory === "Semua"
    ? rewards
    : rewards.filter(r => r.category === activeCategory);

  useEffect(() => {
    setCurrentPageAvailable(1);
  }, [activeCategory]);

  const availablePerPage = 5;
  const totalPagesAvailable = Math.ceil(filtered.length / availablePerPage);
  const activePageAvailable = Math.min(currentPageAvailable, Math.max(1, totalPagesAvailable));
  const paginatedAvailable = filtered.slice((activePageAvailable - 1) * availablePerPage, activePageAvailable * availablePerPage);

  const historyPerPage = 5;
  const totalPagesHistory = Math.ceil(history.length / historyPerPage);
  const activePageHistory = Math.min(currentPageHistory, Math.max(1, totalPagesHistory));
  const reversedHistory = [...history].reverse();
  const paginatedHistory = reversedHistory.slice((activePageHistory - 1) * historyPerPage, activePageHistory * historyPerPage);

  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async (reward: any) => {
    if (!state || !user) return;
    if (reward.stock <= 0) {
      alert(`Maaf, stok "${reward.title}" sedang habis. 🌱`);
      return;
    }
    if (state.points < reward.points) {
      alert(`Poin tidak cukup! Kamu butuh ${reward.points} poin, tapi baru punya ${state.points} poin. 🌱`);
      return;
    }
    
    if (confirm(`Tukar ${reward.points} poin dengan "${reward.title}"?`)) {
      setRedeeming(true);
      try {
        const res = await fetch('/api/rewards/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            userName: user.name,
            rewardId: reward.id,
            rewardTitle: reward.title,
            rewardPoints: reward.points,
            rewardType: reward.category
          })
        });

        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Gagal menukar reward');
          setRedeeming(false);
          return;
        }

        // Update local state to reflect the change
        updateState((s: any) => ({
          ...s,
          points: data.pointsRemaining,
          coins: data.pointsRemaining,
          rewards: s.rewards.map((r: any) => r.id === reward.id ? { ...r, stock: r.stock - 1 } : r),
          rewardHistory: [
            ...history,
            { id: Date.now(), title: reward.title, points: reward.points, date: new Date().toLocaleDateString('id-ID'), glyph: reward.glyph || 'trophy' }
          ]
        }));
        updateUser({ points: data.pointsRemaining, coins: data.pointsRemaining });
        
        alert(`Berhasil! "${reward.title}" telah ditambahkan ke riwayat reward kamu. HR akan segera memprosesnya. 🎉`);
      } catch (e) {
        console.error(e);
        alert('Gagal menghubungi server.');
      } finally {
        setRedeeming(false);
      }
    }
  };

  return (
    <Modal title="Semua Reward" onClose={onClose}>
      <div style={{ position: 'relative' }}>


        {/* View Toggle */}
        <div style={{
          display: 'flex', background: HP_TOKENS.lineSoft,
          padding: 4, borderRadius: 12, marginBottom: 20
        }}>
          {(["available", "history"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 9,
                background: view === v ? '#fff' : 'transparent',
                boxShadow: view === v ? '0 2px 8px rgba(26,29,35,0.05)' : 'none',
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 13,
                color: view === v ? HP_TOKENS.ink : HP_TOKENS.inkMute,
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <HPGlyph name={v === 'available' ? 'trophy' : 'history'} size={14} color={view === v ? HP_TOKENS.sage : HP_TOKENS.inkMute}/>
              {v === 'available' ? 'Tersedia' : 'Riwayat'}
            </button>
          ))}
        </div>

        {view === "available" ? (
          <>
            {/* Points badge */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '12px 20px', borderRadius: 20,
              background: `linear-gradient(135deg, ${HP_TOKENS.yellowWash}, ${HP_TOKENS.sageWash})`,
              border: `1.5px solid ${HP_TOKENS.yellowSoft}`,
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>POIN BELANJA</div>
                <div style={{ ...HP_TEXT.h, fontSize: 22, color: HP_TOKENS.ink }}>{userCoins.toLocaleString()} poin</div>
              </div>
            </div>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '7px 16px', borderRadius: 99, border: 'none',
                    background: activeCategory === cat ? HP_TOKENS.sage : HP_TOKENS.lineSoft,
                    color: activeCategory === cat ? '#fff' : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Rewards grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paginatedAvailable.map(reward => {
                const cfg = toneConfig[reward.tone] ?? toneConfig.sage;
                const canAfford = userCoins >= reward.points;

                return (
                  <div
                    key={reward.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 18,
                      background: cfg.soft,
                      border: `1.5px solid ${HP_TOKENS.line}`,
                    }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: `${cfg.bg}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <HPGlyph name={reward.glyph || GLYPH_MAP[reward.title] || 'sparkle'} size={28} color={cfg.text} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...HP_TEXT.h, fontSize: 14, color: cfg.text }}>{reward.title}</div>
                      <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2, fontSize: 11, lineHeight: 1.3 }}>{reward.description || reward.desc}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 800,
                          background: cfg.bg, color: '#F4F7F9', fontFamily: HP_FONT,
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <div style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #FFEC99, #FFD43B)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <HPGlyph name="star" size={6} color="#E67700" />
                          </div>
                          {reward.points} POIN
                        </span>
                        <span style={{ 
                          fontSize: 10, fontWeight: 900, 
                          color: reward.stock < 5 ? HP_TOKENS.coral : HP_TOKENS.sage 
                        }}>
                          STOK: {reward.stock}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateState((s: any) => ({
                            ...s,
                            wishlistId: s.wishlistId === reward.id ? null : reward.id
                          }));
                        }}
                        style={{
                          width: 32, height: 32, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: state?.wishlistId === reward.id ? '#FFD43B' : HP_TOKENS.paper,
                          border: `1.5px solid ${state?.wishlistId === reward.id ? '#FCC419' : HP_TOKENS.lineSoft}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: state?.wishlistId === reward.id ? '0 4px 10px rgba(252, 196, 25, 0.3)' : '0 2px 5px rgba(0,0,0,0.05)'
                        }}
                        title={state?.wishlistId === reward.id ? "Hapus dari Wishlist" : "Jadikan Wishlist"}
                        className="hp-tap"
                      >
                        <HPGlyph name="star" size={16} color={state?.wishlistId === reward.id ? '#fff' : HP_TOKENS.inkFade} />
                      </div>

                      <button
                        onClick={() => handleRedeem(reward)}
                        disabled={!canAfford || reward.stock <= 0 || redeeming}
                        style={{
                          padding: '10px 14px', borderRadius: 14, border: 'none',
                          background: (canAfford && reward.stock > 0) ? cfg.bg : HP_TOKENS.lineSoft,
                          color: (canAfford && reward.stock > 0) ? '#fff' : HP_TOKENS.inkFade,
                          fontFamily: HP_FONT, fontWeight: 800, fontSize: 12,
                          cursor: (!canAfford || reward.stock <= 0 || redeeming) ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {reward.stock <= 0 ? 'Stok Habis' : redeeming ? 'Memproses...' : 'Tukar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPagesAvailable > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button 
                  onClick={() => setCurrentPageAvailable(p => Math.max(1, p - 1))}
                  disabled={activePageAvailable === 1}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: activePageAvailable === 1 ? HP_TOKENS.lineSoft : '#fff',
                    color: activePageAvailable === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                    cursor: activePageAvailable === 1 ? 'default' : 'pointer',
                    opacity: activePageAvailable === 1 ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Sebelumnya
                </button>
                <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                  {activePageAvailable} / {totalPagesAvailable}
                </span>
                <button 
                  onClick={() => setCurrentPageAvailable(p => Math.min(totalPagesAvailable, p + 1))}
                  disabled={activePageAvailable === totalPagesAvailable}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: activePageAvailable === totalPagesAvailable ? HP_TOKENS.lineSoft : '#fff',
                    color: activePageAvailable === totalPagesAvailable ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                    cursor: activePageAvailable === totalPagesAvailable ? 'default' : 'pointer',
                    opacity: activePageAvailable === totalPagesAvailable ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: HP_TOKENS.inkMute }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏜️</div>
                <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Belum ada reward yang ditukar.</div>
                <div style={{ ...HP_TEXT.body, fontSize: 13, marginTop: 4 }}>Ayo kumpulkan poin dengan memberi apresiasi!</div>
              </div>
            ) : (
              paginatedHistory.map((h: any, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 18,
                  background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.lineSoft}`,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: HP_TOKENS.lineSoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <HPGlyph name={h.glyph || 'sparkle'} size={22} color={HP_TOKENS.ink} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{h.title}</div>
                    <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontSize: 11 }}>Ditukar pada {h.date}</div>
                  </div>
                  <div style={{ ...HP_TEXT.small, fontWeight: 800, color: HP_TOKENS.sage }}>
                    -{h.points}
                  </div>
                </div>
              ))
            )}

            {/* Pagination Controls */}
            {totalPagesHistory > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button 
                  onClick={() => setCurrentPageHistory(p => Math.max(1, p - 1))}
                  disabled={activePageHistory === 1}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: activePageHistory === 1 ? HP_TOKENS.lineSoft : '#fff',
                    color: activePageHistory === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                    cursor: activePageHistory === 1 ? 'default' : 'pointer',
                    opacity: activePageHistory === 1 ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Sebelumnya
                </button>
                <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                  {activePageHistory} / {totalPagesHistory}
                </span>
                <button 
                  onClick={() => setCurrentPageHistory(p => Math.min(totalPagesHistory, p + 1))}
                  disabled={activePageHistory === totalPagesHistory}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: activePageHistory === totalPagesHistory ? HP_TOKENS.lineSoft : '#fff',
                    color: activePageHistory === totalPagesHistory ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                    cursor: activePageHistory === totalPagesHistory ? 'default' : 'pointer',
                    opacity: activePageHistory === totalPagesHistory ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>


    </Modal>
  );
}
