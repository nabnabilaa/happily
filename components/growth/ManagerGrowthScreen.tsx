"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { MANAGER_TEAM_MEMBERS, MANAGER_SKILLS } from "@/lib/mockData";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPBar from "@/components/ui/HPBar";
import HPAvatar from "@/components/ui/HPAvatar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";

interface Props { openModal: (name: string, props?: any) => void; }

export default function ManagerGrowthScreen({ openModal }: Props) {
  const { state, user, updateState } = useHP();
  const [refreshing, setRefreshing] = React.useState(false);

  if (!state || !user) return null;

  const TEAM_SKILL_GAPS = [
    { skill: 'Leadership', avg: 52, target: 75, gap: 23, critical: true },
    { skill: 'Data Analysis', avg: 44, target: 70, gap: 26, critical: true },
    { skill: 'Communication', avg: 68, target: 80, gap: 12, critical: false },
    { skill: 'Technical Writing', avg: 55, target: 70, gap: 15, critical: false },
  ];

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Growth Tim" subtitle="Perkembangan kompetensi & karir tim" />

      {/* Manager's own growth profile */}
      <HPCard padding={20} style={{
        background: `linear-gradient(135deg, ${HP_TOKENS.paper}, #fff)`,
        border: `2px solid ${HP_TOKENS.blueSoft}`, marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{
            width: 70, height: 70, borderRadius: 20,
            background: HP_TOKENS.blueWash, display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', border: `1.5px solid ${HP_TOKENS.blueSoft}`,
          }}>
            <HPAvatar name={user.name} size={50} rank={user.rank} />
            <div style={{
              position: 'absolute', top: -5, right: -5, padding: '3px 8px', borderRadius: 10,
              background: HP_TOKENS.blue, color: '#fff', fontWeight: 900, fontSize: 10,
            }}>LV.{user.level}</div>
          </div>
          <div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 900, letterSpacing: 1 }}>MANAGER STATUS</div>
            <div style={{ ...HP_TEXT.title, fontSize: 20, marginTop: 2 }}>{user.name}</div>
            <div style={{ ...HP_TEXT.small, marginTop: 4 }}>Rank {user.rank} · {user.role}</div>
          </div>
        </div>
        <div>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 8 }}>My Skill Progress</div>
          {MANAGER_SKILLS.map((s, i) => (
            <div key={s.name} style={{ padding: '8px 0', borderTop: i === 0 ? 'none' : `1px solid ${HP_TOKENS.lineSoft}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{s.name}</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>{s.current}/{s.target}</div>
              </div>
              <HPBar value={s.current} tone="blue" />
            </div>
          ))}
        </div>
      </HPCard>

      {/* Team Skill Gap Analysis */}
      <SectionHeader icon="tree" label="Gap Kompetensi Tim" />
      <HPCard padding={14} style={{ marginBottom: 16 }}>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginBottom: 12, fontWeight: 600 }}>
          Analisis berdasarkan aktivitas & target Q2
        </div>
        {TEAM_SKILL_GAPS.map((g, i) => (
          <div key={g.skill} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${HP_TOKENS.lineSoft}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{g.skill}</div>
                {g.critical && (
                  <div style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6,
                    background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral, fontFamily: HP_FONT,
                  }}>GAP {g.gap}</div>
                )}
              </div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>{g.avg} / {g.target}</div>
            </div>
            <div style={{ position: 'relative' }}>
              <HPBar value={g.avg} tone={g.critical ? 'coral' : 'sage'} />
              <div style={{
                position: 'absolute', top: -3, left: `${g.target}%`,
                width: 2, height: 12, background: HP_TOKENS.blue, borderRadius: 1
              }} />
            </div>
          </div>
        ))}
      </HPCard>

      {/* Individual growth summary */}
      <SectionHeader icon="people" label="Perkembangan Anggota" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MANAGER_TEAM_MEMBERS.map(m => (
          <HPCard key={m.id} padding={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HPAvatar name={m.name} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{m.name}</div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{m.role}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <span style={{ fontSize: 12 }}>🔥</span>
                  <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, fontWeight: 700 }}>
                    {m.streak} day streak
                  </span>
                  <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>·</span>
                  <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage }}>
                    {m.tasks.done}/{m.tasks.total} quests
                  </span>
                </div>
              </div>
              <button className="hp-tap" onClick={() => openModal('coaching_session')} style={{
                padding: '8px 12px', borderRadius: 10, border: 'none', background: HP_TOKENS.blueWash,
                color: HP_TOKENS.blue, fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
              }}>
                Coaching
              </button>
            </div>
          </HPCard>
        ))}
      </div>

      {/* Recommended L&D */}
      <div style={{ marginTop: 16 }}>
        <SectionHeader icon="book" label="Rekomendasi L&D untuk Tim" action="Kelola" onAction={() => openModal('manage_learning')} />
        <HPCard padding={14} style={{ background: HP_TOKENS.blueWash, border: 'none' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <HPGlyph name="sparkle" size={18} color={HP_TOKENS.blue} />
            <div>
              <div style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.blue }}>Rekomendasi AI</div>
              <div style={{ ...HP_TEXT.body, fontSize: 13, marginTop: 4 }}>
                Berdasarkan skill gap, tim kamu perlu pelatihan <strong>Leadership</strong> dan <strong>Data Analysis</strong> di Q2 ini. Workshop 2 hari akan lebih efektif daripada kursus mandiri.
              </div>
            </div>
          </div>
        </HPCard>
      </div>
    </div>
  );
}
