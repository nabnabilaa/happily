'use client';

import React, { useEffect, useState } from 'react';
import { useHP } from '@/lib/HPContext';
import { syncOfflineData } from '@/lib/offlineSync';
import { HP_TOKENS, HP_FONT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';

export default function OfflineToast() {
  const { user, awardXP } = useHP();
  const [isOnline, setIsOnline] = useState(true);
  const [show, setShow] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'offline'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    if (!navigator.onLine) {
      setSyncStatus('offline');
      setShow(true);
    }

    const handleOnline = async () => {
      setIsOnline(true);
      if (user?.id) {
        setSyncStatus('syncing');
        setShow(true);
        const synced = await syncOfflineData(user.id, awardXP);
        if (synced) {
          setSyncStatus('success');
          // Disparch event to notify other components to refresh
          window.dispatchEvent(new Event('hp_db_update'));
          setTimeout(() => {
            setShow(false);
            setSyncStatus('idle');
          }, 4000);
        } else {
          setSyncStatus('idle');
          setShow(false);
        }
      } else {
        setSyncStatus('idle');
        setShow(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
      setShow(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount
    if (navigator.onLine && user?.id) {
      syncOfflineData(user.id, awardXP).then(synced => {
        if (synced) {
          setSyncStatus('success');
          setShow(true);
          window.dispatchEvent(new Event('hp_db_update'));
          setTimeout(() => {
            setShow(false);
            setSyncStatus('idle');
          }, 4000);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, awardXP]);

  if (!show) return null;

  let bg = HP_TOKENS.paper;
  let border = HP_TOKENS.line;
  let color = HP_TOKENS.ink;
  let message = '';
  let iconName = 'activity';
  let iconColor = HP_TOKENS.ink;

  if (syncStatus === 'offline') {
    bg = '#FFF2F2';
    border = '#FFC1C1';
    color = '#A82020';
    message = 'Koneksi Terputus — Mode Offline Aktif';
    iconName = 'moon';
    iconColor = '#A82020';
  } else if (syncStatus === 'syncing') {
    bg = 'var(--hp-yellow-wash)';
    border = 'var(--hp-yellow-soft)';
    color = '#A06E00';
    message = 'Menyinkronkan data check-in...';
    iconName = 'refresh';
    iconColor = '#A06E00';
  } else if (syncStatus === 'success') {
    bg = 'var(--hp-sage-wash)';
    border = 'var(--hp-sage-soft)';
    color = HP_TOKENS.sage;
    message = 'Sinkronisasi Berhasil! Data diperbarui.';
    iconName = 'check';
    iconColor = HP_TOKENS.sage;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        borderRadius: 99,
        background: bg,
        border: `1.5px solid ${border}`,
        boxShadow: '0 8px 30px rgba(26,29,35,0.08)',
        color: color,
        fontFamily: HP_FONT,
        fontWeight: 700,
        fontSize: 14,
        animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', animation: syncStatus === 'syncing' ? 'spin 1.5s linear infinite' : 'none' }}>
        <HPGlyph name={iconName} size={18} color={iconColor} stroke={2.5} />
      </div>
      <span>{message}</span>

      <style jsx global>{`
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
