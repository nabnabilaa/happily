"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface Props {
  onClose: () => void;
}

interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  notificationOffsetMinutes: number;
  attendeeStatus: string;
  creatorId: string;
}

export default function CalendarModal({ onClose }: Props) {
  const { user } = useHP();
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [offset, setOffset] = useState("15");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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
      if (usrData.users) setUsers(usrData.users.filter((u: any) => String(u.id) !== String(user?.id)));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleAttendee = (id: string) => {
    if (selectedAttendees.includes(id)) {
      setSelectedAttendees(prev => prev.filter(a => a !== id));
    } else {
      setSelectedAttendees(prev => [...prev, id]);
    }
  };

  const handleSave = async () => {
    if (!title || !date || !time) return;
    setSaving(true);
    
    // Convert to UTC/ISO string for DB
    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration

    // Setup extension alarm sync payload
    const alarmPayload = {
      type: "FLOWBEE_SET_ALARM",
      id: "cal_" + Date.now(),
      label: title,
      timestamp: startDateTime.getTime() - (parseInt(offset) * 60000)
    };

    try {
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          title,
          description: desc,
          startTime: startDateTime.toISOString().slice(0, 19).replace('T', ' '),
          endTime: endDateTime.toISOString().slice(0, 19).replace('T', ' '),
          notificationOffsetMinutes: parseInt(offset),
          attendees: selectedAttendees
        })
      });

      // Sync with extension
      if (typeof window !== "undefined") {
        window.postMessage(alarmPayload, "*");
      }

      setShowForm(false);
      setTitle(""); setDesc(""); setDate(""); setTime(""); setSelectedAttendees([]);
      fetchData();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const selectStyle: React.CSSProperties = {
    padding: 12, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 13, background: '#fff', outline: 'none', width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <Modal onClose={onClose} title="🗓️ Kalender Kerja Serbaguna">
      <div style={{ marginTop: 8 }}>
        <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkMute, marginBottom: 20 }}>
          Atur alarm, jadwal meeting klien, hingga ajak kolaborasi antar divisi. Semua notifikasi akan tersinkronisasi ke Ekstensi Flowbee!
        </div>

        {showForm ? (
          <div style={{ padding: 16, borderRadius: 20, background: HP_TOKENS.blueWash, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input 
              type="text" placeholder="Judul Agenda (mis: Meeting Project Alpha)" 
              value={title} onChange={e => setTitle(e.target.value)} style={selectStyle}
            />
            <input 
              type="text" placeholder="Catatan Tambahan (Opsional)" 
              value={desc} onChange={e => setDesc(e.target.value)} style={selectStyle}
            />
            
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4, fontWeight: 800 }}>TANGGAL</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={selectStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4, fontWeight: 800 }}>WAKTU</div>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={selectStyle} />
              </div>
            </div>

            <div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4, fontWeight: 800 }}>ALARM EKSTENSI (INGATKAN SEBELUM)</div>
              <select value={offset} onChange={e => setOffset(e.target.value)} style={selectStyle}>
                <option value="5">5 Menit Sebelum</option>
                <option value="15">15 Menit Sebelum</option>
                <option value="30">30 Menit Sebelum</option>
                <option value="60">1 Jam Sebelum</option>
              </select>
            </div>

            <div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 8, fontWeight: 800 }}>UNDANG ANGGOTA / DIVISI LAIN (OPSIONAL)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                {users.map(u => (
                  <button 
                    key={u.id} onClick={() => toggleAttendee(u.id)}
                    style={{
                      padding: '8px 12px', borderRadius: 99, cursor: 'pointer', fontFamily: HP_FONT, fontSize: 12, fontWeight: 700,
                      border: `1.5px solid ${selectedAttendees.includes(u.id) ? HP_TOKENS.blue : HP_TOKENS.line}`,
                      background: selectedAttendees.includes(u.id) ? HP_TOKENS.blue : '#fff',
                      color: selectedAttendees.includes(u.id) ? '#fff' : HP_TOKENS.inkSoft
                    }}
                  >
                    {u.name.split(' ')[0]} ({u.role})
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#fff', border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontWeight: 800, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleSave} disabled={!title || !date || !time || saving} style={{ flex: 2, padding: 14, borderRadius: 12, background: HP_TOKENS.blue, color: '#fff', border: 'none', fontFamily: HP_FONT, fontWeight: 800, cursor: 'pointer', opacity: (!title || !date || !time || saving) ? 0.5 : 1 }}>
                {saving ? 'Menyimpan...' : 'Buat Agenda'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button 
              onClick={() => setShowForm(true)} className="hp-tap"
              style={{
                width: '100%', padding: 16, borderRadius: 16, border: `2px dashed ${HP_TOKENS.blue}`,
                background: HP_TOKENS.blueWash, color: HP_TOKENS.blue, cursor: 'pointer',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 20
              }}
            >
              <HPGlyph name="plus" size={16} color={HP_TOKENS.blue} />
              Buat Agenda / Alarm Baru
            </button>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Memuat agenda...</div>
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, border: `1px solid ${HP_TOKENS.lineSoft}`, borderRadius: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⛱️</div>
                <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.inkMute }}>Belum ada agenda terdaftar.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {events.map(ev => {
                  const d = new Date(ev.startTime);
                  const isOwner = String(ev.creatorId) === String(user?.id);
                  return (
                    <div key={ev.id} style={{
                      padding: 16, borderRadius: 16, border: `1px solid ${HP_TOKENS.line}`, background: '#fff',
                      display: 'flex', gap: 16, alignItems: 'flex-start'
                    }}>
                      <div style={{
                        width: 50, height: 50, borderRadius: 12, background: HP_TOKENS.blueWash,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.blue, fontWeight: 800, fontSize: 10 }}>{d.toLocaleString('id-ID', { month: 'short' }).toUpperCase()}</div>
                        <div style={{ ...HP_TEXT.h, color: HP_TOKENS.blue, fontSize: 20 }}>{d.getDate()}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{ev.title}</div>
                        <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                          {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • Alarm {ev.notificationOffsetMinutes} menit sblm
                        </div>
                        {ev.description && <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, marginTop: 6, fontStyle: 'italic' }}>"{ev.description}"</div>}
                        {!isOwner && (
                          <div style={{ display: 'inline-block', marginTop: 8, padding: '2px 8px', borderRadius: 4, background: HP_TOKENS.lavenderSoft, color: '#6B5F8E', fontSize: 10, fontWeight: 800 }}>
                            UNDANGAN
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
