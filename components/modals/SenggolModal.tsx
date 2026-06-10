"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import Modal from "@/components/ui/Modal";

interface SenggolModalProps {
  onClose: () => void;
  toUser?: any;
}

export default function SenggolModal({ onClose, toUser }: SenggolModalProps) {
  const { state, user } = useHP();
  const [to, setTo] = useState<any>(toUser || null);
  const [type, setType] = useState<'greet' | 'coffee' | 'help'>('greet');
  const [people, setPeople] = useState<any[]>(toUser ? [toUser] : []);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.users) {
          const filtered = data.users.filter((u: any) => String(u.id) !== String(user?.id));
          setPeople(filtered);
          if (toUser) {
            const match = filtered.find((u: any) => String(u.id) === String(toUser.id));
            if (match) setTo(match);
          }
        }
      } catch (e) {
        console.error('Failed to fetch users:', e);
      }
    }
    fetchUsers();
  }, [user?.id, toUser]);

  const send = async () => {
    if (!to || !user) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/status/greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: to.id,
          senderName: user.name,
          type: type,
        })
      });

      if (!res.ok) {
        throw new Error('Gagal mengirim');
      }

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      setError('Gagal mengirim senggolan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!state) return null;

  if (success) {
    return (
      <Modal onClose={onClose} title="Senggol Tim">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{type === 'greet' ? '👋' : type === 'coffee' ? '☕' : '🤝'}</div>
          <div style={{ ...HP_TEXT.h, fontSize: 18, color: HP_TOKENS.sage }}>Terkirim!</div>
          <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkMute, marginTop: 8 }}>
            Notifikasi telah dikirimkan ke {to?.name.split(' ')[0]}.
          </div>
        </div>
      </Modal>
    );
  }

  const NUDGE_OPTIONS = [
    { key: 'greet', label: 'Sapa & Senggol', emoji: '👀', color: HP_TOKENS.ink },
    { key: 'coffee', label: 'Ajak Ngopi/Rehat', emoji: '☕', color: '#8A6814', bg: HP_TOKENS.yellowSoft },
    { key: 'help', label: 'Tawarkan Bantuan', emoji: '🤝', color: HP_TOKENS.coral },
  ];

  return (
    <Modal onClose={onClose} title="Senggol Tim">
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

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          KE SIAPA <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.6 }}>(Pilih 1 orang)</span>
          {to && (
            <div style={{ color: HP_TOKENS.sage, fontSize: 11, fontWeight: 800 }}>
              Terpilih: {to.name.split(' ')[0]}
            </div>
          )}
        </div>
        
        {/* HIDE SEARCH IF TARGET USER IS ALREADY SPECIFIED */}
        {!toUser ? (
          <>
            <input 
              type="text" 
              placeholder="Cari nama atau divisi..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 12,
                border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT,
                fontSize: 13, marginTop: 8, outline: 'none', background: HP_TOKENS.card
              }}
            />

            <div style={{ 
              marginTop: 10, maxHeight: 160, overflowY: 'auto', 
              border: `1px solid ${HP_TOKENS.lineSoft}`, borderRadius: 12,
              background: HP_TOKENS.paper
            }}>
              {people.length === 0 ? (
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkFade, padding: 12, textAlign: 'center' }}>Memuat daftar rekan...</div>
              ) : (() => {
                const filtered = people.filter(p => 
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  (p.department || '').toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (filtered.length === 0) {
                  return <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkFade, padding: 12, textAlign: 'center' }}>Tidak ditemukan</div>;
                }

                const grouped = filtered.reduce((acc: any, p: any) => {
                  const dept = p.department || p.role || 'Lainnya';
                  if (!acc[dept]) acc[dept] = [];
                  acc[dept].push(p);
                  return acc;
                }, {});

                return Object.keys(grouped).sort().map(dept => (
                  <div key={dept}>
                    <div style={{ 
                      background: HP_TOKENS.card, padding: '6px 12px', 
                      ...HP_TEXT.tiny, fontWeight: 800, color: HP_TOKENS.inkMute,
                      borderBottom: `1px solid ${HP_TOKENS.lineSoft}`, borderTop: `1px solid ${HP_TOKENS.lineSoft}`
                    }}>
                      {dept.toUpperCase()}
                    </div>
                    {grouped[dept].map((p: any) => {
                      const isSelected = to?.id === p.id;
                      return (
                      <button 
                        key={p.id} 
                        onClick={() => setTo(p)} 
                        style={{
                          width: '100%', padding: '10px 12px', 
                          background: isSelected ? HP_TOKENS.sageWash : 'transparent',
                          border: 'none', 
                          borderBottom: isSelected ? `2px solid ${HP_TOKENS.sage}` : `1px solid ${HP_TOKENS.lineSoft}`,
                          borderLeft: isSelected ? `4px solid ${HP_TOKENS.sage}` : '4px solid transparent',
                          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', 
                          fontFamily: HP_FONT, textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                        className="hp-tap"
                      >
                        <HPAvatar name={p.name} size={32}/>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: 14, fontWeight: isSelected ? 800 : 600, 
                            color: isSelected ? HP_TOKENS.sage : HP_TOKENS.ink 
                          }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? HP_TOKENS.sage : HP_TOKENS.inkMute, opacity: isSelected ? 0.8 : 1 }}>
                            {p.job_title || 'Team Member'}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{
                            background: HP_TOKENS.sage, color: '#fff', borderRadius: '50%',
                            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <HPGlyph name="check" size={12} color="#fff" />
                          </div>
                        )}
                      </button>
                    )})}
                  </div>
                ));
              })()}
            </div>
          </>
        ) : (
          <div style={{ 
            marginTop: 8, padding: 12, borderRadius: 12, 
            background: HP_TOKENS.card, border: `1px solid ${HP_TOKENS.lineSoft}`,
            display: 'flex', alignItems: 'center', gap: 10 
          }}>
            <HPAvatar name={toUser.name} size={36}/>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: HP_TOKENS.ink }}>{toUser.name}</div>
              <div style={{ fontSize: 12, color: HP_TOKENS.inkMute }}>{toUser.job_title || toUser.team || 'Team Member'}</div>
            </div>
          </div>
        )}

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, marginTop: 22 }}>TIPE SENGGOLAN</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {NUDGE_OPTIONS.map(opt => (
            <button 
              key={opt.key} 
              onClick={() => setType(opt.key as any)} 
              style={{
                padding: '12px 14px', 
                borderRadius: 12,
                background: type === opt.key ? (opt.bg || `${HP_TOKENS.sageSoft}40`) : HP_TOKENS.card,
                border: `1.5px solid ${type === opt.key ? (opt.bg ? opt.color : HP_TOKENS.sage) : HP_TOKENS.line}`,
                fontFamily: HP_FONT, 
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              className="hp-tap"
            >
              <div style={{ fontSize: 20 }}>{opt.emoji}</div>
              <div style={{ 
                fontSize: 14, fontWeight: 700, 
                color: type === opt.key ? (opt.bg ? opt.color : HP_TOKENS.sage) : HP_TOKENS.ink 
              }}>
                {opt.label}
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={send} 
          disabled={!to || loading} 
          style={{
            width: '100%', 
            marginTop: 24, 
            padding: '16px', 
            borderRadius: 99,
            background: HP_TOKENS.sage, 
            color: '#F4F7F9', 
            border: 'none',
            fontFamily: HP_FONT, 
            fontWeight: 800, 
            fontSize: 15, 
            cursor: 'pointer',
            opacity: !to || loading ? 0.4 : 1,
            boxShadow: `0 4px 14px ${HP_TOKENS.sageSoft}`,
          }}
          className="hp-tap"
        >
          {loading ? 'Mengirim...' : 'Kirim! 🚀'}
        </button>
      </div>
    </Modal>
  );
}
