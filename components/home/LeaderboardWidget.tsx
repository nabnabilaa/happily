'use client';

import React, { useEffect, useState } from 'react';
import HPCard from '@/components/ui/HPCard';
import HPAvatar from '@/components/ui/HPAvatar';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';

export default function LeaderboardWidget({ currentUserId }: { currentUserId?: string }) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard.slice(0, 5)); // Show top 5
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (leaderboard.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <HPGlyph name="trophy" size={20} color={HP_TOKENS.yellow} stroke={2.5} />
        <h2 style={{ ...HP_TEXT.h, fontSize: 18 }}>Leaderboard Tim</h2>
      </div>

      <HPCard padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {leaderboard.map((user, idx) => {
          const isCurrentUser = user.id === currentUserId;
          let rankIcon = null;
          if (idx === 0) rankIcon = '🥇';
          else if (idx === 1) rankIcon = '🥈';
          else if (idx === 2) rankIcon = '🥉';
          else rankIcon = <span style={{ color: HP_TOKENS.inkMute, fontSize: 13, fontWeight: 800 }}>#{idx + 1}</span>;

          return (
            <div 
              key={user.id} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 12px', borderRadius: 12,
                background: isCurrentUser ? HP_TOKENS.yellowSoft + '30' : 'transparent',
                border: isCurrentUser ? `1px solid ${HP_TOKENS.yellow}40` : '1px solid transparent'
              }}
            >
              <div style={{ width: 24, textAlign: 'center', flexShrink: 0, fontSize: 20 }}>
                {rankIcon}
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
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft }}>Level {user.level}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: HP_FONT, fontWeight: 900, color: HP_TOKENS.primary, fontSize: 15 }}>
                  {user.points.toLocaleString()}
                </div>
                <div style={{ ...HP_TEXT.tiny, fontSize: 9, color: HP_TOKENS.inkMute, textTransform: 'uppercase' }}>
                  Points
                </div>
              </div>
            </div>
          );
        })}
      </HPCard>
    </div>
  );
}
