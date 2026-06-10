"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT,
  HP_TEXT 
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import Modal from "@/components/ui/Modal";

interface NotificationsModalProps {
  onClose: () => void;
  openModal?: (name: string, props?: any) => void;
}

const TYPE_ICONS: Record<string, string> = {
  info: '📢', success: '🎉', action: '🎯', warning: '⚠️', reminder: '🌤️'
};
const TYPE_COLOR: Record<string, { bg: string; border: string }> = {
  info: { bg: HP_TOKENS.blueSoft, border: `${HP_TOKENS.blue}30` },
  success: { bg: HP_TOKENS.sageWash, border: `${HP_TOKENS.sage}30` },
  action: { bg: HP_TOKENS.yellowSoft, border: `${HP_TOKENS.yellow}30` },
  warning: { bg: HP_TOKENS.coralSoft, border: `${HP_TOKENS.coral}30` },
  reminder: { bg: HP_TOKENS.lavenderSoft, border: `${HP_TOKENS.lavender}30` },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)}h lalu`;
}

const DEEP_LINK_MAP: Record<string, { modal: string; label: string; icon: string }> = {
  weekly_review: { modal: 'weekly_review', label: 'Lihat Review', icon: '📋' },
  survey: { modal: 'take_survey', label: 'Isi Survey', icon: '📝' },
  attendance: { modal: 'attendance_history', label: 'Lihat Kehadiran', icon: '📅' },
  kpi: { modal: 'goals', label: 'Lihat KPI', icon: '🎯' },
  room: { modal: 'focus', label: 'Masuk Ruang Tunggu', icon: '🚪' },
};

export default function NotificationsModal({ onClose, openModal }: NotificationsModalProps) {
  const { user, updateState, notify } = useHP();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ext/notifications?userId=${user?.id}&all=${activeTab === 'all'}`);
      const data = await res.json();
      setNotifs(data.notifications || []);
      
      // Update badge count in context
      if (activeTab === 'unread') {
        updateState((s: any) => ({ ...s, notifications: data.unreadCount || 0 }));
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
    setLoading(false);
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/ext/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      
      if (activeTab === 'unread') {
        setNotifs([]);
      } else {
        setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
      }
      
      updateState((s: any) => ({ ...s, notifications: 0 }));
      notify("Sukses", "Semua notifikasi ditandai telah dibaca", "success");
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const markOneRead = async (notifId: string) => {
    try {
      await fetch('/api/ext/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, notificationIds: [notifId] })
      });
      
      if (activeTab === 'unread') {
        setNotifs(prev => prev.filter(n => n.id !== notifId));
      } else {
        setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
      }
      
      updateState((s: any) => ({ ...s, notifications: Math.max(0, (s.notifications || 1) - 1) }));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteOneNotification = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/ext/notifications?userId=${user?.id}&id=${notifId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifs(prev => prev.filter(n => n.id !== notifId));
        notify("Sukses", "Notifikasi berhasil dihapus", "success");
        
        // Refresh unread count
        if (activeTab === 'unread') {
          updateState((s: any) => ({ ...s, notifications: Math.max(0, (s.notifications || 1) - 1) }));
        } else {
          // If we deleted an unread one in history tab, we should decrease unread count
          const wasUnread = notifs.find(n => n.id === notifId)?.isRead === false;
          if (wasUnread) {
            updateState((s: any) => ({ ...s, notifications: Math.max(0, (s.notifications || 1) - 1) }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const deleteAllNotifications = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus semua histori notifikasi?")) return;
    try {
      const res = await fetch(`/api/ext/notifications?userId=${user?.id}&all=true`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifs([]);
        updateState((s: any) => ({ ...s, notifications: 0 }));
        notify("Sukses", "Histori notifikasi berhasil dibersihkan", "success");
      }
    } catch (err) {
      console.error("Failed to delete all notifications:", err);
    }
  };

  const handleDeepLink = (n: any) => {
    const link = DEEP_LINK_MAP[n.referenceType];
    if (link && openModal) {
      markOneRead(n.id);
      onClose();
      setTimeout(() => {
        if (n.referenceType === 'room') {
          openModal('focus', { 
            initialMultiplayer: true, 
            initialRoomCode: n.referenceId,
            isGuest: true
          });
        } else {
          openModal(link.modal, { referenceId: n.referenceId });
        }
      }, 200);
    }
  };

  return (
    <Modal onClose={onClose} title="🔔 Notifikasi">
      {/* Tab Nav Controls */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: HP_TOKENS.paper, padding: 4, borderRadius: 12 }}>
        <button 
          onClick={() => setActiveTab('unread')}
          style={{
            flex: 1, padding: '10px 0', border: 'none', borderRadius: 9,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'unread' ? HP_TOKENS.card : 'transparent',
            color: activeTab === 'unread' ? HP_TOKENS.ink : HP_TOKENS.inkSoft,
            boxShadow: activeTab === 'unread' ? '0 2px 8px rgba(26,29,35,0.04)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Belum Dibaca
        </button>
        <button 
          onClick={() => setActiveTab('all')}
          style={{
            flex: 1, padding: '10px 0', border: 'none', borderRadius: 9,
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            background: activeTab === 'all' ? HP_TOKENS.card : 'transparent',
            color: activeTab === 'all' ? HP_TOKENS.ink : HP_TOKENS.inkSoft,
            boxShadow: activeTab === 'all' ? '0 2px 8px rgba(26,29,35,0.04)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Histori
        </button>
      </div>

      {/* Action Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>
          {loading ? 'Memuat...' : `${notifs.length} Notifikasi`}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {notifs.some(n => !n.isRead) && (
            <button onClick={markAllRead} className="hp-tap" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: HP_TOKENS.sage, fontFamily: HP_FONT, fontWeight: 700, fontSize: 12,
              padding: 0,
            }}>
              Tandai semua dibaca ✓
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={deleteAllNotifications} className="hp-tap" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: HP_TOKENS.coral, fontFamily: HP_FONT, fontWeight: 700, fontSize: 12,
              padding: 0,
            }}>
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: HP_TOKENS.inkMute }}>
            <div className="hp-spinner" style={{ margin: '0 auto 12px' }}></div>
            <div>Memuat notifikasi...</div>
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: HP_TOKENS.inkMute }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔔</div>
            <div style={{ ...HP_TEXT.h, fontSize: 15 }}>
              {activeTab === 'unread' ? 'Tidak ada notifikasi baru' : 'Histori notifikasi kosong'}
            </div>
            <div style={{ ...HP_TEXT.small, marginTop: 4, color: HP_TOKENS.inkFade }}>
              {activeTab === 'unread' ? 'Semua notifikasi sudah dibaca!' : 'Belum ada notifikasi yang tercatat.'}
            </div>
          </div>
        ) : (
          notifs.map((n: any) => {
            const colors = TYPE_COLOR[n.type] || TYPE_COLOR.info;
            const deepLink = n.referenceType ? DEEP_LINK_MAP[n.referenceType] : null;

            return (
              <div 
                key={n.id} 
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: 14, borderRadius: 16,
                  background: colors.bg, 
                  border: `1.5px solid ${colors.border}`,
                  transition: 'all 0.2s',
                  opacity: n.isRead ? 0.75 : 1,
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICONS[n.type] || '📢'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ ...HP_TEXT.h, fontSize: 14, lineHeight: 1.3, fontWeight: n.isRead ? 700 : 800 }}>{n.title}</div>
                      {!n.isRead && (
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: HP_TOKENS.sage, display: 'inline-block' }} />
                      )}
                    </div>
                    {n.message && (
                      <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkSoft, marginTop: 4, lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                    )}
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 6 }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                  
                  {/* Action buttons (Read checkmark / delete trash) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {!n.isRead && (
                      <button 
                        onClick={() => markOneRead(n.id)} 
                        title="Tandai dibaca"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                        }}
                      >
                        <HPGlyph name="check" size={14} color={HP_TOKENS.sage} stroke={3} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => deleteOneNotification(n.id, e)} 
                      title="Hapus"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      }}
                    >
                      <HPGlyph name="trash" size={14} color={HP_TOKENS.coral} />
                    </button>
                  </div>
                </div>

                {/* Deep link action button */}
                {deepLink && openModal && (
                  <button
                    onClick={() => handleDeepLink(n)}
                    className="hp-tap"
                    style={{
                      marginTop: 10, padding: '8px 12px', borderRadius: 10,
                      background: HP_TOKENS.card, border: `1px solid ${HP_TOKENS.line}`,
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                      color: HP_TOKENS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {deepLink.icon} {deepLink.label}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

