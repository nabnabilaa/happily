"use client";

import React, { useState, useMemo } from "react";
import { useHP, calculateLevelProgress } from "@/lib/HPContext";
import { HP_TOKENS, HP_TEXT, HP_MOODS, HP_ENERGY } from "@/lib/constants";
import { generateAIInsights } from "@/lib/aiInsights";
import { isMidDayWindow } from "@/lib/timeUtils";

// Hooks
import { useTimeReminders } from "@/hooks/useTimeReminders";
import { useCoachNudge } from "@/hooks/useCoachNudge";
import { useHabitManager } from "@/hooks/useHabitManager";

// Components
import HPGlyph from "@/components/ui/HPGlyph";
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
import { PageGrid, ActionList, Stack, Row, IconBadge } from "@/components/ui";

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
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <Confetti show={confetti}/>
      <CelebrationOverlay show={celebrate.show} points={celebrate.points} message={celebrate.message} onComplete={() => setCelebrate({show: false})} />
      <CentralNudgeOverlay nudge={centralNudge} onClose={() => setCentralNudge(null)} />
      <MorningPlanPopup planText={yesterdayPlan} userId={rawUser?.id} />

      {/*
        Layout note: the order below is deliberate and is the whole point of
        this screen. `main` is the work — what am I doing today, and how far
        along am I. `rail` is everything that merely *informs* that work.

        Previously this was one column of sixteen equal-weight cards with the
        task list buried at position twelve, under the profile card and a
        "Riwayat & Logbook" button. Nothing said what mattered.
      */}
      <div style={{ position: 'relative', zIndex: 1 }} className="hp-stagger">
        <PageGrid
          main={<>
            <NotificationBanner />

            {/* Mid-day check-in — time-sensitive, so it outranks everything
                while its window is open, and disappears entirely after. */}
            {isMidDayWindow() ? (
              <HPCard
                onClick={() => openModal('work_checkin')}
                padding={15}
                style={{ background: HP_TOKENS.yellowWash, borderColor: HP_TOKENS.yellowSoft }}
                ariaLabel="Mid-day check-in siap. Catat progres tengah hari"
              >
                <Row gap={3}>
                  <IconBadge size={40} tone={HP_TOKENS.yellowSoft}>
                    <HPGlyph name="book" size={18} color={HP_TOKENS.yellowDark} />
                  </IconBadge>
                  <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...HP_TEXT.sub, fontSize: 14.5 }}>Mid-day check-in siap</span>
                    <span style={{ ...HP_TEXT.small }}>Catat progresmu di pertengahan hari</span>
                  </Stack>
                  <HPGlyph name="chevronRight" size={17} color={HP_TOKENS.inkFade} />
                </Row>
              </HPCard>
            ) : null}

            <CoachNudgeBanner coachNudge={coachNudge} beeMood={beeMood as any} openModal={openModal} />

            {/* Time-based reminder. Announced politely so a screen reader picks
                it up when it appears without interrupting the current task. */}
            {reminder && (() => {
          const REMINDER = {
            break:    { glyph: 'pause',  fg: HP_TOKENS.warning, bg: HP_TOKENS.warningSoft, title: 'Waktunya istirahat' },
            meeting:  { glyph: 'people', fg: HP_TOKENS.primary, bg: HP_TOKENS.primarySoft, title: 'Meeting sebentar lagi' },
            clockout: { glyph: 'moon',   fg: HP_TOKENS.info,    bg: HP_TOKENS.infoSoft,    title: 'Bentar lagi pulang' },
          } as const;
          const r = REMINDER[reminder.type as keyof typeof REMINDER] ?? REMINDER.clockout;

          return (
            <HPCard padding={15} role="status" aria-live="polite" style={{ background: r.bg, borderColor: 'transparent' }}>
              <div className="hp-form-row" style={{ alignItems: 'center', gap: 13 }}>
                <div
                  aria-hidden
                  style={{
                    width: 40, height: 40, borderRadius: HP_TOKENS.radiusSm, flexShrink: 0,
                    background: HP_TOKENS.card,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <HPGlyph name={r.glyph} size={18} color={r.fg} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...HP_TEXT.sub, fontSize: 14 }}>{r.title}</div>
                  <p style={{ ...HP_TEXT.small, marginTop: 2 }}>
                    {reminder.type === 'break' && `${reminder.mins} menit lagi istirahat. Siap-siap rehat sejenak.`}
                    {reminder.type === 'meeting' && `${reminder.mins} menit lagi meeting dengan ${reminder.sessionWith}.`}
                    {reminder.type === 'clockout' && `${reminder.mins} menit lagi jam kerja selesai. Siapkan refleksi tutup hari.`}
                  </p>
                </div>

                {reminder.type === 'clockout' && (
                  <button
                    onClick={() => openModal('reflect')}
                    className="hp-tap hp-btn-mobile-full"
                    style={{
                      flexShrink: 0, minHeight: 40, padding: '0 16px',
                      borderRadius: HP_TOKENS.radiusPill,
                      background: HP_TOKENS.card, color: r.fg,
                      fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                    }}
                  >
                    Tutup hari
                  </button>
                )}
                {reminder.type === 'meeting' && (
                  <button
                    onClick={() => state.coaching?.meetLink && window.open(state.coaching.meetLink, '_blank', 'noopener,noreferrer')}
                    className="hp-tap hp-btn-mobile-full"
                    style={{
                      flexShrink: 0, minHeight: 40, padding: '0 16px',
                      borderRadius: HP_TOKENS.radiusPill,
                      background: HP_TOKENS.card, color: r.fg,
                      fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <HPGlyph name="chat" size={13} color="currentColor" />
                    Join Meet
                  </button>
                )}
              </div>
            </HPCard>
          );
        })()}

            {/* ── The actual work, in the order you do it ────────────────── */}

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

            <DailyChallengeWidget
              openModal={openModal}
              onClaimReward={(points: number, title: string) => {
                setConfetti(true);
                setCelebrate({show: true, points, message: `Misi Selesai: ${title}`});
                setTimeout(() => setConfetti(false), 1500);
              }}
            />

            {/* Daily training habits */}
            <section id="daily-training-section">
              <SectionHeader
                icon="leaf"
                label="Daily Training"
                action="Atur"
                onAction={() => openModal('manage_habits')}
              />
              {(!state.habits || state.habits.length === 0) ? (
                <HabitEmptyState openModal={openModal} />
              ) : (
                <div
                  className="hp-scroll-hidden"
                  style={{
                    display: 'flex', gap: 12, overflowX: 'auto', alignItems: 'stretch',
                    paddingBottom: 4, WebkitOverflowScrolling: 'touch',
                    scrollSnapType: 'x proximity',
                  }}
                >
                  {state.habits.map((h: any, i: number) => (
                    <div
                      key={i}
                      style={{ minWidth: 252, flexShrink: 0, display: 'flex', flexDirection: 'column', scrollSnapAlign: 'start' }}
                    >
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
            </section>

            {/* Live coworking rooms — real content, not a shortcut, so it keeps
                its own block rather than collapsing into the action list. */}
            <CoworkingWidget openModal={openModal} />

            <SurveySection openModal={openModal} />
          </>}

          rail={<>
            {/* ── Context: where you stand, not what you do ─────────────── */}

            {/* Identity first. Level, streak and points are what you look up
                here, so they lead the rail rather than sitting under four
                cards where they get scrolled past. */}
            <UserProfileCard user={user} levelProgress={levelProgress} openModal={openModal} />

            {/* Attendance is the one rail item with a daily action in it, so it
                comes next — and on a phone it lands right after the task list. */}
            <HPCard padding={16}>
              <SectionHeader tight icon="calendar" label="Jadwal & Kehadiran" />

              <Row
                gap={0}
                style={{
                  padding: '10px 14px',
                  borderRadius: HP_TOKENS.radiusMd,
                  background: HP_TOKENS.sunken,
                  marginBottom: 12,
                }}
              >
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...HP_TEXT.tiny }}>Jam kerja</span>
                  <span style={{ ...HP_TEXT.bodyStrong, fontSize: 13.5, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                    {state.workSchedule?.start || '08:00'} – {state.workSchedule?.end || '17:00'}
                  </span>
                </Stack>
                <div style={{ width: 1, alignSelf: 'stretch', background: HP_TOKENS.line, margin: '0 14px' }} />
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...HP_TEXT.tiny }}>Istirahat</span>
                  <span style={{ ...HP_TEXT.bodyStrong, fontSize: 13.5, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                    {state.workSchedule?.breakStart} – {state.workSchedule?.breakEnd}
                  </span>
                </Stack>
              </Row>

              <AttendanceWidget openModal={openModal} />
            </HPCard>

            {/* Emotional check-in */}
            <EmotionalHero
              state={state}
              moodObj={moodObj}
              energyObj={energyObj}
              onOpenCheckIn={() => openModal('checkin')}
              showMidDay={isMidDayWindow()}
              onOpenMidDay={() => openModal('work_checkin')}
            />

            <WellbeingGauge state={state} user={user} openModal={openModal} />

            {/* AI coach insights */}
            {aiInsights.length > 0 && (
              <section>
                <SectionHeader tight icon="sparkle" label="Insight dari Coach" />
                <Stack gap={2}>
                  {aiInsights.map((ins, i) => (
                    <InsightCard key={i} ins={ins} idx={i} onClick={() => handleInsightClick(ins.action)} />
                  ))}
                </Stack>
              </section>
            )}

            {/*
              Five shortcuts that each used to own a full-width card. As rows
              they cost about one card between them, and stop a 40px action
              from outranking the day's work.
            */}
            <ActionList
              title="Lainnya"
              items={[
                {
                  icon: 'leaf',
                  label: 'Jeda 1 menit',
                  hint: 'Box breathing untuk menurunkan stres',
                  tone: HP_TOKENS.success,
                  onClick: () => openModal('pause'),
                },
                {
                  icon: 'book',
                  label: 'Riwayat & logbook',
                  onClick: () => openModal('logbook'),
                },
                {
                  icon: 'history',
                  label: 'Riwayat kehadiran',
                  onClick: () => openModal('attendance_history'),
                },
              ]}
            />
          </>}
        />
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
