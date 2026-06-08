"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_FONT, HP_FONT_DISPLAY } from "@/lib/constants";
import BeeMascot from "@/components/ui/BeeMascot";

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
  const [phase, setPhase] = useState<'greet' | 'closing'>('greet');
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
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
    setTimeout(onClose, 350);
  };

  const handleCheckIn = () => {
    setPhase('closing');
    setTimeout(() => {
      onClose();
      onOpenCheckIn?.();
    }, 350);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(5, 5, 10, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
          background: linear-gradient(135deg, #FFBE0B 0%, #FF6B35 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          borderRadius: 32,
          background: 'linear-gradient(145deg, rgba(35, 35, 55, 0.9) 0%, rgba(20, 20, 35, 0.95) 100%)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 20px rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
          padding: '48px 24px 32px',
          animation: phase === 'closing'
            ? 'dgCardOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            : 'dgCardIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Glow Effects behind the card */}
        <div style={{
          position: 'absolute', top: '-20%', left: '50%',
          width: 250, height: 250, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,53,0.25) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
          animation: 'glowPulse 4s ease-in-out infinite'
        }} />
        
        {/* ── Peeking Buddy Mascot ────────────────────────────────────────── */}
        <div style={{ 
          position: 'absolute', top: -55, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))'
        }}>
          <div style={{ animation: 'hpFloat 3.5s ease-in-out infinite' }}>
            <BeeMascot mood={greeting.buddyMood as any} size={100} animated />
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          
          <h2 className="dg-gradient-text" style={{
            fontFamily: HP_FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.02em'
          }}>
            Hai, {cleanName}!
          </h2>
          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: 500,
            marginBottom: 24, lineHeight: 1.5
          }}>
            {greeting.intro}
          </p>

          {/* ── Quote Box ─────────────────────────────────────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 20,
            padding: '16px 20px', marginBottom: 28,
            border: '1px solid rgba(255,255,255,0.06)',
            borderLeft: '4px solid #FFBE0B',
            textAlign: 'left',
            position: 'relative'
          }}>
            <span style={{ 
              position: 'absolute', top: -12, left: 16, fontSize: 24, 
              color: '#FFBE0B', opacity: 0.8, fontFamily: 'serif', fontWeight: 900,
              background: 'linear-gradient(145deg, rgba(35, 35, 55, 1) 0%, rgba(20, 20, 35, 1) 100%)',
              padding: '0 4px', lineHeight: 1
            }}>
              "
            </span>
            <p style={{ 
              fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)', 
              lineHeight: 1.6, margin: 0, fontStyle: 'italic'
            }}>
              {quote}
            </p>
          </div>

          {/* ── Stats Row ─────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 12, marginBottom: 32,
          }}>
            {/* Streak */}
            <div style={{
              flex: 1, padding: '14px 12px', borderRadius: 20,
              background: 'linear-gradient(145deg, rgba(255,107,53,0.1) 0%, rgba(255,107,53,0.02) 100%)',
              border: '1px solid rgba(255,107,53,0.2)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
              <div style={{ fontSize: 22, marginBottom: 6, filter: 'drop-shadow(0 2px 4px rgba(255,107,53,0.4))' }}>🔥</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: HP_FONT_DISPLAY, lineHeight: 1 }}>
                {streak}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                Streak
              </div>
            </div>

            {/* Level */}
            <div style={{
              flex: 1, padding: '14px 12px', borderRadius: 20,
              background: 'linear-gradient(145deg, rgba(46,196,182,0.1) 0%, rgba(46,196,182,0.02) 100%)',
              border: '1px solid rgba(46,196,182,0.2)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
              <div style={{ fontSize: 22, marginBottom: 6, filter: 'drop-shadow(0 2px 4px rgba(46,196,182,0.4))' }}>⭐</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: HP_FONT_DISPLAY, lineHeight: 1 }}>
                Lv.{level}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                Level
              </div>
            </div>
          </div>

          {/* ── Buttons ───────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={handleCheckIn}
              className="hp-tap-btn"
              style={{
                width: '100%', padding: '16px', borderRadius: 16,
                border: 'none',
                background: 'linear-gradient(135deg, #FFBE0B 0%, #FF6B35 100%)',
                color: '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(255,107,53,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <span>Check-in Mood</span>
              <span style={{ fontSize: 18 }}>🌱</span>
            </button>
            <button
              onClick={handleClose}
              className="hp-tap-btn"
              style={{
                width: '100%', padding: '14px', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)',
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 15,
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
