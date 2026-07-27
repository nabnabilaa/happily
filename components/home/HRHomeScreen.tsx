"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useHP, calculateLevelProgress } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT, HP_MOODS, HP_ENERGY } from "@/lib/constants";
import { generateAIInsights } from "@/lib/aiInsights";
import { isMidDayWindow } from "@/lib/timeUtils";

// Hooks
import { useTimeReminders } from "@/hooks/useTimeReminders";
import { useCoachNudge } from "@/hooks/useCoachNudge";
import { useHabitManager } from "@/hooks/useHabitManager";

// UI primitives
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import BlobBackground from "@/components/home/BlobBackground";
import Confetti from "@/components/home/Confetti";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";
import CentralNudgeOverlay from "@/components/ui/CentralNudgeOverlay";
import MorningPlanPopup from "@/components/ui/MorningPlanPopup";
import NotificationBanner from "@/components/pwa/NotificationBanner";

// HR-specific
import BurnoutAlertCard from "@/components/home/BurnoutAlertCard";
import HRAnalyticsTabs from "@/components/home/HRAnalyticsTabs";

// Shared personal features
import WellbeingGauge from "@/components/home/WellbeingGauge";
import CoachNudgeBanner from "@/components/home/CoachNudgeBanner";
import EmotionalHero from "@/components/home/EmotionalHero";
import CoworkingWidget from "@/components/home/CoworkingWidget";
import DailyChallengeWidget from "@/components/home/DailyChallengeWidget";
import HabitCell from "@/components/home/HabitCell";
import HabitDetailsModal from "@/components/home/HabitDetailsModal";
import SectionHeader from "@/components/home/SectionHeader";
import AttendanceWidget from "@/components/home/AttendanceWidget";
import SurveySection from "@/components/home/SurveySection";
import TaskHarianWidget from "@/components/home/TaskHarianWidget";
import InsightCard from "@/components/home/InsightCard";
import HabitEmptyState from "@/components/home/HabitEmptyState";

interface Props { openModal: (name: string, props?: any) => void; }

