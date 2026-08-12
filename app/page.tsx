"use client";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useHP, UserRole } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT } from "@/lib/constants";

// Auth
import AuthScreen from "@/components/auth/AuthScreen";
import OnboardingScreen, { type OnboardingResult } from "@/components/auth/OnboardingScreen";

// UI
import HPGlyph from "@/components/ui/HPGlyph";
import BeeMascot from "@/components/ui/BeeMascot";
import TabNav from "@/components/layout/TabNav";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import InstallButton from "@/components/pwa/InstallButton";
import SenggolModal from "@/components/modals/SenggolModal";

// ── Shared Screens ──
import CalendarScreen from "@/components/home/CalendarScreen";
import NotesScreen from "@/components/notes/NotesScreen";
import ChatScreen from "@/components/home/ChatScreen";
import TeamScreen from "@/components/team/TeamScreen";

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



// Helper to handle ChunkLoadError on dynamic imports cleanly
const safeDynamic = <P,>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>
) => {
  return dynamic<P>(
    () =>
      importFunc().catch((err) => {
        console.error("Dynamic chunk load error, reloading page:", err);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
        return { default: (() => null) as React.ComponentType<P> };
      }),
    { ssr: false }
  );
};

// Modals dynamically imported to optimize page loading time
const CheckInModal = safeDynamic(() => import("@/components/modals/CheckInModal"));
const FocusModal = safeDynamic(() => import("@/components/modals/FocusModal"));
const FocusSessionKeeper = safeDynamic(() => import("@/components/home/FocusSessionKeeper"));
const OvertimePromptModal = safeDynamic(() => import("@/components/modals/OvertimePromptModal"));

const PauseModal = safeDynamic(() => import("@/components/modals/PauseModal"));
const ReflectModal = safeDynamic(() => import("@/components/modals/ReflectModal"));
const CoachModal = safeDynamic(() => import("@/components/modals/CoachModal"));
const NotificationsModal = safeDynamic(() => import("@/components/modals/NotificationsModal"));


const WorkCheckInModal = safeDynamic(() => import("@/components/modals/WorkCheckInModal"));
const RewardFulfillmentModal = safeDynamic(() => import("@/components/modals/RewardFulfillmentModal"));
const ManagePrioritiesModal = safeDynamic(() => import("@/components/modals/ManagePrioritiesModal"));
const ManageHabitsModal = safeDynamic(() => import("@/components/modals/ManageHabitsModal"));
const ManageLearningModal = safeDynamic(() => import("@/components/modals/ManageLearningModal"));
const ScheduleCoachingModal = safeDynamic(() => import("@/components/modals/ScheduleCoachingModal"));
const LearningDetailModal = safeDynamic(() => import("@/components/modals/LearningDetailModal"));
const ManageProgramsModal = safeDynamic(() => import("@/components/modals/ManageProgramsModal"));
const AllRewardsModal = safeDynamic(() => import("@/components/modals/AllRewardsModal"));
const LogbookModal = safeDynamic(() => import("@/components/modals/LogbookModal"));
const CalendarModal = safeDynamic(() => import("@/components/modals/CalendarModal"));
const SystemGuideModal = safeDynamic(() => import("@/components/modals/SystemGuideModal"));
const ProfileEditorModal = safeDynamic(() => import("@/components/modals/ProfileEditorModal"));
const ManageSurveysModal = safeDynamic(() => import("@/components/modals/ManageSurveysModal"));
const TakeSurveyModal = safeDynamic(() => import("@/components/modals/TakeSurveyModal"));
const SurveyResultsModal = safeDynamic(() => import("@/components/modals/SurveyResultsModal"));
const AttendanceScannerModal = safeDynamic(() => import("@/components/modals/AttendanceScannerModal"));
const AttendanceHistoryModal = safeDynamic(() => import("@/components/modals/AttendanceHistoryModal"));

