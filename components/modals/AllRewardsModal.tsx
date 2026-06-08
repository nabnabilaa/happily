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

const TONE_CONFIG: Record<string, any> = {
  blue:   { bg: HP_TOKENS.blueWash,   accent: HP_TOKENS.blue,   text: '#00558A', glow: 'rgba(77,168,218,0.12)' },
  yellow: { bg: HP_TOKENS.yellowWash, accent: HP_TOKENS.yellow, text: '#7A5F10', glow: 'rgba(255,190,11,0.12)' },
  sage:   { bg: HP_TOKENS.sageWash,   accent: HP_TOKENS.sage,   text: '#2D5A3D', glow: 'rgba(74,124,89,0.12)' },
  coral:  { bg: '#FEF0ED',            accent: HP_TOKENS.coral,  text: '#8B3A2F', glow: 'rgba(232,139,125,0.15)' },
  lavender: { bg: HP_TOKENS.lavenderSoft, accent: HP_TOKENS.lavender, text: '#4A3A6E', glow: 'rgba(123,104,238,0.12)' },
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
  const { state, updateState, updateUser, user, notify } = useHP();
  const [view, setView] = useState<"available" | "history">("available");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [currentPageAvailable, setCurrentPageAvailable] = useState(1);
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const [confirmReward, setConfirmReward] = useState<any>(null);

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

  const requestRedeem = (reward: any) => {
    if (!state || !user) return;
    if (reward.stock <= 0) {
      notify('Stok Habis', `Maaf, stok "${reward.title}" sedang habis. 🌱`, 'warning');
      return;
    }
    if (state.points < reward.points) {
      notify('Poin Tidak Cukup', `Kamu butuh ${reward.points} poin, tapi baru punya ${state.points} poin. 🌱`, 'warning');
      return;
    }
    setConfirmReward(reward);
  };

  const executeRedeem = async () => {
    if (!state || !user || !confirmReward) return;
    const reward = confirmReward;
    
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
        notify('Gagal', data.error || 'Gagal menukar reward', 'error');
        setRedeeming(false);
        setConfirmReward(null);
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
      
      notify('Reward Ditukar! 🎁', `Kamu berhasil menukarkan "${reward.title}". HR akan segera memprosesnya.`, 'success');
    } catch (e) {
      console.error(e);
      notify('Gagal', 'Gagal menghubungi server.', 'error');
    } finally {
      setRedeeming(false);
      setConfirmReward(null);
    }
  };

  return (
    <Modal title="Semua Reward" onClose={onClose}>
      <div style={{ position: 'relative' }}>
        {confirmReward && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)',
            zIndex: 10, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            borderRadius: 16, padding: 24, textAlign: 'center',
            border: `1.5px solid ${HP_TOKENS.lineSoft}`,
          }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: 20, 
              background: (TONE_CONFIG[confirmReward.tone] || TONE_CONFIG.blue).bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, border: `2px solid ${(TONE_CONFIG[confirmReward.tone] || TONE_CONFIG.blue).accent}30`
            }}>
              <HPGlyph name={confirmReward.glyph || GLYPH_MAP[confirmReward.title] || 'sparkle'} size={32} color={(TONE_CONFIG[confirmReward.tone] || TONE_CONFIG.blue).accent} />
            </div>
            <div style={{ ...HP_TEXT.title, fontSize: 20, marginBottom: 8 }}>Konfirmasi Tukar</div>
            <div style={{ ...HP_TEXT.body, marginBottom: 24, lineHeight: 1.5 }}>
              Tukar <strong style={{ color: HP_TOKENS.ink }}>{confirmReward.points} poin</strong> dengan <br/>
              <strong style={{ color: HP_TOKENS.ink }}>&quot;{confirmReward.title}&quot;</strong>?
            </div>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                onClick={() => setConfirmReward(null)}
                disabled={redeeming}
                style={{
                  flex: 1, padding: '12px', borderRadius: 14, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: HP_TOKENS.paper, color: HP_TOKENS.inkSoft,
                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
                  cursor: redeeming ? 'default' : 'pointer'
                }}
              >
                Batal
              </button>
              <button
                onClick={executeRedeem}
                disabled={redeeming}
                style={{
                  flex: 1, padding: '12px', borderRadius: 14, border: 'none',
                  background: HP_TOKENS.blue, color: '#fff',
                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
                  cursor: redeeming ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                {redeeming ? 'Memproses...' : 'Ya, Tukar'}
              </button>
            </div>
          </div>
        )}        {/* View Toggle */}
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
                const cfg = TONE_CONFIG[reward.tone] ?? TONE_CONFIG.blue;
                const canAfford = userCoins >= reward.points;

                return (
                  <div
                    key={reward.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 18,
                      background: cfg.bg,
                      border: `1.5px solid ${HP_TOKENS.line}`,
                      boxShadow: `0 4px 12px ${cfg.glow}`,
                    }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: `${cfg.accent}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <HPGlyph name={reward.glyph || GLYPH_MAP[reward.title] || 'sparkle'} size={28} color={cfg.accent} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...HP_TEXT.h, fontSize: 14, color: cfg.text }}>{reward.title}</div>
                      <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2, fontSize: 11, lineHeight: 1.3 }}>{reward.description || reward.desc}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 800,
                          background: cfg.accent, color: '#F4F7F9', fontFamily: HP_FONT,
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
                        onClick={() => requestRedeem(reward)}
                        disabled={!canAfford || reward.stock <= 0 || redeeming}
                        style={{
                          padding: '10px 14px', borderRadius: 14, border: 'none',
                          background: (canAfford && reward.stock > 0) ? cfg.accent : HP_TOKENS.lineSoft,
                          color: (canAfford && reward.stock > 0) ? '#fff' : HP_TOKENS.inkFade,
                          fontFamily: HP_FONT, fontWeight: 800, fontSize: 12,
                          cursor: (!canAfford || reward.stock <= 0 || redeeming) ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                          boxShadow: (canAfford && reward.stock > 0) ? `0 4px 12px ${cfg.glow}` : 'none',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}
                        className={(canAfford && reward.stock > 0 && !redeeming) ? 'hp-tap' : ''}
                      >
                        {reward.stock <= 0 ? 'Stok Habis' : 'Tukar Sekarang'}
                        {canAfford && reward.stock > 0 && <HPGlyph name="sparkle" size={12} color="#fff" />}
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
