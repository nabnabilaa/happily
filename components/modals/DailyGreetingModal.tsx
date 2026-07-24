"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_FONT, HP_FONT_DISPLAY, HP_MOODS } from "@/lib/constants";
import BeeMascot from "@/components/ui/BeeMascot";
import HPGlyph from "@/components/ui/HPGlyph";
import { useHP } from "@/lib/HPContext";

interface DailyGreetingModalProps {
  userName: string;
  streak: number;
  level: number;
  onClose: () => void;
  onOpenCheckIn?: () => void;
}

// ── Time-based greeting ────────────────────────────────────────────────────
function getGreeting(): { intro: string; buddyMood: string } {
  const hour = new Date().getHours();
  if (hour < 5) return { intro: 'Wah, masih bangun jam segini? Jangan lupa istirahat ya 🌙', buddyMood: 'sleepy' };
  if (hour < 11) return { intro: 'Selamat pagi! Yuk mulai hari ini dengan semangat ceria ☀️', buddyMood: 'happy' };
  if (hour < 15) return { intro: 'Selamat siang! Udah makan siang belum? Tetap fokus ya 🎯', buddyMood: 'happy' };
  if (hour < 18) return { intro: 'Selamat sore! Udah mau selesai nih, semangat sisa-sisa tenaga 🌤️', buddyMood: 'happy' };
  return { intro: 'Selamat malam! Waktunya bersantai setelah seharian beraktivitas 🌃', buddyMood: 'sleepy' };
}

// ── Motivational quotes pool ───────────────────────────────────────────────
const QUOTES = [
  "Satu langkah kecil hari ini jauh lebih baik daripada rencana besar yang cuma di awang-awang. Yuk gas!",
  "Gak perlu sempurna, yang penting mulai aja dulu. Nanti juga bakal nemu ritmenya kok.",
  "Kalau lagi capek, istirahat ya, bukan berhenti. Kamu udah hebat banget sejauh ini!",
  "Fokus ke satu hal dulu, selesain pelan-pelan. Kamu pasti bisa!",
  "Ingat, produktif itu bukan berarti sibuk terus, tapi tahu kapan harus kerja dan kapan harus rehat.",
  "Hari ini mungkin berat, tapi kamu lebih kuat dari yang kamu bayangkan. Semangat!",
  "Yuk rayakan hal-hal kecil yang berhasil kamu capai hari ini. Good job!",
  "Jangan lupa senyum! Hari ini adalah kesempatan baru buat bikin hal-hal keren."
];

export default function DailyGreetingModal({ userName, streak, level, onClose, onOpenCheckIn }: DailyGreetingModalProps) {
  const { updateState } = useHP();
  const [phase, setPhase] = useState<'greet' | 'closing'>('greet');
  const greeting = getGreeting();

  // Bersihkan nama dari "(Emp)" dsb
  const cleanName = userName.replace(/\s*\(.*\)\s*/g, '').trim() || 'Sobat';

  // Auto-close after 12s if user doesn't interact
  useEffect(() => {
    const timer = setTimeout(() => handleClose(), 12000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setPhase('closing');
    setTimeout(() => {
      onClose();
      window.dispatchEvent(new CustomEvent('hp_show_morning_plan'));
    }, 350);
  };

  const handleCheckIn = () => {
    setPhase('closing');
    setTimeout(() => {
      onClose();
      onOpenCheckIn?.();
    }, 350);
  };

  const randomQuote = React.useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(26,26,46,0.45)', // standard modal overlay
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: phase === 'closing' ? 'dgFadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'hpFadeIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      onClick={handleClose}
    >
      <style>{`
        @keyframes dgCardIn {
          0%   { transform: translateY(40px) scale(0.9) rotateX(10deg); opacity: 0; }
          100% { transform: translateY(0) scale(1) rotateX(0deg); opacity: 1; }
        }
        @keyframes dgCardOut {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(30px) scale(0.95); opacity: 0; }
        }
        @keyframes dgFadeOut {
          from { opacity: 1; backdrop-filter: blur(12px); }
          to   { opacity: 0; backdrop-filter: blur(0px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.8; transform: translateX(-50%) scale(1.1); }
        }
        .hp-tap-btn {
          transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .hp-tap-btn:active {
          transform: scale(0.95);
        }
        .hp-tap-btn:hover {
          filter: brightness(1.1);
        }
        .dg-gradient-text {
          background: #60A5FA;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          borderRadius: 24,
          background: 'var(--hp-card)',
          boxShadow: '0 8px 32px rgba(29,53,87,0.12)',
          border: '1px solid var(--hp-border)',
          position: 'relative',
          padding: '40px 20px 24px',
          animation: phase === 'closing'
            ? 'dgCardOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            : 'dgCardIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Glow Effects behind the mascot */}
        <div style={{
          position: 'absolute', top: '-15%', left: '50%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(59, 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
          animation: 'glowPulse 4s ease-in-out infinite'
        }} />
        
        {/* ── Peeking Buddy Mascot ────────────────────────────────────────── */}
        <div style={{ 
          position: 'absolute', top: -45, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))'
        }}>
          <div style={{ animation: 'hpFloat 3.5s ease-in-out infinite' }}>
            <BeeMascot mood={greeting.buddyMood as any} size={85} animated />
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          
          <h2 style={{
            fontFamily: HP_FONT_DISPLAY, fontSize: 24, fontWeight: 800,
            lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.02em',
            color: 'var(--hp-ink)'
          }}>
            Hai, {cleanName}!
          </h2>
          <p style={{
            fontSize: 15, color: 'var(--hp-ink-soft)', fontWeight: 600,
            marginBottom: 16, lineHeight: 1.5
          }}>
            {greeting.intro}
          </p>
          <div style={{
            background: 'rgba(255,190,11,0.1)', padding: '16px', borderRadius: 16,
            marginBottom: 24, border: '1px dashed rgba(255,190,11,0.4)'
          }}>
            <p style={{
              fontSize: 14, color: 'var(--hp-ink)', fontStyle: 'italic',
              lineHeight: 1.5
            }}>
              "{randomQuote}"
            </p>
          </div>

          {/* ── Buttons ───────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleCheckIn}
              className="hp-tap-btn"
              style={{
                width: '100%', padding: '14px', borderRadius: 16, border: 'none',
                background: '#3B82F6', color: '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
              }}
            >
              Lanjut Check-in
            </button>
            <button
              onClick={handleClose}
              className="hp-tap-btn"
              style={{
                width: '100%', padding: '12px', borderRadius: 16,
                border: '1px solid var(--hp-line)',
                background: 'transparent', color: 'var(--hp-ink-fade)',
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Nanti Saja
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Helper: check if user needs daily greeting ─────────────────────────────
const GREETING_KEY = "hp_last_daily_greeting";

export function needsDailyGreeting(): boolean {
  if (typeof window === "undefined") return false;
  const last = localStorage.getItem(GREETING_KEY);
  if (!last) return true;
  const today = new Date().toDateString();
  return last !== today;
}

export function markDailyGreeted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GREETING_KEY, new Date().toDateString());
}
