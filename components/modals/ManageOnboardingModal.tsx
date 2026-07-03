"use client";

import React, { useState, useEffect } from 'react';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';
import HPCard from '@/components/ui/HPCard';
import { useHP } from '@/lib/HPContext';
import OnboardingScreen from '@/components/auth/OnboardingScreen';

interface Props {
  onClose: () => void;
}

const DEFAULT_STEPS = [
  {tag:'⚡ LANGKAH 1 / 4',q:'Kamu di divisi apa?',hint:'Bantu aku sesuaikan pengalaman yang pas buatmu',
   opts:[{e:'💻',bg:'#EAF4FD',l:'Developer / IT'},{e:'🎨',bg:'#FAF0FF',l:'Desainer / Kreatif'},{e:'📊',bg:'#EAFAF3',l:'Marketing / Sales'},{e:'📋',bg:'#FFF5EA',l:'Manajer / Tim Lead'},{e:'📚',bg:'#F5F3FF',l:'Lainnya'}]},
  {tag:'🎯 LANGKAH 2 / 4',q:'Gimana mood kerjamu hari ini?',hint:'Cerita jujur aja, Buddy siap adaptasi buat kamu',
   opts:[{e:'⚡',bg:'#FFFAEC',l:'Super Semangat!'},{e:'😊',bg:'#EAFAF3',l:'Oke-oke aja'},{e:'😴',bg:'#EEF0FF',l:'Agak Lelah'},{e:'😤',bg:'#FAEAEA',l:'Butuh Motivasi'}]},
  {tag:'🔥 LANGKAH 3 / 4',q:'Apa tantangan terbesar kamu?',hint:'Pilih yang paling sering bikin kamu stuck',
   opts:[{e:'⏰',bg:'#FFF5EA',l:'Susah Fokus'},{e:'📬',bg:'#EAF4FD',l:'Terlalu Banyak Task'},{e:'😴',bg:'#EEF0FF',l:'Gampang Procrastinate'},{e:'🤝',bg:'#EAFAF3',l:'Koordinasi Tim'}]},
  {tag:'🚀 LANGKAH 4 / 4',q:'Mau mulai dari mana duluan?',hint:'Buddy akan siapkan workspace yang sesuai pilihanmu',
   opts:[{e:'✅',bg:'#EAFAF3',l:'Atur To-Do List'},{e:'🎯',bg:'#FFF5EA',l:'Set Target Mingguan'},{e:'⏱️',bg:'#EEF0FF',l:'Mulai Pomodoro'},{e:'📊',bg:'#EAF4FD',l:'Lihat Dashboard'}]},
];

