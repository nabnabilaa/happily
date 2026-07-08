"use client";

import React, { useState, useEffect } from "react";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";
import { isNetworkError } from "@/lib/errorUtils";

interface AttendanceWidgetProps {
  openModal: (name: string, props?: any) => void;
}

export default function AttendanceWidget({ openModal }: AttendanceWidgetProps) {
  const { user, state } = useHP();
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const handleUpdate = () => fetchStatus();
    window.addEventListener('hp_db_update', handleUpdate);
    return () => window.removeEventListener('hp_db_update', handleUpdate);
  }, []);

  const fetchStatus = async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/attendance/summary?userId=${user?.id}`);
      const data = await res.json();
      if (data.today) setTodayData(data.today);
    } catch (e: any) {
      if (isNetworkError(e)) {
        console.warn("Failed to fetch attendance status (network issue):", e.message || e);
      } else {
        console.error(e);
      }
    }
    setLoading(false);
  };

  if (loading) return (
    <div id="attendance-clock-in-btn" style={{ minHeight: '60px', opacity: 0 }}></div>
  );

  const status = todayData?.status || 'not_checked_in';
  const checkInTime = todayData?.checkInAt 
    ? new Date(todayData.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) 
    : null;
  const checkOutTime = todayData?.checkOutAt
    ? new Date(todayData.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;

  // Not checked in - urgent CTA
  if (status === 'not_checked_in') {
    const isBeforeClockInTime = state?.workSchedule?.start 
      ? (new Date().getHours() * 60 + new Date().getMinutes() < parseInt(state.workSchedule.start.split(':')[0]) * 60 + parseInt(state.workSchedule.start.split(':')[1]) - 60)
      : false;

    if (isBeforeClockInTime) {
      return (
        <div style={{ 
          padding: '16px', borderRadius: 20, 
          background: HP_TOKENS.paper, 
          border: `1.5px dashed ${HP_TOKENS.line}`,
          color: HP_TOKENS.inkMute, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: HP_FONT, fontSize: 13, fontWeight: 700 
        }}>
          <HPGlyph name="lock" size={16} color={HP_TOKENS.line} />
          <span>Absen aktif mulai 1 jam sebelum jadwal</span>
        </div>
      );
    }

    return (
      <button 
        id="attendance-clock-in-btn"
        onClick={() => openModal('attendance_scanner')}
        className="hp-tap"
        style={{
          width: '100%', padding: '16px', borderRadius: 20, 
          background: `linear-gradient(135deg, ${HP_TOKENS.coral}, #E03131)`, 
          color: '#F4F7F9', border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: '0 4px 16px rgba(224,49,49,0.3)'
        }}
      >
        ⚠️ Belum Clock-in — Klik untuk absen
      </button>
    );
  }

  // Checked in but not out - show status with clock-out option
  if (status === 'checked_in') {
    return (
      <HPCard padding={0} style={{ overflow: 'hidden', border: `1.5px solid ${HP_TOKENS.sage}40` }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Status */}
          <div style={{ 
            flex: 1, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: 12, background: HP_TOKENS.sageWash,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <HPGlyph name="check" size={18} color={HP_TOKENS.sage} />
            </div>
            <div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>CLOCK IN</div>
              <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: HP_TOKENS.sage }}>
                {checkInTime}
              </div>
            </div>
            {todayData?.type && (
              <div style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue, fontFamily: HP_FONT,
                marginLeft: 'auto',
              }}>
                {todayData.type}
              </div>
            )}
          </div>
          
          {/* Clock-out button */}
          <button 
            onClick={() => !checkOutTime && openModal('reflect')}
            className={checkOutTime ? "" : "hp-tap"}
            disabled={!!checkOutTime}
            style={{
              padding: '14px 20px', border: 'none', cursor: checkOutTime ? 'default' : 'pointer',
              background: checkOutTime ? HP_TOKENS.lineSoft : `linear-gradient(135deg, ${HP_TOKENS.sage}, #2D7A4E)`,
              color: checkOutTime ? HP_TOKENS.inkFade : '#F4F7F9', fontFamily: HP_FONT, fontWeight: 800, fontSize: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              borderLeft: `1px solid ${checkOutTime ? 'transparent' : HP_TOKENS.sage + '40'}`,
            }}
          >
            <HPGlyph name={checkOutTime ? "check" : "moon"} size={16} color={checkOutTime ? HP_TOKENS.inkFade : "#F4F7F9"} />
            {checkOutTime ? "Selesai" : "Clock Out"}
          </button>
        </div>

      </HPCard>
    );
  }

  // Already checked out - show summary
  return (
    <HPCard padding={0} style={{ overflow: 'hidden', border: `1.5px solid ${HP_TOKENS.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
        <div style={{ 
          width: 36, height: 36, borderRadius: 10, background: HP_TOKENS.sageWash,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          ✅
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>KEHADIRAN HARI INI</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
            <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.sage }}>
              {checkInTime}
            </span>
            <span style={{ color: HP_TOKENS.inkFade }}>→</span>
            <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.blue }}>
              {checkOutTime}
            </span>
            {todayData?.duration && (
              <>
                <span style={{ color: HP_TOKENS.inkFade }}>·</span>
                <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: '#8A6814' }}>
                  {Math.floor(todayData.duration / 60)}j{todayData.duration % 60}m
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </HPCard>
  );
}
