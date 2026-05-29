"use client";

import React, { useState, useEffect, useRef } from "react";
import { HP_TOKENS } from "@/lib/constants";

interface BeeMascotProps {
  mood?: 'happy' | 'neutral' | 'sad' | 'sleepy' | 'surprised';
  size?: number;
  showSpeech?: string;
  /** Override animasi global. Jika undefined, ikut preferensi global dari localStorage */
  animated?: boolean;
}

// ─── Global animation preference key ────────────────────────────────────────
const ANIM_PREF_KEY = "hp_mascot_animated";

function getAnimPref(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(ANIM_PREF_KEY);
  return val === null ? true : val === "1";
}

function setAnimPref(val: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANIM_PREF_KEY, val ? "1" : "0");
}

// ─── Singleton event bus untuk sync semua instance ──────────────────────────
const ANIM_EVENT = "hp_mascot_anim_change";

export function toggleMascotAnimation() {
  const next = !getAnimPref();
  setAnimPref(next);
  window.dispatchEvent(new CustomEvent(ANIM_EVENT, { detail: next }));
  return next;
}

export function getMascotAnimated() {
  return getAnimPref();
}

// ─── Moodnya → expression SVG ───────────────────────────────────────────────
const MOOD_COLOR: Record<string, string> = {
  happy:    "#3B8AE0",
  neutral:  "#7A92A8",
  sad:      "#A0B0C0",
  sleepy:   "#8B7EC8",
  surprised:"#F4A429",
};

const MOOD_CHEEK: Record<string, string> = {
  happy:    "#FF9FAE",
  neutral:  "#C8D8E8",
  sad:      "#B0C8D8",
  sleepy:   "#C8B8F0",
  surprised:"#FFD0A0",
};

