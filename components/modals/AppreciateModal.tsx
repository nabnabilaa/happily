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
  toUser?: any;
}

export default function AppreciateModal({ onClose, toUser }: AppreciateModalProps) {
  const { state, updateState, user } = useHP();
  const [to, setTo] = useState<any>(toUser || null);
  const [value, setValue] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [people, setPeople] = useState<any[]>(toUser ? [toUser] : []);
  const [searchQuery, setSearchQuery] = useState('');
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
        logbook: [...(s.logbook || []), { type: 'kudos_sent', created_at: new Date().toISOString() }]
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
          <div style={{ fontSize: 48, marginBottom: 16 }}><HPGlyph name="leaf" size={28} color="currentColor" /></div>
          <div style={{ ...HP_TEXT.h, fontSize: 18, color: HP_TOKENS.sageInk }}>Apresiasi Terkirim!</div>
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
            padding: 12, borderRadius: HP_TOKENS.radiusSm, marginBottom: 16,
            background: HP_TOKENS.dangerWash, border: `1px solid ${HP_TOKENS.dangerSoft}`,
            color: HP_TOKENS.dangerInk, fontSize: 13, fontWeight: 600, fontFamily: HP_FONT 
          }}>
            {error}
          </div>
        )}

        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          KE SIAPA <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.6 }}>(Pilih 1 orang)</span>
          {to && (
            <div style={{ color: HP_TOKENS.sageInk, fontSize: 11, fontWeight: 700 }}>
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
                width: '100%', padding: '10px 14px', borderRadius: HP_TOKENS.radiusSm,
                border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT,
                fontSize: 13, marginTop: 8, outline: 'none', background: HP_TOKENS.card
              }}
            />

            <div style={{ 
              marginTop: 10, maxHeight: 160, overflowY: 'auto', 
              border: `1px solid ${HP_TOKENS.lineSoft}`, borderRadius: HP_TOKENS.radiusSm,
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
                      ...HP_TEXT.tiny, fontWeight: 700, color: HP_TOKENS.inkMute,
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
            marginTop: 8, padding: 12, borderRadius: HP_TOKENS.radiusSm, 
            background: HP_TOKENS.card, border: `1px solid ${HP_TOKENS.lineSoft}`,
            display: 'flex', alignItems: 'center', gap: 10 
          }}>
            <HPAvatar name={toUser.name} size={36}/>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: HP_TOKENS.ink }}>{toUser.name}</div>
              <div style={{ fontSize: 12, color: HP_TOKENS.inkMute }}>{toUser.job_title || toUser.team || 'Team Member'}</div>
            </div>
          </div>
        )}

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
            borderRadius: HP_TOKENS.radiusMd,
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
            color: HP_TOKENS.onPrimary, 
            border: 'none',
            fontFamily: HP_FONT, 
            fontWeight: 700, 
            fontSize: 15, 
            cursor: 'pointer',
            opacity: !to || !value || !msg || loading ? 0.4 : 1,
          }}
          className="hp-tap"
        >
          {loading ? 'Mengirim...' : 'Kirim Apresiasi 🌱'}
        </button>
      </div>
    </Modal>
  );
}
