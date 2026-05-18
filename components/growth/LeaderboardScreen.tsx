"use client";

import React, { useEffect, useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";

export default function LeaderboardScreen() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(res => res.json())
      .then(d => {
        if (d.leaderboard) setData(d.leaderboard);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Loading Leaderboard...</div>;

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 12 }}>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 56, height: 56, borderRadius: 20, background: HP_TOKENS.yellow,
          marginBottom: 16, boxShadow: `0 8px 24px ${HP_TOKENS.yellow}40`
        }}>
          <HPGlyph name="medal" size={28} color={HP_TOKENS.ink} />
        </div>
        <h2 style={{ ...HP_TEXT.display, fontSize: 28, marginBottom: 4 }}>Top Performers</h2>
        <p style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Karyawan paling aktif minggu ini</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((u, i) => {
          const isTop3 = i < 3;
          const colors = [HP_TOKENS.yellow, HP_TOKENS.blue, HP_TOKENS.coral];
          const rankColor = isTop3 ? colors[i] : HP_TOKENS.line;
          const rankBg = isTop3 ? colors[i] + '15' : HP_TOKENS.paper;

          return (
            <HPCard key={u.id} padding={14} style={{ 
              border: isTop3 ? `1.5px solid ${rankColor}40` : undefined,
              background: i === 0 ? HP_TOKENS.yellowWash : '#fff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 32, height: 32, borderRadius: 10, background: rankBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: isTop3 ? rankColor : HP_TOKENS.inkMute
                }}>
                  {u.rank}
                </div>
                
                <HPAvatar name={u.name} size={44} />

                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{u.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <span style={{ 
                      padding: '1px 6px', borderRadius: 4, background: HP_TOKENS.lineSoft,
                      fontSize: 9, fontWeight: 800, color: HP_TOKENS.inkSoft
                    }}>
                      Lv {u.level}
                    </span>
                    <span style={{ 
                      padding: '1px 6px', borderRadius: 4, background: HP_TOKENS.blueSoft,
                      fontSize: 9, fontWeight: 800, color: HP_TOKENS.blue
                    }}>
                      Tier {u.tier}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 18, color: HP_TOKENS.ink }}>
                    {u.points.toLocaleString()}
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>XP Points</div>
                </div>
              </div>
            </HPCard>
          );
        })}
      </div>
    </div>
  );
}
