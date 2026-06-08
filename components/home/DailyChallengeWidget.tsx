"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPBar from "@/components/ui/HPBar";
import SectionHeader from "@/components/home/SectionHeader";

// ── Challenge Pool ──────────────────────────────────────────────
const DAILY_POOL = [
  { id: 'd_tasks_3', title: 'Selesaikan 3 task hari ini', emoji: '🎯', points: 10, check: (s: any, u?: any) => (s.priorities || []).filter((p: any) => p.done).length >= 3 },
  { id: 'd_tasks_1', title: 'Selesaikan minimal 1 task', emoji: '✅', points: 5, check: (s: any, u?: any) => (s.priorities || []).filter((p: any) => p.done).length >= 1 },
  { id: 'd_kudos', title: 'Kirim apresiasi ke rekan kerja', emoji: '💬', points: 5, check: (s: any, u?: any) => {
    const today = new Date().toISOString().slice(0, 10);
    return (s.logbook || []).some((l: any) => l.type === 'kudos_sent' && (l.created_at || '').startsWith(today));
  }},
  { id: 'd_logbook', title: 'Isi logbook hari ini', emoji: '📝', points: 5, check: (s: any, u?: any) => {
    const today = new Date().toISOString().slice(0, 10);
    return (s.logbook || []).some((l: any) => (l.created_at || '').startsWith(today));
  }},
  { id: 'd_focus', title: 'Lakukan 1 sesi fokus (25 min)', emoji: '🧘', points: 10, check: (s: any, u?: any) => {
    const today = new Date().toISOString().slice(0, 10);
    return (s.logbook || []).some((l: any) => l.type === 'focus_session' && (l.created_at || '').startsWith(today));
  }},
  { id: 'd_mood', title: 'Isi mood check-in', emoji: '😊', points: 3, check: (s: any, u?: any) => !!s.mood && s.mood !== 'calm' },
  { id: 'd_habit', title: 'Selesaikan 1 kebiasaan baik', emoji: '🌱', points: 5, check: (s: any, u?: any) => (s.habits || []).some((h: any) => h.done) },
  { id: 'd_checkin', title: 'Absen masuk tepat waktu', emoji: '⏰', points: 3, check: (s: any, u?: any) => !!s.todayAttendance?.checkIn },
];

const WEEKLY_POOL = [
  { id: 'w_streak_3', title: 'Task selesai 3 hari berturut-turut', emoji: '🔥', points: 25, check: (s: any, u?: any) => (u?.streak || 0) >= 3 },
  { id: 'w_kpi_80', title: 'Capai 80% progress di 1 KPI', emoji: '🌟', points: 20, check: (s: any, u?: any) => (s.goals || []).some((g: any) => g.progress >= 80) },
  { id: 'w_all_habits', title: 'Selesaikan semua kebiasaan hari ini', emoji: '💪', points: 15, check: (s: any, u?: any) => {
    const habits = s.habits || [];
    return habits.length > 0 && habits.every((h: any) => h.done);
  }},
];

// Seeded random: consistent per day
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

