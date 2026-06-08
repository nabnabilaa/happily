"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

interface AttendanceHistoryModalProps {
  onClose: () => void;
  targetUserId?: string;
  targetUserName?: string;
}

export default function AttendanceHistoryModal({ onClose, targetUserId, targetUserName }: AttendanceHistoryModalProps) {
  const { user } = useHP();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const viewUserId = targetUserId || user?.id;

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId: user?.id || '',
        month: String(month),
        year: String(year),
      });
      if (targetUserId) params.set('targetUserId', targetUserId);

      const [logsRes, summaryRes] = await Promise.all([
        fetch(`/api/attendance/logs?${params}`),
        fetch(`/api/attendance/summary?${params}`)
      ]);

      const logsData = await logsRes.json();
      const summaryData = await summaryRes.json();

      setLogs(logsData.logs || []);
      setSummary(summaryData.summary || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Build calendar grid
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

  // Map logs by date
  const logsByDate: Record<string, any> = {};
  logs.forEach(l => {
    const checkInStr = typeof l.check_in_at === 'string' && !l.check_in_at.endsWith('Z') ? l.check_in_at.replace(' ', 'T') + 'Z' : l.check_in_at;
    const d = new Date(checkInStr).toLocaleDateString('en-CA'); // 'YYYY-MM-DD' in local time
    logsByDate[d] = {
      ...l,
      check_in_at: checkInStr,
      check_out_at: l.check_out_at ? (typeof l.check_out_at === 'string' && !l.check_out_at.endsWith('Z') ? l.check_out_at.replace(' ', 'T') + 'Z' : l.check_out_at) : null
    };
  });

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const navigateMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
    setSelectedDay(null);
  };

  const selectedLog = selectedDay ? logsByDate[selectedDay] : null;

  return (
    <Modal onClose={onClose} title={targetUserName ? `📅 Attendance — ${targetUserName}` : "📅 Riwayat Kehadiran"}>
      {/* Month Navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => navigateMonth(-1)} className="hp-tap" style={{
          width: 36, height: 36, borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`,
          background: HP_TOKENS.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <HPGlyph name="chevronLeft" size={16} color={HP_TOKENS.ink} />
        </button>
        <div style={{ ...HP_TEXT.h, fontSize: 16 }}>{MONTHS[month - 1]} {year}</div>
        <button onClick={() => navigateMonth(1)} className="hp-tap" style={{
          width: 36, height: 36, borderRadius: 10, border: `1px solid ${HP_TOKENS.line}`,
          background: HP_TOKENS.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.ink} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Memuat...</div>
      ) : (
        <>
          {/* Summary Stats */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{
                padding: '12px 10px', borderRadius: 14, background: HP_TOKENS.sageWash,
                border: `1px solid ${HP_TOKENS.sage}20`, textAlign: 'center'
              }}>
                <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: HP_TOKENS.sage }}>
                  {summary.totalDays}
                </div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>Hadir</div>
              </div>
              <div style={{
                padding: '12px 10px', borderRadius: 14, background: HP_TOKENS.coralSoft,
                border: `1px solid ${HP_TOKENS.coral}20`, textAlign: 'center'
              }}>
                <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: HP_TOKENS.coral }}>
                  {summary.alphaDays}
                </div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>Alpha</div>
              </div>
              <div style={{
                padding: '12px 10px', borderRadius: 14, background: HP_TOKENS.blueSoft,
                border: `1px solid ${HP_TOKENS.blue}20`, textAlign: 'center'
              }}>
                <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: HP_TOKENS.blue }}>
                  {summary.avgHoursFormatted}
                </div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>Rata-rata</div>
              </div>
            </div>
          )}

          {/* Completion Rate Bar */}
          {summary && (
            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 14, background: HP_TOKENS.card, border: `1px solid ${HP_TOKENS.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>KEHADIRAN BULAN INI</div>
                <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 14, color: HP_TOKENS.sage }}>{summary.completionRate}%</div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: HP_TOKENS.lineSoft, overflow: 'hidden' }}>
                <div style={{
                  width: `${summary.completionRate}%`, height: '100%',
                  background: summary.completionRate >= 80 ? HP_TOKENS.sage : summary.completionRate >= 50 ? HP_TOKENS.yellow : HP_TOKENS.coral,
                  borderRadius: 3, transition: '0.5s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>WFO: {summary.wfoDays} · WFA: {summary.wfaDays} · Dinas: {summary.dinasDays}</div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>{summary.totalDays}/{summary.workingDays} hari</div>
              </div>
            </div>
          )}

          {/* Calendar Grid */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {DAYS_SHORT.map(d => (
                <div key={d} style={{ 
                  textAlign: 'center', padding: '6px 0', 
                  ...HP_TEXT.tiny, fontWeight: 800, color: HP_TOKENS.inkMute 
                }}>{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`e${i}`} />;
                
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const log = logsByDate[dateStr];
                const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                const isSelected = selectedDay === dateStr;
                const isWeekend = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6;
                const isFuture = new Date(year, month - 1, day) > now;

                let bgColor = 'transparent';
                let textColor = HP_TOKENS.ink;
                let dotColor = '';

                if (log) {
                  bgColor = log.check_out_at ? `${HP_TOKENS.sage}18` : `${HP_TOKENS.yellow}20`;
                  dotColor = log.check_out_at ? HP_TOKENS.sage : HP_TOKENS.yellow;
                } else if (isWeekend) {
                  textColor = HP_TOKENS.inkFade;
                } else if (!isFuture) {
                  // Past weekday without attendance = alpha
                  bgColor = `${HP_TOKENS.coral}08`;
                }

                if (isSelected) {
                  bgColor = `${HP_TOKENS.blue}20`;
                }

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className="hp-tap"
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 10, border: 'none',
                      background: bgColor, cursor: 'pointer', position: 'relative',
                      fontFamily: HP_FONT, fontWeight: isToday ? 900 : 600, fontSize: 13,
                      color: isFuture ? HP_TOKENS.inkFade : textColor,
                      outline: isToday ? `2px solid ${HP_TOKENS.blue}` : 'none',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {day}
                    {dotColor && (
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%', background: dotColor,
                        marginTop: 2
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { color: HP_TOKENS.sage, label: 'Lengkap' },
              { color: HP_TOKENS.yellow, label: 'Belum Clock-out' },
              { color: HP_TOKENS.coral, label: 'Alpha' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: l.color }} />
                <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Selected Day Detail */}
          {selectedDay && (
            <HPCard padding={16} style={{ border: `1.5px solid ${HP_TOKENS.blue}40`, background: HP_TOKENS.blueWash }}>
              <div style={{ ...HP_TEXT.h, fontSize: 14, marginBottom: 10 }}>
                📋 {new Date(selectedDay + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              {selectedLog ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, padding: '10px', borderRadius: 10, background: HP_TOKENS.card, textAlign: 'center' }}>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>CLOCK IN</div>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: HP_TOKENS.sage }}>
                        {new Date(selectedLog.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: '10px', borderRadius: 10, background: HP_TOKENS.card, textAlign: 'center' }}>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>CLOCK OUT</div>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: selectedLog.check_out_at ? HP_TOKENS.blue : HP_TOKENS.coral }}>
                        {selectedLog.check_out_at 
                          ? new Date(selectedLog.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: '10px', borderRadius: 10, background: HP_TOKENS.card, textAlign: 'center' }}>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>DURASI</div>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: '#8A6814' }}>
                        {selectedLog.duration_minutes 
                          ? `${Math.floor(selectedLog.duration_minutes / 60)}j${selectedLog.duration_minutes % 60}m`
                          : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                      background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue, fontFamily: HP_FONT
                    }}>
                      {selectedLog.check_in_type || 'WFO'}
                    </div>
                    {selectedLog.status && (
                      <div style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                        background: selectedLog.status === 'present' ? HP_TOKENS.sageWash : HP_TOKENS.yellowSoft,
                        color: selectedLog.status === 'present' ? HP_TOKENS.sage : '#8A6814',
                        fontFamily: HP_FONT
                      }}>
                        {selectedLog.status === 'present' ? 'Hadir' : selectedLog.status === 'late' ? 'Terlambat' : 'Pulang Awal'}
                      </div>
                    )}
                    {selectedLog.mood && (
                      <div style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                        background: HP_TOKENS.yellowSoft, color: '#8A6814', fontFamily: HP_FONT
                      }}>
                        Mood: {selectedLog.mood}
                      </div>
                    )}
                  </div>
                  {selectedLog.notes && (
                    <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontStyle: 'italic', marginTop: 4 }}>
                      "{selectedLog.notes}"
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkMute, textAlign: 'center', padding: 10 }}>
                  Tidak ada record kehadiran
                </div>
              )}
            </HPCard>
          )}
        </>
      )}
    </Modal>
  );
}
