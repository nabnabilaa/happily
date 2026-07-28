"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import { HPButton } from "@/components/ui";
import SectionHeader from "@/components/home/SectionHeader";

// ── Daily Nudges (Wellbeing-focused) ──────────────────────────
const getTodayStr = () => new Date().toISOString().slice(0, 10);

const DAILY_MISSIONS = [
  { id: 'dm_mood', title: 'Cek Ombak Pagi', desc: 'Isi Mood Check-in untuk memulai hari.', glyph: 'heart', points: 10, actionLabel: 'Cek Mood', action: (openModal: any) => openModal('checkin'), check: (s: any) => !!s.lastMoodCheckIn && s.lastMoodCheckIn.startsWith(getTodayStr()) },
  { id: 'dm_focus', title: 'Fokus 15 Menit', desc: 'Lakukan sesi Pomodoro untuk pemanasan kerja.', glyph: 'hourglass', points: 20, actionLabel: 'Mulai Fokus', action: (openModal: any) => openModal('focus'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'focus_session' && (l.created_at || '').startsWith(getTodayStr())) },
  { id: 'dm_task', title: 'Pecah Telur', desc: 'Pilih 1 tugas prioritas dan selesaikan hari ini.', glyph: 'target', points: 20, actionLabel: 'Fokus Task', action: () => document.getElementById('daily-training-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), check: (s: any) => (s.priorities || []).filter((p: any) => p.done).length >= 1 },
  { id: 'dm_plan', title: 'Rencana Jitu', desc: 'Tambahkan minimal 3 tugas ke daftar prioritasmu.', glyph: 'note', points: 10, actionLabel: 'Susun Task', action: (openModal: any) => openModal('manage_priorities'), check: (s: any) => (s.priorities || []).length >= 3 },
  { id: 'dm_kudos', title: 'Tebar Kebaikan', desc: 'Kirim apresiasi atau kudos ke rekan kerjamu.', glyph: 'star', points: 15, actionLabel: 'Kirim Kudos', action: (openModal: any) => openModal('appreciate'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'kudos_sent' && (l.created_at || '').startsWith(getTodayStr())) },
  { id: 'dm_coach', title: 'Sapa Sang Pelatih', desc: 'Buka Coach AI dan minta 1 saran hari ini.', glyph: 'sparkle', points: 10, actionLabel: 'Tanya Coach', action: (openModal: any) => openModal('coach'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'ai_coach' && (l.created_at || '').startsWith(getTodayStr())) },
  { id: 'dm_pause', title: 'Jeda Sejenak', desc: 'Lakukan sesi pernapasan singkat (1 menit).', glyph: 'leaf', points: 15, actionLabel: 'Mulai Napas', action: (openModal: any) => openModal('pause'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'pause_session' && (l.created_at || '').startsWith(getTodayStr())) },
  {
    id: 'dm_training',
    title: 'Daily Training',
    desc: 'Tandai selesai minimal 1 latihan/habit hari ini.',
    glyph: 'activity', points: 20,
    actionLabel: (s: any) => (s.habits && s.habits.length > 0) ? 'Buka Latihan' : 'Buat Latihan',
    action: (openModal: any, s: any) => {
      if (s.habits && s.habits.length > 0) {
        document.getElementById('daily-training-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        openModal('manage_habits');
      }
    },
    check: (s: any) => (s.habits || []).some((h: any) => h.done)
  },
  { id: 'dm_midday', title: 'Cek Progres Siang', desc: 'Isi Mid-day Check-in di jam 11.30 - 13.30 sebelum terlewat.', glyph: 'sun', points: 15, actionLabel: 'Cek Progres', action: (openModal: any) => openModal('work_checkin'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'realization_check' && (l.created_at || '').startsWith(getTodayStr())) },
  { id: 'dm_chat', title: 'Sapa Tim', desc: 'Buka fitur Chat dan lihat pembaruan dari tim.', glyph: 'chat', points: 10, actionLabel: 'Buka Chat', action: (_openModal: any, _s: any, onActioned?: () => void) => { window.dispatchEvent(new CustomEvent('set_tab', { detail: 'chat' })); onActioned?.(); }, check: (s: any) => false },
];

// Seeded random for daily rotation
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function DailyChallengeWidget({ openModal, onClaimReward }: { openModal: any, onClaimReward?: (points: number, title: string) => void }) {
  const { state, user, awardXP, notify } = useHP();
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());
  const [hoveredMission, setHoveredMission] = useState<string | null>(null);

  // Load claimed challenges from localStorage
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem(`hp_missions_${today}_${user?.id}`);
    if (stored) {
      try { setClaimedIds(new Set(JSON.parse(stored))); } catch (e) {}
    } else {
      setClaimedIds(new Set());
    }
  }, [user?.id]);

  // Pick 4 daily missions deterministically per day PER USER
  const activeMissions = useMemo(() => {
    if (!user) return [];
    const now = new Date();
    // Combine Date and User ID to generate a unique seed per user per day
    let userNum = 0;
    for (let i=0; i<user.id.length; i++) userNum += user.id.charCodeAt(i);
    
    const daySeed = (now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()) + userNum;
    
    // Always keep at least 1 very easy action like mood or focus, then 3 completely random
    const shuffled = seededShuffle(DAILY_MISSIONS, daySeed);
    return shuffled.slice(0, 4);
  }, [user]);

  if (!state || !user || activeMissions.length === 0) return null;

  // Calculate current Mission XP from claimed missions
  const currentXP = activeMissions
    .filter(m => claimedIds.has(m.id))
    .reduce((sum, m) => sum + m.points, 0);

  const maxXP = activeMissions.reduce((sum, m) => sum + m.points, 0); 

  // Define Chest Milestones
  const milestones = [
    { target: Math.floor(maxXP * 0.33), glyph: 'medal', label: 'Bronze' },
    { target: Math.floor(maxXP * 0.66), glyph: 'medal', label: 'Silver' },
    { target: maxXP, glyph: 'trophy', label: 'Gold' },
  ];

  const claimReward = (mission: typeof DAILY_MISSIONS[0]) => {
    if (claimedIds.has(mission.id)) return;
    
    const newClaimed = new Set(claimedIds);
    newClaimed.add(mission.id);
    setClaimedIds(newClaimed);
    
    // Persist
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`hp_missions_${today}_${user.id}`, JSON.stringify([...newClaimed]));

    // Award XP
    awardXP('daily_challenge', `Misi: ${mission.title}`, mission.points);
    if (onClaimReward) {
      onClaimReward(mission.points, mission.title);
    } else {
      notify('Misi Selesai! 🎉', `+${mission.points} Point`, 'success');
    }
  };

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
        count={`${claimedIds.size}/${activeMissions.length}`}
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
              <div style={{ ...HP_TEXT.tiny, marginBottom: 4, color: HP_TOKENS.yellowDark, fontWeight: 750, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Daily quests</div>
              <div style={{ ...HP_TEXT.h, color: HP_TOKENS.ink }}>
                Selesaikan misi, kumpulkan poin
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0, background: HP_TOKENS.yellowSoft, padding: '4px 12px', borderRadius: HP_TOKENS.radiusPill, border: `1px solid ${HP_TOKENS.yellow}` }}>
              <span style={{ ...HP_TEXT.metric, color: HP_TOKENS.yellowDark }}>{currentXP}</span>
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
            // Because some missions are manual triggers without strict logic, we might 
            // fallback to 'claimed' or checking simple true/false if they just view it.
            // But checking logic is provided for most.
            const isCompleted = c.check(state);
            const isClaimed = claimedIds.has(c.id);
            // dm_chat and similar view-only missions become claimable after user clicks action button
            const isActioned = actionedIds.has(c.id);
            const effectivelyCompleted = isCompleted || isActioned;

            const canClaim = effectivelyCompleted && !isClaimed;
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
                      : effectivelyCompleted ? HP_TOKENS.yellowSoft : HP_TOKENS.yellowWash,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background-color 220ms var(--hp-ease)',
                  }}>
                    {isClaimed ? (
                      <HPGlyph name="check" size={22} color={HP_TOKENS.success} stroke={3} />
                    ) : (
                      <HPGlyph
                        name={c.glyph}
                        size={20}
                        color={effectivelyCompleted ? HP_TOKENS.yellowDark : HP_TOKENS.yellowDark}
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
                      +{c.points} XP
                    </div>

                    {canClaim ? (
                      <HPButton
                        size="sm"
                        variant="primary"
                        onClick={() => claimReward(c)}
                        style={{ background: HP_TOKENS.yellow, color: HP_TOKENS.ink }}
                      >
                        Klaim
                      </HPButton>
                    ) : isClaimed ? (
                      <div style={{
                        ...HP_TEXT.tiny,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        color: HP_TOKENS.success,
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
                        onClick={() => {
                          const onActioned = () => setActionedIds(prev => new Set([...prev, c.id]));
                          openModal && c.action(openModal, state, onActioned);
                        }}
                      >
                        {typeof c.actionLabel === 'function' ? c.actionLabel(state) : c.actionLabel}
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
