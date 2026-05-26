"use client";

import React, { useState } from "react";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT,
  HP_MOODS
} from "@/lib/constants";
import { useHP } from "@/lib/HPContext";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import BeeMascot from "@/components/ui/BeeMascot";

interface ReflectModalProps {
  onClose: () => void;
}

export default function ReflectModal({ onClose }: ReflectModalProps) {
  const { state, updateState, awardXP, user } = useHP();
  const [mood, setMood] = useState('calm');
  const [productivity, setProductivity] = useState('mid');
  const [workLife, setWorkLife] = useState('ok');
  const [blockers, setBlockers] = useState('');

  const PRODUCTIVITY_OPTS = [
    { key: 'high', label: 'Tinggi', emoji: '🤩' },
    { key: 'mid', label: 'Sedang', emoji: '🙂' },
    { key: 'low', label: 'Rendah', emoji: '🥱' },
  ];

  const WORKLIFE_OPTS = [
    { key: 'balanced', label: 'Seimbang', emoji: '😎' },
    { key: 'ok', label: 'Lumayan', emoji: '😐' },
    { key: 'burnout', label: 'Kewalahan', emoji: '😵‍💫' },
  ];

  const handleFinish = async () => {
    const prodLabel = PRODUCTIVITY_OPTS.find(p => p.key === productivity)?.label;
    const wlLabel = WORKLIFE_OPTS.find(w => w.key === workLife)?.label;
    const moodsList = state?.moods || HP_MOODS;
    const moodLabel = moodsList.find(m => m.key === mood)?.label;
    
    const summary = `Mood: ${moodLabel}\nProduktivitas: ${prodLabel}\nWork-Life Balance: ${wlLabel}`;

    const now = new Date();
    const timestamp = {
      date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      day: now.toLocaleDateString('id-ID', { weekday: 'long' }),
      time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    // Award XP via server (single channel, not direct updateUser)
    awardXP('daily_reflection', 'Tutup Hari (Clock Out)');
    
    try {
      // Save logbook entry
      await fetch("/api/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          type: 'daily_reflection',
          title: 'Tutup Hari (Clock Out)',
          content: summary,
          points: 30,
          metadata: { 
            mood, productivity, workLife, blockers, 
            ...timestamp,
            taskCount: state?.priorities.filter((p: any) => p.done).length || 0 
          }
        })
      });

      // Auto check-out: update attendance record
      await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id })
      });

      updateState((s: any) => ({
        ...s,
        mood: mood,
        moods: [...(s.moods || []), { time: new Date().toISOString(), mood: mood }],
        logbook: [
          {
            id: Date.now(),
            type: 'daily_reflection',
            title: 'Tutup Hari (Clock Out)',
            content: summary,
            points: 30,
            metadata_json: JSON.stringify({ mood, productivity, workLife, blockers, ...timestamp }),
            created_at: now.toISOString()
          },
          ...(s.logbook || [])
        ]
      }));
      
      window.dispatchEvent(new Event('hp_db_update'));
    } catch (e) {
      console.error(e);
    }
    
    onClose();
  };

  const renderSelector = (title: string, options: any[], value: string, onChange: (k: string) => void) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...HP_TEXT.h, fontSize: 14, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {options.map(opt => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              flex: 1, padding: '16px 8px', borderRadius: 16,
              background: value === opt.key ? HP_TOKENS.sageWash : HP_TOKENS.card,
              border: `1.5px solid ${value === opt.key ? HP_TOKENS.sage : HP_TOKENS.lineSoft}`,
              cursor: 'pointer', transition: '0.2s', textAlign: 'center',
              boxShadow: value === opt.key ? `0 4px 12px ${HP_TOKENS.sageSoft}` : 'none'
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.emoji || <HPGlyph name={opt.glyph} size={24} color={value === opt.key ? HP_TOKENS.sage : HP_TOKENS.inkFade}/>}</div>
            <div style={{ ...HP_TEXT.small, fontSize: 11, fontWeight: 700, color: value === opt.key ? HP_TOKENS.sage : HP_TOKENS.inkMute }}>{opt.label}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const priorities = state?.priorities || [];
  const done = priorities.filter((p: any) => p.done);
  const totalCount = priorities.length;

  return (
    <Modal onClose={onClose} title="Tutup Hari (Clock Out)">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
        <BeeMascot mood="happy" size={60} showSpeech="Kamu hebat hari ini!" />
        <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkSoft, flex: 1 }}>
          Refleksi singkat membantu menjernihkan pikiran sebelum istirahat.
        </div>
      </div>

      {/* Target vs Realization Summary */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...HP_TEXT.h, fontSize: 14, marginBottom: 12 }}>Target vs Realisasi Hari Ini</div>
        <HPCard padding={16} style={{ background: HP_TOKENS.sageWash, border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ ...HP_TEXT.small, fontWeight: 800, color: HP_TOKENS.sage }}>{done.length} / {totalCount} Selesai</div>
            <div style={{ ...HP_TEXT.h, fontSize: 16, color: HP_TOKENS.sage }}>{totalCount > 0 ? Math.round((done.length / totalCount) * 100) : 0}%</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {priorities.slice(0, 3).map((p: any) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HPGlyph name={p.done ? "check" : "close"} size={12} color={p.done ? HP_TOKENS.sage : HP_TOKENS.inkFade} />
                <div style={{ 
                  ...HP_TEXT.small, fontSize: 12, 
                  textDecoration: p.done ? 'line-through' : 'none',
                  color: p.done ? HP_TOKENS.inkFade : HP_TOKENS.ink
                }}>
                  {p.title}
                </div>
              </div>
            ))}
            {totalCount > 3 && <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>+ {totalCount - 3} lainnya</div>}
          </div>
        </HPCard>
      </div>

      {renderSelector("Bagaimana perasaanmu saat ini?", state?.moods || HP_MOODS, mood, setMood)}
      {renderSelector("Seberapa produktif kamu hari ini?", PRODUCTIVITY_OPTS, productivity, setProductivity)}
      {renderSelector("Bagaimana keseimbangan kerjamu?", WORKLIFE_OPTS, workLife, setWorkLife)}
      
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Ada hambatan hari ini? <span style={{ fontWeight: 400, fontSize: 12, color: HP_TOKENS.inkMute }}>(Opsional)</span></div>
        <textarea
          value={blockers} 
          onChange={e => setBlockers(e.target.value)} 
          rows={2}
          placeholder="Tulis hambatanmu (jika ada)..."
          style={inputStyle}
        />
      </div>

      <button 
        onClick={handleFinish} 
        style={{
          width: '100%', padding: 18, borderRadius: 99,
          background: HP_TOKENS.sage, color: '#fff', border: 'none',
          fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
          boxShadow: `0 8px 24px ${HP_TOKENS.sageSoft}`,
        }}
        className="hp-tap"
      >
        Simpan & Tutup Hari (+30 Poin)
      </button>
    </Modal>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', marginTop: 8, padding: 12, borderRadius: 12,
  border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
  outline: 'none', resize: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink,
  boxSizing: 'border-box',
};
