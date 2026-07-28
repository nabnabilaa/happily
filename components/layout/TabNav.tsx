"use client";

import React from "react";
import { HP_TOKENS, HP_FONT_DISPLAY } from "@/lib/constants";
import { UserRole } from "@/lib/HPContext";
import HPGlyph from "@/components/ui/HPGlyph";
import DownloadExtensionBtn from "@/components/pwa/DownloadExtensionBtn";
import FontSelector from "@/components/ui/FontSelector";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import { motion, useReducedMotion, SPRING } from "@/components/ui/motion";

interface TabNavProps {
  tab: string;
  setTab: (tab: string) => void;
  userRole?: UserRole | null;
}

interface TabItem {
  key: string;
  label: string;
  /** Bottom-bar label. Must fit ~50px, so one short word. */
  short: string;
  icon: string;
  /** Desktop-only supporting line. Describes the section, not a slogan. */
  hint: string;
}

/**
 * Navigation is neutral. Previously each tab carried its own colour, which
 * made the sidebar compete with page content and left no colour available to
 * mark the current location. Now only the active item is tinted.
 */
const TABS: Record<string, TabItem> = {
  home:      { key: "home",      label: "Dashboard",    short: "Home",    icon: "home",     hint: "Ringkasan hari ini" },
  calendar:  { key: "calendar",  label: "Kalender",     short: "Jadwal",  icon: "calendar", hint: "Jadwal & agenda" },
  goals:     { key: "goals",     label: "Target & KPI", short: "Target",  icon: "target",   hint: "Sasaran dan progres" },
  my_kpi:    { key: "my_kpi",    label: "KPI Saya",     short: "KPI",     icon: "target",   hint: "Target pribadi" },
  team_goals:{ key: "goals",     label: "Tim & Target", short: "Target",  icon: "target",   hint: "Sasaran tim" },
  people:    { key: "goals",     label: "People",       short: "People",  icon: "people",   hint: "Data karyawan" },
  team:      { key: "team",      label: "Tim",          short: "Tim",     icon: "people",   hint: "Rekan kerja" },
  recognize: { key: "recognize", label: "Rewards",      short: "Reward",  icon: "trophy",   hint: "Apresiasi & poin" },
  chat:      { key: "chat",      label: "Chat",         short: "Chat",    icon: "activity", hint: "Pesan & aktivitas" },
};

const TAB_CONFIG: Record<UserRole, TabItem[]> = {
  employee: [TABS.home, TABS.calendar, TABS.goals, TABS.team, TABS.recognize, TABS.chat],
  manager: [TABS.home, TABS.calendar, TABS.my_kpi, TABS.team_goals, TABS.team, TABS.recognize, TABS.chat],
  hr: [TABS.home, TABS.calendar, TABS.people, TABS.team, TABS.recognize, TABS.chat],
};

export default function TabNav({ tab, setTab, userRole }: TabNavProps) {
  const reduce = useReducedMotion();
  const roleKey = userRole && TAB_CONFIG[userRole] ? userRole : "employee";
  const tabs = TAB_CONFIG[roleKey];

  return (
    <nav className="hp-app-nav" aria-label="Navigasi utama">
      {/* Brand — desktop sidebar only */}
      <div className="hp-nav-brand">
        <div style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <img
            src="/maxy-logo.png"
            alt="Maxy Academy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transform: 'scale(1.6)', // Zoom in to cut out the transparent padding
              transformOrigin: 'center center',
            }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: HP_FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "-0.028em",
              lineHeight: 1.15,
              color: HP_TOKENS.ink,
            }}
          >
            Flowbuddy
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 550,
              color: HP_TOKENS.inkMute,
              lineHeight: 1.3,
            }}
          >
            by Maxy
          </div>
        </div>
      </div>


      {tabs.map((t) => {
        const active = tab === t.key;

        return (
          <button
            key={t.label}
            type="button"
            onClick={() => setTab(t.key)}
            className={`hp-nav-btn${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {/* Mobile: a thin rule marks the active tab, since the sidebar's
                tinted background isn't available in the bottom bar. */}
            {active && (
              <motion.span
                aria-hidden
                layoutId="nav-active"
                transition={reduce ? { duration: 0.01 } : SPRING}
                className="hp-desktop-hidden"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  translateX: "-50%",
                  width: 22,
                  height: 3,
                  borderRadius: "0 0 3px 3px",
                  background: HP_TOKENS.primary,
                }}
              />
            )}

            <span className="hp-nav-btn-icon">
              <HPGlyph
                name={t.icon}
                size={21}
                color="currentColor"
                stroke={active ? 2.3 : 1.9}
              />
            </span>

            <span style={{ minWidth: 0, overflow: "hidden" }}>
              <span className="hp-nav-btn-text hp-nav-label-full">{t.label}</span>
              <span className="hp-nav-btn-text hp-nav-label-short">{t.short}</span>
              <span className="hp-nav-btn-sub">{t.hint}</span>
            </span>
          </button>
        );
      })}

      {/* Sidebar footer — desktop only */}
      <div className="hp-mobile-hidden" style={{ flex: 1, minHeight: 16 }} />
      <div
        className="hp-mobile-hidden"
        style={{
          flexDirection: "column",
          gap: 10,
          padding: "12px 4px 0",
          borderTop: `1px solid ${HP_TOKENS.line}`,
          marginTop: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FontSelector />
          <ThemeSwitcher />
        </div>
        <DownloadExtensionBtn />
      </div>
    </nav>
  );
}
