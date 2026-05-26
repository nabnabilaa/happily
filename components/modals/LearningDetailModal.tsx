"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";

interface LearningDetailModalProps {
  onClose: () => void;
}

export default function LearningDetailModal({ onClose }: LearningDetailModalProps) {
  const { awardXP, syncSkillProgress, user, state } = useHP();
  
  const [loading, setLoading] = useState(true);
  const [moduleData, setModuleData] = useState<any>(null);
  const [step, setStep] = useState(-1); // -1 = intro/loading, 0..N = slides, N+1 = quiz, N+2 = result
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<'success' | 'fail' | null>(null);

  useEffect(() => {
    // Fetch generated learning module from AI
    const fetchLearning = async () => {
      try {
        const res = await fetch('/api/learning/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            department: user?.department || 'Umum',
            mood: state?.mood || 'neutral'
          })
        });
        const data = await res.json();
        if (data.success) {
          setModuleData(data.module);
          setStep(0);
        } else {
          console.error(data.error);
          setModuleData(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLearning();
  }, [user, state]);

  const handleNextSlide = () => {
    if (step < moduleData.slides.length - 1) {
      setStep(step + 1);
    } else {
      setStep(moduleData.slides.length); // go to quiz
    }
  };

  const handleQuizSubmit = async () => {
    if (selectedAnswer === null) return;
    
    const isCorrect = selectedAnswer === moduleData.quiz.correctIndex;
    if (isCorrect) {
      setQuizResult('success');
      await awardXP('learning_complete', `Lulus Kuis: ${moduleData.title}`);
      syncSkillProgress(moduleData.topic || "Soft Skill", 10);
    } else {
      setQuizResult('fail');
    }
    setStep(moduleData.slides.length + 1); // go to result screen
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: HP_TOKENS.inkMute }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🧠</div>
          <div>AI Coach sedang menyusun materi khusus untukmu...</div>
        </div>
      );
    }

    if (!moduleData) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: HP_TOKENS.coral }}>
          Gagal mengambil materi. Coba lagi nanti.
        </div>
      );
    }

    const isQuizScreen = step === moduleData.slides.length;
    const isResultScreen = step > moduleData.slides.length;

    if (isResultScreen) {
      return (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div style={{ fontSize: 64 }}>{quizResult === 'success' ? '🎉' : '💪'}</div>
          <div style={{ ...HP_TEXT.h, fontSize: 24, marginTop: 16 }}>
            {quizResult === 'success' ? 'Luar Biasa!' : 'Tetap Semangat!'}
          </div>
          <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkMute, marginTop: 12 }}>
            {quizResult === 'success' 
              ? `Kamu berhasil memahami materi "${moduleData.title}" dan mendapatkan XP.` 
              : `Sayang sekali jawabanmu kurang tepat. Coba pahami lagi materinya besok ya!`}
          </div>
          
          <div style={{ 
            background: HP_TOKENS.paper, padding: 16, borderRadius: 12, marginTop: 24,
            border: `1.5px solid ${quizResult === 'success' ? HP_TOKENS.sage : HP_TOKENS.coral}`,
            textAlign: 'left'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8, color: HP_TOKENS.ink }}>💡 Penjelasan:</div>
            <div style={{ fontSize: 14, color: HP_TOKENS.ink }}>{moduleData.quiz.explanation}</div>
          </div>

          <button onClick={onClose} style={{
            width: '100%', marginTop: 32, padding: '16px', borderRadius: 99,
            background: HP_TOKENS.blue, color: '#fff', border: 'none',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
          }}>
            Tutup
          </button>
        </div>
      );
    }

    if (isQuizScreen) {
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.purple, fontWeight: 800 }}>KUIS PEMAHAMAN</div>
          <div style={{ ...HP_TEXT.h, fontSize: 20, marginTop: 8 }}>{moduleData.quiz.question}</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
            {moduleData.quiz.options.map((opt: string, idx: number) => (
              <button 
                key={idx}
                onClick={() => setSelectedAnswer(idx)}
                style={{
                  padding: 16, borderRadius: 12, textAlign: 'left',
                  border: selectedAnswer === idx ? `2px solid ${HP_TOKENS.purple}` : `1.5px solid ${HP_TOKENS.line}`,
                  background: selectedAnswer === idx ? `${HP_TOKENS.purple}10` : '#fff',
                  cursor: 'pointer', fontFamily: HP_FONT, fontSize: 15, color: HP_TOKENS.ink,
                  transition: 'all 0.2s'
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <button onClick={handleQuizSubmit} disabled={selectedAnswer === null} style={{
            width: '100%', marginTop: 32, padding: '16px', borderRadius: 99,
            background: selectedAnswer !== null ? HP_TOKENS.purple : HP_TOKENS.line, 
            color: selectedAnswer !== null ? '#fff' : HP_TOKENS.inkMute, border: 'none',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, 
            cursor: selectedAnswer !== null ? 'pointer' : 'not-allowed',
          }}>
            Kirim Jawaban
          </button>
        </div>
      );
    }

    // Slide Content
    const currentSlide = moduleData.slides[step];
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{moduleData.topic}</span>
          <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>
            {step + 1} / {moduleData.slides.length}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 4, marginTop: 12, marginBottom: 24 }}>
          {moduleData.slides.map((_: any, idx: number) => (
            <div key={idx} style={{ 
              height: 4, flex: 1, borderRadius: 2,
              background: idx <= step ? HP_TOKENS.blue : HP_TOKENS.line 
            }} />
          ))}
        </div>

        <div style={{ background: HP_TOKENS.paper, padding: 32, borderRadius: 24, textAlign: 'center', minHeight: 250, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{currentSlide.emoji}</div>
          <div style={{ ...HP_TEXT.h, fontSize: 22, color: HP_TOKENS.ink, marginBottom: 12 }}>
            {currentSlide.heading}
          </div>
          <div style={{ ...HP_TEXT.body, fontSize: 15, color: HP_TOKENS.ink, lineHeight: 1.6 }}>
            {currentSlide.content}
          </div>
        </div>

        <button onClick={handleNextSlide} style={{
          width: '100%', marginTop: 32, padding: '16px', borderRadius: 99,
          background: HP_TOKENS.blue, color: '#fff', border: 'none',
          fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
        }}>
          {step === moduleData.slides.length - 1 ? 'Mulai Kuis' : 'Lanjut'}
        </button>
      </div>
    );
  };

  return (
    <Modal onClose={onClose} title={moduleData ? moduleData.title : "Daily Training"}>
      {renderContent()}
    </Modal>
  );
}
