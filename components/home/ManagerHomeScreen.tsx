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

  if (!user || !state) return null;

  return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 120, fontFamily: HP_FONT }}>
      <BlobBackground colors={[HP_TOKENS.blueWash, HP_TOKENS.yellowWash, HP_TOKENS.blueSoft]} />
      <Confetti show={confetti} />
      <CelebrationOverlay show={celebrate.show} points={celebrate.points} message={celebrate.message} onComplete={() => setCelebrate({show: false})} />
      <CentralNudgeOverlay nudge={centralNudge} onClose={() => setCentralNudge(null)} />
      <MorningPlanPopup planText={yesterdayPlan} userId={user?.id} />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px' }} className="hp-stagger">
        <NotificationBanner />

        {/* Mid-Day Check-In Banner */}
        {isMidDayWindow() && (
          <div
            onClick={() => openModal('work_checkin')}
            className="hp-tap"
            style={{
              background: `${HP_TOKENS.yellowWash}`,
              border: `1.5px solid ${HP_TOKENS.yellow}60`, borderRadius: 20,
              padding: '16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', boxShadow: `0 4px 16px ${HP_TOKENS.yellow}15`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: HP_TOKENS.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HPGlyph name="book" size={20} color={HP_TOKENS.ink} />
              </div>
              <div>
                <div style={{ color: HP_TOKENS.ink, fontSize: 15, fontWeight: 800 }}>Mid-Day Check-in Siap!</div>
                <div style={{ color: HP_TOKENS.inkSoft, fontSize: 13, marginTop: 2 }}>Catat progresmu di pertengahan hari.</div>
              </div>
            </div>
            <HPGlyph name="chevron-right" size={20} color={HP_TOKENS.inkSoft} />
          </div>
        )}

        {/* Personal wellbeing */}
        <WellbeingGauge state={state} user={user} openModal={openModal} />

        {/* Manager Profile Header */}
        <div style={{
          background: `${HP_TOKENS.paper}`,
          borderRadius: 24, padding: '24px 20px', marginTop: 8,
          border: `1.5px solid ${HP_TOKENS.line}`, boxShadow: '0 10px 30px rgba(26,29,35,0.04)',
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
                <HPAvatar name={user.name} size={52} rank={user.rank} levelProgress={levelProgress} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 20 }}>{user.name.split(' ')[0]}</div>
                    <div style={{ background: HP_TOKENS.blue, color: '#F4F7F9', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 6 }}>
                      MANAGER
                    </div>
                  </div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2, fontWeight: 700 }}>
                    Level {user.level} · Class {user.rank || 'E'}
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 1 }}>
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

            {/* Level progress & Total points */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Level Progress</div>
                <div style={{ width: '100%', height: 6, background: HP_TOKENS.lineSoft, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${levelProgress * 100}%`, height: '100%',
                    background: HP_TOKENS.blue,
                    transition: '1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Total Point</div>
                <div style={{ ...HP_TEXT.h, fontSize: 24 }}>{user.points.toLocaleString()}</div>
              </div>
            </div>

            {/* Team KPI Progress */}
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
                  <circle cx="32" cy="32" r="26" fill="transparent" stroke={`${HP_TOKENS.blue}20`} strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r="26" fill="transparent"
                    stroke={HP_TOKENS.blue} strokeWidth="5"
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

        {/* Nudge Banner (Bubble) */}
        <CoachNudgeBanner coachNudge={coachNudge} beeMood={beeMood as any} openModal={openModal} />

        {/* Attendance */}
        <div style={{ marginTop: 16 }}>
          <AttendanceWidget openModal={openModal} />
        </div>

        {/* Logbook */}
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => openModal('logbook')} className="hp-tap" style={{
            width: '100%', padding: '12px 16px', borderRadius: 16,
            background: HP_TOKENS.card, color: HP_TOKENS.ink,
            border: `1.5px solid ${HP_TOKENS.lineSoft}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 13,
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <HPGlyph name="book" size={16} color={HP_TOKENS.inkSoft}/>
            <span>Lihat Riwayat & Logbook Calendar</span>
          </button>
        </div>

        {/* Mood & Energy check-in */}
        <div style={{ marginTop: 16 }}>
          <EmotionalHero
            state={state}
            moodObj={moodObj}
            energyObj={energyObj}
            onOpenCheckIn={() => openModal('checkin')}
            showMidDay={isMidDayWindow()}
            onOpenMidDay={() => openModal('work_checkin')}
          />
        </div>

        {/* Mindful Breathing Reset */}
        <div style={{ marginTop: 16 }}>
          <HPCard
            padding={16}
            style={{
              background: `${HP_TOKENS.sageWash}`,
              border: `1.5px solid ${HP_TOKENS.sage}20`,
              boxShadow: '0 8px 24px rgba(74, 124, 89, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: HP_TOKENS.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}>
                🧘‍♂️
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: HP_TOKENS.ink }}>Butuh Jeda Sejenak?</div>
                <div style={{ fontSize: 12, color: HP_TOKENS.inkSoft, marginTop: 2, lineHeight: 1.4 }}>
                  Latihan bernapas Box Breathing 1 menit untuk menurunkan stress dan mengembalikan fokus.
                </div>
              </div>
              <button
                onClick={() => openModal('pause')}
                className="hp-tap"
                style={{
                  padding: '10px 16px', borderRadius: 12, border: 'none',
                  background: HP_TOKENS.sage, color: '#F4F7F9',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  boxShadow: `0 4px 12px ${HP_TOKENS.sage}30`, whiteSpace: 'nowrap'
                }}
              >
                Mulai Reset
              </button>
            </div>
          </HPCard>
        </div>

        {/* Smart Reminders */}
        {reminder && (
          <div style={{ marginTop: 16 }}>
            <HPCard padding={16} style={{
              background: reminder.type === 'break' ? HP_TOKENS.yellowWash : HP_TOKENS.sageWash,
              border: `1.5px solid ${reminder.type === 'break' ? HP_TOKENS.yellow : HP_TOKENS.sage}`,
              animation: 'hpPulse 3s infinite'
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: reminder.type === 'break' ? HP_TOKENS.yellow : reminder.type === 'meeting' ? HP_TOKENS.blue : HP_TOKENS.sage,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                }}>
                  {reminder.type === 'break' ? '🥪' : reminder.type === 'meeting' ? '🎥' : '🌙'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {reminder.type === 'break' ? 'Waktunya Istirahat!' : 'Bentar lagi Pulang!'}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    {reminder.type === 'break' && `${reminder.mins} menit lagi istirahat. Yuk, siap-siap rehat sejenak! 🌿`}
                    {reminder.type === 'meeting' && `${reminder.mins} menit lagi meeting dengan ${reminder.sessionWith}. Link Meet sudah siap! 🚀`}
                    {reminder.type === 'clockout' && `${reminder.mins} menit lagi jam kerja selesai. Yuk, persiapkan refleksi Tutup Hari kamu! ✨`}
                  </div>
                </div>
                {reminder.type === 'clockout' && (
                  <button onClick={() => openModal('reflect')} className="hp-tap" style={{
                    padding: '8px 14px', borderRadius: 10, border: 'none',
                    background: HP_TOKENS.sage, color: '#F4F7F9',
                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer'
                  }}>Tutup Hari</button>
                )}
                {reminder.type === 'meeting' && (
                  <button
                    onClick={() => state.coaching?.meetLink && window.open(state.coaching.meetLink, '_blank')}
                    className="hp-tap"
                    style={{
                      padding: '8px 14px', borderRadius: 10, border: 'none',
                      background: HP_TOKENS.blue, color: '#F4F7F9',
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <HPGlyph name="video" size={12} color="#F4F7F9" />
                    Join Meet
                  </button>
                )}
              </div>
            </HPCard>
          </div>
        )}

        {/* Manager-specific actions */}
        <button
          onClick={() => openModal('manage_kpi')}
          style={{
            marginTop: 10, width: '100%', padding: '14px', borderRadius: 20,
            background: `${HP_TOKENS.blue}`, color: '#F4F7F9',
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 4px 12px rgba(59,111,160,0.3)'
          }} className="hp-tap"
        >
          🎯 Kelola KPI Bulanan
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <button onClick={() => openModal('weekly_review')} style={{
            padding: '12px', borderRadius: 16,
            background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
            color: HP_TOKENS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }} className="hp-tap">📋 Weekly Review</button>
          <button onClick={() => openModal('monthly_report')} style={{
            padding: '12px', borderRadius: 16,
            background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
            color: HP_TOKENS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }} className="hp-tap">📊 Laporan Bulanan</button>
          <button onClick={() => openModal('appreciate')} style={{
            padding: '12px', borderRadius: 16,
            background: HP_TOKENS.blueWash, border: `1.5px solid ${HP_TOKENS.blueSoft}`,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
            color: HP_TOKENS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }} className="hp-tap">🌟 Beri Kudos</button>
          <button onClick={() => openModal('announcement')} style={{
            padding: '12px', borderRadius: 16,
            background: HP_TOKENS.sageWash, border: `1.5px solid ${HP_TOKENS.sageSoft}`,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
            color: HP_TOKENS.sage, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }} className="hp-tap">📢 Pengumuman</button>
        </div>

        {/* Ekspor laporan tim (Excel multi-sheet: harian/mingguan/bulanan/kpi) */}
        <button onClick={() => openModal('report_export')} style={{
          width: '100%', marginTop: 8, padding: '13px', borderRadius: 16, border: 'none', cursor: 'pointer',
          background: `${HP_TOKENS.sage}`, color: '#F4F7F9',
          fontFamily: HP_FONT, fontWeight: 800, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 4px 14px ${HP_TOKENS.sage}30`,
        }} className="hp-tap">📥 Ekspor Laporan Tim (Excel)</button>

        {/* Friday / End-of-Month AI Summaries */}
        {(() => {
          const today = new Date();
          const isFriday = today.getDay() === 5;
          const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          let lastWorkDay = lastDayOfMonth;
          while (lastWorkDay.getDay() === 0 || lastWorkDay.getDay() === 6) {
            lastWorkDay = new Date(lastWorkDay.getTime() - 86400000);
          }
          const isLastWorkingDayOfMonth = today.getDate() === lastWorkDay.getDate() && today.getMonth() === lastWorkDay.getMonth();
          if (!isFriday && !isLastWorkingDayOfMonth) return null;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <div style={{
                padding: '12px 16px', borderRadius: 16,
                background: HP_TOKENS.blueWash, border: `1.5px solid ${HP_TOKENS.blue}40`,
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }} onClick={() => openModal('ai_weekly_summary')} className="hp-tap">
                <div style={{ fontSize: 20 }}>🤖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.ink }}>Rangkuman Mingguan AI</div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                    Analisa performa mingguan per orang (Jumat)
                  </div>
                </div>
                <HPGlyph name="sparkle" size={14} color={HP_TOKENS.blue} />
              </div>
              {isLastWorkingDayOfMonth && (
                <div style={{
                  padding: '12px 16px', borderRadius: 16,
                  background: HP_TOKENS.lavenderSoft, border: `1.5px solid #6B5F8E40`,
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                }} onClick={() => openModal('ai_monthly_analysis')} className="hp-tap">
                  <div style={{ fontSize: 20 }}>🔮</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.ink }}>Analisa Bulanan AI</div>
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

        {/* Focus tools */}
        <CoworkingWidget openModal={openModal} />

        {/* Task Harian with confetti */}
        <TaskHarianWidget
          openModal={openModal}
          onTaskComplete={(taskName?: string) => {
            setConfetti(true);
            setCelebrate({show: true, points: 50, message: taskName ? `Selesai: ${taskName}` : "Hebat! Satu langkah lebih dekat."});
            setTimeout(() => setConfetti(false), 1200);
          }}
        />

        {/* Daily Challenge */}
        <DailyChallengeWidget
          openModal={openModal}
          onClaimReward={(points: number, title: string) => {
            setConfetti(true);
            setCelebrate({show: true, points, message: `Misi Selesai: ${title}`});
            setTimeout(() => setConfetti(false), 1500);
          }}
        />

        {/* AI Coach Insights */}
        <div style={{ marginTop: 24 }}>
          <SectionHeader icon="heart" label="AI Coach Insights" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aiInsights.map((ins, i) => (
              <InsightCard key={i} ins={ins} idx={i} />
            ))}
          </div>
        </div>

        {/* Pending KPI Approvals */}
        {approvals.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <SectionHeader icon="alertCircle" label="Persetujuan Target Tim" count={`${approvals.length}`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {paginatedApprovals.map((appr: any) => (
                <HPCard key={appr.id} padding={16} style={{ borderLeft: `4px solid ${HP_TOKENS.blue}`, background: HP_TOKENS.card }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{appr.desc}</div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                    Diajukan oleh: <b>{appr.from}</b> · {appr.type}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={async (e) => {
                      const target = e.currentTarget; target.disabled = true;
                      try {
                        await fetch("/api/goals/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goalId: appr.id, updates: { status: 'approved' } }) });
                        await refresh();
                      } catch (err) { console.error(err); target.disabled = false; }
                    }} className="hp-tap" style={{ padding: '6px 12px', borderRadius: 8, background: HP_TOKENS.sage, color: '#F4F7F9', fontFamily: HP_FONT, fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                      ✓ Approve
                    </button>
                    <button onClick={async (e) => {
                      const target = e.currentTarget; target.disabled = true;
                      try {
                        await fetch("/api/goals/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goalId: appr.id, updates: { status: 'revision' } }) });
                        await refresh();
                      } catch (err) { console.error(err); target.disabled = false; }
                    }} className="hp-tap" style={{ padding: '6px 12px', borderRadius: 8, background: HP_TOKENS.yellowWash, color: HP_TOKENS.yellow, fontFamily: HP_FONT, fontSize: 11, fontWeight: 800, border: `1px solid ${HP_TOKENS.yellow}`, cursor: 'pointer' }}>
                      ↻ Revisi
                    </button>
                    <button onClick={async (e) => {
                      const target = e.currentTarget; target.disabled = true;
                      try {
                        await fetch("/api/goals/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goalId: appr.id, updates: { status: 'rejected' } }) });
                        await refresh();
                      } catch (err) { console.error(err); target.disabled = false; }
                    }} className="hp-tap" style={{ padding: '6px 12px', borderRadius: 8, background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral, fontFamily: HP_FONT, fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                      ✗ Reject
                    </button>
                  </div>
                </HPCard>
              ))}
            </div>
            {totalPagesApprovals > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button onClick={() => setCurrentPageApprovals(p => Math.max(1, p - 1))} disabled={activePageApprovals === 1} style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`, background: activePageApprovals === 1 ? HP_TOKENS.lineSoft : '#fff', color: activePageApprovals === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft, fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: activePageApprovals === 1 ? 'default' : 'pointer', opacity: activePageApprovals === 1 ? 0.6 : 1 }}>
                  Sebelumnya
                </button>
                <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>{activePageApprovals} / {totalPagesApprovals}</span>
                <button onClick={() => setCurrentPageApprovals(p => Math.min(totalPagesApprovals, p + 1))} disabled={activePageApprovals === totalPagesApprovals} style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`, background: activePageApprovals === totalPagesApprovals ? HP_TOKENS.lineSoft : '#fff', color: activePageApprovals === totalPagesApprovals ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft, fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: activePageApprovals === totalPagesApprovals ? 'default' : 'pointer', opacity: activePageApprovals === totalPagesApprovals ? 0.6 : 1 }}>
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pending task verification badge */}
        {pendingTasks.length > 0 && (
          <div style={{
            marginTop: 10, padding: '12px 16px', borderRadius: 16,
            background: HP_TOKENS.yellowSoft, border: `1.5px solid ${HP_TOKENS.yellow}40`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: HP_TOKENS.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HPGlyph name="zap" size={18} color="#F4F7F9" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, color: '#8A6814' }}>
                {pendingTasks.length} task menunggu ACC
              </div>
              <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                Buka tab Target & KPI Tim → klik task dalam target untuk review & ACC
              </div>
            </div>
          </div>
        )}

        <SurveySection openModal={openModal} />

        {/* Daily Training Habits */}
        <div id="daily-training-section" style={{ marginTop: 24 }}>
          <SectionHeader
            icon="leaf"
            label="Daily Training"
            action="Settings"
            onAction={() => openModal('manage_habits')}
          />
          {(!state.habits || state.habits.length === 0) ? (
            <HabitEmptyState openModal={openModal} />
          ) : (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', alignItems: 'stretch' }}>
              {state.habits.map((h: any, i: number) => (
                <div key={i} style={{ minWidth: 260, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  <HabitCell
                    h={h}
                    onToggle={(date, isToday, done) => handleHabitDayClick(h.name, date, isToday, done)}
                    onQuickComplete={(date, isToday, wasDone, newDone) => handleQuickComplete(h.name, date, isToday, wasDone, newDone)}
                    onFinish={() => handleFinishTraining(h.name)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Coach for Manager */}
        <div style={{
          marginTop: 16,
          background: getMoodColor('happy'),
          borderRadius: 22, padding: '16px 20px',
          boxShadow: `0 8px 22px ${getMoodColor('happy')}40`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20
        }} onClick={() => openModal('coach')} className="hp-tap">
          <BeeMascot mood="happy" size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 15, color: '#F4F7F9' }}>AI Manager Coach</div>
            <div style={{ ...HP_TEXT.small, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              Feedback, coaching & pengelolaan tim
            </div>
          </div>
          <HPGlyph name="arrow" size={18} color="#F4F7F9" />
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
