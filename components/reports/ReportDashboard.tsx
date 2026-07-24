"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import { downloadDivisionExcel, downloadDivisionZip, downloadPersonExcel } from "@/lib/reportExcel";
import { Donut, DonutTile, TargetBars, KpiBreakdownBars, Meter, HealthBar, toneFor } from "@/components/reports/charts";

interface Props {
  openModal: (name: string, props?: any) => void;
  lockedDept?: string;   // kunci ke satu divisi (dashboard divisi) — sembunyikan pemilih divisi
  compact?: boolean;     // sembunyikan header besar (dipakai saat di-embed di People)
  teamOnly?: boolean;    // mode manager — server otomatis scope ke tim; sembunyikan pemilih divisi
  hidePeople?: boolean;  // sembunyikan kartu per-orang (dipakai saat People sudah punya daftar sendiri)
}

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTHS_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function ReportDashboard({ openModal, lockedDept, compact, teamOnly, hidePeople }: Props) {
  const { user, notify } = useHP();

  const [departments, setDepartments] = useState<any[]>([]);
  const [dept, setDept] = useState(lockedDept || 'all');

  // Sinkron saat divisi terkunci berganti (mis. pindah divisi di People).
  useEffect(() => { if (lockedDept) setDept(lockedDept); }, [lockedDept]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [week, setWeek] = useState(0); // 0 = semua

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ team: any; people: any[] } | null>(null);

  const [narrative, setNarrative] = useState('');
  const [showNarrative, setShowNarrative] = useState(false);
  const [narrativeAt, setNarrativeAt] = useState<string | null>(null); // timestamp if from a stored/auto recap
  const [dlOpen, setDlOpen] = useState(false);
  const [dlBusy, setDlBusy] = useState('');
  const [kpiDetail, setKpiDetail] = useState<any>(null); // { title } saat bar KPI diklik

  // Search & Pagination state for Per-Person Detail Cards
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peoplePage, setPeoplePage] = useState(1);
  const PEOPLE_PER_PAGE = 12;

  // Filter people based on search query
  const filteredPeople = useMemo(() => {
    if (!data?.people) return [];
    if (!peopleSearch.trim()) return data.people;
    const q = peopleSearch.toLowerCase().trim();
    return data.people.filter((p: any) =>
      p.name?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q) ||
      p.jobTitle?.toLowerCase().includes(q)
    );
  }, [data?.people, peopleSearch]);

  // Reset page when search or filters change
  useEffect(() => {
    setPeoplePage(1);
  }, [peopleSearch, dept, month, year, week]);

  // Paginated list
  const totalPeoplePages = Math.max(1, Math.ceil(filteredPeople.length / PEOPLE_PER_PAGE));
  const paginatedPeopleList = useMemo(() => {
    const start = (peoplePage - 1) * PEOPLE_PER_PAGE;
    return filteredPeople.slice(start, start + PEOPLE_PER_PAGE);
  }, [filteredPeople, peoplePage]);

  const scopeLabel = useMemo(() => (teamOnly ? 'Tim Saya' : dept === 'all' ? 'Semua Divisi' : dept), [dept, teamOnly]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hr/departments');
        const d = await res.json();
        if (d.departments) setDepartments(d.departments);
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setNarrative(''); setShowNarrative(false); setNarrativeAt(null);
    try {
      const res = await fetch(`/api/hr/reports/dashboard?requesterId=${user.id}&department=${encodeURIComponent(dept)}&month=${month}&year=${year}&week=${week}`);
      const json = await res.json();
      if (json.error) { notify('Error', json.error, 'error'); setData(null); }
      else setData({ team: json.team, people: json.people || [] });

      // Auto-load a stored recap (from the auto-recap cron or a previous manual generate).
      try {
        const nres = await fetch(`/api/hr/reports/ai?requesterId=${user.id}&department=${encodeURIComponent(dept)}&month=${month}&year=${year}&week=${week}`);
        const nj = await nres.json();
        if (nj.stored?.narrative) { setNarrative(nj.stored.narrative); setNarrativeAt(nj.stored.generatedAt); setShowNarrative(true); }
      } catch { /* stored recap optional */ }
    } catch (e) {
      console.error(e); notify('Error', 'Gagal memuat data laporan.', 'error'); setData(null);
    }
    setLoading(false);
  }, [user?.id, dept, month, year, week]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runDownload = async (kind: 'excel' | 'zip' | 'pick') => {
    setDlOpen(false);
    if (kind === 'pick') { openModal('report_export'); return; }
    if (!data?.people.length) { notify('Kosong', 'Tidak ada data untuk diunduh.', 'warning'); return; }
    setDlBusy(kind);
    try {
      const common = { requesterId: user?.id || '', department: teamOnly ? 'all' : dept, scopeLabel, month, year, team: data.team, people: data.people };
      if (kind === 'excel') await downloadDivisionExcel(common);
      else await downloadDivisionZip(common);
      notify('Berhasil', kind === 'excel' ? 'Excel (rangkuman + tab per orang) diunduh.' : 'ZIP per orang diunduh.', 'success');
    } catch (e) { console.error(e); notify('Error', 'Gagal membuat file.', 'error'); }
    setDlBusy('');
  };

  const downloadOnePerson = async (p: any) => {
    setDlBusy('one');
    try {
      await downloadPersonExcel({ requesterId: user?.id || '', person: p, scopeLabel, month, year });
      notify('Berhasil', `Laporan ${p.name} diunduh.`, 'success');
    } catch (e) { console.error(e); notify('Error', 'Gagal membuat file.', 'error'); }
    setDlBusy('');
  };

  const team = data?.team;
  const people = data?.people || [];
  const periodLabel = week > 0 ? `Minggu ${week} · ${MONTHS_FULL[month - 1]} ${year}` : `${MONTHS_FULL[month - 1]} ${year}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <HPCard padding={0} style={{ overflow: 'hidden' }}>
        {!compact && (
          <div style={{ background: HP_TOKENS.sage, padding: 20, color: '#F4F7F9' }}>
            <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 20 }}>📊 Dashboard Laporan Kinerja</div>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginTop: 2 }}>{scopeLabel} · {periodLabel}</div>
          </div>
        )}
        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 16 }}>
          {!lockedDept && !teamOnly && (
            <Field label="DIVISI">
              <select value={dept} onChange={e => setDept(e.target.value)} style={selectStyle}>
                <option value="all">Semua Divisi</option>
                {departments.map(d => <option key={d.id || d.name} value={d.name}>{d.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="MINGGU">
            <select value={week} onChange={e => setWeek(Number(e.target.value))} style={selectStyle}>
              <option value={0}>Semua Minggu</option>
              {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>Minggu {w}</option>)}
            </select>
          </Field>
          <Field label="BULAN">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selectStyle}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </Field>
          <Field label="TAHUN">
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={selectStyle}>
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
            <button onClick={() => setDlOpen(o => !o)} disabled={!!dlBusy || !people.length} className="hp-tap" style={actionBtn(HP_TOKENS.ink, !!dlBusy || !people.length)}>
              {dlBusy ? '⏳ Menyiapkan...' : '⬇ Unduh ▾'}
            </button>
            {dlOpen && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 30,
                background: HP_TOKENS.card, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden',
              }}>
                {[
                  { k: 'excel', label: '📊 Excel Divisi', sub: 'Rangkuman (chart) + tab per orang' },
                  { k: 'zip', label: '🗂️ ZIP per Orang', sub: '1 file Excel terpisah / orang' },
                  { k: 'pick', label: '📋 Excel Pilih...', sub: 'Pilih orang & jenis manual' },
                ].map(item => (
                  <button key={item.k} onClick={() => runDownload(item.k as any)} className="hp-tap" style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none',
                    borderBottom: `1px solid ${HP_TOKENS.lineSoft}`, background: 'transparent', cursor: 'pointer', fontFamily: HP_FONT,
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 12, color: HP_TOKENS.ink }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: HP_TOKENS.inkMute, fontWeight: 600 }}>{item.sub}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </HPCard>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute, fontFamily: HP_FONT }}>Memuat dashboard...</div>
      ) : !team || !people.length ? (
        <HPCard padding={40} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32 }}>📭</div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 8 }}>Tidak ada data untuk pilihan ini.</div>
        </HPCard>
      ) : (
        <>
          {/* Team overview */}
          <HPCard padding={20}>
            <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 16 }}>Ringkasan Tim</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <DonutTile value={team.avgCompletion} label="Penyelesaian Task" color={HP_TOKENS.blue} />
              <DonutTile value={team.avgKpiScore} label="Skor KPI" color={HP_TOKENS.sage} />
              <DonutTile value={team.avgQuality} label="Kualitas" color="#8B5CF6" />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <Stat big={`${team.headcount}`} label="Karyawan" />
              <Stat big={`${team.tasksCompleted}/${team.totalTasks}`} label="Task Selesai" />
              <Stat big={`${team.kpiHealth?.total || 0}`} label="Total KPI" />
            </div>
            <HealthBar health={team.kpiHealth} />
          </HPCard>

          {/* AI narrative — hanya tampil dari hasil jadwal (otomatis), tidak ada generate manual */}
          {showNarrative ? (
            <HPCard padding={20} style={{ background: HP_TOKENS.blueWash, border: `1.5px solid ${HP_TOKENS.blue}25` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ ...HP_TEXT.h, fontSize: 15, color: HP_TOKENS.blue }}>✨ Analisa AI — {week > 0 ? 'Mingguan' : 'Bulanan'}</div>
                {narrativeAt && (
                  <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, letterSpacing: 0 }}>
                    🕒 Rekap {new Date(narrativeAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                )}
              </div>
              <NarrativeView md={narrative} />
            </HPCard>
          ) : (
            <HPCard padding={14} style={{ background: HP_TOKENS.lineSoft, border: `1px dashed ${HP_TOKENS.line}` }}>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 600 }}>
                ✨ Rangkuman AI dibuat <b>otomatis</b> tiap <b>Jumat</b> (mingguan) & <b>akhir bulan</b> (bulanan). Belum ada untuk periode ini.
              </div>
            </HPCard>
          )}

          {/* Capaian per KPI (bukan tren minggu — target berdurasi bebas) */}
          {team.byKpi?.length > 0 && (
            <HPCard padding={20}>
              <div style={{ ...HP_TEXT.h, fontSize: 15, marginBottom: 4 }}>Capaian per KPI</div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 12 }}>Rata-rata pencapaian tiap KPI di seluruh anggota</div>
              <KpiBreakdownBars items={team.byKpi} onKpiClick={(k) => setKpiDetail(k)} />
            </HPCard>
          )}

          {/* Detail kontributor per KPI (saat bar diklik) */}
          {kpiDetail && (() => {
            const contributors = people
              .map(p => ({ p, k: (p.kpis || []).find((x: any) => x.title === kpiDetail.title) }))
              .filter(x => x.k)
              .sort((a, b) => (b.k.achievement || 0) - (a.k.achievement || 0));
            return (
              <div onClick={() => setKpiDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div onClick={e => e.stopPropagation()} style={{ background: HP_TOKENS.card, borderRadius: 18, padding: 18, maxWidth: 440, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800 }}>CAPAIAN KPI · rata-rata {kpiDetail.avgAchievement}%</div>
                      <div style={{ ...HP_TEXT.h, fontSize: 16 }}>{kpiDetail.title}</div>
                    </div>
                    <button onClick={() => setKpiDetail(null)} className="hp-tap" style={{ border: 'none', background: HP_TOKENS.lineSoft, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontFamily: HP_FONT, fontWeight: 800, color: HP_TOKENS.inkMute }}>✕</button>
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, margin: '10px 0 8px' }}>KONTRIBUTOR ({contributors.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {contributors.map(({ p, k }) => (
                      <button key={p.id} onClick={() => { setKpiDetail(null); openModal('employee_profile', { employeeId: p.id, employeeName: p.name }); }} className="hp-tap"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: HP_TOKENS.paper, border: `1px solid ${HP_TOKENS.lineSoft}`, cursor: 'pointer', textAlign: 'left', fontFamily: HP_FONT }}>
                        <HPAvatar name={p.name} size={30} image={p.avatarImage} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...HP_TEXT.small, fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 10 }}>{p.jobTitle || p.department}</div>
                        </div>
                        <Meter value={k.achievement} color={toneFor(k.achievement)} width={80} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* By division */}
          {team.byDivision?.length > 1 && (
            <HPCard padding={20}>
              <div style={{ ...HP_TEXT.h, fontSize: 15, marginBottom: 12 }}>Per Divisi</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {team.byDivision.map((d: any) => (
                  <div key={d.department} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 110, fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, color: HP_TOKENS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.department}</div>
                    <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, width: 48 }}>{d.headcount} org</span>
                    <div style={{ flex: 1 }}><Meter value={d.avgKpi} color={toneFor(d.avgKpi)} width={120} /></div>
                  </div>
                ))}
              </div>
            </HPCard>
          )}

          {/* Per-person cards */}
          {!hidePeople && (
          <div style={{ marginTop: 24 }}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              gap: 12, 
              margin: '0 4px 12px' 
            }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 900, fontSize: 12 }}>
                DETAIL PER ORANG ({filteredPeople.length}{data?.people?.length !== filteredPeople.length ? ` / ${data?.people?.length}` : ''})
              </div>

              {/* Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: HP_TOKENS.card,
                borderRadius: 12,
                padding: '6px 12px',
                border: `1.5px solid ${HP_TOKENS.line}`,
                minWidth: 240,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <span style={{ fontSize: 14 }}>🔍</span>
                <input
                  type="text"
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  placeholder="Cari nama, divisi, atau jabatan..."
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontFamily: HP_FONT,
                    fontWeight: 700,
                    fontSize: 13,
                    color: HP_TOKENS.ink,
                  }}
                />
                {peopleSearch && (
                  <button
                    onClick={() => setPeopleSearch('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: HP_TOKENS.inkMute,
                      padding: 2
                    }}
                    title="Hapus pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {filteredPeople.length === 0 ? (
              <div style={{
                background: HP_TOKENS.card,
                borderRadius: 16,
                border: `1.5px dashed ${HP_TOKENS.line}`,
                padding: '36px 20px',
                textAlign: 'center',
                color: HP_TOKENS.inkMute,
                fontFamily: HP_FONT,
                fontSize: 14,
                fontWeight: 700
              }}>
                Tidak ada anggota yang cocok dengan kata kunci &quot;{peopleSearch}&quot;.
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {paginatedPeopleList.map(p => (
                    <button key={p.id} onClick={() => openModal('employee_profile', { employeeId: p.id, employeeName: p.name })} className="hp-tap"
                      style={{ textAlign: 'left', cursor: 'pointer', background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: HP_FONT }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <HPAvatar name={p.name} size={40} image={p.avatarImage} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...HP_TEXT.h, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 10 }}>{p.jobTitle || p.department}</div>
                        </div>
                        <Donut value={p.kpiScore} color={toneFor(p.kpiScore)} size={48} thickness={4}>
                          <span style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, color: toneFor(p.kpiScore) }}>{p.kpiScore}</span>
                        </Donut>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <MiniStat b={`${p.tasksCompleted}/${p.totalTasks}`} s={`${p.completionRate}%`} />
                        <MiniStat b={`${p.attendanceDays}/${p.workingDays}`} s="Hadir" />
                        <MiniStat b={`${p.kpiCount}`} s="KPI" />
                      </div>
                      {p.targets?.length > 0 && <TargetBars targets={p.targets} max={3} />}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, fontSize: 10 }}>Ketuk untuk profil →</span>
                        <span role="button" tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); downloadOnePerson(p); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); downloadOnePerson(p); } }}
                          style={{ ...HP_TEXT.tiny, fontSize: 10, color: HP_TOKENS.sage, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: HP_TOKENS.sageWash, cursor: 'pointer' }}>
                          ⬇ Excel
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPeoplePages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginTop: 16,
                    padding: '12px 16px',
                    background: HP_TOKENS.card,
                    borderRadius: 16,
                    border: `1.5px solid ${HP_TOKENS.line}`
                  }}>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 12, fontWeight: 700 }}>
                      Menampilkan {(peoplePage - 1) * PEOPLE_PER_PAGE + 1} - {Math.min(peoplePage * PEOPLE_PER_PAGE, filteredPeople.length)} dari {filteredPeople.length} orang
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => setPeoplePage(p => Math.max(1, p - 1))}
                        disabled={peoplePage === 1}
                        className="hp-tap"
                        style={{
                          padding: '6px 12px',
                          borderRadius: 10,
                          border: `1px solid ${HP_TOKENS.line}`,
                          background: peoplePage === 1 ? HP_TOKENS.lineSoft : HP_TOKENS.paper,
                          color: peoplePage === 1 ? HP_TOKENS.inkMute : HP_TOKENS.ink,
                          fontFamily: HP_FONT,
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: peoplePage === 1 ? 'default' : 'pointer',
                          opacity: peoplePage === 1 ? 0.5 : 1
                        }}
                      >
                        ◀ Sebelumnya
                      </button>

                      <span style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.ink, padding: '0 4px' }}>
                        {peoplePage} / {totalPeoplePages}
                      </span>

                      <button
                        onClick={() => setPeoplePage(p => Math.min(totalPeoplePages, p + 1))}
                        disabled={peoplePage === totalPeoplePages}
                        className="hp-tap"
                        style={{
                          padding: '6px 12px',
                          borderRadius: 10,
                          border: `1px solid ${HP_TOKENS.line}`,
                          background: peoplePage === totalPeoplePages ? HP_TOKENS.lineSoft : HP_TOKENS.paper,
                          color: peoplePage === totalPeoplePages ? HP_TOKENS.inkMute : HP_TOKENS.ink,
                          fontFamily: HP_FONT,
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: peoplePage === totalPeoplePages ? 'default' : 'pointer',
                          opacity: peoplePage === totalPeoplePages ? 0.5 : 1
                        }}
                      >
                        Selanjutnya ▶
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Small helpers ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}
function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 100, background: HP_TOKENS.lineSoft, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: HP_TOKENS.ink }}>{big}</div>
      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{label}</div>
    </div>
  );
}
function MiniStat({ b, s }: { b: string; s: string }) {
  return (
    <div style={{ flex: 1, background: HP_TOKENS.lineSoft, borderRadius: 10, padding: '6px 4px', textAlign: 'center' }}>
      <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.ink }}>{b}</div>
      <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 9, color: HP_TOKENS.inkMute }}>{s}</div>
    </div>
  );
}
function NarrativeView({ md }: { md: string }) {
  // Lightweight markdown → styled blocks (## headings, - bullets, **bold**)
  const lines = (md || '').split('\n');
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: number) => {
    if (bullets.length) {
      out.push(<ul key={`u${key}`} style={{ margin: '6px 0', paddingLeft: 18 }}>{bullets.map((b, i) => <li key={i} style={{ ...HP_TEXT.small, color: HP_TOKENS.ink, margin: '3px 0', fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: inlineMd(b) }} />)}</ul>);
      bullets = [];
    }
  };
  lines.forEach((ln, i) => {
    const t = ln.trim();
    if (t.startsWith('## ')) { flush(i); out.push(<div key={i} style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.sage, marginTop: 12, marginBottom: 4 }}>{t.slice(3)}</div>); }
    else if (t.startsWith('- ')) bullets.push(t.slice(2));
    else if (t) { flush(i); out.push(<div key={i} style={{ ...HP_TEXT.small, color: HP_TOKENS.ink, fontWeight: 600, lineHeight: 1.6, margin: '4px 0' }} dangerouslySetInnerHTML={{ __html: inlineMd(t) }} />); }
  });
  flush(9999);
  return <div>{out}</div>;
}
function inlineMd(s: string): string {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: 10, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
  fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, outline: 'none', background: HP_TOKENS.card,
  color: HP_TOKENS.ink, boxSizing: 'border-box', height: 42,
};
function actionBtn(color: string, disabled: boolean): React.CSSProperties {
  return {
    flex: 1, minWidth: 100, padding: '11px 12px', borderRadius: 12, border: 'none',
    background: disabled ? HP_TOKENS.lineSoft : color, color: disabled ? HP_TOKENS.inkMute : '#F4F7F9',
    fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: disabled ? 'default' : 'pointer',
  };
}
