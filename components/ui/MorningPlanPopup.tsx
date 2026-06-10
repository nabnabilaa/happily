"use client";

import React, { useEffect, useState } from "react";
import BeeMascot from "@/components/ui/BeeMascot";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";

interface MorningPlanPopupProps {
  planText: string | null;
  userId: string | undefined;
}

export default function MorningPlanPopup({ planText, userId }: MorningPlanPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkAndShow = () => {
      if (planText && userId) {
        const todayStr = new Date().toDateString();
        const lastSeen = localStorage.getItem(`lastSeenMorningPlan_${userId}`);
        if (lastSeen !== todayStr) {
          setVisible(true);
        } else {
          window.dispatchEvent(new CustomEvent('hp_scroll_to_clock_in'));
        }
      } else {
        window.dispatchEvent(new CustomEvent('hp_scroll_to_clock_in'));
      }
    };

    // Listen for manual trigger from previous steps
    window.addEventListener('hp_show_morning_plan', checkAndShow);

    // Also auto-check if Daily Greeting is already done for today
    import('@/components/modals/DailyGreetingModal').then(({ needsDailyGreeting }) => {
      if (!needsDailyGreeting()) {
        const timer = setTimeout(() => {
          checkAndShow();
        }, 1000);
        return () => clearTimeout(timer);
      }
    });

    return () => window.removeEventListener('hp_show_morning_plan', checkAndShow);
  }, [planText, userId]);

  const handleClose = () => {
    setVisible(false);
    if (userId) {
      localStorage.setItem(`lastSeenMorningPlan_${userId}`, new Date().toDateString());
    }
    // Lanjutkan scroll setelah di-close
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('hp_scroll_to_clock_in'));
    }, 100);
  };

  if (!visible || !planText) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99998,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '32px',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        position: 'relative',
        color: HP_TOKENS.ink,
        fontFamily: HP_FONT,
        border: `1.5px solid ${HP_TOKENS.line}`
      }}>
        {/* Glow behind the bee */}
        <div style={{
          position: 'absolute',
          top: -50, left: '50%', transform: 'translateX(-50%)',
          width: 140, height: 140,
          background: `${HP_TOKENS.yellowWash}80`,
          borderRadius: '50%',
          filter: 'blur(20px)',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1, marginTop: -70, marginBottom: 16 }}>
          <BeeMascot mood="excited" size={130} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ ...HP_TEXT.h, fontSize: '24px', marginBottom: 8 }}>
            Selamat Pagi! 🌅
          </div>
          <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, marginBottom: 20 }}>
            Ini adalah rencana yang sudah kamu buat kemarin untuk fokus hari ini:
          </div>

          <div style={{ 
            background: HP_TOKENS.card,
            padding: '20px',
            borderRadius: '16px',
            fontSize: '15px',
            fontWeight: 700,
            lineHeight: 1.5,
            border: `1.5px dashed ${HP_TOKENS.yellow}`,
            marginBottom: 24,
            textAlign: 'left',
            color: HP_TOKENS.ink,
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.02)'
          }}>
            "{planText}"
          </div>

          <button
            onClick={handleClose}
            className="hp-tap"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '100px',
              border: 'none',
              background: HP_TOKENS.primary,
              color: '#fff',
              fontFamily: HP_FONT,
              fontWeight: 900,
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: `0 8px 16px ${HP_TOKENS.primarySoft}`
            }}
          >
            Siap Laksanakan! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
