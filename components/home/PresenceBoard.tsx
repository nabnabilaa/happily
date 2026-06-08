"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";

interface PresenceBoardProps {
  openModal: (name: string, props?: any) => void;
}

interface UserStatus {
  id: string;
  name: string;
  jobTitle: string;
  avatarImage: string | null;
  role: string;
  team: string;
  points: number;
  level: number;
  status: string;
  statusLabel: string;
  statusEmoji: string;
  statusColor: string;
  reason: string | null;
  checkInType: string | null;
  todayCheckin: string | null;
}

interface StatusSummary {
  total: number;
  working: number;
  meeting: number;
  break: number;
  sick: number;
  izin: number;
  cuti: number;
  offline: number;
}

const FILTER_OPTIONS = [
  { key: 'all',     label: 'Semua',    emoji: '👥' },
  { key: 'working', label: 'Bekerja',  emoji: '💻' },
  { key: 'meeting', label: 'Meeting',  emoji: '📞' },
  { key: 'break',   label: 'Istirahat',emoji: '☕' },
  { key: 'absent',  label: 'Absen',    emoji: '🚫' },
  { key: 'offline', label: 'Offline',  emoji: '⚫' },
];

export default function PresenceBoard({ openModal }: PresenceBoardProps) {
  const { user } = useHP();
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [summary, setSummary] = useState<StatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchPresence = useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) return;
    try {
      const params = new URLSearchParams();
      if (user?.role === 'manager') params.set('managerId', user.id);
      const res = await fetch(`/api/status?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users || []);
      setSummary(data.summary || null);
    } catch (e: any) {
      const isNetworkError = e instanceof TypeError || (e.message && (
        e.message.toLowerCase().includes('failed to fetch') || 
        e.message.toLowerCase().includes('networkerror') ||
        e.message.toLowerCase().includes('fetch failed')
      ));
      if (isNetworkError) {
        console.warn("Failed to fetch presence (network issue):", e.message || e);
      } else {
        console.error("Failed to fetch presence:", e);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPresence();

    // Listen to real-time database updates from SSE
    const handleRealtimeUpdate = () => {
      fetchPresence();
    };
    window.addEventListener('hp_db_update', handleRealtimeUpdate);

    // Auto-refresh every 60 seconds (fallback)
    const interval = setInterval(fetchPresence, 60000);
    
    return () => {
      window.removeEventListener('hp_db_update', handleRealtimeUpdate);
      clearInterval(interval);
    };
  }, [fetchPresence]);

  const filteredUsers = users.filter(u => {
    if (filter === 'all') return true;
    if (filter === 'absent') return ['sick', 'izin', 'cuti'].includes(u.status);
    return u.status === filter;
  });

  const getStatusDotColor = (status: string) => {
    const map: Record<string, string> = {
      working: '#2D8A4E', meeting: '#3B6FA0', break: '#D4A017',
      sick: '#E03131', izin: '#7B6BB5', cuti: '#2196F3',
      away: '#8A8A8A', offline: '#CCCCCC',
    };
    return map[status] || '#CCCCCC';
  };

  if (loading) {
    return (
      <HPCard padding={24} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Memuat data tim...</div>
      </HPCard>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(26,29,35,0.9)', color: '#fff', padding: '12px 20px',
          borderRadius: 100, fontFamily: HP_FONT, fontSize: 13, fontWeight: 700,
          zIndex: 9999, animation: 'hpSlideUp 0.3s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Summary Bar */}
      {summary && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4,
        }}>
          {[
            { key: 'working', count: summary.working, emoji: '💻', color: '#2D8A4E', bg: HP_TOKENS.sageWash },
            { key: 'meeting', count: summary.meeting, emoji: '📞', color: '#3B6FA0', bg: HP_TOKENS.blueWash },
            { key: 'break',   count: summary.break,   emoji: '☕', color: '#D4A017', bg: HP_TOKENS.yellowSoft },
            { key: 'absent',  count: summary.sick + summary.izin + summary.cuti, emoji: '🚫', color: '#E03131', bg: HP_TOKENS.coralSoft },
            { key: 'offline', count: summary.offline,  emoji: '⚫', color: '#8A8A8A', bg: HP_TOKENS.lineSoft },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
              className="hp-tap"
              style={{
                flex: '1 0 auto', padding: '10px 14px', borderRadius: 14,
                background: filter === s.key ? s.color : s.bg,
                border: filter === s.key ? 'none' : `1px solid ${s.color}15`,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                minWidth: 60, transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 16 }}>{s.emoji}</div>
              <div style={{
                fontFamily: HP_FONT, fontWeight: 900, fontSize: 18,
                color: filter === s.key ? '#fff' : s.color,
              }}>
                {s.count}
              </div>
              <div style={{
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 9,
                color: filter === s.key ? 'rgba(255,255,255,0.8)' : HP_TOKENS.inkMute,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {FILTER_OPTIONS.find(f => f.key === s.key)?.label}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Update My Status button */}
      <button
        onClick={() => openModal('update_status')}
        className="hp-tap"
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 14,
          background: `linear-gradient(135deg, ${HP_TOKENS.blue}, #2D6A9F)`,
          color: '#F4F7F9', border: 'none', fontFamily: HP_FONT, fontWeight: 800,
          fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, marginBottom: 16,
          boxShadow: `0 4px 16px ${HP_TOKENS.blue}30`,
        }}
      >
        <HPGlyph name="activity" size={16} color="#F4F7F9" />
        Update Status Saya
      </button>

      {/* User List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredUsers.length === 0 ? (
          <HPCard padding={24} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ ...HP_TEXT.h, fontSize: 14 }}>Tidak ada anggota tim dengan status ini</div>
          </HPCard>
        ) : (
          (showAll ? filteredUsers : filteredUsers.slice(0, 4)).map(u => (
            <HPCard key={u.id} padding={12} style={{
              border: `1.5px solid ${u.id === user?.id ? `${HP_TOKENS.yellow}40` : HP_TOKENS.line}`,
              background: u.id === user?.id ? HP_TOKENS.yellowSoft + '20' : HP_TOKENS.card,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Avatar with status dot */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <HPAvatar name={u.name} size={44} />
                    <div style={{
                      position: 'absolute', bottom: -1, right: -1,
                      width: 14, height: 14, borderRadius: 7,
                      background: getStatusDotColor(u.status),
                      border: '2.5px solid #fff',
                      boxShadow: '0 1px 3px rgba(26,29,35,0.15)',
                    }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <div style={{ ...HP_TEXT.h, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.name}
                      </div>
                      <div style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 800,
                        background: '#FF6B3515', color: '#FF6B35', fontFamily: HP_FONT, border: '1px solid #FF6B3530'
                      }}>
                        Lv {u.level} • {u.points} pts
                      </div>
                      {u.id === user?.id && (
                        <div style={{
                          padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 800,
                          background: HP_TOKENS.yellowSoft, color: '#8A6814', fontFamily: HP_FONT,
                        }}>KAMU</div>
                      )}
                    </div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 1 }}>
                      {u.jobTitle || u.team}
                    </div>
                    {u.reason && (
                      <div style={{
                        ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, marginTop: 3,
                        fontStyle: 'italic', fontSize: 10,
                      }}>
                        "{u.reason}"
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
                    flexShrink: 0,
                  }}>
                    <div style={{
                      padding: '4px 10px', borderRadius: 8,
                      background: `${getStatusDotColor(u.status)}15`,
                      border: `1px solid ${getStatusDotColor(u.status)}30`,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ fontSize: 11 }}>{u.statusEmoji}</span>
                      <span style={{
                        fontFamily: HP_FONT, fontWeight: 800, fontSize: 10,
                        color: getStatusDotColor(u.status),
                      }}>
                        {u.statusLabel}
                      </span>
                    </div>
                    {u.checkInType && u.todayCheckin && (
                      <div style={{
                        ...HP_TEXT.tiny, fontSize: 9, color: HP_TOKENS.inkFade,
                      }}>
                        {u.checkInType} · {new Date(u.todayCheckin).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions (Only for other users) */}
                {u.id !== user?.id && (
                  <div style={{ display: 'flex', gap: 6, borderTop: `1px solid ${HP_TOKENS.lineSoft}`, paddingTop: 10, marginTop: -4 }}>
                    <button 
                      onClick={async () => {
                        try {
                          await fetch("/api/status/greet", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ senderId: user?.id, senderName: user?.name, receiverId: u.id, type: 'greet' })
                          });
                          showToast(`Kamu menyapa ${u.name.split(' ')[0]}! 👋`);
                        } catch (e) {
                          showToast("Gagal menyapa 😥");
                        }
                      }}
                      className="hp-tap"
                      style={{ 
                        flex: 1, padding: '6px', borderRadius: 8, background: HP_TOKENS.paper, 
                        border: `1px solid ${HP_TOKENS.line}`, color: HP_TOKENS.ink, fontSize: 11,
                        fontFamily: HP_FONT, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}>
                      💬 Sapa
                    </button>
                    <button 
                      onClick={() => openModal('appreciate', { toUser: u })}
                      className="hp-tap"
                      style={{ 
                        flex: 1, padding: '6px', borderRadius: 8, background: HP_TOKENS.sageWash, 
                        border: `1px solid ${HP_TOKENS.sage}40`, color: HP_TOKENS.sage, fontSize: 11,
                        fontFamily: HP_FONT, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}>
                      🌱 Apresiasi
                    </button>
                    {(u.status === 'break' || u.status === 'away') && (
                      <button 
                        onClick={async () => {
                          try {
                            await fetch("/api/status/greet", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ senderId: user?.id, senderName: user?.name, receiverId: u.id, type: 'coffee' })
                            });
                            showToast(`Ajakan ngopi terkirim ke ${u.name.split(' ')[0]}! ☕`);
                          } catch (e) {
                            showToast("Gagal mengajak ngopi 😥");
                          }
                        }}
                        className="hp-tap"
                        style={{ 
                          flex: 1, padding: '6px', borderRadius: 8, background: HP_TOKENS.yellowSoft, 
                          border: `1px solid ${HP_TOKENS.yellow}40`, color: '#8A6814', fontSize: 11,
                          fontFamily: HP_FONT, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}>
                        ☕ Ajak Ngopi
                      </button>
                    )}
                  </div>
                )}
              </div>
            </HPCard>
          ))
        )}

        {!showAll && filteredUsers.length > 4 && (
          <button 
            onClick={() => setShowAll(true)}
            className="hp-tap"
            style={{
              width: '100%', padding: '12px', borderRadius: 14,
              background: HP_TOKENS.lineSoft, color: HP_TOKENS.inkSoft,
              border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13,
              cursor: 'pointer', marginTop: 4
            }}
          >
            Tampilkan {filteredUsers.length - 4} anggota lainnya
          </button>
        )}

        {showAll && filteredUsers.length > 4 && (
          <button 
            onClick={() => setShowAll(false)}
            className="hp-tap"
            style={{
              width: '100%', padding: '12px', borderRadius: 14,
              background: 'transparent', color: HP_TOKENS.inkMute,
              border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13,
              cursor: 'pointer', marginTop: 4
            }}
          >
            Sembunyikan
          </button>
        )}
      </div>
    </div>
  );
}
