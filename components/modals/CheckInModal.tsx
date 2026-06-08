"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT,
  HP_MOODS,
  HP_ENERGY,
  HP_QUICK_TAGS
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Modal from "@/components/ui/Modal";
import BeeMascot from "@/components/ui/BeeMascot";

import { queueOfflineCheckIn, queueOfflineXP } from "@/lib/offlineSync";

interface CheckInModalProps {
  onClose: () => void;
}

const primaryBtn: React.CSSProperties = {
  padding: '14px', borderRadius: 99, border: 'none', background: HP_TOKENS.sage,
  color: '#F4F7F9', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
  boxShadow: `0 4px 14px ${HP_TOKENS.sageSoft}`,
};

const ghostBtn: React.CSSProperties = {
  padding: '14px', borderRadius: 99, border: `1.5px solid ${HP_TOKENS.line}`, background: '#FFFFFF',
  color: HP_TOKENS.inkSoft, fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
};

export default function CheckInModal({ onClose }: CheckInModalProps) {
  const { state, updateState, awardXP, user, notify } = useHP();
  const [mood, setMood] = useState(state?.mood || null);
  const [energy, setEnergy] = useState(state?.energy || null);
  const [tag, setTag] = useState(state?.tag || null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const save = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // 1. Update client context state immediately so UI changes without delay
    updateState({ mood, energy, tag, lastMoodCheckIn: new Date().toISOString() });

    if (typeof window !== "undefined" && !navigator.onLine) {
      // Offline mode: Queue check-in and XP locally
      if (user?.id) {
        await queueOfflineCheckIn(user.id, mood!, energy, tag);
        await queueOfflineXP(user.id, 'mood_checkin', 'Daily mood check-in');
        notify("Offline Check-In", "Tersimpan lokal. Akan disinkronkan otomatis saat online.", "warning");
      }
      setIsSubmitting(false);
      onClose();
      return;
    }

    // Online mode: Persist mood to database
    try {
      const response = await fetch('/api/mood/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, mood, energy, tag })
      });
      
      if (!response.ok) {
        // API returned error — fallback to offline queue instead of crashing
        console.warn("API checkin returned non-OK status:", response.status);
        if (user?.id) {
          await queueOfflineCheckIn(user.id, mood!, energy, tag);
          await queueOfflineXP(user.id, 'mood_checkin', 'Daily mood check-in');
        }
        notify("Check-In Tersimpan", "Tersimpan lokal karena kendala server. Akan disinkronkan otomatis.", "warning");
      } else {
        await awardXP('mood_checkin', 'Daily mood check-in');
        notify("Check-In Berhasil 🎉", "Mood dan energimu hari ini sudah dicatat!", "success");
      }
    } catch (e) {
      console.error('Failed to save mood, queuing offline:', e);
      if (user?.id) {
        await queueOfflineCheckIn(user.id, mood!, energy, tag);
        await queueOfflineXP(user.id, 'mood_checkin', 'Daily mood check-in');
        notify("Check-In Tersimpan", "Tersimpan lokal karena kendala koneksi server.", "warning");
      }
    } finally {
      setIsSubmitting(false);
    }

    onClose();
  };

  if (!state) return null;

  return (
    <Modal onClose={onClose} noPadding>
      <div style={{ padding: '32px 20px 24px', display: 'flex', flexDirection: 'column', minHeight: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <BeeMascot mood="happy" size={80} />
        </div>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sage, fontWeight: 800 }}>
          LANGKAH {step} DARI 3
        </div>
        <div style={{ ...HP_TEXT.display, fontSize: 26, marginTop: 8 }}>
          {step === 1 && 'Gimana perasaanmu?'}
          {step === 2 && 'Energi kamu kayak gimana?'}
          {step === 3 && 'Satu kata aja — apa yang paling terasa?'}
        </div>
        <div style={{ ...HP_TEXT.body, fontSize: 14, marginTop: 6 }}>
          Tidak ada jawaban benar/salah. Santai aja 🌱
        </div>

        <div style={{ flex: 1 }}>
          {step === 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 26 }}>
              {(state?.moods || HP_MOODS).map(m => (
                <button key={m.key} onClick={() => setMood(m.key)} style={{
                  flex: 1, padding: '16px 4px', borderRadius: 18,
                  background: mood === m.key ? HP_TOKENS.sage : HP_TOKENS.card,
                  border: `1.5px solid ${mood === m.key ? HP_TOKENS.sage : HP_TOKENS.line}`,
                  cursor: 'pointer', fontFamily: HP_FONT, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
                  transition: 'all 180ms', transform: mood === m.key ? 'scale(1.05)' : 'scale(1)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HPGlyph name={m.glyph} size={30} color={mood === m.key ? '#fff' : HP_TOKENS[m.tone as keyof typeof HP_TOKENS] || HP_TOKENS.ink} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: mood === m.key ? '#fff' : HP_TOKENS.inkSoft }}>{m.label}</div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 26 }}>
              {(state?.energyOpts || HP_ENERGY).map(e => (
                <button key={e.key} onClick={() => setEnergy(e.key)} style={{
                  padding: 16, borderRadius: 16, background: HP_TOKENS.card,
                  border: `1.5px solid ${energy === e.key ? HP_TOKENS.sage : HP_TOKENS.line}`,
                  cursor: 'pointer', fontFamily: HP_FONT, textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: e.key === 'low' ? HP_TOKENS.blueSoft : e.key === 'mid' ? HP_TOKENS.sageSoft : HP_TOKENS.yellowSoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <HPGlyph name={e.key === 'low' ? 'moon' : e.key === 'mid' ? 'activity' : 'zap'} size={20} color={HP_TOKENS.ink} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{e.label}</div>
                    <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 2 }}>{e.hint}</div>
                  </div>
                  {energy === e.key && (
                    <div style={{ width: 22, height: 22, borderRadius: 11, background: HP_TOKENS.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <HPGlyph name="check" size={14} color="#F4F7F9" stroke={2.5}/>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 26 }}>
              {HP_QUICK_TAGS.map(t => (
                <button key={t} onClick={() => setTag(t)} style={{
                  padding: '10px 16px', borderRadius: 99,
                  background: tag === t ? HP_TOKENS.sage : HP_TOKENS.card,
                  border: `1.5px solid ${tag === t ? HP_TOKENS.sage : HP_TOKENS.line}`,
                  color: tag === t ? '#fff' : HP_TOKENS.ink,
                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>{t}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 24 }}>
          {step > 1 && <button onClick={() => setStep(step - 1)} style={{ ...ghostBtn, flex: 1 }}>Kembali</button>}
          <button
            disabled={(step === 1 && !mood) || (step === 2 && !energy) || isSubmitting}
            onClick={() => step < 3 ? setStep(step + 1) : save()}
            style={{
              ...primaryBtn, flex: 2,
              opacity: (step === 1 && !mood) || (step === 2 && !energy) || isSubmitting ? 0.4 : 1,
            }}>
            {step < 3 ? 'Lanjut' : isSubmitting ? 'Menyimpan...' : 'Selesai'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

