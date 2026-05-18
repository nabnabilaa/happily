"use client";

import React from "react";
import { HP_TOKENS, HP_FONT } from "@/lib/constants";
import { UserRole } from "@/lib/HPContext";
import HPGlyph from "@/components/ui/HPGlyph";
import BeeMascot from "@/components/ui/BeeMascot";

interface TabNavProps {
  tab: string;
  setTab: (tab: string) => void;
  userRole?: UserRole | null;
}

const TAB_CONFIG: Record<UserRole, Array<{ key: string; label: string; icon: string }>> = {
  employee: [
    { key: 'home',      label: 'Home',       icon: 'home' },
    { key: 'calendar',  label: 'Calendar',   icon: 'calendar' },
    { key: 'goals',     label: 'Goals',      icon: 'target' },
    { key: 'recognize', label: 'Rewards',    icon: 'trophy' },
    { key: 'chat',      label: 'Chat',       icon: 'activity' },
    { key: 'notes',     label: 'Catatan',    icon: 'book' },
  ],
  manager: [
    { key: 'home',      label: 'Dashboard',  icon: 'home' },
    { key: 'calendar',  label: 'Calendar',   icon: 'calendar' },
    { key: 'goals',     label: 'Tim & KPI',  icon: 'target' },
    { key: 'recognize', label: 'Rewards',    icon: 'trophy' },
    { key: 'chat',      label: 'Chat',       icon: 'activity' },
    { key: 'notes',     label: 'Catatan',    icon: 'book' },
  ],
  hr: [
    { key: 'home',      label: 'Dashboard',  icon: 'home' },
    { key: 'calendar',  label: 'Calendar',   icon: 'calendar' },
    { key: 'goals',     label: 'People',     icon: 'people' },
    { key: 'recognize', label: 'Rewards',    icon: 'trophy' },
    { key: 'chat',      label: 'Chat',       icon: 'activity' },
    { key: 'notes',     label: 'Catatan',    icon: 'book' },
  ],
};

export default function TabNav({ tab, setTab, userRole }: TabNavProps) {
  const tabs = TAB_CONFIG[userRole ?? 'employee'];

  return (
    <div className="hp-app-nav">
      {/* Desktop Brand Logo */}
      <div className="hp-nav-brand">
        <BeeMascot mood="happy" size={32} />
        <div style={{ fontWeight: 900, fontSize: 20, color: HP_TOKENS.ink, fontFamily: HP_FONT }}>Flowbee</div>
      </div>

      {tabs.map(t => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="hp-nav-btn hp-tap"
            style={{
              color: active ? HP_TOKENS.yellow : HP_TOKENS.inkMute,
              background: active ? HP_TOKENS.yellowSoft : 'transparent',
            }}
          >
            <div className="hp-nav-btn-icon">
              <HPGlyph
                name={t.icon}
                size={22}
                color={active ? HP_TOKENS.yellow : HP_TOKENS.inkMute}
                stroke={active ? 2.5 : 2}
              />
            </div>
            <div className="hp-nav-btn-text" style={{ opacity: active ? 1 : 0.7 }}>
              {t.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
