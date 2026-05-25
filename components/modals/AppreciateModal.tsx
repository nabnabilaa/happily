"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT,
  HP_VALUES
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import Modal from "@/components/ui/Modal";

interface AppreciateModalProps {
  onClose: () => void;
}

export default function AppreciateModal({ onClose }: AppreciateModalProps) {
  const { state, updateState, user } = useHP();
  const [to, setTo] = useState<any>(null);
  const [value, setValue] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [remaining, setRemaining] = useState(3);

  // Fetch real users from database (not mock data)
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.users) {
          // Filter out current user (can't appreciate yourself)
          setPeople(data.users.filter((u: any) => String(u.id) !== String(user?.id)));
        }
      } catch (e) {
        console.error('Failed to fetch users:', e);
      }
    }
    fetchUsers();
  }, [user?.id]);

  const send = async () => {
    if (!to || !value || !msg || !state || !user) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/kudos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: to.id,
          senderName: user.name,
          receiverName: to.name,
          valueTag: value,
          message: msg,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal mengirim apresiasi');
        setLoading(false);
        return;
      }

      // Update feed in state (so it shows immediately)
      const newFeedItem = {
        id: data.kudosId || Date.now(), 
        from: user.name, 
        to: to.name, 
        value, 
        msg, 
        likes: 0, 
        time: 'Baru saja',
      };

      updateState((s: any) => ({
        ...s,
        feed: [newFeedItem, ...s.feed],
      }));

      setRemaining(data.remaining ?? 2);
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      setError('Gagal mengirim. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!state) return null;

  if (success) {
    return (
      <Modal onClose={onClose} title="Beri Apresiasi">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
          <div style={{ ...HP_TEXT.h, fontSize: 18, color: HP_TOKENS.sage }}>Apresiasi Terkirim!</div>
          <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkMute, marginTop: 8 }}>
            {to?.name} mendapat +20 poin dari apresiasimu.
          </div>
          <div style={{ ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.inkFade, marginTop: 12 }}>
            Sisa apresiasi hari ini: {remaining}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Beri Apresiasi">
      <div style={{ marginTop: 4 }}>
        {error && (
          <div style={{ 
            padding: 12, borderRadius: 12, marginBottom: 16,
            background: '#FFF5F5', border: '1px solid #FFC9C9', 
            color: '#E03131', fontSize: 13, fontWeight: 600, fontFamily: HP_FONT 
          }}>
            {error}
          </div>
        )}

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700 }}>KE SIAPA</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {people.length === 0 ? (
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkFade, padding: 12 }}>Memuat daftar rekan...</div>
          ) : (
            people.map((p: any) => (
              <button 
                key={p.id} 
                onClick={() => setTo(p)} 
                style={{
                  padding: '10px 12px', 
                  borderRadius: 14,
                  background: to?.id === p.id ? HP_TOKENS.sage : HP_TOKENS.card,
                  border: `1.5px solid ${to?.id === p.id ? HP_TOKENS.sage : HP_TOKENS.line}`,
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  cursor: 'pointer', 
                  flexShrink: 0,
                  fontFamily: HP_FONT,
                }}
                className="hp-tap"
              >
                <HPAvatar name={p.name} size={28}/>
                <div>
                  <div style={{ 
                    fontSize: 13, 
                    fontWeight: 800, 
                    color: to?.id === p.id ? '#fff' : HP_TOKENS.ink, 
                    textAlign: 'left' 
                  }}>
                    {p.name.split(' ')[0]}
                  </div>
                  <div style={{ 
                    fontSize: 11, 
                    fontWeight: 600, 
                    color: to?.id === p.id ? 'rgba(255,255,255,0.8)' : HP_TOKENS.inkMute, 
                    textAlign: 'left' 
                  }}>
                    {p.job_title || p.role || 'Team Member'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginTop: 22 }}>NILAI PERUSAHAAN</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {(state?.companyValues || HP_VALUES).map((v: string) => (
            <button 
              key={v} 
              onClick={() => setValue(v)} 
              style={{
                padding: '9px 14px', 
                borderRadius: 99,
                background: value === v ? HP_TOKENS.sage : HP_TOKENS.card,
                border: `1.5px solid ${value === v ? HP_TOKENS.sage : HP_TOKENS.line}`,
                color: value === v ? '#fff' : HP_TOKENS.ink,
                fontFamily: HP_FONT, 
                fontWeight: 700, 
                fontSize: 13, 
                cursor: 'pointer',
              }}
              className="hp-tap"
            >
              {v}
            </button>
          ))}
        </div>

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginTop: 22 }}>PESAN PERSONAL</div>
        <textarea
          value={msg} 
          onChange={e => setMsg(e.target.value)} 
          rows={4}
          placeholder="Apa yang kamu apresiasi, dan dampaknya ke tim?"
          style={{
            width: '100%', 
            marginTop: 10, 
            padding: 14, 
            borderRadius: 14,
            border: `1.5px solid ${HP_TOKENS.line}`, 
            fontFamily: HP_FONT, 
            fontSize: 14,
            color: HP_TOKENS.ink, 
            outline: 'none', 
            resize: 'none', 
            background: HP_TOKENS.card, 
            boxSizing: 'border-box',
          }}
        />
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 6 }}>
          💡 Penerima mendapat +20 poin. Maks 3 apresiasi per hari.
        </div>

        <button 
          onClick={send} 
          disabled={!to || !value || !msg || loading} 
          style={{
            width: '100%', 
            marginTop: 24, 
            padding: '16px', 
            borderRadius: 99,
            background: HP_TOKENS.sage, 
            color: '#fff', 
            border: 'none',
            fontFamily: HP_FONT, 
            fontWeight: 800, 
            fontSize: 15, 
            cursor: 'pointer',
            opacity: !to || !value || !msg || loading ? 0.4 : 1,
            boxShadow: `0 4px 14px ${HP_TOKENS.sageSoft}`,
          }}
          className="hp-tap"
        >
          {loading ? 'Mengirim...' : 'Kirim Apresiasi 🌱'}
        </button>
      </div>
    </Modal>
  );
}
