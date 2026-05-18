"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { HR_LD_PROGRAMS, HR_WELLBEING_DIMS, HR_DEPT_PULSE, HR_ORG_METRICS, HR_SKILLS } from "@/lib/mockData";
import { useHP } from "@/lib/HPContext";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPBar from "@/components/ui/HPBar";
import HPAvatar from "@/components/ui/HPAvatar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";

interface Props { openModal: (name: string, props?: any) => void; }

const TONE_COLOR: Record<string, string> = {
  sage: HP_TOKENS.sage, blue: HP_TOKENS.blue,
  yellow: '#8A6814', coral: HP_TOKENS.coral, lavender: HP_TOKENS.lavender,
};
const TONE_SOFT: Record<string, string> = {
  sage: HP_TOKENS.sageSoft, blue: HP_TOKENS.blueSoft,
  yellow: HP_TOKENS.yellowSoft, coral: HP_TOKENS.coralSoft, lavender: HP_TOKENS.lavenderSoft,
};

export default function HRAnalyticsScreen({ openModal }: Props) {
  const { user } = useHP();
  if (!user) return null;

  const m = HR_ORG_METRICS;

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Analytics" subtitle="Insight organisasi & wellbeing karyawan" />

      {/* HR's own growth */}
      <HPCard padding={20} style={{
        background: `linear-gradient(135deg, ${HP_TOKENS.paper}, #fff)`,
        border: `2px solid ${HP_TOKENS.lavenderSoft}`, marginBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <HPAvatar name={user.name} size={52} rank={user.rank} />
          <div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.lavender, fontWeight: 900, letterSpacing: 1 }}>HR STATUS</div>
            <div style={{ ...HP_TEXT.title, fontSize: 18, marginTop: 2 }}>{user.name}</div>
            <div style={{ ...HP_TEXT.small, marginTop: 3 }}>Rank {user.rank} · {user.role}</div>
          </div>
        </div>
        {HR_SKILLS.map((s, i) => (
          <div key={s.name} style={{ padding: '8px 0', borderTop: i === 0 ? 'none' : `1px solid ${HP_TOKENS.lineSoft}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{s.name}</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>{s.current}/{s.target}</div>
            </div>
            <HPBar value={s.current} tone="lavender" />
          </div>
        ))}
      </HPCard>

      {/* Org Wellbeing Dims */}
      <SectionHeader icon="leaf" label="Dimensi Wellbeing Organisasi" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {HR_WELLBEING_DIMS.map(d => (
          <HPCard key={d.key} padding={14} style={{ background: TONE_SOFT[d.tone] || HP_TOKENS.lineSoft, border: 'none' }}>
            <div style={{ ...HP_TEXT.tiny, color: TONE_COLOR[d.tone], marginBottom: 6 }}>{d.label.toUpperCase()}</div>
            <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 28, color: TONE_COLOR[d.tone], lineHeight: 1 }}>
              {d.score}
            </div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4 }}>/100</div>
            <div style={{ ...HP_TEXT.tiny, color: d.trend.startsWith('+') ? HP_TOKENS.sage : HP_TOKENS.coral, marginTop: 4, fontWeight: 800 }}>
              {d.trend} vs minggu lalu
            </div>
          </HPCard>
        ))}
      </div>

      {/* L&D Programs */}
      <SectionHeader icon="book" label="Program L&D" count={String(HR_LD_PROGRAMS.length)} action="Kelola" onAction={() => openModal('manage_programs')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {HR_LD_PROGRAMS.map(p => (
          <HPCard key={p.id} padding={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: TONE_SOFT[p.tone] || HP_TOKENS.lineSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HPGlyph name="book" size={20} color={TONE_COLOR[p.tone] || HP_TOKENS.inkSoft} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{p.title}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                      {p.enrolled} terdaftar · {p.completed} selesai · Due {p.due}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 900, fontFamily: HP_FONT,
                    color: TONE_COLOR[p.tone], padding: '3px 8px',
                    background: TONE_SOFT[p.tone], borderRadius: 8,
                  }}>
                    {Math.round((p.completed / p.enrolled) * 100)}%
                  </div>
                </div>
                <div style={{ marginTop: 8, height: 5, background: HP_TOKENS.lineSoft, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(p.completed / p.enrolled) * 100}%`, height: '100%',
                    background: TONE_COLOR[p.tone] || HP_TOKENS.sage, borderRadius: 3,
                    transition: '1s ease',
                  }} />
                </div>
              </div>
            </div>
          </HPCard>
        ))}
      </div>

      {/* Engagement trend per dept */}
      <SectionHeader icon="sparkle" label="Engagement per Departemen" />
      <HPCard padding={14}>
        {HR_DEPT_PULSE.map((d, i) => (
          <div key={d.dept} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${HP_TOKENS.lineSoft}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{d.dept}</div>
              <div style={{ ...HP_TEXT.small, color: TONE_COLOR[d.tone], fontWeight: 800 }}>{d.engagement}/100</div>
            </div>
            <HPBar value={d.engagement} tone={d.tone as any} />
          </div>
        ))}
      </HPCard>

      {/* Org Wellbeing insight */}
      <HPCard style={{ marginTop: 14, background: `linear-gradient(135deg, #F0ECF8, #fff)`, border: `1.5px solid ${HP_TOKENS.lavenderSoft}` }} padding={16}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <HPGlyph name="sparkle" size={20} color={HP_TOKENS.lavender} />
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.lavender }}>AI HR Insight</div>
            <div style={{ ...HP_TEXT.body, fontSize: 13, marginTop: 6 }}>
              Wellbeing tim Engineering berisiko turun jika workload tidak disesuaikan. Pertimbangkan realokasi task atau tambah kapasitas Q3.
            </div>
            <button onClick={() => openModal('grow_coaching', { role: 'hr' })} className="hp-tap" style={{
              marginTop: 10, padding: '8px 16px', borderRadius: 12, border: 'none',
              background: HP_TOKENS.lavender, color: '#fff', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            }}>
              Diskusi dengan AI
            </button>
          </div>
        </div>
      </HPCard>
    </div>
  );
}
