"use client";

import React, { useState, useCallback } from "react";
import { HPProvider, useHP, UserRole } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT } from "@/lib/constants";

// Auth
import AuthScreen from "@/components/auth/AuthScreen";
import OnboardingScreen from "@/components/auth/OnboardingScreen";

// UI
import HPGlyph from "@/components/ui/HPGlyph";
import BeeMascot from "@/components/ui/BeeMascot";
import TabNav from "@/components/layout/TabNav";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

// ── Shared Screens ──
import CalendarScreen from "@/components/home/CalendarScreen";
import NotesScreen from "@/components/notes/NotesScreen";

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



// Modals
import CheckInModal from "@/components/modals/CheckInModal";
import FocusModal from "@/components/modals/FocusModal";

import PauseModal from "@/components/modals/PauseModal";
import ReflectModal from "@/components/modals/ReflectModal";
import CoachModal from "@/components/modals/CoachModal";
import NotificationsModal from "@/components/modals/NotificationsModal";

import GoalModal from "@/components/modals/GoalModal";
import WorkCheckInModal from "@/components/modals/WorkCheckInModal";
import ManagePrioritiesModal from "@/components/modals/ManagePrioritiesModal";
import ManageHabitsModal from "@/components/modals/ManageHabitsModal";
import ManageLearningModal from "@/components/modals/ManageLearningModal";
import ScheduleCoachingModal from "@/components/modals/ScheduleCoachingModal";
import LearningDetailModal from "@/components/modals/LearningDetailModal";
import ManageProgramsModal from "@/components/modals/ManageProgramsModal";
import AllRewardsModal from "@/components/modals/AllRewardsModal";
import LogbookModal from "@/components/modals/LogbookModal";
import CalendarModal from "@/components/modals/CalendarModal";
import SystemGuideModal from "@/components/modals/SystemGuideModal";
import ProfileEditorModal from "@/components/modals/ProfileEditorModal";
import ManageSurveysModal from "@/components/modals/ManageSurveysModal";
import TakeSurveyModal from "@/components/modals/TakeSurveyModal";
import SurveyResultsModal from "@/components/modals/SurveyResultsModal";
import AttendanceScannerModal from "@/components/modals/AttendanceScannerModal";
import AttendanceHistoryModal from "@/components/modals/AttendanceHistoryModal";
import OKRDictionaryModal from "@/components/modals/OKRDictionaryModal";
import ManageContactsModal from "@/components/modals/ManageContactsModal";
import RewardEditorModal from "@/components/modals/RewardEditorModal";
import ContactEditorModal from "@/components/modals/ContactEditorModal";
import EditUserModal from "@/components/modals/EditUserModal";
import CreateUserModal from "@/components/modals/CreateUserModal";
import DepartmentManagerModal from "@/components/modals/DepartmentManagerModal";
import MemberLogbookModal from "@/components/modals/MemberLogbookModal";
import ManageKPIModal from "@/components/modals/ManageKPIModal";
import WeeklyReviewModal from "@/components/modals/WeeklyReviewModal";
import MonthlyReportModal from "@/components/modals/MonthlyReportModal";
import AIAuditModal from "@/components/modals/AIAuditModal";
import EmployeeProfileModal from "@/components/modals/EmployeeProfileModal";
import StatusInputModal from "@/components/modals/StatusInputModal";
import NewChatModal from "@/components/modals/NewChatModal";
import ChatScreen from "@/components/home/ChatScreen";
import HPToastContainer from "@/components/ui/HPToastContainer";
import ConfirmLogoutModal from "@/components/modals/ConfirmLogoutModal";


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
        background: HP_TOKENS.paper,
        gap: 24,
        fontFamily: HP_FONT
      }}>
        <div style={{ animation: 'hpPulse 2s infinite ease-in-out' }}>
          <BeeMascot mood="happy" size={100} showSpeech="" />
        </div>
        <div style={{ 
          fontSize: 15, 
          fontWeight: 700, 
          color: HP_TOKENS.inkMute,
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
      {modal?.name === 'confirm_logout'   && <ConfirmLogoutModal onClose={closeModal} onConfirm={logout} />}

      <HPToastContainer />
    </div>
  );
}

export default function Home() {
  return (
    <HPProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </HPProvider>
  );
}
