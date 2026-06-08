"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_FONT, HP_FONT_DISPLAY, HP_TEXT } from "@/lib/constants";
import BeeMascot from "@/components/ui/BeeMascot";

interface OnboardingScreenProps {
  onFinish: () => void;
  userName: string;
}

export default function OnboardingScreen({ onFinish, userName }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const steps = [
    {
      type: 'hero' as const,
      title: `Hai, ${userName}! 👋`,
      text: "Senang ketemu kamu! Aku Buddy, di sini buat bantu harimu lebih teratur dan produktif.",
      mood: 'happy' as const,
      speech: "Siap jadi lebih hebat hari ini?",
    },
    {
      type: 'choice' as const,
      title: "Kamu kerja sebagai apa?",
      subtitle: "Ini bantu aku sesuaikan pengalaman yang paling pas buat kamu",
      choices: [
        { key: 'dev', icon: '💻', label: 'Developer / IT' },
        { key: 'design', icon: '🎨', label: 'Desainer / Kreatif' },
        { key: 'marketing', icon: '📊', label: 'Marketing / Sales' },
        { key: 'manager', icon: '📋', label: 'Manajer / Tim Lead' },
        { key: 'other', icon: '🏢', label: 'Lainnya' },
      ],
      mood: 'happy' as const,
    },
    {
      type: 'hero' as const,
      title: "Addictive tapi Sehat 🍎",
      text: "Kita akan fokus ke progress kecil setiap hari. Bukan kerja keras sampai tipes, tapi kerja cerdas biar tetap happy.",
      mood: 'surprised' as const,
      speech: "Penting banget buat jaga mood!",
    },
    {
      type: 'hero' as const,
      title: "Mulai dengan Senyum 😊",
      text: "Setiap pagi kita akan check-in mood & energi. Ini membantu Buddy kasih saran kerja yang pas buat kamu.",
      mood: 'happy' as const,
      speech: "Yuk, kita mulai petualangannya!",
    },
  ];

  const current = steps[step];
  const totalSteps = steps.length;
  const progressPct = ((step + 1) / totalSteps) * 100;
  const isLastStep = step === totalSteps - 1;
  const isChoiceStep = current.type === 'choice';
  const canProceed = isChoiceStep ? !!selectedChoice : true;

  const handleNext = () => {
    if (isLastStep) {
      onFinish();
    } else {
      setStep(step + 1);
      if (steps[step + 1]?.type !== 'choice') {
        setSelectedChoice(null);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: HP_TOKENS.paper,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Progress Bar */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <div style={{ height: 6, background: '#E5DDD8', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: '#FF6B35',
            borderRadius: 100,
            width: `${progressPct}%`,
            transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
        <p style={{ fontSize: 13, color: HP_TOKENS.inkMute, fontWeight: 700 }}>
          LANGKAH {step + 1} / {totalSteps}
        </p>
      </div>

      {/* Content area */}
      <div
        key={step}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 24px 0',
          overflowY: 'auto',
          animation: 'hpFadeUp 0.45s ease both',
        }}
      >
        {current.type === 'hero' ? (
          /* ═══ Hero Step ═══ */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            {/* Mascot */}
            <div style={{ marginBottom: 28, animation: 'hpFloat 2.8s ease-in-out infinite' }}>
              <BeeMascot mood={current.mood} size={120} showSpeech={current.speech} />
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily: HP_FONT_DISPLAY,
              fontSize: 28,
              fontWeight: 700,
              color: HP_TOKENS.ink,
              lineHeight: 1.25,
              marginBottom: 14,
              letterSpacing: -0.5,
            }}>
              {current.title}
            </h2>

            {/* Text */}
            <p style={{
              fontSize: 15,
              color: HP_TOKENS.inkMute,
              lineHeight: 1.65,
              maxWidth: 320,
              fontWeight: 600,
            }}>
              {current.text}
            </p>
          </div>
        ) : (
          /* ═══ Choice Step ═══ */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{
              fontFamily: HP_FONT_DISPLAY,
              fontSize: 25,
              fontWeight: 700,
              color: HP_TOKENS.ink,
              lineHeight: 1.25,
              marginBottom: 6,
            }}>
              {current.title}
            </h2>
            {'subtitle' in current && (
              <p style={{ fontSize: 14, color: HP_TOKENS.inkMute, marginBottom: 20, fontWeight: 600 }}>
                {current.subtitle}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
              {'choices' in current && current.choices?.map(choice => {
                const isOn = selectedChoice === choice.key;
                return (
                  <button
                    key={choice.key}
                    onClick={() => setSelectedChoice(choice.key)}
                    className="hp-tap"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '16px 20px',
                      borderRadius: 18,
                      border: `2.5px solid ${isOn ? '#FF6B35' : '#E5DDD8'}`,
                      background: isOn ? 'rgba(255,107,53,0.06)' : HP_TOKENS.card,
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{choice.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: HP_TOKENS.ink, flex: 1, lineHeight: 1.35 }}>
                      {choice.label}
                    </span>
                    {isOn && (
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: '#FF6B35',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0,
                        animation: 'hpPopIn 0.25s cubic-bezier(.34,1.56,.64,1) both',
                      }}>
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ padding: '16px 24px 44px', display: 'flex', gap: 12 }}>
        {step > 0 && (
          <button
            onClick={() => { setStep(step - 1); setSelectedChoice(null); }}
            className="hp-tap"
            style={{
              flex: 1, padding: '16px', borderRadius: 100,
              border: `2px solid #E5DDD8`,
              background: HP_TOKENS.card, color: HP_TOKENS.inkMute,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 15,
              cursor: 'pointer',
            }}
          >
            ← Kembali
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="hp-tap"
          style={{
            flex: 2, padding: '17px', borderRadius: 100, border: 'none',
            background: canProceed ? '#FF6B35' : '#E5DDD8',
            color: canProceed ? '#fff' : '#B8B0A8',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 16,
            cursor: canProceed ? 'pointer' : 'not-allowed',
            boxShadow: canProceed ? '0 8px 28px rgba(255,107,53,0.38)' : 'none',
            letterSpacing: 0.3,
            transition: 'all 0.2s',
          }}
        >
          {isLastStep ? 'Ayo Mulai! 🚀' : 'Lanjut →'}
        </button>
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingBottom: 20 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 8, height: 8, borderRadius: 4,
            background: i === step ? '#FF6B35' : '#E5DDD8',
            transition: 'all 0.3s ease'
          }} />
        ))}
      </div>
    </div>
  );
}
