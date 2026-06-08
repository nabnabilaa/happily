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
        background: 'rgba(26,26,46,0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: phase === 'closing' ? 'dgFadeOut 0.35s ease forwards' : 'hpFadeIn 0.3s ease',
      }}
      onClick={handleClose}
    >
      <style>{`
        @keyframes dgCardIn {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes dgCardOut {
          from { transform: translateY(0) scale(1); opacity: 1; }
          to   { transform: translateY(20px) scale(0.95); opacity: 0; }
        }
        @keyframes dgFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes dgBubbleIn {
          0% { transform: translateX(-50%) translateY(10px) scale(0.9); opacity: 0; }
          60% { transform: translateX(-50%) translateY(-2px) scale(1.05); }
          100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
        }
        .hp-tap-btn {
          transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.15s;
        }
        .hp-tap-btn:active {
          transform: scale(0.96);
        }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          borderRadius: 28,
          background: 'var(--hp-card)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)',
          overflow: 'hidden',
          animation: phase === 'closing'
            ? 'dgCardOut 0.35s ease forwards'
            : 'dgCardIn 0.5s cubic-bezier(.32,.82,.26,1)',
          position: 'relative',
        }}
      >
        {/* Background glow yang lebih soft */}
        <div style={{
          position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
          width: 250, height: 250, background: 'radial-gradient(circle, var(--hp-sage-soft) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0, opacity: 0.8
        }} />

        <div style={{ padding: '36px 24px 28px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          
          <h2 style={{
            fontFamily: HP_FONT_DISPLAY, fontSize: 26, fontWeight: 800,
            color: 'var(--hp-ink)', lineHeight: 1.2, marginBottom: 6,
          }}>
            Hai, {cleanName}! 👋
          </h2>
          <p style={{
            fontSize: 14, color: 'var(--hp-ink-mute)', fontWeight: 600,
            marginBottom: 36, lineHeight: 1.5
          }}>
            {greeting.intro}
          </p>

          {/* ── Speech Bubble (Normal Flow) ────────────────────────────────── */}
          <div style={{
            background: 'var(--hp-ink)', padding: '16px 20px', borderRadius: 20,
            boxShadow: 'var(--hp-shadow)', width: 'max-content', maxWidth: 280,
            margin: '0 auto 16px', position: 'relative', zIndex: 10,
            animation: 'dgBubbleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
          }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', lineHeight: 1.5, margin: 0 }}>
              "{quote}"
            </p>
            {/* Segitiga pointer */}
            <div style={{
              position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
              borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
              borderTop: '10px solid var(--hp-ink)',
            }} />
          </div>

          {/* ── Buddy ──────────────────────────────────────────────────────── */}
          <div style={{ animation: 'hpFloat 3s ease-in-out infinite', marginBottom: 28 }}>
            <BeeMascot mood={greeting.buddyMood as any} size={110} animated />
          </div>

          {/* ── Stats Row (Softer Colors) ─────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 12, marginBottom: 28,
          }}>
            {/* Streak - pakai warna lavender soft supaya lebih elegan */}
            <div style={{
              flex: 1, padding: '12px 14px', borderRadius: 16,
              background: 'var(--hp-lavender-wash)',
              border: '1px solid var(--hp-lavender-soft)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🔥</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--hp-ink)', fontFamily: HP_FONT_DISPLAY }}>
                {streak}
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--hp-ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Hari streak
              </div>
            </div>

            {/* Level - pakai warna sage soft */}
            <div style={{
              flex: 1, padding: '12px 14px', borderRadius: 16,
              background: 'var(--hp-sage-wash)',
              border: '1px solid var(--hp-sage-soft)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>⭐</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--hp-ink)', fontFamily: HP_FONT_DISPLAY }}>
                Lv.{level}
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--hp-ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Level kamu
              </div>
            </div>
          </div>

          {/* ── Buttons ───────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCheckIn}
              className="hp-tap-btn"
              style={{
                flex: 2, padding: '16px', borderRadius: 100,
                border: 'none',
                background: 'var(--hp-ink)', color: '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
                cursor: 'pointer',
                boxShadow: 'var(--hp-shadow-sm)',
              }}
            >
              Check-in Mood 🌱
            </button>
            <button
              onClick={handleClose}
              className="hp-tap-btn"
              style={{
                flex: 1, padding: '16px', borderRadius: 100,
                border: '1.5px solid var(--hp-border)',
                background: 'var(--hp-card)', color: 'var(--hp-ink-mute)',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Nanti
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
