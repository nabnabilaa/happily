"use client";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useHP, UserRole } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT } from "@/lib/constants";

// Auth
import AuthScreen from "@/components/auth/AuthScreen";
import OnboardingScreen from "@/components/auth/OnboardingScreen";

// UI
import HPGlyph from "@/components/ui/HPGlyph";
import BeeMascot from "@/components/ui/BeeMascot";
import TabNav from "@/components/layout/TabNav";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";

// ── Shared Screens ──
import CalendarScreen from "@/components/home/CalendarScreen";
import NotesScreen from "@/components/notes/NotesScreen";
import ChatScreen from "@/components/home/ChatScreen";

// ── Employee Screens ──
import HomeScreen from "@/components/home/HomeScreen";
import GoalsScreen from "@/components/goals/GoalsScreen";
import RecognizeScreen from "@/components/recognize/RecognizeScreen";

// ── Manager Screens ──
import ManagerHomeScreen from "@/components/home/ManagerHomeScreen";
import ManagerGoalsScreen from "@/components/goals/ManagerGoalsScreen";
import ManagerRecognizeScreen from "@/components/recognize/ManagerRecognizeScreen";

// ── HR Screens ──
import HRHomeScreen from "@/components/home/HRHomeScreen";
import HRPeopleScreen from "@/components/goals/HRPeopleScreen";
import HRRecognizeScreen from "@/components/recognize/HRRecognizeScreen";


// ── Admin Screens ──



// Modals dynamically imported to optimize page loading time
const CheckInModal = dynamic(() => import("@/components/modals/CheckInModal"), { ssr: false });
const FocusModal = dynamic(() => import("@/components/modals/FocusModal"), { ssr: false });
const OvertimePromptModal = dynamic(() => import("@/components/modals/OvertimePromptModal"), { ssr: false });

const PauseModal = dynamic(() => import("@/components/modals/PauseModal"), { ssr: false });
const ReflectModal = dynamic(() => import("@/components/modals/ReflectModal"), { ssr: false });
const CoachModal = dynamic(() => import("@/components/modals/CoachModal"), { ssr: false });
const NotificationsModal = dynamic(() => import("@/components/modals/NotificationsModal"), { ssr: false });

const GoalModal = dynamic(() => import("@/components/modals/GoalModal"), { ssr: false });
const WorkCheckInModal = dynamic(() => import("@/components/modals/WorkCheckInModal"), { ssr: false });
const ManagePrioritiesModal = dynamic(() => import("@/components/modals/ManagePrioritiesModal"), { ssr: false });
const ManageHabitsModal = dynamic(() => import("@/components/modals/ManageHabitsModal"), { ssr: false });
const ManageLearningModal = dynamic(() => import("@/components/modals/ManageLearningModal"), { ssr: false });
const ScheduleCoachingModal = dynamic(() => import("@/components/modals/ScheduleCoachingModal"), { ssr: false });
const LearningDetailModal = dynamic(() => import("@/components/modals/LearningDetailModal"), { ssr: false });
const ManageProgramsModal = dynamic(() => import("@/components/modals/ManageProgramsModal"), { ssr: false });
const AllRewardsModal = dynamic(() => import("@/components/modals/AllRewardsModal"), { ssr: false });
const LogbookModal = dynamic(() => import("@/components/modals/LogbookModal"), { ssr: false });
const CalendarModal = dynamic(() => import("@/components/modals/CalendarModal"), { ssr: false });
const SystemGuideModal = dynamic(() => import("@/components/modals/SystemGuideModal"), { ssr: false });
const ProfileEditorModal = dynamic(() => import("@/components/modals/ProfileEditorModal"), { ssr: false });
const ManageSurveysModal = dynamic(() => import("@/components/modals/ManageSurveysModal"), { ssr: false });
const TakeSurveyModal = dynamic(() => import("@/components/modals/TakeSurveyModal"), { ssr: false });
const SurveyResultsModal = dynamic(() => import("@/components/modals/SurveyResultsModal"), { ssr: false });
const AttendanceScannerModal = dynamic(() => import("@/components/modals/AttendanceScannerModal"), { ssr: false });
const AttendanceHistoryModal = dynamic(() => import("@/components/modals/AttendanceHistoryModal"), { ssr: false });
const OKRDictionaryModal = dynamic(() => import("@/components/modals/OKRDictionaryModal"), { ssr: false });
const ManageContactsModal = dynamic(() => import("@/components/modals/ManageContactsModal"), { ssr: false });
const RewardEditorModal = dynamic(() => import("@/components/modals/RewardEditorModal"), { ssr: false });
const ContactEditorModal = dynamic(() => import("@/components/modals/ContactEditorModal"), { ssr: false });
const EditUserModal = dynamic(() => import("@/components/modals/EditUserModal"), { ssr: false });
const CreateUserModal = dynamic(() => import("@/components/modals/CreateUserModal"), { ssr: false });
const DepartmentManagerModal = dynamic(() => import("@/components/modals/DepartmentManagerModal"), { ssr: false });
const MemberLogbookModal = dynamic(() => import("@/components/modals/MemberLogbookModal"), { ssr: false });
const ManageKPIModal = dynamic(() => import("@/components/modals/ManageKPIModal"), { ssr: false });
const WeeklyReviewModal = dynamic(() => import("@/components/modals/WeeklyReviewModal"), { ssr: false });
const MonthlyReportModal = dynamic(() => import("@/components/modals/MonthlyReportModal"), { ssr: false });
const AIAuditModal = dynamic(() => import("@/components/modals/AIAuditModal"), { ssr: false });
const EmployeeProfileModal = dynamic(() => import("@/components/modals/EmployeeProfileModal"), { ssr: false });
const StatusInputModal = dynamic(() => import("@/components/modals/StatusInputModal"), { ssr: false });
const NewChatModal = dynamic(() => import("@/components/modals/NewChatModal"), { ssr: false });
const AppreciateModal = dynamic(() => import("@/components/modals/AppreciateModal"), { ssr: false });
const AnnouncementModal = dynamic(() => import("@/components/modals/AnnouncementModal"), { ssr: false });
import HPToastContainer from "@/components/ui/HPToastContainer";
const ConfirmLogoutModal = dynamic(() => import("@/components/modals/ConfirmLogoutModal"), { ssr: false });
import NotificationBanner from "@/components/pwa/NotificationBanner";


