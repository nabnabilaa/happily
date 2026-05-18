"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";

interface LogbookModalProps {
  onClose: () => void;
}

interface DaySummary {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  status: string;
  mood: string | null;
  energy: string | null;
  totalXP: number;
  actionCount: number;
  logbookEntries: number;
  attendance: {
    checkIn: string;
    checkOut: string;
    type: string;
    duration: number;
  } | null;
}

interface DayDetail {
  date: string;
  attendance: any;
  mood: any;
  xpBreakdown: any[];
  totalXP: number;
  logbookEntries: any[];
}

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const STATUS_COLORS: Record<string, { bg: string; dot: string }> = {
  present:  { bg: '#E8F5E9', dot: '#2D8A4E' },
  late:     { bg: '#FFF3E0', dot: '#D4A017' },
  absent:   { bg: '#FFEBEE', dot: '#E03131' },
  sick:     { bg: '#FFF3E0', dot: '#E03131' },
  izin:     { bg: '#EDE7F6', dot: '#7B6BB5' },
  cuti:     { bg: '#E3F2FD', dot: '#2196F3' },
  weekend:  { bg: '#F5F5F5', dot: '#CCCCCC' },
  future:   { bg: 'transparent', dot: 'transparent' },
};

const MOOD_EMOJI: Record<string, string> = {
  joy: '😊', calm: '😌', focus: '🎯', stress: '😰', sad: '😢', angry: '😤',
};

