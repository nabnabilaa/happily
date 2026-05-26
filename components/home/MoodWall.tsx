"use client";

import React, { useState, useEffect } from 'react';
import HPCard from '@/components/ui/HPCard';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import { useHP } from '@/lib/HPContext';
import SectionHeader from '@/components/home/SectionHeader';

export default function MoodWall() {
  const { user } = useHP();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/mood-wall');
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/mood-wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mood: selectedMood, 
          content, 
          department: user?.department || 'General' 
        })
      });
      const result = await res.json();
      
      if (!res.ok) {
        alert(result.error || "Gagal mengirim pesan.");
      } else {
        setContent('');
        setSelectedMood('neutral');
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMoodEmoji = (mood: string) => {
    if (mood === 'joy' || mood === 'happy') return '😊';
    if (mood === 'calm' || mood === 'neutral') return '😐';
    if (mood === 'tired' || mood === 'burnout') return '😩';
    if (mood === 'stress' || mood === 'anxious') return '🤯';
    return '💬';
  };

  const getMoodColor = (mood: string) => {
    if (mood === 'joy' || mood === 'happy') return HP_TOKENS.sage;
    if (mood === 'tired' || mood === 'burnout' || mood === 'stress') return HP_TOKENS.coral;
    return HP_TOKENS.blue;
  };

  return (
    <div style={{ marginTop: 24 }}>
      <SectionHeader icon="messageCircle" label="Anonymous Mood Wall" />
      
      {/* Input Box */}
      <HPCard padding={16} style={{ marginBottom: 16, background: HP_TOKENS.paper }}>
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 8 }}>
          TULIS SECARA ANONIM
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Bagaimana perasaanmu hari ini? Tidak ada yang tahu siapa kamu..."
          style={{
            width: '100%', padding: 12, borderRadius: 12,
            border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 13,
            outline: 'none', background: '#fff', color: HP_TOKENS.ink, boxSizing: 'border-box',
            minHeight: 80, resize: 'none'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['happy', 'neutral', 'tired', 'stress'].map(m => (
              <button key={m} onClick={() => setSelectedMood(m)} style={{
                background: selectedMood === m ? `${getMoodColor(m)}20` : 'transparent',
                border: selectedMood === m ? `1.5px solid ${getMoodColor(m)}` : '1.5px solid transparent',
                borderRadius: 20, padding: '4px 8px', cursor: 'pointer',
                fontSize: 16, transition: 'all 0.2s'
              }}>
                {getMoodEmoji(m)}
              </button>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={isSubmitting || !content.trim()} style={{
            padding: '8px 16px', borderRadius: 99, border: 'none',
            background: HP_TOKENS.blue, color: '#fff', fontFamily: HP_FONT, fontWeight: 800,
            cursor: (!content.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
            opacity: (!content.trim() || isSubmitting) ? 0.5 : 1
          }}>
            Bagikan
          </button>
        </div>
      </HPCard>

      {/* Wall Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Memuat dinding...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Belum ada cerita hari ini.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(p => (
            <HPCard key={p.id} padding={16} style={{ borderLeft: `4px solid ${getMoodColor(p.mood)}` }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>{getMoodEmoji(p.mood)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.body, fontSize: 14, color: HP_TOKENS.ink, lineHeight: 1.5 }}>
                    "{p.content}"
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>
                      Anonim · {p.department}
                    </span>
                  </div>
                </div>
              </div>
            </HPCard>
          ))}
        </div>
      )}
    </div>
  );
}