// ─── Role pill badge colors ──────────────────────────────────────────────────
const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; glyph: string }> = {
  employee: { label: 'Employee', color: HP_TOKENS.yellow, bg: HP_TOKENS.yellowSoft, glyph: 'target' },
  manager:  { label: 'Manager',  color: HP_TOKENS.blue, bg: HP_TOKENS.blueSoft,  glyph: 'people' },
  hr:       { label: 'HR',       color: '#7B6BB5',       bg: '#EDE8F5',           glyph: 'medal' },
};

function AppContent() {
  const { state, loading, user, login, logout, setUserRole, updateState } = useHP();
  const [tab, setTab] = useState('home');
  const [modal, setModal] = useState<{ name: string; props?: any } | null>(null);
  const [coachPos, setCoachPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = React.useRef<{ startX: number, startY: number, initialX: number, initialY: number } | null>(null);

  const openModal  = useCallback((name: string, props?: any) => setModal({ name, props }), []);
  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenReflect = () => openModal('reflect');
    window.addEventListener('hp_open_reflect', handleOpenReflect);
    return () => window.removeEventListener('hp_open_reflect', handleOpenReflect);
  }, [openModal]);

  // ── Loading splash ─────────────────────────────────────────────────────────
  const [quote, setQuote] = useState("Mempersiapkan hari yang produktif... ✨");
  React.useEffect(() => {
    const quotes = [
      "Mempersiapkan hari yang produktif... ✨",
      "Sedang mengumpulkan semangat... 🍯",
      "Tetap fokus, tetap tumbuh... 🌱",
      "Hampir siap! Yuk buat hari ini luar biasa. 🚀",
      "Menghubungkanmu dengan tim terbaik... 🤝"
    ];
    setQuote(quotes[Math.floor(Date.now() / 2000) % quotes.length]);
    const interval = setInterval(() => {
      setQuote(quotes[Math.floor(Date.now() / 2000) % quotes.length]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'var(--hp-paper)',
        gap: 24,
        fontFamily: HP_FONT
      }}>
        <div style={{ animation: 'hpPulse 2s infinite ease-in-out' }}>
          <BeeMascot mood="happy" size={100} showSpeech="" />
        </div>
        <div style={{ 
          fontSize: 15, 
          fontWeight: 700, 
          color: 'var(--hp-ink-mute)',
          textAlign: 'center',
          maxWidth: 240,
          lineHeight: 1.5,
          animation: 'hpFadeIn 0.8s ease-out'
        }}>
          {quote}
        </div>

        <style jsx global>{`
          @keyframes hpPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  // ── Auth Check ─────────────────────────────────────────────────────────────
  if (!user) {
    return <AuthScreen onLogin={login} />;
  }

  const handleOnboardingFinish = async () => {
    updateState({ onboarded: true });
    // Explicitly sync once to be sure
    try {
      await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          state: { ...state, onboarded: true }, 
          user, 
          userId: user.id 
        }),
      });
    } catch (e) {
      console.error("Failed to sync onboarding status:", e);
    }
    openModal('checkin');
  };

  // ── Onboarding ──
  if (state && !state.onboarded && user.role === 'employee') {
    return (
      <OnboardingScreen 
        userName={user.name} 
        onFinish={handleOnboardingFinish} 
      />
    );
  }

  // ── Determine Role ────────────────────────────────────────────────────────
  const currentRole = (user?.role || 'employee') as UserRole;
  const isManager = currentRole === 'manager';
  const isHR = currentRole === 'hr';

  // ── Render screen by role + tab ─────────────────────────────────────────────
  const renderScreen = () => {
    // Calendar tab is shared across all roles
    if (tab === 'calendar') return <CalendarScreen openModal={openModal} />;
    // Chat tab is shared across all roles
    if (tab === 'chat') return <ChatScreen openModal={openModal} />;

    // Employee
    if (currentRole === 'employee') {
      if (tab === 'home')      return <HomeScreen tab={tab} openModal={openModal} />;
      if (tab === 'calendar')  return <CalendarScreen openModal={openModal} />;
      if (tab === 'goals')     return <GoalsScreen openModal={openModal} />;
      if (tab === 'notes')     return <NotesScreen />;
      if (tab === 'recognize') return <RecognizeScreen openModal={openModal} />;
    }
    // Manager
    if (currentRole === 'manager') {
      if (tab === 'home')      return <ManagerHomeScreen openModal={openModal} />;
      if (tab === 'calendar')  return <CalendarScreen openModal={openModal} />;
      if (tab === 'goals')     return <ManagerGoalsScreen openModal={openModal} />;
      if (tab === 'notes')     return <NotesScreen />;
      if (tab === 'recognize') return <ManagerRecognizeScreen openModal={openModal} />;
    }
    // HR view
    if (currentRole === 'hr') {
      if (tab === 'home')      return <HRHomeScreen openModal={openModal} />;
      if (tab === 'calendar')  return <CalendarScreen openModal={openModal} />;
      if (tab === 'goals')     return <HRPeopleScreen openModal={openModal} />;
      if (tab === 'notes')     return <NotesScreen />;
      if (tab === 'recognize') return <HRRecognizeScreen openModal={openModal} />;
    }
    return null;
  };

  const meta = ROLE_META[currentRole];

  // ── Draggable Coach Button Handlers ──────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: coachPos.x,
      initialY: coachPos.y,
    };
    setIsDragging(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      setIsDragging(true);
    }
    setCoachPos({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging && dragRef.current) {
      openModal('coach');
    }
    dragRef.current = null;
  };

  return (
    <div className="hp-app-container">
      <TabNav tab={tab} setTab={setTab} userRole={currentRole} />

      {/* Main content */}
      <div className="hp-app-content">
        {/* Role pill & Logout — top right */}
        <div style={{
          position: 'absolute', top: 16, right: 16, zIndex: 40,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <ThemeSwitcher />

          <button
            onClick={() => openModal('notifications')}
            className="hp-tap"
            title="Notifikasi"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: `1.5px solid var(--hp-line)`,
              background: "var(--hp-card)",
              color: "var(--hp-ink)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.2s ease",
            }}
          >
            <HPGlyph name="bell" size={18} stroke={2.5} color={HP_TOKENS.ink} />
            {state?.notifications && state.notifications > 0 ? (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  background: HP_TOKENS.coral,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  borderRadius: 99,
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(232, 139, 125, 0.4)",
                  border: "1.5px solid var(--hp-card)",
                }}
              >
                {state.notifications}
              </span>
            ) : null}
          </button>

          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 99,
              background: meta.bg,
              border: `1.5px solid ${meta.color}30`,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 11,
              color: meta.color,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <HPGlyph name={meta.glyph} size={11} color={meta.color} />
            <span>{meta.label}</span>
          </div>

          <button
            onClick={() => openModal('confirm_logout')}
            className="hp-tap"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 99,
              background: HP_TOKENS.coralSoft,
              border: `1.5px solid ${HP_TOKENS.coral}30`,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 11,
              color: HP_TOKENS.coral,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              cursor: 'pointer',
            }}
            title="Keluar (Logout)"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Keluar</span>
          </button>
        </div>

        <div className="hp-screen-container">
          <NotificationBanner />
          {renderScreen()}
        </div>

        {/* Floating AI Coach button - DRAGGABLE */}
        <button
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              position: 'fixed', 
              right: 24 - coachPos.x, 
              bottom: 106 - coachPos.y, // Keep safe distance from bottom nav on mobile
              zIndex: 100, // High z-index to be above everything
              width: 56, height: 56, borderRadius: 28, border: 'none',
              background: currentRole === 'manager' ? HP_TOKENS.blue :
                         currentRole === 'hr' ? '#7B6BB5' :
                         HP_TOKENS.yellow,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isDragging ? 'grabbing' : 'pointer',
              touchAction: 'none', // Prevent scrolling while dragging
              boxShadow: `0 8px 24px ${
                currentRole === 'manager' ? 'rgba(59,111,160,0.4)' :
                currentRole === 'hr' ? 'rgba(123,107,181,0.4)' :
                'rgba(253,185,19,0.4)'
              }`,
              transition: 'transform 0.1s ease-out',
              transform: isDragging ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            <HPGlyph name="sparkle" size={26} color={currentRole === 'employee' ? HP_TOKENS.ink : "#fff"} />
        </button>
      </div>

      {/* Modal Renderer */}
      {modal?.name === 'checkin'          && <CheckInModal onClose={closeModal} />}
      {modal?.name === 'focus'            && <FocusModal onClose={closeModal} />}
      {modal?.name === 'overtime_prompt'  && <OvertimePromptModal onClose={closeModal} />}

      {modal?.name === 'pause'            && <PauseModal onClose={closeModal} />}
      {modal?.name === 'reflect'          && <ReflectModal onClose={closeModal} />}
      {modal?.name === 'coach'            && <CoachModal onClose={closeModal} />}
      {modal?.name === 'notifications'    && <NotificationsModal onClose={closeModal} openModal={openModal} />}

      {modal?.name === 'new_goal'         && <GoalModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'work_checkin'     && <WorkCheckInModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'manage_priorities'&& <ManagePrioritiesModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'manage_habits'    && <ManageHabitsModal onClose={closeModal} />}
      {modal?.name === 'manage_learning'  && <ManageLearningModal onClose={closeModal} />}
      {modal?.name === 'schedule_coaching'&& <ScheduleCoachingModal onClose={closeModal} />}
      {modal?.name === 'learning_detail'  && <LearningDetailModal onClose={closeModal} />}
      {modal?.name === 'manage_programs'  && <ManageProgramsModal onClose={closeModal} />}
      {modal?.name === 'all_rewards'      && <AllRewardsModal onClose={closeModal} />}
      {modal?.name === 'logbook'          && <LogbookModal onClose={closeModal} />}
      {modal?.name === 'system_guide'     && <SystemGuideModal onClose={closeModal} />}
      {modal?.name === 'profile_editor'   && <ProfileEditorModal onClose={closeModal} />}
      {modal?.name === 'manage_surveys'   && <ManageSurveysModal onClose={closeModal} openModal={openModal} {...modal.props} />}
      {modal?.name === 'take_survey'     && <TakeSurveyModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'survey_results'   && <SurveyResultsModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'attendance_scanner' && <AttendanceScannerModal onClose={closeModal} />}
      {modal?.name === 'attendance_history' && <AttendanceHistoryModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'calendar'         && <CalendarModal onClose={closeModal} />}
      {modal?.name === 'okr_dictionary'   && <OKRDictionaryModal onClose={closeModal} />}
      {modal?.name === 'manage_contacts' && <ManageContactsModal onClose={closeModal} />}
      {modal?.name === 'reward_editor'   && <RewardEditorModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'contact_editor'  && <ContactEditorModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'edit_user'       && <EditUserModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'create_user'     && <CreateUserModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'manage_depts'    && <DepartmentManagerModal onClose={closeModal} />}
      {modal?.name === 'member_logbook'  && <MemberLogbookModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'manage_kpi'      && <ManageKPIModal onClose={closeModal} />}
      {modal?.name === 'weekly_review'    && <WeeklyReviewModal onClose={closeModal} />}
      {modal?.name === 'monthly_report'   && <MonthlyReportModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'ai_weekly_summary' && <AIAuditModal onClose={closeModal} type="weekly" />}
      {modal?.name === 'ai_monthly_analysis' && <AIAuditModal onClose={closeModal} type="monthly" />}
      {modal?.name === 'employee_profile' && <EmployeeProfileModal onClose={closeModal} openModal={openModal} {...modal.props} />}
      {modal?.name === 'update_status'    && <StatusInputModal onClose={closeModal} />}
      {modal?.name === 'new_chat'          && <NewChatModal onClose={closeModal} onChannelCreated={(channelId: string) => {
        // Dispatch event so ChatScreen can pick it up
        window.dispatchEvent(new CustomEvent('chat_channel_created', { detail: { channelId } }));
        // Also call the prop-based callback if passed from ChatScreen
        modal.props?.onChannelCreated?.(channelId);
      }} />}
      {modal?.name === 'appreciate'       && <AppreciateModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'announcement'     && <AnnouncementModal onClose={closeModal} />}
      {modal?.name === 'confirm_logout'   && <ConfirmLogoutModal onClose={closeModal} onConfirm={logout} />}

      <HPToastContainer />
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
