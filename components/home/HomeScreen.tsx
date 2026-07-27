"use client";

import React, { useState, useMemo } from "react";
import { useHP, calculateLevelProgress } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_MOODS, HP_ENERGY } from "@/lib/constants";
import { generateAIInsights } from "@/lib/aiInsights";
import { isMidDayWindow } from "@/lib/timeUtils";

// Hooks
import { useTimeReminders } from "@/hooks/useTimeReminders";
import { useCoachNudge } from "@/hooks/useCoachNudge";
import { useHabitManager } from "@/hooks/useHabitManager";

// Components
import HPGlyph from "@/components/ui/HPGlyph";
import BlobBackground from "@/components/home/BlobBackground";
import Confetti from "@/components/home/Confetti";
import EmotionalHero from "@/components/home/EmotionalHero";
import SectionHeader from "@/components/home/SectionHeader";
import InsightCard from "@/components/home/InsightCard";
import HabitCell from "@/components/home/HabitCell";
import HabitEmptyState from "@/components/home/HabitEmptyState";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";
import WellbeingGauge from "@/components/home/WellbeingGauge";
import AttendanceWidget from "@/components/home/AttendanceWidget";
import TaskHarianWidget from "@/components/home/TaskHarianWidget";
import DailyChallengeWidget from "@/components/home/DailyChallengeWidget";
import CoworkingWidget from "@/components/home/CoworkingWidget";
import SurveySection from "@/components/home/SurveySection";
import NotificationBanner from "@/components/pwa/NotificationBanner";
import CentralNudgeOverlay from "@/components/ui/CentralNudgeOverlay";
import MorningPlanPopup from "@/components/ui/MorningPlanPopup";
import HPCard from "@/components/ui/HPCard";

// Extracted
import UserProfileCard from "@/components/home/UserProfileCard";
import CoachNudgeBanner from "@/components/home/CoachNudgeBanner";
import HabitDetailsModal from "@/components/home/HabitDetailsModal";

interface HomeScreenProps {
  tab: string;
  openModal: (name: string, props?: any) => void;
}

