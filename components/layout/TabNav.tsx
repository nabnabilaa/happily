"use client";

import React from "react";
import { HP_TOKENS, HP_FONT, HP_FONT_DISPLAY } from "@/lib/constants";
import { UserRole } from "@/lib/HPContext";
import HPGlyph from "@/components/ui/HPGlyph";
import BeeMascot from "@/components/ui/BeeMascot";
import DownloadExtensionBtn from "@/components/pwa/DownloadExtensionBtn";

interface TabNavProps {
  tab: string;
  setTab: (tab: string) => void;
  userRole?: UserRole | null;
}

const TAB_CONFIG: Record<UserRole, Array<{ key: string; label: string; icon: string }>> = {
  employee: [
    { key: 'home',      label: 'Home',       icon: 'home' },
    { key: 'calendar',  label: 'Calendar',   icon: 'calendar' },
    { key: 'goals',     label: 'Target / KPI', icon: 'target' },
    { key: 'team',      label: 'Tim',        icon: 'people' },
    { key: 'recognize', label: 'Rewards',    icon: 'trophy' },
    { key: 'chat',      label: 'Chat',       icon: 'activity' },
  ],
  manager: [
    { key: 'home',      label: 'Dashboard',  icon: 'home' },
    { key: 'calendar',  label: 'Calendar',   icon: 'calendar' },
    { key: 'my_kpi',    label: 'KPI Saya',   icon: 'target' },
    { key: 'goals',     label: 'Tim & Target/KPI', icon: 'target' },
    { key: 'team',      label: 'Tim',        icon: 'people' },
    { key: 'recognize', label: 'Rewards',    icon: 'trophy' },
    { key: 'chat',      label: 'Chat',       icon: 'activity' },
  ],
  // HR = konsol admin/pengawas bersih (tanpa KPI Saya / fitur personal karyawan).
  hr: [
    { key: 'home',      label: 'Dashboard',  icon: 'home' },
    { key: 'calendar',  label: 'Calendar',   icon: 'calendar' },
    { key: 'goals',     label: 'People',     icon: 'people' },
    { key: 'team',      label: 'Tim',        icon: 'people' },
    { key: 'recognize', label: 'Rewards',    icon: 'trophy' },
    { key: 'chat',      label: 'Chat',       icon: 'activity' },
  ],
};

export default function TabNav({ tab, setTab, userRole }: TabNavProps) {
  const tabs = TAB_CONFIG[userRole ?? 'employee'];

  return (
    <div className="hp-app-nav">
      {/* Desktop Brand Logo */}
      <div className="hp-nav-brand">
        <div style={{ 
          position: 'relative', 
          width: 46, height: 46, 
          borderRadius: 14, 
          background: `linear-gradient(135deg, ${HP_TOKENS.primaryWash}, ${HP_TOKENS.primarySoft})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 16px rgba(59, 130, 246, 0.15)`,
          flexShrink: 0
        }}>
          <BeeMascot mood="happy" size={36} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ 
            fontFamily: HP_FONT_DISPLAY, 
            fontWeight: 900, 
            fontSize: 24, 
            letterSpacing: -0.5,
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1.1
          }}>
            <span style={{ color: HP_TOKENS.ink }}>Flow</span>
            <span style={{ color: HP_TOKENS.primary }}>buddy</span>
          </div>
          <div style={{ 
            fontFamily: HP_FONT, 
            fontSize: 11, 
            fontWeight: 700, 
            color: HP_TOKENS.inkMute,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 2
          }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: HP_TOKENS.inkFade }}>by Maxy</span>
            <HPGlyph name="sparkle" size={10} color={HP_TOKENS.yellow} />
          </div>
        </div>
      </div>

      {tabs.map(t => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`hp-nav-btn hp-tap${active ? ' active' : ''}`}
            style={{
              color: active ? HP_TOKENS.primary : HP_TOKENS.inkMute,
              background: active ? HP_TOKENS.primarySoft : 'transparent',
            }}
          >
            <div className="hp-nav-btn-icon">
              <HPGlyph
                name={t.icon}
                size={22}
                color={active ? HP_TOKENS.primary : HP_TOKENS.inkMute}
                stroke={active ? 2.5 : 2}
              />
            </div>
            <div className="hp-nav-btn-text" style={{ opacity: active ? 1 : 0.7 }}>
              {t.label}
            </div>
          </button>
        );
      })}

      <div className="hp-mobile-hidden" style={{ flex: 1 }} />
      <div className="hp-mobile-hidden" style={{ padding: '0 12px 16px 12px', width: '100%', boxSizing: 'border-box' }}>
        <DownloadExtensionBtn />
      </div>
    </div>
  );
}
