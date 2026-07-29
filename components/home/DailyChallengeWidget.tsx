"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import { HPButton } from "@/components/ui";
import SectionHeader from "@/components/home/SectionHeader";
import { scrollIntoViewSafely } from "@/lib/motion";

/**
 * Nudge harian.
 *
 * Daftar misi, pemeriksaan selesai, dan status klaim semuanya datang dari
 * /api/nudges — lihat lib/nudges.ts. Komponen ini hanya menampilkan.
 *
 * Sebelumnya ketiganya ada di sini: definisi misi beserta `check(state)` yang
 * membaca state klien, dan daftar klaim di localStorage. Dua akibatnya nyata —
 * membersihkan storage (atau membuka dari browser lain) membuat seluruh misi
 * hari itu bisa diklaim ulang, dan satu misi punya pemeriksa yang selalu
 * mengembalikan false sehingga hanya bisa diklaim lewat "sudah menekan tombol".
 * Poin dibayar untuk menekan tombol, bukan untuk mengerjakan sesuatu.
 */
interface NudgeMissionView {
  id: string;
  title: string;
  desc: string;
  glyph: string;
  actionLabel: string;
  target: { modal?: string; scrollTo?: string; tab?: string };
  done: boolean;
  claimed: boolean;
}

const NUDGE_POINTS = 10;

