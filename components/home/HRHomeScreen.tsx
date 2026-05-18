"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { HP_MOODS } from "@/lib/mockData";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import SectionHeader from "@/components/home/SectionHeader";
import BlobBackground from "@/components/home/BlobBackground";
import SurveySection from "@/components/home/SurveySection";


interface Props { openModal: (name: string, props?: any) => void; }

const TONE_COLOR: Record<string, string> = {
  sage: HP_TOKENS.sage,
  blue: HP_TOKENS.blue,
  yellow: '#8A6814',
  coral: HP_TOKENS.coral,
  lavender: HP_TOKENS.lavender,
};
const TONE_SOFT: Record<string, string> = {
  sage: HP_TOKENS.sageSoft,
  blue: HP_TOKENS.blueSoft,
  yellow: HP_TOKENS.yellowSoft,
  coral: HP_TOKENS.coralSoft,
  lavender: HP_TOKENS.lavenderSoft,
};

interface AtRiskEmployee {
  id: string | number;
  name: string;
  role: string;
  dept: string;
  mood: string;
  wellbeing: number;
}

interface DeptPulse {
  dept: string;
  tone: string;
  headcount: number;
  atRisk: number;
  wellbeing: number;
  engagement: number;
}



export default function HRHomeScreen({ openModal }: Props) {
  const { user, state, awardXP } = useHP();
  
  if (!user || !state?.hrData) return (
    <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Memuat data HR...</div>
  );

  const { metrics: m, atRiskEmployees, deptPulse } = state.hrData;

  return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 120, fontFamily: HP_FONT }}>
      <BlobBackground colors={[HP_TOKENS.lavenderSoft, HP_TOKENS.yellowWash, HP_TOKENS.blueWash]} />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px' }} className="hp-stagger">

        {/* Header Card */}
        <div style={{
          background: `linear-gradient(135deg, ${HP_TOKENS.paper}, #fff)`,
          borderRadius: 24, padding: '24px 20px', marginTop: 8,
          border: `1.5px solid ${HP_TOKENS.line}`, boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -20, right: -10, fontSize: 100, fontWeight: 900, color: HP_TOKENS.lineSoft, opacity: 0.4 }}>
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
                    <div style={{ ...HP_TEXT.h, fontSize: 20 }}>{(user.name || "User").split(' ')[0]}</div>
                    <div style={{ background: HP_TOKENS.lavender, color: '#fff', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 6 }}>
                      HR
                    </div>
                  </div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                    {user.role} · {m.totalEmployees} karyawan
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99,
                background: HP_TOKENS.lavenderSoft, fontFamily: HP_FONT, fontWeight: 900, fontSize: 14, color: HP_TOKENS.lavender,
              }}>
                🔥 <span>{user.streak}</span>
              </div>
            </div>


          </div>
        </div>

        {/* Attendance Check-in Button */}
        <button 
          onClick={() => openModal('attendance_scanner')}
          style={{
            marginTop: 16, width: '100%', padding: '14px', borderRadius: 20, 
            background: HP_TOKENS.ink, color: '#fff',
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }} className="hp-tap"
        >
          <HPGlyph name="target" size={18} color="#fff" />
          Check-in Office
        </button>








        {/* Survey Section — for HR too (they are employees) */}
        <SurveySection openModal={openModal} />

        {/* Quick Action: Manage Surveys */}
        <button onClick={() => openModal('manage_surveys')} className="hp-tap" style={{
          marginTop: 16, width: '100%', padding: '16px', borderRadius: 22,
          background: `linear-gradient(135deg, ${HP_TOKENS.lavender}, #5A4E8C)`, color: '#fff',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
          fontFamily: HP_FONT, textAlign: 'left', boxShadow: '0 8px 22px rgba(123,107,181,0.3)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: 20, fontSize: 80, opacity: 0.12 }}>📋</div>
          <div style={{
            width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
          }}>📋</div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ ...HP_TEXT.h, fontSize: 15, color: '#fff' }}>Kelola Survey</div>
            <div style={{ ...HP_TEXT.small, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              Buat, edit, dan lihat hasil survey internal
            </div>
          </div>
          <HPGlyph name="arrow" size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}
