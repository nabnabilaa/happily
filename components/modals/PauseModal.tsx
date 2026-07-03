"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import { useHP } from "@/lib/HPContext";
import BeeMascot from "@/components/ui/BeeMascot";

interface PauseModalProps {
  onClose: () => void;
}

export default function PauseModal({ onClose }: PauseModalProps) {
  const { awardXP, notify, updateState } = useHP();
  const [phase, setPhase] = useState<'setup' | 'inhale' | 'hold' | 'exhale' | 'done'>('setup');
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [targetCycles, setTargetCycles] = useState(5);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundMode, setSoundMode] = useState<'off' | 'Nada ZEN' | 'musik air' | 'suara alam' | 'white noise'>('Nada ZEN');
  const [hasCompleted, setHasCompleted] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Cleanup audio
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // Sync Audio with isPlaying, soundMode, and phase
  useEffect(() => {
    // We want the audio to play if we are in an active session, OR if we are in 'done' phase.
    // If user explicitly paused during session (isPlaying = false and phase != 'done' and phase != 'setup'), it pauses.
    const shouldPlay = soundMode !== 'off' && (isPlaying || phase === 'done');

    if (shouldPlay) {
      if (!audioRef.current) {
        audioRef.current = new Audio(`/audio/${soundMode}.mp3`);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
      } else if (!audioRef.current.src.includes(encodeURIComponent(soundMode))) {
        audioRef.current.src = `/audio/${soundMode}.mp3`;
      }
      audioRef.current.play().catch(e => console.log('Audio playback prevented:', e));
    } else {
      if (audioRef.current) audioRef.current.pause();
    }
  }, [isPlaying, soundMode, phase]);

  // Handle completion exactly once
  useEffect(() => {
    if (phase === 'done' && !hasCompleted) {
      setHasCompleted(true);
      handleComplete();
      setIsPlaying(false);
    }
  }, [phase, hasCompleted]);

  useEffect(() => {
    if (!isPlaying || phase === 'setup' || phase === 'done') return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        } else {
          // Time to switch phases
          let nextPhase: 'inhale' | 'hold' | 'exhale' | 'done' = 'inhale';
          let nextDuration = 4;

          if (phase === 'inhale') {
            nextPhase = 'hold';
            nextDuration = 7;
          } else if (phase === 'hold') {
            nextPhase = 'exhale';
            nextDuration = 8;
          } else if (phase === 'exhale') {
            const nextCycle = currentCycle + 1;
            setCurrentCycle(nextCycle);
            if (nextCycle >= targetCycles) {
              setPhase('done');
              setIsPlaying(false);
              return 0;
            } else {
              nextPhase = 'inhale';
              nextDuration = 4;
            }
          }

          setPhase(nextPhase);
          return nextDuration;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, phase, currentCycle, targetCycles]);

  const handleStart = () => {
    setPhase('inhale');
    setSecondsLeft(4);
    setCurrentCycle(0);
    setHasCompleted(false);
    setIsPlaying(true);
  };

  const handleComplete = async () => {
    await awardXP('focus_session', 'Mindful Breathing');
    notify("Latihan Selesai 🧘‍♂️", "Kamu mendapat +5 Poin! Tubuh dan pikiranmu sudah lebih tenang.", "success");
    updateState((s: any) => ({
      ...s,
      logbook: [...(s.logbook || []), { type: 'pause_session', created_at: new Date().toISOString(), title: 'Mindful Breathing' }],
    }));
  };

  interface PhaseInfo {
    label: string;
    desc: string;
    scale: number;
    color: string;
    bg: string;
    gradient?: string;
    halo?: string;
    shadow?: string;
  }

  const phaseInfo: Record<string, PhaseInfo> = {
    setup: {
      label: 'Teknik Napas 4-7-8',
      desc: 'Atur jumlah putaran sebelum mulai',
      scale: 1,
      color: HP_TOKENS.inkSoft,
      bg: '#f8fafc',
    },
    inhale: {
      label: 'Tarik Napas',
      desc: 'Perlahan melalui hidung (4 detik)',
      scale: 1.5,
      color: '#0ea5e9', // Vibrant Blue
      bg: '#eff6ff',
      gradient: 'linear-gradient(135deg, #7dd3fc 0%, #0ea5e9 100%)',
      halo: 'rgba(56, 189, 248, 0.2)',
      shadow: 'rgba(14, 165, 233, 0.3)'
    },
    hold: {
      label: 'Tahan',
      desc: 'Fokus dan rasakan ketenangan (7 detik)',
      scale: 1.5,
      color: '#8b5cf6', // Purple
      bg: '#f5f3ff',
      gradient: 'linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%)',
      halo: 'rgba(167, 139, 250, 0.2)',
      shadow: 'rgba(139, 92, 246, 0.3)'
    },
    exhale: {
      label: 'Hembuskan',
      desc: 'Lepaskan secara perlahan lewat mulut (8 detik)',
      scale: 1,
      color: '#10b981', // Emerald Green
      bg: '#ecfdf5',
      gradient: 'linear-gradient(135deg, #6ee7b7 0%, #10b981 100%)',
      halo: 'rgba(52, 211, 153, 0.2)',
      shadow: 'rgba(16, 185, 129, 0.3)'
    },
    done: {
      label: 'Selesai!',
      desc: 'Kamu telah menyelesaikan semua putaran',
      scale: 1,
      color: HP_TOKENS.sage,
      bg: '#f1f8f5',
    }
  };

  const currentInfo = phaseInfo[phase];

  const memoizedMascot = useMemo(() => {
    return (
      <BeeMascot 
        mood="idle" 
        size={100} 
      />
    );
  }, [phase]);

  return (
    <div style={{
      position: 'fixed', 
      inset: 0, 
      zIndex: 9999,
      background: currentInfo.bg,
      display: 'flex', 
      flexDirection: 'column', 
      fontFamily: HP_FONT, 
      animation: 'hpFadeIn 500ms ease-out',
      transition: 'background 2s ease-in-out',
    }}>
      <style>{`
        @keyframes blobMorph {
          0%   { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          33%  { border-radius: 40% 60% 60% 40% / 40% 50% 50% 60%; }
          66%  { border-radius: 55% 45% 45% 55% / 30% 65% 35% 70%; }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        }
        @keyframes blobSpin {
          to { transform: rotate(1turn); }
        }
      `}</style>
      {/* Top Header */}
      <div style={{ 
        padding: '56px 24px 20px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 20, 
            background: 'rgba(255,255,255,0.8)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <HPGlyph name="sparkle" size={20} color={phase === 'setup' ? HP_TOKENS.inkFade : currentInfo.color} />
          </div>
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 18, color: '#334155' }}>Pojok Tenang</div>
            <div style={{ ...HP_TEXT.tiny, color: '#64748B', fontWeight: 600, letterSpacing: 0.5 }}>Metode 4-7-8</div>
          </div>
        </div>
        <button 
          onClick={onClose} 
          style={{
            width: 44, height: 44, borderRadius: 22, border: 'none',
            background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }} 
        >
          <HPGlyph name="close" size={20} color="#64748B"/>
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '20px 24px' }}>
        
        {phase === 'setup' ? (
          <div style={{ animation: 'hpFadeIn 400ms ease-out' }}>
            <div style={{ ...HP_TEXT.h, fontSize: 26, color: HP_TOKENS.ink }}>
              Atur Siklus Pernapasan
            </div>
            <div style={{ ...HP_TEXT.body, fontSize: 15, color: HP_TOKENS.inkMute, marginTop: 8, marginBottom: 40 }}>
              Satu siklus terdiri dari Tarik (4s) - Tahan (7s) - Hembus (8s)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 50 }}>
              <button 
                onClick={() => setTargetCycles(Math.max(1, targetCycles - 1))}
                style={{ width: 50, height: 50, borderRadius: 25, border: `1.5px solid ${HP_TOKENS.line}`, background: '#fff', fontSize: 24, cursor: 'pointer', color: HP_TOKENS.ink }}
              >-</button>
              
              <div style={{ width: 100, textAlign: 'center' }}>
                <div style={{ ...HP_TEXT.display, fontSize: 48, color: HP_TOKENS.sage }}>{targetCycles}</div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>PUTARAN</div>
              </div>

              <button 
                onClick={() => setTargetCycles(Math.min(20, targetCycles + 1))}
                style={{ width: 50, height: 50, borderRadius: 25, border: `1.5px solid ${HP_TOKENS.line}`, background: '#fff', fontSize: 24, cursor: 'pointer', color: HP_TOKENS.ink }}
              >+</button>
            </div>

            <div style={{ ...HP_TEXT.body, fontSize: 12, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 12, marginTop: -20, letterSpacing: 0.5 }}>
              PILIH SUARA PENDUKUNG
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 40, maxWidth: 400, margin: '0 auto 40px' }}>
              {[
                { id: 'off', label: 'Hening', icon: '🔇' },
                { id: 'Nada ZEN', label: 'Nada ZEN', icon: '🧘' },
                { id: 'musik air', label: 'Musik Air', icon: '💧' },
                { id: 'suara alam', label: 'Suara Alam', icon: '🍃' },
                { id: 'white noise', label: 'White Noise', icon: '📻' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSoundMode(opt.id as any)}
                  style={{
                    padding: '10px 16px', borderRadius: 99, 
                    border: `1.5px solid ${soundMode === opt.id ? HP_TOKENS.sage : HP_TOKENS.line}`,
                    background: soundMode === opt.id ? HP_TOKENS.sageWash : '#fff',
                    color: soundMode === opt.id ? HP_TOKENS.sage : HP_TOKENS.inkMute,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s',
                    boxShadow: soundMode === opt.id ? `0 4px 12px ${HP_TOKENS.sage}20` : 'none'
                  }}
                >
                  <span style={{ fontSize: 14 }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            <button 
              onClick={handleStart}
              style={{
                padding: '16px 40px', borderRadius: 99, border: 'none',
                background: HP_TOKENS.sage, color: '#fff',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 18, cursor: 'pointer',
                boxShadow: `0 8px 24px ${HP_TOKENS.sage}40`
              }}
            >
              Mulai Sekarang
            </button>
          </div>
        ) : phase === 'done' ? (
          <div style={{ animation: 'hpFadeIn 400ms ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 360 }}>
            <BeeMascot mood="happy" size={120} showSpeech="Wah hebat banget!" />
            
            <div style={{ 
              marginTop: 32, padding: 24, borderRadius: 24, 
              background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
              border: `1px solid ${HP_TOKENS.line}`
            }}>
              <div style={{ ...HP_TEXT.h, fontSize: 20, color: HP_TOKENS.ink, marginBottom: 12 }}>
                Pikiranmu sudah jernih kembali 🌱
              </div>
              <div style={{ ...HP_TEXT.body, fontSize: 14, color: HP_TOKENS.inkMute, lineHeight: 1.6, textAlign: 'left' }}>
                Latihan <b>{targetCycles} putaran</b> ini ngasih tambahan oksigen ke otakmu. 
                Sangat berguna kalau kamu lagi ngerasa marah, overthinking, atau kewalahan. 
                Dengan pikiran yang jernih, keputusanmu bakal jauh lebih tepat!
              </div>
              
              <div style={{ marginTop: 24, padding: '12px', borderRadius: 12, background: HP_TOKENS.sageWash, color: HP_TOKENS.sage, fontWeight: 700, fontSize: 14 }}>
                🎉 +5 Poin Well-being
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Cycle count */}
            <div style={{ 
              ...HP_TEXT.tiny, 
              background: 'rgba(255,255,255,0.9)',
              padding: '8px 20px',
              borderRadius: 99,
              color: '#64748B', 
              fontWeight: 800, 
              letterSpacing: '0.1em',
              marginBottom: 50,
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              border: '1px solid rgba(255,255,255,0.5)'
            }}>
              PUTARAN {currentCycle + 1} / {targetCycles}
            </div>

            {/* Animated Liquid Blob */}
            <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Halo Glow */}
              <div style={{
                position: 'absolute',
                inset: -20,
                borderRadius: '50%',
                background: currentInfo.halo,
                filter: 'blur(25px)',
                transition: 'background 2s ease, transform 1s ease'
              }} />
              
              <div style={{
                position: 'relative',
                width: 160,
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
                zIndex: 10,
                transform: `scale(${currentInfo.scale})`,
                transition: phase === 'inhale' ? 'transform 4s cubic-bezier(0.4, 0, 0.2, 1)' 
                          : phase === 'hold' ? 'transform 7s linear' 
                          : 'transform 8s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                {/* Layer 1: Core Color */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: currentInfo.gradient,
                  animation: 'blobMorph 8s ease-in-out infinite, blobSpin 20s linear infinite',
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  transition: 'background 2s ease, box-shadow 2s ease',
                  boxShadow: `0 15px 35px ${currentInfo.shadow}`
                }} />
                
                {/* Layer 2: 3D Glossy Effect */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)',
                  animation: 'blobMorph 12s ease-in-out infinite reverse, blobSpin 25s linear infinite reverse',
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  boxShadow: 'inset 10px 10px 20px rgba(255, 255, 255, 0.8), inset -10px -20px 20px rgba(0, 0, 0, 0.1)',
                  pointerEvents: 'none'
                }} />

                {/* Timer Text */}
                <div style={{ 
                  position: 'relative',
                  zIndex: 20,
                  ...HP_TEXT.h, 
                  fontSize: 56, 
                  fontWeight: 800, 
                  color: 'white', 
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: '0 4px 15px rgba(0,0,0,0.15)',
                  letterSpacing: -2
                }}>
                  {secondsLeft}
                </div>
              </div>
            </div>

            {/* Coach Panel integrating BeeMascot with Phase Text */}
            <div style={{ 
              marginTop: 60, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 20, 
              background: 'rgba(255,255,255,0.7)', 
              padding: '16px 32px 16px 20px', 
              borderRadius: 30,
              boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
              border: '1px solid rgba(255,255,255,0.5)',
              maxWidth: 400,
              minHeight: 100
            }}>
              <div style={{ flexShrink: 0, marginTop: -20, marginBottom: -20 }}>
                {memoizedMascot}
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 22, color: currentInfo.color, transition: 'color 1s ease-in-out', marginBottom: 4 }}>
                  {currentInfo.label}
                </div>
                <div style={{ ...HP_TEXT.body, fontSize: 14, color: '#64748B', lineHeight: 1.4 }}>
                  {currentInfo.desc}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 80 }}>
        {phase === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320, margin: '0 auto' }}>
            <button 
              onClick={() => {
                setPhase('setup');
                setCurrentCycle(0);
              }}
              style={{
                padding: '16px', borderRadius: 99, border: `2px solid ${HP_TOKENS.sage}`,
                background: 'transparent', color: HP_TOKENS.sage,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 16, 
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Ulangi Latihan
            </button>
            <button 
              onClick={onClose}
              style={{
                padding: '16px', borderRadius: 99, border: 'none',
                background: HP_TOKENS.sage, color: '#fff',
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 16, 
                cursor: 'pointer', boxShadow: `0 4px 16px ${HP_TOKENS.sage}50`
              }}
            >
              Selesai & Kembali
            </button>
          </div>
        )}

        {(phase === 'inhale' || phase === 'hold' || phase === 'exhale') && (
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: 'transparent', border: 'none', color: '#64748B',
              fontFamily: HP_FONT, fontSize: 15, fontWeight: 600, padding: 12,
              cursor: 'pointer', textDecoration: 'underline'
            }}
          >
            {isPlaying ? 'Jeda Sementara' : 'Lanjutkan Latihan'}
          </button>
        )}
      </div>
    </div>
  );
}
