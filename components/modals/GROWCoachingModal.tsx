"use client";

import React, { useState, useEffect, useRef } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface Props {
  onClose: () => void;
  roleContext?: string; // e.g. 'hr', 'manager', 'employee'
  topic?: string;
}

type Step = 'summary' | 'goal' | 'reality' | 'options' | 'will' | 'done';

export default function GROWCoachingModal({ onClose, roleContext = 'employee', topic }: Props) {
  const { state, updateState } = useHP();
  const [step, setStep] = useState<Step>('summary');
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'ai' | 'user', content: string}[]>([]);
  
  const [answers, setAnswers] = useState({
    summary: "",
    goal: "",
    reality: "",
    options: "",
    will: ""
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  const getAIPrompt = (currentStep: Step) => {
    switch (currentStep) {
      case 'summary':
        return `Halo! Aku Flow AI. Silakan masukkan poin-poin utama atau rangkuman hasil diskusi 1-on-1 kamu bersama coach/manajer tadi. Aku akan membantumu membedahnya menggunakan kerangka GROW.`;
      case 'goal':
        return `Terima kasih atas rangkumannya! Berdasarkan diskusi tersebut, mari kita mulai framework GROW. Apa Goal (tujuan spesifik) yang ingin kamu capai? ${topic ? `(Topik saran: ${topic})` : ''}`;
      case 'reality':
        if (roleContext === 'hr') {
          return `Baik, tujuan yang bagus! Sekarang Reality. Berdasarkan data feedback dan metrik organisasi kita saat ini, apa hambatan terbesar yang menghalangi pencapaian tujuan tersebut?`;
        }
        return `Menarik. Sekarang Reality. Bagaimana kondisi nyatanya saat ini? Hambatan apa yang sedang kamu hadapi untuk mencapai Goal tersebut?`;
      case 'options':
        return `Aku paham kondisinya. Sekarang Options. Menurutmu, apa saja 2-3 opsi tindakan yang bisa dilakukan untuk mengatasi hambatan tersebut?`;
      case 'will':
        return `Ide yang bagus! Terakhir, Will (Komitmen). Dari opsi-opsi tadi, apa 1 langkah konkret (action item) pertama yang AKAN kamu lakukan minggu ini?`;
      case 'done':
        return `Sesi selesai! Rangkuman dan komitmenmu sudah kucatat di Logbook (+25 Poin). Semangat mengeksekusi rencana tersebut! 🚀`;
    }
  };

  useEffect(() => {
    if (chatHistory.length === 0) {
      setChatHistory([{ role: 'ai', content: getAIPrompt('summary') }]);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  if (!state) return null;

  const handleNext = () => {
    if (!inputText.trim()) return;

    const newHistory: {role: 'ai' | 'user', content: string}[] = [...chatHistory, { role: 'user', content: inputText }];
    setChatHistory(newHistory);
    
    // Save answer
    const currentAnswers = { ...answers, [step]: inputText };
    setAnswers(currentAnswers);
    
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let nextStep: Step = step;
      if (step === 'summary') nextStep = 'goal';
      else if (step === 'goal') nextStep = 'reality';
      else if (step === 'reality') nextStep = 'options';
      else if (step === 'options') nextStep = 'will';
      else if (step === 'will') {
        nextStep = 'done';
        saveToLogbook(currentAnswers);
      }
      
      setStep(nextStep);
      setChatHistory([...newHistory, { role: 'ai', content: getAIPrompt(nextStep) }]);
    }, 1500);
  };

  const saveToLogbook = (finalAnswers: any) => {
    const now = new Date();
    const newLog = {
      id: Date.now(),
      type: 'coaching_reflection',
      content: `GROW Coaching Session:\n\nCatatan 1-on-1: ${finalAnswers.summary}\n\nGoal: ${finalAnswers.goal}\nReality: ${finalAnswers.reality}\nOptions: ${finalAnswers.options}\nWill: ${finalAnswers.will}`,
      points: 25,
      date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      day: now.toLocaleDateString('id-ID', { weekday: 'long' }),
      time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    updateState((s: any) => ({
      ...s,
      logbook: [newLog, ...(s.logbook || [])],
      points: (s.points || 0) + 25,
      user: { ...s.user, points: (s.user?.points || 0) + 25 }
    }));
  };

  return (
    <Modal onClose={onClose} title="GROW Coaching Session">
      <div style={{ display: 'flex', flexDirection: 'column', height: '65vh' }}>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {['summary', 'goal', 'reality', 'options', 'will'].map((s, i) => {
            const steps = ['summary', 'goal', 'reality', 'options', 'will', 'done'];
            const currentIndex = steps.indexOf(step);
            const isActive = i <= currentIndex;
            return (
              <div key={s} style={{ 
                flex: 1, height: 6, borderRadius: 3,
                background: isActive ? HP_TOKENS.blue : HP_TOKENS.lineSoft,
                transition: 'background 0.3s ease'
              }}/>
            );
          })}
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {chatHistory.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'ai' && (
                <div style={{
                  width: 36, height: 36, borderRadius: 18, background: HP_TOKENS.blueWash,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <HPGlyph name="sparkle" size={18} color={HP_TOKENS.blue}/>
                </div>
              )}
              <div style={{ 
                background: msg.role === 'user' ? HP_TOKENS.blue : HP_TOKENS.card, 
                border: msg.role === 'user' ? 'none' : `1.5px solid ${HP_TOKENS.lineSoft}`, 
                padding: '12px 16px', 
                borderRadius: msg.role === 'user' ? '16px 0 16px 16px' : '0 16px 16px 16px', 
                maxWidth: '85%', ...HP_TEXT.body, color: msg.role === 'user' ? '#fff' : HP_TOKENS.ink, fontSize: 14, lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', gap: 12 }}>
               <div style={{
                width: 36, height: 36, borderRadius: 18, background: HP_TOKENS.blueWash,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <HPGlyph name="sparkle" size={18} color={HP_TOKENS.blue}/>
              </div>
              <div style={{ 
                background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.lineSoft}`, 
                padding: '12px 16px', borderRadius: '0 16px 16px 16px', 
                display: 'flex', gap: 4, alignItems: 'center'
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: HP_TOKENS.inkMute, animation: 'hpPulse 1s infinite' }}/>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: HP_TOKENS.inkMute, animation: 'hpPulse 1s infinite 0.2s' }}/>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: HP_TOKENS.inkMute, animation: 'hpPulse 1s infinite 0.4s' }}/>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        {step !== 'done' ? (
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <textarea
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tulis balasanmu..."
              disabled={isTyping}
              style={{
                flex: 1, height: 60, padding: '12px 16px', borderRadius: 16,
                border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
                resize: 'none', outline: 'none', background: '#fff'
              }}
            />
            <button 
              onClick={handleNext}
              disabled={!inputText.trim() || isTyping}
              className="hp-tap"
              style={{
                width: 60, height: 60, borderRadius: 16, border: 'none',
                background: inputText.trim() && !isTyping ? HP_TOKENS.blue : HP_TOKENS.lineSoft,
                color: '#fff', cursor: inputText.trim() && !isTyping ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}
            >
              <HPGlyph name="sparkle" size={24} color="#fff"/>
            </button>
          </div>
        ) : (
          <button 
            onClick={onClose}
            className="hp-tap"
            style={{
              marginTop: 16, width: '100%', padding: 16, borderRadius: 16, border: 'none',
              background: HP_TOKENS.blueWash, color: HP_TOKENS.blue, 
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer'
            }}
          >
            Tutup
          </button>
        )}

      </div>
    </Modal>
  );
}
