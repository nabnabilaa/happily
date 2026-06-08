'use client';

import React, { useState, useEffect } from 'react';
import { HP_TOKENS, HP_FONT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';

export default function NotificationBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    // Only show if permission is default (not allowed and not blocked yet)
    if (Notification.permission === 'default') {
      setShowBanner(true);
    }
  }, []);

  const handleEnable = async () => {
    if (typeof window === 'undefined') return;

    try {
      // Request permission natively (triggered by user click gesture, so browser WILL allow it!)
      const permission = await Notification.requestPermission();
      console.log("Notification permission response:", permission);
      
      if (permission === 'granted') {
        // Dispatch custom event to trigger Service Worker subscription
        window.dispatchEvent(new Event('hp_trigger_push_subscribe'));
      }
      
      setShowBanner(false);
    } catch (e) {
      console.error("Failed to request notification permission:", e);
    }
  };

  if (!showBanner) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        padding: '14px 20px',
        borderRadius: 18,
        background: 'var(--hp-yellow-wash)',
        border: `1.5px solid var(--hp-yellow-soft)`,
        boxShadow: '0 4px 15px rgba(253, 185, 19, 0.05)',
        fontFamily: HP_FONT,
        marginBottom: 16,
        animation: 'hpFadeIn 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'var(--hp-yellow-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <HPGlyph name="bell" size={20} color="var(--hp-yellow)" stroke={2.5} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: HP_TOKENS.ink }}>
            Aktifkan Notifikasi Perangkat?
          </div>
          <div style={{ fontSize: 13, color: HP_TOKENS.inkSoft, marginTop: 2, fontWeight: 500 }}>
            Dapatkan pengingat check-in harian, alert burnout, dan pesan asisten tim secara langsung.
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleEnable}
          className="hp-tap"
          style={{
            padding: '8px 16px',
            borderRadius: 99,
            border: 'none',
            background: 'var(--hp-yellow)',
            color: '#F4F7F9',
            fontFamily: HP_FONT,
            fontWeight: 800,
            fontSize: 12,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(253, 185, 19, 0.25)',
          }}
        >
          Aktifkan
        </button>
      </div>
    </div>
  );
}