export default function LogbookModal({ onClose }: LogbookModalProps) {
  const { user } = useHP();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState<DaySummary[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchMonth();
  }, [month, year]);

  const fetchMonth = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logbook/daily-summary?userId=${user?.id}&month=${month}&year=${year}`);
      const data = await res.json();
      setDays(data.days || []);
      setSummary(data.summary || null);
    } catch (e) {
      console.error("Failed to fetch logbook:", e);
    }
    setLoading(false);
  };

  const fetchDayDetail = async (date: string) => {
    setSelectedDay(date);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/logbook/daily-summary?userId=${user?.id}&date=${date}`);
      const data = await res.json();
      setDayDetail(data);
    } catch (e) {
      console.error("Failed to fetch day detail:", e);
    }
    setDetailLoading(false);
  };

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
    setSelectedDay(null);
    setDayDetail(null);
  };

  // Calculate calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const renderCalendar = () => {
    const cells: React.ReactNode[] = [];
    
    // Empty cells for days before the first
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} style={{ width: '100%', aspectRatio: '1' }} />);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const daySummary = days.find(ds => ds.date === dateStr);
      const status = daySummary?.status || 'future';
      const colors = STATUS_COLORS[status] || STATUS_COLORS.future;
      const isToday = dateStr === new Date().toISOString().slice(0, 10);
      const isSelected = dateStr === selectedDay;
      const isFuture = status === 'future';
      const moodEmoji = daySummary?.mood ? MOOD_EMOJI[daySummary.mood] || '' : '';

      cells.push(
        <button
          key={d}
          onClick={() => !isFuture && fetchDayDetail(dateStr)}
          disabled={isFuture}
          className="hp-tap"
          style={{
            width: '100%', aspectRatio: '1', borderRadius: 10,
            background: isSelected ? HP_TOKENS.blue : colors.bg,
            border: isToday ? `2px solid ${HP_TOKENS.yellow}` : isSelected ? `2px solid ${HP_TOKENS.blue}` : '1px solid transparent',
            cursor: isFuture ? 'default' : 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 1, padding: 2,
            opacity: isFuture ? 0.3 : 1,
            transition: 'all 0.15s',
          }}
        >
          <div style={{
            fontFamily: HP_FONT, fontWeight: 800,
            fontSize: 12, color: isSelected ? '#fff' : HP_TOKENS.ink,
          }}>
            {d}
          </div>
          {/* Status dot + mood emoji */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {status !== 'future' && status !== 'weekend' && (
              <div style={{
                width: 5, height: 5, borderRadius: 3,
                background: isSelected ? '#fff' : colors.dot,
              }} />
            )}
            {moodEmoji && (
              <span style={{ fontSize: 8, lineHeight: 1 }}>{moodEmoji}</span>
            )}
          </div>
          {/* XP indicator */}
          {(daySummary?.totalXP || 0) > 0 && (
            <div style={{
              fontSize: 7, fontWeight: 800,
              color: isSelected ? 'rgba(255,255,255,0.8)' : HP_TOKENS.sage,
              fontFamily: HP_FONT,
            }}>
              +{daySummary?.totalXP}
            </div>
          )}
        </button>
      );
    }

    return cells;
  };

  return (
    <Modal onClose={onClose} title="📅 Logbook Calendar">
      {/* Month navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <button onClick={() => changeMonth(-1)} className="hp-tap" style={{
          background: HP_TOKENS.lineSoft, border: 'none', borderRadius: 10,
          width: 36, height: 36, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <HPGlyph name="chevronLeft" size={16} color={HP_TOKENS.ink} />
        </button>
        <div style={{ ...HP_TEXT.h, fontSize: 16 }}>
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <button onClick={() => changeMonth(1)} className="hp-tap" style={{
          background: HP_TOKENS.lineSoft, border: 'none', borderRadius: 10,
          width: 36, height: 36, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.ink} />
        </button>
      </div>

      {/* Monthly summary chips */}
      {summary && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Hadir', value: summary.present, color: '#2D8A4E', bg: '#E8F5E9' },
            { label: 'Absen', value: summary.absent, color: '#E03131', bg: '#FFEBEE' },
            { label: 'Sakit', value: summary.sick, color: '#E03131', bg: '#FFF3E0' },
            { label: 'Izin', value: summary.izin, color: '#7B6BB5', bg: '#EDE7F6' },
            { label: 'XP', value: `+${summary.totalXP}`, color: HP_TOKENS.sage, bg: HP_TOKENS.sageWash },
          ].map(s => (
            <div key={s.label} style={{
              padding: '4px 10px', borderRadius: 8, background: s.bg,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 12, color: s.color }}>
                {s.value}
              </span>
              <span style={{ fontFamily: HP_FONT, fontWeight: 600, fontSize: 9, color: s.color, opacity: 0.7 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Memuat...</div>
      ) : (
        <>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontFamily: HP_FONT, fontWeight: 800,
                fontSize: 9, color: HP_TOKENS.inkMute, padding: '4px 0',
                letterSpacing: 0.5,
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 20 }}>
            {renderCalendar()}
          </div>
        </>
      )}

      {/* Day detail panel */}
      {selectedDay && (
        <div style={{
          padding: 16, borderRadius: 16,
          background: HP_TOKENS.paper, border: `1.5px solid ${HP_TOKENS.line}`,
          marginBottom: 8,
        }}>
          <div style={{ ...HP_TEXT.h, fontSize: 14, marginBottom: 12 }}>
            📋 {new Date(selectedDay + 'T00:00:00').toLocaleDateString('id-ID', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </div>

          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Memuat detail...</div>
          ) : dayDetail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Attendance */}
              {dayDetail.attendance ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12,
                  background: HP_TOKENS.sageWash, border: `1px solid ${HP_TOKENS.sage}20`,
                }}>
                  <div style={{ fontSize: 18 }}>🕐</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>KEHADIRAN</div>
                    <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.sage }}>
                      {dayDetail.attendance.check_in_at
                        ? new Date(dayDetail.attendance.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        : '-'
                      }
                      {dayDetail.attendance.check_out_at && (
                        <span style={{ color: HP_TOKENS.inkMute }}> → {
                          new Date(dayDetail.attendance.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        }</span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    padding: '3px 8px', borderRadius: 6, background: HP_TOKENS.blueSoft,
                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 10, color: HP_TOKENS.blue,
                  }}>
                    {dayDetail.attendance.check_in_type || 'WFO'}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: 12, borderRadius: 12, background: HP_TOKENS.coralSoft,
                  border: `1px solid ${HP_TOKENS.coral}20`, textAlign: 'center',
                  ...HP_TEXT.small, color: HP_TOKENS.coral, fontWeight: 700,
                }}>
                  Tidak ada data kehadiran
                </div>
              )}

              {/* Mood */}
              {dayDetail.mood && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12,
                  background: HP_TOKENS.yellowSoft, border: `1px solid ${HP_TOKENS.yellow}20`,
                }}>
                  <div style={{ fontSize: 18 }}>
                    {MOOD_EMOJI[dayDetail.mood.mood] || '🙂'}
                  </div>
                  <div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>MOOD & ENERGY</div>
                    <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.ink }}>
                      {dayDetail.mood.mood} · Energi: {dayDetail.mood.energy || '-'}
                    </div>
                  </div>
                </div>
              )}

              {/* XP Breakdown */}
              {dayDetail.xpBreakdown.length > 0 && (
                <div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                    XP HARI INI: <span style={{ color: HP_TOKENS.sage, fontWeight: 900 }}>+{dayDetail.totalXP}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {dayDetail.xpBreakdown.map((xp: any, i: number) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', borderRadius: 8, background: '#fff',
                        border: `1px solid ${HP_TOKENS.lineSoft}`,
                      }}>
                        <div style={{ ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.inkSoft }}>
                          {xp.description || xp.action_type}
                        </div>
                        <div style={{
                          fontFamily: HP_FONT, fontWeight: 800, fontSize: 11,
                          color: Number(xp.amount) >= 0 ? HP_TOKENS.sage : HP_TOKENS.coral,
                        }}>
                          {Number(xp.amount) >= 0 ? '+' : ''}{xp.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Logbook entries */}
              {dayDetail.logbookEntries.length > 0 && (
                <div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                    CATATAN LOGBOOK ({dayDetail.logbookEntries.length})
                  </div>
                  {dayDetail.logbookEntries.map((entry: any, i: number) => (
                    <div key={i} style={{
                      padding: 10, borderRadius: 10, background: HP_TOKENS.blueWash,
                      border: `1px solid ${HP_TOKENS.blue}15`, marginBottom: 6,
                    }}>
                      <div style={{ ...HP_TEXT.small, fontWeight: 700, fontSize: 12, color: HP_TOKENS.ink }}>
                        {entry.title}
                      </div>
                      {entry.content && (
                        <div style={{ ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.inkSoft, marginTop: 4 }}>
                          {entry.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!dayDetail.attendance && !dayDetail.mood && dayDetail.xpBreakdown.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🌙</div>
                  <div style={{ ...HP_TEXT.small }}>Tidak ada aktivitas pada hari ini</div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {[
          { label: 'Hadir', color: '#2D8A4E' },
          { label: 'Absen', color: '#E03131' },
          { label: 'Sakit', color: '#E03131' },
          { label: 'Izin', color: '#7B6BB5' },
          { label: 'Cuti', color: '#2196F3' },
          { label: 'Weekend', color: '#CCCCCC' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: l.color }} />
            <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 9 }}>{l.label}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
