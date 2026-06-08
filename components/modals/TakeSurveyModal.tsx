"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";

interface TakeSurveyModalProps {
  onClose: () => void;
  survey: any;
}

export default function TakeSurveyModal({ onClose, survey }: TakeSurveyModalProps) {
  const { user, awardXP } = useHP();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const questions: any[] = survey?.questions || [];
  const isInternal = questions.length > 0;

  const updateAnswer = (qId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const allRequiredFilled = questions
    .filter(q => q.required)
    .every(q => {
      const val = answers[q.id];
      if (val === undefined || val === '') return false;
      if (q.type === 'paragraph') {
        return typeof val === 'string' && val.trim().split(/\s+/).filter(Boolean).length >= 5;
      }
      return true;
    });

  const handleSubmit = async () => {
    if (!allRequiredFilled) return;
    setSubmitting(true);
    setError('');

    try {
      const formattedAnswers = questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));

      const res = await fetch('/api/hr/surveys/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          userId: user?.id,
          answers: formattedAnswers,
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        awardXP('survey_complete', `Selesaikan survey: ${survey.title}`);
      } else {
        setError(data.error || 'Gagal menyimpan jawaban');
      }
    } catch (e) {
      setError('Terjadi kesalahan koneksi');
    }
    setSubmitting(false);
  };

  // External URL-based survey (legacy)
  if (!isInternal && survey?.url) {
    return (
      <Modal onClose={onClose} title={survey.title}>
        <div style={{ width: '100%', height: '60vh', marginTop: 10, borderRadius: 16, overflow: 'hidden', background: '#f0f0f0' }}>
          <iframe src={survey.url} width="100%" height="100%" frameBorder="0" title={survey.title}>Loading…</iframe>
        </div>
        <button onClick={() => { 
          if (submitting) return;
          setSubmitting(true);
          awardXP('survey_complete', `Survey: ${survey.title}`); 
          onClose(); 
        }} className="hp-tap" disabled={submitting} style={{
          width: '100%', padding: '16px', borderRadius: 16, marginTop: 16,
          background: HP_TOKENS.lavender, color: '#F4F7F9', border: 'none',
          fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: submitting ? 'default' : 'pointer',
          opacity: submitting ? 0.7 : 1
        }}>
          {submitting ? "Memproses..." : "Saya sudah mengisi survey & Ambil 20 Poin 🎁"}
        </button>
      </Modal>
    );
  }

  // Submitted state
  if (submitted) {
    return (
      <Modal onClose={onClose} title="✅ Terima Kasih!">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <div style={{ ...HP_TEXT.h, fontSize: 18 }}>Jawaban Terkirim!</div>
          <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
            Terima kasih sudah mengisi survey <strong>{survey.title}</strong>. Jawabanmu akan membantu perusahaan menjadi lebih baik.
          </div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sage, fontWeight: 800, marginTop: 16 }}>+20 Poin Earned 🎁</div>
          <button onClick={onClose} className="hp-tap" style={{
            marginTop: 24, padding: '14px 40px', borderRadius: 99, border: 'none',
            background: HP_TOKENS.lavender, color: '#F4F7F9',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
          }}>
            Tutup
          </button>
        </div>
      </Modal>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
    outline: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink, boxSizing: 'border-box',
  };

  return (
    <Modal onClose={onClose} title={`📋 ${survey.title}`}>
      <div style={{ marginTop: 4 }}>
        {survey.description && (
          <div style={{
            padding: '12px 16px', borderRadius: 14, marginBottom: 16,
            background: HP_TOKENS.lavenderSoft, border: `1px solid ${HP_TOKENS.lavender}20`,
            ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.ink, lineHeight: 1.5,
          }}>
            {survey.description}
          </div>
        )}

        {survey.deadline && (
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.coral, fontWeight: 800, marginBottom: 16 }}>
            ⏰ Deadline: {new Date(survey.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map((q: any, idx: number) => (
            <HPCard key={q.id} padding={16} style={{
              border: `1.5px solid ${q.required && !answers[q.id] ? `${HP_TOKENS.yellow}40` : HP_TOKENS.line}`,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8, background: HP_TOKENS.lavenderSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: HP_TOKENS.lavender, fontFamily: HP_FONT, flexShrink: 0,
                }}>{idx + 1}</div>
                <div>
                  <div style={{ ...HP_TEXT.h, fontSize: 14, lineHeight: 1.4 }}>
                    {q.question}
                    {q.required && <span style={{ color: HP_TOKENS.coral, marginLeft: 4 }}>*</span>}
                  </div>
                </div>
              </div>

              {/* Text input */}
              {q.type === 'text' && (
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={e => updateAnswer(q.id, e.target.value)}
                  placeholder="Tulis jawaban..."
                  style={inputStyle}
                />
              )}

              {/* Paragraph */}
              {q.type === 'paragraph' && (
                <div>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => updateAnswer(q.id, e.target.value)}
                    placeholder="Tulis jawaban detail (Minimal 5 kata)..."
                    style={{ ...inputStyle, minHeight: 80, resize: 'none' }}
                  />
                  {answers[q.id] && answers[q.id].trim().split(/\s+/).filter(Boolean).length < 5 && (
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.coral, marginTop: 6, fontWeight: 700 }}>
                      ⚠️ Jawaban terlalu singkat. Minimal 5 kata (saat ini {answers[q.id].trim().split(/\s+/).filter(Boolean).length} kata).
                    </div>
                  )}
                </div>
              )}

              {/* Rating */}
              {q.type === 'rating' && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 0' }}>
                  {Array.from({ length: q.maxRating || 5 }, (_, i) => i + 1).map(val => (
                    <button key={val} onClick={() => updateAnswer(q.id, val)} className="hp-tap" style={{
                      width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: answers[q.id] >= val ? HP_TOKENS.yellow : HP_TOKENS.lineSoft,
                      fontSize: 18, transition: 'all 0.2s',
                      transform: answers[q.id] >= val ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: answers[q.id] >= val ? `0 4px 12px ${HP_TOKENS.yellow}40` : 'none',
                    }}>
                      ⭐
                    </button>
                  ))}
                </div>
              )}

              {/* Yes/No */}
              {q.type === 'yes_no' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  {['Ya', 'Tidak'].map(opt => (
                    <button key={opt} onClick={() => updateAnswer(q.id, opt)} className="hp-tap" style={{
                      flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: answers[q.id] === opt
                        ? (opt === 'Ya' ? HP_TOKENS.sage : HP_TOKENS.coral)
                        : HP_TOKENS.lineSoft,
                      color: answers[q.id] === opt ? '#fff' : HP_TOKENS.inkSoft,
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, transition: '0.2s',
                    }}>
                      {opt === 'Ya' ? '✅' : '❌'} {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Multiple Choice */}
              {q.type === 'multiple_choice' && q.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt: string, oi: number) => (
                    <button key={oi} onClick={() => updateAnswer(q.id, opt)} className="hp-tap" style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: answers[q.id] === opt ? `${HP_TOKENS.lavender}15` : HP_TOKENS.lineSoft,
                      outline: answers[q.id] === opt ? `2px solid ${HP_TOKENS.lavender}` : 'none',
                      transition: '0.2s', textAlign: 'left', width: '100%',
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 9,
                        border: `2px solid ${answers[q.id] === opt ? HP_TOKENS.lavender : HP_TOKENS.line}`,
                        background: answers[q.id] === opt ? HP_TOKENS.lavender : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {answers[q.id] === opt && <HPGlyph name="check" size={10} color="#F4F7F9" />}
                      </div>
                      <span style={{ fontFamily: HP_FONT, fontWeight: 600, fontSize: 14, color: HP_TOKENS.ink }}>{opt}</span>
                    </button>
                  ))}
                </div>
              )}
            </HPCard>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16, padding: 12, borderRadius: 12,
            background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral,
            fontSize: 13, fontWeight: 700, textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!allRequiredFilled || submitting}
          className="hp-tap"
          style={{
            width: '100%', padding: '16px', borderRadius: 16, border: 'none', marginTop: 20,
            background: (!allRequiredFilled || submitting) ? HP_TOKENS.lineSoft : HP_TOKENS.lavender,
            color: (!allRequiredFilled || submitting) ? HP_TOKENS.inkMute : '#fff',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: allRequiredFilled ? '0 6px 20px rgba(123,107,181,0.3)' : 'none',
          }}
        >
          <HPGlyph name="check" size={18} color={allRequiredFilled ? '#fff' : HP_TOKENS.inkMute} />
          {submitting ? "Mengirim..." : "Kirim Jawaban & Ambil 20 Poin 🎁"}
        </button>
      </div>
    </Modal>
  );
}
