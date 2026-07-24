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

const TAB_COLORS: Record<string, string> = {
  home: '#3B82F6', // Blue
  calendar: '#8B5CF6', // Purple
  goals: '#F97316', // Orange
  my_kpi: '#F97316', 
  team: '#10B981', // Green
  recognize: '#F59E0B', // Yellow
  chat: '#EF4444' // Red
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
          background: HP_TOKENS.primarySoft,
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
        const baseColor = TAB_COLORS[t.key] || HP_TOKENS.primary;
        return (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`hp-nav-btn hp-tap${active ? ' active' : ''}`}
            style={{
              color: active ? '#FFFFFF' : baseColor,
              background: active ? baseColor : `${baseColor}15`,
              borderRadius: 16,
              marginBottom: 8,
              border: active ? '1px solid transparent' : `1px solid ${baseColor}30`,
              boxShadow: active ? `0 6px 16px ${baseColor}35` : 'none',
              padding: '12px 18px',
              transition: 'all 0.2s cubic-bezier(0.34, 1.2, 0.64, 1)'
            }}
          >
            <div className="hp-nav-btn-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HPGlyph
                name={t.icon}
                size={22}
                color={active ? '#FFFFFF' : baseColor}
                stroke={active ? 2.5 : 2.5}
              />
            </div>
            <div className="hp-nav-btn-text" style={{ opacity: 1, fontWeight: active ? 800 : 700 }}>
              {t.label}
            </div>
          </button>
        );
      })}

      <div className="hp-mobile-hidden" style={{ flex: 1, minHeight: 12 }} />
      <div className="hp-mobile-hidden" style={{ padding: '12px 0 8px 0', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8, position: 'relative' }}>
          <FontSelector />
          <ThemeSwitcher />
        </div>
        <DownloadExtensionBtn />
      </div>
    </div>
  );
}
