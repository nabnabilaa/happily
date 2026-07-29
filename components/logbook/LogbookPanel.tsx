"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPButton from "@/components/ui/HPButton";
import HPInput, { HPTextarea } from "@/components/ui/HPInput";
import { Row, Stack } from "@/components/ui/Layout";
import AttendanceLocationTag from "@/components/attendance/AttendanceLocationTag";

/**
 * Logbook lengkap: kalender bulanan + detail per hari (kehadiran, mood, EXP,
 * task harian, catatan). Ini komponen bersama — dipakai employee lewat
 * `LogbookModal`, dan HR/manager lewat tab Logbook di `EmployeeProfileModal`.
 * Semua fitur logbook harus ditambahkan di sini supaya ikut muncul di semua role.
 */

interface LogbookPanelProps {
  /** Kalau diisi, panel jadi read-only atas logbook orang lain (HR/manager). */
  targetUserId?: string;
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
  openCheckOut?: boolean;
  attendance: {
    checkIn: string;
    checkOut: string;
    type: string;
    duration: number;
  } | null;
}

interface DaySummaryDerived {
  hasActivity: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
  openCheckOut: boolean;
  workedMinutes: number | null;
  workedIsEstimate: boolean;
  lastActivityAt: string | null;
  totalXP: number;
  tasksDone: number;
  tasksTotal: number;
  noteCount: number;
}

interface DayDetail {
  date: string;
  attendance: any;
  mood: any;
  xpBreakdown: any[];
  totalXP: number;
  logbookEntries: any[];
  tasks: any[];
  daySummary?: DaySummaryDerived;
}

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const STATUS_COLORS: Record<string, { bg: string; dot: string }> = {
  present:  { bg: HP_TOKENS.successWash, dot: HP_TOKENS.success },
  late:     { bg: HP_TOKENS.warningWash, dot: HP_TOKENS.warning },
  absent:   { bg: HP_TOKENS.dangerWash, dot: HP_TOKENS.danger },
  sick:     { bg: HP_TOKENS.warningWash, dot: HP_TOKENS.danger },
  izin:     { bg: HP_TOKENS.primaryWash, dot: HP_TOKENS.primary },
  cuti:     { bg: HP_TOKENS.infoWash, dot: HP_TOKENS.info },
  weekend:  { bg: HP_TOKENS.sunken, dot: HP_TOKENS.inkFade },
  future:   { bg: 'transparent', dot: 'transparent' },
};

const formatMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
};

const MOOD_EMOJI: Record<string, string> = {
  joy: '😊', calm: '😌', focus: '🎯', stress: '😰', sad: '😢', angry: '😤',
};

