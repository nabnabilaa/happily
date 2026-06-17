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

  return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 120, fontFamily: HP_FONT }}>
      <BlobBackground colors={[HP_TOKENS.primaryWash, HP_TOKENS.card, HP_TOKENS.paper]}/>
      <Confetti show={confetti}/>
      <CelebrationOverlay show={celebrate.show} points={celebrate.points} message={celebrate.message} onComplete={() => setCelebrate({show: false})} />
      <CentralNudgeOverlay nudge={centralNudge} onClose={() => setCentralNudge(null)} />
      <MorningPlanPopup planText={yesterdayPlan} userId={rawUser?.id} />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px', paddingTop: 72 }} className="hp-stagger">
        
        <NotificationBanner />

        {/* 🕛 Mid-Day Check-In Banner */}
        {isMidDayWindow() ? (
              <div 
                onClick={() => openModal('work_checkin')}
                className="hp-tap"
                style={{
                  background: `linear-gradient(135deg, ${HP_TOKENS.yellowWash} 0%, ${HP_TOKENS.yellowSoft} 100%)`,
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

        <WellbeingGauge state={state} user={user} openModal={openModal} />

        <UserProfileCard user={user} levelProgress={levelProgress} openModal={openModal} />

        <CoachNudgeBanner coachNudge={coachNudge} beeMood={beeMood as any} openModal={openModal} />

        {/* Attendance & Schedule Card */}
        <HPCard padding={20} style={{ marginTop: 16, border: `1.5px solid ${HP_TOKENS.lineSoft}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <HPGlyph name="calendar" size={18} color={HP_TOKENS.inkSoft} />
            <div style={{ fontSize: 16, fontWeight: 800 }}>Jadwal & Kehadiran</div>
          </div>
          
          <div style={{ 
            display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 16, 
            background: HP_TOKENS.paper, border: `1px solid ${HP_TOKENS.line}`,
            marginBottom: 16
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: HP_TOKENS.inkMute, fontWeight: 700, fontSize: 11, marginBottom: 2 }}>JAM KERJA</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>
                {state.workSchedule?.start || '08:00'} - {state.workSchedule?.end || '17:00'}
              </div>
            </div>
            <div style={{ width: 1, background: HP_TOKENS.line }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: HP_TOKENS.inkMute, fontWeight: 700, fontSize: 11, marginBottom: 2 }}>ISTIRAHAT</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>
                {state.workSchedule?.breakStart} - {state.workSchedule?.breakEnd}
              </div>
            </div>
          </div>

          <AttendanceWidget openModal={openModal} />
        </HPCard>

        {/* HERO — Emotional check-in */}
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

        {/* Mindful Breathing Reset Card */}
        <div style={{ marginTop: 16 }}>
          <style dangerouslySetInnerHTML={{__html: `
            @media (max-width: 500px) {
              .hp-breathing-mobile { flex-direction: column !important; text-align: center !important; }
            }
          `}} />
          <HPCard 
            padding={16} 
            style={{ 
              background: `linear-gradient(135deg, ${HP_TOKENS.sageWash} 0%, ${HP_TOKENS.blueWash} 100%)`, 
              border: `1.5px solid ${HP_TOKENS.sage}20`,
              boxShadow: '0 8px 24px rgba(74, 124, 89, 0.04)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="hp-breathing-mobile" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ 
                width: 44, height: 44, borderRadius: 14, 
                background: HP_TOKENS.card, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(26,29,35,0.02)', fontSize: 20
              }}>
                🧘‍♂️
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: HP_TOKENS.ink }}>
                  Butuh Jeda Sejenak?
                </div>
                <div style={{ fontSize: 12, color: HP_TOKENS.inkSoft, marginTop: 2, lineHeight: 1.4 }}>
                  Latihan bernapas Box Breathing 1 menit untuk menurunkan stress dan mengembalikan fokusmu.
                </div>
              </div>
              <button 
                onClick={() => openModal('pause')}
                className="hp-tap hp-btn-mobile-full"
                style={{
                  padding: '10px 16px', borderRadius: 12, border: 'none',
                  background: HP_TOKENS.sage, color: '#F4F7F9',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  boxShadow: `0 4px 12px ${HP_TOKENS.sage}30`,
                  whiteSpace: 'nowrap'
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
                  <button 
                    onClick={() => openModal('reflect')}
                    className="hp-tap"
                    style={{ 
                      padding: '8px 14px', borderRadius: 10, border: 'none', 
                      background: HP_TOKENS.sage, color: '#F4F7F9', 
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer'
                    }}
                  >
                    Tutup Hari
                  </button>
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

        <CoworkingWidget openModal={openModal} />

        <TaskHarianWidget 
          openModal={openModal} 
          onTaskComplete={(taskName?: string) => {
            setConfetti(true);
            setCelebrate({show: true, points: 50, message: taskName ? `Selesai: ${taskName}` : "Hebat! Satu langkah lebih dekat."});
            setTimeout(() => setConfetti(false), 1200);
          }} 
        />

        <DailyChallengeWidget 
          openModal={openModal} 
          onClaimReward={(points: number, title: string) => {
            setConfetti(true);
            setCelebrate({show: true, points, message: `Misi Selesai: ${title}`});
            setTimeout(() => setConfetti(false), 1500);
          }}
        />

        <SurveySection openModal={openModal} />

        {/* Daily Training Habits */}
        <div id="daily-training-section" style={{ marginTop: 24 }}>
          <SectionHeader 
            icon="leaf" 
            label="Daily Training" 
            action="Settings"
            onAction={() => openModal('manage_habits')}
          />
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', alignItems: 'stretch' }}>
            {state.habits?.map((h: any, i: number) => (
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
        </div>

        {/* Professional Growth */}
        <div style={{ marginTop: 24 }}>
          <SectionHeader icon="heart" label="AI Coach Insights" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aiInsights.map((ins, i) => (
              <InsightCard key={i} ins={ins} idx={i}/>
            ))}
          </div>
        </div>

        {/* Closing actions */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => openModal('logbook')} className="hp-tap" style={{
            width: '100%', padding: '16px', borderRadius: 100,
            background: 'transparent', color: HP_TOKENS.inkMute,
            border: `2px solid var(--hp-border)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
          }}>
            <HPGlyph name="book" size={18} color={HP_TOKENS.inkMute}/>
            <span>Lihat Riwayat & Logbook Calendar</span>
          </button>
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
