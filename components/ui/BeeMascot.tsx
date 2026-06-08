"use client";

import React, { useState, useEffect, useId } from "react";
import "./BeeMascot.css";

interface BeeMascotProps {
  mood?: 'happy' | 'neutral' | 'sad' | 'sleepy' | 'surprised' | 'focus' | 'eating' | 'stretching' | 'excited' | 'annoyed' | 'waiting' | string;
  size?: number;
  showSpeech?: string;
  animated?: boolean;
  onClick?: () => void;
}

const ANIM_PREF_KEY = "hp_mascot_animated";
function getAnimPref() {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(ANIM_PREF_KEY);
  return val === null ? true : val === "1";
}
function setAnimPref(val: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANIM_PREF_KEY, val ? "1" : "0");
}

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


const stateMapping: Record<string, { svgState: string; w1: string; w2: string; wp: string; mouth: string; color: string }> = {
  idle: { color: '#3B82F6', svgState: 'idle', w1: '#D6E4FF', w2: '#3B82F6', wp: '#93C5FD', mouth: 'M 90 125 Q 100 130 110 125' },
  neutral: { color: '#3B82F6', svgState: 'idle', w1: '#D6E4FF', w2: '#3B82F6', wp: '#93C5FD', mouth: 'M 90 125 Q 100 130 110 125' },
  happy: { color: '#F06595', svgState: 'senang', w1: '#FEEAF1', w2: '#F06595', wp: '#FAA2C1', mouth: 'M 80 125 Q 100 155 120 125' },
  sad: { color: '#7A92A8', svgState: 'sedih', w1: '#E5E9F0', w2: '#7A92A8', wp: '#B8C6D6', mouth: 'M 85 135 Q 100 115 115 135' },
  sleepy: { color: '#A89BC9', svgState: 'ngantuk', w1: '#EAE6F4', w2: '#A89BC9', wp: '#D3CCEB', mouth: 'M 95 130 Q 100 132 105 130' },
  focus: { color: '#FFBE0B', svgState: 'fokus', w1: '#FFF8CC', w2: '#FFBE0B', wp: '#FFDCA8', mouth: 'M 92 128 L 108 128' },
  eating: { color: '#FF6B35', svgState: 'makan', w1: '#FFE6D6', w2: '#FF6B35', wp: '#FFB899', mouth: 'M 85 125 Q 100 155 115 125' },
  stretching: { color: '#20C997', svgState: 'olahraga', w1: '#E6FCF5', w2: '#20C997', wp: '#96F2D7', mouth: 'M 85 125 Q 100 115 115 125' },
  excited: { color: '#F59F00', svgState: 'semangat', w1: '#FFF3BF', w2: '#F59F00', wp: '#FFD43B', mouth: 'M 80 130 Q 100 160 120 130' },
  surprised: { color: '#845EF7', svgState: 'idle', w1: '#E5DBFF', w2: '#845EF7', wp: '#B197FC', mouth: 'M 95 125 A 5 5 0 1 1 105 125 A 5 5 0 1 1 95 125' },
  annoyed: { color: '#FF4444', svgState: 'kesal', w1: '#FFE5E5', w2: '#FF4444', wp: '#FFAAAA', mouth: 'M 85 135 Q 100 115 115 135' },
  waiting: { color: '#15AABF', svgState: 'menunggu', w1: '#E3FAFC', w2: '#15AABF', wp: '#66D9E8', mouth: 'M 95 125 A 5 5 0 1 1 105 125 A 5 5 0 1 1 95 125' },
};