const ManageContactsModal = safeDynamic(() => import("@/components/modals/ManageContactsModal"));
const RewardEditorModal = safeDynamic(() => import("@/components/modals/RewardEditorModal"));
const ContactEditorModal = safeDynamic(() => import("@/components/modals/ContactEditorModal"));
const EditUserModal = safeDynamic(() => import("@/components/modals/EditUserModal"));
const CreateUserModal = safeDynamic(() => import("@/components/modals/CreateUserModal"));
const DepartmentManagerModal = safeDynamic(() => import("@/components/modals/DepartmentManagerModal"));
const MemberLogbookModal = safeDynamic(() => import("@/components/modals/MemberLogbookModal"));
const MemberTaskModal = safeDynamic(() => import("@/components/modals/MemberTaskModal"));
const ManageKPIModal = safeDynamic(() => import("@/components/modals/ManageKPIModal"));
const PersonalKpiModal = safeDynamic(() => import("@/components/modals/PersonalKpiModal"));
const KpiReviewModal = safeDynamic(() => import("@/components/modals/KpiReviewModal"));
const WeeklyReviewModal = safeDynamic(() => import("@/components/modals/WeeklyReviewModal"));
const MonthlyReportModal = safeDynamic(() => import("@/components/modals/MonthlyReportModal"));
const ReportExportModal = safeDynamic(() => import("@/components/modals/ReportExportModal"));
const AIAuditModal = safeDynamic(() => import("@/components/modals/AIAuditModal"));
const EmployeeProfileModal = safeDynamic(() => import("@/components/modals/EmployeeProfileModal"));
const StatusInputModal = safeDynamic(() => import("@/components/modals/StatusInputModal"));
const NewChatModal = safeDynamic(() => import("@/components/modals/NewChatModal"));
const AppreciateModal = safeDynamic(() => import("@/components/modals/AppreciateModal"));
const AnnouncementModal = safeDynamic(() => import("@/components/modals/AnnouncementModal"));
const MascotGuideModal = safeDynamic(() => import("@/components/modals/MascotGuideModal"));
const ExtensionGuideModal = safeDynamic(() => import("@/components/modals/ExtensionGuideModal"));
import HPToastContainer from "@/components/ui/HPToastContainer";
import ConfirmLogoutModal from "@/components/modals/ConfirmLogoutModal";
import DailyGreetingModal, { needsDailyGreeting, markDailyGreeted } from "@/components/modals/DailyGreetingModal";
const ManageOnboardingModal = safeDynamic(() => import("@/components/modals/ManageOnboardingModal"));


// ─── Role pill badge colors (Gercep Palette) ────────────────────────────────
const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; glyph: string }> = {
  employee: { label: 'Employee', color: HP_TOKENS.primaryInk, bg: HP_TOKENS.primarySoft, glyph: 'target' },
  manager:  { label: 'Manager',  color: HP_TOKENS.infoInk,    bg: HP_TOKENS.infoSoft,    glyph: 'people' },
  hr:       { label: 'HR Admin', color: HP_TOKENS.successInk, bg: HP_TOKENS.successSoft, glyph: 'medal' },
};

/** Compact pill used by the header controls. */
const headerPill: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 34,
  padding: '0 12px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '-0.005em',
  whiteSpace: 'nowrap',
};

/** Circular icon button. 38px visual, 44px hit area via padding on the row. */
const headerIconBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  borderRadius: '50%',
  border: `1px solid ${HP_TOKENS.border}`,
  background: HP_TOKENS.card,
  color: HP_TOKENS.ink,
  position: 'relative',
  flexShrink: 0,
};

