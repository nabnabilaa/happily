"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { MANAGER_TEAM_MEMBERS, MANAGER_TEAM_WELLBEING } from "@/lib/mockData";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPBar from "@/components/ui/HPBar";
import HPAvatar from "@/components/ui/HPAvatar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import ReadinessRing from "@/components/growth/ReadinessRing";

interface Props { openModal: (name: string, props?: any) => void; }

const TONE_COLOR: Record<string, string> = {
  sage: HP_TOKENS.sage, blue: HP_TOKENS.blue,
  yellow: '#8A6814', coral: HP_TOKENS.coral, lavender: HP_TOKENS.lavender,
};
const TONE_SOFT: Record<string, string> = {
  sage: HP_TOKENS.sageSoft, blue: HP_TOKENS.blueSoft,
  yellow: HP_TOKENS.yellowSoft, coral: HP_TOKENS.coralSoft, lavender: HP_TOKENS.lavenderSoft,
};

export default function ManagerWellbeingScreen({ openModal }: Props) {
  const avgWellbeing = Math.round(MANAGER_TEAM_MEMBERS.reduce((a, b) => a + b.wellbeing, 0) / MANAGER_TEAM_MEMBERS.length);

  const moodDist = [
    { label: 'Bahagia 😊', count: MANAGER_TEAM_MEMBERS.filter(m => m.mood === 'joy').length, tone: 'yellow' },
    { label: 'Tenang 🙂', count: MANAGER_TEAM_MEMBERS.filter(m => m.mood === 'calm').length, tone: 'sage' },
    { label: 'Lelah 😔', count: MANAGER_TEAM_MEMBERS.filter(m => m.mood === 'tired').length, tone: 'coral' },
    { label: 'Biasa 😐', count: MANAGER_TEAM_MEMBERS.filter(m => m.mood === 'neutral').length, tone: 'blue' },
  ].filter(d => d.count > 0);

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Wellbeing Tim" subtitle="Kesehatan & energi seluruh anggota tim" />

      {/* Team avg score */}
      <HPCard style={{ background: `linear-gradient(135deg, ${HP_TOKENS.sageWash}, ${HP_TOKENS.blueWash})`, border: 'none', marginBottom: 12 }} padding={18}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ReadinessRing value={avgWellbeing} />
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Wellbeing Tim Rata-rata</div>
            <div style={{ ...HP_TEXT.title, fontSize: 22, marginTop: 2 }}>
              {avgWellbeing >= 75 ? 'Tim kamu sehat 🌱' : avgWellbeing >= 60 ? 'Butuh perhatian ⚠️' : 'Perlu tindakan segera 🔴'}
            </div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 4 }}>
              {MANAGER_TEAM_MEMBERS.length} anggota · {MANAGER_TEAM_MEMBERS.filter(m => m.wellbeing >= 70).length} sehat
            </div>
          </div>
        </div>
      </HPCard>

      {/* Wellbeing dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {MANAGER_TEAM_WELLBEING.map(d => (
          <HPCard key={d.key} padding={14} style={{ background: TONE_SOFT[d.tone] || HP_TOKENS.lineSoft, border: 'none' }}>
            <div style={{ ...HP_TEXT.tiny, color: TONE_COLOR[d.tone] }}>{d.label.toUpperCase()}</div>
            <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 28, color: TONE_COLOR[d.tone], lineHeight: 1, marginTop: 4 }}>
              {d.score}
            </div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>/100</div>
            <div style={{ ...HP_TEXT.tiny, marginTop: 4, fontWeight: 800, color: d.trend.startsWith('+') ? HP_TOKENS.sage : HP_TOKENS.coral }}>
              {d.trend} vs minggu lalu
            </div>
          </HPCard>
        ))}
      </div>

      {/* Mood distribution */}
      <SectionHeader icon="heart" label="Distribusi Mood Tim Hari Ini" />
      <HPCard padding={14} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {moodDist.map(d => (
            <div key={d.label} style={{
              flex: 1, minWidth: 80, padding: '12px 10px', borderRadius: 14, textAlign: 'center',
              background: TONE_SOFT[d.tone] || HP_TOKENS.lineSoft,
            }}>
              <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 24, color: TONE_COLOR[d.tone] }}>{d.count}</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 3 }}>{d.label}</div>
            </div>
          ))}
        </div>
      </HPCard>

      {/* Individual member wellbeing */}
      <SectionHeader icon="people" label="Wellbeing per Anggota" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MANAGER_TEAM_MEMBERS.sort((a, b) => a.wellbeing - b.wellbeing).map(m => (
          <HPCard key={m.id} padding={14} style={{
            border: m.wellbeing < 65 ? `1.5px solid ${HP_TOKENS.coral}40` : undefined
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HPAvatar name={m.name} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{m.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HPGlyph name={m.glyph} size={16} color={HP_TOKENS.ink} />
                  </div>
                </div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{m.role}</div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 5, background: HP_TOKENS.lineSoft, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${m.wellbeing}%`, height: '100%', borderRadius: 3,
                      background: m.wellbeing >= 75 ? HP_TOKENS.sage : m.wellbeing >= 60 ? HP_TOKENS.yellow : HP_TOKENS.coral,
                    }} />
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, minWidth: 28 }}>{m.wellbeing}</div>
                </div>
              </div>
              {m.wellbeing < 65 && (
                <button onClick={() => openModal('coach')} className="hp-tap" style={{
                  padding: '8px 12px', borderRadius: 10, border: 'none', background: HP_TOKENS.coralSoft,
                  color: HP_TOKENS.coral, fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                }}>
                  Check-in
                </button>
              )}
            </div>
          </HPCard>
        ))}
      </div>



      {/* Action items */}
      <div style={{ marginTop: 16 }}>
        <SectionHeader icon="sparkle" label="Saran Tindakan" />
        <HPCard style={{ background: HP_TOKENS.blueWash, border: 'none' }} padding={14}>
          <div style={{ display: 'flex', gap: 10 }}>
            <HPGlyph name="sparkle" size={18} color={HP_TOKENS.blue} />
            <div>
              <div style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.blue }}>AI Manager Tip</div>
              <div style={{ ...HP_TEXT.body, fontSize: 13, marginTop: 4 }}>
                2 anggota memiliki wellbeing di bawah 65. Pertimbangkan check-in 1-on-1 informal minggu ini — bukan evaluasi kinerja, tapi genuine conversation.
              </div>
              <button onClick={() => openModal('coach')} className="hp-tap" style={{
                marginTop: 10, padding: '8px 16px', borderRadius: 12, border: 'none',
                background: HP_TOKENS.blue, color: '#fff', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
              }}>
                Tanya AI Coach
              </button>
            </div>
          </div>
        </HPCard>
      </div>
    </div>
  );
}