const BeeMascot = React.memo(function BeeMascot({ mood = 'neutral', size = 80, showSpeech, animated: animatedProp, onClick }: BeeMascotProps) {
  const [isAnimated, setIsAnimated] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [interactiveState, setInteractiveState] = useState<string | null>(null);

  const uid = useId().replace(/:/g, '');

  const clickCountRef = React.useRef(0);
  const clickWindowStartRef = React.useRef(0);
  const rubScoreRef = React.useRef(0);
  const rubLastTimeRef = React.useRef(0);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (animatedProp !== undefined) {
      setIsAnimated(animatedProp);
      return;
    }
    setIsAnimated(getAnimPref());
    const handler = (e: any) => {
      setIsAnimated(e.detail);
    };
    window.addEventListener(ANIM_EVENT, handler);
    return () => window.removeEventListener(ANIM_EVENT, handler);
  }, [animatedProp]);

  const handlePet = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (onClick) onClick();
    const now = Date.now();
    if (now - clickWindowStartRef.current > 3000) {
      clickCountRef.current = 1;
      clickWindowStartRef.current = now;
    } else {
      clickCountRef.current++;
    }

    if (clickCountRef.current >= 6 && now - clickWindowStartRef.current < 3000) {
      rubScoreRef.current = 0;
      setInteractiveState('annoyed');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setInteractiveState(null), 5000);
    }
  };

  const handleMouseMove = () => {
    const now = Date.now();
    const decayed = Math.max(0, rubScoreRef.current - (now - rubLastTimeRef.current) * 0.012);
    rubScoreRef.current = Math.min(30, decayed + 1.2);
    rubLastTimeRef.current = now;

    if (rubScoreRef.current > 14 && interactiveState !== 'happy' && interactiveState !== 'annoyed') {
      setInteractiveState('happy');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setInteractiveState(null), 3000);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTimeout(() => { rubScoreRef.current = Math.max(0, rubScoreRef.current - 5); }, 500);
  };

  const stateObj = stateMapping[mood] || stateMapping['neutral'];
  const activeObj = interactiveState ? (stateMapping[interactiveState] || stateObj) : stateObj;

  const cssVars = {
    '--w1': activeObj.w1,
    '--w2': activeObj.w2,
    '--wp': activeObj.wp,
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    position: 'relative' as const,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
  };

  let svgContent = `<div id="fb-svg-wrap" className="state-idle" style="width: 100%; height: 100%;">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100" height="100" overflow="visible">
      <defs>
        <radialGradient id="fb-grad-badan" cx="40%" cy="30%" r="70%">
          <stop className="stop-1" offset="0%"/>
          <stop className="stop-2" offset="100%"/>
        </radialGradient>
        <!-- Specular highlight (upper-left gloss for 3D sphere effect) -->
        <radialGradient id="fb-grad-specular" cx="35%" cy="25%" r="45%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.65)"/>
          <stop offset="60%"  stopColor="rgba(255,255,255,0.15)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
        <!-- Rim shadow (bottom-right darkening for depth) -->
        <radialGradient id="fb-grad-rim" cx="70%" cy="75%" r="55%">
          <stop offset="0%"   stopColor="rgba(0,0,0,0.22)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
        </radialGradient>
        <filter id="fb-blur-pipi" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4"/>
        </filter>
        <!-- Text/glow drop shadow for ZZZ and other text elements -->
        <filter id="fb-text-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="2" stdDeviation="1.5" floodColor="#3b5bdb" floodOpacity="0.9"/>
        </filter>
      </defs>

      <!-- ── BACKGROUND EFFECTS ── -->

      <!-- Api Roket (semangat) -->
      <g className="api-roket">
        <path d="M 80 195 C 88 170 100 158 100 158 C 100 158 112 170 120 195 Z" fill="#fcc419"/>
        <path d="M 85 195 C 92 175 100 163 100 163 C 100 163 108 175 115 195 Z" fill="#ff922b"/>
        <path d="M 88 195 C 94 180 100 170 100 170 C 100 170 106 180 112 195 Z" fill="#ff6b6b"/>
      </g>

      <!-- Aura Api (olahraga) -->
      <g className="aura-api">
        <ellipse cx="100" cy="168" rx="85" ry="18" fill="#ff6b6b" opacity="0.35"/>
        <ellipse cx="100" cy="172" rx="60" ry="12" fill="#ff922b" opacity="0.4"/>
      </g>

      <!-- Awan Hujan (sedih) -->
      <g className="awan-hujan">
        <circle cx="60"  cy="32" r="22" fill="#dee2e6"/>
        <circle cx="85"  cy="20" r="28" fill="#dee2e6"/>
        <circle cx="115" cy="20" r="28" fill="#dee2e6"/>
        <circle cx="140" cy="32" r="22" fill="#dee2e6"/>
        <circle cx="160" cy="44" r="16" fill="#dee2e6"/>
        <g className="tetes-hujan">
          <line x1="72"  y1="52" x2="66"  y2="74" stroke="#74c0fc" strokeWidth="3" strokeLinecap="round"/>
          <line x1="100" y1="48" x2="94"  y2="70" stroke="#74c0fc" strokeWidth="3" strokeLinecap="round"/>
          <line x1="128" y1="48" x2="122" y2="70" stroke="#74c0fc" strokeWidth="3" strokeLinecap="round"/>
          <line x1="150" y1="55" x2="144" y2="77" stroke="#74c0fc" strokeWidth="3" strokeLinecap="round"/>
        </g>
      </g>

      <!-- Jam Menunggu (menunggu) -->
      <g className="jam-menunggu">
        <circle cx="165" cy="38" r="26" fill="white" stroke="#20c997" strokeWidth="4"/>
        <line x1="165" y1="38" x2="165" y2="16" stroke="#20c997" strokeWidth="3.5" strokeLinecap="round" className="jarum-jam"/>
        <line x1="165" y1="38" x2="183" y2="38" stroke="#20c997" strokeWidth="3.5" strokeLinecap="round"/>
        <circle cx="165" cy="38" r="4" fill="#20c997"/>
        <!-- Tick marks -->
        <line x1="165" y1="14" x2="165" y2="18" stroke="#20c997" strokeWidth="2"/>
        <line x1="165" y1="58" x2="165" y2="62" stroke="#20c997" strokeWidth="2"/>
        <line x1="141" y1="38" x2="145" y2="38" stroke="#20c997" strokeWidth="2"/>
        <line x1="185" y1="38" x2="189" y2="38" stroke="#20c997" strokeWidth="2"/>
      </g>

      <!-- Kembang Api (semangat) -->
      <g className="kembang-api">
        <g transform="translate(18,45)">
          <line x1="0" y1="0" x2="0"  y2="-18" stroke="#ff922b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="0" y1="0" x2="13" y2="-13" stroke="#ffd43b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="0" y1="0" x2="18" y2="0"   stroke="#ff922b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="0" y1="0" x2="0"  y2="18"  stroke="#ffd43b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="0" y1="0" x2="-13" y2="-13" stroke="#ff6b6b" strokeWidth="3" strokeLinecap="round"/>
        </g>
        <g transform="translate(182,42)">
          <line x1="0" y1="0" x2="0"   y2="-18" stroke="#ffd43b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="0" y1="0" x2="-13" y2="-13" stroke="#ff922b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="0" y1="0" x2="-18" y2="0"   stroke="#ffd43b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="0" y1="0" x2="13"  y2="-13" stroke="#ff6b6b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="0" y1="0" x2="0"   y2="18"  stroke="#ff922b" strokeWidth="3" strokeLinecap="round"/>
        </g>
        <g transform="translate(22,162)">
          <circle cx="0" cy="0" r="4" fill="#ff6b6b"/>
          <line x1="0" y1="0" x2="0"  y2="-14" stroke="#ff6b6b" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="0" y1="0" x2="10" y2="-10" stroke="#ffd43b" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="0" y1="0" x2="14" y2="0"   stroke="#ff922b" strokeWidth="2.5" strokeLinecap="round"/>
        </g>
      </g>

      <!-- Hati Banyak (senang) -->
      <g className="hati-banyak">
        <path d="M 22 70 A 8 8 0 0 1 38 70 A 8 8 0 0 1 54 70 Q 54 82 38 94 Q 22 82 22 70 Z" fill="#ff8787" opacity="0.9"/>
        <path d="M 155 25 A 7 7 0 0 1 169 25 A 7 7 0 0 1 183 25 Q 183 35 169 45 Q 155 35 155 25 Z" fill="#ff8787" opacity="0.9"/>
        <path d="M 8 128 A 5 5 0 0 1 18 128 A 5 5 0 0 1 28 128 Q 28 136 18 144 Q 8 136 8 128 Z" fill="#ff8787" opacity="0.7"/>
      </g>

      <!-- Elemen Mikir (fokus) -->
      <g className="elemen-mikir">
        <g className="bohlam">
          <path d="M 90 18 Q 100 0 110 18 Q 116 32 106 44 L 94 44 Q 84 32 90 18 Z" fill="#fcc419"/>
          <rect x="96" y="44" width="8" height="10" rx="3" fill="#adb5bd"/>
          <line x1="93" y1="52" x2="107" y2="52" stroke="#adb5bd" strokeWidth="2"/>
        </g>
        <g className="rumus">
          <text x="5" y="38" fill="#845ef7" fontSize="18" fontWeight="bold" fontFamily="monospace">E=mc²</text>
          <text x="168" y="60" fill="#845ef7" fontSize="26" fontWeight="bold">∞</text>
          <text x="172" y="20" fill="#845ef7" fontSize="22" fontWeight="bold">∑</text>
        </g>
      </g>

      <!-- Asap Kepala (kesal) -->
      <g className="asap-kepala">
        <circle cx="65"  cy="18" r="9"  fill="#adb5bd" opacity="0.8"/>
        <circle cx="100" cy="8"  r="13" fill="#adb5bd" opacity="0.8"/>
        <circle cx="135" cy="18" r="9"  fill="#adb5bd" opacity="0.8"/>
        <circle cx="82"  cy="4"  r="7"  fill="#ced4da" opacity="0.6"/>
        <circle cx="118" cy="4"  r="7"  fill="#ced4da" opacity="0.6"/>
      </g>

      <!-- Sparkles Senang -->
      <g className="sparkles-senang">
        <path d="M 24 90 L 28 100 L 18 100 Z" fill="#ffd43b"/>
        <path d="M 176 90 L 180 100 L 170 100 Z" fill="#ffd43b"/>
        <path d="M 14 140 L 18 150 L 8 150 Z"  fill="#ffd43b"/>
        <path d="M 186 135 L 190 145 L 180 145 Z" fill="#ffd43b"/>
        <circle cx="20"  cy="60" r="3" fill="#ffd43b"/>
        <circle cx="180" cy="60" r="3" fill="#ffd43b"/>
        <circle cx="10"  cy="115" r="2" fill="#ffd43b"/>
        <circle cx="190" cy="115" r="2" fill="#ffd43b"/>
      </g>

      <!-- Holo Rings (fokus) -->
      <g className="holo-rings" style="transformOrigin:100px 110px">
        <ellipse className="ring-1" cx="100" cy="110" rx="96" ry="30" fill="none" stroke="#339af0" strokeWidth="2" opacity="0.5" style="transformOrigin:100px 110px"/>
        <ellipse className="ring-2" cx="100" cy="110" rx="78" ry="24" fill="none" stroke="#845ef7" strokeWidth="1.5" opacity="0.4" style="transformOrigin:100px 110px"/>
      </g>

      <!-- ── BADAN UTAMA ── -->
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z"
            fill="url(#fb-grad-badan)"/>
      <!-- Specular gloss (upper-left) for 3D sphere look -->
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z"
            fill="url(#fb-grad-specular)" pointer-events="none"/>
      <!-- Rim shadow (lower-right) for depth -->
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z"
            fill="url(#fb-grad-rim)" pointer-events="none"/>

      <!-- ── AKSESORI ── -->

      <!-- Topi Tidur -->
      <g className="topi-tidur">
        <path d="M 48 42 L 142 42 L 178 62 L 148 18 Z" fill="#3b5bdb"/>
        <rect x="48" y="37" width="94" height="14" rx="7" fill="white"/>
        <circle cx="172" cy="68" r="13" fill="#fcc419"/>
        <path d="M 160 62 L 172 55 L 184 62" fill="none" stroke="#fcc419" strokeWidth="2"/>
      </g>

      <!-- Kacamata Tebal (fokus) -->
      <g className="kacamata-tebal">
        <rect x="34" y="76" width="54" height="38" rx="10" fill="rgba(255,255,255,0.35)" stroke="#212529" strokeWidth="6"/>
        <rect x="112" y="76" width="54" height="38" rx="10" fill="rgba(255,255,255,0.35)" stroke="#212529" strokeWidth="6"/>
        <line x1="88"  y1="95" x2="112" y2="95" stroke="#212529" strokeWidth="6"/>
        <line x1="8"   y1="95" x2="34"  y2="95" stroke="#212529" strokeWidth="5"/>
        <line x1="166" y1="95" x2="192" y2="95" stroke="#212529" strokeWidth="5"/>
        <line x1="40"  y1="95" x2="160" y2="95" stroke="#339af0" strokeWidth="3.5" className="garis-laser" opacity="0"/>
      </g>

      <!-- Ikat Kepala (olahraga) -->
      <g className="ikat-kepala">
        <path d="M 16 72 Q 100 92 184 72 L 178 52 Q 100 72 22 52 Z" fill="#ff6b6b"/>
        <path d="M 16 72 Q 100 92 184 72" fill="none" stroke="#fa5252" strokeWidth="2.5"/>
      </g>

      <!-- Urat Marah (kesal) -->
      <g className="urat-marah">
        <path d="M 148 48 L 158 48 L 158 38 L 163 38 L 163 48 L 173 48 L 173 53 L 163 53 L 163 63 L 158 63 L 158 53 L 148 53 Z" fill="#fa5252"/>
      </g>

      <!-- Pipi -->
      <g className="pipi-container">
        <ellipse className="pipi" cx="44"  cy="122" rx="17" ry="10" filter="url(#fb-blur-pipi)" opacity="0.75"/>
        <ellipse className="pipi" cx="156" cy="122" rx="17" ry="10" filter="url(#fb-blur-pipi)" opacity="0.75"/>
      </g>

      <!-- ── ALIS ── -->
      <g className="alis-group">
        <g className="alis-sedih">
          <path d="M 44 80 Q 60 64 76 75" fill="none" stroke="#212529" strokeWidth="5.5" strokeLinecap="round"/>
          <path d="M 156 80 Q 140 64 124 75" fill="none" stroke="#212529" strokeWidth="5.5" strokeLinecap="round"/>
        </g>
        <g className="alis-marah">
          <line x1="44" y1="74" x2="80" y2="94" stroke="#212529" strokeWidth="7" strokeLinecap="round"/>
          <line x1="156" y1="74" x2="120" y2="94" stroke="#212529" strokeWidth="7" strokeLinecap="round"/>
        </g>
        <g className="alis-fokus">
          <line x1="44" y1="80" x2="80" y2="85" stroke="#212529" strokeWidth="5" strokeLinecap="round"/>
          <line x1="156" y1="76" x2="120" y2="85" stroke="#212529" strokeWidth="5" strokeLinecap="round"/>
        </g>
      </g>

      <!-- ── MATA (default kedip) ── -->
      <g className="mata-bisa-kedip">
        <g className="mata-kiri">
          <circle cx="65" cy="95" r="14" fill="#212529"/>
          <g className="pupil-mata">
            <circle cx="68" cy="90" r="5.5" fill="#ffffff"/>
            <circle cx="60" cy="99" r="2.5" fill="#ffffff"/>
          </g>
        </g>
        <g className="mata-kanan">
          <circle cx="135" cy="95" r="14" fill="#212529"/>
          <g className="pupil-mata">
            <circle cx="132" cy="90" r="5.5" fill="#ffffff"/>
            <circle cx="140" cy="99" r="2.5" fill="#ffffff"/>
          </g>
        </g>
      </g>

      <!-- ── MATA KHUSUS ── -->
      <g className="mata-khusus">
        <!-- Sedih -->
        <g className="mata-sedih">
          <circle cx="65" cy="95" r="14" fill="#212529"/>
          <path d="M 52 95 A 13 13 0 0 0 78 95 Z" fill="#74c0fc" opacity="0.8"/>
          <circle cx="68" cy="90" r="4.5" fill="#ffffff"/>
          <circle cx="60" cy="99" r="2" fill="#ffffff"/>
          <circle cx="135" cy="95" r="14" fill="#212529"/>
          <path d="M 122 95 A 13 13 0 0 0 148 95 Z" fill="#74c0fc" opacity="0.8"/>
          <circle cx="132" cy="90" r="4.5" fill="#ffffff"/>
          <circle cx="140" cy="99" r="2" fill="#ffffff"/>
        </g>
        <!-- Fokus laser -->
        <g className="mata-fokus">
          <circle cx="65"  cy="95" r="14" fill="#212529"/>
          <circle cx="65"  cy="95" r="5"  fill="#339af0" className="mata-laser"/>
          <circle cx="135" cy="95" r="14" fill="#212529"/>
          <circle cx="135" cy="95" r="5"  fill="#339af0" className="mata-laser"/>
        </g>
        <!-- Tidur -->
        <g className="mata-tidur">
          <path d="M 50 100 L 80 100" fill="none" stroke="#212529" strokeWidth="5.5" strokeLinecap="round"/>
          <path d="M 120 100 L 150 100" fill="none" stroke="#212529" strokeWidth="5.5" strokeLinecap="round"/>
        </g>
        <!-- Olahraga (> <) -->
        <g className="mata-ngotot">
          <path d="M 48 88 L 74 100 L 48 112" fill="none" stroke="#212529" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 152 88 L 126 100 L 152 112" fill="none" stroke="#212529" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        <!-- Semangat berbinar -->
        <g className="mata-bintang">
          <circle cx="65" cy="95" r="18" fill="#212529"/>
          <circle cx="70" cy="88" r="7" fill="#ffffff"/>
          <circle cx="58" cy="102" r="3" fill="#ffffff"/>
          <circle cx="135" cy="95" r="18" fill="#212529"/>
          <circle cx="130" cy="88" r="7" fill="#ffffff"/>
          <circle cx="142" cy="102" r="3" fill="#ffffff"/>
        </g>
        <!-- Senang (^ ^) -->
        <g className="mata-senang">
          <path d="M 50 105 Q 65 84 80 105" fill="none" stroke="#212529" strokeWidth="7" strokeLinecap="round"/>
          <path d="M 120 105 Q 135 84 150 105" fill="none" stroke="#212529" strokeWidth="7" strokeLinecap="round"/>
        </g>
      </g>

      <!-- ── MULUT ── -->
      <path className="mulut" d="M 90 125 Q 100 130 110 125"
            fill="none" stroke="#212529" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>

      <!-- ── PROPERTI DEPAN ── -->

      <!-- Permen Karet (menunggu) -->
      <g className="permen-karet">
        <circle cx="100" cy="140" r="16" fill="#ffb8fc" stroke="#f06595" strokeWidth="2.5" className="balon-tiup"/>
        <g className="ledakan-permen">
          <line x1="100" y1="120" x2="100" y2="106" stroke="#f06595" strokeWidth="3" strokeLinecap="round"/>
          <line x1="100" y1="160" x2="100" y2="174" stroke="#f06595" strokeWidth="3" strokeLinecap="round"/>
          <line x1="80"  y1="140" x2="66"  y2="140" stroke="#f06595" strokeWidth="3" strokeLinecap="round"/>
          <line x1="120" y1="140" x2="134" y2="140" stroke="#f06595" strokeWidth="3" strokeLinecap="round"/>
          <line x1="86"  y1="126" x2="76"  y2="116" stroke="#f06595" strokeWidth="3" strokeLinecap="round"/>
          <line x1="114" y1="126" x2="124" y2="116" stroke="#f06595" strokeWidth="3" strokeLinecap="round"/>
          <line x1="86"  y1="154" x2="76"  y2="164" stroke="#f06595" strokeWidth="3" strokeLinecap="round"/>
          <line x1="114" y1="154" x2="124" y2="164" stroke="#f06595" strokeWidth="3" strokeLinecap="round"/>
        </g>
      </g>

      <!-- Gelembung Ingus (tidur) -->
      <path className="gelembung-ingus"
            d="M 108 108 C 130 98 136 124 116 130 C 96 136 90 118 108 108 Z"
            fill="rgba(255,255,255,0.65)" stroke="white" strokeWidth="2.5"/>

      <!-- Air Mata (sedih) -->
      <g className="air-mata-imut">
        <rect className="tetesan-mata"       x="60" y="107" width="9" height="16" rx="4.5" fill="#74c0fc"/>
        <rect className="tetesan-mata delay" x="130" y="107" width="9" height="16" rx="4.5" fill="#74c0fc"/>
      </g>

      <!-- Keringat (olahraga) -->
      <g className="keringat">
        <path d="M 168 78 C 178 93 178 106 168 106 C 158 106 158 93 168 78 Z" fill="#74c0fc"/>
        <path d="M 32  88 C 42  103 42  116 32  116 C 22  116 22  103 32  88 Z" fill="#74c0fc"/>
      </g>

      <!-- Barbel (olahraga) -->
      <g className="barbel">
        <rect x="0"   y="114" width="46" height="12" fill="#adb5bd" rx="6"/>
        <rect x="4"   y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="25"  y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="154" y="114" width="46" height="12" fill="#adb5bd" rx="6"/>
        <rect x="158" y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="179" y="99"  width="16" height="42" fill="#212529" rx="5"/>
      </g>

      <!-- Biskuit (makan) -->
      <g className="biskuit-animasi">
        <g className="biskuit-utuh">
          <circle cx="100" cy="148" r="26" fill="#e85d04"/>
          <circle cx="90"  cy="138" r="4.5" fill="#370617"/>
          <circle cx="112" cy="143" r="5.5" fill="#370617"/>
          <circle cx="94"  cy="158" r="3.5" fill="#370617"/>
          <circle cx="116" cy="155" r="4"   fill="#370617"/>
          <circle cx="103" cy="148" r="3"   fill="#370617"/>
        </g>
        <g className="biskuit-digigit">
          <path d="M 74 148 A 26 26 0 1 0 126 148 A 10 10 0 0 1 116 136 A 10 10 0 0 1 94 130 A 10 10 0 0 1 78 140 Z" fill="#e85d04"/>
          <circle cx="94"  cy="158" r="3.5" fill="#370617"/>
          <circle cx="116" cy="155" r="4"   fill="#370617"/>
          <circle cx="107" cy="162" r="3"   fill="#370617"/>
        </g>
        <g className="remah-terbang">
          <circle cx="88"  cy="142" r="4.5" fill="#e85d04"/>
          <circle cx="112" cy="136" r="3.5" fill="#e85d04"/>
          <circle cx="100" cy="130" r="5.5" fill="#e85d04"/>
          <circle cx="94"  cy="136" r="2.5" fill="#370617"/>
          <circle cx="106" cy="147" r="3"   fill="#e85d04"/>
        </g>
      </g>

      <!-- Remah Mulut (makan) -->
      <g className="remah-mulut">
        <circle cx="80"  cy="148" r="4"   fill="#d9480f"/>
        <circle cx="85"  cy="156" r="2.5" fill="#d9480f"/>
        <circle cx="120" cy="150" r="4.5" fill="#d9480f"/>
        <circle cx="116" cy="158" r="3"   fill="#d9480f"/>
        <circle cx="104" cy="163" r="3.5" fill="#370617" opacity="0.8"/>
      </g>

      <!-- ZZZ (tidur) -->
      <g className="gelembung-zzz">
        <text x="138" y="50" fill="white" fontSize="32" fontWeight="900" fontFamily="Nunito,sans-serif" filter="url(#fb-text-shadow)">Z</text>
        <text x="163" y="28" fill="white" fontSize="22" fontWeight="900" fontFamily="Nunito,sans-serif" filter="url(#fb-text-shadow)">z</text>
        <text x="178" y="12" fill="white" fontSize="15" fontWeight="900" fontFamily="Nunito,sans-serif" filter="url(#fb-text-shadow)">z</text>
      </g>

    </svg>
  </div>`;

  // Replace the default mouth with the active one dynamically, and fix className to class for raw HTML
  svgContent = svgContent.replace(
    /fb-grad-badan/g, `fb-grad-badan-${uid}`
  ).replace(
    /fb-grad-specular/g, `fb-grad-specular-${uid}`
  ).replace(
    /fb-grad-rim/g, `fb-grad-rim-${uid}`
  ).replace(
    /fb-blur-pipi/g, `fb-blur-pipi-${uid}`
  ).replace(
    /fb-text-shadow/g, `fb-text-shadow-${uid}`
  ).replace(
    /className="/g,
    'class="'
  ).replace(
    /strokeWidth="/g,
    'stroke-width="'
  ).replace(
    /strokeLinecap="/g,
    'stroke-linecap="'
  ).replace(
    /strokeLinejoin="/g,
    'stroke-linejoin="'
  ).replace(
    /stopColor="/g,
    'stop-color="'
  ).replace(
    /style="transformOrigin:/g,
    'style="transform-origin:'
  ).replace(
    /d="M 90 125 Q 100 130 110 125"/g,
    `d="${activeObj.mouth}"`
  ).replace(
    /class="state-idle"/g,
    `class="hp-buddy-svg-wrap state-${activeObj.svgState}"`
  );

  return (
    <div
      className={`fb-mascot-container ${interactiveState || mood} ${isHovered ? 'hovered' : ''} ${!isAnimated ? 'paused' : ''}`}
      style={cssVars as React.CSSProperties}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onClick={handlePet}
    >
      {showSpeech && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%) translateY(-10px)',
          background: 'rgba(5,5,16,0.97)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
          zIndex: 10,
          pointerEvents: 'none',
          opacity: 1,
          animation: 'melayangHalus 3s infinite ease-in-out'
        }}>
          {showSpeech}
        </div>
      )}
      <div 
        style={{ 
          width: 100, 
          height: 100, 
          transform: `scale(${size / 100})`, 
          transformOrigin: 'center',
          flexShrink: 0
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: svgContent }} style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="hp-buddy-bayangan" style={{ bottom: '-15px' }} />
      {activeObj.svgState === 'sedih' && <div className="hp-buddy-genangan" style={{ bottom: '-20px' }} />}
    </div>
  );
});

export default BeeMascot;

export function getMoodColor(mood: string): string {
  return stateMapping[mood]?.color || stateMapping['neutral'].color;
}
