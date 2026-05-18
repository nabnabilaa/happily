"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface Props {
  onClose: () => void;
  skillName: string;
}

const BLOOM_LEVELS = [
  { level: 'C1', label: 'Remembering', desc: 'Mengingat fakta dasar dan konsep.' },
  { level: 'C2', label: 'Understanding', desc: 'Menjelaskan ide atau konsep.' },
  { level: 'C3', label: 'Applying', desc: 'Menggunakan informasi dalam situasi baru.' },
  { level: 'C4', label: 'Analyzing', desc: 'Menarik koneksi antar ide.' },
  { level: 'C5', label: 'Evaluating', desc: 'Menjustifikasi keputusan atau tindakan.' },
  { level: 'C6', label: 'Creating', desc: 'Menghasilkan karya baru atau orisinal.' },
];

export default function SkillAssessmentModal({ onClose, skillName }: Props) {
  const { updateState } = useHP();
  const [step, setStep] = useState(0); // 0: intro, 1: mcq, 2: essay, 3: result
  const [mcqAnswer, setMcqAnswer] = useState<string | null>(null);
  const [essayText, setEssayText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const startAssessment = () => setStep(1);
  const toEssay = () => setStep(2);
  
  const finishAssessment = () => {
    setAnalyzing(true);
    // Simulate AI analyzing Bloom's Taxonomy
    setTimeout(() => {
      setStep(3);
      setAnalyzing(false);
      
      // Update the skill in state (dummy update to C+1 level)
      updateState((s: any) => ({
        ...s,
        skills: s.skills.map((sk: any) => {
          if (sk.name === skillName) {
            const currentIdx = BLOOM_LEVELS.findIndex(b => b.level === sk.bloomLevel);
            const nextIdx = Math.min(currentIdx + 1, BLOOM_LEVELS.length - 1);
            return {
              ...sk,
              bloomLevel: BLOOM_LEVELS[nextIdx].level,
              bloomLabel: BLOOM_LEVELS[nextIdx].label,
              current: Math.min(sk.current + 10, 100)
            };
          }
          return sk;
        })
      }));
    }, 2000);
  };

  if (analyzing) {
    return (
      <Modal onClose={onClose} title="AI Assessment">
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ 
            width: 60, height: 60, borderRadius: 30, background: HP_TOKENS.blueSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            animation: 'hpPulse 2s infinite'
          }}>
            <HPGlyph name="sparkle" size={30} color={HP_TOKENS.blue}/>
          </div>
          <div style={{ ...HP_TEXT.h, fontSize: 18 }}>Menganalisis jawabanmu...</div>
          <div style={{ ...HP_TEXT.body, fontSize: 14, marginTop: 8, color: HP_TOKENS.inkMute }}>
            Menentukan tingkat kompetensi berdasarkan Taksonomi Bloom (C1-C6).
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title={`Assessment: ${skillName}`}>
      {step === 0 && (
        <div style={{ padding: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
            <div style={{ ...HP_TEXT.h, fontSize: 18 }}>Ukur Level Skill Kamu</div>
            <div style={{ ...HP_TEXT.body, fontSize: 14, marginTop: 8, color: HP_TOKENS.inkMute }}>
              Flow AI akan mengajukan beberapa pertanyaan untuk menentukan kematangan skill kamu menggunakan standar Taksonomi Bloom.
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {BLOOM_LEVELS.slice(0, 3).map(b => (
              <div key={b.level} style={{ display: 'flex', gap: 12, padding: 12, background: HP_TOKENS.blueWash, borderRadius: 12 }}>
                <div style={{ fontWeight: 900, color: HP_TOKENS.blue }}>{b.level}</div>
                <div>
                  <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{b.label}</div>
                  <div style={{ ...HP_TEXT.tiny, fontSize: 10, color: HP_TOKENS.inkMute }}>{b.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', fontSize: 12, color: HP_TOKENS.inkFade }}>...hingga C6 Creating</div>
          </div>

          <button onClick={startAssessment} style={{
            width: '100%', padding: 16, borderRadius: 16, border: 'none',
            background: HP_TOKENS.blue, color: '#fff', fontFamily: HP_FONT, fontWeight: 800, cursor: 'pointer'
          }} className="hp-tap">
            Mulai Survey AI
          </button>
        </div>
      )}

      {step === 1 && (
        <div style={{ padding: 10 }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, marginBottom: 8 }}>Pertanyaan 1: Pilihan Ganda</div>
          <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 20, lineHeight: 1.4 }}>
            Manakah dari berikut ini yang merupakan prinsip utama dalam mengelola {skillName} di lingkungan skala besar?
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['A. Dokumentasi yang kaku dan tidak berubah', 'B. Skalabilitas dan konsistensi komponen', 'C. Desain yang unik untuk setiap halaman', 'D. Menghindari penggunaan library eksternal'].map(opt => (
              <button 
                key={opt}
                onClick={() => setMcqAnswer(opt)}
                style={{
                  padding: 16, borderRadius: 14, border: `1.5px solid ${mcqAnswer === opt ? HP_TOKENS.blue : HP_TOKENS.line}`,
                  background: mcqAnswer === opt ? HP_TOKENS.blueSoft : '#fff',
                  textAlign: 'left', fontFamily: HP_FONT, fontSize: 14, color: HP_TOKENS.ink, cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <button 
            disabled={!mcqAnswer}
            onClick={toEssay} 
            style={{
              width: '100%', padding: 16, borderRadius: 16, border: 'none', marginTop: 24,
              background: HP_TOKENS.blue, color: '#fff', fontFamily: HP_FONT, fontWeight: 800, cursor: 'pointer',
              opacity: !mcqAnswer ? 0.5 : 1
            }} 
            className="hp-tap"
          >
            Lanjut ke Essay
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ padding: 10 }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, marginBottom: 8 }}>Pertanyaan 2: Open Ended (Essay)</div>
          <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 20, lineHeight: 1.4 }}>
            Ceritakan satu skenario di mana kamu harus mengambil keputusan sulit terkait {skillName}. Apa pertimbanganmu dan hasilnya?
          </div>
          
          <textarea 
            autoFocus
            value={essayText}
            onChange={e => setEssayText(e.target.value)}
            placeholder="Tulis jawabanmu di sini..."
            style={{
              width: '100%', height: 160, padding: 16, borderRadius: 16, border: `1.5px solid ${HP_TOKENS.line}`,
              fontFamily: HP_FONT, fontSize: 14, outline: 'none', resize: 'none', background: HP_TOKENS.card
            }}
          />

          <button 
            disabled={essayText.length < 10}
            onClick={finishAssessment} 
            style={{
              width: '100%', padding: 16, borderRadius: 16, border: 'none', marginTop: 24,
              background: HP_TOKENS.blue, color: '#fff', fontFamily: HP_FONT, fontWeight: 800, cursor: 'pointer',
              opacity: essayText.length < 10 ? 0.5 : 1
            }} 
            className="hp-tap"
          >
            Selesai & Analisis AI
          </button>
        </div>
      )}

      {step === 3 && (
        <div style={{ padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🚀</div>
          <div style={{ ...HP_TEXT.h, fontSize: 20 }}>Hasil Analisis Flow AI</div>
          <div style={{ ...HP_TEXT.body, fontSize: 15, marginTop: 8, color: HP_TOKENS.inkSoft }}>
            Berdasarkan jawabanmu, tingkat kompetensi kamu pada <b>{skillName}</b> adalah:
          </div>
          
          <div style={{ 
            margin: '24px 0', padding: '24px 16px', borderRadius: 24, 
            background: `linear-gradient(135deg, ${HP_TOKENS.blue}, #003399)`,
            color: '#fff', boxShadow: `0 12px 30px ${HP_TOKENS.blueSoft}`
          }}>
            <div style={{ fontSize: 40, fontWeight: 900 }}>C4</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Analyzing</div>
            <div style={{ fontSize: 13, marginTop: 12, opacity: 0.9, lineHeight: 1.5 }}>
              Kamu mampu menganalisis hubungan antar komponen dan memecahkan masalah kompleks secara sistematis.
            </div>
          </div>

          <button onClick={onClose} style={{
            width: '100%', padding: 16, borderRadius: 16, border: 'none',
            background: HP_TOKENS.blueWash, color: HP_TOKENS.blue, fontFamily: HP_FONT, fontWeight: 800, cursor: 'pointer'
          }} className="hp-tap">
            Mantap, Simpan!
          </button>
        </div>
      )}
    </Modal>
  );
}
