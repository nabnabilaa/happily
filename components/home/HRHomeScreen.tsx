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

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px' }} className="hp-stagger">
        <NotificationBanner />

        {/* Mid-Day Check-In Banner */}
        {showPersonal && isMidDayWindow() && (
          <div
            onClick={() => openModal('work_checkin')}
            className="hp-tap"
            style={{
              background: `linear-gradient(135deg, ${HP_TOKENS.yellowWash} 0%, ${HP_TOKENS.yellowSoft} 100%)`,
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
        {showPersonal && <WellbeingGauge state={state} user={user} openModal={openModal} />}

        {/* HR Profile Header */}
        <div style={{
          background: `linear-gradient(135deg, ${HP_TOKENS.paper}, ${HP_TOKENS.card})`,
          borderRadius: 24, padding: '24px 20px', marginTop: 8,
          border: `1.5px solid ${HP_TOKENS.line}`, boxShadow: '0 10px 30px rgba(26,29,35,0.04)',
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
                <HPAvatar name={user.name} size={52} rank={user.rank} levelProgress={levelProgress} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 20 }}>{(user.name || "User").split(' ')[0]}</div>
                    <div style={{ background: HP_TOKENS.lavender, color: '#F4F7F9', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 6 }}>
                      HR
                    </div>
                  </div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2, fontWeight: 700 }}>
                    Level {user.level} · Class {user.rank || 'E'}
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 1 }}>
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
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Level Progress</div>
                <div style={{ width: '100%', height: 6, background: HP_TOKENS.lineSoft, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${levelProgress * 100}%`, height: '100%',
                    background: HP_TOKENS.lavender,
                    transition: '1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Total Point</div>
                <div style={{ ...HP_TEXT.h, fontSize: 24 }}>{user.points.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {showPersonal && (
          <>
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
          </>
        )}

        {/* HR-specific: Wellbeing Radar & Burnout (Tabbed) */}
        <HRAnalyticsTabs state={state} openModal={openModal} />


        {/* Mood & Energy check-in */}
        {showPersonal && (
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
        )}

        {/* Mindful Breathing Reset */}
        {showPersonal && (
        <div style={{ marginTop: 16 }}>
          <HPCard
            padding={16}
            style={{
              background: `linear-gradient(135deg, ${HP_TOKENS.sageWash} 0%, ${HP_TOKENS.blueWash} 100%)`,
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
        )}

        {/* Smart Reminders */}
        {showPersonal && reminder && (
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

        {/* HR-specific actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <button onClick={() => openModal('announcement')} style={{
            padding: '12px', borderRadius: 16,
            background: HP_TOKENS.sageWash, border: `1.5px solid ${HP_TOKENS.sageSoft}`,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            color: HP_TOKENS.sage, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }} className="hp-tap">📢 Pengumuman</button>
          <button onClick={() => openModal('manage_kpi')} style={{
            padding: '12px', borderRadius: 16,
            background: HP_TOKENS.blueWash, border: `1.5px solid ${HP_TOKENS.blueSoft}`,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            color: HP_TOKENS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }} className="hp-tap">🎯 Kelola KPI</button>
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={() => openModal('manage_onboarding')} style={{
            width: '100%', padding: '12px', borderRadius: 16,
            background: HP_TOKENS.lavenderWash, border: `1.5px solid ${HP_TOKENS.lavenderSoft}`,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            color: HP_TOKENS.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }} className="hp-tap">✨ Kelola Onboarding</button>
        </div>



        {showPersonal && (
        <>
        {/* Focus tools */}
        <CoworkingWidget openModal={openModal} />

        {/* Task Harian with confetti */}
        <div id="task-section">
          <TaskHarianWidget
            openModal={openModal}
            onTaskComplete={(taskName?: string) => {
              setConfetti(true);
              setCelebrate({show: true, points: 50, message: taskName ? `Selesai: ${taskName}` : "Hebat! Satu langkah lebih dekat."});
              setTimeout(() => setConfetti(false), 1200);
            }}
          />
        </div>

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
              <InsightCard key={i} ins={ins} idx={i} onClick={() => handleInsightClick(ins.action)} />
            ))}
          </div>
        </div>

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
        </>
        )}

        {/* HR-specific: Kelola Survey */}
        <button onClick={() => openModal('manage_surveys')} className="hp-tap" style={{
          marginTop: 16, width: '100%', padding: '16px', borderRadius: 22,
          background: `linear-gradient(135deg, ${HP_TOKENS.lavender}, #5A4E8C)`, color: '#F4F7F9',
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
            <div style={{ ...HP_TEXT.h, fontSize: 15, color: '#F4F7F9' }}>Kelola Survey</div>
            <div style={{ ...HP_TEXT.small, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              Buat, edit, dan lihat hasil survey internal
            </div>
          </div>
          <HPGlyph name="arrow" size={18} color="#F4F7F9" />
        </button>
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