export default function DailyChallengeWidget() {
  const { state, user, awardXP, notify } = useHP();
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  // Load claimed challenges from localStorage
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem(`hp_challenges_${today}`);
    if (stored) {
      try { setClaimedIds(new Set(JSON.parse(stored))); } catch (e) {}
    }
  }, []);

  // Pick 3 daily + 1 weekly based on today's date seed
  const { dailyChallenges, weeklyChallenge } = useMemo(() => {
    const now = new Date();
    const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const weekSeed = now.getFullYear() * 100 + Math.floor(daySeed / 7);
    
    const shuffledDaily = seededShuffle(DAILY_POOL, daySeed);
    const shuffledWeekly = seededShuffle(WEEKLY_POOL, weekSeed);
    
    return {
      dailyChallenges: shuffledDaily.slice(0, 3),
      weeklyChallenge: shuffledWeekly[0],
    };
  }, []);

  if (!state || !user) return null;

  const allChallenges = [...dailyChallenges, weeklyChallenge];
  const completedCount = allChallenges.filter(c => c.check(state, user) || claimedIds.has(c.id)).length;

  const claimReward = (challenge: typeof DAILY_POOL[0]) => {
    if (claimedIds.has(challenge.id)) return;
    
    const newClaimed = new Set(claimedIds);
    newClaimed.add(challenge.id);
    setClaimedIds(newClaimed);
    
    // Persist
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`hp_challenges_${today}`, JSON.stringify([...newClaimed]));

    awardXP('daily_challenge', `Tantangan: ${challenge.title}`);
    notify('Tantangan Selesai! 🎉', `+${challenge.points} poin dari "${challenge.title}"`, 'success');
  };

  return (
    <div style={{ marginTop: 24 }}>
      <SectionHeader 
        icon="sparkle" 
        label="Tantangan Hari Ini" 
        count={`${completedCount}/${allChallenges.length}`}
      />

      <HPCard padding={0} style={{ 
        overflow: 'hidden',
        border: `1.5px solid ${HP_TOKENS.line}`,
        boxShadow: '0 4px 16px rgba(26,29,35,0.03)',
      }}>
        {/* Header with overall progress */}
        <div style={{ 
          padding: '14px 16px', 
          background: `linear-gradient(135deg, ${HP_TOKENS.yellowWash} 0%, ${HP_TOKENS.card} 100%)`,
          borderBottom: `1px solid ${HP_TOKENS.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 900, letterSpacing: 1 }}>QUEST HARIAN</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 1 }}>
                Selesaikan tantangan untuk bonus poin
              </div>
            </div>
          </div>
          <div style={{ 
            padding: '4px 10px', borderRadius: 99,
            background: completedCount === allChallenges.length ? HP_TOKENS.sage : HP_TOKENS.yellow,
            color: completedCount === allChallenges.length ? '#fff' : HP_TOKENS.ink,
            fontSize: 11, fontWeight: 900, fontFamily: HP_FONT,
          }}>
            {completedCount === allChallenges.length ? '✓ DONE' : `${completedCount}/${allChallenges.length}`}
          </div>
        </div>

        {/* Challenge list */}
        <div style={{ padding: '8px 0' }}>
          {dailyChallenges.map((c, i) => {
            const isCompleted = c.check(state, user);
            const isClaimed = claimedIds.has(c.id);
            const canClaim = isCompleted && !isClaimed;

            return (
              <div 
                key={c.id}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < dailyChallenges.length - 1 ? `1px solid ${HP_TOKENS.lineSoft}` : 'none',
                  opacity: isClaimed ? 0.6 : 1,
                  transition: 'all 0.3s',
                }}
              >
                {/* Status indicator */}
                <div style={{ 
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: isClaimed ? HP_TOKENS.sageSoft : isCompleted ? HP_TOKENS.yellowSoft : HP_TOKENS.lineSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s',
                }}>
                  {isClaimed ? (
                    <HPGlyph name="check" size={14} color={HP_TOKENS.sage} stroke={3} />
                  ) : (
                    <span style={{ fontSize: 16 }}>{c.emoji}</span>
                  )}
                </div>

                {/* Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    ...HP_TEXT.body, fontSize: 13, fontWeight: 700, 
                    color: isClaimed ? HP_TOKENS.inkFade : HP_TOKENS.ink,
                    textDecoration: isClaimed ? 'line-through' : 'none',
                  }}>
                    {c.title}
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.yellow, fontWeight: 800, marginTop: 2 }}>
                    +{c.points} pts
                  </div>
                </div>

                {/* Action */}
                {canClaim ? (
                  <button
                    onClick={() => claimReward(c)}
                    className="hp-tap"
                    style={{
                      padding: '6px 14px', borderRadius: 99, border: 'none',
                      background: HP_TOKENS.yellow, color: HP_TOKENS.ink,
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 11,
                      cursor: 'pointer', flexShrink: 0,
                      boxShadow: `0 2px 8px ${HP_TOKENS.yellow}40`,
                    }}
                  >
                    Klaim!
                  </button>
                ) : isClaimed ? (
                  <div style={{ 
                    ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 800,
                    padding: '4px 10px', borderRadius: 99, background: HP_TOKENS.sageSoft,
                  }}>
                    Selesai ✓
                  </div>
                ) : (
                  <div style={{ 
                    width: 40, height: 4, borderRadius: 2, background: HP_TOKENS.lineSoft,
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    <div style={{ width: '0%', height: '100%', background: HP_TOKENS.inkMute, borderRadius: 2 }} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Weekly Challenge — visually distinct */}
          <div style={{ 
            margin: '4px 12px 12px', padding: '14px 16px', borderRadius: 14,
            background: `linear-gradient(135deg, ${HP_TOKENS.lavenderWash || '#F0ECFA'} 0%, ${HP_TOKENS.card} 100%)`,
            border: `1.5px solid ${(HP_TOKENS.lavender || '#6B5F8E')}20`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {(() => {
              const wc = weeklyChallenge;
              const isCompleted = wc.check(state, user);
              const isClaimed = claimedIds.has(wc.id);
              const canClaim = isCompleted && !isClaimed;

              return (
                <>
                  <div style={{ 
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: isClaimed ? HP_TOKENS.sageSoft : `${HP_TOKENS.lavender || '#6B5F8E'}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isClaimed ? (
                      <HPGlyph name="check" size={16} color={HP_TOKENS.sage} stroke={3} />
                    ) : (
                      <span style={{ fontSize: 18 }}>{wc.emoji}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.lavender || '#6B5F8E', fontWeight: 900, letterSpacing: 0.5, marginBottom: 2 }}>
                      TANTANGAN MINGGUAN
                    </div>
                    <div style={{ 
                      ...HP_TEXT.body, fontSize: 13, fontWeight: 700, 
                      color: isClaimed ? HP_TOKENS.inkFade : HP_TOKENS.ink,
                      textDecoration: isClaimed ? 'line-through' : 'none',
                    }}>
                      {wc.title}
                    </div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.lavender || '#6B5F8E', fontWeight: 800, marginTop: 2 }}>
                      +{wc.points} pts
                    </div>
                  </div>
                  {canClaim ? (
                    <button
                      onClick={() => claimReward(wc)}
                      className="hp-tap"
                      style={{
                        padding: '6px 14px', borderRadius: 99, border: 'none',
                        background: HP_TOKENS.lavender || '#6B5F8E', color: '#fff',
                        fontFamily: HP_FONT, fontWeight: 800, fontSize: 11,
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      Klaim!
                    </button>
                  ) : isClaimed ? (
                    <div style={{ 
                      ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 800,
                      padding: '4px 10px', borderRadius: 99, background: HP_TOKENS.sageSoft,
                    }}>
                      Selesai ✓
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        </div>
      </HPCard>
    </div>
  );
}
