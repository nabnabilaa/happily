"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT,
  HP_COACH_SUGGESTIONS
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Modal from "@/components/ui/Modal";
import { calculateWellbeingScore } from "@/lib/wellbeingEngine";

interface CoachModalProps {
  onClose: () => void;
}

// ── Off-topic keyword detection (client-side guardrail) ──
const OFF_TOPIC_PATTERNS = [
  // Programming
  /\b(coding|code|program|javascript|python|react|html|css|java|typescript|php|sql|api|git|debug|compile|algorithm|function\s*\(|variable|class\s+\w|import\s+\w|console\.log)\b/i,
  // Politics
  /\b(politi[kc]|partai|pemilu|caleg|calon\s+presiden|pilkada|kampanye|demo(krasi)?|parlemen|oposisi|koalisi)\b/i,
  // Religion
  /\b(agama|sekte|kafir|sesat|dakwah|jihad|atheis)\b/i,
  // Random/off-topic
  /\b(resep\s+masak|crypto|bitcoin|forex|trading|saham|investasi|judi|taruhan|betting)\b/i,
  // Harmful
  /\b(bunuh|mati|narkoba|drugs|senjata|hack|exploit|crack)\b/i,
];

const OFF_TOPIC_RESPONSE = "Hmm, topik itu di luar area keahlianku 😅 Aku lebih jago bantu soal mood, produktivitas, dan task management kamu di Flowbee.\n\nAda yang bisa aku bantu soal kerjaan atau perasaanmu hari ini? 🌱";

function isOffTopic(text: string): boolean {
  return OFF_TOPIC_PATTERNS.some(pattern => pattern.test(text));
}

export default function CoachModal({ onClose }: CoachModalProps) {
  const { state, user, updateState } = useHP();
  const [messages, setMessages] = useState<Array<{ from: 'ai' | 'user'; text: string }>>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [loggedToday, setLoggedToday] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userName = user?.name || "Rekan Kerja";
    const moodKey = state?.mood;
    const energyKey = state?.energy;

    const moodMap: Record<string, string> = {
      joy: 'Senang', calm: 'Tenang', neutral: 'Biasa Saja',
      tired: 'Lelah', stress: 'Stres', burnout: 'Burnout',
    };
    const moodDescription = (moodKey && moodMap[moodKey]) || moodKey || 'belum dicek';

    const energyMap: Record<string, string> = {
      low: 'rendah', mid: 'sedang', high: 'tinggi',
    };
    const energyDescription = (energyKey && energyMap[energyKey]) || energyKey || 'belum dicek';

    // Build personalized greeting based on actual state
    const priorities = state?.priorities || [];
    const unfinished = priorities.filter((p: any) => !p.done).length;
    const { score, status } = calculateWellbeingScore(state, user);

    let greeting = `Hai ${userName} 👋`;

    if (!moodKey) {
      greeting += `\n\nKamu belum check-in mood hari ini. Gimana perasaanmu sekarang?`;
    } else if (moodKey === 'tired' || moodKey === 'stress' || moodKey === 'burnout') {
      greeting += `\n\nAku lihat mood kamu lagi "${moodDescription}" dan energi ${energyDescription}. Wajar banget kalau capek — tapi aku di sini buat bantu kamu tetap bisa jalan, pelan-pelan.`;
    } else {
      greeting += `\n\nMood kamu "${moodDescription}" dan energi ${energyDescription}. Senang dengarnya!`;
    }

    if (unfinished > 0) {
      greeting += `\n\nKamu punya ${unfinished} task yang belum selesai hari ini. Mau aku bantu susun strategi menyelesaikannya?`;
    }

    if (status === 'critical') {
      greeting += `\n\n⚠️ Wellbeing Score kamu ${score}/100. Aku khawatir sama kesehatanmu. Yuk kita bicarain apa yang bisa diringankan.`;
    }

    setMessages([{ from: 'ai', text: greeting }]);
  }, [user, state?.mood, state?.energy]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const send = useCallback(async (text?: string) => {
    if (typing) return;
    const msg = text || input;
    if (!msg.trim()) return;
    
    const newUserMsg = { from: 'user' as const, text: msg };
    setMessages(m => [...m, newUserMsg]);
    setInput('');

    // Catat ke logbook agar dm_coach bisa diklaim (hanya sekali per hari)
    if (!loggedToday) {
      setLoggedToday(true);
      updateState((s: any) => ({
        ...s,
        logbook: [...(s.logbook || []), { type: 'ai_coach', created_at: new Date().toISOString(), title: 'Coach AI Session' }],
      }));
    }

    // ── Client-side guardrail: off-topic check (zero tokens!) ──
    if (isOffTopic(msg)) {
      setTimeout(() => {
        setMessages(m => [...m, { from: 'ai', text: OFF_TOPIC_RESPONSE }]);
      }, 400);
      return;
    }

    setTyping(true);

    try {
      // ── Build rich, personalized context ──
      const currentMood = state?.mood || 'belum check-in';
      const currentEnergy = state?.energy || 'belum check-in';
      const streak = user?.streak || 0;
      
      const priorities = state?.priorities || [];
      const pendingTasks = priorities
        .filter((p: any) => !p.done)
        .map((p: any) => `- ${p.title}${p.due ? ` (deadline: ${p.due})` : ''}`)
        .join('\n');
      const completedCount = priorities.filter((p: any) => p.done).length;
      const totalCount = priorities.length;

      // Mood history summary (last 5 entries)
      const moodHistory = (state?.moods || []).slice(-5)
        .map((m: any) => `${m.date || '?'}: ${m.mood}`)
        .join(', ');

      // Recent logbook entries
      const recentLogs = (state?.logbook || []).slice(0, 3)
        .map((l: any) => `- ${l.date}: ${l.title || l.content?.substring(0, 50)}`)
        .join('\n');

      // Wellbeing score
      const { score, status, actions } = calculateWellbeingScore(state, user);
      const actionsSummary = actions.slice(0, 3).map((a: any) => `- ${a.label}: ${a.description}`).join('\n');

      // Coaching logs
      const coachingLogs = (state?.logbook || [])
        .filter((l: any) => l.content && l.content.includes('GROW Coaching Session'))
        .slice(0, 2)
        .map((l: any) => `- ${l.date}: ${l.content.replace(/\n/g, ' ').substring(0, 100)}`)
        .join('\n');

      // Format goals/OKRs
      const goals = state?.goals || [];
      const okrs = goals
        .filter((g: any) => g.status === 'pending')
        .slice(0, 3)
        .map((g: any) => `- ${g.title} (Progress: ${g.progress}%)`)
        .join('\n');

      const sysPrompt = `Kamu adalah Buddy, AI Coach pribadi di platform Flowbee. Kamu BUKAN chatbot general — kamu HANYA membahas topik terkait:
- Mood & kesehatan mental karyawan
- Produktivitas & manajemen task
- Work-life balance & burnout prevention
- Motivasi & pengembangan diri dalam konteks kerja
- Fitur-fitur Flowbee (task harian, focus session, box breathing, refleksi, dll)

KAMU WAJIB SELALU BERKOMUNIKASI DALAM BAHASA INDONESIA.

ATURAN KETAT:
1. TOLAK dengan sopan pertanyaan tentang: programming/coding, politik, agama, gosip, investasi, kripto, atau hal random yang tidak terkait produktivitas kerja. Katakan: "Topik itu di luar keahlianku. Aku lebih bisa bantu soal mood dan produktivitasmu."
2. JANGAN pernah memberikan saran medis, diagnosis, atau menyuruh minum obat. Jika user menunjukkan tanda-tanda depresi berat, sarankan untuk bicara dengan profesional (psikolog/konselor).
3. SELALU arahkan pembicaraan kembali ke: mood, wellbeing, task, fokus, work-life balance.

KEPRIBADIAN:
- Empatis tapi tegas. Kamu peduli, tapi kamu juga push mereka untuk tidak menyerah.
- Pesan inti: "Semakin kamu kabur, pekerjaan hanya akan menumpuk. Tapi semakin kamu melangkah, semakin ringan terasa."
- Selalu semangati. Jangan biarkan mereka merasa sendirian.
- Gunakan bahasa kasual Indonesia, bukan formal/kaku.
- Emoji boleh tapi jangan berlebihan (max 2-3 per pesan).

STRATEGI COACHING:
- Jika user mengeluh banyak kerjaan → Tawarkan pecah task ("Coba kita pecah jadi yang lebih kecil. Task mana yang paling gampang?")
- Jika user bilang capek/stres → Validasi dulu ("Wajar banget capek"), lalu dorong aksi kecil ("Tapi coba selesain 1 task kecil dulu, biar momentum mulai jalan")
- Jika user bilang mau nyerah → Motivasi keras ("Kamu udah sejauh ini. Menyerah sekarang berarti sia-sia. Yuk kita hadapin bareng")
- Jika user inaktif lama → "Kamu udah lama ga check-in. Aku khawatir. Gimana kabar?"
- Jika wellbeing rendah → Sarankan Box Breathing atau Focus Session

### KONTEKS USER SAAT INI:
- Nama: ${user?.name || 'Rekan Kerja'}
- Role: ${user?.role || 'Employee'}
- Level Gamifikasi: ${user?.level || 1} (Total Poin: ${user?.points || 0})
- Mood: ${currentMood}
- Energi: ${currentEnergy}
- Streak Check-in: ${streak} hari
- Wellbeing Score: ${score}/100 (${status})
- Task Progress: ${completedCount}/${totalCount} selesai

### TARGET / OKR AKTIF:
${okrs || 'Tidak ada target OKR aktif.'}

### TASK YANG BELUM SELESAI:
${pendingTasks || 'Tidak ada task pending.'}

### REKOMENDASI WELLBEING SAAT INI:
${actionsSummary || 'Tidak ada rekomendasi khusus.'}

### RIWAYAT MOOD (5 terakhir):
${moodHistory || 'Belum ada data.'}

### AKTIVITAS TERKINI:
${recentLogs || 'Belum ada aktivitas tercatat.'}

### CATATAN COACHING SEBELUMNYA:
${coachingLogs || 'Belum ada sesi coaching.'}

Respons kamu harus SINGKAT (max 3-4 paragraf pendek). Jangan bertele-tele. Langsung ke inti.`;

      // Map history for API format
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
        setMessages(m => [...m, { from: 'ai', text: "Maaf, aku lagi agak lambat. Bisa coba lagi? 🌱" }]);
      }
    } catch (error) {
      setTyping(false);
      setMessages(m => [...m, { from: 'ai', text: "Koneksiku terputus sejenak. Kabari aku lagi ya! 🌿" }]);
    }
  }, [input, typing, messages, state, user]);

  // Dynamic suggestions based on state
  const dynamicSuggestions = React.useMemo(() => {
    const suggestions: string[] = [];
    const priorities = state?.priorities || [];
    const unfinished = priorities.filter((p: any) => !p.done).length;

    if (unfinished > 3) suggestions.push("Aku banyak kerjaan, bantu pecah task 📋");
    if (state?.mood === 'tired' || state?.mood === 'stress') suggestions.push("Aku capek banget hari ini 😩");
    if (!state?.mood) suggestions.push("Bantu aku check-in mood 💬");
    if (unfinished > 0) suggestions.push("Mana task yang harus aku duluin? 🎯");
    suggestions.push("Kasih aku semangat dong 💪");
    
    return suggestions.slice(0, 4);
  }, [state]);

  return (
    <Modal onClose={onClose} noPadding={true}>
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', background: '#FAFCFC', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ 
          padding: '16px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: '#FFFFFF',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 24, 
              background: `${HP_TOKENS.sage}`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${HP_TOKENS.sage}40`
            }}>
              <HPGlyph name="sparkle" size={24} color="#F4F7F9"/>
            </div>
            <div>
              <div style={{ ...HP_TEXT.h, fontSize: 18, color: HP_TOKENS.ink }}>Buddy, Coach AI-mu</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: HP_TOKENS.sage, animation: 'hpPulse 2s infinite' }} />
                Online & Memahami Konteksmu
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 18, border: 'none', background: 'rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <HPGlyph name="close" size={16} color={HP_TOKENS.inkMute}/>
          </button>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef} 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '24px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16 
          }}
        >
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.from === 'ai' ? 'flex-start' : 'flex-end',
              maxWidth: '85%',
              padding: '16px 20px', 
              borderRadius: 20,
              background: m.from === 'ai' ? '#FFFFFF' : `${HP_TOKENS.sage}`,
              color: m.from === 'ai' ? HP_TOKENS.ink : '#FFFFFF',
              fontFamily: HP_FONT, fontSize: 15, fontWeight: m.from === 'ai' ? 500 : 600, lineHeight: 1.6,
              borderTopLeftRadius: m.from === 'ai' ? 4 : 20,
              borderTopRightRadius: m.from === 'ai' ? 20 : 4,
              boxShadow: m.from === 'ai' ? '0 4px 20px rgba(0,0,0,0.04)' : '0 4px 20px rgba(62,112,84,0.3)',
              whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </div>
          ))}

          {/* Suggestions - Now inside scrollable area! */}
          {messages.length < 3 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {dynamicSuggestions.map(s => (
                <button 
                  key={s} 
                  onClick={() => send(s)} 
                  disabled={typing}
                  style={{
                    padding: '10px 16px', borderRadius: 99,
                    background: '#FFFFFF', 
                    border: `1.5px solid ${HP_TOKENS.sage}30`, 
                    color: HP_TOKENS.sage,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, 
                    cursor: typing ? 'default' : 'pointer',
                    opacity: typing ? 0.5 : 1,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s',
                  }}
                  className="hp-tap"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {typing && (
            <div style={{ 
              alignSelf: 'flex-start', 
              padding: '16px 20px', 
              borderRadius: 20, 
              background: '#FFFFFF', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              borderTopLeftRadius: 4, 
              display: 'flex', 
              gap: 6,
              alignItems: 'center',
              height: 24,
              marginTop: 8
            }}>
              {[0, 1, 2].map(i => (
                <div 
                  key={i} 
                  style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: 4, 
                    background: HP_TOKENS.sage, 
                    animation: `hpDot 1.2s ${i * 0.2}s infinite` 
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ 
          padding: '16px 24px 24px', 
          background: '#FFFFFF',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.03)',
          display: 'flex', 
          gap: 12, 
          alignItems: 'center', 
          zIndex: 10
        }}>
          <input
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            disabled={typing}
            placeholder="Ketik balasanmu di sini..."
            style={{
              flex: 1, padding: '16px 20px', borderRadius: 99,
              border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 15,
              outline: 'none', background: '#F8FAFC', color: HP_TOKENS.ink,
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = HP_TOKENS.sage}
            onBlur={(e) => e.target.style.borderColor = HP_TOKENS.line}
          />
          <button 
            onClick={() => send()} 
            disabled={typing}
            style={{
              width: 52, height: 52, borderRadius: 26, border: 'none', background: HP_TOKENS.sage,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: typing ? 'default' : 'pointer', flexShrink: 0,
              opacity: typing ? 0.6 : 1,
              boxShadow: `0 4px 16px ${HP_TOKENS.sage}50`,
            }}
            className="hp-tap"
          >
            <HPGlyph name="send" size={20} color="#F4F7F9"/>
          </button>
        </div>
      </div>
    </Modal>
  );
}
