"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { HP_TOKENS, HP_FONT, HP_FONT_DISPLAY } from "@/lib/constants";
import BeeMascot from "@/components/ui/BeeMascot";

interface OnboardingScreenProps {
  onFinish: () => void;
  userName: string;
}

// ── Confetti Particle Generator ─────────────────────────────────────────────
function ConfettiLayer() {
  const colors = ['#FF6B35', '#FFBE0B', '#2EC4B6', '#FF8C55', '#1D3557', '#F06595', '#845EF7', '#FFD43B'];
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 2.5,
    duration: 2 + Math.random() * 2,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    shape: i % 3, // 0=square, 1=circle, 2=triangle-strip
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-20px',
            width: p.shape === 1 ? p.size : p.size * 0.7,
            height: p.size,
            background: p.color,
            borderRadius: p.shape === 1 ? '50%' : p.shape === 2 ? '2px' : '3px',
            opacity: 0.9,
            animation: `hpConfetti ${p.duration}s ${p.delay}s linear both`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ── Tap Ripple Effect ──────────────────────────────────────────────────────
function TapRipple({ x, y }: { x: number; y: number }) {
  return (
    <div style={{
      position: 'absolute',
      left: x - 12, top: y - 12,
      width: 24, height: 24,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.55)',
      animation: 'hpRipple 0.55s ease-out forwards',
      pointerEvents: 'none',
    }} />
  );
}

