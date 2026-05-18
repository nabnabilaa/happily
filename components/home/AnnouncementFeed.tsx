"use client";

import React, { useEffect, useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import SectionHeader from "@/components/home/SectionHeader";

export default function AnnouncementFeed() {
  const { user } = useHP();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", tone: "blue" });

  const isHR = user?.role === 'hr';

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/announcements");
      const data = await res.json();
      if (data.announcements) setAnnouncements(data.announcements);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePost = async () => {
    if (!newPost.title || !newPost.content) return;
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: user?.id,
          ...newPost
        })
      });
      if (res.ok) {
        setIsPosting(false);
        setNewPost({ title: "", content: "", tone: "blue" });
        fetchAnnouncements();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && announcements.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: HP_TOKENS.inkMute }}>Loading announcements...</div>;
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeader 
        icon="bullhorn" 
        label="Company News" 
        count={String(announcements.length)}
        action={isHR ? (isPosting ? "Batal" : "+ Post") : undefined}
        onAction={() => setIsPosting(!isPosting)}
      />

      {isPosting && isHR && (
        <HPCard padding={16} style={{ marginBottom: 16, border: `1.5px solid ${HP_TOKENS.blue}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input 
              placeholder="Judul Pengumuman"
              value={newPost.title}
              onChange={e => setNewPost({...newPost, title: e.target.value})}
              style={inputStyle}
            />
            <textarea 
              placeholder="Isi pengumuman..."
              value={newPost.content}
              onChange={e => setNewPost({...newPost, content: e.target.value})}
              style={{ ...inputStyle, height: 80, resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              {['blue', 'sage', 'lavender', 'coral'].map(t => (
                <button 
                  key={t}
                  onClick={() => setNewPost({...newPost, tone: t})}
                  style={{
                    flex: 1, height: 32, borderRadius: 8, border: 'none',
                    background: newPost.tone === t ? HP_TOKENS[t as keyof typeof HP_TOKENS] : HP_TOKENS.lineSoft,
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
            <button onClick={handlePost} style={buttonStyle} className="hp-tap">Terbitkan Sekarang</button>
          </div>
        </HPCard>
      )}

      <div style={{ 
        display: 'flex', 
        gap: 16, 
        overflowX: 'auto', 
        paddingBottom: 16, 
        paddingRight: 16,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }} className="hp-no-scrollbar">
        {announcements.map(a => (
          <HPCard 
            key={a.id} 
            padding={20} 
            style={{ 
              minWidth: 280, 
              maxWidth: 280,
              flexShrink: 0,
              borderLeft: `6px solid ${HP_TOKENS[a.tone as keyof typeof HP_TOKENS] || HP_TOKENS.blue}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              background: '#fff'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ 
                  width: 40, height: 40, borderRadius: 12, 
                  background: (HP_TOKENS as any)[`${a.tone}Soft`] || HP_TOKENS.lineSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <HPGlyph name={a.glyph || "bullhorn"} size={20} color={(HP_TOKENS as any)[a.tone] || HP_TOKENS.ink} />
                </div>
                <div style={{ 
                  ...HP_TEXT.tiny, 
                  background: HP_TOKENS.lineSoft, 
                  padding: '4px 8px', 
                  borderRadius: 6,
                  color: HP_TOKENS.inkMute,
                  fontWeight: 800
                }}>
                  {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }).toUpperCase()}
                </div>
              </div>
              
              <div>
                <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 6, lineHeight: 1.3 }}>{a.title}</div>
                <div style={{ 
                  ...HP_TEXT.body, 
                  fontSize: 13, 
                  color: HP_TOKENS.inkSoft,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.5
                }}>
                  {a.content}
                </div>
              </div>
            </div>
          </HPCard>
        ))}
        {announcements.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, background: HP_TOKENS.lineSoft, borderRadius: 20 }}>
            <HPGlyph name="bullhorn" size={32} color={HP_TOKENS.inkFade} />
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 12 }}>Belum ada pengumuman terbaru.</div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
  fontFamily: HP_FONT, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box'
};

const buttonStyle: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: 12, border: 'none',
  background: HP_TOKENS.blue, color: '#fff', fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer'
};
