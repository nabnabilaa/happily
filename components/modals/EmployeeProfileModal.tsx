"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import HPBar from "@/components/ui/HPBar";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";

interface Props {
  onClose: () => void;
  employeeId: string;
  employeeName?: string;
  openModal?: (name: string, props?: any) => void;
}

const MOOD_EMOJI: Record<string, string> = { joy: '😊', calm: '😌', neutral: '😐', tired: '😴', stress: '😫' };
const MOOD_COLOR: Record<string, string> = { joy: '#4CAF50', calm: '#2196F3', neutral: '#9E9E9E', tired: '#FF9800', stress: '#F44336' };

export default function EmployeeProfileModal({ onClose, employeeId, employeeName, openModal }: Props) {
  const { user } = useHP();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'kpi' | 'attendance' | 'mood' | 'logbook'>('overview');
  
  // Extra data
  const [kpis, setKpis] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [moods, setMoods] = useState<any[]>([]);
  const [logbook, setLogbook] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();
  }, [employeeId]);

  useEffect(() => {
    if (activeTab === 'kpi') fetchKPIs();
    if (activeTab === 'attendance') fetchAttendance();
    if (activeTab === 'mood') fetchMoods();
    if (activeTab === 'logbook') fetchLogbook();
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/profile?userId=${employeeId}&requesterId=${user?.id}`);
      const data = await res.json();
      setProfile(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchKPIs = async () => {
    try {
      const m = new Date().getMonth() + 1, y = new Date().getFullYear();
      
      // 1. Fetch manager-assigned monthly_kpis (from monthly_kpis table)
      const res = await fetch(`/api/kpi?userId=${employeeId}&role=employee&month=${m}&year=${y}`);
      const data = await res.json();
      
      // 2. Fetch employee's goals from storage API (which contains manager-assigned goals/KPIs in 'goals' table)
      const storageRes = await fetch(`/api/storage?userId=${employeeId}`);
      const storageData = await storageRes.json();
      const storageKpis = (storageData.state?.goals || [])
        .filter((g: any) => g.is_kpi || g.scope === 'assigned')
        .map((g: any) => ({
          id: String(g.id),
          title: g.title,
          progress: g.progress || 0,
          targetValue: 100,
          metricUnit: '%',
          status: g.status === 'active' ? 'approved' : (g.status || 'pending'),
          weight: g.alignment || 0,
        }));

      // 3. Fetch personal KPIs (from personal_kpis table)
      const personalRes = await fetch(`/api/kpi/personal?userId=${employeeId}&month=${m}&year=${y}`);
      const personalData = await personalRes.json();
      const personalKpis = (personalData.kpis || []).map((k: any) => ({
        id: String(k.id),
        title: k.title,
        progress: k.progress || 0,
        targetValue: k.targetValue || 100,
        metricUnit: k.metricUnit || '%',
        status: k.status || 'active',
        weight: 0
      }));

      // Combine all KPIs without duplication
      const combined = [...storageKpis];
      
      (data.kpis || []).forEach((k: any) => {
        if (!combined.some(c => c.title.toLowerCase() === k.title.toLowerCase())) {
          combined.push({
            id: String(k.id),
            title: k.title,
            progress: k.finalScore !== null && k.finalScore !== undefined ? Number(k.finalScore) : 0,
            targetValue: 100,
            metricUnit: '%',
            status: k.status === 'active' ? 'approved' : k.status,
            weight: k.weight || 0
          });
        }
      });

      personalKpis.forEach((k: any) => {
        if (!combined.some(c => c.title.toLowerCase() === k.title.toLowerCase())) {
          combined.push(k);
        }
      });

      setKpis(combined);
    } catch (e) { 
      console.error("Failed to fetch KPIs for employee:", e); 
    }
  };

  const fetchAttendance = async () => {
    try {
      const m = new Date().getMonth() + 1, y = new Date().getFullYear();
      const res = await fetch(`/api/attendance/logs?userId=${user?.id}&targetUserId=${employeeId}&month=${m}&year=${y}`);
      const data = await res.json();
      setAttendance(data.logs || []);
    } catch (e) { console.error(e); }
  };

  const fetchMoods = async () => {
    try {
      const res = await fetch(`/api/mood?userId=${employeeId}`);
      const data = await res.json();
      setMoods(data.moods || []);
    } catch (e) { console.error(e); }
  };

  const fetchLogbook = async () => {
    try {
      const res = await fetch(`/api/logbook?userId=${employeeId}&limit=30`);
      const data = await res.json();
      setLogbook(data.entries || data.logbook || []);
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <Modal onClose={onClose} title="Profil Karyawan">
        <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Memuat profil...</div>
      </Modal>
    );
  }

  const p = profile || {};
  const u = p.user || {};

  return (
    <Modal onClose={onClose} title="">
      <div style={{ marginTop: 24 }}>
        {/* Header Card */}
        <div style={{
          padding: '20px', borderRadius: 20, marginBottom: 16,
          background: `linear-gradient(135deg, ${HP_TOKENS.lavenderSoft}, ${HP_TOKENS.blueSoft})`,
          border: `1.5px solid ${HP_TOKENS.lavender}20`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <HPAvatar name={u.name || employeeName || '?'} size={56} image={u.avatar_image} />
            <div style={{ flex: 1 }}>
              <div style={{ ...HP_TEXT.h, fontSize: 18 }}>{u.name || employeeName}</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 2 }}>
                {u.job_title || 'Team Member'} · {u.department || 'No Dept'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <div style={{
                  padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                  background: u.role === 'hr' ? '#EDE8F5' : u.role === 'manager' ? HP_TOKENS.blueSoft : HP_TOKENS.yellowSoft,
                  color: u.role === 'hr' ? '#7B6BB5' : u.role === 'manager' ? HP_TOKENS.blue : HP_TOKENS.yellow,
                  fontFamily: HP_FONT,
                }}>
                  {(u.role || 'employee').toUpperCase()}
                </div>
                <div style={{
                  padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                  background: HP_TOKENS.sageWash, color: HP_TOKENS.sage, fontFamily: HP_FONT,
                }}>
                  Lvl {u.level || 1} · {u.points || 0} Point
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
            {[
              { label: 'Hadir', value: p.attendanceSummary?.totalDays || 0, color: HP_TOKENS.sage },
              { label: 'Avg Jam', value: p.attendanceSummary?.avgHours ? `${Math.floor(p.attendanceSummary.avgHours)}j` : '-', color: HP_TOKENS.blue },
              { label: 'Task', value: p.taskSummary?.completed || 0, color: '#8A6814' },
              { label: 'Mood', value: MOOD_EMOJI[p.latestMood] || '😐', color: HP_TOKENS.ink },
            ].map(s => (
              <div key={s.label} style={{
                padding: '8px', borderRadius: 10, background: 'rgba(255,255,255,0.7)',
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: HP_TOKENS.inkMute }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { key: 'overview', label: '📊 Ringkasan' },
            { key: 'kpi', label: '🎯 KPI' },
            { key: 'attendance', label: '📅 Kehadiran' },
            { key: 'mood', label: '💭 Mood' },
            { key: 'logbook', label: '📖 Logbook' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)} className="hp-tap" style={{
              flex: '0 0 auto', padding: '8px 14px', borderRadius: 12,
              background: activeTab === t.key ? HP_TOKENS.ink : HP_TOKENS.lineSoft,
              color: activeTab === t.key ? '#fff' : HP_TOKENS.inkSoft,
              border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Attendance Summary */}
            <HPCard padding={14}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 10 }}>📅 KEHADIRAN BULAN INI</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: HP_TOKENS.sage }}>
                    {p.attendanceSummary?.totalDays || 0}
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>hari hadir</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: HP_TOKENS.blue }}>
                    {p.attendanceSummary?.avgHours ? `${p.attendanceSummary.avgHours.toFixed(1)}` : '-'}
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>jam rata-rata</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: p.attendanceSummary?.onTimeRate >= 80 ? HP_TOKENS.sage : HP_TOKENS.coral }}>
                    {p.attendanceSummary?.onTimeRate || 0}%
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>tepat waktu</div>
                </div>
              </div>
              <button onClick={() => openModal?.('logbook', { targetUserId: employeeId, targetUserName: u.name })} className="hp-tap" style={{
                width: '100%', marginTop: 10, padding: '8px', borderRadius: 10,
                background: HP_TOKENS.paper, border: `1px solid ${HP_TOKENS.lineSoft}`,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, color: HP_TOKENS.blue, cursor: 'pointer',
              }}>
                Lihat Detail Kalender & Logbook →
              </button>
            </HPCard>

            {/* Task Summary */}
            <HPCard padding={14}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 10 }}>✅ TASK PERFORMANCE</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 28, color: HP_TOKENS.ink }}>
                    {p.taskSummary?.completionRate || 0}%
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>completion rate</div>
                </div>
                <div style={{ flex: 1 }}>
                  <HPBar value={p.taskSummary?.completionRate || 0} tone="sage" height={8} />
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 6 }}>
                    {p.taskSummary?.completed || 0} selesai / {p.taskSummary?.total || 0} total bulan ini
                  </div>
                </div>
              </div>
            </HPCard>

            {/* Mood Summary */}
            {p.latestMood && (
              <HPCard padding={14}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 10 }}>💭 MOOD TERAKHIR</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 32 }}>{MOOD_EMOJI[p.latestMood] || '😐'}</div>
                  <div>
                    <div style={{ ...HP_TEXT.h, fontSize: 16, textTransform: 'capitalize' }}>{p.latestMood}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>Check-in terakhir</div>
                  </div>
                </div>
              </HPCard>
            )}

            {/* Manager info */}
            {p.manager && (
              <HPCard padding={14}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 10 }}>👤 MANAGER</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <HPAvatar name={p.manager.name} size={36} />
                  <div>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{p.manager.name}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{p.manager.job_title || 'Manager'}</div>
                  </div>
                </div>
              </HPCard>
            )}
          </div>
        )}

        {/* ── KPI TAB ── */}
        {activeTab === 'kpi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kpis.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute, border: `1.5px dashed ${HP_TOKENS.line}`, borderRadius: 16 }}>
                Belum ada KPI bulan ini
              </div>
            ) : (
              kpis.map((k: any) => (
                <HPCard key={k.id} padding={14}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{k.title}</div>
                    <div style={{
                      padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                      background: k.status === 'completed' ? HP_TOKENS.sageWash : HP_TOKENS.yellowSoft,
                      color: k.status === 'completed' ? HP_TOKENS.sage : '#8A6814', fontFamily: HP_FONT,
                    }}>
                      {(k.status || 'active').toUpperCase()}
                    </div>
                  </div>
                  <HPBar value={k.progress || 0} tone={k.progress >= 80 ? 'sage' : k.progress >= 50 ? 'yellow' : 'coral'} height={6} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                    <span>Progress: {k.progress || 0}%</span>
                    <span>Target: {k.targetValue} {k.metricUnit || ''}</span>
                  </div>
                </HPCard>
              ))
            )}
          </div>
        )}

        {/* ── ATTENDANCE TAB ── */}
        {activeTab === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => openModal?.('logbook', { targetUserId: employeeId, targetUserName: u.name })} className="hp-tap" style={{
                width: '100%', padding: '12px', borderRadius: 14, marginBottom: 8,
                background: HP_TOKENS.blueSoft, border: `1.5px solid ${HP_TOKENS.blue}30`,
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.blue, cursor: 'pointer',
              }}>
                📅 Buka Kalender & Logbook Lengkap
              </button>
            {attendance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Belum ada data kehadiran bulan ini</div>
            ) : (
              attendance.slice(0, 15).map((log: any) => (
                <HPCard key={log.id} padding={10}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.ink }}>
                        {new Date(log.check_in_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                        {new Date(log.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        {log.check_out_at && ` → ${new Date(log.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>
                    {log.duration_minutes && (
                      <div style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: HP_TOKENS.yellowSoft, color: '#8A6814', fontFamily: HP_FONT }}>
                        {Math.floor(log.duration_minutes / 60)}j{log.duration_minutes % 60}m
                      </div>
                    )}
                    <div style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, fontFamily: HP_FONT,
                      background: log.check_out_at ? HP_TOKENS.sageWash : HP_TOKENS.coralSoft,
                      color: log.check_out_at ? HP_TOKENS.sage : HP_TOKENS.coral,
                    }}>
                      {log.check_out_at ? '✓' : '⊘'}
                    </div>
                  </div>
                </HPCard>
              ))
            )}
          </div>
        )}

        {/* ── MOOD TAB ── */}
        {activeTab === 'mood' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {moods.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Belum ada data mood</div>
            ) : (
              <>
                {/* Mood distribution */}
                <HPCard padding={14}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 10 }}>DISTRIBUSI MOOD (7 HARI)</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {['joy', 'calm', 'neutral', 'tired', 'stress'].map(m => {
                      const count = moods.filter(md => md.mood_key === m).length;
                      return (
                        <div key={m} style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 24, marginBottom: 4 }}>{MOOD_EMOJI[m]}</div>
                          <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 16, color: MOOD_COLOR[m] }}>{count}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: HP_TOKENS.inkMute, textTransform: 'capitalize' }}>{m}</div>
                        </div>
                      );
                    })}
                  </div>
                </HPCard>

                {/* Recent moods */}
                {moods.slice(0, 14).map((m: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 10, background: HP_TOKENS.paper, border: `1px solid ${HP_TOKENS.lineSoft}`,
                  }}>
                    <div style={{ fontSize: 18 }}>{MOOD_EMOJI[m.mood_key] || '😐'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.ink, textTransform: 'capitalize' }}>{m.mood_key}</div>
                    </div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── LOGBOOK TAB ── */}
        {activeTab === 'logbook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logbook.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Belum ada entri logbook</div>
            ) : (
              logbook.slice(0, 20).map((entry: any, i: number) => (
                <HPCard key={i} padding={12}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0,
                      background: entry.type === 'task_done' ? HP_TOKENS.sage :
                        entry.type === 'checkin' ? HP_TOKENS.blue :
                        entry.type === 'mood' ? HP_TOKENS.yellow : HP_TOKENS.lavender,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ ...HP_TEXT.small, fontWeight: 700, fontSize: 13, color: HP_TOKENS.ink }}>{entry.title || entry.description}</div>
                      {entry.description && entry.title && (
                        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{entry.description}</div>
                      )}
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, marginTop: 4 }}>
                        {entry.created_at ? new Date(entry.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                    {entry.xp_earned && (
                      <div style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800, background: HP_TOKENS.yellowSoft, color: '#8A6814', fontFamily: HP_FONT }}>
                        +{entry.xp_earned} Point
                      </div>
                    )}
                  </div>
                </HPCard>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