// ── Star Background (for tap game) ─────────────────────────────────────────
function StarField() {
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 3,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: s.size,
          height: s.size,
          borderRadius: '50%',
          background: '#fff',
          opacity: 0.15,
          animation: `obStarBlink ${s.duration}s ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}


export default function OnboardingScreen({ onFinish, userName }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [prevStep, setPrevStep] = useState(-1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Step data
  const [inputName, setInputName] = useState(userName || "");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [tapDone, setTapDone] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [splashProgress, setSplashProgress] = useState(0);

  const rippleIdRef = useRef(0);
  const tapTargetRef = useRef<HTMLDivElement>(null);

  // ── Splash auto-advance ──────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 0) return;
    const interval = setInterval(() => {
      setSplashProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);
    const timeout = setTimeout(() => goTo(1), 2200);
    return () => { clearInterval(interval); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tap game auto-advance ────────────────────────────────────────────────
  const TAP_TARGET = 15;
  useEffect(() => {
    if (tapCount >= TAP_TARGET && !tapDone) {
      setTapDone(true);
      setTimeout(() => goTo(4), 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapCount, tapDone]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const goTo = useCallback((next: number) => {
    if (isTransitioning) return;
    setDirection(next > step ? 'forward' : 'back');
    setPrevStep(step);
    setIsTransitioning(true);
    // Small delay to let exit animation start
    setTimeout(() => {
      setStep(next);
      setTimeout(() => {
        setIsTransitioning(false);
        setPrevStep(-1);
      }, 500);
    }, 50);
  }, [step, isTransitioning]);

  // ── Tap handler ──────────────────────────────────────────────────────────
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tapDone) return;
    const rect = tapTargetRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleIdRef.current++;
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    setTapCount(prev => prev + 1);
  };

  // ── Constants ────────────────────────────────────────────────────────────
  const TOTAL_STEPS = 8; // 0-7
  const displayName = inputName || userName || "Sobat";

  // Progress percentage (skip splash step 0 from display)
  const progressPct = step === 0 ? 0 : Math.round((step / (TOTAL_STEPS - 1)) * 100);

  const JOBS = [
    { key: 'dev', icon: '💻', label: 'Developer / IT' },
    { key: 'design', icon: '🎨', label: 'Desainer / Kreatif' },
    { key: 'marketing', icon: '📊', label: 'Marketing / Sales' },
    { key: 'manager', icon: '📋', label: 'Manajer / Tim Lead' },
    { key: 'other', icon: '🏢', label: 'Lainnya' },
  ];

  const MOODS = [
    { key: 'excited', icon: '🔥', label: 'Semangat & siap tempur!' },
    { key: 'neutral', icon: '😊', label: 'Biasa aja, butuh dorongan' },
    { key: 'tired', icon: '😴', label: 'Capek, tapi mau tetap coba' },
    { key: 'stressed', icon: '🌀', label: 'Stres & butuh motivasi' },
  ];

  const COMMITS = [
    { key: 'fullheart', icon: '💪', label: 'Aku akan kerja dengan sepenuh hati' },
    { key: 'focus', icon: '🎯', label: 'Aku akan fokus satu hal dalam satu waktu' },
    { key: 'grow', icon: '🌱', label: 'Aku akan bertumbuh sedikit demi sedikit' },
    { key: 'today', icon: '☀️', label: 'Aku akan mulai hari ini, bukan besok' },
  ];

  const JOB_LABELS: Record<string, string> = {
    dev: 'Developer / IT', design: 'Desainer / Kreatif',
    marketing: 'Marketing / Sales', manager: 'Manajer / Tim Lead', other: 'Lainnya',
  };

  const MOOD_LABELS: Record<string, string> = {
    excited: '🔥 Semangat', neutral: '😊 Biasa', tired: '😴 Capek', stressed: '🌀 Stres',
  };

  // ── Render helper for choice buttons ──────────────────────────────────────
  const renderChoice = (
    item: { key: string; icon: string; label: string },
    selected: string | null,
    onSelect: (key: string) => void,
    subtitle?: string,
  ) => {
    const isOn = selected === item.key;
    return (
      <button
        key={item.key}
        onClick={() => onSelect(item.key)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', borderRadius: 18,
          border: `2.5px solid ${isOn ? 'var(--hp-primary)' : 'var(--hp-border)'}`,
          background: isOn ? 'var(--hp-primary-soft)' : 'var(--hp-card)',
          width: '100%', textAlign: 'left', cursor: 'pointer',
          transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
          position: 'relative', overflow: 'hidden',
        }}
        className="hp-tap"
      >
        <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{
            fontSize: 15, fontWeight: 700, color: 'var(--hp-ink)',
            lineHeight: 1.35, display: 'block',
          }}>
            {item.label}
          </span>
          {subtitle && (
            <span style={{ fontSize: 12, color: 'var(--hp-ink-mute)', fontWeight: 600, marginTop: 3, display: 'block', lineHeight: 1.4 }}>
              {subtitle}
            </span>
          )}
        </div>
        {isOn && (
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--hp-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0,
            animation: 'hpPopIn 0.25s cubic-bezier(.34,1.56,.64,1) both',
          }}>
            ✓
          </div>
        )}
      </button>
    );
  };

  // ── Screen wrapper with slide transitions ─────────────────────────────────
  const screenStyle = (idx: number): React.CSSProperties => {
    const isActive = idx === step;
    const isExiting = idx === prevStep;

    if (!isActive && !isExiting) {
      return { display: 'none' };
    }

    if (isExiting) {
      return {
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        animation: direction === 'forward'
          ? 'obSlideOutLeft 0.45s cubic-bezier(.34,.82,.2,1) forwards'
          : 'obSlideOutRight 0.45s cubic-bezier(.34,.82,.2,1) forwards',
        pointerEvents: 'none',
        overflow: 'hidden',
      };
    }

    return {
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      animation: direction === 'forward'
        ? 'obSlideInRight 0.5s cubic-bezier(.34,.82,.2,1) both'
        : 'obSlideInLeft 0.5s cubic-bezier(.34,.82,.2,1) both',
      overflow: 'hidden',
    };
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--hp-paper)',
      overflow: 'hidden',
    }}>
      {/* Inline keyframes for onboarding-specific animations */}
      <style>{`
        @keyframes obSlideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes obSlideOutLeft {
          from { transform: translateX(0);     opacity: 1; }
          to   { transform: translateX(-110%); opacity: 0; }
        }
        @keyframes obSlideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes obSlideOutRight {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(110%); opacity: 0; }
        }
        @keyframes obStarBlink {
          0%,100% { opacity: 0.15; transform: scale(0.6); }
          50%     { opacity: 0.9;  transform: scale(1); }
        }
        @keyframes obBadgePop {
          0%   { transform: scale(0) rotate(-15deg); }
          60%  { transform: scale(1.2) rotate(5deg); }
          100% { transform: scale(1) rotate(0); }
        }
        @keyframes obHeartbeat {
          0%,100% { transform: scale(1); }
          20%     { transform: scale(1.2); }
          40%     { transform: scale(1); }
        }
        @keyframes obSplashBar {
          from { width: 0; }
          to   { width: 100%; }
        }
        @keyframes obGlowRing {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.4); }
          50%     { box-shadow: 0 0 0 20px rgba(255,107,53,0); }
        }
        @keyframes obTapBounce {
          0%   { transform: scale(1); }
          50%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes obCountPop {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.25); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes obWaveHero {
          0%   { d: path("M0 60V28Q108 0 215 20Q322 40 430 10V60Z"); }
          100% { d: path("M0 60V22Q108 8 215 28Q322 48 430 18V60Z"); }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════
           STEP 0: SPLASH
         ════════════════════════════════════════════════════════════════════ */}
      <div style={screenStyle(0)}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(155deg, #1D3557 0%, #0F1F33 100%)',
          position: 'relative',
        }}>
          {/* Ambient circles */}
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,190,11,0.06)', top: -60, right: -80, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,107,53,0.05)', bottom: 60, left: -40, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(46,196,182,0.04)', top: '40%', left: '60%', pointerEvents: 'none' }} />

          {/* Buddy */}
          <div style={{ animation: 'hpFloat 2.8s ease-in-out infinite', zIndex: 2, marginBottom: 24 }}>
            <BeeMascot mood="excited" size={110} />
          </div>

          {/* Logo */}
          <div style={{
            fontFamily: HP_FONT_DISPLAY, fontSize: 48, fontWeight: 700,
            color: '#fff', letterSpacing: -1, zIndex: 2,
            animation: 'hpFadeUp 0.5s ease both',
          }}>
            Flow<span style={{ color: '#FF6B35' }}>buddy</span> ✨
          </div>
          <div style={{
            fontSize: 15, color: 'rgba(255,255,255,0.55)', zIndex: 2,
            marginTop: 6, letterSpacing: 0.5, fontWeight: 600,
            animation: 'hpFadeUp 0.5s 0.15s ease both',
          }}>
            Kerja Lebih Cerdas, Lebih Semangat
          </div>

          {/* Loading bar */}
          <div style={{
            width: 48, height: 4, background: 'rgba(255,255,255,0.15)',
            borderRadius: 100, overflow: 'hidden', marginTop: 48, zIndex: 2,
            animation: 'hpFadeUp 0.5s 0.3s ease both',
          }}>
            <div style={{
              height: '100%', background: '#FF6B35', borderRadius: 100,
              width: `${splashProgress}%`, transition: 'width 0.05s linear',
            }} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
           STEP 1: NAME INPUT
         ════════════════════════════════════════════════════════════════════ */}
      <div style={screenStyle(1)}>
        {/* Hero area */}
        <div style={{
          background: 'linear-gradient(160deg, var(--hp-primary) 0%, #FF8C55 100%)',
          flex: '0 0 52vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', paddingTop: 52, position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Speech bubble */}
          <div style={{
            background: 'var(--hp-card)', borderRadius: 20, padding: '14px 20px',
            boxShadow: 'var(--hp-shadow)', fontSize: 16, fontWeight: 700,
            color: 'var(--hp-ink)', textAlign: 'center', lineHeight: 1.5,
            position: 'relative', zIndex: 2, maxWidth: '90%',
            marginBottom: 28,
            animation: 'hpFadeUp 0.55s ease both',
          }}>
            Hai! Senang ketemu kamu 👋<br />Aku Buddy, di sini buat bantu harimu lebih teratur
            {/* Down arrow */}
            <div style={{
              position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
              borderLeft: '11px solid transparent', borderRight: '11px solid transparent',
              borderTop: '13px solid var(--hp-card)',
            }} />
          </div>

          {/* Buddy mascot */}
          <div style={{ animation: 'hpFloat 2.8s ease-in-out infinite', zIndex: 2 }}>
            <BeeMascot mood="happy" size={150} />
          </div>

          {/* Wave */}
          <svg
            viewBox="0 0 430 60"
            preserveAspectRatio="none"
            style={{ position: 'absolute', bottom: -2, left: 0, right: 0, width: '100%', height: 60, zIndex: 3 }}
          >
            <path d="M0 60V28Q108 0 215 20Q322 40 430 10V60Z" fill="var(--hp-paper)" />
          </svg>
        </div>

        {/* Bottom input area */}
        <div style={{
          background: 'var(--hp-paper)', flex: 1, display: 'flex',
          flexDirection: 'column', alignItems: 'center',
          padding: '32px 28px 44px', gap: 18,
        }}>
          <p style={{
            fontSize: 16, fontWeight: 700, color: 'var(--hp-ink-mute)',
            textAlign: 'center',
            animation: 'hpFadeUp 0.55s ease both',
          }}>
            Siapa nama kamu?
          </p>
          <input
            type="text"
            value={inputName}
            onChange={e => setInputName(e.target.value)}
            placeholder="Tulis nama kamu..."
            autoComplete="given-name"
            maxLength={30}
            style={{
              width: '100%', padding: '18px 24px', borderRadius: 100,
              border: '2.5px solid var(--hp-border)', background: 'var(--hp-card)',
              fontSize: 17, color: 'var(--hp-ink)', fontWeight: 600,
              outline: 'none', textAlign: 'center',
              fontFamily: HP_FONT,
              transition: 'border-color 0.2s, box-shadow 0.2s',
              animation: 'hpFadeUp 0.55s 0.12s ease both',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--hp-primary)';
              e.target.style.boxShadow = '0 0 0 4px rgba(255,107,53,0.12)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--hp-border)';
              e.target.style.boxShadow = 'none';
            }}
            autoFocus
          />
          <button
            disabled={!inputName.trim()}
            onClick={() => goTo(2)}
            className="hp-tap"
            style={{
              background: inputName.trim() ? 'var(--hp-primary)' : 'var(--hp-border)',
              color: inputName.trim() ? '#fff' : 'var(--hp-ink-fade)',
              border: 'none', borderRadius: 100, padding: '17px 48px',
              fontSize: 16, fontWeight: 800, letterSpacing: 0.3,
              boxShadow: inputName.trim() ? 'var(--hp-shadow-orange)' : 'none',
              cursor: inputName.trim() ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              animation: 'hpFadeUp 0.55s 0.24s ease both',
            }}
          >
            Halo, aku siap! 👋
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
           STEP 2: JOB SELECTION
         ════════════════════════════════════════════════════════════════════ */}
      <div style={screenStyle(2)}>
        <div style={{ padding: '32px 24px 44px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Progress */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ height: 6, background: 'var(--hp-border)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--hp-primary)', borderRadius: 100, width: '18%', transition: 'width 0.6s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>

          <div style={{ padding: '8px 0 0' }}>
            <p style={{ fontSize: 13, color: 'var(--hp-ink-mute)', fontWeight: 700, marginBottom: 4, animation: 'hpFadeUp 0.55s ease both' }}>
              LANGKAH 1 / 6
            </p>
            <h2 style={{
              fontSize: 25, fontWeight: 900, color: 'var(--hp-ink)', lineHeight: 1.25,
              fontFamily: HP_FONT_DISPLAY, animation: 'hpFadeUp 0.55s 0.12s ease both',
            }}>
              Kamu kerja sebagai apa?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--hp-ink-mute)', marginTop: 6, animation: 'hpFadeUp 0.55s 0.24s ease both' }}>
              Ini bantu aku sesuaikan pengalaman yang paling pas buat kamu
            </p>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 11,
            flex: 1, marginTop: 20,
            animation: 'hpFadeUp 0.55s 0.36s ease both',
          }}>
            {JOBS.map(j => renderChoice(j, selectedJob, setSelectedJob))}
          </div>

          <div style={{ padding: '20px 0 0', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              disabled={!selectedJob}
              onClick={() => goTo(3)}
              className="hp-tap"
              style={{
                background: selectedJob ? 'var(--hp-primary)' : 'var(--hp-border)',
                color: selectedJob ? '#fff' : 'var(--hp-ink-fade)',
                border: 'none', borderRadius: 100, padding: '17px 48px',
                fontSize: 16, fontWeight: 800, letterSpacing: 0.3,
                boxShadow: selectedJob ? 'var(--hp-shadow-orange)' : 'none',
                cursor: selectedJob ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              Lanjut →
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
           STEP 3: TAP GAME
         ════════════════════════════════════════════════════════════════════ */}
      <div style={screenStyle(3)}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(155deg, #1D3557 0%, #0F1F33 100%)',
          position: 'relative',
        }}>
          <StarField />

          {/* Header */}
          <div style={{ padding: '40px 24px 0', textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1 }}>
              MINI GAME
            </p>
            <h2 style={{
              fontFamily: HP_FONT_DISPLAY, fontSize: 24, fontWeight: 700,
              color: '#fff', marginTop: 6,
            }}>
              Tap Buddy sebanyak mungkin!<br />Isi energimu sekarang ⚡
            </h2>
          </div>

          {/* Tap area */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px 24px', position: 'relative', zIndex: 2,
          }}>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 28 }}>
              {Array.from({ length: TAP_TARGET }, (_, i) => (
                <div key={i} style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: i < tapCount ? '#FFBE0B' : 'rgba(255,255,255,0.18)',
                  transition: 'background 0.25s, transform 0.25s',
                  transform: i < tapCount ? 'scale(1.2)' : 'scale(1)',
                }} />
              ))}
            </div>

            {/* Tap target: outer ring */}
            <div style={{
              width: 180, height: 180, borderRadius: '50%',
              background: 'rgba(255,190,11,0.1)',
              border: '2px solid rgba(255,190,11,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: tapDone ? '' : 'obGlowRing 2s ease infinite',
            }}>
              {/* Tap target: inner (Buddy) */}
              <div
                ref={tapTargetRef}
                onClick={handleTap}
                style={{
                  width: 140, height: 140, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--hp-primary) 0%, #FF8C55 100%)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 2, cursor: tapDone ? 'default' : 'pointer',
                  userSelect: 'none', position: 'relative', overflow: 'hidden',
                  transition: 'transform 0.1s',
                }}
              >
                {/* Buddy inside the circle */}
                <div style={{ 
                  marginTop: -5,
                  animation: tapCount > 0 ? 'obTapBounce 0.15s ease' : undefined,
                  pointerEvents: 'none',
                }}>
                  <BeeMascot
                    mood={tapDone ? 'happy' : tapCount > 10 ? 'excited' : tapCount > 5 ? 'happy' : 'neutral'}
                    size={60}
                    animated={true}
                  />
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 900, color: '#fff',
                  fontFamily: HP_FONT_DISPLAY, lineHeight: 1,
                  animation: tapCount > 0 ? 'obCountPop 0.2s cubic-bezier(.34,1.56,.64,1)' : undefined,
                  pointerEvents: 'none',
                }}>
                  {tapCount}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, pointerEvents: 'none' }}>
                  {tapDone ? 'DONE!' : 'TAP!'}
                </div>

                {/* Ripples */}
                {ripples.map(r => <TapRipple key={r.id} x={r.x} y={r.y} />)}
              </div>
            </div>

            <p style={{
              color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, marginTop: 20,
            }}>
              {tapDone ? '🎉 Energi terisi penuh!' : `Target: ${TAP_TARGET} tap 🎯`}
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
           STEP 4: CELEBRATION
         ════════════════════════════════════════════════════════════════════ */}
      <div style={screenStyle(4)}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '56px 24px 44px', position: 'relative', overflow: 'hidden',
          background: 'var(--hp-paper)',
        }}>
          {step === 4 && <ConfettiLayer />}

          {/* Speech bubble */}
          <div style={{
            background: 'var(--hp-card)', borderRadius: 20, padding: '14px 20px',
            boxShadow: 'var(--hp-shadow)', fontSize: 16, fontWeight: 700,
            color: 'var(--hp-ink)', textAlign: 'center', lineHeight: 1.5,
            position: 'relative', zIndex: 2, maxWidth: '90%',
            marginBottom: 28,
            animation: 'hpFadeUp 0.55s ease both',
          }}>
            Luar biasa, <span style={{ color: 'var(--hp-primary)' }}>{displayName}</span>! 🎉
            <div style={{
              position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
              borderLeft: '11px solid transparent', borderRight: '11px solid transparent',
              borderTop: '13px solid var(--hp-card)',
            }} />
          </div>

          {/* Buddy bouncing */}
          <div style={{ animation: 'hpBounce 1.9s ease-in-out infinite', zIndex: 2 }}>
            <BeeMascot mood="happy" size={150} />
          </div>

          <p style={{
            fontSize: 16, fontWeight: 700, color: 'var(--hp-ink-mute)',
            textAlign: 'center', marginTop: 20, lineHeight: 1.65, zIndex: 2,
            animation: 'hpFadeUp 0.55s 0.12s ease both',
          }}>
            Semangat itu nyata!<br />Sekarang yuk atur harimu bareng 🚀
          </p>

          <button
            onClick={() => goTo(5)}
            className="hp-tap"
            style={{
              background: 'var(--hp-primary)', color: '#fff',
              border: 'none', borderRadius: 100, padding: '17px 48px',
              fontSize: 16, fontWeight: 800, letterSpacing: 0.3,
              boxShadow: 'var(--hp-shadow-orange)',
              cursor: 'pointer', zIndex: 2, marginTop: 20,
              animation: 'hpFadeUp 0.55s 0.24s ease both',
            }}
          >
            Lanjut ✨
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
           STEP 5: MOOD CHECK-IN
         ════════════════════════════════════════════════════════════════════ */}
      <div style={screenStyle(5)}>
        <div style={{ padding: '32px 24px 44px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Progress */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ height: 6, background: 'var(--hp-border)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--hp-primary)', borderRadius: 100, width: '55%', transition: 'width 0.6s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>

          <div style={{ padding: '16px 0 0' }}>
            <p style={{ fontSize: 13, color: 'var(--hp-ink-mute)', fontWeight: 700, marginBottom: 4, animation: 'hpFadeUp 0.55s ease both' }}>
              KONDISI KAMU
            </p>
            <h2 style={{
              fontSize: 25, fontWeight: 900, color: 'var(--hp-ink)', lineHeight: 1.25,
              fontFamily: HP_FONT_DISPLAY, animation: 'hpFadeUp 0.55s 0.12s ease both',
            }}>
              Gimana perasaanmu<br />hari ini?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--hp-ink-mute)', marginTop: 6, animation: 'hpFadeUp 0.55s 0.24s ease both' }}>
              Jujur aja, aku akan sesuaikan tampilan untukmu 💙
            </p>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 11,
            flex: 1, marginTop: 16,
            animation: 'hpFadeUp 0.55s 0.36s ease both',
          }}>
            {MOODS.map(m => renderChoice(m, selectedMood, setSelectedMood))}
          </div>

          <div style={{ padding: '20px 0 0', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              disabled={!selectedMood}
              onClick={() => goTo(6)}
              className="hp-tap"
              style={{
                background: selectedMood ? 'var(--hp-primary)' : 'var(--hp-border)',
                color: selectedMood ? '#fff' : 'var(--hp-ink-fade)',
                border: 'none', borderRadius: 100, padding: '17px 48px',
                fontSize: 16, fontWeight: 800, letterSpacing: 0.3,
                boxShadow: selectedMood ? 'var(--hp-shadow-orange)' : 'none',
                cursor: selectedMood ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              Lanjut →
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
           STEP 6: COMMITMENT
         ════════════════════════════════════════════════════════════════════ */}
      <div style={screenStyle(6)}>
        <div style={{ padding: '32px 24px 44px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Progress */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ height: 6, background: 'var(--hp-border)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--hp-primary)', borderRadius: 100, width: '78%', transition: 'width 0.6s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>

          <div style={{ padding: '16px 0 0' }}>
            <p style={{ fontSize: 13, color: 'var(--hp-ink-mute)', fontWeight: 700, marginBottom: 4, animation: 'hpFadeUp 0.55s ease both' }}>
              JANJI HARIMU
            </p>
            <h2 style={{
              fontSize: 25, fontWeight: 900, color: 'var(--hp-ink)', lineHeight: 1.25,
              fontFamily: HP_FONT_DISPLAY, animation: 'hpFadeUp 0.55s 0.12s ease both',
            }}>
              Aku berjanji kepada<br />diriku sendiri…
            </h2>
            <p style={{ fontSize: 14, color: 'var(--hp-ink-mute)', marginTop: 6, animation: 'hpFadeUp 0.55s 0.24s ease both' }}>
              Pilih janjimu untuk hari ini!
            </p>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 11,
            flex: 1, marginTop: 16,
            animation: 'hpFadeUp 0.55s 0.36s ease both',
          }}>
            {COMMITS.map(c => renderChoice(c, selectedCommit, setSelectedCommit))}
          </div>

          <div style={{ padding: '20px 0 0', display: 'flex', justifyContent: 'center' }}>
            <button
              disabled={!selectedCommit}
              onClick={() => goTo(7)}
              className="hp-tap"
              style={{
                background: selectedCommit ? 'var(--hp-primary)' : 'var(--hp-border)',
                color: selectedCommit ? '#fff' : 'var(--hp-ink-fade)',
                border: 'none', borderRadius: 100, padding: '17px 48px',
                fontSize: 16, fontWeight: 800, letterSpacing: 0.3,
                boxShadow: selectedCommit ? 'var(--hp-shadow-orange)' : 'none',
                cursor: selectedCommit ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              Lanjut →
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
           STEP 7: FINAL — BADGE + SUMMARY
         ════════════════════════════════════════════════════════════════════ */}
      <div style={screenStyle(7)}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', position: 'relative', overflow: 'hidden',
          textAlign: 'center', background: 'var(--hp-paper)',
        }}>
          {step === 7 && <ConfettiLayer />}

          {/* Badge ring */}
          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--hp-primary) 0%, #FFBE0B 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 48px rgba(255,107,53,0.45)',
            animation: 'obBadgePop 0.7s cubic-bezier(.34,1.56,.64,1) both',
            zIndex: 2,
          }}>
            <div style={{
              width: 130, height: 130, borderRadius: '50%',
              background: 'var(--hp-card)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              animation: 'obHeartbeat 2.5s ease-in-out 1s infinite',
            }}>
              <BeeMascot mood="excited" size={80} />
            </div>
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 28, fontWeight: 900, color: 'var(--hp-ink)',
            marginTop: 22, fontFamily: HP_FONT_DISPLAY, zIndex: 2,
            animation: 'hpFadeUp 0.55s 0.12s ease both',
          }}>
            Semuanya siap, {displayName}! 🎉
          </h2>

          <p style={{
            fontSize: 15, color: 'var(--hp-ink-mute)', marginTop: 8,
            lineHeight: 1.65, textAlign: 'center', padding: '0 16px', zIndex: 2,
            animation: 'hpFadeUp 0.55s 0.24s ease both',
          }}>
            Hari pertamamu dimulai hari ini.<br />Satu langkah kecil sudah cukup untuk mulai 🌱
          </p>

          {/* Summary card */}
          <div style={{
            marginTop: 20, background: 'var(--hp-card)', borderRadius: 20,
            padding: '18px 22px', width: '100%', maxWidth: 340,
            boxShadow: 'var(--hp-shadow)', zIndex: 2,
            animation: 'hpFadeUp 0.55s 0.36s ease both',
          }}>
            <div style={{
              fontSize: 12, color: 'var(--hp-ink-mute)', fontWeight: 700,
              marginBottom: 12, textAlign: 'center', letterSpacing: 0.5,
            }}>
              RANGKUMAN PROFILMU
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SummaryRow label="Nama" value={displayName} />
              <div style={{ height: 1, background: 'var(--hp-border)' }} />
              <SummaryRow label="Tipe Kerja" value={JOB_LABELS[selectedJob || ''] || '—'} color="var(--hp-primary)" />
              <div style={{ height: 1, background: 'var(--hp-border)' }} />
              <SummaryRow label="Mood" value={MOOD_LABELS[selectedMood || ''] || '—'} color="var(--hp-primary)" />
              <div style={{ height: 1, background: 'var(--hp-border)' }} />
              <SummaryRow label="Level Awal" value="🌱 Lv.1 Pemula" color="#FFBE0B" />
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onFinish}
            className="hp-tap"
            style={{
              background: 'var(--hp-primary)', color: '#fff',
              border: 'none', borderRadius: 100,
              padding: '18px 64px', fontSize: 17, fontWeight: 800,
              boxShadow: 'var(--hp-shadow-orange)',
              cursor: 'pointer', zIndex: 2, marginTop: 24,
              letterSpacing: 0.3,
              animation: 'hpFadeUp 0.55s 0.48s ease both',
            }}
          >
            Masuk ke App ⚡
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Summary Row Component ──────────────────────────────────────────────────
function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 14, color: 'var(--hp-ink-mute)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: color || 'var(--hp-ink)' }}>{value}</span>
    </div>
  );
}