export default function LogbookPanel({ targetUserId }: LogbookPanelProps) {
  const { user } = useHP();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState<DaySummary[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [attSummary, setAttSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 7);
    return d.toISOString().split('T')[0];
  });
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Note composer. Deliberately independent of attendance: you can write into
  // the logbook before clocking in, after forgetting to clock out, or on a day
  // you never clocked in at all.
  const [composerOpen, setComposerOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Manager/HR looking at someone else's logbook reads it, never writes to it.
  const canWrite = !targetUserId && !!user?.id;

  useEffect(() => {
    fetchMonth();
  }, [month, year, targetUserId]);

  const fetchMonth = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId: user?.id || '',
        month: String(month),
        year: String(year)
      });
      if (targetUserId) params.set('targetUserId', targetUserId);

      const [logbookRes, attRes] = await Promise.all([
        fetch(`/api/logbook/daily-summary?${params}`),
        fetch(`/api/attendance/summary?${params}`)
      ]);
      const data = await logbookRes.json();
      const attData = await attRes.json();

      setDays(data.days || []);
      setSummary(data.summary || null);
      setAttSummary(attData.summary || null);
    } catch (e) {
      console.error("Failed to fetch logbook:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    // If the panel was just mounted (or month loaded) and we have a selectedDay but no dayDetail, fetch it automatically.
    // Also only fetch if the days array actually contains this date (to avoid fetching future/invalid dates)
    if (selectedDay && !dayDetail && days.find(d => d.date === selectedDay)) {
      fetchDayDetail(selectedDay);
    }
  }, [days, selectedDay]);

  const fetchDayDetail = async (date: string) => {
    if (date !== selectedDay) {
      setComposerOpen(false);
      setNoteTitle('');
      setNoteContent('');
    }
    setSaveError(null);
    setSelectedDay(date);
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({
        userId: user?.id || '',
        date
      });
      if (targetUserId) params.set('targetUserId', targetUserId);

      const res = await fetch(`/api/logbook/daily-summary?${params}`);
      const data = await res.json();
      setDayDetail(data);
    } catch (e) {
      console.error("Failed to fetch day detail:", e);
    }
    setDetailLoading(false);
  };

  const saveNote = async () => {
    const content = noteContent.trim();
    const title = noteTitle.trim();
    if (!selectedDay || !user?.id || (!content && !title) || saving) return;

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'note',
          title: title || 'Catatan',
          content,
          date: selectedDay,
          metadata: { source: 'logbook_modal' },
        }),
      });
      if (!res.ok) throw new Error('save failed');

      setNoteTitle('');
      setNoteContent('');
      setComposerOpen(false);
      await fetchDayDetail(selectedDay);
      // The month grid counts entries per day, so it needs the new row too.
      fetchMonth();
    } catch (e) {
      setSaveError('Gagal menyimpan catatan. Coba lagi.');
    }
    setSaving(false);
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
            width: '100%', aspectRatio: '1', borderRadius: HP_TOKENS.radiusSm,
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
            fontFamily: HP_FONT, fontWeight: 700,
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
              fontSize: 7, fontWeight: 700,
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
    <>
      {/* Month navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <button onClick={() => changeMonth(-1)} className="hp-tap" style={{
          background: HP_TOKENS.lineSoft, border: 'none', borderRadius: HP_TOKENS.radiusSm,
          width: 36, height: 36, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <HPGlyph name="chevronLeft" size={16} color={HP_TOKENS.ink} />
        </button>
        <div style={{ ...HP_TEXT.h, fontSize: 16 }}>
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <button onClick={() => changeMonth(1)} className="hp-tap" style={{
          background: HP_TOKENS.lineSoft, border: 'none', borderRadius: HP_TOKENS.radiusSm,
          width: 36, height: 36, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <HPGlyph name="chevronRight" size={16} color={HP_TOKENS.ink} />
        </button>
      </div>

      {attSummary && (
        <div style={{ marginBottom: 16 }}>
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{
              padding: '12px 10px', borderRadius: HP_TOKENS.radiusMd, background: HP_TOKENS.sageWash,
              border: `1px solid ${HP_TOKENS.sage}20`, textAlign: 'center'
            }}>
              <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 22, color: HP_TOKENS.sageInk }}>
                {attSummary.totalDays}
              </div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>Hadir</div>
            </div>
            <div style={{
              padding: '12px 10px', borderRadius: HP_TOKENS.radiusMd, background: HP_TOKENS.coralSoft,
              border: `1px solid ${HP_TOKENS.coral}20`, textAlign: 'center'
            }}>
              <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 22, color: HP_TOKENS.coralInk }}>
                {attSummary.alphaDays}
              </div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>Alpha</div>
            </div>
            <div style={{
              padding: '12px 10px', borderRadius: HP_TOKENS.radiusMd, background: HP_TOKENS.blueSoft,
              border: `1px solid ${HP_TOKENS.blue}20`, textAlign: 'center'
            }}>
              <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 16, color: HP_TOKENS.blue }}>
                {attSummary.avgHoursFormatted}
              </div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>Rata-rata</div>
            </div>
          </div>

          {/* Completion Rate Bar */}
          <div style={{ padding: '12px 16px', borderRadius: HP_TOKENS.radiusMd, background: HP_TOKENS.card, border: `1px solid ${HP_TOKENS.line}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>KEHADIRAN BULAN INI</div>
              <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 14, color: HP_TOKENS.sageInk }}>{attSummary.completionRate}%</div>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: HP_TOKENS.lineSoft, overflow: 'hidden' }}>
              <div style={{
                width: `${attSummary.completionRate}%`, height: '100%',
                background: attSummary.completionRate >= 80 ? HP_TOKENS.sage : attSummary.completionRate >= 50 ? HP_TOKENS.yellow : HP_TOKENS.coral,
                borderRadius: 3, transition: '0.5s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>WFO: {attSummary.wfoDays} · WFA: {attSummary.wfaDays} · Dinas: {attSummary.dinasDays}</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>{attSummary.totalDays}/{attSummary.workingDays} hari</div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly summary chips (Optional logic for logbook specific stats) */}
      {summary && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Sakit', value: summary.sick, color: HP_TOKENS.dangerInk, bg: HP_TOKENS.warningWash },
            { label: 'Izin', value: summary.izin, color: HP_TOKENS.primaryInk, bg: HP_TOKENS.primaryWash },
            { label: 'Cuti', value: summary.cuti, color: HP_TOKENS.infoInk, bg: HP_TOKENS.infoWash },
            { label: 'EXP', value: `+${summary.totalXP}`, color: HP_TOKENS.sageInk, bg: HP_TOKENS.sageWash },
          ].map(s => (
            <div key={s.label} style={{
              padding: '4px 10px', borderRadius: 8, background: s.bg,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, color: s.color }}>
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
                textAlign: 'center', fontFamily: HP_FONT, fontWeight: 700,
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
          padding: 16, borderRadius: HP_TOKENS.radiusMd,
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
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: HP_TOKENS.radiusSm,
                  background: HP_TOKENS.sageWash, border: `1px solid ${HP_TOKENS.sage}20`,
                }}>
                  <div style={{ fontSize: 18 }}><HPGlyph name="clock" size={15} color="currentColor" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>KEHADIRAN</div>
                    <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.sageInk }}>
                      {dayDetail.attendance.check_in_at
                        ? new Date(typeof dayDetail.attendance.check_in_at === 'string' && !dayDetail.attendance.check_in_at.endsWith('Z') ? dayDetail.attendance.check_in_at.replace(' ', 'T') + 'Z' : dayDetail.attendance.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        : '-'
                      }
                      {dayDetail.attendance.check_out_at ? (
                        <span style={{ color: HP_TOKENS.inkMute }}> → {
                          new Date(typeof dayDetail.attendance.check_out_at === 'string' && !dayDetail.attendance.check_out_at.endsWith('Z') ? dayDetail.attendance.check_out_at.replace(' ', 'T') + 'Z' : dayDetail.attendance.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        }</span>
                      ) : (
                        <span style={{ color: HP_TOKENS.inkMute }}> → belum clock-out</span>
                      )}
                    </div>
                    {/* Hours worked, computed whether or not the day was ever
                        closed — a forgotten clock-out costs the exact end time,
                        not the whole record. */}
                    {dayDetail.daySummary?.workedMinutes != null && (
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                        {formatMinutes(dayDetail.daySummary.workedMinutes)}
                        {dayDetail.daySummary.workedIsEstimate ? ' · estimasi dari aktivitas terakhir' : ''}
                      </div>
                    )}
                    {/* Lokasi absen — WFO + nama kantor, atau WFA/Dinas + alasan & koordinat. */}
                    <div style={{ marginTop: 8 }}>
                      <AttendanceLocationTag log={dayDetail.attendance} variant="block" />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: 12, borderRadius: HP_TOKENS.radiusSm, background: HP_TOKENS.coralSoft,
                  border: `1px solid ${HP_TOKENS.coral}20`, textAlign: 'center',
                  ...HP_TEXT.small, color: HP_TOKENS.coralInk, fontWeight: 700,
                }}>
                  Tidak ada data kehadiran
                </div>
              )}

              {/* Mood */}
              {dayDetail.mood && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: HP_TOKENS.radiusSm,
                  background: HP_TOKENS.yellowSoft, border: `1px solid ${HP_TOKENS.yellow}20`,
                }}>
                  <div style={{ fontSize: 18 }}>
                    {MOOD_EMOJI[dayDetail.mood.mood_key] || '🙂'}
                  </div>
                  <div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>MOOD & ENERGY</div>
                    <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.ink }}>
                      {dayDetail.mood.mood_key} · Energi: {dayDetail.mood.energy_key || '-'}
                    </div>
                  </div>
                </div>
              )}

              {/* XP Breakdown */}
              {(dayDetail.xpBreakdown || []).length > 0 && (
                <div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                    EXP HARI INI: <span style={{ color: HP_TOKENS.sageInk, fontWeight: 700 }}>+{dayDetail.totalXP}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(dayDetail.xpBreakdown || []).map((xp: any, i: number) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', borderRadius: 8, background: HP_TOKENS.card,
                        border: `1px solid ${HP_TOKENS.lineSoft}`,
                      }}>
                        <div style={{ ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.inkSoft }}>
                          {xp.description || xp.action_type}
                        </div>
                        <div style={{
                          fontFamily: HP_FONT, fontWeight: 700, fontSize: 11,
                          color: Number(xp.amount) >= 0 ? HP_TOKENS.sage : HP_TOKENS.coral,
                        }}>
                          {Number(xp.amount) >= 0 ? '+' : ''}{xp.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Harian */}
              {(dayDetail.tasks || []).length > 0 && (
                <div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
                    TASK HARIAN ({dayDetail.tasks.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dayDetail.tasks.map((task: any) => {
                      const isDone = task.isDone;
                      const pct = isDone ? 100 : (task.partialProgress || 0);
                      const statusColor = isDone ? HP_TOKENS.sage : pct > 0 ? HP_TOKENS.yellow : HP_TOKENS.coral;
                      return (
                        <div key={task.id} style={{
                          padding: '10px 12px', borderRadius: HP_TOKENS.radiusSm,
                          background: HP_TOKENS.card, border: `1px solid ${statusColor}30`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                              background: isDone ? HP_TOKENS.sage : pct > 0 ? HP_TOKENS.yellow : HP_TOKENS.lineSoft,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isDone && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}><HPGlyph name="check" size={12} color="currentColor" /></span>}
                              {!isDone && pct > 0 && <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>{pct}%</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.ink, textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.7 : 1 }}>
                                {task.title}
                              </div>
                              {/* KPI / Target linkage */}
                              {(task.kpiTitle || task.weeklyTargetTitle) && (
                                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, marginTop: 2, fontWeight: 600 }}>
                                  {task.weeklyTargetTitle ? `${task.kpiTitle} › ${task.weeklyTargetTitle}` : task.kpiTitle}
                                </div>
                              )}
                              {/* Progress bar for partial */}
                              {!isDone && pct > 0 && (
                                <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: HP_TOKENS.lineSoft, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: HP_TOKENS.yellow, borderRadius: 2 }} />
                                </div>
                              )}
                              {/* Description */}
                              {task.description && (
                                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, marginTop: 4 }}>{task.description}</div>
                              )}
                              {/* Notes */}
                              {task.notes && (
                                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, marginTop: 4, fontStyle: 'italic' }}>
                                  "{task.notes}"
                                </div>
                              )}
                              {/* Proof links */}
                              {task.proofLinks?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                  {task.proofLinks.filter(Boolean).map((link: string, i: number) => (
                                    link.startsWith('http') ? (
                                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={{
                                        padding: '2px 8px', borderRadius: 6, background: HP_TOKENS.blueSoft,
                                        color: HP_TOKENS.blue, fontSize: 10, fontFamily: HP_FONT, fontWeight: 700,
                                        textDecoration: 'none',
                                      }}>
                                        Bukti {i + 1}
                                      </a>
                                    ) : (
                                      <span key={i} style={{
                                        padding: '2px 8px', borderRadius: 6, background: HP_TOKENS.lineSoft,
                                        color: HP_TOKENS.inkSoft, fontSize: 10, fontFamily: HP_FONT, fontWeight: 700,
                                      }}>
                                        {link}
                                      </span>
                                    )
                                  ))}
                                </div>
                              )}
                              {/* Footer: metric + time + completed_at */}
                              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                {task.metricValue && (
                                  <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sageInk, fontWeight: 700 }}>Nilai: {task.metricValue}</span>
                                )}
                                {task.timeTrackedSeconds > 0 && (
                                  <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 600 }}>
                                    {Math.floor(task.timeTrackedSeconds / 3600) > 0
                                      ? `${Math.floor(task.timeTrackedSeconds / 3600)}j ${Math.floor((task.timeTrackedSeconds % 3600) / 60)}m`
                                      : `${Math.floor(task.timeTrackedSeconds / 60)}m`}
                                  </span>
                                )}
                                {task.completedAt && (
                                  <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                                    Selesai: {new Date(task.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {task.isProject && (
                                  <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.lavenderInk, fontWeight: 700 }}>Proyek</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Logbook entries */}
              {(dayDetail.logbookEntries || []).length > 0 && (
                <div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                    CATATAN LOGBOOK ({(dayDetail.logbookEntries || []).length})
                  </div>
                  {(dayDetail.logbookEntries || []).map((entry: any, i: number) => (
                    <div key={i} style={{
                      padding: 10, borderRadius: HP_TOKENS.radiusSm, background: HP_TOKENS.blueWash,
                      border: `1px solid ${HP_TOKENS.blue}15`, marginBottom: 6,
                    }}>
                      {entry.title ? (
                        <>
                          <div style={{ ...HP_TEXT.small, fontWeight: 700, fontSize: 12, color: HP_TOKENS.ink }}>
                            {entry.title}
                          </div>
                          {entry.content && (
                            <div style={{ ...HP_TEXT.small, fontSize: 11, color: HP_TOKENS.inkSoft, marginTop: 4 }}>
                              {entry.content}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ ...HP_TEXT.small, fontWeight: 700, fontSize: 12, color: HP_TOKENS.ink }}>
                          {entry.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!dayDetail.attendance && !dayDetail.mood && (dayDetail.xpBreakdown || []).length === 0 && (dayDetail.logbookEntries || []).length === 0 && (dayDetail.tasks || []).length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}><HPGlyph name="moon" size={20} color="currentColor" /></div>
                  <div style={{ ...HP_TEXT.small }}>Tidak ada aktivitas pada hari ini</div>
                </div>
              )}

              {/*
                Note composer. Deliberately outside every attendance check: it
                shows on a day you never clocked in, a day you forgot to clock
                out, and a day with no record at all. Clock state gates nothing
                here — that was the whole bug.
              */}
              {canWrite && (
                <div>
                  {!composerOpen ? (
                    <HPButton
                      variant="secondary"
                      size="sm"
                      icon="plus"
                      fullWidth
                      onClick={() => setComposerOpen(true)}
                    >
                      Tambah catatan
                    </HPButton>
                  ) : (
                    <Stack gap={2}>
                      <HPInput
                        label="Judul"
                        placeholder="Ringkas dalam satu baris"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                      />
                      <HPTextarea
                        label="Catatan"
                        placeholder="Apa yang kamu kerjakan?"
                        rows={4}
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                      />
                      {saveError && (
                        <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.dangerInk }}>{saveError}</span>
                      )}
                      <Row gap={2}>
                        <HPButton
                          variant="primary"
                          size="sm"
                          loading={saving}
                          disabled={!noteTitle.trim() && !noteContent.trim()}
                          onClick={saveNote}
                        >
                          Simpan
                        </HPButton>
                        <HPButton
                          variant="ghost"
                          size="sm"
                          onClick={() => { setComposerOpen(false); setSaveError(null); }}
                        >
                          Batal
                        </HPButton>
                      </Row>
                    </Stack>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {[
          { label: 'Hadir', color: HP_TOKENS.successInk },
          { label: 'Absen', color: HP_TOKENS.dangerInk },
          { label: 'Sakit', color: HP_TOKENS.dangerInk },
          { label: 'Izin', color: HP_TOKENS.primaryInk },
          { label: 'Cuti', color: HP_TOKENS.infoInk },
          { label: 'Weekend', color: HP_TOKENS.inkFade },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
            <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 9 }}>{l.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
