"use client";

import React, { useState, useEffect, useRef } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import { 
  HP_COACH_MESSAGES, 
  HP_COACH_SUGGESTIONS 
} from "@/lib/mockData";
import HPGlyph from "@/components/ui/HPGlyph";
import Modal from "@/components/ui/Modal";

interface CoachModalProps {
  onClose: () => void;
}

export default function CoachModal({ onClose }: CoachModalProps) {
  const { state } = useHP();
  const [messages, setMessages] = useState(HP_COACH_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const send = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    
    const newUserMsg = { from: 'user' as const, text: msg };
    setMessages(m => [...m, newUserMsg]);
    setInput('');
    setTyping(true);

    try {
      // Get recent coaching logs
      const coachingLogs = (state?.logbook || [])
        .filter((l: any) => l.content && l.content.includes('GROW Coaching Session'))
        .slice(0, 3)
        .map((l: any) => `- ${l.date}: ${l.content.replace(/\n/g, ' ')}`)
        .join('\n');

      const sysPrompt = `You are Flow, a friendly, empathetic AI coach for "Flow Productivity". Users are employees. Your tone is humanist, supportive, and clear. Help users achieve their state of flow. Avoid corporate jargon.
      
Here are the user's recent coaching commitments from their logbook:
${coachingLogs || 'No recent coaching commitments.'}

Please refer to these commitments if the user asks for updates or needs accountability.`;

      // Map history for OpenAI format
      const history = messages.map(m => ({
        role: m.from === 'ai' ? 'assistant' : 'user',
        content: m.text
      }));

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: msg, systemPrompt: sysPrompt, history })
      });
      
      const data = await res.json();
      setTyping(false);

      if (data.text) {
        setMessages(m => [...m, { from: 'ai', text: data.text }]);
      } else {
        setMessages(m => [...m, { from: 'ai', text: "Maaf, aku lagi agak lambat merespons. Bisa coba lagi? 🌱 (Error: " + (data.error || 'Unknown') + ")" }]);
      }
    } catch (error) {
      setTyping(false);
      setMessages(m => [...m, { from: 'ai', text: "Koneksiku terputus sejenak. Kabari aku lagi ya! 🌿" }]);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ height: '75vh', display: 'flex', flexDirection: 'column', margin: '0 -20px' }}>
        <div style={{ 
          padding: '0 20px 14px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          borderBottom: `1px solid ${HP_TOKENS.line}` 
        }}>
          <div style={{ 
            width: 44, 
            height: 44, 
            borderRadius: 16, 
            background: `linear-gradient(135deg, ${HP_TOKENS.sage}, ${HP_TOKENS.blue})`, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <HPGlyph name="sparkle" size={22} color="#fff"/>
          </div>
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Flow, AI coach kamu</div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sage, fontWeight: 700 }}>🟢 Online · memahami konteks kamu</div>
          </div>
        </div>

        <div 
          ref={scrollRef} 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '14px 20px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 10 
          }}
        >
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.from === 'ai' ? 'flex-start' : 'flex-end',
              maxWidth: '82%',
              padding: '12px 14px', borderRadius: 18,
              background: m.from === 'ai' ? HP_TOKENS.sageWash : HP_TOKENS.blue,
              color: m.from === 'ai' ? HP_TOKENS.ink : '#fff',
              fontFamily: HP_FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.45,
              borderTopLeftRadius: m.from === 'ai' ? 4 : 18,
              borderTopRightRadius: m.from === 'ai' ? 18 : 4,
              whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </div>
          ))}
          {typing && (
            <div style={{ 
              alignSelf: 'flex-start', 
              padding: '12px 14px', 
              borderRadius: 18, 
              background: HP_TOKENS.sageWash, 
              borderTopLeftRadius: 4, 
              display: 'flex', 
              gap: 4 
            }}>
              {[0, 1, 2].map(i => (
                <div 
                  key={i} 
                  style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: 3, 
                    background: HP_TOKENS.sage, 
                    animation: `hpDot 1.2s ${i * 0.2}s infinite` 
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {messages.length < 3 && (
          <div style={{ padding: '0 20px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {HP_COACH_SUGGESTIONS.map(s => (
              <button 
                key={s} 
                onClick={() => send(s)} 
                style={{
                  padding: '8px 12px', borderRadius: 99,
                  background: '#FFFFFF', border: `1px solid ${HP_TOKENS.sageSoft}`, color: HP_TOKENS.sage,
                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}
                className="hp-tap"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div style={{ 
          padding: '10px 20px 20px', 
          borderTop: `1px solid ${HP_TOKENS.line}`, 
          display: 'flex', 
          gap: 8, 
          alignItems: 'center', 
          background: HP_TOKENS.paper 
        }}>
          <input
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Curhat, tanya, atau minta saran..."
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 99,
              border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
              outline: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink,
            }}
          />
          <button 
            onClick={() => send()} 
            style={{
              width: 44, height: 44, borderRadius: 22, border: 'none', background: HP_TOKENS.sage,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
            className="hp-tap"
          >
            <HPGlyph name="send" size={18} color="#fff"/>
          </button>
        </div>
      </div>
    </Modal>
  );
}
