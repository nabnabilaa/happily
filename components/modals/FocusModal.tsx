"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPBar from "@/components/ui/HPBar";
import BeeMascot from "@/components/ui/BeeMascot";
import HPAvatar from "@/components/ui/HPAvatar";
import { QRCodeSVG } from "qrcode.react";
import PusherClient from 'pusher-js';

interface FocusModalProps {
  onClose: () => void;
  initialMultiplayer?: boolean;
  initialRoomCode?: string;
  initialParticipants?: any[];
  initialMode?: 'hardcore' | 'zen';
  initialDuration?: number;
  initialRemainingMins?: number;
  isGuest?: boolean;
}

declare var chrome: any;

const iconBtnStyle: React.CSSProperties = {
  position: 'relative', width: 40, height: 40, borderRadius: 20, border: 'none',
  background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

function sendToExtension(type: string, data?: any): Promise<any> {
  return new Promise((resolve) => {
    try {
      const event = new CustomEvent('flowbee_focus', { detail: { type, ...data } });
      window.dispatchEvent(event);
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type, ...data }, (response: any) => resolve(response || { ok: true }));
        return;
      }
      resolve({ ok: true });
    } catch (e) {
      resolve({ ok: false });
    }
  });
}

export default function FocusModal({ 
  onClose, 
  initialMultiplayer = false,
  initialRoomCode = "",
  initialParticipants = [],
  initialMode = 'hardcore',
  initialDuration = 25,
  initialRemainingMins,
  isGuest = false
}: FocusModalProps) {
  const { state, awardXP, notify, user } = useHP();
  
  // Timer States
  const [duration, setDuration] = useState(initialDuration);
  const [started, setStarted] = useState(false);
  const [showInviteMidSession, setShowInviteMidSession] = useState(false);
  const [secs, setSecs] = useState((initialRemainingMins || initialDuration) * 60);

  const handleDurationChange = (d: number) => {
    setDuration(d);
    setSecs(d * 60);
  };

  // Device/Extension States
  const [blocking, setBlocking] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'running' | 'failed' | 'completed'>('idle');
  const [failedReason, setFailedReason] = useState("");

  // Multiplayer States
  const [isMultiplayer, setIsMultiplayer] = useState(initialMultiplayer);
  const [focusMode, setFocusMode] = useState<'hardcore' | 'zen'>(initialMode);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDesc, setSessionDesc] = useState("");
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode);
  const [participants, setParticipants] = useState<any[]>(initialParticipants);
  const [multiplier, setMultiplier] = useState(initialParticipants.length > 1 ? 1.2 : 1.0);
  const [disconnectEvent, setDisconnectEvent] = useState<any | null>(null);

  // Phone Sync States
  const [showQR, setShowQR] = useState(initialRemainingMins !== undefined && initialMode === 'hardcore'); 
  const [phoneConnected, setPhoneConnected] = useState(isMobile || initialMode === 'zen'); 
  const [exitWarning, setExitWarning] = useState(false);

  // Invite States
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const focusTask = state?.priorities?.find((p: any) => !p.done)?.title || "General Focus";

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.users) {
          const filtered = data.users.filter((u: any) => String(u.id) !== String(user?.id));
          setPeople(filtered);
        }
      } catch (e) {
        console.error('Failed to fetch users:', e);
      }
    }
    if (state && initialRemainingMins === undefined) {
      fetchUsers();
    }
  }, [user?.id, state, initialRemainingMins]);

  useEffect(() => {
    const mobileCheck = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);
    if (mobileCheck || initialMode === 'zen') {
      setPhoneConnected(true);
      if (initialRemainingMins !== undefined) {
        setStarted(true);
        setSyncStatus('running');
      }
    }
  }, [initialRemainingMins]);

  useEffect(() => {
    if (isMultiplayer && isGuest && user?.id) {
      fetch(`/api/focus/rooms/${roomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'JOIN', userId: user.id, userName: user.name, userAvatar: (user as any).avatar || (user as any).avatar_image })
      }).catch(console.error);
    }
  }, [isMultiplayer, isGuest, roomCode, user]);

  // Mock Siska Disconnect
  useEffect(() => {
    if (started && isMultiplayer && participants.length > 1 && !disconnectEvent && initialRemainingMins === undefined) {
      const t = setTimeout(() => {
        setDisconnectEvent(participants[1]); // Mock disconnect 12s after starting
      }, 12000);
      return () => clearTimeout(t);
    }
  }, [started, isMultiplayer, participants, disconnectEvent, initialRemainingMins]);

  // QR Code Fake Connection
  // Removed automatic setTimeout mock based on user feedback.
  // Instead, wait for extension message or manual scan.
  const handleQRScanned = useCallback(() => {
    setPhoneConnected(true);
    setShowQR(false);
    setStarted(true);
    
    // Check if host already started and sync elapsed time
    let startTimestamp = Date.now();
    let currentDuration = duration;
    if (isGuest) {
      // Data is synced via Pusher
    }
    const elapsedSecs = Math.floor((Date.now() - startTimestamp) / 1000);
    const remaining = Math.max(1, currentDuration * 60 - elapsedSecs);
    setSecs(remaining);
    
    setSyncStatus('running');
    notify("HP Tersambung", "Mulai fokus, jauhkan HP Anda!", "success");
    if (!isMobile) {
      setBlocking(true);
      sendToExtension('FB_FOCUS_START', { durationMins: currentDuration });
    }
    
    if (isMultiplayer && !isGuest) {
      fetch(`/api/focus/rooms/${roomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START', userId: user?.id, title: sessionTitle, durationMins: duration, mode: focusMode })
      }).catch(console.error);
    }
    
    // Auto-update status to deepwork
    fetch('/api/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, status: 'deepwork' }) }).catch(console.error);
    
  }, [notify, duration, isMobile, isMultiplayer, roomCode, focusMode, user, isGuest, sessionTitle, participants]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FB_QR_SCANNED') {
        handleQRScanned();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleQRScanned]);

  // Host Judgment
  const handleHostJudgment = (action: 'tunggu' | 'mendesak' | 'lalai') => {
    if (action === 'lalai') {
      setMultiplier(1.0);
      notify("Penalti Diberikan", `${disconnectEvent?.name || 'Rekan'} ditandai lalai. Ia dikeluarkan dan dipotong -50 XP. Multiplier tim turun.`, "warning");
      setParticipants(prev => prev.filter(p => p.id !== disconnectEvent.id));
    } else if (action === 'mendesak') {
      notify("Dispensasi Diberikan", "Multiplier tim aman. Sesi berlanjut.", "success");
      setParticipants(prev => prev.map(p => p.id === disconnectEvent.id ? { ...p, excused: true } : p));
    } else {
      notify("Menunggu Rekan", "Timer tetap berjalan, menunggu rekan kembali.", "info");
    }
    setDisconnectEvent(null);
  };

  const [graceTimestamp, setGraceTimestamp] = useState<number | null>(null);

  // Anti-Cheat Check
  useEffect(() => {
    if (!isMobile || syncStatus !== 'running' || !user?.id || focusMode === 'zen') return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setGraceTimestamp(Date.now());
      } else {
        setGraceTimestamp((prev) => {
          if (prev) {
            const elapsed = Date.now() - prev;
            if (elapsed > 30000) {
              setSyncStatus('failed');
              setStarted(false);
              setFailedReason(`Sesi dibatalkan karena Anda meninggalkan layar lebih dari 30 detik (${Math.round(elapsed/1000)}s).`);
              
              if (isMultiplayer) {
                fetch(`/api/focus/rooms/${roomCode}/action`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'FAIL', userId: user?.id, userName: user?.name })
                }).catch(console.error);
              }
            } else {
              notify("Kembali Fokus", "Hati-hati! Sesi Anda hampir digagalkan karena keluar layar.", "warning");
            }
          }
          return null;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isMobile, syncStatus, user?.id, focusMode, notify]);

  // Pusher Syncer
  useEffect(() => {
    if (!isMultiplayer || !user?.id) return;
    
    let pusherChannel: any;
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';

    if (pusherKey) {
      if (!(window as any).Pusher) (window as any).Pusher = PusherClient;
      const pusher = new PusherClient(pusherKey, {
        cluster: pusherCluster,
        authEndpoint: '/api/pusher/auth',
        auth: { params: { user_id: user.id } }
      });
      
      pusherChannel = pusher.subscribe(`presence-focus-${roomCode}`);
      pusherChannel.bind('room-event', (ev: any) => {
        if (ev.type === 'JOIN' && !isGuest) {
          setParticipants(prev => {
            if (prev.find(p => String(p.id) === String(ev.user.id))) return prev;
            notify("Rekan Bergabung", `${ev.user.name} masuk ke ruang tunggu.`, "info");
            return [...prev, ev.user];
          });
        } 
        else if (ev.type === 'FAIL' || ev.type === 'LEAVE') {
          if (String(ev.userId) !== String(user?.id)) {
            const failedParticipant = participants.find(p => String(p.id) === String(ev.userId));
            if (failedParticipant && !disconnectEvent) {
              setDisconnectEvent(failedParticipant);
            }
          }
        }
        else if (ev.type === 'ABORT_URGENT') {
          setSyncStatus('failed');
          setStarted(false);
          setFailedReason("Sesi dibatalkan oleh Host karena alasan mendesak. Tidak ada penalti.");
        } 
        else if (ev.type === 'KICK') {
          if (String(ev.kickedUserId) === String(user?.id)) {
            setSyncStatus('failed');
            setStarted(false);
            setFailedReason("Anda telah dikeluarkan dari sesi oleh Host.");
          } else {
            setParticipants(prev => prev.filter(p => String(p.id) !== String(ev.kickedUserId)));
          }
        } 
        else if (ev.type === 'TRANSFER_HOST') {
          setParticipants(prev => prev.map(p => ({
            ...p,
            isHost: String(p.id) === String(ev.newHostId)
          })));
          if (String(ev.newHostId) === String(user?.id)) {
            notify("Anda Menjadi Host", "Host sebelumnya melimpahkan hak kendali kepada Anda.", "success");
          } else {
            notify("Host Berganti", `Admin telah berganti.`, "info");
          }
        }
        else if (ev.type === 'START' && isGuest && !started) {
          let currentDuration = ev.duration || duration;
          setDuration(currentDuration);
          if (ev.title) setSessionTitle(ev.title);
          
          if (focusMode === 'hardcore' && !isMobile) {
            setShowQR(true);
          } else {
            setStarted(true);
            const elapsedSecs = Math.floor((Date.now() - ev.timestamp) / 1000);
            const remaining = Math.max(1, currentDuration * 60 - elapsedSecs);
            setSecs(remaining);
            setSyncStatus('running');
          }
        }
        else if (ev.type === 'FB_QR_SCANNED') {
          handleQRScanned();
        }
      });
    }

    return () => {
      if (pusherChannel) {
        pusherChannel.unbind_all();
        pusherChannel.unsubscribe();
      }
    };
  }, [isMultiplayer, roomCode, user?.id, isGuest, started, focusMode, isMobile, notify, disconnectEvent, participants, duration, handleQRScanned]);

  // Timer Tick
  useEffect(() => {
    if (!started || syncStatus !== 'running') return;
    const id = setInterval(() => setSecs(s => {
      if (s <= 1) { 
        handleFocusEnd();
        return 0; 
      }
      return s - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [started, syncStatus]);

  const handleStart = useCallback(async () => {
    if (!isMobile && focusMode === 'hardcore') {
      setShowQR(true); // Must scan QR to sync
    } else {
      setStarted(true);
      setSecs(duration * 60);
      setSyncStatus('running');
      if (!isMobile) {
        setBlocking(true);
        await sendToExtension('FB_FOCUS_START', { durationMins: duration });
      }
      
      if (isMultiplayer && !isGuest) {
        fetch(`/api/focus/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'START', userId: user?.id, title: sessionTitle, description: sessionDesc, durationMins: duration, mode: focusMode })
        }).catch(console.error);
      }
    }
  }, [duration, isMobile, focusMode, isMultiplayer, roomCode, user, isGuest, sessionTitle, notify, sendToExtension, participants]);

  const handleFocusEnd = useCallback(async () => {
    setSyncStatus('completed');
    setStarted(false);
    setBlocking(false);
    if (!isMobile) await sendToExtension('FB_FOCUS_END');
    
    // Auto-revert status to working
    fetch('/api/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, status: 'working' }) }).catch(console.error);
    
    
    let base = duration >= 90 ? 150 : duration >= 45 ? 80 : 50;
    let finalXP = Math.floor(base * multiplier);

    await awardXP('focus_session', `Focus Session ${duration}m ${isMultiplayer ? '(Team Combo)' : ''}`, finalXP);
    if (isMultiplayer && multiplier > 1) {
      notify("Team Combo Selesai! 🎉", `Luar biasa! +${finalXP} Poin (Multiplier x${multiplier})`, "success");
    } else {
      notify("Focus Session Selesai 🎉", `Kamu berhasil fokus selama ${duration} menit!`, "success");
    }
    setTimeout(() => onClose(), 3000);
  }, [duration, multiplier, isMultiplayer, awardXP, notify, onClose, isMobile]);

  const handleEarlyEndAttempt = () => {
    if (isMultiplayer) {
      setExitWarning(true);
    } else {
      handleEarlyEndConfirm();
    }
  };

  const handleEarlyEndConfirm = useCallback(async (reason: 'urgent' | 'quit' | 'abort_urgent' | 'transfer_host' = 'quit') => {
    if (reason === 'transfer_host') {
      const otherParticipants = participants.filter(p => String(p.id) !== String(user?.id));
      if (otherParticipants.length > 0) {
        const newHost = otherParticipants[0];
        fetch(`/api/focus/rooms/${roomCode}/action`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'TRANSFER_HOST', userId: user?.id, targetId: newHost.id })
        });
        setExitWarning(false);
      } else {
        notify("Tidak Ada Anggota", "Tidak ada orang lain untuk menerima posisi Host.", "warning");
      }
      return;
    }

    if (reason === 'abort_urgent') {
      fetch(`/api/focus/rooms/${roomCode}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ABORT_URGENT', userId: user?.id })
      });
      return; // Will be handled by storage listener
    }

    setBlocking(false);
    if (!isMobile) await sendToExtension('FB_FOCUS_END');
    
    if (reason === 'urgent') {
      notify("Izin Terkirim", "Anda keluar dengan status Urgent. Menunggu konfirmasi Host agar tim tidak kena penalti.", "info");
    } else if (reason === 'quit') {
      notify("Anda Keluar", "Anda meninggalkan sesi secara sepihak.", "warning");
    }
    
    // Auto-revert status to working
    fetch('/api/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, status: 'working' }) }).catch(console.error);
    
    onClose();
  }, [onClose, isMobile, notify, participants, roomCode, user?.id]);

  const handleKick = (kickedId: string) => {
    fetch(`/api/focus/rooms/${roomCode}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'KICK', userId: user?.id, targetId: kickedId })
    });
    notify("Anggota Dikeluarkan", "Berhasil menendang anggota dari sesi.", "info");
  };

  const handlePingInvite = async () => {
    if (selectedFriends.length === 0) {
      notify("Pilih Teman", "Silakan pilih minimal 1 teman untuk diundang.", "warning");
      return;
    }

    try {
      await Promise.all(selectedFriends.map(friendId => 
        fetch('/api/ext/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: friendId,
            title: `Undangan Fokus Bersama`,
            message: `${user?.name || 'Rekan tim'} mengajak Anda bergabung ke sesi ${focusMode === 'hardcore' ? 'Hardcore' : 'Zen'} selama ${duration} menit. Gunakan kode room: ${roomCode}`,
            type: 'invite',
            referenceId: roomCode,
            referenceType: 'room'
          })
        })
      ));
      notify("Undangan Terkirim", `Kode room ${roomCode} telah dikirim ke ${selectedFriends.length} teman!`, "success");
      setSelectedFriends([]);
      if (showInviteMidSession) setShowInviteMidSession(false);
    } catch (e) {
      notify("Gagal", "Terjadi kesalahan saat mengirim undangan.", "error");
    }
  };

  if (!state) return null;

  const mins = Math.floor(secs / 60);
  const ss = secs % 60;

  if (syncStatus === 'failed') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: `linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)`, color: '#fff', fontFamily: HP_FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 40, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}><span style={{ fontSize: 40 }}>😡</span></div>
        <div style={{ ...HP_TEXT.h, fontSize: 32 }}>Sesi Gagal!</div>
        <div style={{ ...HP_TEXT.body, fontSize: 16, marginTop: 12, maxWidth: 300 }}>{failedReason}</div>
        <button onClick={onClose} style={{ marginTop: 40, padding: '16px 32px', borderRadius: 99, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontFamily: HP_FONT, fontWeight: 800, cursor: 'pointer' }}>Tutup</button>
      </div>
    );
  }

  if (syncStatus === 'completed') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: `linear-gradient(180deg, ${HP_TOKENS.sage} 0%, #2D4F3A 100%)`, color: '#fff', fontFamily: HP_FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <BeeMascot mood="happy" size={120} />
        <div style={{ ...HP_TEXT.h, fontSize: 32, marginTop: 24 }}>{isMultiplayer ? "TEAM COMBO BERHASIL!" : "FOKUS BERHASIL!"}</div>
        <div style={{ ...HP_TEXT.body, fontSize: 16, marginTop: 12, opacity: 0.9 }}>
          {isMultiplayer ? `Multiplier x${multiplier} diaktifkan!` : "Kamu telah fokus sepenuhnya."}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: `linear-gradient(180deg, ${HP_TOKENS.sage} 0%, #1c3525 100%)`, color: '#F4F7F9', fontFamily: HP_FONT, display: 'flex', flexDirection: 'column', animation: 'hpFadeIn 300ms', overflowY: 'auto' }}>
      <div style={{ padding: '40px 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={started ? handleEarlyEndAttempt : onClose} style={iconBtnStyle}><HPGlyph name="close" size={18} color="#F4F7F9"/></button>
        <div style={{ ...HP_TEXT.small, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{isMultiplayer ? "TEAM COMBO ROOM" : "FOCUS MODE"}</div>
        <div style={{ width: 40 }}/>
      </div>

      {exitWarning && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, color: HP_TOKENS.ink, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
            <div style={{ ...HP_TEXT.h, fontSize: 20 }}>Yakin Ingin Keluar?</div>
            <div style={{ ...HP_TEXT.body, fontSize: 14, color: '#666', marginTop: 8, marginBottom: 24 }}>
              Keluar sepihak di tengah sesi akan menghanguskan Multiplier Tim. Jika keadaan Anda mendesak, laporkan status Urgent agar tim tidak rugi.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => setExitWarning(false)} style={{ padding: '12px', borderRadius: 12, background: HP_TOKENS.sage, color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Kembali Fokus</button>
              
              {(() => {
                const isHost = participants.find(p => String(p.id) === String(user?.id))?.isHost;
                if (isHost) {
                  return (
                    <>
                      <button onClick={() => handleEarlyEndConfirm('abort_urgent')} style={{ padding: '12px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 800, cursor: 'pointer' }}>Akhiri Sesi Semua (Urgent)</button>
                      {participants.length > 1 && (
                        <button onClick={() => handleEarlyEndConfirm('transfer_host')} style={{ padding: '12px', borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Lempar Posisi Admin</button>
                      )}
                    </>
                  );
                } else {
                  return (
                    <>
                      <button onClick={() => handleEarlyEndConfirm('urgent')} style={{ padding: '12px', borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Laporkan Urgent & Keluar</button>
                      <button onClick={() => handleEarlyEndConfirm('quit')} style={{ padding: '12px', borderRadius: 12, background: 'transparent', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 800, cursor: 'pointer' }}>Keluar Sepihak</button>
                    </>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Disconnect event modal removed and moved inline */}
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, textAlign: 'center' }}>
        {showQR ? (
          <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ ...HP_TEXT.h, fontSize: 24, color: '#F4F7F9' }}>Scan HP Anda</div>
            <div style={{ ...HP_TEXT.body, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8, marginBottom: 32, maxWidth: 300 }}>
              Mode Hardcore mewajibkan sinkronisasi perangkat. Scan QR ini dengan kamera HP agar tersambung ke Sesi Fokus.
            </div>
            <div style={{ padding: 16, background: '#fff', borderRadius: 24, display: 'inline-block' }}>
              <QRCodeSVG value="https://flowbee.app/sync/4F8A" size={180} />
            </div>
            
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 240 }}>
              <button 
                onClick={onClose}
                style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 800, cursor: 'pointer', fontFamily: HP_FONT }}
              >
                Batal Bergabung
              </button>
            </div>
          </div>
        ) : !started ? (
          <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {isMultiplayer && isGuest && (
              <>
                <div style={{ ...HP_TEXT.display, fontSize: 28, color: '#F4F7F9' }}>Ruang Tunggu</div>
                <div style={{ ...HP_TEXT.body, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>Kode Room: <span style={{ color: HP_TOKENS.yellow, fontWeight: 800, letterSpacing: 2 }}>{roomCode}</span></div>
                <div style={{ marginTop: 32, padding: 32, borderRadius: 24, background: 'rgba(0,0,0,0.2)', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="hp-spinner" style={{ marginBottom: 20 }}></div>
                  <div style={{ ...HP_TEXT.small, color: '#fff', fontWeight: 600 }}>Menunggu Host memulai sesi...</div>
                </div>
                <button onClick={onClose} style={{ marginTop: 40, padding: '14px 32px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 800, cursor: 'pointer', fontFamily: HP_FONT }}>Batal Bergabung</button>
              </>
            )}

            {isMultiplayer && !isGuest && (
              <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ ...HP_TEXT.display, fontSize: 28, color: '#F4F7F9' }}>Setup Ruangan</div>
                
                <input 
                  type="text" 
                  placeholder="Judul Sesi (Wajib)" 
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12, marginTop: 16,
                    border: `1.5px solid ${sessionTitle.trim() === '' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.2)'}`, fontFamily: HP_FONT,
                    fontSize: 14, outline: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff'
                  }}
                />
                
                <textarea
                  placeholder="Deskripsi Singkat (Opsional)" 
                  value={sessionDesc}
                  onChange={(e) => setSessionDesc(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12, marginTop: 12,
                    border: `1.5px solid rgba(255,255,255,0.2)`, fontFamily: HP_FONT, resize: 'vertical', minHeight: 60,
                    fontSize: 14, outline: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff'
                  }}
                />

                <div style={{ display: 'flex', gap: 10, marginTop: 16, background: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 16 }}>
                  <button onClick={() => setFocusMode('hardcore')} style={{ padding: '12px 16px', borderRadius: 12, background: focusMode === 'hardcore' ? '#fff' : 'transparent', color: focusMode === 'hardcore' ? HP_TOKENS.ink : '#fff', border: 'none', fontWeight: 800, flex: 1 }}>🔥 Hardcore</button>
                  <button onClick={() => setFocusMode('zen')} style={{ padding: '12px 16px', borderRadius: 12, background: focusMode === 'zen' ? '#fff' : 'transparent', color: focusMode === 'zen' ? HP_TOKENS.ink : '#fff', border: 'none', fontWeight: 800, flex: 1 }}>🧘 Zen Mode</button>
                </div>
                <div style={{ ...HP_TEXT.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8, height: 32 }}>
                  {focusMode === 'hardcore' ? '🔥 Hardcore: Wajib scan HP. Jika keluar aplikasi HP, sesi gagal.' : '🧘 Zen Mode: Santai. Boleh buka aplikasi lain, fokus hanya pada target.'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 16, background: 'rgba(255,255,255,0.05)', padding: '12px 24px', borderRadius: 24 }}>
                  <button onClick={() => handleDurationChange(Math.max(5, duration - 5))} style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 24, fontWeight: 800, cursor: 'pointer' }}>-</button>
                  <div style={{ fontSize: 36, fontWeight: 800, fontFamily: HP_FONT, color: '#fff', width: 80, textAlign: 'center' }}>
                    {duration} <span style={{ fontSize: 16, opacity: 0.6 }}>min</span>
                  </div>
                  <button onClick={() => handleDurationChange(Math.min(180, duration + 5))} style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 24, fontWeight: 800, cursor: 'pointer' }}>+</button>
                </div>

                <div style={{ marginTop: 24, padding: '20px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', width: '100%', maxWidth: 320 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 8 }}>KODE ROOM (HOST)</div>
                  <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 6, color: HP_TOKENS.yellow }}>{roomCode}</div>
                  
                  <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 12, textAlign: 'left' }}>AJAK TEMAN (OPSIONAL)</div>
                    
                    <input 
                      type="text" 
                      placeholder="Cari nama atau divisi..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 12,
                        border: `1.5px solid rgba(255,255,255,0.2)`, fontFamily: HP_FONT,
                        fontSize: 13, marginBottom: 12, outline: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff'
                      }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                      {people.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '12px' }}>Memuat daftar rekan...</div>
                      ) : (() => {
                        const filtered = people.filter(p => 
                          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.job_title || p.role || '').toLowerCase().includes(searchQuery.toLowerCase())
                        );

                        if (filtered.length === 0) return <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '12px' }}>Tidak ditemukan</div>;

                        return filtered.map(f => {
                          const isSelected = selectedFriends.includes(f.id);
                          return (
                            <div 
                              key={f.id} 
                              onClick={() => {
                                if (isSelected) setSelectedFriends(prev => prev.filter(id => id !== f.id));
                                else setSelectedFriends(prev => [...prev, f.id]);
                              }}
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', 
                                padding: '12px', borderRadius: 16, 
                                background: isSelected ? 'rgba(245,200,66,0.15)' : 'rgba(255,255,255,0.05)',
                                border: `1.5px solid ${isSelected ? HP_TOKENS.yellow : 'rgba(255,255,255,0.1)'}`,
                                transition: 'all 0.2s'
                              }}
                            >
                              <HPAvatar name={f.name} size={40} />
                              <div style={{ flex: 1, textAlign: 'left' }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: isSelected ? HP_TOKENS.yellow : '#fff' }}>{f.name}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{f.job_title || f.role || 'Team Member'}</div>
                              </div>
                              <div style={{
                                width: 20, height: 20, borderRadius: 10,
                                border: `2px solid ${isSelected ? HP_TOKENS.yellow : 'rgba(255,255,255,0.3)'}`,
                                background: isSelected ? HP_TOKENS.yellow : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                {isSelected && <span style={{ fontSize: 12, color: HP_TOKENS.ink, fontWeight: 800 }}>✓</span>}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  <button onClick={handlePingInvite} style={{ padding: '12px', marginTop: 16, borderRadius: 12, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', width: '100%' }}>Kirim Undangan</button>
                </div>

                <button disabled={sessionTitle.trim() === ''} onClick={handleStart} style={{ marginTop: 28, padding: '16px 40px', borderRadius: 99, background: sessionTitle.trim() === '' ? '#555' : HP_TOKENS.yellow, color: sessionTitle.trim() === '' ? '#888' : HP_TOKENS.ink, border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: sessionTitle.trim() === '' ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                  Mulai & Buka Ruangan
                </button>
              </div>
            )}

            {!isMultiplayer && (
              <>
                <BeeMascot mood="focus" size={100} showSpeech="Siap bekerja dalam diam?" />
                <div style={{ ...HP_TEXT.display, fontSize: 28, color: '#F4F7F9', marginTop: 16 }}>Sesi Fokus Solo</div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 36, background: 'rgba(255,255,255,0.05)', padding: '12px 24px', borderRadius: 24 }}>
                  <button onClick={() => handleDurationChange(Math.max(5, duration - 5))} style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 24, fontWeight: 800, cursor: 'pointer' }}>-</button>
                  <div style={{ fontSize: 36, fontWeight: 800, fontFamily: HP_FONT, color: '#fff', width: 80, textAlign: 'center' }}>
                    {duration} <span style={{ fontSize: 16, opacity: 0.6 }}>min</span>
                  </div>
                  <button onClick={() => handleDurationChange(Math.min(180, duration + 5))} style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 24, fontWeight: 800, cursor: 'pointer' }}>+</button>
                </div>

                <button onClick={handleStart} style={{ marginTop: 28, padding: '16px 40px', borderRadius: 99, background: HP_TOKENS.yellow, color: HP_TOKENS.ink, border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 6px 20px rgba(245,200,66,0.4)' }}>
                  Mulai Sendiri
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {(() => {
              const isHost = participants.find(p => String(p.id) === String(user?.id))?.isHost;
              return isMultiplayer && isHost && (
                <div style={{ marginBottom: 24, width: '100%', maxWidth: 320 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 16, textAlign: 'center' }}>
                    {sessionTitle}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 700, letterSpacing: 1 }}>ROOM CODE</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: HP_TOKENS.yellow, letterSpacing: 2 }}>{roomCode}</div>
                    </div>
                    <button 
                      onClick={() => setShowInviteMidSession(!showInviteMidSession)}
                      style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {showInviteMidSession ? 'Tutup' : '+ Undang'}
                    </button>
                  </div>
                  
                  {showInviteMidSession && (
                    <div style={{ marginTop: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 16 }}>
                      <input 
                        type="text" 
                        placeholder="Cari rekan..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: 12, border: `1.5px solid rgba(255,255,255,0.2)`, fontSize: 13, marginBottom: 12, background: 'transparent', color: '#fff' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
                        {people.filter(p => !participants.find(part => String(part.id) === String(p.id)) && p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(f => {
                          const isSelected = selectedFriends.includes(f.id);
                          return (
                            <div key={f.id} onClick={() => {
                              if (isSelected) setSelectedFriends(prev => prev.filter(id => id !== f.id));
                              else setSelectedFriends(prev => [...prev, f.id]);
                            }} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px', borderRadius: 12, background: isSelected ? 'rgba(245,200,66,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isSelected ? HP_TOKENS.yellow : 'transparent'}` }}>
                              <HPAvatar name={f.name} size={30} />
                              <div style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 700, color: isSelected ? HP_TOKENS.yellow : '#fff' }}>{f.name}</div>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={handlePingInvite} style={{ padding: '10px', marginTop: 12, borderRadius: 10, background: HP_TOKENS.yellow, color: HP_TOKENS.ink, border: 'none', fontWeight: 800, width: '100%', cursor: 'pointer' }}>Kirim Undangan</button>
                    </div>
                  )}
                </div>
              );
            })()}

            {isMultiplayer && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                {participants.map((p, i) => {
                  const isHost = participants.find(part => String(part.id) === String(user?.id))?.isHost;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} title={p.name || 'Anggota Tim'}>
                      <div style={{ width: 56, height: 56, borderRadius: 28, background: p.excused ? 'rgba(255,255,255,0.2)' : '#fff', color: HP_TOKENS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, border: `3px solid ${p.excused ? '#666' : HP_TOKENS.yellow}`, opacity: p.excused ? 0.5 : 1 }}>
                        {p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}/> : (p.name?.charAt(0) || '?')}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 8, color: 'rgba(255,255,255,0.9)', maxWidth: 64, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name ? p.name.split(' ')[0] : 'Tim'}
                      </div>
                      {p.excused && <div style={{ fontSize: 10, marginTop: 2, color: '#fca5a5' }}>Urgent</div>}
                      
                      {isHost && String(p.id) !== String(user?.id) && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                          {disconnectEvent?.id === p.id ? (
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ fontSize: 10, color: '#fca5a5', fontWeight: 800 }}>⚠️ Terputus</div>
                              <button onClick={() => handleHostJudgment('tunggu')} style={{ fontSize: 9, padding: '4px', background: HP_TOKENS.sage, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Tunggu</button>
                              <button onClick={() => handleHostJudgment('mendesak')} style={{ fontSize: 9, padding: '4px', background: 'rgba(245,158,11,0.2)', color: '#d97706', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Dispensasi</button>
                              <button onClick={() => handleHostJudgment('lalai')} style={{ fontSize: 9, padding: '4px', background: 'rgba(239,68,68,0.2)', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Lalai</button>
                            </div>
                          ) : (
                            <button onClick={() => handleKick(p.id)} style={{ fontSize: 9, padding: '4px 8px', borderRadius: 8, background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
                              ❌ Keluarkan
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!isMultiplayer && <BeeMascot mood="focus" size={80} showSpeech="Fokus!" />}

            {focusMode === 'hardcore' && isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 99, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', marginTop: 16 }}>
                <span style={{ fontSize: 14 }}>⚠️</span><span style={{ fontSize: 12, fontWeight: 800, color: '#fca5a5' }}>Jangan tutup layar ini! (Hardcore)</span>
              </div>
            )}

            <div style={{ fontSize: 80, fontWeight: 800, fontFamily: HP_FONT, letterSpacing: -2, marginTop: 16 }}>
              {String(mins).padStart(2,'0')}:{String(ss).padStart(2,'0')}
            </div>
            
            <div style={{ ...HP_TEXT.body, color: 'rgba(255,255,255,0.8)', marginTop: 12 }}>{focusTask}</div>
            
            <div style={{ marginTop: 40, width: 200 }}>
              <HPBar value={((duration * 60 - secs) / (duration * 60)) * 100} tone="yellow" height={4}/>
            </div>
            
            <button onClick={handleEarlyEndAttempt} style={{ marginTop: 48, padding: '12px 28px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', color: '#F4F7F9', border: '1px solid rgba(255,255,255,0.2)', fontFamily: HP_FONT, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Batal & Keluar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

