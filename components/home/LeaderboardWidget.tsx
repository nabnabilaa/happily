'use client';

import React, { useEffect, useState } from 'react';
import HPCard from '@/components/ui/HPCard';
import HPAvatar from '@/components/ui/HPAvatar';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';

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

  // Helper to get podium style based on rank (1, 2, 3)
  const getPodiumStyle = (rank: number) => {
    switch (rank) {
      case 1: return { color: '#FCD34D', bg: '#FEF3C7', height: 120, label: '🥇 Emas', stroke: '#F59E0B' };
      case 2: return { color: '#D1D5DB', bg: '#F3F4F6', height: 90, label: '🥈 Perak', stroke: '#9CA3AF' };
      case 3: return { color: '#FDBA74', bg: '#FFF7ED', height: 70, label: '🥉 Perunggu', stroke: '#EA580C' };
      default: return { color: '#ccc', bg: '#eee', height: 50, label: '', stroke: '#999' };
    }
  };

  // Reorder top3 for podium display: Rank 2, Rank 1, Rank 3
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  if (loading && leaderboard.length === 0) return null;
  if (leaderboard.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HPGlyph name="trophy" size={20} color={HP_TOKENS.yellow} stroke={2.5} />
          <h2 style={{ ...HP_TEXT.h, fontSize: 18 }}>Leaderboard Tim</h2>
        </div>
      </div>

      {/* Period Tabs */}
      <div style={{ 
        display: 'flex', background: HP_TOKENS.lineSoft, padding: 4, borderRadius: 12, marginBottom: 20
      }}>
        {[
          { id: 'weekly', label: 'Minggu Ini' },
          { id: 'monthly', label: 'Bulan Ini' },
          { id: 'all_time', label: 'Semua Waktu' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setPeriod(tab.id as Period)}
            className="hp-tap"
            style={{
              flex: 1, padding: '8px 0', border: 'none', borderRadius: 8,
              background: period === tab.id ? HP_TOKENS.card : 'transparent',
              color: period === tab.id ? HP_TOKENS.ink : HP_TOKENS.inkMute,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
              boxShadow: period === tab.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
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
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, 
            paddingTop: 32, minHeight: 220, background: 'linear-gradient(to bottom, transparent, #fafafa)' 
          }}>
            {podiumOrder.map((user) => {
              const rank = user.rank;
              const style = getPodiumStyle(rank);
              const isCurrentUser = user.id === currentUserId;

              return (
                <div key={user.id} style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' 
                }}>
                  {/* Avatar & Crown */}
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    {rank === 1 && (
                      <div style={{ position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)', fontSize: 24 }}>
                        👑
                      </div>
                    )}
                    <div style={{ 
                      borderRadius: '50%', padding: 3, 
                      background: `linear-gradient(135deg, ${style.bg}, ${style.color})`,
                      boxShadow: `0 4px 12px ${style.stroke}40`
                    }}>
                      <HPAvatar name={user.name} size={rank === 1 ? 64 : 48} />
                    </div>
                  </div>

                  {/* Name & Points */}
                  <div style={{ 
                    ...HP_TEXT.h, fontSize: rank === 1 ? 14 : 12, textAlign: 'center', 
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%',
                    color: HP_TOKENS.ink
                  }}>
                    {user.name.split(' ')[0]}
                  </div>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, color: style.stroke, fontSize: rank === 1 ? 16 : 14, marginTop: 2 }}>
                    {user.points.toLocaleString()}
                  </div>
                  {isCurrentUser && (
                    <div style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 8, fontWeight: 800, marginTop: 4,
                      background: HP_TOKENS.yellowSoft, color: '#8A6814', fontFamily: HP_FONT
                    }}>
                      KAMU
                    </div>
                  )}

                  {/* Podium Block */}
                  <div style={{ 
                    width: '100%', height: style.height, background: style.bg, 
                    borderTop: `4px solid ${style.color}`, borderRadius: '12px 12px 0 0',
                    marginTop: 12, display: 'flex', justifyContent: 'center', paddingTop: 12,
                    boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.5)'
                  }}>
                    <span style={{ fontSize: rank === 1 ? 28 : 20 }}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
                  </div>
                </div>
              );
            })}
          </HPCard>
        )}

        {/* List Rank 4-10 */}
        {rest.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rest.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              return (
                <HPCard 
                  key={user.id} 
                  padding={12}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: isCurrentUser ? HP_TOKENS.yellowSoft + '30' : HP_TOKENS.card,
                    border: isCurrentUser ? `1.5px solid ${HP_TOKENS.yellow}40` : `1.5px solid transparent`
                  }}
                >
                  <div style={{ 
                    width: 28, height: 28, borderRadius: '50%', background: HP_TOKENS.lineSoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: HP_FONT, fontWeight: 900, color: HP_TOKENS.inkMute, fontSize: 13, flexShrink: 0
                  }}>
                    {user.rank}
                  </div>
                  <HPAvatar name={user.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ ...HP_TEXT.h, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.name}
                      </div>
                      {isCurrentUser && (
                        <div style={{
                          padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 800,
                          background: HP_TOKENS.yellowSoft, color: '#8A6814', fontFamily: HP_FONT
                        }}>
                          KAMU
                        </div>
                      )}
                    </div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft }}>{user.team || 'Team Member'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: HP_FONT, fontWeight: 900, color: HP_TOKENS.primary, fontSize: 15 }}>
                      {user.points.toLocaleString()}
                    </div>
                    <div style={{ ...HP_TEXT.tiny, fontSize: 9, color: HP_TOKENS.inkMute, textTransform: 'uppercase' }}>
                      Points
                    </div>
                  </div>
                </HPCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
