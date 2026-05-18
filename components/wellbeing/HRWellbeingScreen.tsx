"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { HR_WELLBEING_DIMS, HR_DEPT_PULSE, HR_ALL_EMPLOYEES, HR_LD_PROGRAMS, HR_ORG_METRICS } from "@/lib/mockData";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPBar from "@/components/ui/HPBar";
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

const WELLBEING_PROGRAMS = [
  { id: 1, title: '21 Hari Meditasi', enrolled: 89, completed: 51, total: 128, tone: 'lavender', category: 'Mental' },
  { id: 2, title: 'Step Challenge Bulanan', enrolled: 72, completed: 44, total: 128, tone: 'sage', category: 'Fisik' },
  { id: 3, title: 'Financial Wellness Talk', enrolled: 45, completed: 45, total: 128, tone: 'yellow', category: 'Finansial' },
];

export default function HRWellbeingScreen({ openModal }: Props) {
  const m = HR_ORG_METRICS;
  const atRisk = HR_ALL_EMPLOYEES.filter(e => e.risk === 'high');
  const avgWellbeing = m.wellbeingAvg;

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Wellbeing" subtitle="Kesehatan & engagement organisasi" />

      {/* Org wellbeing score */}
      <HPCard style={{ background: `linear-gradient(135deg, ${HP_TOKENS.sageWash}, ${HP_TOKENS.lavenderSoft})`, border: 'none', marginBottom: 12 }} padding={18}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ReadinessRing value={avgWellbeing} />
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Wellbeing Organisasi</div>
            <div style={{ ...HP_TEXT.title, fontSize: 22, marginTop: 2 }}>
              {avgWellbeing >= 75 ? 'Organisasi sehat 🌱' : 'Perlu perhatian ⚠️'}
            </div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 4 }}>
              {m.totalEmployees} karyawan · {atRisk.length} perlu intervensi
            </div>
          </div>
        </div>
      </HPCard>

      {/* Wellbeing dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {HR_WELLBEING_DIMS.map(d => (
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

      {/* At-risk spotlight */}
      {atRisk.length > 0 && (
        <div style={{
          marginBottom: 16, background: `linear-gradient(135deg, ${HP_TOKENS.coralSoft}, #FFF4F2)`,
          borderRadius: 20, padding: '14px 16px', border: `1.5px solid ${HP_TOKENS.coral}30`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <HPGlyph name="leaf" size={16} color={HP_TOKENS.coral} />
            <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.coral }}>
              {atRisk.length} Karyawan Butuh Intervensi
            </div>
          </div>
          {atRisk.map(e => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fff', borderRadius: 12, padding: '10px 12px', marginBottom: 6,
            }}>
              <div style={{ fontSize: 20 }}>{e.mood}</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{e.name}</div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{e.dept} · WB: {e.wellbeing} · Eng: {e.engagement}</div>
              </div>
              <button className="hp-tap" style={{
                padding: '6px 12px', borderRadius: 10, border: 'none',
                background: HP_TOKENS.coral, color: '#fff', fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
              }}>Intervensi</button>
            </div>
          ))}
        </div>
      )}

      {/* Wellbeing programs */}
      <SectionHeader icon="calendar" label="Program Wellbeing" action="Kelola" onAction={() => openModal('manage_programs')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {WELLBEING_PROGRAMS.map(p => (
          <HPCard key={p.id} padding={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: TONE_SOFT[p.tone] || HP_TOKENS.lineSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HPGlyph name="leaf" size={20} color={TONE_COLOR[p.tone] || HP_TOKENS.inkSoft} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{p.title}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                      {p.enrolled}/{p.total} karyawan · {p.category}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 900, fontFamily: HP_FONT,
                    color: TONE_COLOR[p.tone], padding: '3px 8px', background: TONE_SOFT[p.tone], borderRadius: 8,
                  }}>
                    {Math.round((p.enrolled / p.total) * 100)}%
                  </div>
                </div>
                <div style={{ marginTop: 8, height: 4, background: HP_TOKENS.lineSoft, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(p.enrolled / p.total) * 100}%`, height: '100%',
                    background: TONE_COLOR[p.tone] || HP_TOKENS.sage, borderRadius: 2,
                  }} />
                </div>
              </div>
            </div>
          </HPCard>
        ))}
      </div>

      {/* Wellbeing per dept */}
      <SectionHeader icon="sparkle" label="Wellbeing per Departemen" />
      <HPCard padding={14}>
        {HR_DEPT_PULSE.map((d, i) => (
          <div key={d.dept} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${HP_TOKENS.lineSoft}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{d.dept}</div>
                {d.atRisk > 0 && <div style={{ fontSize: 10, color: HP_TOKENS.coral, fontWeight: 800 }}>⚠️ {d.atRisk} at-risk</div>}
              </div>
              <div style={{ ...HP_TEXT.small, color: TONE_COLOR[d.tone], fontWeight: 800 }}>{d.wellbeing}/100</div>
            </div>
            <HPBar value={d.wellbeing} tone={d.tone as any} />
          </div>
        ))}
      </HPCard>
    </div>
  );
}
