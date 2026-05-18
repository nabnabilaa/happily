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

// Map reference_type to modal names for deep linking
const DEEP_LINK_MAP: Record<string, { modal: string; label: string; icon: string }> = {
  weekly_review: { modal: 'weekly_review', label: 'Lihat Review', icon: '📋' },
  survey: { modal: 'take_survey', label: 'Isi Survey', icon: '📝' },
  attendance: { modal: 'attendance_history', label: 'Lihat Kehadiran', icon: '📅' },
  kpi: { modal: 'goals', label: 'Lihat KPI', icon: '🎯' },
};

export default function NotificationsModal({ onClose, openModal }: NotificationsModalProps) {
  const { user, updateState } = useHP();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/ext/notifications?userId=${user?.id}`);
      const data = await res.json();
      setNotifs(data.notifications || []);
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
      setNotifs([]); 
      updateState((s: any) => ({ ...s, notifications: 0 }));
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const markOneRead = async (notifId: number) => {
    try {
      await fetch('/api/ext/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, notificationIds: [notifId] })
      });
      setNotifs(prev => prev.filter(n => n.id !== notifId));
      updateState((s: any) => ({ ...s, notifications: Math.max(0, (s.notifications || 1) - 1) }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeepLink = (n: any) => {
    const link = DEEP_LINK_MAP[n.referenceType];
    if (link && openModal) {
      markOneRead(n.id);
      onClose();
      setTimeout(() => {
        openModal(link.modal, { referenceId: n.referenceId });
      }, 200);
    }
  };

  return (
    <Modal onClose={onClose} title="🔔 Notifikasi">
      {/* Header with mark all read */}
      {notifs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>
            {notifs.length} notifikasi belum dibaca
          </div>
          <button onClick={markAllRead} className="hp-tap" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: HP_TOKENS.sage, fontFamily: HP_FONT, fontWeight: 700, fontSize: 12,
            padding: 0,
          }}>
            Tandai semua dibaca ✓
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Memuat...</div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: HP_TOKENS.inkMute }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Tidak ada notifikasi baru</div>
            <div style={{ ...HP_TEXT.small, marginTop: 4, color: HP_TOKENS.inkFade }}>Semua sudah dibaca!</div>
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
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICONS[n.type] || '📢'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 14, lineHeight: 1.3 }}>{n.title}</div>
                    {n.message && (
                      <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkSoft, marginTop: 4, lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                    )}
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 6 }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                  <button onClick={() => markOneRead(n.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    alignSelf: 'flex-start', flexShrink: 0,
                  }}>
                    <HPGlyph name="close" size={14} color={HP_TOKENS.inkMute} />
                  </button>
                </div>

                {/* Deep link action button */}
                {deepLink && openModal && (
                  <button
                    onClick={() => handleDeepLink(n)}
                    className="hp-tap"
                    style={{
                      marginTop: 10, padding: '8px 12px', borderRadius: 10,
                      background: '#fff', border: `1px solid ${HP_TOKENS.line}`,
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