export default function HomeScreen({ openModal }: any) {
  const { state: rawState, updateState, user: rawUser, awardXP, notify } = useHP();
  
  const [confetti, setConfetti] = useState(false);
  const [celebrate, setCelebrate] = useState<{show: boolean, points?: number, message?: string}>({show: false});
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  // Fetch Attendance
  React.useEffect(() => {
    if (!rawUser?.id) return;
    const fetchAtt = () => {
      fetch(`/api/attendance/summary?userId=${rawUser.id}`)
        .then(async res => {
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Status ${res.status}: ${text.slice(0, 100)}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.today) setTodayAttendance(data.today);
          else setTodayAttendance({});
        })
        .catch(err => console.warn("Failed to fetch attendance:", err.message));
    };
    fetchAtt();
    window.addEventListener('hp_db_update', fetchAtt);
    return () => window.removeEventListener('hp_db_update', fetchAtt);
  }, [rawUser?.id]);

  // Use Custom Hooks
  const { greeting, reminder, isClockedIn, isClockedOut, midDayCheckInShown } = useTimeReminders(
    rawState, rawUser, todayAttendance, updateState, openModal
  );

  const { coachNudge, centralNudge, setCentralNudge, beeMood } = useCoachNudge(
    rawState, rawUser, todayAttendance, isClockedIn, isClockedOut, openModal
  );

  const {
    selectedHabitDay,
    setSelectedHabitDay,
    habitNote,
    setHabitNote,
    handleHabitDayClick,
    handleFinishTraining,
    saveHabitDay,
    handleQuickComplete
  } = useHabitManager(updateState, awardXP, notify, setConfetti, setCelebrate);

  const yesterdayPlan = useMemo(() => {
    if (!rawState || !rawState.logbook) return null;
    const today = new Date().toLocaleDateString('id-ID');
    const reflection = rawState.logbook.find((l: any) => 
      l.type === 'daily_reflection' && 
      new Date(l.created_at).toLocaleDateString('id-ID') !== today
    );
    if (reflection && reflection.metadata_json) {
      try {
        const meta = JSON.parse(reflection.metadata_json);
        if (meta.tomorrowPlan) return meta.tomorrowPlan;
      } catch (e) {}
    }
    return null;
  }, [rawState?.logbook]);

  const aiInsights = useMemo(() => generateAIInsights(rawState, rawUser), [rawState, rawUser]);
  const levelProgress = calculateLevelProgress(rawUser?.points || 0);

  const state = rawState;
  const user = rawUser;
  if (!state || !user) return null;

  const moodsList = state.moods || HP_MOODS;
  const energyList = state.energyOpts || HP_ENERGY;
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
      <BlobBackground colors={[HP_TOKENS.primaryWash, HP_TOKENS.card, HP_TOKENS.paper]}/>
      <Confetti show={confetti}/>
      <CelebrationOverlay show={celebrate.show} points={celebrate.points} message={celebrate.message} onComplete={() => setCelebrate({show: false})} />
      <CentralNudgeOverlay nudge={centralNudge} onClose={() => setCentralNudge(null)} />
      <MorningPlanPopup planText={yesterdayPlan} userId={rawUser?.id} />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px', paddingTop: 8 }} className="hp-stagger">
        
        <NotificationBanner />

        {/* 🕛 Mid-Day Check-In Banner */}
        {isMidDayWindow() ? (
              <div 
                onClick={() => openModal('work_checkin')}
                className="hp-tap"
                style={{
                  background: `${HP_TOKENS.yellowWash}`,
                  border: `1.5px solid ${HP_TOKENS.yellow}60`,
                  borderRadius: 20,
                  padding: '16px',
                  marginBottom: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: `0 4px 16px ${HP_TOKENS.yellow}15`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ 
                    width: 44, height: 44, borderRadius: 14, 
                    background: HP_TOKENS.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(26,29,35,0.02)'
                  }}>
                    <HPGlyph name="book" size={20} color={HP_TOKENS.ink} />
                  </div>
                  <div>
                    <div style={{ color: HP_TOKENS.ink, fontSize: 15, fontWeight: 800 }}>Mid-Day Check-in Siap!</div>
                    <div style={{ color: HP_TOKENS.inkSoft, fontSize: 13, marginTop: 2 }}>
                      Catat progresmu di pertengahan hari.
                    </div>
                  </div>
                </div>
                <HPGlyph name="chevron-right" size={20} color={HP_TOKENS.inkSoft} />
              </div>
        ) : null}

        {/* ═══ 12-COLUMN BENTO GRID CONTAINER ═══ */}
        <div className="hp-bento-grid">
          
          {/* BENTO HERO: Energy Score & Emotional Hero (Col 12) */}
          <div className="hp-bento-col-12">
            <EmotionalHero 
              state={state} 
              moodObj={moodObj} 
              energyObj={energyObj} 
              onOpenCheckIn={() => openModal('checkin')}
              showMidDay={isMidDayWindow()}
              onOpenMidDay={() => openModal('work_checkin')}
            />
          </div>

          {/* ROW 1: User Profile (Col 6) + Jadwal & Kehadiran (Col 6) */}
          <div className="hp-bento-col-6">
            <UserProfileCard user={user} levelProgress={levelProgress} openModal={openModal} />
          </div>

          <div className="hp-bento-col-6">
            <div className="hp-bento-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HPGlyph name="calendar" size={18} color="#2563EB" />
                  <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, color: '#0F172A' }}>Jadwal & Absensi</span>
                </div>
                <div className="hp-bento-anchor-3d" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                  🌙
                </div>
              </div>

              <div style={{ 
                display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 14, 
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                marginBottom: 14
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#64748B', fontWeight: 800, fontSize: 9, marginBottom: 2, textTransform: 'uppercase' }}>JAM KERJA</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>
                    {state.workSchedule?.start || '08:00'} - {state.workSchedule?.end || '17:00'}
                  </div>
                </div>
                <div style={{ width: 1, background: '#E2E8F0' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#64748B', fontWeight: 800, fontSize: 9, marginBottom: 2, textTransform: 'uppercase' }}>ISTIRAHAT</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>
                    {state.workSchedule?.breakStart || '12:00'} - {state.workSchedule?.breakEnd || '13:00'}
                  </div>
                </div>
              </div>

              <AttendanceWidget openModal={openModal} />
            </div>
          </div>

          {/* ROW 2: Aksi Cepat (Col 6) + Mindful Reset (Col 6) */}
          <div className="hp-bento-col-6">
            <div className="hp-bento-card" style={{ background: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, color: '#0F172A' }}>Aksi Cepat</span>
                <div className="hp-bento-anchor-3d" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  ⚡
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <button 
                  onClick={() => openModal('work_checkin')} 
                  className="hp-tap" 
                  style={{
                    padding: '12px 8px', borderRadius: 14, background: '#FFFFFF', border: '1px solid #E2E8F0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <span style={{ fontSize: 20 }}>⏱️</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>Clock-in</span>
                </button>

                <button 
                  onClick={() => {
                    const el = document.getElementById('task-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }} 
                  className="hp-tap" 
                  style={{
                    padding: '12px 8px', borderRadius: 14, background: '#FFFFFF', border: '1px solid #E2E8F0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <span style={{ fontSize: 20 }}>🎯</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>Task Baru</span>
                </button>

                <button 
                  onClick={() => openModal('senggol')} 
                  className="hp-tap" 
                  style={{
                    padding: '12px 8px', borderRadius: 14, background: '#FFFFFF', border: '1px solid #E2E8F0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <span style={{ fontSize: 20 }}>👀</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>Senggol</span>
                </button>

                <button 
                  onClick={() => openModal('appreciate')} 
                  className="hp-tap" 
                  style={{
                    padding: '12px 8px', borderRadius: 14, background: '#FFFFFF', border: '1px solid #E2E8F0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <span style={{ fontSize: 20 }}>🌱</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>Apresiasi</span>
                </button>
              </div>
            </div>
          </div>

          <div className="hp-bento-col-6">
            <div className="hp-bento-card" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, color: '#065F46' }}>Mindful Reset</span>
                <div className="hp-bento-anchor-3d" style={{ background: '#FFFFFF', border: '1px solid #A7F3D0' }}>
                  🧘‍♂️
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#047857', lineHeight: 1.45, margin: '0 0 14px' }}>
                Box Breathing 1 menit untuk meredakan stress dan mengembalikan fokusmu.
              </p>
              <button 
                onClick={() => openModal('pause')}
                className="hp-tap"
                style={{
                  width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                  background: '#059669', color: '#FFFFFF',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                }}
              >
                Mulai Reset
              </button>
            </div>
          </div>

          {/* ROW 3: Task Harian Widget (Col 12) */}
          <div className="hp-bento-col-12" id="task-section">
            <TaskHarianWidget 
              openModal={openModal} 
              onTaskComplete={(taskName?: string) => {
                setConfetti(true);
                setCelebrate({show: true, points: 50, message: taskName ? `Selesai: ${taskName}` : "Hebat! Satu langkah lebih dekat."});
                setTimeout(() => setConfetti(false), 1200);
              }} 
            />
          </div>

          {/* ROW 4: Nudge Harian / Daily Challenge (Col 6) + AI Insights (Col 6) */}
          <div className="hp-bento-col-6">
            <DailyChallengeWidget 
              openModal={openModal} 
              onClaimReward={(points: number, title: string) => {
                setConfetti(true);
                setCelebrate({show: true, points, message: `Misi Selesai: ${title}`});
                setTimeout(() => setConfetti(false), 1500);
              }}
            />
          </div>

          <div className="hp-bento-col-6">
            <div className="hp-bento-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, color: '#0F172A' }}>AI Coach Insights</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, marginTop: 2 }}>Rekomendasi & saran personal untukmu</div>
                </div>
                <div className="hp-bento-anchor-3d" style={{ background: '#FFF7ED', border: '1px solid #FFEDD5' }}>
                  💡
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginTop: 4 }}>
                {aiInsights.map((ins, i) => (
                  <InsightCard key={i} ins={ins} idx={i} onClick={() => handleInsightClick(ins.action)} />
                ))}
              </div>

              <button 
                onClick={() => openModal('coach')}
                className="hp-tap"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8
                }}
              >
                <HPGlyph name="sparkle" size={14} color="#2563EB" />
                <span>Konsultasi dengan Coach AI</span>
              </button>
            </div>
          </div>

          {/* ROW 5: Tim & Komunitas Coworking (Col 12) */}
          <div className="hp-bento-col-12">
            <CoworkingWidget openModal={openModal} />
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
