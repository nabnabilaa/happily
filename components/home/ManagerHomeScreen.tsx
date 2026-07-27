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
import BeeMascot, { getMoodColor } from "@/components/ui/BeeMascot";
import Confetti from "@/components/home/Confetti";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";
import CentralNudgeOverlay from "@/components/ui/CentralNudgeOverlay";
import MorningPlanPopup from "@/components/ui/MorningPlanPopup";
import NotificationBanner from "@/components/pwa/NotificationBanner";

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

export default function ManagerHomeScreen({ openModal }: Props) {
  const { state, user, awardXP, refresh, updateState, notify } = useHP();
  const managerData = state?.managerData || { members: [], goals: [], approvals: [], teamTasks: [] };
  const { members, goals, approvals = [], teamTasks = [] } = managerData;
  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((a: number, b: any) => a + Number(b.progress), 0) / goals.length)
    : 0;

  const aiInsights = useMemo(() => generateAIInsights(state, user), [state, user]);

  // Personal feature state
  const [confetti, setConfetti] = useState(false);
  const [celebrate, setCelebrate] = useState<{show: boolean, points?: number, message?: string}>({show: false});
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [currentPageApprovals, setCurrentPageApprovals] = useState(1);

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

  // Auto-scroll to clock-in button
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

  const approvalsPerPage = 5;
  const totalPagesApprovals = Math.ceil((approvals || []).length / approvalsPerPage);
  const activePageApprovals = Math.min(currentPageApprovals, Math.max(1, totalPagesApprovals));
  const paginatedApprovals = (approvals || []).slice(
    (activePageApprovals - 1) * approvalsPerPage,
    activePageApprovals * approvalsPerPage
  );

  const pendingTasks = teamTasks.filter((t: any) => t.done && !t.verified);
  const levelProgress = calculateLevelProgress(user?.points || 0);

  const moodsList = state?.moods || HP_MOODS;
  const energyList = state?.energyOpts || HP_ENERGY;
  const moodObj = moodsList.find((m: any) => m.key === state?.mood);
  const energyObj = energyList.find((e: any) => e.key === state?.energy);

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

  if (!user || !state) return null;

  return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 120, fontFamily: HP_FONT }}>
      <BlobBackground colors={[HP_TOKENS.blueWash, HP_TOKENS.yellowWash, HP_TOKENS.blueSoft]} />
      <Confetti show={confetti} />
      <CelebrationOverlay show={celebrate.show} points={celebrate.points} message={celebrate.message} onComplete={() => setCelebrate({show: false})} />
      <CentralNudgeOverlay nudge={centralNudge} onClose={() => setCentralNudge(null)} />
      <MorningPlanPopup planText={yesterdayPlan} userId={user?.id} />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px', paddingTop: 8 }} className="hp-stagger">
        <NotificationBanner />

        {/* ═══ 12-COLUMN BENTO GRID CONTAINER ═══ */}
        <div className="hp-bento-grid">
          
          {/* BENTO HERO: Emotional Check-in & Status (Col 12) */}
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

          {/* ROW 1: Manager Profile & Team KPI Gauge (Col 6) + Jadwal & Kehadiran (Col 6) */}
          <div className="hp-bento-col-6">
            <div className="hp-bento-card" style={{ background: '#FFFFFF' }}>
              <div
                className="hp-tap"
                onClick={() => openModal('profile_editor')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <HPAvatar name={user.name} size={52} rank={user.rank} levelProgress={levelProgress} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ ...HP_TEXT.h, fontSize: 18, color: '#0F172A' }}>{user.name.split(' ')[0]}</div>
                      <div style={{ background: '#1D3557', color: '#FFFFFF', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 6 }}>
                        MANAGER
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: 700 }}>
                      Level {user.level} · Class {user.rank || 'E'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                      {user.role} · {members.length} anggota tim
                    </div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99,
                  background: 'rgba(29, 53, 87, 0.08)', fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, color: '#1D3557',
                  border: '1px solid rgba(29, 53, 87, 0.2)'
                }}>
                  🔥 <span>{user.streak}</span>
                </div>
              </div>

              {/* Team KPI Gauge Box */}
              <div style={{
                background: '#F8FAFC', borderRadius: 16, padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: '1px solid #E2E8F0', marginTop: 'auto'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 22 }}>🎯</div>
                  <div>
                    <div style={{ color: '#64748B', fontWeight: 800, fontSize: 10, textTransform: 'uppercase' }}>PROGRES KPI TIM</div>
                    <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 20, color: '#1D3557' }}>
                      {avgProgress}<span style={{ fontSize: 13, color: '#64748B' }}>%</span>
                    </div>
                  </div>
                </div>
                <div style={{ width: 52, height: 52, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="52" height="52" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="32" cy="32" r="26" fill="transparent" stroke="rgba(29, 53, 87, 0.15)" strokeWidth="6" />
                    <circle
                      cx="32" cy="32" r="26" fill="transparent"
                      stroke="#1D3557" strokeWidth="6"
                      strokeDasharray={163.36}
                      strokeDashoffset={163.36 - (163.36 * avgProgress) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: 'absolute', fontFamily: HP_FONT, fontWeight: 900, fontSize: 11, color: '#1D3557' }}>
                    {avgProgress}%
                  </div>
                </div>
              </div>
            </div>
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

          {/* ROW 2: Manager Quick Actions (Col 6) + Mindful Reset (Col 6) */}
          <div className="hp-bento-col-6">
            <div className="hp-bento-card" style={{ background: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, color: '#0F172A' }}>Aksi Manager</span>
                <div className="hp-bento-anchor-3d" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  ⚡
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <button 
                  onClick={() => openModal('manage_kpi')} 
                  className="hp-tap" 
                  style={{
                    padding: '12px 8px', borderRadius: 14, background: '#FFFFFF', border: '1px solid #E2E8F0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <span style={{ fontSize: 20 }}>🎯</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>KPI Bulanan</span>
                </button>

                <button 
                  onClick={() => openModal('weekly_review')} 
                  className="hp-tap" 
                  style={{
                    padding: '12px 8px', borderRadius: 14, background: '#FFFFFF', border: '1px solid #E2E8F0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <span style={{ fontSize: 20 }}>📋</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>Weekly Review</span>
                </button>

                <button 
                  onClick={() => openModal('monthly_report')} 
                  className="hp-tap" 
                  style={{
                    padding: '12px 8px', borderRadius: 14, background: '#FFFFFF', border: '1px solid #E2E8F0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <span style={{ fontSize: 20 }}>📊</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>Laporan Bulanan</span>
                </button>

                <button 
                  onClick={() => openModal('report_export')} 
                  className="hp-tap" 
                  style={{
                    padding: '12px 8px', borderRadius: 14, background: '#FFFFFF', border: '1px solid #E2E8F0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <span style={{ fontSize: 20 }}>📥</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>Ekspor Excel</span>
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
            <div style={{ marginTop: 24 }}>
              <SectionHeader icon="sparkle" label="AI Coach Insights" />
              <div style={{
                border: `1.5px solid ${HP_TOKENS.lineSoft}`,
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.05)',
                borderRadius: 24,
                background: '#fff',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                  color: '#fff', position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>
                    AI COACH INSIGHTS
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                    Rekomendasi & Analisis Tim Hari Ini
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
                    Didorong oleh data mood, energi, dan progres kerja tim.
                  </div>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {aiInsights.map((ins, i) => (
                    <InsightCard key={i} ins={ins} idx={i} onClick={() => handleInsightClick(ins.action)} />
                  ))}

                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Tanya Manager Coach AI
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <button onClick={() => openModal('coach')} className="hp-tap" style={{ padding: '6px 12px', borderRadius: 20, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        💡 Evaluasi beban tim?
                      </button>
                      <button onClick={() => openModal('coach')} className="hp-tap" style={{ padding: '6px 12px', borderRadius: 20, background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#7C3AED', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        🌱 Tips feedback positif
                      </button>
                      <button onClick={() => openModal('coach')} className="hp-tap" style={{ padding: '6px 12px', borderRadius: 20, background: '#FFF7ED', border: '1px solid #FFEDD5', color: '#EA580C', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        ⚡ Strategi capai KPI
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => openModal('coach')}
                    className="hp-tap"
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 14,
                      background: '#2563EB', color: '#FFFFFF', border: 'none',
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    <HPGlyph name="sparkle" size={16} color="#FFFFFF" />
                    <span>Buka Chat Coach AI</span>
                  </button>
                </div>
              </div>
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
