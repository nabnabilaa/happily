"use client";

import React, { useState, useEffect } from 'react';
import HPCard from '@/components/ui/HPCard';
import HPGlyph from '@/components/ui/HPGlyph';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPAvatar from '@/components/ui/HPAvatar';

export default function BurnoutAlertCard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd fetch actual users and their states.
    // For this prototype, we'll mock some data to show how it looks.
    const mockUsers = [
      {
        id: 'mock1', name: 'Andi Saputra', department: 'Engineering',
        state: { mood: 'burnout', moods: [{mood: 'burnout'}, {mood:'tired'}], priorities: [{done: false}, {done: false}, {done: false}] },
        userStats: { streak: 0 }
      },
      {
        id: 'mock2', name: 'Budi Santoso', department: 'Marketing',
        state: { mood: 'stress', moods: [{mood: 'stress'}], priorities: [{done: true}, {done: false}] },
        userStats: { streak: 2 }
      }
    ];

    fetch('/api/wellbeing/burnout-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: mockUsers })
    })
      .then(res => res.json())
      .then(data => {
        if (data.alerts) setAlerts(data.alerts);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return null;
  if (alerts.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <HPGlyph name="alertCircle" size={18} color={HP_TOKENS.coral} />
        <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Burnout Early Warning</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {alerts.map((alert, i) => (
          <HPCard key={i} padding={16} style={{ 
            background: alert.riskLevel === 'Tinggi' ? HP_TOKENS.coralSoft : HP_TOKENS.yellowWash,
            border: `1.5px solid ${alert.riskLevel === 'Tinggi' ? HP_TOKENS.coral : HP_TOKENS.yellow}`
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <HPAvatar name={alert.name} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{alert.name}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{alert.department}</div>
                  </div>
                  <div style={{ 
                    padding: '4px 10px', borderRadius: 99, 
                    background: alert.riskLevel === 'Tinggi' ? HP_TOKENS.coral : HP_TOKENS.yellow,
                    color: alert.riskLevel === 'Tinggi' ? '#fff' : HP_TOKENS.ink,
                    fontSize: 11, fontWeight: 900, fontFamily: HP_FONT
                  }}>
                    Risiko {alert.riskLevel}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ ...HP_TEXT.tiny, fontWeight: 800, marginBottom: 4, color: HP_TOKENS.ink }}>
                    Indikator:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, ...HP_TEXT.small, color: HP_TOKENS.inkSoft, lineHeight: 1.5 }}>
                    {alert.triggers.map((trig: string, idx: number) => (
                      <li key={idx}>{trig}</li>
                    ))}
                  </ul>
                </div>
                
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <div style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: HP_TOKENS.sageSoft, color: HP_TOKENS.sage, fontFamily: HP_FONT, fontSize: 12, fontWeight: 800,
                  }}>
                    ✅ Pesan Otomatis Terkirim
                  </div>
                </div>
              </div>
            </div>
          </HPCard>
        ))}
      </div>
    </div>
  );
}
