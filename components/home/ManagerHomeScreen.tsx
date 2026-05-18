"use client";

import React from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import {
  MANAGER_TEAM_MEMBERS,
} from "@/lib/mockData";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import SectionHeader from "@/components/home/SectionHeader";
import BlobBackground from "@/components/home/BlobBackground";
import BeeMascot from "@/components/ui/BeeMascot";
import AttendanceWidget from "@/components/home/AttendanceWidget";
import SurveySection from "@/components/home/SurveySection";
import PresenceBoard from "@/components/home/PresenceBoard";

interface Props { openModal: (name: string, props?: any) => void; }

interface TeamMember {
  id: string | number;
  name: string;
  role: string;
  status: string;
  wellbeing: number;
  statusTone: string;
  glyph?: string;
  tasks: { done: number; total: number };
}

export default function ManagerHomeScreen({ openModal }: Props) {
  const { state, user, awardXP } = useHP();
  const managerData = state?.managerData || { members: [], goals: [], approvals: [] };
  const { members, goals } = managerData;
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((a: number, b: any) => a + Number(b.progress), 0) / goals.length) : 0;

  if (!user || !state) return null;

  return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 120, fontFamily: HP_FONT }}>
      <BlobBackground colors={[HP_TOKENS.blueWash, HP_TOKENS.yellowWash, HP_TOKENS.blueSoft]} />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px' }} className="hp-stagger">

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${HP_TOKENS.paper}, #fff)`,
          borderRadius: 24, padding: '24px 20px', marginTop: 8,
          border: `1.5px solid ${HP_TOKENS.line}`, boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -20, right: -10, fontSize: 100, fontWeight: 900, color: HP_TOKENS.lineSoft, zIndex: 0, opacity: 0.4 }}>
            {user.level}
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div 
                className="hp-tap"
                onClick={() => openModal('profile_editor')}
                style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
              >
                <HPAvatar name={user.name} size={52} rank={user.rank} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 20 }}>{user.name.split(' ')[0]}</div>
                    <div style={{ background: HP_TOKENS.blue, color: '#fff', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 6 }}>
                      MANAGER
                    </div>
                  </div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                    {user.role} · {members.length} anggota tim
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => openModal('system_guide')} className="hp-tap" style={{
                  background: HP_TOKENS.lineSoft, border: 'none', borderRadius: 20, width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>
                  <HPGlyph name="sparkle" size={16} color={HP_TOKENS.blue} />
                </button>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99,
                  background: HP_TOKENS.blueSoft, fontFamily: HP_FONT, fontWeight: 900, fontSize: 14, color: HP_TOKENS.blue,
                }}>
                  🔥 <span>{user.streak}</span>
                </div>
              </div>
            </div>

            {/* Team health bar - Only showing KPI Progress now */}
            <div style={{
              background: HP_TOKENS.lineSoft, borderRadius: 20, padding: '16px 20px', 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>🎯</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>RATA-RATA PROGRES KPI TIM</div>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: HP_TOKENS.blue, marginTop: -2 }}>
                    {avgProgress}<span style={{ fontSize: 14, color: HP_TOKENS.inkMute }}>%</span>
                  </div>
                </div>
              </div>
              <div style={{ width: 64, height: 64, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="32" cy="32" r="26"
                    fill="transparent"
                    stroke={`${HP_TOKENS.blue}20`}
                    strokeWidth="5"
                  />
                  <circle
                    cx="32" cy="32" r="26"
                    fill="transparent"
                    stroke={HP_TOKENS.blue}
                    strokeWidth="5"
                    strokeDasharray={163.36}
                    strokeDashoffset={163.36 - (163.36 * avgProgress) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                  />
                </svg>
                <div style={{ position: 'absolute', fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, color: HP_TOKENS.blue }}>
                  {avgProgress}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Widget — Smart: Clock-in / Clock-out / Done */}
        <div style={{ marginTop: 16 }}>
          <AttendanceWidget openModal={openModal} />
        </div>

        {/* KPI Management Button */}
        <button 
          onClick={() => openModal('manage_kpi')}
          style={{
            marginTop: 10, width: '100%', padding: '14px', borderRadius: 20, 
            background: `linear-gradient(135deg, ${HP_TOKENS.blue}, #2B5286)`, color: '#fff',
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 4px 12px rgba(59,111,160,0.3)'
          }} className="hp-tap"
        >
          🎯 Kelola KPI Bulanan
        </button>

        {/* Action Row: Weekly Review + Monthly Report */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={() => openModal('weekly_review')}
            style={{
              flex: 1, padding: '12px', borderRadius: 16,
              background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
              color: HP_TOKENS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }} className="hp-tap"
          >
            📋 Weekly Review
          </button>
          <button
            onClick={() => openModal('monthly_report')}
            style={{
              flex: 1, padding: '12px', borderRadius: 16,
              background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
              color: HP_TOKENS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }} className="hp-tap"
          >
            📊 Laporan Bulanan
          </button>
        </div>

        {/* Friday Reminders & AI Summaries */}
        {(() => {
          const today = new Date();
          const isFriday = today.getDay() === 5;
          // Last working day of month: find last weekday (Mon-Fri)
          const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          let lastWorkDay = lastDayOfMonth;
          while (lastWorkDay.getDay() === 0 || lastWorkDay.getDay() === 6) {
            lastWorkDay = new Date(lastWorkDay.getTime() - 86400000);
          }
          const isLastWorkingDayOfMonth = today.getDate() === lastWorkDay.getDate() && today.getMonth() === lastWorkDay.getMonth();
          
          if (!isFriday && !isLastWorkingDayOfMonth) return null;
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {/* Weekly AI Summary Button (Setiap Jumat) */}
              <div style={{
                padding: '12px 16px', borderRadius: 16,
                background: HP_TOKENS.blueWash, border: `1.5px solid ${HP_TOKENS.blue}40`,
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }} onClick={() => openModal('ai_weekly_summary')} className="hp-tap"
              >
                <div style={{ fontSize: 20 }}>🤖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.ink }}>Rangkuman Mingguan AI</div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                    Analisa performa mingguan per orang (Jumat)
                  </div>
                </div>
                <HPGlyph name="sparkle" size={14} color={HP_TOKENS.blue} />
              </div>

              {/* Monthly AI Analysis Button (Hari Kerja Akhir Bulan) */}
              {isLastWorkingDayOfMonth && (
                <div style={{
                  padding: '12px 16px', borderRadius: 16,
                  background: HP_TOKENS.lavenderSoft, border: `1.5px solid #6B5F8E40`,
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                }} onClick={() => openModal('ai_monthly_analysis')} className="hp-tap"
                >
                  <div style={{ fontSize: 20 }}>🔮</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.ink }}>Analisa Bulanan AI (Hari Kerja Akhir Bulan)</div>
                    <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                      Evaluasi laporan bulanan vs KPI tim
                    </div>
                  </div>
                  <HPGlyph name="sparkle" size={14} color="#6B5F8E" />
                </div>
              )}
            </div>
          );
        })()}

        <div style={{ marginTop: 16 }}>
          <SectionHeader icon="people" label="Status Tim" count={`${members.length} orang`} />
          <PresenceBoard openModal={openModal} />
        </div>



        {/* Survey Section — Smart targeting + internal questions */}
        <SurveySection openModal={openModal} />

        {/* AI Coach for Manager - with Bee Mascot */}
        <div style={{ 
          marginTop: 16, 
          background: `linear-gradient(135deg, ${HP_TOKENS.blue}, #2B5286)`, 
          borderRadius: 22,
          padding: '16px 20px',
          boxShadow: '0 8px 22px rgba(59,111,160,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 20
        }} onClick={() => openModal('coach')} className="hp-tap">
          <BeeMascot mood="happy" size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 15, color: '#fff' }}>AI Manager Coach</div>
            <div style={{ ...HP_TEXT.small, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              Feedback, coaching & pengelolaan tim
            </div>
          </div>
          <HPGlyph name="arrow" size={18} color="#fff" />
        </div>
      </div>
    </div>
  );
}
