"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useHP } from "@/lib/HPContext";
import { 
  HP_TOKENS, 
  HP_FONT, 
  HP_TEXT 
} from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPBar from "@/components/ui/HPBar";
import BeeMascot from "@/components/ui/BeeMascot";

interface FocusModalProps {
  onClose: () => void;
}

declare var chrome: any;

const iconBtnStyle: React.CSSProperties = {
  position: 'relative', width: 40, height: 40, borderRadius: 20, border: 'none',
  background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

// Send message to FocusBuddy extension
function sendToExtension(type: string, data?: any): Promise<any> {
  return new Promise((resolve) => {
    try {
      const event = new CustomEvent('flowbee_focus', { 
        detail: { type, ...data } 
      });
      window.dispatchEvent(event);
      
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type, ...data }, (response: any) => {
          resolve(response || { ok: true });
        });
        return;
      }
      resolve({ ok: true });
    } catch (e) {
      console.warn('Extension communication failed:', e);
      resolve({ ok: false });
    }
  });
}

export default function FocusModal({ onClose }: FocusModalProps) {
  const { state, awardXP, notify, user, updateUser, updateState } = useHP();
  const [duration, setDuration] = useState(25);
  const [started, setStarted] = useState(false);
  const [secs, setSecs] = useState(25 * 60);
  const [blocking, setBlocking] = useState(false);
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'running' | 'failed' | 'completed'>('idle');
  const [failedReason, setFailedReason] = useState("");
  
  const [selectedSites, setSelectedSites] = useState<string[]>([
    'youtube.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'reddit.com', 'facebook.com', 'netflix.com', 'twitch.tv'
  ]);

  // Map readable names to domains
  const SITES_MAP = [
    { label: 'YouTube', domains: ['youtube.com'] },
    { label: 'Twitter/X', domains: ['twitter.com', 'x.com'] },
    { label: 'Instagram', domains: ['instagram.com'] },
    { label: 'TikTok', domains: ['tiktok.com'] },
    { label: 'Reddit', domains: ['reddit.com'] },
    { label: 'Facebook', domains: ['facebook.com'] },
    { label: 'Netflix', domains: ['netflix.com'] },
    { label: 'Twitch', domains: ['twitch.tv'] },
  ];

  const focusTask = state?.priorities?.find((p: any) => !p.done)?.title || "General Focus";

  // Device & Extension Detection
  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent));
    
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        setExtensionAvailable(true);
      }
    } catch (e) {
      setExtensionAvailable(false);
    }
    
    // Clear sync state initially
    if (user?.id) {
      fetch('/api/focus/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: 'idle' })
      }).catch(e => console.error(e));
    }
  }, [user?.id]);

  // Desktop Polling
  useEffect(() => {
    if (isMobile || !user?.id) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/focus/sync?userId=${user.id}`);
        const data = await res.json();
        
        if (data.status === 'running' && syncStatus !== 'running') {
          // Mobile started the session!
          setSyncStatus('running');
          setDuration(data.duration || 25);
          
          // Calculate remaining seconds if joined late
          if (data.startedAt) {
            const elapsed = Math.floor((Date.now() - data.startedAt) / 1000);
            setSecs(Math.max(0, (data.duration || 25) * 60 - elapsed));
          } else {
            setSecs((data.duration || 25) * 60);
          }
          
          setStarted(true);
          setBlocking(true);
          
          await sendToExtension('FB_FOCUS_START', { 
            durationMins: data.duration || 25,
            sitesToBlock: selectedSites 
          });
          localStorage.setItem('fb_focus_active', 'true');
        } 
        else if (data.status === 'failed' && syncStatus === 'running') {
          // Mobile failed (user left app)
          setSyncStatus('failed');
          setStarted(false);
          setBlocking(false);
          await sendToExtension('FB_FOCUS_END');
          localStorage.removeItem('fb_focus_active');
          setFailedReason("Kamu ketahuan keluar dari aplikasi di HP!");
          
          // Deduct points & notify buddy
          updateUser(prev => ({ ...prev, points: Math.max(0, prev.points - 10), coins: Math.max(0, prev.coins - 10) }));
          updateState(prev => ({ ...prev, points: Math.max(0, prev.points - 10), coins: Math.max(0, prev.coins - 10) }));
          notify("Sesi Fokus Gagal! 😡", "Kamu ketahuan main HP. -10 Poin!", "error");
        }
        else if (data.status === 'completed' && syncStatus === 'running') {
          handleFocusEnd();
        }
      } catch (e) {
        console.error("Sync error", e);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isMobile, user?.id, syncStatus, selectedSites]);

  // Mobile Visibility Listener (Anti-Cheat)
  useEffect(() => {
    if (!isMobile || syncStatus !== 'running' || !user?.id) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched apps or locked phone while running!
        setSyncStatus('failed');
        setStarted(false);
        setFailedReason("Sesi dibatalkan karena kamu keluar dari layar ini.");
        fetch('/api/focus/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, status: 'failed' })
        }).catch(e => console.error(e));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isMobile, syncStatus, user?.id]);

  // Local Timer
  useEffect(() => {
    if (!started || syncStatus !== 'running') return;
    const id = setInterval(() => setSecs(s => {
      if (s <= 1) {
        if (isMobile) {
          fetch('/api/focus/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user?.id, status: 'completed' })
          });
        }
        handleFocusEnd();
        return 0;
      }
      return s - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [started, syncStatus, isMobile, user?.id]);

  // Mobile Start
  const handleMobileStart = useCallback(async () => {
    if (!user?.id) return;
    setStarted(true);
    setSecs(duration * 60);
    setSyncStatus('running');
    
    await fetch('/api/focus/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user.id, 
        status: 'running', 
        duration: duration,
        startedAt: Date.now()
      })
    });
  }, [duration, user?.id]);

  const handleFocusEnd = useCallback(async () => {
    setSyncStatus('completed');
    setStarted(false);
    setBlocking(false);
    
    if (!isMobile) {
      await sendToExtension('FB_FOCUS_END');
      localStorage.removeItem('fb_focus_active');
    }
    
    await awardXP('focus_session', `Focus Session ${duration} menit`);
    notify("Focus Session Selesai 🎉", `Kamu berhasil fokus selama ${duration} menit! +10 Poin`, "success");
    setTimeout(() => onClose(), 2000);
  }, [duration, awardXP, notify, onClose, isMobile]);

  const handleEarlyEnd = useCallback(async () => {
    setBlocking(false);
    if (!isMobile) {
      await sendToExtension('FB_FOCUS_END');
      localStorage.removeItem('fb_focus_active');
    }
    onClose();
  }, [onClose, isMobile]);

  const toggleSite = (domain: string) => {
    setSelectedSites(prev => 
      prev.includes(domain) ? prev.filter(s => s !== domain) : [...prev, domain]
    );
  };

  if (!state) return null;

  const mins = Math.floor(secs / 60);
  const ss = secs % 60;

  // Render Failed State
  if (syncStatus === 'failed') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)`,
        color: '#fff', fontFamily: HP_FONT, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center'
      }}>
        <div style={{ width: 80, height: 80, borderRadius: 40, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 40 }}>😡</span>
        </div>
        <div style={{ ...HP_TEXT.h, fontSize: 32 }}>Sesi Gagal!</div>
        <div style={{ ...HP_TEXT.body, fontSize: 16, marginTop: 12, maxWidth: 300 }}>
          {failedReason}
        </div>
        <div style={{ ...HP_TEXT.small, color: '#fca5a5', marginTop: 8 }}>
          Kamu kehilangan poin dari sesi ini.
        </div>
        <button 
          onClick={onClose} 
          style={{
            marginTop: 40, padding: '16px 32px', borderRadius: 99,
            background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none',
            fontFamily: HP_FONT, fontWeight: 800, cursor: 'pointer'
          }}
        >
          Tutup
        </button>
      </div>
    );
  }

  // Render Completed State
  if (syncStatus === 'completed') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `linear-gradient(180deg, ${HP_TOKENS.sage} 0%, #2D4F3A 100%)`,
        color: '#fff', fontFamily: HP_FONT, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center'
      }}>
        <BeeMascot mood="happy" size={120} />
        <div style={{ ...HP_TEXT.h, fontSize: 32, marginTop: 24 }}>Berhasil!</div>
        <div style={{ ...HP_TEXT.body, fontSize: 16, marginTop: 12, opacity: 0.9 }}>
          Kamu telah fokus sepenuhnya.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', 
      inset: 0, 
      zIndex: 9999,
      background: `linear-gradient(180deg, ${HP_TOKENS.sage} 0%, #2D4F3A 100%)`,
      color: '#F4F7F9', 
      fontFamily: HP_FONT,
      display: 'flex', 
      flexDirection: 'column', 
      animation: 'hpFadeIn 300ms',
      overflowY: 'auto'
    }}>
      <div style={{ padding: '56px 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={started ? handleEarlyEnd : onClose} style={iconBtnStyle}>
          <HPGlyph name="close" size={18} color="#F4F7F9"/>
        </button>
        <div style={{ ...HP_TEXT.small, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>FOCUS MODE</div>
        <div style={{ width: 40 }}/>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, textAlign: 'center' }}>
        <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', paddingBottom: 60 }}>
        {!started ? (
          <>
            <BeeMascot mood="focus" size={100} showSpeech={isMobile ? "Aku akan jaga layar ini!" : "Menunggu kamu di HP..."} />
            <div style={{ ...HP_TEXT.display, fontSize: 28, color: '#F4F7F9', marginTop: 16 }}>
              {isMobile ? "Mulai Sesi di HP" : "Kunci Lewat HP"}
            </div>
            <div style={{ ...HP_TEXT.body, color: 'rgba(255,255,255,0.75)', marginTop: 8, maxWidth: 320, lineHeight: 1.5 }}>
              {isMobile 
                ? "Layar HP ini akan mengunci fokusmu. Jangan buka tab atau aplikasi lain selama sesi berjalan!" 
                : "Buka Flowbee di HP kamu untuk mengunci perangkat, atau scan QR code di bawah ini jika belum di-pin."}
            </div>

            {/* Desktop Only: QR Code & Site Settings */}
            {!isMobile && (
              <>
                <div style={{ 
                  marginTop: 24, padding: 16, background: '#fff', borderRadius: 16,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.2)', display: 'inline-block'
                }}>
                  {/* Using a placeholder QR for development. We assume IP 192.168.18.23 */}
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=http://192.168.18.23:3000/?action=focus`} alt="QR Code" width={120} height={120} />
                </div>

                {/* Blocked sites selector */}
                <div style={{ 
                  marginTop: 28, padding: '16px 20px', borderRadius: 16,
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid rgba(255,255,255,0.12)',
                  maxWidth: 340, width: '100%',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 16 }}>🔒</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                        Situs yang diblokir di Desktop
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                        Hilangkan centang jika butuh akses untuk kerja (misal: Socmed)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SITES_MAP.map(site => {
                      const isActive = site.domains.every(d => selectedSites.includes(d));
                      return (
                        <button 
                          key={site.label} 
                          onClick={() => site.domains.forEach(d => toggleSite(d))}
                          style={{
                            padding: '6px 12px', borderRadius: 99,
                            background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                            border: `1px solid ${isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
                            fontSize: 12, fontWeight: 700, 
                            color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{
                            width: 12, height: 12, borderRadius: 3,
                            background: isActive ? '#fff' : 'transparent',
                            border: `1px solid ${isActive ? '#fff' : 'rgba(255,255,255,0.5)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isActive && <HPGlyph name="check" size={10} color={HP_TOKENS.sage} />}
                          </div>
                          {site.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: 24, ...HP_TEXT.body, color: HP_TOKENS.yellow, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, animation: 'hpPulse 2s infinite' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: HP_TOKENS.yellow }} />
                  Menunggu kamu memulai sesi di HP...
                </div>
              </>
            )}

            {/* Mobile Only: Duration Selector & Start Button */}
            {isMobile && (
              <>
                <div style={{ display: 'flex', gap: 10, marginTop: 36 }}>
                  {[25, 45, 90].map(d => (
                    <button 
                      key={d} 
                      onClick={() => { setDuration(d); setSecs(d * 60); }} 
                      style={{
                        padding: '14px 22px', 
                        borderRadius: 99,
                        background: duration === d ? '#fff' : 'rgba(255,255,255,0.15)',
                        color: duration === d ? HP_TOKENS.sage : '#fff',
                        border: 'none', 
                        fontFamily: HP_FONT, 
                        fontWeight: 800, 
                        fontSize: 15, 
                        cursor: 'pointer',
                      }}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleMobileStart} 
                  style={{
                    marginTop: 28, 
                    padding: '16px 40px', 
                    borderRadius: 99,
                    background: HP_TOKENS.yellow, 
                    color: HP_TOKENS.ink, 
                    border: 'none',
                    fontFamily: HP_FONT, 
                    fontWeight: 800, 
                    fontSize: 16, 
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(245,200,66,0.4)',
                  }}
                  className="hp-tap"
                >
                  🔒 Mulai Fokus
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <BeeMascot mood="focus" size={100} showSpeech={isMobile ? "HP terkunci! Semangat!" : "Sesi berjalan..."} />
            
            {/* Blocking indicator */}
            {!isMobile && blocking && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 18px', borderRadius: 99,
                background: 'rgba(251,191,36,0.15)', 
                border: '1px solid rgba(251,191,36,0.3)',
                marginTop: 16,
              }}>
                <span style={{ fontSize: 14 }}>🔒</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24' }}>
                  Situs distraksi diblokir
                </span>
              </div>
            )}

            {isMobile && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 18px', borderRadius: 99,
                background: 'rgba(239,68,68,0.15)', 
                border: '1px solid rgba(239,68,68,0.3)',
                marginTop: 16,
              }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#fca5a5' }}>
                  Jangan tutup/minimize layar ini!
                </span>
              </div>
            )}

            <div style={{ fontSize: 72, fontWeight: 800, fontFamily: HP_FONT, letterSpacing: -2, marginTop: 16 }}>
              {String(mins).padStart(2,'0')}:{String(ss).padStart(2,'0')}
            </div>
            <div style={{ ...HP_TEXT.body, color: 'rgba(255,255,255,0.8)', marginTop: 12 }}>
              {focusTask}
            </div>
            <div style={{ marginTop: 40, width: 200 }}>
              <HPBar value={((duration * 60 - secs) / (duration * 60)) * 100} tone="yellow" height={4}/>
            </div>
            <button 
              onClick={handleEarlyEnd} 
              style={{
                marginTop: 36, 
                padding: '12px 28px', 
                borderRadius: 99,
                background: 'rgba(255,255,255,0.15)', 
                color: '#F4F7F9', 
                border: '1px solid rgba(255,255,255,0.3)',
                fontFamily: HP_FONT, 
                fontWeight: 700, 
                fontSize: 14, 
                cursor: 'pointer',
              }}
              className="hp-tap"
            >
              Selesai lebih awal
            </button>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