export default function ManageOnboardingModal({ onClose }: Props) {
  const { state, updateState, user } = useHP();
  const [steps, setSteps] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (state?.onboardingConfig && state.onboardingConfig.length > 0) {
      setSteps(JSON.parse(JSON.stringify(state.onboardingConfig)));
    } else {
      setSteps(JSON.parse(JSON.stringify(DEFAULT_STEPS)));
    }
  }, [state?.onboardingConfig]);

  const handleSave = async () => {
    updateState({ onboardingConfig: steps });
    
    try {
      await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: { ...state, onboardingConfig: steps }, user, userId: user?.id })
      });
      alert('Pengaturan onboarding berhasil disimpan.');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan.');
    }
  };

  const moveStep = (index: number, dir: number) => {
    if (index + dir < 0 || index + dir >= steps.length) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + dir];
    newSteps[index + dir] = temp;
    
    newSteps.forEach((s, i) => {
      s.tag = s.tag.replace(/LANGKAH \d+ \/ \d+/, `LANGKAH ${i+1} / ${newSteps.length}`);
    });
    setSteps(newSteps);
  };

  const addStep = () => {
    const newSteps = [...steps, {
      tag: `✨ LANGKAH ${steps.length + 1} / ${steps.length + 1}`,
      q: 'Pertanyaan baru?',
      hint: 'Penjelasan tambahan...',
      opts: [{ e: '🌟', bg: '#EAF4FD', l: 'Opsi 1' }]
    }];
    newSteps.forEach((s, i) => {
      s.tag = s.tag.replace(/LANGKAH \d+ \/ \d+/, `LANGKAH ${i+1} / ${newSteps.length}`);
    });
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    newSteps.forEach((s, i) => {
      s.tag = s.tag.replace(/LANGKAH \d+ \/ \d+/, `LANGKAH ${i+1} / ${newSteps.length}`);
    });
    setSteps(newSteps);
  };

  if (previewMode) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: '#fff' }}>
        <button onClick={() => setPreviewMode(false)} style={{
          position: 'absolute', top: 20, right: 20, zIndex: 100001,
          padding: '12px 24px', background: HP_TOKENS.ink, color: '#fff',
          borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: HP_FONT, fontWeight: 700
        }}>
          Tutup Preview
        </button>
        <OnboardingScreen 
          userName="Calon Karyawan" 
          skipSplash 
          onFinish={() => { alert('Onboarding selesai!'); setPreviewMode(false); }}
          previewConfig={steps}
        />
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div style={{
        background: HP_TOKENS.paper,
        width: '100%', maxWidth: 640,
        height: '90vh',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: '32px 24px',
        display: 'flex', flexDirection: 'column',
        animation: 'hpSlideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 24 }}>Kelola Onboarding</div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4 }}>
              Atur pertanyaan dan opsi saat karyawan pertama login.
            </div>
          </div>
          <button onClick={onClose} className="hp-tap" style={{
            width: 36, height: 36, borderRadius: 18, background: HP_TOKENS.lineSoft,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <HPGlyph name="close" size={16} color={HP_TOKENS.ink} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
          {steps.map((step, idx) => (
            <HPCard key={idx} padding={20} style={{ marginBottom: 16, border: `1.5px solid ${HP_TOKENS.lineSoft}` }}>
              {editingIndex === idx ? (
                <div>
                  <input 
                    value={step.q} 
                    onChange={e => { const n = [...steps]; n[idx].q = e.target.value; setSteps(n); }}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${HP_TOKENS.line}`, marginBottom: 8, fontFamily: HP_FONT, fontSize: 16, fontWeight: 700 }}
                  />
                  <input 
                    value={step.hint} 
                    onChange={e => { const n = [...steps]; n[idx].hint = e.target.value; setSteps(n); }}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${HP_TOKENS.line}`, marginBottom: 16, fontFamily: HP_FONT, fontSize: 14 }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 8 }}>Opsi Jawaban</div>
                  {step.opts.map((opt: any, oidx: number) => (
                    <div key={oidx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input value={opt.e} onChange={e => { const n = [...steps]; n[idx].opts[oidx].e = e.target.value; setSteps(n); }} style={{ width: 50, padding: 8, borderRadius: 8, border: `1px solid ${HP_TOKENS.line}`, textAlign: 'center' }} />
                      <input value={opt.bg} onChange={e => { const n = [...steps]; n[idx].opts[oidx].bg = e.target.value; setSteps(n); }} style={{ width: 80, padding: 8, borderRadius: 8, border: `1px solid ${HP_TOKENS.line}` }} />
                      <input value={opt.l} onChange={e => { const n = [...steps]; n[idx].opts[oidx].l = e.target.value; setSteps(n); }} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${HP_TOKENS.line}` }} />
                      <button onClick={() => { const n = [...steps]; n[idx].opts.splice(oidx,1); setSteps(n); }} style={{ background: 'transparent', border: 'none', color: HP_TOKENS.coral, cursor: 'pointer' }}>Hapus</button>
                    </div>
                  ))}
                  <button onClick={() => { const n = [...steps]; n[idx].opts.push({e:'✨', bg:'#f0f0f0', l:'Opsi baru'}); setSteps(n); }} style={{ background: HP_TOKENS.lineSoft, padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', marginBottom: 16 }}>+ Tambah Opsi</button>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingIndex(null)} style={{ background: HP_TOKENS.lavender, color: '#fff', padding: '8px 16px', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer' }}>Selesai Edit</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={() => moveStep(idx, -1)} disabled={idx===0} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: idx===0?0.2:1 }}>⬆️</button>
                    <button onClick={() => moveStep(idx, 1)} disabled={idx===steps.length-1} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: idx===steps.length-1?0.2:1 }}>⬇️</button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: HP_TOKENS.lavender, marginBottom: 4 }}>LANGKAH {idx + 1}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: HP_TOKENS.ink }}>{step.q}</div>
                    <div style={{ fontSize: 13, color: HP_TOKENS.inkSoft, marginTop: 2, marginBottom: 12 }}>{step.hint}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {step.opts.map((o: any, oi: number) => (
                        <div key={oi} style={{ padding: '4px 10px', borderRadius: 20, background: o.bg, fontSize: 12, fontWeight: 600 }}>{o.e} {o.l}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={() => setEditingIndex(idx)} style={{ background: HP_TOKENS.lineSoft, border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Edit</button>
                    <button onClick={() => removeStep(idx)} style={{ background: 'transparent', border: `1px solid ${HP_TOKENS.coral}40`, color: HP_TOKENS.coral, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Hapus</button>
                  </div>
                </div>
              )}
            </HPCard>
          ))}
          <button onClick={addStep} style={{ width: '100%', padding: 16, border: `2px dashed ${HP_TOKENS.line}`, borderRadius: 16, background: 'transparent', cursor: 'pointer', fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 32 }}>+ Tambah Langkah Baru</button>
        </div>

        <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: `1px solid ${HP_TOKENS.line}` }}>
          <button onClick={() => setPreviewMode(true)} style={{ flex: 1, padding: 16, borderRadius: 16, background: HP_TOKENS.lineSoft, color: HP_TOKENS.ink, border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: HP_FONT }}>
            👁️ Preview
          </button>
          <button onClick={handleSave} style={{ flex: 2, padding: 16, borderRadius: 16, background: HP_TOKENS.lavender, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: HP_FONT }}>
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
}
