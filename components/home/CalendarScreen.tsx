"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";

interface CalEvent {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  notificationOffsetMinutes: number;
  eventType: string;
  attendeeStatus: string;
  recurrence: string | null;
  location: string | null;
  color: string;
}

interface Props { openModal: (name: string, props?: any) => void; }

const DAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const RECURRENCE_OPTIONS = [
  { value: '', label: 'Tidak berulang' },
  { value: 'daily', label: 'Setiap hari' },
  { value: 'weekly', label: 'Setiap minggu' },
  { value: 'biweekly', label: 'Setiap 2 minggu' },
  { value: 'monthly', label: 'Setiap bulan' },
];
const OFFSET_OPTIONS = [
  { value: 5, label: '5 menit sebelum' },
  { value: 15, label: '15 menit sebelum' },
  { value: 30, label: '30 menit sebelum' },
  { value: 60, label: '1 jam sebelum' },
  { value: 120, label: '2 jam sebelum' },
];

function isLastWorkingDayOfMonth(date: Date): boolean {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  let d = lastDay;
  while (d.getDay() === 0 || d.getDay() === 6) {
    d = new Date(d.getTime() - 86400000);
  }
  return date.getDate() === d.getDate() && date.getMonth() === d.getMonth();
}

export default function CalendarScreen({ openModal }: Props) {
  const { user, state, notify } = useHP();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [allDivisions, setAllDivisions] = useState<string[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('10:00');
  const [offset, setOffset] = useState(15);
  const [recurrence, setRecurrence] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evRes, usrRes] = await Promise.all([
        fetch(`/api/calendar?userId=${user?.id}`),
        fetch(`/api/users`)
      ]);
      const evData = await evRes.json();
      const usrData = await usrRes.json();
      if (evData.events) setEvents(evData.events);
      if (usrData.users) {
        const filteredUsers = usrData.users.filter((u: any) => String(u.id) !== String(user?.id));
        setUsers(filteredUsers);
        const depts = Array.from(new Set(filteredUsers.map((u: any) => u.department).filter(Boolean))) as string[];
        setAllDivisions(depts);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Calendar grid
  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [viewMonth, viewYear]);

  // Events on selected date
  const eventsOnDate = useMemo(() => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return events.filter(ev => {
      const evDate = new Date(ev.startTime);
      const evDateStr = `${evDate.getFullYear()}-${String(evDate.getMonth() + 1).padStart(2, '0')}-${String(evDate.getDate()).padStart(2, '0')}`;
      if (evDateStr === dateStr) return true;
      // Check recurring
      if (ev.recurrence && ev.recurrence !== '') {
        const start = new Date(ev.startTime);
        const sel = new Date(dateStr);
        if (sel < start) return false;
        const diffDays = Math.floor((sel.getTime() - start.getTime()) / 86400000);
        if (ev.recurrence === 'daily') return true;
        if (ev.recurrence === 'weekly') return diffDays % 7 === 0;
        if (ev.recurrence === 'biweekly') return diffDays % 14 === 0;
        if (ev.recurrence === 'monthly') return sel.getDate() === start.getDate();
      }
      return false;
    });
  }, [events, selectedDate, viewMonth, viewYear]);

  // Days with events (for dots)
  const eventDays = useMemo(() => {
    const days = new Set<number>();
    events.forEach(ev => {
      const d = new Date(ev.startTime);
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
        days.add(d.getDate());
      }
    });
    return days;
  }, [events, viewMonth, viewYear]);

  // Task deadlines
  const taskDeadlines = useMemo(() => {
    if (!state?.priorities) return new Set<number>();
    const days = new Set<number>();
    state.priorities.forEach((t: any) => {
      if (t.due) {
        const d = new Date(t.due);
        if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
          days.add(d.getDate());
        }
      }
    });
    return days;
  }, [state?.priorities, viewMonth, viewYear]);

  const handleSave = async () => {
    if (!title || !date || !timeStart) return;
    setSaving(true);
    try {
      const startDT = new Date(`${date}T${timeStart}:00`);
      const endDT = new Date(`${date}T${timeEnd || timeStart}:00`);
      if (endDT <= startDT) endDT.setHours(endDT.getHours() + 1);

      let attendeesToSave: string[] = [];
      if (visibility === 'company') {
        attendeesToSave = users.map(u => String(u.id));
      } else if (visibility.startsWith('div_')) {
        attendeesToSave = sharedUsers;
      }

      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          title,
          description: desc,
          startTime: startDT.toISOString().slice(0, 19).replace('T', ' '),
          endTime: endDT.toISOString().slice(0, 19).replace('T', ' '),
          notificationOffsetMinutes: offset,
          attendees: attendeesToSave,
          recurrence: recurrence || null,
          location: location || null,
        })
      });

      // Sync alarm to extension
      if (typeof window !== "undefined") {
        window.postMessage({
          type: "FLOWBEE_SET_ALARM",
          id: "cal_" + Date.now(),
          label: title,
          timestamp: startDT.getTime() - (offset * 60000)
        }, "*");
      }

      notify('Agenda Dibuat', `"${title}" berhasil ditambahkan.`, 'success');
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Hapus agenda ini?')) return;
    try {
      await fetch(`/api/calendar?eventId=${eventId}&userId=${user?.id}`, { method: 'DELETE' });
      notify('Agenda Dihapus', '', 'info');
      fetchData();
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setTitle(''); setDesc(''); setDate(''); setTimeStart('09:00'); setTimeEnd('10:00');
    setOffset(15); setRecurrence(''); setLocation(''); setVisibility('private'); setSharedUsers([]);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isSelected = (day: number) =>
    day === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: 12, borderRadius: 12,
    border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 13,
    outline: 'none', background: '#fff', color: HP_TOKENS.ink, boxSizing: 'border-box',
  };

  const selectedDept = visibility.startsWith('div_') ? visibility.replace('div_', '') : null;
  const deptUsers = selectedDept ? users.filter(u => u.department === selectedDept) : [];
  const isAllDeptSelected = deptUsers.length > 0 && sharedUsers.length === deptUsers.length;

  const toggleUser = (uid: string) => {
    setSharedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const toggleDeptAll = () => {
    if (isAllDeptSelected) setSharedUsers([]);
    else setSharedUsers(deptUsers.map(u => String(u.id)));
  };

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="📅 Kalender Kerja" subtitle="Jadwal, rapat, deadline — semua di satu tempat" />

      {/* Calendar Navigation */}
      <HPCard padding={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: `linear-gradient(135deg, ${HP_TOKENS.blue}, #2B5A8C)`,
        }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
            <HPGlyph name="arrow" size={18} color="#fff" />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontFamily: HP_FONT }}>
              {MONTHS[viewMonth]} {viewYear}
            </div>
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, transform: 'rotate(180deg)' }}>
            <HPGlyph name="arrow" size={18} color="#fff" />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 10px 0' }}>
          {DAYS.map(d => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 10, fontWeight: 800,
              color: HP_TOKENS.inkMute, padding: '4px 0', letterSpacing: 0.5,
            }}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 10px 12px', gap: 2 }}>
          {calendarDays.map((day, i) => (
            <button
              key={i}
              onClick={() => day && setSelectedDate(new Date(viewYear, viewMonth, day))}
              disabled={!day}
              style={{
                background: day && isSelected(day) ? HP_TOKENS.blue
                  : day && isToday(day) ? HP_TOKENS.blueSoft
                  : 'transparent',
                color: day && isSelected(day) ? '#fff'
                  : day && isToday(day) ? HP_TOKENS.blue
                  : day ? HP_TOKENS.ink : 'transparent',
                border: 'none', borderRadius: 10, padding: '10px 0',
                fontSize: 13, fontWeight: isToday(day!) ? 900 : 600,
                fontFamily: HP_FONT, cursor: day ? 'pointer' : 'default',
                position: 'relative', transition: 'all 0.15s',
              }}
            >
              {day || ''}
              {/* Event dot */}
              {day && eventDays.has(day) && (
                <div style={{
                  position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: 2, background: isSelected(day) ? '#fff' : HP_TOKENS.blue,
                }} />
              )}
              {/* Task deadline dot */}
              {day && taskDeadlines.has(day) && !eventDays.has(day) && (
                <div style={{
                  position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: 2, background: HP_TOKENS.coral,
                }} />
              )}
            </button>
          ))}
        </div>
      </HPCard>

      {/* Selected Date Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ ...HP_TEXT.h, fontSize: 16 }}>
            {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>
            {eventsOnDate.length} agenda
            {isLastWorkingDayOfMonth(selectedDate) && (
              <span style={{ color: HP_TOKENS.coral, fontWeight: 900 }}> • 📊 HARI KERJA AKHIR BULAN</span>
            )}
          </div>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setDate(`${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`); }}
          className="hp-tap"
          style={{
            padding: '10px 16px', borderRadius: 12, border: 'none',
            background: HP_TOKENS.blue, color: '#fff',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <HPGlyph name="plus" size={14} color="#fff" />
          Buat Agenda
        </button>
      </div>

      {/* Create Event Form */}
      {showForm && (
        <HPCard padding={16} style={{ marginBottom: 16, background: HP_TOKENS.blueWash, border: `1.5px solid ${HP_TOKENS.blue}30` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="text" placeholder="Judul agenda (mis: Rapat Sprint Review)" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="Lokasi / Link meeting (opsional)" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
            <textarea placeholder="Catatan tambahan (opsional)" value={desc} onChange={e => setDesc(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'none' }} />

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 4 }}>TANGGAL</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 4 }}>MULAI</div>
                <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 4 }}>SELESAI</div>
                <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 4 }}>ULANGI</div>
                <select value={recurrence} onChange={e => setRecurrence(e.target.value)} style={inputStyle}>
                  {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 4 }}>ALARM</div>
                <select value={offset} onChange={e => setOffset(Number(e.target.value))} style={inputStyle}>
                  {OFFSET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Invite attendees - Notes Style */}
            <div style={{ marginTop: 6 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 6 }}>UNDANG ANGGOTA / BAGIKAN</div>
              <select
                value={visibility}
                onChange={(e) => {
                  setVisibility(e.target.value);
                  setSharedUsers([]);
                }}
                style={inputStyle}
              >
                <option value="private">🔒 Tidak Ada (Agenda Pribadi)</option>
                <option value="company">🏢 Seluruh Perusahaan</option>
                <optgroup label="Pilih Divisi Spesifik...">
                  {allDivisions.map(d => (
                    <option key={d} value={`div_${d}`}>👥 Divisi {d}</option>
                  ))}
                </optgroup>
              </select>

              {visibility.startsWith('div_') && (
                <div style={{ 
                  marginTop: 12, padding: 16, background: '#fff', 
                  border: `1px solid ${HP_TOKENS.line}`, borderRadius: 12 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, fontWeight: 800 }}>PILIH ANGGOTA DIVISI {selectedDept}</div>
                    {deptUsers.length > 0 && (
                      <button 
                        onClick={toggleDeptAll}
                        style={{
                          background: 'none', border: 'none', color: HP_TOKENS.blue, 
                          fontFamily: HP_FONT, fontSize: 11, fontWeight: 800, cursor: 'pointer'
                        }}
                      >
                        {isAllDeptSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {deptUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => toggleUser(String(u.id))}
                        style={{
                          padding: '4px 10px', borderRadius: 12, 
                          border: `1.5px solid ${sharedUsers.includes(String(u.id)) ? HP_TOKENS.blue : HP_TOKENS.line}`,
                          background: sharedUsers.includes(String(u.id)) ? HP_TOKENS.blue : '#fff',
                          color: sharedUsers.includes(String(u.id)) ? '#fff' : HP_TOKENS.inkSoft,
                          fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: '0.2s'
                        }}
                      >
                        {u.name}
                      </button>
                    ))}
                    {deptUsers.length === 0 && <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>Tidak ada anggota lain di divisi ini.</span>}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#fff', border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleSave} disabled={!title || !date || saving} style={{
                flex: 2, padding: 12, borderRadius: 12, background: HP_TOKENS.blue, color: '#fff',
                border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                opacity: (!title || !date || saving) ? 0.5 : 1,
              }}>
                {saving ? 'Menyimpan...' : '✓ Buat Agenda'}
              </button>
            </div>
          </div>
        </HPCard>
      )}

      {/* Events List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Memuat kalender...</div>
      ) : eventsOnDate.length === 0 ? (
        <HPCard padding={30} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.inkMute }}>Tidak ada agenda hari ini</div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkFade, marginTop: 4 }}>Klik "Buat Agenda" untuk menambahkan</div>
        </HPCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {eventsOnDate.map(ev => {
            const start = new Date(ev.startTime);
            const end = new Date(ev.endTime);
            const isOwner = String(ev.creatorId) === String(user?.id);
            return (
              <HPCard key={ev.id} padding={0} style={{ overflow: 'hidden', border: `1.5px solid ${ev.color || HP_TOKENS.blue}20` }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 4, background: ev.color || HP_TOKENS.blue, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{ev.title}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontWeight: 800 }}>
                            {start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                            🔔 {ev.notificationOffsetMinutes}m sebelum
                          </div>
                          {ev.recurrence && (
                            <div style={{
                              ...HP_TEXT.tiny, padding: '1px 6px', borderRadius: 4,
                              background: HP_TOKENS.sageSoft, color: HP_TOKENS.sage, fontWeight: 800,
                            }}>🔁 {ev.recurrence}</div>
                          )}
                          {!isOwner && (
                            <div style={{
                              ...HP_TEXT.tiny, padding: '1px 6px', borderRadius: 4,
                              background: HP_TOKENS.lavenderSoft, color: '#6B5F8E', fontWeight: 800,
                            }}>UNDANGAN</div>
                          )}
                        </div>
                        {ev.location && (
                          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, marginTop: 6 }}>📍 {ev.location}</div>
                        )}
                        {ev.description && (
                          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4, fontStyle: 'italic' }}>"{ev.description}"</div>
                        )}
                      </div>
                      {isOwner && (
                        <button onClick={() => handleDelete(ev.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                        }}>
                          <HPGlyph name="close" size={14} color={HP_TOKENS.inkMute} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </HPCard>
            );
          })}
        </div>
      )}

      {/* Last Working Day Alert */}
      {isLastWorkingDayOfMonth(new Date()) && (
        <div style={{ marginTop: 20 }}>
          <HPCard padding={16} style={{ background: HP_TOKENS.coralSoft, border: `1.5px solid ${HP_TOKENS.coral}40` }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ fontSize: 28 }}>📊</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.coral }}>Hari Kerja Akhir Bulan</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, marginTop: 2 }}>
                  Waktunya review laporan bulanan dan analisa KPI bulan ini!
                </div>
              </div>
              <button
                onClick={() => openModal('monthly_report')}
                className="hp-tap"
                style={{
                  padding: '10px 16px', borderRadius: 10, border: 'none',
                  background: HP_TOKENS.coral, color: '#fff',
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                }}
              >
                Lihat Laporan
              </button>
            </div>
          </HPCard>
        </div>
      )}
    </div>
  );
}
