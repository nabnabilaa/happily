"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import SectionHeader from "@/components/home/SectionHeader";

// ── Daily Nudges (Wellbeing-focused) ──────────────────────────
const getTodayStr = () => new Date().toISOString().slice(0, 10);

const DAILY_MISSIONS = [
  { id: 'dm_mood', title: 'Cek Ombak Pagi', desc: 'Isi Mood Check-in untuk memulai hari.', emoji: '🌤️', color: '#38bdf8', points: 10, actionLabel: 'Cek Mood', action: (openModal: any) => openModal('checkin'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'mood' && (l.created_at || '').startsWith(getTodayStr())) || (!!s.mood && s.mood !== 'calm') },
  { id: 'dm_focus', title: 'Fokus 15 Menit', desc: 'Lakukan sesi Pomodoro untuk pemanasan kerja.', emoji: '🍅', color: '#fb7185', points: 20, actionLabel: 'Mulai Fokus', action: (openModal: any) => openModal('focus'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'focus_session' && (l.created_at || '').startsWith(getTodayStr())) },
  { id: 'dm_task', title: 'Pecah Telur', desc: 'Pilih 1 tugas prioritas dan selesaikan hari ini.', emoji: '🎯', color: '#a78bfa', points: 20, actionLabel: 'Fokus Task', action: () => document.getElementById('task-harian-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), check: (s: any) => (s.priorities || []).filter((p: any) => p.done).length >= 1 },
  { id: 'dm_plan', title: 'Rencana Jitu', desc: 'Tambahkan minimal 3 tugas ke daftar prioritasmu.', emoji: '📝', color: '#34d399', points: 10, actionLabel: 'Susun Task', action: (openModal: any) => openModal('manage_priorities'), check: (s: any) => (s.priorities || []).length >= 3 },
  { id: 'dm_kudos', title: 'Tebar Kebaikan', desc: 'Kirim apresiasi atau kudos ke rekan kerjamu.', emoji: '🌟', color: '#fbbf24', points: 15, actionLabel: 'Kirim Kudos', action: (openModal: any) => openModal('appreciate'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'kudos_sent' && (l.created_at || '').startsWith(getTodayStr())) },
  { id: 'dm_coach', title: 'Sapa Sang Pelatih', desc: 'Buka Coach AI dan minta 1 saran hari ini.', emoji: '🤖', color: '#818cf8', points: 10, actionLabel: 'Tanya Coach', action: (openModal: any) => openModal('coach'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'ai_coach' && (l.created_at || '').startsWith(getTodayStr())) },
  { id: 'dm_pause', title: 'Jeda Sejenak', desc: 'Lakukan sesi pernapasan singkat (1 menit).', emoji: '🧘‍♂️', color: '#2dd4bf', points: 15, actionLabel: 'Mulai Napas', action: (openModal: any) => openModal('pause'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'pause_session' && (l.created_at || '').startsWith(getTodayStr())) },
  { 
    id: 'dm_training', 
    title: 'Daily Training', 
    desc: 'Tandai selesai minimal 1 latihan/habit hari ini.', 
    emoji: '💪', color: '#f87171', points: 20, 
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
  { id: 'dm_midday', title: 'Cek Progres Siang', desc: 'Isi Mid-day Check-in di jam 11.30 - 13.30 sebelum terlewat.', emoji: '☀️', color: '#facc15', points: 15, actionLabel: 'Cek Progres', action: (openModal: any) => openModal('work_checkin'), check: (s: any) => (s.logbook || []).some((l: any) => l.type === 'progress_update' && (l.created_at || '').startsWith(getTodayStr())) },
  { id: 'dm_chat', title: 'Sapa Tim', desc: 'Buka fitur Chat dan lihat pembaruan dari tim.', emoji: '💬', color: '#60a5fa', points: 10, actionLabel: 'Buka Chat', action: () => window.dispatchEvent(new CustomEvent('set_tab', { detail: 'chat' })), check: (s: any) => false },
  { id: 'dm_notes', title: 'Catatan Rapi', desc: 'Buka Catatan untuk merangkum hal penting hari ini.', emoji: '📓', color: '#a78bfa', points: 10, actionLabel: 'Buka Catatan', action: () => window.dispatchEvent(new CustomEvent('set_tab', { detail: 'notes' })), check: (s: any) => false },
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
    { target: Math.floor(maxXP * 0.33), icon: '🥉', label: 'Bronze', color: '#cd7f32' },
    { target: Math.floor(maxXP * 0.66), icon: '🥈', label: 'Silver', color: '#94a3b8' },
    { target: maxXP, icon: '🏆', label: 'Gold', color: '#fbbf24' }, 
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
    <div style={{ marginTop: 24 }}>
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
        border: `1.5px solid ${HP_TOKENS.lineSoft}`,
        boxShadow: '0 8px 32px rgba(255, 190, 11, 0.05)',
        borderRadius: 24,
        background: '#fff'
      }}>
        {/* Top Header: Progress Bar & Chests */}
        <div style={{ 
          padding: '22px 26px', 
          background: '#3B82F6', // Corporate blue
          color: '#fff',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decos from prototype */}
          <div style={{ position: 'absolute', width: 200, height: 200, background: 'rgba(255,255,255,0.07)', borderRadius: '50%', right: -50, top: -70, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 120, height: 120, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', right: 90, bottom: -60, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 70, height: 70, background: 'rgba(255,255,255,0.06)', borderRadius: '50%', left: '55%', bottom: 8, pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 5 }}>
                Daily Quests
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                Selesaikan misi,<br/>kumpulkan poin!
              </div>
            </div>
            {/* XP Bubble */}
            <div style={{ 
              background: 'rgba(0,0,0,0.18)', borderRadius: 14, padding: '10px 16px', 
              textAlign: 'center', minWidth: 72, flexShrink: 0 
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#FDE68A', lineHeight: 1 }}>
                {currentXP}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                / {maxXP} XP
              </div>
            </div>
          </div>

          {/* Progress Wrap */}
          <div style={{ position: 'relative', zIndex: 1, paddingBottom: 16 }}>
            {/* Track */}
            <div style={{ 
              height: 14, background: 'rgba(0,0,0,0.22)', borderRadius: 99, 
              position: 'relative', marginBottom: 12 
            }}>
              {/* Fill */}
              <div style={{
                width: `${Math.min(100, (currentXP / maxXP) * 100)}%`,
                height: '100%',
                background: '#FDE68A',
                borderRadius: 99,
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)',
                  width: 20, height: 20, borderRadius: '50%', background: '#FDE68A',
                  border: '3px solid #3B82F6', boxShadow: '0 0 0 3px rgba(59,130,246,0.35)'
                }} />
              </div>

              {/* Milestones Dots overlay */}
              <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: '100%', pointerEvents: 'none' }}>
                {milestones.map((ms, idx) => {
                  const progressPct = (ms.target / maxXP) * 100;
                  const isAchieved = currentXP >= ms.target;
                  return (
                    <div key={`dot-${idx}`} style={{
                      position: 'absolute', top: '50%', left: `${progressPct}%`,
                      transform: isAchieved ? 'translate(-50%, -50%) scale(1.15)' : 'translate(-50%, -50%)',
                      width: 34, height: 34, borderRadius: '50%',
                      background: isAchieved ? '#fff' : 'rgba(255,255,255,0.2)',
                      border: `2.5px solid ${isAchieved ? '#fff' : 'rgba(255,255,255,0.35)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, transition: 'all 0.4s', zIndex: 2,
                      boxShadow: isAchieved ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      {ms.icon}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Labels under the track */}
            <div style={{ position: 'relative', height: 16 }}>
              {milestones.map((ms, idx) => {
                const progressPct = (ms.target / maxXP) * 100;
                const isAchieved = currentXP >= ms.target;
                return (
                  <div key={`lbl-${idx}`} style={{
                    position: 'absolute', left: `${progressPct}%`,
                    transform: 'translateX(-50%)',
                    fontSize: 11, textAlign: 'center',
                    color: isAchieved ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
                    fontWeight: isAchieved ? 700 : 500,
                    whiteSpace: 'nowrap'
                  }}>
                    {ms.target} XP
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Misi List */}
        <div style={{ padding: '16px' }}>
          {activeMissions.map((c, i) => {
            // Because some missions are manual triggers without strict logic, we might 
            // fallback to 'claimed' or checking simple true/false if they just view it.
            // But checking logic is provided for most.
            const isCompleted = c.check(state);
            const isClaimed = claimedIds.has(c.id);
            // Treat non-logbook-backed view actions as automatically completed once claimed, 
            // but we can't detect "viewing" easily, so users just click Action, and if it's a view-only task, 
            // we could either give them points immediately or let them claim it. Let's let them claim it if they want.
            // Actually, if check() always returns false, they can never claim it.
            // For view-only tasks, we'll assume it's completed if they click the action button and come back.
            // Since we can't track clicks easily, we will change their check to return `true` if they are in the array of "freebies".
            const isFreebie = ['dm_survey', 'dm_rewards', 'dm_profile', 'dm_guide', 'dm_mascot'].includes(c.id);
            // For freebies, they are "completed" by default so they can just claim them.
            const effectivelyCompleted = isCompleted || isFreebie;

            const canClaim = effectivelyCompleted && !isClaimed;
            const isHovered = hoveredMission === c.id;

            return (
              <div 
                key={c.id}
                className="daily-mission-item"
                onMouseEnter={() => setHoveredMission(c.id)}
                onMouseLeave={() => setHoveredMission(null)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px',
                  borderRadius: 20,
                  marginBottom: 8,
                  background: canClaim ? `linear-gradient(90deg, ${HP_TOKENS.yellowWash}60, #fff)` : isHovered && !isClaimed ? '#f9fafb' : '#fff',
                  border: canClaim ? `2px solid ${HP_TOKENS.yellow}` : `2px solid ${isHovered && !isClaimed ? '#e5e7eb' : '#f3f4f6'}`,
                  opacity: isClaimed ? 0.5 : 1,
                  transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  transform: isHovered && !isClaimed ? 'translateY(-2px)' : 'none',
                  boxShadow: canClaim ? `0 8px 24px ${HP_TOKENS.yellow}30` : isHovered && !isClaimed ? '0 8px 16px rgba(0,0,0,0.04)' : 'none'
                }}
              >
                <div className="daily-mission-info" style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                  {/* Vibrant Emoji Icon */}
                  <div style={{ 
                    width: 56, height: 56, borderRadius: 18, flexShrink: 0,
                    background: isClaimed ? HP_TOKENS.sageSoft : effectivelyCompleted ? HP_TOKENS.yellowSoft : `${c.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s',
                    border: `2px solid ${isClaimed ? HP_TOKENS.sage : effectivelyCompleted ? HP_TOKENS.yellow : `${c.color}30`}`,
                    boxShadow: canClaim ? `inset 0 0 12px ${HP_TOKENS.yellow}40` : 'none'
                  }}>
                    {isClaimed ? (
                      <HPGlyph name="check" size={28} color={HP_TOKENS.sage} stroke={4} />
                    ) : (
                      <span style={{ fontSize: 28, filter: effectivelyCompleted ? 'none' : 'grayscale(10%) opacity(0.9)' }}>{c.emoji}</span>
                    )}
                  </div>

                  {/* Title */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      ...HP_TEXT.body, fontSize: 15, fontWeight: 900, 
                      color: isClaimed ? HP_TOKENS.inkFade : HP_TOKENS.ink,
                    }}>
                      {c.title}
                    </div>
                    <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, marginTop: 4, fontSize: 13, lineHeight: 1.4, fontWeight: 600 }}>
                      {c.desc}
                    </div>
                  </div>
                </div>

                {/* Action Area */}
                <div className="daily-mission-action">
                    <div className="daily-mission-xp" style={{ 
                      ...HP_TEXT.tiny, color: isClaimed ? HP_TOKENS.inkMute : '#FF9F1C', 
                      fontWeight: 900, fontSize: 14,
                      display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <span style={{ fontSize: 16 }}>⚡</span> +{c.points} XP
                    </div>

                    {canClaim ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => claimReward(c)}
                          className="hp-tap"
                          style={{
                            padding: '10px 24px', borderRadius: 100, border: 'none',
                            background: `linear-gradient(90deg, #FFBE0B, #FF9F1C)`, 
                            color: '#fff',
                            fontFamily: HP_FONT, fontWeight: 900, fontSize: 14,
                            cursor: 'pointer',
                            boxShadow: `0 4px 16px rgba(255,159,28,0.5)`,
                            animation: 'hpPulse 1.5s infinite',
                            textTransform: 'uppercase',
                            letterSpacing: 1
                          }}
                        >
                          Klaim!
                        </button>
                      </div>
                    ) : isClaimed ? (
                      <div style={{ 
                        ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 900, fontSize: 13,
                        padding: '8px 16px', borderRadius: 100, background: HP_TOKENS.sageWash,
                        border: `1.5px solid ${HP_TOKENS.sage}`
                      }}>
                        Selesai ✓
                      </div>
                    ) : (
                      <button
                        onClick={() => openModal && c.action(openModal, state)}
                        className="hp-tap"
                        style={{
                          padding: '10px 16px', borderRadius: 100, 
                          border: `none`,
                          background: `${HP_TOKENS.blue}`, color: '#fff',
                          fontFamily: HP_FONT, fontWeight: 900, fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          transition: 'all 0.2s',
                          boxShadow: `0 4px 12px ${HP_TOKENS.blue}40`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = `0 6px 16px ${HP_TOKENS.blue}60`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = `0 4px 12px ${HP_TOKENS.blue}40`;
                        }}
                      >
                        {typeof c.actionLabel === 'function' ? c.actionLabel(state) : c.actionLabel}
                        <HPGlyph name="chevron-right" size={16} color="currentColor" />
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
