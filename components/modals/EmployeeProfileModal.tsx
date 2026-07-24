"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import HPBar from "@/components/ui/HPBar";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";
import { Donut, TargetBars, toneFor } from "@/components/reports/charts";

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
  const [activeTab, setActiveTab] = useState<'overview' | 'kpi' | 'logbook' | 'onboarding'>('overview');

  // Extra data
  const [kpis, setKpis] = useState<any[]>([]);
  const [logbook, setLogbook] = useState<any[]>([]);
  const [agg, setAgg] = useState<any>(null); // per-person aggregate (kpiScore, completionRate, weekly, kpis[].weekly)

  // Filter periode di dalam profil (default bulan berjalan; 0 = semua minggu).
  const [pMonth, setPMonth] = useState(new Date().getMonth() + 1);
  const [pYear, setPYear] = useState(new Date().getFullYear());
  const [pWeek, setPWeek] = useState(0);

  // Detail target saat chart diklik: rincian + task terkait.
  const [detail, setDetail] = useState<any>(null); // { kpiTitle, title, timeframe, achievement, target, current, unit }
  const [detailTasks, setDetailTasks] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const openTargetDetail = async (t: any) => {
    setDetail(t); setDetailTasks([]); setDetailLoading(true);
    try {
      const res = await fetch(`/api/hr/reports/export?requesterId=${user?.id}&type=logbook&userIds=${employeeId}&month=${pMonth}&year=${pYear}`);
      const rows = (await res.json()).data || [];
      const tt = (t.title || '').toLowerCase(), kt = (t.kpiTitle || '').toLowerCase();
      const related = rows.filter((r: any) => {
        const wt = (r.weekly_target_title || '').toLowerCase(), gt = (r.goal_title || '').toLowerCase();
        return (tt && wt === tt) || (kt && gt === kt);
      });
      setDetailTasks(related);
    } catch (e) { console.error('detail', e); }
    setDetailLoading(false);
  };

  useEffect(() => { fetchProfile(); }, [employeeId]);
  useEffect(() => { fetchAggregate(); }, [employeeId, pMonth, pYear, pWeek]);

  const fetchAggregate = async () => {
    try {
      const res = await fetch(`/api/hr/reports/dashboard?requesterId=${user?.id}&userIds=${employeeId}&month=${pMonth}&year=${pYear}&week=${pWeek}`);
      const data = await res.json();
      setAgg(data?.people?.[0] || null);
    } catch (e) { console.error('aggregate', e); }
  };

  useEffect(() => {
    if (activeTab === 'kpi') fetchKPIs();
    if (activeTab === 'logbook') fetchLogbook();
  }, [activeTab, pMonth, pYear, pWeek]);

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
      const m = pMonth, y = pYear;

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

  // Satu timeline kronologis: gabungan absensi + mood + task harian + logbook_entries.
  const fetchLogbook = async () => {
    try {
      const m = pMonth, y = pYear;
      const [lbRes, taskRes, attRes, moodRes] = await Promise.all([
        fetch(`/api/logbook?userId=${employeeId}&limit=50`),
        fetch(`/api/hr/reports/export?requesterId=${user?.id}&type=logbook&userIds=${employeeId}&month=${m}&year=${y}`),
        fetch(`/api/attendance/logs?userId=${user?.id}&targetUserId=${employeeId}&month=${m}&year=${y}`),
        fetch(`/api/mood?userId=${employeeId}`),
      ]);
      const lb = ((await lbRes.json()).entries || []).map((e: any) => ({
        kind: 'logbook', icon: '📖', title: e.title || e.description || 'Catatan',
        description: e.title ? (e.description || '') : '', created_at: e.created_at, xp: e.xp_earned || 0,
      }));
      const tasks = ((await taskRes.json()).data || []).map((r: any) => ({
        kind: 'task', done: !!r.is_done, icon: r.is_done ? '✅' : '⏳', title: r.title || 'Task',
        description: r.goal_title ? `KPI: ${r.goal_title}` : (r.weekly_target_title || r.description || ''),
        created_at: r.target_date || r.created_at, xp: r.is_done ? 50 : 0,
      }));
      const fmtTime = (v: any) => v ? new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      const att = ((await attRes.json()).logs || []).map((l: any) => {
        const dur = l.duration_minutes ? ` · ${Math.floor(l.duration_minutes / 60)}j${l.duration_minutes % 60}m` : '';
        const out = l.check_out_at ? ` → ${fmtTime(l.check_out_at)}` : ' (belum check-out)';
        return {
          kind: 'checkin', icon: l.check_in_type === 'WFH' ? '🏠' : '🏢',
          title: `Check-in${l.check_in_type ? ` ${l.check_in_type}` : ''}`,
          description: `${fmtTime(l.check_in_at)}${out}${dur}${l.notes ? ` · ${l.notes}` : ''}`,
          created_at: l.check_in_at, mood: l.mood || null, xp: 0,
        };
      });
      const moodApi = ((await moodRes.json()).moods || []).map((md: any) => {
        const key = md.mood_key || md.mood || 'neutral';
        return { kind: 'mood', moodKey: key, icon: MOOD_EMOJI[key] || '😐', title: `Mood: ${key}`, description: '', created_at: md.created_at, xp: 0 };
      });
      const merged = [...lb, ...tasks, ...att, ...moodApi]
        .filter(e => e.created_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogbook(merged);
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
        {/* Detail target (muncul saat chart diklik) */}
        {detail && (
          <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: HP_TOKENS.card, borderRadius: 18, padding: 18, maxWidth: 420, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {detail.kpiTitle && <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>{detail.kpiTitle}</div>}
                  <div style={{ ...HP_TEXT.h, fontSize: 16 }}>{detail.title || 'Target'}</div>
                  {detail.timeframe && <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{detail.timeframe}</div>}
                </div>
                <button onClick={() => setDetail(null)} className="hp-tap" style={{ border: 'none', background: HP_TOKENS.lineSoft, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontFamily: HP_FONT, fontWeight: 800, color: HP_TOKENS.inkMute }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <div style={{ flex: 1, background: HP_TOKENS.lineSoft, borderRadius: 10, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 20, color: toneFor(detail.achievement || 0) }}>{detail.achievement || 0}%</div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>pencapaian</div>
                </div>
                {(detail.target != null) && (
                  <div style={{ flex: 1, background: HP_TOKENS.lineSoft, borderRadius: 10, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 20, color: HP_TOKENS.ink }}>{detail.current ?? 0}/{detail.target ?? 0}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{detail.unit || 'progres'}</div>
                  </div>
                )}
              </div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, margin: '14px 0 8px' }}>TASK TERKAIT ({detailTasks.length})</div>
              {detailLoading ? (
                <div style={{ ...HP_TEXT.small, textAlign: 'center', padding: 16, color: HP_TOKENS.inkMute }}>Memuat...</div>
              ) : detailTasks.length === 0 ? (
                <div style={{ ...HP_TEXT.small, textAlign: 'center', padding: 16, color: HP_TOKENS.inkMute }}>Tidak ada task terkait pada periode ini.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detailTasks.map((r: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 10, background: HP_TOKENS.paper, border: `1px solid ${HP_TOKENS.lineSoft}` }}>
                      <div style={{ fontSize: 14 }}>{r.is_done ? '✅' : '⏳'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...HP_TEXT.small, fontWeight: 700, fontSize: 12.5, color: HP_TOKENS.ink }}>{r.title}</div>
                        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, marginTop: 2 }}>
                          {r.target_date || r.created_at ? new Date(r.target_date || r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                          {r.is_verified ? ' · terverifikasi' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header Card */}
        <div style={{
          padding: '20px', borderRadius: 20, marginBottom: 16,
          background: `${HP_TOKENS.lavenderSoft}`,
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

        {/* Filter periode — dipakai semua tab (ringkasan/kpi/logbook) */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(() => {
            const selStyle: React.CSSProperties = {
              flex: 1, padding: '7px 8px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.line}`,
              fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, background: HP_TOKENS.card, color: HP_TOKENS.ink, outline: 'none',
            };
            const MONTHS_S = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            return (
              <>
                <select value={pMonth} onChange={e => setPMonth(Number(e.target.value))} style={selStyle} aria-label="Bulan">
                  {MONTHS_S.map((mm, i) => <option key={i} value={i + 1}>{mm}</option>)}
                </select>
                <select value={pYear} onChange={e => setPYear(Number(e.target.value))} style={selStyle} aria-label="Tahun">
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={pWeek} onChange={e => setPWeek(Number(e.target.value))} style={selStyle} aria-label="Minggu">
                  <option value={0}>Semua Minggu</option>
                  {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>Minggu {w}</option>)}
                </select>
              </>
            );
          })()}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { key: 'overview', label: '📊 Ringkasan' },
            { key: 'kpi', label: '🎯 KPI' },
            { key: 'logbook', label: '📖 Logbook' },
            { key: 'onboarding', label: '📝 Onboarding' },
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
            {/* Capaian Kinerja (donut skor + tren mingguan) */}
            {agg && (
              <HPCard padding={16} style={{ background: `${HP_TOKENS.sageWash}`, border: `1.5px solid ${HP_TOKENS.sage}20` }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 12 }}>🎯 CAPAIAN KINERJA BULAN INI</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-around' }}>
                  {[
                    { v: agg.kpiScore, l: 'Skor KPI', c: toneFor(agg.kpiScore) },
                    { v: agg.completionRate, l: 'Task', c: HP_TOKENS.blue },
                    { v: agg.qualityScore, l: 'Kualitas', c: '#8B5CF6' },
                  ].map(d => (
                    <div key={d.l} style={{ textAlign: 'center' }}>
                      <Donut value={d.v} color={d.c} size={72} thickness={4}>
                        <span style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 17, color: d.c }}>{d.v}<span style={{ fontSize: 9 }}>%</span></span>
                      </Donut>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4, fontSize: 10 }}>{d.l}</div>
                    </div>
                  ))}
                </div>
                {agg.targets?.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${HP_TOKENS.sage}20` }}>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 8 }}>CAPAIAN PER TARGET · ketuk untuk detail</div>
                    <TargetBars targets={agg.targets} showKpi onTargetClick={openTargetDetail} />
                  </div>
                )}
              </HPCard>
            )}

            {/* Attendance Summary — cukup hadir vs tidak hadir */}
            <HPCard padding={14}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 10 }}>📅 KEHADIRAN BULAN INI</div>
              {(() => {
                const hadir = agg?.attendanceDays ?? p.attendanceSummary?.totalDays ?? 0;
                const kerja = agg?.workingDays ?? 0;
                const tidak = Math.max(0, kerja - hadir);
                return (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: HP_TOKENS.sage }}>{hadir}</div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>hari hadir</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: tidak > 0 ? HP_TOKENS.coral : HP_TOKENS.inkMute }}>{tidak}</div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>tidak hadir</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: HP_TOKENS.blue }}>{kerja || '-'}</div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>hari kerja</div>
                    </div>
                  </div>
                );
              })()}
              <button onClick={() => setActiveTab('logbook')} className="hp-tap" style={{
                width: '100%', marginTop: 10, padding: '8px', borderRadius: 10,
                background: HP_TOKENS.paper, border: `1px solid ${HP_TOKENS.lineSoft}`,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, color: HP_TOKENS.blue, cursor: 'pointer',
              }}>
                Lihat timeline logbook →
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
              kpis.map((k: any) => {
                const aw = agg?.kpis?.find((x: any) => x.title?.toLowerCase() === k.title?.toLowerCase());
                const kpiTargets = (aw?.weekly || []).map((w: any) => ({ ...w, kpiTitle: aw?.title }));
                return (
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
                      <span>{k.weight ? `Bobot: ${k.weight}%` : `Target: ${k.targetValue} ${k.metricUnit || ''}`}</span>
                    </div>
                    {kpiTargets.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${HP_TOKENS.lineSoft}` }}>
                        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 8 }}>TARGET · ketuk untuk detail</div>
                        <TargetBars targets={kpiTargets} onTargetClick={openTargetDetail} />
                      </div>
                    )}
                  </HPCard>
                );
              })
            )}
          </div>
        )}

        {/* ── LOGBOOK TAB — timeline kronologis gabungan (absensi + mood + task + catatan) ── */}
        {activeTab === 'logbook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logbook.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Belum ada aktivitas tercatat</div>
            ) : (
              logbook.slice(0, 60).map((entry: any, i: number) => {
                const dot = entry.kind === 'task' ? (entry.done ? HP_TOKENS.sage : HP_TOKENS.yellow)
                  : entry.kind === 'checkin' ? HP_TOKENS.blue
                  : entry.kind === 'mood' ? (MOOD_COLOR[entry.moodKey] || HP_TOKENS.yellow)
                  : HP_TOKENS.lavender;
                return (
                  <HPCard key={i} padding={12}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0, background: dot }} />
                      <div style={{ fontSize: 16, lineHeight: '20px', flexShrink: 0 }}>{entry.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...HP_TEXT.small, fontWeight: 700, fontSize: 13, color: HP_TOKENS.ink }}>{entry.title}</div>
                        {entry.description && (
                          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{entry.description}</div>
                        )}
                        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, marginTop: 4 }}>
                          {entry.created_at ? new Date(entry.created_at).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          {entry.mood ? ` · mood ${MOOD_EMOJI[entry.mood] || entry.mood}` : ''}
                        </div>
                      </div>
                      {entry.xp > 0 && (
                        <div style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800, background: HP_TOKENS.yellowSoft, color: '#8A6814', fontFamily: HP_FONT, flexShrink: 0 }}>
                          +{entry.xp} Point
                        </div>
                      )}
                    </div>
                  </HPCard>
                );
              })
            )}
          </div>
        )}

        {/* ── ONBOARDING TAB — knowledge tambahan dari jawaban onboarding karyawan ── */}
        {activeTab === 'onboarding' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <HPCard padding={14}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 10 }}>🏢 DIVISI</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{u.department || 'Belum dipilih'}</div>
                {u.department_status && (
                  <div style={{
                    padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, fontFamily: HP_FONT,
                    background: u.department_status === 'approved' ? HP_TOKENS.sageWash : u.department_status === 'rejected' ? '#FAEAEA' : HP_TOKENS.yellowSoft,
                    color: u.department_status === 'approved' ? HP_TOKENS.sage : u.department_status === 'rejected' ? HP_TOKENS.coral : '#8A6814',
                  }}>
                    {u.department_status === 'approved' ? 'DISETUJUI' : u.department_status === 'rejected' ? 'DITOLAK' : 'MENUNGGU HR'}
                  </div>
                )}
              </div>
            </HPCard>

            {(p.onboardingAnswers || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute, border: `1.5px dashed ${HP_TOKENS.line}`, borderRadius: 16 }}>
                Belum ada data onboarding tercatat untuk karyawan ini.
              </div>
            ) : (
              (p.onboardingAnswers || []).map((qa: any, i: number) => (
                <HPCard key={i} padding={14}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 6 }}>{qa.question}</div>
                  <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{qa.answer || '—'}</div>
                </HPCard>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
