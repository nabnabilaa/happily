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
  const { state, updateState, awardXP, user, notify } = useHP();
  const [mood, setMood] = useState('calm');
  const [productivity, setProductivity] = useState('mid');
  const [workLife, setWorkLife] = useState('ok');
  const [blockers, setBlockers] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);

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
    if (isSubmitting) return;
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
    
    notify("Refleksi Disimpan ✅", "Kerja bagus hari ini! Waktunya istirahat.", "success");
    onClose();
  };

  const renderSelector = (title: string, options: any[], value: string, onChange: (k: string) => void) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...HP_TEXT.small, fontWeight: 800, fontSize: 12, color: HP_TOKENS.inkFade, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="hp-tap"
            style={{
              flex: 1, minWidth: 'fit-content',
              padding: '10px 14px', borderRadius: 16,
              background: value === opt.key ? HP_TOKENS.sageWash : HP_TOKENS.card,
              border: `1.5px solid ${value === opt.key ? HP_TOKENS.sage : HP_TOKENS.lineSoft}`,
              cursor: 'pointer', transition: '0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: value === opt.key ? `0 4px 12px ${HP_TOKENS.sageSoft}` : 'none'
            }}
          >
            <div style={{ fontSize: 18 }}>{opt.emoji || <HPGlyph name={opt.glyph} size={18} color={value === opt.key ? HP_TOKENS.sage : HP_TOKENS.inkFade}/>}</div>
            <div style={{ ...HP_TEXT.small, fontSize: 12, fontWeight: value === opt.key ? 800 : 700, color: value === opt.key ? HP_TOKENS.sage : HP_TOKENS.inkMute }}>{opt.label}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const priorities = state?.priorities || [];
  const done = priorities.filter((p: any) => p.done);
  const totalCount = priorities.length;

  return (
    <Modal onClose={onClose} noPadding>
      {/* 1. Header Banner (Edge-to-Edge) */}
      <div style={{
        background: `linear-gradient(135deg, ${HP_TOKENS.sageSoft} 0%, ${HP_TOKENS.sageWash} 100%)`,
        padding: '32px 24px 40px',
        position: 'relative',
        overflow: 'hidden',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}>
        <div style={{ position: 'absolute', right: -20, top: -10, opacity: 0.1, transform: 'scale(2)' }}>
          <BeeMascot mood="happy" size={150} />
        </div>
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
          <BeeMascot mood={done.length === totalCount && totalCount > 0 ? "excited" : "happy"} size={70} />
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 22, color: HP_TOKENS.ink, marginBottom: 4 }}>
              Tutup Hari (Clock Out)
            </div>
            <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkSoft, maxWidth: 220, lineHeight: 1.4 }}>
              Waktunya istirahat! Refleksi sejenak untuk pikiran yang lebih jernih.
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 40px', marginTop: -20, position: 'relative', zIndex: 2 }}>
        
        {/* 2. Visual Progress Bar */}
        <HPCard padding={20} style={{ marginBottom: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.06)', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Target vs Realisasi</div>
            <div style={{ 
              ...HP_TEXT.small,
              background: done.length === totalCount && totalCount > 0 ? HP_TOKENS.sage : HP_TOKENS.sageWash, 
              color: done.length === totalCount && totalCount > 0 ? '#fff' : HP_TOKENS.sage, 
              padding: '4px 10px', borderRadius: 100, fontWeight: 800, fontSize: 12 
            }}>
              {totalCount > 0 ? Math.round((done.length / totalCount) * 100) : 0}% Selesai
            </div>
          </div>

          <div style={{ width: '100%', height: 10, background: HP_TOKENS.lineSoft, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ 
              width: totalCount > 0 ? `${(done.length / totalCount) * 100}%` : '0%', 
              height: '100%', 
              background: HP_TOKENS.sage, 
              borderRadius: 10,
              transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)' 
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(showAllTasks ? priorities : priorities.slice(0, 3)).map((p: any) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ 
                  marginTop: 2,
                  width: 16, height: 16, borderRadius: 8, 
                  background: p.done ? HP_TOKENS.sage : HP_TOKENS.lineSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {p.done && <HPGlyph name="check" size={10} color="#fff" />}
                </div>
                <div style={{ 
                  ...HP_TEXT.body, fontSize: 13, 
                  textDecoration: p.done ? 'line-through' : 'none',
                  color: p.done ? HP_TOKENS.inkFade : HP_TOKENS.ink,
                  flex: 1, lineHeight: 1.4
                }}>
                  {p.title}
                </div>
              </div>
            ))}
            
            {totalCount > 3 && (
              <button 
                onClick={() => setShowAllTasks(!showAllTasks)}
                className="hp-tap"
                style={{ 
                  background: 'none', border: 'none', padding: '8px 0 0', textAlign: 'center',
                  ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 800, cursor: 'pointer',
                  width: '100%', marginTop: 4
                }}
              >
                {showAllTasks ? "SEMBUNYIKAN" : `TAMPILKAN ${totalCount - 3} TASK LAINNYA`}
              </button>
            )}

            {done.length < totalCount && (
              <button 
                onClick={onClose}
                className="hp-tap"
                style={{
                  width: '100%', marginTop: 12, padding: '12px', borderRadius: 14,
                  background: 'transparent', color: HP_TOKENS.inkFade, border: `1.5px dashed ${HP_TOKENS.line}`,
                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Tunggu, saya mau selesaikan sisanya!
              </button>
            )}
          </div>
        </HPCard>

        {/* 3. Reflection Selectors - Sleeker Grid */}
        <div style={{ background: HP_TOKENS.paper, borderRadius: 20, padding: 20, border: `1px solid ${HP_TOKENS.line}`, marginBottom: 24 }}>
          {renderSelector("Perasaanmu?", HP_MOODS, mood, setMood)}
          {renderSelector("Produktivitas?", PRODUCTIVITY_OPTS, productivity, setProductivity)}
          {renderSelector("Work-Life Balance?", WORKLIFE_OPTS, workLife, setWorkLife)}
          
          <div style={{ marginTop: 16 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 14, marginBottom: 8 }}>Hambatan Hari Ini? <span style={{ fontWeight: 400, fontSize: 12, color: HP_TOKENS.inkMute }}>(Opsional)</span></div>
            <textarea
              value={blockers} 
              onChange={e => setBlockers(e.target.value)} 
              rows={2}
              placeholder="Ceritakan kendalamu jika ada..."
              style={inputStyle}
            />
          </div>
        </div>

        {/* 4. Save Button */}
        <button 
          onClick={handleFinish} 
          disabled={isSubmitting}
          style={{
            width: '100%', padding: 20, borderRadius: 24,
            background: HP_TOKENS.primary, color: '#fff', border: 'none',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: isSubmitting ? 'default' : 'pointer',
            boxShadow: `0 8px 24px ${HP_TOKENS.primarySoft}`,
            opacity: isSubmitting ? 0.7 : 1,
            transition: '0.2s',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10
          }}
          className="hp-tap"
        >
          {isSubmitting ? "Menyimpan..." : (
            <>
              Simpan & Tutup Hari
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 100, fontSize: 12 }}>+30 XP</div>
            </>
          )}
        </button>

      </div>
    </Modal>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', marginTop: 8, padding: 12, borderRadius: 12,
  border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
  outline: 'none', resize: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink,
  boxSizing: 'border-box',
};
