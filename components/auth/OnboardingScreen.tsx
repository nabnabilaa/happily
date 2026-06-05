"use client";

import React, { useState } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import BeeMascot from "@/components/ui/BeeMascot";

interface OnboardingScreenProps {
  onFinish: () => void;
  userName: string;
}

export default function OnboardingScreen({ onFinish, userName }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Hai, " + userName + "! 👋",
      text: "Selamat datang di Bee Flow. Aku Bee, teman perjalananmu untuk kerja lebih sehat.",
      mood: 'happy' as const,
      speech: "Siap jadi lebih hebat hari ini?"
    },
    {
      title: "Addictive tapi Sehat 🍎",
      text: "Kita akan fokus ke progress kecil setiap hari. Bukan kerja keras sampai tipes, tapi kerja cerdas biar tetap happy.",
      mood: 'surprised' as const,
      speech: "Penting banget buat jaga mood!"
    },
    {
      title: "Mulai dengan Senyum 😊",
      text: "Setiap pagi kita akan check-in mood & energi. Ini membantu Bee kasih saran kerja yang pas buat kamu.",
      mood: 'happy' as const,
      speech: "Yuk, kita mulai petualangannya!"
    }
  ];

  const current = steps[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: HP_TOKENS.paper,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center'
    }}>
      <div className="hp-stagger">
        <div style={{ marginBottom: 40 }}>
          <BeeMascot mood={current.mood} size={120} showSpeech={current.speech} />
        </div>

        <div style={{ ...HP_TEXT.display, fontSize: 32, marginBottom: 16 }}>{current.title}</div>
        <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, lineHeight: 1.6, marginBottom: 48, maxWidth: 300 }}>
          {current.text}
        </div>

        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 300 }}>
          {step > 0 && (
            <button 
              onClick={() => setStep(step - 1)}
              style={{
                flex: 1, padding: '16px', borderRadius: 16, border: `1.5px solid ${HP_TOKENS.line}`,
                background: HP_TOKENS.card, color: HP_TOKENS.inkSoft, fontFamily: HP_FONT, fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Kembali
            </button>
          )}
          <button 
            onClick={() => step < steps.length - 1 ? setStep(step + 1) : onFinish()}
            style={{
              flex: 2, padding: '16px', borderRadius: 16, border: 'none',
              background: HP_TOKENS.yellow, color: HP_TOKENS.ink, fontFamily: HP_FONT, fontWeight: 800,
              cursor: 'pointer', boxShadow: `0 8px 24px ${HP_TOKENS.yellow}40`
            }}
          >
            {step < steps.length - 1 ? 'Lanjut' : 'Ayo Mulai! 🚀'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 40 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? HP_TOKENS.yellow : HP_TOKENS.line,
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