export default function DailyChallengeWidget({ openModal, onClaimReward }: { openModal: any, onClaimReward?: (points: number, title: string) => void }) {
  const { state, user, notify } = useHP();
  const [missions, setMissions] = useState<NudgeMissionView[]>([]);
  const [hoveredMission, setHoveredMission] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/nudges');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.missions)) setMissions(data.missions);
    } catch {
      // Widget hiasan — kegagalannya tidak boleh mengganggu layar utama.
    }
  }, [user?.id]);

  // Muat ulang setiap kali ada poin berubah: menyelesaikan task atau mengisi
  // mood bisa membuat sebuah misi jadi bisa diklaim, dan status itu hanya
  // diketahui server.
  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('hp_points_changed', onChange);
    return () => window.removeEventListener('hp_points_changed', onChange);
  }, [load]);

  const claimReward = useCallback(async (mission: NudgeMissionView) => {
    if (mission.claimed || claiming) return;
    setClaiming(mission.id);
    try {
      const res = await fetch('/api/nudges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: mission.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        notify('Belum bisa diklaim', data.error || 'Coba lagi sebentar.', 'warning');
        await load();
        return;
      }

      setMissions(prev => prev.map(m => m.id === mission.id ? { ...m, claimed: true } : m));

      if (onClaimReward) onClaimReward(data.awarded ?? NUDGE_POINTS, mission.title);
      else notify('Misi Selesai! 🎉', `+${data.awarded ?? NUDGE_POINTS} Poin`, 'success');

      // Saldo di header ikut poin yang baru saja diberikan.
      window.dispatchEvent(new CustomEvent('hp_points_changed'));
    } catch {
      notify('Gagal klaim', 'Periksa koneksimu lalu coba lagi.', 'error');
    } finally {
      setClaiming(null);
    }
  }, [claiming, notify, onClaimReward, load]);

  const runAction = useCallback((mission: NudgeMissionView) => {
    const t = mission.target || {};
    if (t.modal) return openModal(t.modal);
    if (t.tab) return window.dispatchEvent(new CustomEvent('set_tab', { detail: t.tab }));
    if (t.scrollTo) {
      scrollIntoViewSafely(document.getElementById(t.scrollTo), { behavior: 'smooth', block: 'start' });
    }
  }, [openModal]);

  if (!state || !user || missions.length === 0) return null;

  const activeMissions = missions;
  const currentXP = missions.filter(m => m.claimed).length * NUDGE_POINTS;
  const maxXP = missions.length * NUDGE_POINTS;

  const milestones = [
    { target: Math.floor(maxXP * 0.33), glyph: 'medal', label: 'Bronze' },
    { target: Math.floor(maxXP * 0.66), glyph: 'medal', label: 'Silver' },
    { target: maxXP, glyph: 'trophy', label: 'Gold' },
  ];

  return (
    // Spacing between blocks belongs to the screen's layout gap, not to the
    // widget — a self-applied marginTop stacks on top of it and breaks rhythm.
    <section>
      <style>{`
        .daily-mission-content {
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .daily-mission-action {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 120px;
        }
        .daily-mission-xp {
          margin-bottom: 8px;
        }
        @media (max-width: 600px) {
          .daily-mission-item {
             flex-direction: column;
             align-items: stretch !important;
             gap: 12px !important;
          }
          .daily-mission-info {
             align-items: flex-start !important;
          }
          .daily-mission-action {
            flex-direction: row;
            width: 100%;
            justify-content: space-between;
            align-items: center;
            min-width: 0;
          }
          .daily-mission-xp {
             margin-bottom: 0 !important;
             white-space: nowrap;
          }
        }
      `}</style>
      <SectionHeader 
        icon="sparkle" 
        label="Nudge Harian" 
        count={`${missions.filter(m => m.claimed).length}/${missions.length}`}
      />

      <div style={{
        overflow: 'hidden',
        border: `1px solid var(--hp-line)`,
        borderRadius: HP_TOKENS.radiusLg,
        background: HP_TOKENS.card,
        boxShadow: HP_TOKENS.shadowSm,
      }}>
        {/*
          Header: the day's XP and the three milestones on the way to it.

          Two wrong answers before this one. First a saturated primary block
          with white text and emoji medals — the loudest thing on the dashboard
          for what is only a status. Then a grey `sunken` slab, which fixed the
          shouting by making the whole widget look disabled.

          The energy has to come from hierarchy, not fill: the card surface
          stays white, and the XP count carries the weight as a real metric
          figure. Honey marks what you've earned, and nothing else is tinted.
        */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: `1px solid ${HP_TOKENS.lineSoft}`,
          background: `linear-gradient(135deg, rgba(232, 163, 23, 0.08) 0%, transparent 100%)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...HP_TEXT.tiny, marginBottom: 4, color: HP_TOKENS.yellowInk, fontWeight: 750, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Daily quests</div>
              <div style={{ ...HP_TEXT.h, color: HP_TOKENS.ink }}>
                Selesaikan misi, kumpulkan poin
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0, background: HP_TOKENS.yellowSoft, padding: '4px 12px', borderRadius: HP_TOKENS.radiusPill, border: `1px solid ${HP_TOKENS.yellow}` }}>
              <span style={{ ...HP_TEXT.metric, color: HP_TOKENS.yellowInk }}>{currentXP}</span>
              <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>/ {maxXP} XP</span>
            </div>
          </div>

          {/* Track. The milestone markers sit on it, so the bar is hand-built
              rather than an HPBar — same radius, one step thicker so the
              markers have something to sit on. */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <div style={{
              height: 10,
              background: `rgba(232, 163, 23, 0.18)`,
              borderRadius: HP_TOKENS.radiusPill,
              border: `1px solid ${HP_TOKENS.yellowSoft}`,
            }}>
              <div style={{
                width: `${Math.min(100, (currentXP / maxXP) * 100)}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${HP_TOKENS.yellow}, ${HP_TOKENS.yellowDark})`,
                borderRadius: HP_TOKENS.radiusPill,
                transition: 'width 320ms var(--hp-ease-out)',
                boxShadow: HP_TOKENS.shadowSm,
              }} />
            </div>

            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {milestones.map((ms, idx) => {
                const progressPct = (ms.target / maxXP) * 100;
                const isAchieved = currentXP >= ms.target;
                return (
                  <div
                    key={`dot-${idx}`}
                    title={`${ms.label} · ${ms.target} XP`}
                    style={{
                      position: 'absolute', top: '50%', left: `${progressPct}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 28, height: 28, borderRadius: HP_TOKENS.radiusPill,
                      background: isAchieved ? HP_TOKENS.yellow : HP_TOKENS.card,
                      // A hairline on a pale track made these vanish. An
                      // unearned milestone still has to be legible — it is the
                      // thing you're aiming at.
                      border: `2px solid ${isAchieved ? HP_TOKENS.yellow : HP_TOKENS.lineStrong}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background-color 220ms var(--hp-ease), border-color 220ms var(--hp-ease)',
                    }}
                  >
                    <HPGlyph
                      name={ms.glyph}
                      size={14}
                      color={isAchieved ? HP_TOKENS.yellowDark : HP_TOKENS.inkMute}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Labels under the track */}
          <div style={{ position: 'relative', height: 14 }}>
            {milestones.map((ms, idx) => {
              const progressPct = (ms.target / maxXP) * 100;
              const isAchieved = currentXP >= ms.target;
              return (
                <div key={`lbl-${idx}`} style={{
                  ...HP_TEXT.small,
                  position: 'absolute', left: `${progressPct}%`,
                  transform: 'translateX(-50%)',
                  fontSize: 11,
                  fontVariantNumeric: 'tabular-nums',
                  color: isAchieved ? HP_TOKENS.ink : HP_TOKENS.inkMute,
                  whiteSpace: 'nowrap',
                }}>
                  {ms.target} XP
                </div>
              );
            })}
          </div>
        </div>

        {/* Misi List */}
        <div style={{ padding: '12px 16px 16px' }}>
          {activeMissions.map((c, i) => {
            // `done` dan `claimed` keduanya keputusan server. Klien tidak lagi
            // punya suara soal apakah sebuah misi layak dibayar.
            const isCompleted = c.done;
            const isClaimed = c.claimed;
            const canClaim = isCompleted && !isClaimed;
            const isHovered = hoveredMission === c.id;

            return (
              <div 
                key={c.id}
                className="daily-mission-item"
                onMouseEnter={() => setHoveredMission(c.id)}
                onMouseLeave={() => setHoveredMission(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderRadius: HP_TOKENS.radiusMd,
                  marginBottom: 8,
                  background: isClaimed
                    ? 'transparent'
                    : canClaim
                    ? HP_TOKENS.yellowWash
                    : 'transparent',
                  border: `1px solid ${
                    canClaim ? HP_TOKENS.yellowSoft
                    : isClaimed ? HP_TOKENS.lineSoft
                    : HP_TOKENS.lineSoft
                  }`,
                  opacity: isClaimed ? 0.6 : 1,
                  boxShadow: canClaim ? `0 4px 12px rgba(232,163,23,0.12)` : (isHovered && !isClaimed ? '0 2px 8px rgba(0,0,0,0.03)' : 'none'),
                  transform: (isHovered && !isClaimed) ? 'translateY(-1px)' : 'none',
                  transition: 'all 220ms var(--hp-ease)',
                }}
              >
                <div className="daily-mission-info" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  {/* Three states, three tints — claimed, ready to claim, and
                      still to do. Grey for all three read as four disabled
                      rows; the tint is state, not decoration, so it stays
                      inside the one-accent rule. */}
                  <div style={{
                    width: 44, height: 44, borderRadius: HP_TOKENS.radiusMd, flexShrink: 0,
                    background: isClaimed
                      ? HP_TOKENS.successSoft
                      : isCompleted ? HP_TOKENS.yellowSoft : HP_TOKENS.yellowWash,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background-color 220ms var(--hp-ease)',
                  }}>
                    {isClaimed ? (
                      <HPGlyph name="check" size={22} color={HP_TOKENS.successInk} stroke={3} />
                    ) : (
                      <HPGlyph
                        name={c.glyph}
                        size={20}
                        color={isCompleted ? HP_TOKENS.yellowDark : HP_TOKENS.yellowDark}
                      />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      ...HP_TEXT.sub, fontSize: 14,
                      color: isClaimed ? HP_TOKENS.inkMute : HP_TOKENS.ink,
                    }}>
                      {c.title}
                    </div>
                    <div style={{ ...HP_TEXT.small, marginTop: 2, lineHeight: 1.35 }}>
                      {c.desc}
                    </div>
                  </div>
                </div>

                {/* Action Area */}
                <div className="daily-mission-action">
                    <div className="daily-mission-xp" style={{
                      ...HP_TEXT.tiny,
                      color: isClaimed ? HP_TOKENS.inkMute : HP_TOKENS.yellowDark,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <HPGlyph name="zap" size={12} color="currentColor" />
                      +{NUDGE_POINTS} Poin
                    </div>

                    {canClaim ? (
                      <HPButton
                        size="sm"
                        variant="primary"
                        onClick={() => claimReward(c)}
                        disabled={claiming === c.id}
                        style={{ background: HP_TOKENS.yellow, color: HP_TOKENS.ink }}
                      >
                        Klaim
                      </HPButton>
                    ) : isClaimed ? (
                      <div style={{
                        ...HP_TEXT.tiny,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        color: HP_TOKENS.successInk,
                        padding: '6px 12px', borderRadius: HP_TOKENS.radiusPill,
                        background: HP_TOKENS.successWash,
                      }}>
                        <HPGlyph name="check" size={12} color="currentColor" stroke={3} />
                        Selesai
                      </div>
                    ) : (
                      <HPButton
                        size="sm"
                        variant="secondary"
                        iconEnd="chevronRight"
                        style={{ 
                          border: isHovered ? `1px solid ${HP_TOKENS.yellow}` : '1px solid var(--hp-line)',
                          color: isHovered ? HP_TOKENS.yellowDark : undefined, 
                          background: isHovered ? HP_TOKENS.yellowWash : undefined 
                        }}
                        onClick={() => runAction(c)}
                      >
                        {c.actionLabel}
                      </HPButton>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
