'use client';

import React, { useEffect, useState } from 'react';
import HPCard from '@/components/ui/HPCard';
import HPAvatar from '@/components/ui/HPAvatar';
import { HP_TOKENS, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';
import { TabBar } from '@/components/ui';

type Period = 'weekly' | 'monthly' | 'all_time';

export default function LeaderboardWidget({ currentUserId }: { currentUserId?: string }) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('monthly');
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setLoading(true);
    setAnimate(true);
    fetch(`/api/leaderboard?period=${period}`)
      .then(res => res.json())
      .then(data => {
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
        setTimeout(() => setAnimate(false), 300);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 10);

  /**
   * Podium styling per rank. `stroke` is the readable text colour, `bg` the
   * block fill — gold/silver/bronze mapped onto the honey and neutral ramps so
   * the podium survives a theme flip.
   *
   * The blocks used to be 120/90/70px of empty fill under each avatar, which
   * put the whole podium past 300px tall to rank three people. They are now
   * sized to hold the rank medal and nothing more.
   */
  const getPodiumStyle = (rank: number) => {
    switch (rank) {
      case 1: return { bg: HP_TOKENS.yellowWash, height: 56, label: 'Emas', stroke: HP_TOKENS.yellowDark };
      case 2: return { bg: HP_TOKENS.sunken, height: 42, label: 'Perak', stroke: HP_TOKENS.inkSoft };
      case 3: return { bg: HP_TOKENS.honeySoft, height: 32, label: 'Perunggu', stroke: HP_TOKENS.honey };
      default: return { bg: HP_TOKENS.sunken, height: 28, label: '', stroke: HP_TOKENS.inkMute };
    }
  };

  // Reorder top3 for podium display: Rank 2, Rank 1, Rank 3
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  if (loading && leaderboard.length === 0) return null;
  if (leaderboard.length === 0) return null;

  return (
    // No outer margin — the screen that places this owns the spacing between
    // blocks, so a self-applied marginTop just stacks on top of the layout gap.
    <section>
      {/* Matches SectionHeader's shape so this block sits in the same rhythm
          as every other section on the screen. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px 12px' }}>
        <HPGlyph name="trophy" size={17} color={HP_TOKENS.inkMute} stroke={2} />
        <h2 style={{ ...HP_TEXT.h, fontSize: 16, margin: 0 }}>Leaderboard Tim</h2>
      </div>

      {/* Period Tabs */}
      <div style={{ marginBottom: 16 }}>
        <TabBar
          label="Periode leaderboard"
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          options={[
            { key: 'weekly', label: 'Minggu ini' },
            { key: 'monthly', label: 'Bulan ini' },
            { key: 'all_time', label: 'Semua waktu' },
          ]}
        />
      </div>

      <div style={{ 
        opacity: animate ? 0.5 : 1, 
        transform: animate ? 'translateY(10px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        display: 'flex', flexDirection: 'column', gap: 20
      }}>
        
        {/* Podium Top 3 */}
        {top3.length > 0 && (
          <HPCard padding={16} style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10,
            paddingTop: 20,
          }}>
            {podiumOrder.map((user) => {
              const rank = user.rank;
              const style = getPodiumStyle(rank);
              const isCurrentUser = user.id === currentUserId;

              return (
                <div key={user.id} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  width: '30%', minWidth: 0,
                }}>
                  {/* Crown for first place. Back as an SVG glyph — the 👑
                      emoji rendered differently on every platform and could
                      not take the honey token. */}
                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    {rank === 1 && (
                      <div
                        aria-hidden
                        style={{
                          position: 'absolute', top: -19, left: '50%',
                          transform: 'translateX(-50%)', lineHeight: 0,
                        }}
                      >
                        <HPGlyph name="crown" size={22} color={HP_TOKENS.yellowInk} stroke={2} />
                      </div>
                    )}
                    <div style={{
                      borderRadius: '50%', padding: 3,
                      background: style.bg,
                      border: `2px solid ${style.stroke}`,
                    }}>
                      <HPAvatar name={user.name} size={rank === 1 ? 52 : 42} />
                    </div>
                  </div>

                  <div style={{
                    ...HP_TEXT.sub, fontSize: 13, textAlign: 'center',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    width: '100%',
                  }}>
                    {user.name.split(' ')[0]}
                  </div>
                  <div style={{
                    ...HP_TEXT.bodyStrong, fontSize: rank === 1 ? 15 : 13,
                    color: style.stroke, fontVariantNumeric: 'tabular-nums',
                  }}>
                    {user.points.toLocaleString('id-ID')}
                  </div>
                  {isCurrentUser && (
                    <div style={{
                      ...HP_TEXT.tiny, marginTop: 2,
                      padding: '1px 6px', borderRadius: HP_TOKENS.radiusXs,
                      background: HP_TOKENS.yellowSoft, color: HP_TOKENS.yellowInk,
                    }}>
                      KAMU
                    </div>
                  )}

                  {/* The step, carrying the rank medal. A ranked podium has to
                      show its ranking — dropping the medal emoji without
                      putting a legible marker back left the steps anonymous. */}
                  <div style={{
                    width: '100%', height: style.height, marginTop: 8,
                    background: style.bg,
                    borderTop: `3px solid ${style.stroke}`,
                    borderRadius: '10px 10px 0 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span
                      title={style.label}
                      style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: HP_TOKENS.card,
                        border: `2px solid ${style.stroke}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ...HP_TEXT.bodyStrong,
                        color: style.stroke,
                        fontSize: 12, lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {rank}
                    </span>
                  </div>
                </div>
              );
            })}
          </HPCard>
        )}

        {/*
          Rank 4 and below. One card of hairline rows rather than a bordered
          card per person — a ranking is a list, and eight separate cards with
          gaps between them cost roughly twice the height to say the same
          thing. The stacked figure-over-"POINTS" pair is now one line.
        */}
        {rest.length > 0 && (
          <HPCard padding={0} style={{ overflow: 'hidden' }}>
            {rest.map((user, i) => {
              const isCurrentUser = user.id === currentUserId;
              return (
                <div
                  key={user.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 14px',
                    borderTop: i === 0 ? undefined : `1px solid ${HP_TOKENS.lineSoft}`,
                    background: isCurrentUser ? HP_TOKENS.yellowWash : undefined,
                  }}
                >
                  <span style={{
                    ...HP_TEXT.small, width: 20, flexShrink: 0, textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {user.rank}
                  </span>
                  <HPAvatar name={user.name} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      ...HP_TEXT.sub, fontSize: 14,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {user.name}
                      {isCurrentUser && (
                        <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.yellowInk }}> · Kamu</span>
                      )}
                    </div>
                    <div style={{
                      ...HP_TEXT.small, fontSize: 12,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {user.team || 'Team member'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                      ...HP_TEXT.bodyStrong, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {user.points.toLocaleString('id-ID')}
                    </span>
                    <span style={{ ...HP_TEXT.small, fontSize: 11 }}>pts</span>
                  </div>
                </div>
              );
            })}
          </HPCard>
        )}
      </div>
    </section>
  );
}
