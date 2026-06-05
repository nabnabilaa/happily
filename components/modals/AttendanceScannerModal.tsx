"use client";

import React, { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { HP_TOKENS, HP_FONT, HP_TEXT, HP_MOODS } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";
import HPGlyph from "@/components/ui/HPGlyph";

interface AttendanceScannerModalProps {
  onClose: () => void;
}

export default function AttendanceScannerModal({ onClose }: AttendanceScannerModalProps) {
  const { state, user, updateUser, updateState } = useHP();
  const [status, setStatus] = useState<'loading' | 'idle' | 'verifying' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState("");
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [checkInType, setCheckInType] = useState('WFO');
  const [officeId, setOfficeId] = useState('');
  const [notes, setNotes] = useState('');
  const [offices, setOffices] = useState<any[]>([]);
  const [selectedMood, setSelectedMood] = useState('');
  
  // Today's attendance state
  const [todayStatus, setTodayStatus] = useState<'not_checked_in' | 'checked_in' | 'checked_out'>('not_checked_in');
  const [todayData, setTodayData] = useState<any>(null);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);

  useEffect(() => {
    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
    
    // Fetch offices
    fetch("/api/settings/office").then(res => res.json()).then(data => {
      if (data.offices) {
        setOffices(data.offices);
        if (data.offices.length > 0) setOfficeId(data.offices[0].id);
      }
    }).catch(() => {});

    // Check today's attendance status
    fetchTodayStatus();
  }, []);

  const fetchTodayStatus = async () => {
    try {
      const res = await fetch(`/api/attendance/summary?userId=${user?.id}`);
      const data = await res.json();
      if (data.today) {
        setTodayStatus(data.today.status);
        setTodayData(data.today);
      }
    } catch (e) {
      console.error(e);
    }
    setStatus('idle');
  };

  const handleCheckIn = async () => {
    setStatus('verifying');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          token: "manual_checkin",
          lat: location?.lat,
          lng: location?.lng,
          checkInType,
          officeId,
          notes
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await res.json();
      
      if (data.success) {
        setStatus('success');
        if (data.streak) updateUser((u: any) => ({ ...u, streak: data.streak }));
        updateState((s: any) => ({
          ...s,
          todayAttendance: { ...s.todayAttendance, checkIn: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }
        }));
        setTimeout(onClose, 2000);
      } else {
        setStatus('error');
        setErrorMsg(data.error || "Gagal check-in");
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      setStatus('error');
      setErrorMsg(e.name === 'AbortError' ? "Timeout. Cek koneksi internet." : "Terjadi kesalahan.");
    }
  };

  const handleCheckOut = async () => {
    setStatus('verifying');
    try {
      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          mood: selectedMood || null,
          notes: notes || null
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setStatus('success');
        setCheckoutResult(data);
        updateState((s: any) => ({
          ...s,
          todayAttendance: { 
            ...s.todayAttendance, 
            checkOut: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) 
          }
        }));
        setTimeout(onClose, 3000);
      } else {
        setStatus('error');
        setErrorMsg(data.error || "Gagal clock-out");
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg("Terjadi kesalahan koneksi.");
    }
  };

  const isCheckingIn = todayStatus === 'not_checked_in';
  const isCheckingOut = todayStatus === 'checked_in';
  const isDone = todayStatus === 'checked_out';

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: 14,
    border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
    outline: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink, boxSizing: 'border-box',
  };

  if (status === 'loading') {
    return (
      <Modal onClose={onClose} title="⏰ Attendance">
        <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Memuat status...</div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title={isCheckingIn ? "⏰ Clock In" : isCheckingOut ? "⏰ Clock Out" : "✅ Attendance"}>
      <div style={{ padding: '10px 0' }}>
        {/* Success State */}
        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{checkoutResult ? '🌙' : '✅'}</div>
            <div style={{ ...HP_TEXT.h, fontSize: 18 }}>
              {checkoutResult ? 'Clock-out Berhasil!' : 'Clock-in Berhasil!'}
            </div>
            {checkoutResult && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  display: 'inline-block', padding: '12px 24px', borderRadius: 16,
                  background: HP_TOKENS.sageWash, border: `1.5px solid ${HP_TOKENS.sage}40`,
                }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>DURASI KERJA</div>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 24, color: HP_TOKENS.sage }}>
                    {checkoutResult.durationFormatted}
                  </div>
                </div>
              </div>
            )}
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.sage, fontWeight: 800, marginTop: 12 }}>
              +{checkoutResult ? '10' : '20'} EXP 🎁
            </div>
          </div>
        ) : isDone ? (
          /* Already Done for today */
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Hari Ini Sudah Selesai!</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <div style={{
                padding: '12px 20px', borderRadius: 14, background: HP_TOKENS.sageWash,
                border: `1px solid ${HP_TOKENS.sage}30`, textAlign: 'center'
              }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>CLOCK IN</div>
                <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: HP_TOKENS.sage }}>
                  {todayData?.checkInAt ? new Date(todayData.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </div>
              </div>
              <div style={{
                padding: '12px 20px', borderRadius: 14, background: HP_TOKENS.blueSoft,
                border: `1px solid ${HP_TOKENS.blue}30`, textAlign: 'center'
              }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>CLOCK OUT</div>
                <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: HP_TOKENS.blue }}>
                  {todayData?.checkOutAt ? new Date(todayData.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </div>
              </div>
              {todayData?.duration && (
                <div style={{
                  padding: '12px 20px', borderRadius: 14, background: HP_TOKENS.yellowSoft,
                  border: `1px solid ${HP_TOKENS.yellow}30`, textAlign: 'center'
                }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>DURASI</div>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: '#8A6814' }}>
                    {Math.floor(todayData.duration / 60)}j {todayData.duration % 60}m
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Currently Checked In - Show checkout info */}
            {isCheckingOut && todayData?.checkInAt && (
              <div style={{
                padding: '14px 16px', borderRadius: 16, marginBottom: 16,
                background: HP_TOKENS.sageWash, border: `1.5px solid ${HP_TOKENS.sage}40`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ fontSize: 24 }}>✅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>CLOCK IN PUKUL</div>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 18, color: HP_TOKENS.sage }}>
                    {new Date(todayData.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>TIPE</div>
                  <div style={{ ...HP_TEXT.body, fontWeight: 800, color: HP_TOKENS.ink }}>{todayData.type || 'WFO'}</div>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {isCheckingIn && (
                <>
                  <div>
                    <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                      Tipe Kehadiran
                    </label>
                    <select value={checkInType} onChange={e => setCheckInType(e.target.value)} style={selectStyle}>
                      <option value="WFO">Work From Office</option>
                      <option value="WFA">Work From Anywhere</option>
                      <option value="DINAS">Perjalanan Dinas</option>
                    </select>
                  </div>

                  {checkInType === 'WFO' && (
                    <div>
                      <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                        Lokasi Kantor
                      </label>
                      <select value={officeId} onChange={e => setOfficeId(e.target.value)} style={selectStyle}>
                        {offices.map(off => (
                          <option key={off.id} value={off.id}>{off.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {checkInType !== 'WFO' && (
                    <div>
                      <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                        Catatan/Alasan
                      </label>
                      <input 
                        type="text" value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Misal: Bekerja dari cafe..."
                        style={selectStyle}
                      />
                    </div>
                  )}
                </>
              )}

              {isCheckingOut && (
                <>
                  <div>
                    <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, display: 'block', marginBottom: 8 }}>
                      Bagaimana perasaanmu hari ini?
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(state?.moods || HP_MOODS).map(m => (
                        <button 
                          key={m.key}
                          onClick={() => setSelectedMood(m.key)}
                          className="hp-tap"
                          style={{
                            flex: '1 1 auto', minWidth: 60, padding: '10px 8px', borderRadius: 14, border: 'none',
                            background: selectedMood === m.key ? `${HP_TOKENS.yellow}20` : HP_TOKENS.lineSoft,
                            cursor: 'pointer', textAlign: 'center',
                            outline: selectedMood === m.key ? `2px solid ${HP_TOKENS.yellow}` : 'none',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ fontSize: 22 }}>{m.emoji}</div>
                          <div style={{ ...HP_TEXT.tiny, fontWeight: 700, marginTop: 4, color: HP_TOKENS.inkSoft }}>{m.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                      Catatan akhir hari (opsional)
                    </label>
                    <input
                      type="text" value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Misal: Hari yang produktif..."
                      style={selectStyle}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Verifying Spinner */}
            {status === 'verifying' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, border: `3px solid ${HP_TOKENS.line}`,
                  borderTopColor: HP_TOKENS.blue, borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <div style={{ ...HP_TEXT.h, fontSize: 14 }}>
                  {isCheckingIn ? 'Memverifikasi...' : 'Menyimpan...'}
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div style={{ 
                marginBottom: 16, padding: 12, borderRadius: 12, background: HP_TOKENS.coralSoft, 
                color: HP_TOKENS.coral, fontSize: 13, fontWeight: 700, textAlign: 'center'
              }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Action Buttons */}
            {status !== 'verifying' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button 
                  onClick={isCheckingIn ? handleCheckIn : handleCheckOut} 
                  className="hp-tap"
                  style={{
                    width: '100%', padding: '16px', borderRadius: 99, border: 'none',
                    background: isCheckingIn 
                      ? `linear-gradient(135deg, ${HP_TOKENS.blue}, #2B5286)` 
                      : `linear-gradient(135deg, ${HP_TOKENS.sage}, #2D7A4E)`,
                    color: '#F4F7F9',
                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: isCheckingIn 
                      ? '0 6px 20px rgba(59,111,160,0.3)' 
                      : '0 6px 20px rgba(74,124,89,0.3)',
                  }}
                >
                  <HPGlyph name={isCheckingIn ? "target" : "check"} size={18} color="#F4F7F9" />
                  {isCheckingIn ? 'Clock In Sekarang' : 'Clock Out Sekarang'}
                </button>
                
                <button onClick={onClose} style={{
                  width: '100%', padding: '14px', borderRadius: 99,
                  background: HP_TOKENS.lineSoft, color: HP_TOKENS.ink, border: 'none',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer'
                }}>
                  Batal
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
