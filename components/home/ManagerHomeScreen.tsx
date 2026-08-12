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
import BlobBackground from "@/components/home/BlobBackground";
import BeeMascot from "@/components/ui/BeeMascot";
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
import BreathingCard from "@/components/home/BreathingCard";
import { Row, Stack, Grid, IconBadge, CountUp, HPButton, PageGrid, ScreenHeader, ActionList, ListRow } from "@/components/ui";
import AttendanceWidget from "@/components/home/AttendanceWidget";
import SurveySection from "@/components/home/SurveySection";
import TaskHarianWidget from "@/components/home/TaskHarianWidget";
import InsightCard from "@/components/home/InsightCard";
import HabitEmptyState from "@/components/home/HabitEmptyState";
import { scrollIntoViewSafely } from "@/lib/motion";

interface Props { openModal: (name: string, props?: any) => void; }

export default function ManagerHomeScreen({ openModal }: Props) {
  const { state, user, awardXP, refresh, updateState, notify } = useHP();
  // Jatah poin latihan hari ini, ditampilkan di kepala seksinya. Kuota per aksi
  // muncul di tempat aksinya dikerjakan — bukan sebagai tabel plafon di guide.
  const habitQuota = quotaLabel(usePointsQuota(['habit_complete']).habit_complete);
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
  /** `${goalId}:${status}` while that approval call is in flight, else null. */
  const [busyApproval, setBusyApproval] = useState<string | null>(null);

  /**
   * Approve / request revision / reject a team target. Guarded by state rather
   * than by flipping `disabled` on the DOM node — a re-render used to wipe that
   * and let the same approval be submitted twice.
   */
  const setApprovalStatus = async (goalId: string, status: 'approved' | 'revision' | 'rejected') => {
    if (busyApproval) return;
    setBusyApproval(`${goalId}:${status}`);
    try {
      await fetch("/api/goals/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, updates: { status } }),
      });
      await refresh();
    } catch (err) {
      console.error("Gagal memperbarui status target:", err);
    } finally {
      setBusyApproval(null);
    }
  };

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
    lastHabitAward,
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
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <Confetti show={confetti} />
      <CelebrationOverlay show={celebrate.show} points={celebrate.points} message={celebrate.message} onComplete={() => setCelebrate({show: false})} />
      <CentralNudgeOverlay nudge={centralNudge} onClose={() => setCentralNudge(null)} />
      <MorningPlanPopup planText={yesterdayPlan} userId={user?.id} />

      {/*
        Ordered by what a manager is here to do. The team's pending approvals
        and the team KPI are the job; the manager's own tasks come next; and
        everything personal — profile, mood, attendance, shortcuts — moves to
        the rail. Previously approvals sat at roughly position seventeen.
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
        <WellbeingGauge state={state} user={user} openModal={openModal} />

        {/* Mid-day check-in prompt */}
        {isMidDayWindow() && (
          <HPCard
            onClick={() => openModal('work_checkin')}
            padding={15}
            style={{ background: HP_TOKENS.yellowWash, borderColor: HP_TOKENS.yellowSoft }}
            ariaLabel="Mid-day check-in siap. Catat progres tengah hari"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <IconBadge size={40} tone={HP_TOKENS.yellowSoft}>
                <HPGlyph name="book" size={18} color={HP_TOKENS.yellowInk} />
              </IconBadge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...HP_TEXT.sub, fontSize: 14.5 }}>Mid-day check-in siap</div>
                <div style={{ ...HP_TEXT.small, marginTop: 1 }}>Catat progresmu di pertengahan hari</div>
              </div>
              <HPGlyph name="chevronRight" size={17} color={HP_TOKENS.inkFade} />
            </div>
          </HPCard>
        )}

        {/* Team KPI — the headline number for a manager, so it leads. */}
        <HPCard padding={18}>
          <SectionHeader tight icon="target" label="Progres KPI tim" />
          <Row justify="space-between" gap={4}>
            <Stack gap={0} style={{ minWidth: 0 }}>
              <span style={{ ...HP_TEXT.metric, fontSize: 34 }}>
                <CountUp value={avgProgress} suffix="%" />
              </span>
              <span style={{ ...HP_TEXT.small, marginTop: 2 }}>
                Rata-rata dari {members.length} anggota tim
              </span>
            </Stack>

            {/* Radial gauge. Decorative — the figure beside it carries the value. */}
            <div
              aria-hidden
              style={{ width: 72, height: 72, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <svg width="72" height="72" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r="26" fill="transparent" stroke={HP_TOKENS.line} strokeWidth="5" />
                <circle
                  cx="32" cy="32" r="26" fill="transparent"
                  stroke={HP_TOKENS.primary} strokeWidth="5"
                  strokeDasharray={163.36}
                  strokeDashoffset={163.36 - (163.36 * avgProgress) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 320ms var(--hp-ease-out)' }}
                />
              </svg>
              <div style={{ position: 'absolute', ...HP_TEXT.label, fontSize: 13, color: HP_TOKENS.primaryInk }}>
                {avgProgress}%
              </div>
            </div>
          </Row>
        </HPCard>

        {/* Nudge banner */}
        <CoachNudgeBanner coachNudge={coachNudge} beeMood={beeMood as any} openModal={openModal} />

        {/* Time-based reminder */}
        {reminder && (() => {
          const REMINDER = {
            break:    { glyph: 'pause',  fg: HP_TOKENS.warning, bg: HP_TOKENS.warningSoft, title: 'Waktunya istirahat' },
            meeting:  { glyph: 'people', fg: HP_TOKENS.primary, bg: HP_TOKENS.primarySoft, title: 'Meeting sebentar lagi' },
            clockout: { glyph: 'moon',   fg: HP_TOKENS.info,    bg: HP_TOKENS.infoSoft,    title: 'Bentar lagi pulang' },
          } as const;
          const r = REMINDER[reminder.type as keyof typeof REMINDER] ?? REMINDER.clockout;

          return (
            <HPCard padding={15} role="status" aria-live="polite" style={{ background: r.bg, borderColor: 'transparent' }}>
              <div className="hp-form-row" style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
                <IconBadge size={40} tone={HP_TOKENS.card}>
                  <HPGlyph name={r.glyph} size={18} color={r.fg} />
                </IconBadge>

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

        {/* Manager-specific actions */}
        <HPButton variant="primary" icon="target" fullWidth onClick={() => openModal('manage_kpi')}>
          Kelola KPI bulanan
        </HPButton>

        <Grid columns={2} gap={2}>
          <HPButton size="sm" icon="book" onClick={() => openModal('weekly_review')}>
            Weekly review
          </HPButton>
          <HPButton size="sm" icon="chart" onClick={() => openModal('monthly_report')}>
            Laporan bulanan
          </HPButton>
          <HPButton
            size="sm"
            icon="star"
            onClick={() => openModal('appreciate')}
            style={{ background: HP_TOKENS.blueWash, color: HP_TOKENS.blue, borderColor: 'transparent' }}
          >
            Beri kudos
          </HPButton>
          <HPButton
            size="sm"
            icon="bell"
            onClick={() => openModal('announcement')}
            style={{ background: HP_TOKENS.successWash, color: HP_TOKENS.successInk, borderColor: 'transparent' }}
          >
            Pengumuman
          </HPButton>
        </Grid>

        {/* Ekspor laporan tim (Excel multi-sheet: harian/mingguan/bulanan/kpi) */}
        <HPButton icon="download" fullWidth onClick={() => openModal('report_export')}>
          Ekspor laporan tim (Excel)
        </HPButton>

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
            <Stack gap={2}>
              <HPCard
                onClick={() => openModal('ai_weekly_summary')}
                padding={14}
                style={{ background: HP_TOKENS.infoWash, borderColor: HP_TOKENS.infoSoft }}
                ariaLabel="Buka rangkuman mingguan AI"
              >
                <Row gap={3}>
                  <IconBadge size={36} tone={HP_TOKENS.infoSoft}>
                    <HPGlyph name="sparkle" size={17} color={HP_TOKENS.infoInk} />
                  </IconBadge>
                  <Stack gap={0} style={{ flex: 1 }}>
                    <span style={{ ...HP_TEXT.sub }}>Rangkuman mingguan AI</span>
                    <span style={{ ...HP_TEXT.small }}>Analisa performa mingguan per orang</span>
                  </Stack>
                  <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.inkFade} />
                </Row>
              </HPCard>

              {isLastWorkingDayOfMonth && (
                <HPCard
                  onClick={() => openModal('ai_monthly_analysis')}
                  padding={14}
                  style={{ background: HP_TOKENS.primaryWash, borderColor: HP_TOKENS.primarySoft }}
                  ariaLabel="Buka analisa bulanan AI"
                >
                  <Row gap={3}>
                    <IconBadge size={36} tone={HP_TOKENS.primarySoft}>
                      <HPGlyph name="chart" size={17} color={HP_TOKENS.primaryInk} />
                    </IconBadge>
                    <Stack gap={0} style={{ flex: 1 }}>
                      <span style={{ ...HP_TEXT.sub }}>Analisa bulanan AI</span>
                      <span style={{ ...HP_TEXT.small }}>Evaluasi laporan bulanan vs KPI tim</span>
                    </Stack>
                    <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.inkFade} />
                  </Row>
                </HPCard>
              )}
            </Stack>
          );
        })()}

        {/* Focus tools */}
        <CoworkingWidget openModal={openModal} />

        {/* Task Harian with confetti */}
        <TaskHarianWidget
          openModal={openModal}
          // Angka poinnya dari server — lihat catatan di HomeScreen.
          onTaskComplete={(taskName?: string, awarded?: number) => {
            setConfetti(true);
            setCelebrate({show: true, points: awarded ?? 0, message: taskName ? `Selesai: ${taskName}` : "Hebat! Satu langkah lebih dekat."});
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
                  <Row gap={2} wrap style={{ marginTop: 12 }}>
                    <HPButton
                      size="sm"
                      variant="primary"
                      icon="check"
                      onClick={() => setApprovalStatus(appr.id, 'approved')}
                      loading={busyApproval === `${appr.id}:approved`}
                      disabled={!!busyApproval}
                    >
                      Setujui
                    </HPButton>
                    <HPButton
                      size="sm"
                      icon="refresh"
                      onClick={() => setApprovalStatus(appr.id, 'revision')}
                      loading={busyApproval === `${appr.id}:revision`}
                      disabled={!!busyApproval}
                    >
                      Revisi
                    </HPButton>
                    <HPButton
                      size="sm"
                      variant="danger"
                      icon="close"
                      onClick={() => setApprovalStatus(appr.id, 'rejected')}
                      loading={busyApproval === `${appr.id}:rejected`}
                      disabled={!!busyApproval}
                    >
                      Tolak
                    </HPButton>
                  </Row>
                </HPCard>
              ))}
            </div>
            {totalPagesApprovals > 1 && (
              <Row gap={3} justify="center" style={{ marginTop: 16 }}>
                <HPButton
                  size="sm"
                  icon="chevronLeft"
                  onClick={() => setCurrentPageApprovals(p => Math.max(1, p - 1))}
                  disabled={activePageApprovals === 1}
                >
                  Sebelumnya
                </HPButton>
                <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft }} aria-live="polite">
                  Halaman {activePageApprovals} dari {totalPagesApprovals}
                </span>
                <HPButton
                  size="sm"
                  iconEnd="chevronRight"
                  onClick={() => setCurrentPageApprovals(p => Math.min(totalPagesApprovals, p + 1))}
                  disabled={activePageApprovals === totalPagesApprovals}
                >
                  Berikutnya
                </HPButton>
              </Row>
            )}
          </div>
        )}

        {/* Pending task verification badge */}
        {pendingTasks.length > 0 && (
          <HPCard
            padding={14}
            style={{
              marginTop: 10,
              background: HP_TOKENS.yellowWash,
              borderColor: HP_TOKENS.yellowSoft,
            }}
          >
            <Row gap={3}>
              <IconBadge size={36} tone={HP_TOKENS.yellowSoft}>
                <HPGlyph name="hourglass" size={17} color={HP_TOKENS.yellowInk} />
              </IconBadge>
              <Stack gap={0} style={{ flex: 1 }}>
                <span style={{ ...HP_TEXT.sub }}>
                  {pendingTasks.length} task menunggu ACC
                </span>
                <span style={{ ...HP_TEXT.small }}>
                  Buka tab Target &amp; KPI Tim, lalu klik task dalam target untuk review
                </span>
              </Stack>
            </Row>
          </HPCard>
        )}

        <SurveySection openModal={openModal} />

        {/* Daily Training Habits */}
        <div id="daily-training-section" style={{ marginTop: 24 }}>
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
                    awardedPoints={lastHabitAward && lastHabitAward.name === h.name ? lastHabitAward.awarded : undefined}
                    onToggle={(date, isToday, done) => handleHabitDayClick(h.name, date, isToday, done)}
                    onQuickComplete={(date, isToday, wasDone, newDone) => handleQuickComplete(h.name, date, isToday, wasDone, newDone)}
                    onFinish={() => handleFinishTraining(h.name)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

          </>}

          rail={<>
            {/* ── The manager's own context, not the team's ─────────────── */}

            {/* Profile. Identity and level only — the team KPI that used to
                share this card was the one thing here about the job, and it
                now leads the main column. */}
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
                      <span style={{ ...HP_TEXT.sub, fontSize: 15 }}>{user.name.split(' ')[0]}</span>
                      <span style={{
                        ...HP_TEXT.tiny,
                        background: HP_TOKENS.blueSoft,
                        color: HP_TOKENS.blue,
                        padding: '2px 7px',
                        borderRadius: HP_TOKENS.radiusXs,
                      }}>
                        MANAGER
                      </span>
                    </Row>
                    <span style={{ ...HP_TEXT.small, marginTop: 2 }}>
                      Level {user.level} · {members.length} anggota
                    </span>
                  </Stack>
                </button>

                <Row gap={1} style={{ padding: '6px 10px', borderRadius: HP_TOKENS.radiusPill, background: HP_TOKENS.blueSoft, flexShrink: 0 }}>
                  <HPGlyph name="zap" size={13} color={HP_TOKENS.blue} />
                  <span style={{ ...HP_TEXT.small, color: HP_TOKENS.blue }}>{user.streak}</span>
                  <span className="hp-sr-only">hari streak</span>
                </Row>
              </Row>

              <Row gap={4} align="flex-end" style={{ marginTop: 14 }}>
                <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...HP_TEXT.tiny }}>Level progress</span>
                  <div style={{ width: '100%', height: 6, background: HP_TOKENS.lineSoft, borderRadius: HP_TOKENS.radiusPill, overflow: 'hidden' }}>
                    <div style={{
                      width: `${levelProgress * 100}%`, height: '100%',
                      background: HP_TOKENS.blue,
                      transition: 'width 1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }} />
                  </div>
                </Stack>
                <Stack gap={0} style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ ...HP_TEXT.tiny }}>Total point</span>
                  <span style={{ ...HP_TEXT.metric, fontSize: 20 }}>{user.points.toLocaleString()}</span>
                </Stack>
              </Row>
            </HPCard>

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

            {/* AI Coach for Manager */}
            <HPCard
              onClick={() => openModal('coach')}
              padding={16}
              style={{ background: HP_TOKENS.yellowWash, borderColor: HP_TOKENS.yellowSoft }}
              ariaLabel="Buka AI Manager Coach"
            >
              <Row gap={3}>
                <BeeMascot mood="happy" size={48} />
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...HP_TEXT.sub, fontSize: 14.5 }}>AI Manager Coach</span>
                  <span style={{ ...HP_TEXT.small }}>Feedback &amp; pengelolaan tim</span>
                </Stack>
                <HPGlyph name="chevronRight" size={17} color={HP_TOKENS.inkFade} />
              </Row>
            </HPCard>

            {/* Box breathing gets a card, not a shortcut row — same as employee
                Home. A manager's bad afternoon is no different. */}
            <BreathingCard openModal={openModal} compact />

            <ActionList
              title="Lainnya"
              items={[
                { icon: 'sparkle', label: 'Panduan sistem', onClick: () => openModal('system_guide') },
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