function AppContent() {
  const { state, loading, user, login, logout, updateState, updateUser, notify } = useHP();
  const [tab, setTab] = useState('home');
  const [modal, setModal] = useState<{ name: string; props?: any } | null>(null);
  const [coachPos, setCoachPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showDailyGreeting, setShowDailyGreeting] = useState(false);
  const dragRef = React.useRef<{ startX: number, startY: number, initialX: number, initialY: number } | null>(null);

  const openModal  = useCallback((name: string, props?: any) => setModal({ name, props }), []);
  const closeModal = useCallback(() => setModal(null), []);

  // Akses HR bisa dicabut saat sesi berjalan. Tanpa ini tab konsol hilang dari
  // nav tapi `tab` masih 'hr_console', dan layarnya jadi kosong melompong.
  useEffect(() => {
    if (tab === 'hr_console' && !(user?.hrAccess && user?.role !== 'hr')) setTab('home');
  }, [tab, user?.hrAccess, user?.role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenReflect = () => openModal('reflect');
    const handleOpenExtensionGuide = () => openModal('extension_guide');
    
    const handleSwitchTab = (e: any) => setTab(e.detail);
    window.addEventListener('hp_open_reflect', handleOpenReflect);
    window.addEventListener('hp_open_extension_guide', handleOpenExtensionGuide);
    window.addEventListener('hp_switch_tab', handleSwitchTab);
    
    return () => {
      window.removeEventListener('hp_open_reflect', handleOpenReflect);
      window.removeEventListener('hp_open_extension_guide', handleOpenExtensionGuide);
      window.removeEventListener('hp_switch_tab', handleSwitchTab);
    };
  }, [openModal]);

  // Handle direct actions from URL parameters
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const autoLoginId = urlParams.get('autoLoginId');
    // Kode ruangan dari QR sesi fokus. Yang dibawa QR adalah KODE, bukan id
    // ruangan — id tidak boleh beredar di luar (lihat api/focus/rooms/resolve).
    const focusCode = urlParams.get('focusCode');

    // Auto-login from QR code
    if (autoLoginId) {
      const existingUserId = localStorage.getItem("hp_user_id");
      if (existingUserId !== autoLoginId) {
        localStorage.setItem("hp_user_id", autoLoginId);
        // Clean up the URL but keep the action so it triggers the modal after
        // load. `focusCode` ikut dibawa: tanpa ini, memindai QR ruangan sambil
        // berpindah akun akan membuka layar fokus kosong, bukan ruangannya.
        const carry = new URLSearchParams({ action: action || 'focus' });
        if (focusCode) carry.set('focusCode', focusCode);
        window.location.href = `/?${carry.toString()}`;
        return;
      } else {
        // Already logged in as the same user. Just clean the URL parameter.
        const url = new URL(window.location.href);
        url.searchParams.delete('autoLoginId');
        window.history.replaceState({}, '', url);
      }
    }

    if (user && state?.onboarded) {
      if (action === 'focus') {
        // Param dibersihkan LEBIH DULU, bukan setelah modal terbuka. Kalau
        // kodenya sudah hangus atau user menutup layarnya, refresh tidak boleh
        // mengulangi percobaan masuk yang sama.
        const url = new URL(window.location.href);
        url.searchParams.delete('action');
        url.searchParams.delete('focusCode');
        url.searchParams.delete('autoLoginId');
        window.history.replaceState({}, '', url);

        if (focusCode) {
          void (async () => {
            try {
              const res = await fetch('/api/focus/rooms/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ code: focusCode }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok || !data.roomId) {
                // Ruangan yang sudah selesai adalah hasil yang wajar, bukan
                // kegagalan: layar fokus tetap dibuka supaya orangnya bisa
                // membuat sesi sendiri, bukan dibiarkan di halaman kosong.
                notify('Ruangan tidak ditemukan', data.error || 'Kode di QR itu sudah tidak berlaku.', 'warning');
                openModal('focus');
                return;
              }
              openModal('focus', { roomId: data.roomId, joinCode: focusCode });
            } catch {
              notify('Koneksi bermasalah', 'Tidak bisa memeriksa kode ruangan. Coba lagi.', 'warning');
              openModal('focus');
            }
          })();
          return;
        }

        // Delay to ensure the UI is fully mounted before popping modal
        setTimeout(() => openModal('focus'), 500);
      }
    }
  }, [user, state?.onboarded, openModal, notify]);

  // ── Daily Greeting (once per day for onboarded users) ─────────────────────
  useEffect(() => {
    if (!user || !state?.onboarded || loading) return;
    // Small delay so the app settles before showing greeting
    const timer = setTimeout(() => {
      if (needsDailyGreeting()) {
        setShowDailyGreeting(true);
        markDailyGreeted();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [user, state?.onboarded, loading]);

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
        gap: 28,
        fontFamily: HP_FONT,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient background glows (using radial-gradient to prevent clipping artifacts) */}
        <div style={{ position: 'absolute', width: '70vw', height: '70vw', background: 'rgba(59,130,246,0.1 0%, rgba(59,130,246,0) 65%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '50vw', height: '50vw', background: 'rgba(255,212,59,0.08 0%, rgba(255,212,59,0) 65%)', top: '0%', left: '0%', transform: 'translate(-30%, -30%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '80vw', height: '80vw', background: 'rgba(74,124,89,0.06 0%, rgba(74,124,89,0) 60%)', bottom: '0%', right: '0%', transform: 'translate(20%, 20%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Buddy Mascot */}
        <div style={{ animation: 'hpFloat 2.8s ease-in-out infinite', zIndex: 2 }}>
          <BeeMascot mood="happy" size={100} showSpeech="" />
        </div>

        {/* Logo */}
        <div style={{ zIndex: 2, textAlign: 'center' }}>
          <div style={{ 
            fontFamily: 'var(--hp-font-display)', fontSize: 42, fontWeight: 700, 
            color: 'var(--hp-ink)', letterSpacing: -1, animation: 'hpFadeUp 0.5s ease both' 
          }}>
            Flow<span style={{ color: 'var(--hp-primary)' }}>buddy</span><HPGlyph name="sparkle" size={28} color="currentColor" /></div>
          <div style={{ 
            fontSize: 14, color: 'var(--hp-ink-mute)', letterSpacing: 0.5, 
            marginTop: 6, fontWeight: 600, animation: 'hpFadeUp 0.5s 0.15s ease both' 
          }}>
            Flowbuddy — Kerja Lebih Cerdas
          </div>
        </div>

        {/* Rotating quote */}
        <div style={{ 
          fontSize: 14, 
          fontWeight: 700, 
          color: 'var(--hp-ink-fade)',
          textAlign: 'center',
          maxWidth: 260,
          lineHeight: 1.55,
          zIndex: 2,
          animation: 'hpFadeUp 0.5s 0.3s ease both',
        }}>
          {quote}
        </div>

        {/* Loading bar */}
        <div style={{ 
          width: 48, height: 4, background: 'var(--hp-line)', 
          borderRadius: 100, overflow: 'hidden', zIndex: 2,
          animation: 'hpFadeUp 0.5s 0.4s ease both',
        }}>
          <div style={{ 
            height: '100%', background: 'var(--hp-primary)', borderRadius: 100, 
            animation: 'hpSplashBar 2s ease-in-out infinite',
          }} />
        </div>
      </div>
    );
  }

  // ── Auth Check ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <AuthScreen onLogin={login} />
        <HPToastContainer />
      </>
    );
  }

  const handleOnboardingFinish = async ({ job, department, departmentId, answers }: OnboardingResult) => {
    updateState({ onboarded: true });
    const picked = department ?? job ?? null;
    // Divisi + status yang benar-benar tersimpan, dipakai untuk sync storage di bawah.
    // Tanpa ini, POST /api/storage mengirim `user` versi lama dan menimpa balik
    // kolom department/department_status yang baru saja diisi.
    let savedDepartment: string | null = picked;
    let savedStatus: 'pending' | 'approved' | null = picked ? 'pending' : null;
    // Simpan status onboarding, divisi, dan seluruh jawaban onboarding (knowledge tambahan per user) ke DB.
    // `departmentId` terisi kalau pilihan karyawan cocok dengan departemen HR yang asli —
    // dalam kasus itu API langsung menggabungkannya (approved), tanpa antre persetujuan.
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          department: picked,
          departmentId: departmentId ?? null,
          answers: answers || [],
        }),
      });
      const data = await res.json().catch(() => null);
      // Pakai divisi + status yang dikonfirmasi server, supaya layar berikutnya
      // (Team, Goals, profil) langsung menampilkan divisi yang benar tanpa reload.
      if (data?.success) {
        savedDepartment = data.department ?? picked;
        savedStatus = data.departmentStatus ?? savedStatus;
        updateUser({ department: savedDepartment ?? undefined, department_status: savedStatus });
      }
    } catch (e) {
      console.error("Failed to save onboarding department:", e);
    }
    // Sync state ke storage
    try {
      await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: { ...state, onboarded: true },
          user: { ...user, department: savedDepartment ?? undefined, department_status: savedStatus },
          userId: user.id
        }),
      });
    } catch (e) {
      console.error("Failed to sync onboarding status:", e);
    }
    // We don't open 'checkin' manually here anymore; the 800ms useEffect for DailyGreetingModal will handle the morning mood validation.
  };

  // ── Onboarding ──
  // Jika state belum terbaca (null) atau user belum onboarded, tahan dulu di onboarding.
  // Ini mencegah main app flash sebentar sebelum OnboardingScreen muncul.
  if (!state || (!state.onboarded && user.role === 'employee')) {
    return (
      <OnboardingScreen
        userName={user.name}
        onFinish={handleOnboardingFinish}
        skipSplash
      />
    );
  }

  // ── Determine Role ────────────────────────────────────────────────────────
  /*
   * Peran dibaca langsung dari akun, tidak lagi dari `userRole`.
   *
   * `userRole` dulu menyimpan state switcher HR, dan itu ikut tersimpan ke kolom
   * `user_role_context` lewat sync — sekali seorang employee menekan tombolnya,
   * dia tetap terkunci di konsol HR pada login-login berikutnya. Akses HR
   * sekarang berupa tab tambahan, jadi tidak ada peran yang perlu ditukar dan
   * kolom itu berhenti dipakai sebagai state UI.
   */
  const currentRole = (user?.role || 'employee') as UserRole;
  const isManager = currentRole === 'manager';
  const isHR = currentRole === 'hr';
  // Employee/manager yang dititipi akses HR-Admin. Akun ber-role hr sudah
  // seluruhnya konsol, jadi tidak perlu tab tambahan.
  const hasHrConsole = !!user?.hrAccess && currentRole !== 'hr';
  // ── Render screen by role + tab ─────────────────────────────────────────────
  const renderScreen = () => {
    // Calendar tab is shared across all roles
    if (tab === 'calendar') return <CalendarScreen openModal={openModal} />;
    // Chat tab is shared across all roles
    if (tab === 'chat') return <ChatScreen openModal={openModal} />;
    if (tab === 'team') return <TeamScreen openModal={openModal} />;
    // Konsol HR sebagai tab tambahan, bukan pengganti nav peran aslinya.
    if (tab === 'hr_console' && hasHrConsole) return <HRPeopleScreen openModal={openModal} />;


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
      if (tab === 'my_kpi')    return <GoalsScreen openModal={openModal} />;
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
    
    let newX = dragRef.current.initialX + dx;
    let newY = dragRef.current.initialY + dy;

    // Boundary constraints
    const maxRight = window.innerWidth - 60;
    const maxBottom = window.innerHeight - 80;
    
    newX = Math.max(24 - maxRight, Math.min(newX, 8));
    newY = Math.max(106 - maxBottom, Math.min(newY, 26));

    setCoachPos({
      x: newX,
      y: newY,
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
      <TabNav tab={tab} setTab={setTab} userRole={currentRole} hrAccess={hasHrConsole} />

      {/* Main content */}
      <div className="hp-app-content">
        {/* App bar. Sticky rather than absolute so it stays reachable while
            scrolling, and so screens no longer need to reserve space under it. */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          // `flex-end` left this bar as ~60px of blank paper with a cluster of
          // pills pushed against the right edge — the first thing you saw on
          // every screen was an unbalanced empty strip. The wordmark anchors the
          // left, so the bar reads as chrome instead of as unfinished layout.
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '10px 16px',
          // Kept in step with --hp-appbar-h, which the dashboard rail offsets
          // from so it pins below this bar instead of behind it.
          minHeight: 'var(--hp-appbar-h)',
          // Solid, not translucent-with-blur. At 82% opacity the content
          // scrolling underneath showed through as a smeared band across the
          // top of every screen — the bar read as a smudge rather than as
          // chrome. A flat surface plus a hairline is both cleaner and cheaper.
          background: HP_TOKENS.paper,
          borderBottom: `1px solid ${HP_TOKENS.line}`,
          flexWrap: 'wrap',
        }}>
          {/* Wordmark. Deliberately quiet — one weight step and one accent
              word, no logo lockup, so it holds the left edge without competing
              with the screen title underneath it. Mobile only: on desktop the
              sidebar already shows the brand lockup, and two Flowbuddys in the
              same corner read as a layout bug (see .hp-appbar-brand). */}
          <div className="hp-appbar-brand" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            minWidth: 0, marginRight: 'auto',
          }}>
            <HPGlyph name="bee" size={19} color={HP_TOKENS.primaryInk} />
            <span className="hp-wordmark-label" style={{
              fontFamily: 'var(--hp-font-display)',
              fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em',
              color: HP_TOKENS.ink, whiteSpace: 'nowrap',
            }}>
              Flow<span style={{ color: HP_TOKENS.primaryInk }}>buddy</span>
            </span>
          </div>

          <InstallButton />

          {/* Logbook lives in the app bar, not in a screen, because it is the
              one thing that must be reachable no matter what: any role, any
              tab, clocked in or not, and especially on a day someone forgot to
              clock out. Buried at the bottom of the Home rail it was neither
              findable nor reachable. */}
          <button
            onClick={() => openModal('logbook')}
            className="hp-tap"
            title="Riwayat & Logbook"
            aria-label="Riwayat & Logbook"
            style={headerIconBtn}
          >
            <HPGlyph name="book" size={18} stroke={2} color="currentColor" />
          </button>

          <button
            onClick={() => openModal('notifications')}
            className="hp-tap"
            title="Notifikasi"
            aria-label={
              state?.notifications
                ? `Notifikasi, ${state.notifications} belum dibaca`
                : "Notifikasi"
            }
            style={headerIconBtn}
          >
            <HPGlyph name="bell" size={18} stroke={2} color="currentColor" />
            {state?.notifications && state.notifications > 0 ? (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: -1,
                  right: -1,
                  background: HP_TOKENS.danger,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 650,
                  fontVariantNumeric: "tabular-nums",
                  borderRadius: 999,
                  minWidth: 17,
                  height: 17,
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px solid ${HP_TOKENS.paper}`,
                }}
              >
                {state.notifications}
              </span>
            ) : null}
          </button>

          {/* Tidak ada lagi switcher peran di sini: konsol HR punya tabnya
              sendiri di nav, sehingga tidak ada mode yang perlu ditukar. */}

          <div
            style={{
              ...headerPill,
              background: meta.bg,
              color: meta.color,
            }}
          >
            <HPGlyph name={meta.glyph} size={13} color="currentColor" />
            <span>{meta.label}</span>
          </div>

          <button
            onClick={() => openModal('confirm_logout')}
            className="hp-tap"
            style={{
              ...headerPill,
              background: 'transparent',
              border: `1px solid ${HP_TOKENS.border}`,
              color: HP_TOKENS.inkMute,
            }}
            title="Keluar (Logout)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
            aria-label="Buka AI Coach"
            style={{
              position: 'fixed',
              right: 20 - coachPos.x,
              // Clears the bottom tab bar plus the device gesture area.
              bottom: `calc(84px + env(safe-area-inset-bottom) - ${coachPos.y}px)`,
              zIndex: 100,
              width: 54, height: 54, borderRadius: '50%',
              background: HP_TOKENS.primary,
              color: HP_TOKENS.onPrimary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isDragging ? 'grabbing' : 'pointer',
              touchAction: 'none',
              boxShadow: HP_TOKENS.shadowMd,
              transition: 'transform 120ms var(--hp-ease)',
              transform: isDragging ? 'scale(1.04)' : 'scale(1)',
            }}
          >
            <HPGlyph name="sparkle" size={24} color="currentColor" />
        </button>
      </div>

      {/* Sesi fokus tidak boleh bergantung pada modalnya tetap terbuka: penjaga
          ini yang meneruskan detak jantung (dan menawarkan jalan kembali) saat
          layar fokus disembunyikan. */}
      <FocusSessionKeeper
        suspended={modal?.name === 'focus'}
        onOpen={(roomId) => openModal('focus', { roomId })}
      />

      {/* Modal Renderer */}
      {modal?.name === 'checkin'          && <CheckInModal onClose={closeModal} />}
      {modal?.name === 'focus'            && <FocusModal onClose={closeModal} {...(modal.props || {})} />}
      {modal?.name === 'overtime_prompt'  && <OvertimePromptModal onClose={closeModal} />}

      {modal?.name === 'pause'            && <PauseModal onClose={closeModal} />}
      {modal?.name === 'reflect'          && <ReflectModal onClose={closeModal} />}
      {modal?.name === 'coach'            && <CoachModal onClose={closeModal} />}
      {modal?.name === 'notifications'    && <NotificationsModal onClose={closeModal} openModal={openModal} />}

      {modal?.name === 'work_checkin'     && <WorkCheckInModal onClose={closeModal} openModal={openModal} {...modal.props} />}
      {modal?.name === 'reward_fulfillment' && <RewardFulfillmentModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'manage_priorities'&& <ManagePrioritiesModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'manage_habits'    && <ManageHabitsModal onClose={closeModal} />}
      {modal?.name === 'manage_learning'  && <ManageLearningModal onClose={closeModal} />}
      {modal?.name === 'schedule_coaching'&& <ScheduleCoachingModal onClose={closeModal} />}
      {modal?.name === 'learning_detail'  && <LearningDetailModal onClose={closeModal} />}
      {modal?.name === 'manage_programs'  && <ManageProgramsModal onClose={closeModal} />}
      {modal?.name === 'all_rewards'      && <AllRewardsModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'logbook'          && <LogbookModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'system_guide'     && <SystemGuideModal onClose={closeModal} />}
      {modal?.name === 'profile_editor'   && <ProfileEditorModal onClose={closeModal} />}
      {modal?.name === 'manage_surveys'   && <ManageSurveysModal onClose={closeModal} openModal={openModal} {...modal.props} />}
      {modal?.name === 'take_survey'      && <TakeSurveyModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'survey_results'   && <SurveyResultsModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'attendance_scanner' && <AttendanceScannerModal onClose={closeModal} />}
      {modal?.name === 'attendance_history' && <AttendanceHistoryModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'calendar'         && <CalendarModal onClose={closeModal} />}
      {modal?.name === 'manage_contacts' && <ManageContactsModal onClose={closeModal} />}
      {modal?.name === 'reward_editor'   && <RewardEditorModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'contact_editor'  && <ContactEditorModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'edit_user'       && <EditUserModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'create_user'     && <CreateUserModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'manage_depts'    && <DepartmentManagerModal onClose={closeModal} />}
      {modal?.name === 'member_logbook'  && <MemberLogbookModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'member_tasks'    && <MemberTaskModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'manage_kpi'      && <ManageKPIModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'personal_kpi'    && <PersonalKpiModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'kpi_review'      && <KpiReviewModal onClose={closeModal} />}
      {modal?.name === 'weekly_review'    && <WeeklyReviewModal onClose={closeModal} />}
      {modal?.name === 'monthly_report'   && <MonthlyReportModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'report_export'    && <ReportExportModal onClose={closeModal} />}
      {modal?.name === 'ai_weekly_summary' && <AIAuditModal onClose={closeModal} type="weekly" />}
      {modal?.name === 'ai_monthly_analysis' && <AIAuditModal onClose={closeModal} type="monthly" />}
      {modal?.name === 'employee_profile' && <EmployeeProfileModal onClose={closeModal} openModal={openModal} {...modal.props} />}
      {modal?.name === 'update_status'    && <StatusInputModal onClose={closeModal} />}
      {modal?.name === 'new_chat'          && <NewChatModal onClose={closeModal} defaultRecipientId={modal.props?.recipientId} onChannelCreated={(channelId: string) => {
        // Dispatch event so ChatScreen can pick it up
        window.dispatchEvent(new CustomEvent('chat_channel_created', { detail: { channelId } }));
        // Also call the prop-based callback if passed from ChatScreen
        modal.props?.onChannelCreated?.(channelId);
      }} />}
      {modal?.name === 'appreciate'       && <AppreciateModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'announcement'     && <AnnouncementModal onClose={closeModal} />}
      {modal?.name === 'manage_onboarding' && <ManageOnboardingModal onClose={closeModal} />}
      {modal?.name === 'senggol'          && <SenggolModal onClose={closeModal} {...modal.props} />}
      {modal?.name === 'mascot_guide'     && <MascotGuideModal onClose={closeModal} />}
      {modal?.name === 'extension_guide'  && <ExtensionGuideModal onClose={closeModal} />}
      {modal?.name === 'confirm_logout'   && <ConfirmLogoutModal onClose={closeModal} onConfirm={logout} />}

      {/* Daily Greeting Modal */}
      {showDailyGreeting && (
        <DailyGreetingModal
          userName={user?.name || 'Sobat'}
          streak={user?.streak || 0}
          level={user?.level || 1}
          onClose={() => setShowDailyGreeting(false)}
          onOpenCheckIn={() => openModal('checkin')}
        />
      )}

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