export default function BeeMascot({ mood = 'happy', size = 80, showSpeech, animated: animatedProp }: BeeMascotProps) {
  const [isAnimated, setIsAnimated] = useState<boolean>(true);
  const [blink, setBlink] = useState(false);
  const [bounce, setBounce] = useState(false);
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync dengan preferensi global
  useEffect(() => {
    if (animatedProp !== undefined) {
      setIsAnimated(animatedProp);
      return;
    }
    setIsAnimated(getAnimPref());
    const handler = (e: Event) => {
      setIsAnimated((e as CustomEvent).detail);
    };
    window.addEventListener(ANIM_EVENT, handler);
    return () => window.removeEventListener(ANIM_EVENT, handler);
  }, [animatedProp]);

  // Blink random saat animated
  useEffect(() => {
    if (!isAnimated) {
      setBlink(false);
      if (blinkRef.current) clearInterval(blinkRef.current);
      return;
    }
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000;
      blinkRef.current = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 180);
      }, delay) as any;
    };
    scheduleBlink();
    return () => {
      if (blinkRef.current) clearTimeout(blinkRef.current as any);
    };
  }, [isAnimated]);

  // Bounce random saat animated
  useEffect(() => {
    if (!isAnimated) {
      setBounce(false);
      return;
    }
    const scheduleBounce = () => {
      const delay = 4000 + Math.random() * 6000;
      bounceRef.current = setTimeout(() => {
        setBounce(true);
        setTimeout(() => {
          setBounce(false);
          scheduleBounce();
        }, 600);
      }, delay) as any;
    };
    scheduleBounce();
    return () => {
      if (bounceRef.current) clearTimeout(bounceRef.current as any);
    };
  }, [isAnimated]);

  const color     = MOOD_COLOR[mood]  ?? MOOD_COLOR.happy;
  const cheekCol  = MOOD_CHEEK[mood]  ?? MOOD_CHEEK.happy;

  // ─── Eyes per mood ──────────────────────────────────────────────────────
  const eyesClosed = blink || mood === 'sleepy';

  const leftEye = eyesClosed
    ? <path d="M 28 46 Q 32 43 36 46" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    : mood === 'surprised'
      ? <><ellipse cx="32" cy="44" rx="5" ry="6" fill="#1a1a2e"/><ellipse cx="33" cy="42" rx="2" ry="2" fill="#fff" opacity="0.7"/></>
      : <><ellipse cx="32" cy="44" rx="4" ry="4.5" fill="#1a1a2e"/><ellipse cx="33.5" cy="42.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.7"/></>;

  const rightEye = eyesClosed
    ? <path d="M 56 46 Q 60 43 64 46" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    : mood === 'surprised'
      ? <><ellipse cx="60" cy="44" rx="5" ry="6" fill="#1a1a2e"/><ellipse cx="61" cy="42" rx="2" ry="2" fill="#fff" opacity="0.7"/></>
      : <><ellipse cx="60" cy="44" rx="4" ry="4.5" fill="#1a1a2e"/><ellipse cx="61.5" cy="42.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.7"/></>;

  const mouth =
    mood === 'happy'    ? <path d="M 36 58 Q 46 66 56 58" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" fill="none"/> :
    mood === 'sad'      ? <path d="M 36 63 Q 46 56 56 63" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" fill="none"/> :
    mood === 'surprised'? <ellipse cx="46" cy="62" rx="5" ry="6" fill="#1a1a2e" opacity="0.7"/> :
    mood === 'sleepy'   ? <path d="M 38 60 Q 46 64 54 60" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" fill="none"/> :
                          <path d="M 38 60 L 54 60" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>;

  const floatAnim   = isAnimated ? "bm-float 3.2s cubic-bezier(0.45,0.05,0.55,0.95) infinite" : "none";
  const squishAnim  = bounce && isAnimated ? "bm-bounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97)" : "none";
  const shadowAnim  = isAnimated ? "bm-shadow 3.2s cubic-bezier(0.45,0.05,0.55,0.95) infinite" : "none";
  const glowAnim    = isAnimated ? "bm-glow 3.2s ease-in-out infinite" : "none";

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Speech bubble */}
      {showSpeech && (
        <div style={{
          marginBottom: 10,
          padding: '8px 14px',
          borderRadius: '14px 14px 14px 4px',
          background: '#fff',
          border: `1.5px solid ${HP_TOKENS.line}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          maxWidth: 200,
          position: 'relative',
          animation: 'bm-fadein 0.35s cubic-bezier(0.2,0.8,0.2,1)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: HP_TOKENS.ink }}>{showSpeech}</div>
          <div style={{
            position: 'absolute', bottom: -7, left: 10,
            width: 0, height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: `7px solid ${HP_TOKENS.line}`
          }} />
        </div>
      )}

      {/* Glow aura */}
      <div style={{
        position: 'absolute',
        bottom: -4,
        width: size * 0.75,
        height: size * 0.22,
        borderRadius: '50%',
        background: `radial-gradient(ellipse, ${color}55 0%, transparent 70%)`,
        animation: glowAnim,
        filter: 'blur(6px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Shadow */}
      <div style={{
        position: 'absolute',
        bottom: -2,
        width: size * 0.55,
        height: size * 0.1,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.13)',
        animation: shadowAnim,
        filter: 'blur(4px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Main mascot body */}
      <div style={{
        width: size,
        height: size,
        position: 'relative',
        zIndex: 1,
        animation: squishAnim !== "none" ? squishAnim : floatAnim,
        transformOrigin: 'bottom center',
        cursor: 'pointer',
        userSelect: 'none',
      }}
        onClick={() => {
          if (!isAnimated) return;
          setBounce(true);
          setTimeout(() => setBounce(false), 600);
        }}
      >
        <svg
          viewBox="0 0 92 92"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <radialGradient id={`bm-body-${mood}`} cx="38%" cy="32%" r="65%">
              <stop offset="0%"   stopColor={lighten(color, 0.38)} />
              <stop offset="55%"  stopColor={color} />
              <stop offset="100%" stopColor={darken(color, 0.22)} />
            </radialGradient>
            <radialGradient id={`bm-shine-${mood}`} cx="30%" cy="20%" r="50%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <filter id="bm-shadow-filter">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={darken(color, 0.3)} floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Body */}
          <ellipse
            cx="46" cy="52"
            rx="36" ry="34"
            fill={`url(#bm-body-${mood})`}
            filter="url(#bm-shadow-filter)"
          />

          {/* Specular highlight */}
          <ellipse
            cx="34" cy="30"
            rx="16" ry="11"
            fill={`url(#bm-shine-${mood})`}
            opacity="0.85"
          />

          {/* Blush cheeks */}
          <ellipse cx="22" cy="60" rx="9" ry="6" fill={cheekCol} opacity="0.55" />
          <ellipse cx="70" cy="60" rx="9" ry="6" fill={cheekCol} opacity="0.55" />

          {/* Eyes */}
          {leftEye}
          {rightEye}

          {/* Mouth */}
          {mouth}

          {/* Sleepy zzz */}
          {mood === 'sleepy' && (
            <text x="72" y="24" fontSize="11" fontWeight="900" fill={color} opacity="0.7"
              style={{ animation: isAnimated ? 'bm-zzz 2s ease-in-out infinite' : 'none' }}>
              z
            </text>
          )}
        </svg>
      </div>

      {/* ─── Keyframes ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes bm-float {
          0%   { transform: translateY(0px) scaleX(1) scaleY(1); }
          25%  { transform: translateY(-6px) scaleX(0.97) scaleY(1.03); }
          50%  { transform: translateY(-11px) scaleX(0.95) scaleY(1.05); }
          75%  { transform: translateY(-6px) scaleX(0.97) scaleY(1.03); }
          100% { transform: translateY(0px) scaleX(1) scaleY(1); }
        }
        @keyframes bm-bounce {
          0%   { transform: scaleX(1)    scaleY(1); }
          20%  { transform: scaleX(1.18) scaleY(0.78); }
          45%  { transform: scaleX(0.88) scaleY(1.22); }
          65%  { transform: scaleX(1.08) scaleY(0.94); }
          80%  { transform: scaleX(0.96) scaleY(1.06); }
          100% { transform: scaleX(1)    scaleY(1); }
        }
        @keyframes bm-shadow {
          0%, 100% { transform: scaleX(1) scaleY(1); opacity: 0.13; }
          50%       { transform: scaleX(0.7) scaleY(0.7); opacity: 0.06; }
        }
        @keyframes bm-glow {
          0%, 100% { opacity: 0.6; transform: scaleX(1); }
          50%       { opacity: 0.3; transform: scaleX(0.75); }
        }
        @keyframes bm-fadein {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bm-zzz {
          0%, 100% { opacity: 0.7; transform: translate(0,0); }
          50%       { opacity: 0.3; transform: translate(4px,-6px); }
        }
      `}</style>
    </div>
  );
}

// ─── Color helpers ───────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function lighten(hex: string, amt: number) {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r + (255-r)*amt, g + (255-g)*amt, b + (255-b)*amt);
}
function darken(hex: string, amt: number) {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r*(1-amt), g*(1-amt), b*(1-amt));
}
