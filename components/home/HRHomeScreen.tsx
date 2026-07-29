"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useHP, calculateLevelProgress } from "@/lib/HPContext";
import { usePointsQuota, quotaLabel } from "@/hooks/usePointsQuota";
import { HP_TOKENS, HP_TEXT, HP_MOODS, HP_ENERGY } from "@/lib/constants";
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
import BreathingCard from "@/components/home/BreathingCard";
import { Stack, Row, Grid, IconBadge, HPChip, HPBar, HPButton, PageGrid, ScreenHeader, ListRow } from "@/components/ui";
import Confetti from "@/components/home/Confetti";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";
import CentralNudgeOverlay from "@/components/ui/CentralNudgeOverlay";
import MorningPlanPopup from "@/components/ui/MorningPlanPopup";
import NotificationBanner from "@/components/pwa/NotificationBanner";

// HR-specific
import BurnoutAlertCard from "@/components/home/BurnoutAlertCard";
import HRAnalyticsTabs from "@/components/home/HRAnalyticsTabs";
import HRManageList from "@/components/hr/HRManageList";

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
import { scrollIntoViewSafely } from "@/lib/motion";

interface Props { openModal: (name: string, props?: any) => void; }

export default function HRHomeScreen({ openModal }: Props) {
  const { user, state, awardXP, updateState, notify } = useHP();
  // Jatah poin latihan hari ini, ditampilkan di kepala seksinya. Kuota per aksi
  // muncul di tempat aksinya dikerjakan — bukan sebagai tabel plafon di guide.
  const habitQuota = quotaLabel(usePointsQuota(['habit_complete']).habit_complete);

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
          scrollIntoViewSafely(el, { behavior: 'smooth', block: 'center' });
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
  const { greeting, reminder, isClockedIn, isClockedOut } = useTimeReminders(
    state, user, todayAttendance, updateState, openModal
  );
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
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
    <Stack gap={3} aria-busy="true" aria-label="Memuat data HR">
      <div className="hp-skeleton" style={{ height: 132 }} />
      <div className="hp-skeleton" style={{ height: 88 }} />
      <div className="hp-skeleton" style={{ height: 88 }} />
    </Stack>
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
      scrollIntoViewSafely(el, { behavior: 'smooth', block: 'center' });
    } else if (action === 'open_wellbeing') {
      openModal('checkin');
    } else if (action === 'open_logbook') {
      openModal('logbook');
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <Confetti show={confetti} />
      <CelebrationOverlay show={celebrate.show} points={celebrate.points} message={celebrate.message} onComplete={() => setCelebrate({show: false})} />
      <CentralNudgeOverlay nudge={centralNudge} onClose={() => setCentralNudge(null)} />
      <MorningPlanPopup planText={yesterdayPlan} userId={user?.id} />

      {/*
        HR's job is the org's wellbeing, so the analytics lead. The screen
        already distinguished "personal" from HR work via `showPersonal`; the
        grid now makes that split spatial instead of just sequential.
      */}
      <div style={{ position: 'relative', zIndex: 1 }} className="hp-stagger">
        {/* Same page title as employee Home — see the note there. */}
        <ScreenHeader
          title={`${greeting}${user?.name ? `, ${String(user.name).split(' ')[0]}` : ''}`}
          subtitle={todayLabel}
          style={{ padding: 0, marginBottom: 16 }}
        />

        <PageGrid
          main={<>
        <NotificationBanner />

        {/* Wellbeing leads the screen — same placement as employee Home. */}
        {showPersonal && <WellbeingGauge state={state} user={user} openModal={openModal} />}

        {/* Mid-day check-in prompt */}
        {showPersonal && isMidDayWindow() && (
          <HPCard
            onClick={() => openModal('work_checkin')}
            padding={15}
            style={{ background: HP_TOKENS.yellowWash, borderColor: HP_TOKENS.yellowSoft }}
            ariaLabel="Mid-day check-in siap. Catat progres tengah hari"
          >
            <Row gap={3}>
              <IconBadge size={40} tone={HP_TOKENS.yellowSoft}>
                <HPGlyph name="book" size={18} color={HP_TOKENS.yellowInk} />
              </IconBadge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...HP_TEXT.sub, fontSize: 14.5 }}>Mid-day check-in siap</div>
                <div style={{ ...HP_TEXT.small, marginTop: 1 }}>Catat progresmu di pertengahan hari</div>
              </div>
              <HPGlyph name="chevronRight" size={17} color={HP_TOKENS.inkFade} />
            </Row>
          </HPCard>
        )}

        {showPersonal && (
          <CoachNudgeBanner coachNudge={coachNudge} beeMood={beeMood as any} openModal={openModal} />
        )}

        {/* HR's actual job: how the organisation is holding up. */}
        <HRAnalyticsTabs state={state} openModal={openModal} />


        {/* Smart Reminders */}
        {showPersonal && reminder && (
          <div>
            {(() => {
              // One tone per reminder kind, so the card's colour carries meaning
              // rather than decoration.
              const kind = {
                break: { tone: HP_TOKENS.warning, wash: HP_TOKENS.warningWash, soft: HP_TOKENS.warningSoft, icon: 'pause' },
                meeting: { tone: HP_TOKENS.info, wash: HP_TOKENS.infoWash, soft: HP_TOKENS.infoSoft, icon: 'video' },
                clockout: { tone: HP_TOKENS.success, wash: HP_TOKENS.successWash, soft: HP_TOKENS.successSoft, icon: 'moon' },
              }[reminder.type as 'break' | 'meeting' | 'clockout'] ?? {
                tone: HP_TOKENS.info, wash: HP_TOKENS.infoWash, soft: HP_TOKENS.infoSoft, icon: 'bell',
              };

              return (
                <HPCard padding={16} style={{ background: kind.wash, borderColor: kind.soft }}>
                  <Row gap={4} stackOnMobile>
                    <IconBadge size={44} tone={kind.soft}>
                      <HPGlyph name={kind.icon} size={20} color={kind.tone} />
                    </IconBadge>
                    <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ ...HP_TEXT.sub }}>
                        {reminder.type === 'break' ? 'Waktunya istirahat' : 'Sebentar lagi pulang'}
                      </span>
                      <span style={{ ...HP_TEXT.small }}>
                        {reminder.type === 'break' && `${reminder.mins} menit lagi istirahat. Siap-siap rehat sejenak.`}
                        {reminder.type === 'meeting' && `${reminder.mins} menit lagi meeting dengan ${reminder.sessionWith}. Link Meet sudah siap.`}
                        {reminder.type === 'clockout' && `${reminder.mins} menit lagi jam kerja selesai. Siapkan refleksi Tutup Hari kamu.`}
                      </span>
                    </Stack>
                    {reminder.type === 'clockout' && (
                      <HPButton size="sm" variant="primary" onClick={() => openModal('reflect')}>
                        Tutup hari
                      </HPButton>
                    )}
                    {reminder.type === 'meeting' && (
                      <HPButton
                        size="sm"
                        variant="primary"
                        icon="video"
                        onClick={() => state.coaching?.meetLink && window.open(state.coaching.meetLink, '_blank')}
                      >
                        Join Meet
                      </HPButton>
                    )}
                  </Row>
                </HPCard>
              );
            })()}
          </div>
        )}

        {/*
          The four things HR actually administers. These were a 2×1 button grid
          plus a lone full-width button plus a separate "Kelola survey" card at
          the very bottom of the page — one group now, in one place, and shared
          with the console so hrAccess users get the same four.
        */}
        <HRManageList openModal={openModal} />

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

        <SurveySection openModal={openModal} />

        {/* Daily Training Habits */}
        <div id="daily-training-section">
          <SectionHeader
            icon="leaf"
            label="Daily Training"
            count={habitQuota ? `poin ${habitQuota}` : undefined}
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
          </>}

          rail={<>
            {/* HR profile */}
            <HPCard padding={16}>
              <Row gap={3} align="flex-start">
                <button
                  type="button"
                  className="hp-tap"
                  onClick={() => openModal('profile_editor')}
                  aria-label="Edit profil"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', flex: 1, minWidth: 0, textAlign: 'left' }}
                >
                  <HPAvatar name={user.name} size={44} rank={user.rank} levelProgress={levelProgress} />
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Row gap={2}>
                      <span style={{ ...HP_TEXT.sub, fontSize: 15 }}>{(user.name || "User").split(' ')[0]}</span>
                      <HPChip tone="info">HR</HPChip>
                    </Row>
                    <span style={{ ...HP_TEXT.small, marginTop: 2 }}>
                      Level {user.level} · {m.totalEmployees} karyawan
                    </span>
                  </Stack>
                </button>

                <Row
                  gap={1}
                  aria-label={`Streak ${user.streak} hari`}
                  style={{
                    padding: '6px 10px', borderRadius: HP_TOKENS.radiusPill,
                    background: HP_TOKENS.yellowSoft, color: HP_TOKENS.yellowInk,
                    flexShrink: 0,
                  }}
                >
                  <HPGlyph name="zap" size={13} color="currentColor" />
                  <span style={{ ...HP_TEXT.small, color: 'currentColor' }}>{user.streak}</span>
                </Row>
              </Row>

              <Row align="flex-end" gap={4} style={{ marginTop: 14 }}>
                <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...HP_TEXT.tiny }}>Level progress</span>
                  <HPBar value={levelProgress * 100} tone="info" label="Progress menuju level berikutnya" />
                </Stack>
                <Stack gap={0} style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ ...HP_TEXT.tiny }}>Total poin</span>
                  <span style={{ ...HP_TEXT.metric, fontSize: 20 }}>{user.points.toLocaleString('id-ID')}</span>
                </Stack>
              </Row>
            </HPCard>

            {showPersonal && (
              <>
                <AttendanceWidget openModal={openModal} />

                {/* Logbook + attendance history sit with attendance, not in the
                    generic shortcut list. Independent of clock state. */}
                <HPCard padding={0} style={{ overflow: 'hidden' }}>
                  <ListRow
                    leading={<IconBadge size={32} tone={HP_TOKENS.sunken}><HPGlyph name="book" size={16} color={HP_TOKENS.inkSoft} /></IconBadge>}
                    title="Riwayat & logbook"
                    subtitle="Catatan harian, hadir atau tidak"
                    onClick={() => openModal('logbook')}
                  />
                  <ListRow
                    leading={<IconBadge size={32} tone={HP_TOKENS.sunken}><HPGlyph name="history" size={16} color={HP_TOKENS.inkSoft} /></IconBadge>}
                    title="Riwayat kehadiran"
                    onClick={() => openModal('attendance_history')}
                  />
                </HPCard>

                <EmotionalHero
                  state={state}
                  moodObj={moodObj}
                  energyObj={energyObj}
                  onOpenCheckIn={() => openModal('checkin')}
                  showMidDay={isMidDayWindow()}
                  onOpenMidDay={() => openModal('work_checkin')}
                />

                {aiInsights.length > 0 && (
                  <section>
                    <SectionHeader tight icon="heart" label="Insight dari Coach" />
                    <Stack gap={2}>
                      {aiInsights.map((ins, i) => (
                        <InsightCard key={i} ins={ins} idx={i} onClick={() => handleInsightClick(ins.action)} />
                      ))}
                    </Stack>
                  </section>
                )}

                {/* Box breathing gets a card, not a shortcut row — same as
                    employee Home. */}
                <BreathingCard openModal={openModal} compact />
              </>
            )}
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