export default function HRHomeScreen({ openModal }: Props) {
  const { user, state, awardXP, updateState, notify } = useHP();

  const aiInsights = useMemo(() => {
    if (!user || !state?.hrData) return [];
    return generateAIInsights(state, user);
  }, [state, user]);

  // Personal feature state
  const [confetti, setConfetti] = useState(false);
  const [celebrate, setCelebrate] = useState<{show: boolean, points?: number, message?: string}>({show: false});
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  // Attendance fetch (needed for useTimeReminders)
  useEffect(() => {
    if (!user?.id) return;
    const fetchAtt = () => {
      fetch(`/api/attendance/summary?userId=${user.id}`)
        .then(async res => {
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return res.json();
        })
        .then(data => setTodayAttendance(data.today || {}))
        .catch(err => console.warn("Attendance fetch failed:", err.message));
    };
    fetchAtt();
    window.addEventListener('hp_db_update', fetchAtt);
    return () => window.removeEventListener('hp_db_update', fetchAtt);
  }, [user?.id]);

  // Auto-scroll to clock-in
  useEffect(() => {
    const handleScrollToClockIn = () => {
      setTimeout(() => {
        const el = document.getElementById('attendance-clock-in-btn');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'transform 0.3s ease';
          el.style.transform = 'scale(1.05)';
          setTimeout(() => el.style.transform = 'scale(1)', 350);
        }
      }, 100);
    };
    window.addEventListener('hp_scroll_to_clock_in', handleScrollToClockIn);
    return () => window.removeEventListener('hp_scroll_to_clock_in', handleScrollToClockIn);
  }, []);

  // Personal hooks — same as employee
  const { reminder, isClockedIn, isClockedOut } = useTimeReminders(
    state, user, todayAttendance, updateState, openModal
  );
  const { coachNudge, centralNudge, setCentralNudge, beeMood } = useCoachNudge(
    state, user, todayAttendance, isClockedIn, isClockedOut, openModal
  );
  const {
    selectedHabitDay, setSelectedHabitDay,
    habitNote, setHabitNote,
    handleHabitDayClick, handleFinishTraining, saveHabitDay, handleQuickComplete,
  } = useHabitManager(updateState, awardXP, notify, setConfetti, setCelebrate);

  const yesterdayPlan = useMemo(() => {
    if (!state?.logbook) return null;
    const today = new Date().toLocaleDateString('id-ID');
    const reflection = state.logbook.find((l: any) =>
      l.type === 'daily_reflection' &&
      new Date(l.created_at).toLocaleDateString('id-ID') !== today
    );
    if (reflection?.metadata_json) {
      try {
        const meta = JSON.parse(reflection.metadata_json);
        if (meta.tomorrowPlan) return meta.tomorrowPlan;
      } catch {}
    }
    return null;
  }, [state?.logbook]);

  if (!user || !state?.hrData) return (
    <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Memuat data HR...</div>
  );

  const { metrics: m } = state.hrData;
  const levelProgress = calculateLevelProgress(user.points || 0);

  // HR = konsol admin/pengawas yang bersih: fitur personal karyawan selalu disembunyikan.
  // Employee yang butuh fitur personal tetap login sebagai employee (bukan role HR).
  const showPersonal = false;

  const moodsList = state?.moods || HP_MOODS;
  const energyList = state?.energyOpts || HP_ENERGY;
  const currentMood = state.mood ?? null;
  const currentEnergy = state.energy ?? null;
  const moodObj = moodsList.find((m: any) => m.key === currentMood);
  const energyObj = energyList.find((e: any) => e.key === currentEnergy);

  const handleInsightClick = (action?: string) => {
    if (!action) return;
    if (action === 'scroll_task') {
      const el = document.getElementById('task-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (action === 'open_wellbeing') {
      openModal('checkin');
    } else if (action === 'open_logbook') {
      openModal('logbook');
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 120, fontFamily: HP_FONT }}>
      <BlobBackground colors={[HP_TOKENS.lavenderSoft, HP_TOKENS.yellowWash, HP_TOKENS.blueWash]} />
      <Confetti show={confetti} />
      <CelebrationOverlay show={celebrate.show} points={celebrate.points} message={celebrate.message} onComplete={() => setCelebrate({show: false})} />
      <CentralNudgeOverlay nudge={centralNudge} onClose={() => setCentralNudge(null)} />
      <MorningPlanPopup planText={yesterdayPlan} userId={user?.id} />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px', paddingTop: 8 }} className="hp-stagger">
        <NotificationBanner />

        {/* ═══ 12-COLUMN BENTO GRID CONTAINER ═══ */}
        <div className="hp-bento-grid">
          
          {/* BENTO CARD 1: HR Profile Header (Col 12 - Hero) */}
          <div className="hp-bento-col-12">
            <div style={{
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
              borderRadius: 24, padding: '24px 22px', color: '#FFFFFF',
              boxShadow: '0 10px 30px rgba(49, 46, 129, 0.18)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -15, right: 10, fontSize: 100, fontWeight: 900, color: 'rgba(255,255,255,0.06)' }}>
                HR
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div
                  className="hp-tap"
                  onClick={() => openModal('profile_editor')}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                >
                  <HPAvatar name={user.name} size={54} rank={user.rank} levelProgress={levelProgress} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 20, color: '#FFFFFF' }}>
                        {(user.name || "User").split(' ')[0]}
                      </div>
                      <div style={{ background: '#7C3AED', color: '#FFFFFF', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 6 }}>
                        HR EXECUTIVE
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: 700 }}>
                      Level {user.level} · Class {user.rank || 'E'}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
                      {user.role} · {m.totalEmployees} karyawan terdaftar
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99,
                  background: 'rgba(255,255,255,0.12)', fontFamily: HP_FONT, fontWeight: 900, fontSize: 14, color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  🔥 <span>{user.streak} Hari</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 700 }}>Level Progress</div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.18)', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{
                      width: `${levelProgress * 100}%`, height: '100%',
                      background: '#A78BFA', borderRadius: 100,
                      transition: '1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 700 }}>Total Point</div>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 24, color: '#FFFFFF' }}>{user.points.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* BENTO CARD 2: HR Analytics Radar & Burnout (Col 12) */}
          <div className="hp-bento-col-12">
            <HRAnalyticsTabs state={state} openModal={openModal} />
          </div>

          {/* BENTO CARD 3: Pengumuman Tim (Col 6) */}
          <div className="hp-bento-col-6">
            <div className="hp-bento-card" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, color: '#065F46' }}>📢 Pengumuman</span>
                <div className="hp-bento-anchor-3d" style={{ background: '#FFFFFF', border: '1px solid #A7F3D0' }}>
                  📢
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#047857', lineHeight: 1.45, margin: '0 0 14px' }}>
                Buat broadcast pengumuman resmi ke seluruh anggota tim.
              </p>
              <button 
                onClick={() => openModal('announcement')}
                className="hp-tap"
                style={{
                  width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                  background: '#059669', color: '#FFFFFF',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                }}
              >
                Buat Pengumuman
              </button>
            </div>
          </div>

          {/* BENTO CARD 4: Kelola KPI (Col 6) */}
          <div className="hp-bento-col-6">
            <div className="hp-bento-card" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, color: '#1E40AF' }}>🎯 Kelola KPI</span>
                <div className="hp-bento-anchor-3d" style={{ background: '#FFFFFF', border: '1px solid #BFDBFE' }}>
                  🎯
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.45, margin: '0 0 14px' }}>
                Atur target KPI perusahaan, alokasikan ke Manager dan karyawan.
              </p>
              <button 
                onClick={() => openModal('manage_kpi')}
                className="hp-tap"
                style={{
                  width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                  background: '#2563EB', color: '#FFFFFF',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                }}
              >
                Buka KPI Manager
              </button>
            </div>
          </div>

          {/* BENTO CARD 5: Kelola Survey (Col 6) */}
          <div className="hp-bento-col-6">
            <div className="hp-bento-card" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, color: '#5B21B6' }}>📋 Kelola Survey</span>
                <div className="hp-bento-anchor-3d" style={{ background: '#FFFFFF', border: '1px solid #DDD6FE' }}>
                  📋
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#6D28D9', lineHeight: 1.45, margin: '0 0 14px' }}>
                Buat, sunting, dan analisis survey kepuasan serta eNPS tim.
              </p>
              <button 
                onClick={() => openModal('manage_surveys')}
                className="hp-tap"
                style={{
                  width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                  background: '#7C3AED', color: '#FFFFFF',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
                }}
              >
                Kelola Survey
              </button>
            </div>
          </div>

          {/* BENTO CARD 6: Kelola Onboarding (Col 6) */}
          <div className="hp-bento-col-6">
            <div className="hp-bento-card" style={{ background: '#FFF7ED', border: '1px solid #FFEDD5' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, color: '#9A3412' }}>✨ Onboarding</span>
                <div className="hp-bento-anchor-3d" style={{ background: '#FFFFFF', border: '1px solid #FFEDD5' }}>
                  ✨
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#C2410C', lineHeight: 1.45, margin: '0 0 14px' }}>
                Atur program dan tugas onboarding bagi karyawan baru.
              </p>
              <button 
                onClick={() => openModal('manage_onboarding')}
                className="hp-tap"
                style={{
                  width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                  background: '#EA580C', color: '#FFFFFF',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)'
                }}
              >
                Kelola Onboarding
              </button>
            </div>
          </div>

        </div>
      </div>

      {selectedHabitDay && (
        <HabitDetailsModal
          selectedHabitDay={selectedHabitDay}
          setSelectedHabitDay={setSelectedHabitDay}
          habitNote={habitNote}
          setHabitNote={setHabitNote}
          state={state}
          saveHabitDay={saveHabitDay}
        />
      )}
    </div>
  );
}
