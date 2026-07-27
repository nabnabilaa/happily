"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_FONT_DISPLAY } from "@/lib/constants";
import { UserRole } from "@/lib/HPContext";
import HPGlyph from "@/components/ui/HPGlyph";
import BeeMascot from "@/components/ui/BeeMascot";
import DownloadExtensionBtn from "@/components/pwa/DownloadExtensionBtn";
import FontSelector from "@/components/ui/FontSelector";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";

interface TabNavProps {
  tab: string;
  setTab: (tab: string) => void;
  userRole?: UserRole | null;
}

interface CategoryMeta {
  color: string;
  bg: string;
  copy: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  home: {
    color: "#2563EB", // Blue (Energy)
    bg: "#EFF6FF",
    copy: "Check energy & focus",
  },
  calendar: {
    color: "#7C3AED", // Purple (Sleep)
    bg: "#F5F3FF",
    copy: "Track sleep & schedule",
  },
  goals: {
    color: "#EA580C", // Orange (Food / Target)
    bg: "#FFF7ED",
    copy: "Ready to log targets?",
  },
  my_kpi: {
    color: "#EA580C", // Orange (Target / KPI)
    bg: "#FFF7ED",
    copy: "Track personal KPI",
  },
  team: {
    color: "#9333EA", // Violet (Heart / Team)
    bg: "#FDF4FF",
    copy: "Connect with team",
  },
  recognize: {
    color: "#DB2777", // Pink (Cycle / Rewards)
    bg: "#FDF2F8",
    copy: "Treat yourself today",
  },
  chat: {
    color: "#0F172A", // Dark Slate (Activity / Chat)
    bg: "#F8FAFC",
    copy: "Catch up on activity",
  },
};

const TAB_CONFIG: Record<UserRole, Array<{ key: string; label: string; icon: string }>> = {
  employee: [
    { key: "home",      label: "Dashboard",   icon: "home" },
    { key: "calendar",  label: "Calendar",    icon: "calendar" },
    { key: "goals",     label: "Target & KPI", icon: "target" },
    { key: "team",      label: "Tim",         icon: "people" },
    { key: "recognize", label: "Rewards",     icon: "trophy" },
    { key: "chat",      label: "Chat",        icon: "activity" },
  ],
  manager: [
    { key: "home",      label: "Dashboard",   icon: "home" },
    { key: "calendar",  label: "Calendar",    icon: "calendar" },
    { key: "my_kpi",    label: "KPI Saya",    icon: "target" },
    { key: "goals",     label: "Tim & Target", icon: "target" },
    { key: "team",      label: "Tim",         icon: "people" },
    { key: "recognize", label: "Rewards",     icon: "trophy" },
    { key: "chat",      label: "Chat",        icon: "activity" },
  ],
  hr: [
    { key: "home",      label: "Dashboard",   icon: "home" },
    { key: "calendar",  label: "Calendar",    icon: "calendar" },
    { key: "goals",     label: "People",      icon: "people" },
    { key: "team",      label: "Tim",         icon: "people" },
    { key: "recognize", label: "Rewards",     icon: "trophy" },
    { key: "chat",      label: "Chat",        icon: "activity" },
  ],
};

export default function TabNav({ tab, setTab, userRole }: TabNavProps) {
  const roleKey = userRole && TAB_CONFIG[userRole] ? userRole : "employee";
  const tabs = TAB_CONFIG[roleKey];

  return (
    <nav className="hp-app-nav">
      {/* Desktop Brand Logo */}
      <div className="hp-nav-brand">
        <div
          style={{
            position: "relative",
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 4px 16px rgba(59, 130, 246, 0.12)`,
            flexShrink: 0,
            border: "1px solid rgba(59, 130, 246, 0.18)",
          }}
        >
          <BeeMascot mood="happy" size={34} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div
            style={{
              fontFamily: HP_FONT_DISPLAY,
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: -0.5,
              display: "flex",
              alignItems: "center",
              lineHeight: 1.1,
            }}
          >
            <span style={{ color: "#0F172A" }}>Flow</span>
            <span style={{ color: "#2563EB" }}>buddy</span>
          </div>
          <div
            style={{
              fontFamily: HP_FONT,
              fontSize: 10,
              fontWeight: 700,
              color: HP_TOKENS.inkMute,
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 2,
            }}
          >
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#64748B",
                fontWeight: 800,
              }}
            >
              by Maxy
            </span>
            <HPGlyph name="sparkle" size={10} color="#F59E0B" />
          </div>
        </div>
      </div>

      {tabs.map((t) => {
        const active = tab === t.key;
        const meta = CATEGORY_META[t.key] || CATEGORY_META.home;

        return (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`hp-nav-btn hp-tap${active ? " active" : ""}`}
          >
            {/* Icon */}
            <div
              className="hp-nav-btn-icon"
              style={{
                background: active ? "rgba(255, 255, 255, 0.2)" : meta.bg,
              }}
            >
              <HPGlyph
                name={t.icon}
                size={18}
                color={active ? "#FFFFFF" : meta.color}
                stroke={2.2}
              />
            </div>

            {/* Title + Conversational Subtext */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1, overflow: "hidden", minWidth: 0 }}>
              <div className="hp-nav-btn-text">
                {t.label}
              </div>
              <div
                className="hp-nav-subtext"
                style={{
                  color: active ? "#DBEAFE" : "#64748B",
                }}
              >
                {meta.copy}
              </div>
            </div>

            {/* Sleek category dot indicator (Desktop) */}
            {!active && (
              <span
                className="hp-mobile-hidden"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: meta.color,
                  opacity: 0.8,
                  flexShrink: 0,
                  marginLeft: "auto",
                }}
              />
            )}
          </button>
        );
      })}

      <div className="hp-mobile-hidden" style={{ flex: 1, minHeight: 12 }} />
      <div
        className="hp-mobile-hidden"
        style={{
          padding: "12px 0 8px 0",
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            gap: 8,
            position: "relative",
          }}
        >
          <FontSelector />
          <ThemeSwitcher />
        </div>
        <DownloadExtensionBtn />
      </div>
    </nav>
  );
}



