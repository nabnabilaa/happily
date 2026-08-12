"use client";

import React, { useState, useEffect, useMemo } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT, HP_CATEGORICAL } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import { useHP } from "@/lib/HPContext";
import HRAttendanceView from "@/components/goals/HRAttendanceView";
import DivisionTargetsView from "@/components/goals/DivisionTargetsView";
import OfficeSettingsMap from "@/components/hr/OfficeSettingsMap";
import ReportDashboard from "@/components/reports/ReportDashboard";
import HRAnalyticsTabs from "@/components/home/HRAnalyticsTabs";
import HRManageList from "@/components/hr/HRManageList";
import { downloadPersonExcel } from "@/lib/reportExcel";

interface Props { openModal: (name: string, props?: any) => void; }

const DEPT_EMOJIS: Record<string, string> = {
  'Product': '🚀', 'Engineering': '⚙️', 'Marketing': '📣', 'HR': '👥',
  'Finance': '💰', 'Operations': '📦', 'Design': '🎨', 'Sales': '📈',
};
// Departments differ in kind, not in quality — categorical ramp, never status.
const DEPT_COLORS = HP_CATEGORICAL;

const scoreTone = (v: number) => (v >= 80 ? HP_TOKENS.sage : v >= 50 ? HP_TOKENS.yellow : HP_TOKENS.coral);
/** Text twin of `scoreTone` — the 50-79 band is yellow, 2.2:1 on white. */
const scoreInk = (v: number) => (v >= 80 ? HP_TOKENS.sageInk : v >= 50 ? HP_TOKENS.yellowInk : HP_TOKENS.coralInk);

function MiniDonut({ value, size = 40 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color = scoreTone(value);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={`${color}22`} strokeWidth={4} />
        <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${v}, 100`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HP_FONT, fontWeight: 700, fontSize: size * 0.28, color }}>{Math.round(v)}</div>
    </div>
  );
}

export default function HRPeopleScreen({ openModal }: Props) {
  const { state, user: currentUser, updateState, refreshSurveys } = useHP();
  // Izin admin HR. Sengaja disamakan dengan `canHrAdmin()` di `lib/hrAuth.ts`
  // supaya klien dan server memakai aturan yang persis sama. Tidak lagi membaca
  // `userRole`: itu dulu state switcher peran, dan peran tidak lagi ditukar.
  const isHR = currentUser?.role === 'hr' || !!currentUser?.hrAccess;
  // Akun HR murni memakai layar ini sebagai konsol admin saja — ringkasan
  // organisasi sudah jadi halaman Home-nya. Employee/manager ber-hrAccess tidak
  // punya Home HR (Home mereka tetap milik peran aslinya), jadi ringkasan itu
  // harus ikut masuk ke sini atau mereka tidak akan pernah melihatnya.
  const isPureHR = currentUser?.role === 'hr';
  const [activeTab, setActiveTab] = useState<'summary' | 'users' | 'attendance' | 'targets' | 'office' | 'schedule' | 'contacts' | 'surveys'>(isPureHR ? 'users' : 'summary');

  // Skor per divisi untuk scorecard di kartu People + toggle dashboard semua divisi.
  const [divScores, setDivScores] = useState<Record<string, { avgKpi: number; avgCompletion: number; headcount: number }>>({});
  const [showAllDash, setShowAllDash] = useState(false);

  const fetchDivScores = async () => {
    if (!currentUser?.id) return;
    try {
      const m = new Date().getMonth() + 1, y = new Date().getFullYear();
      const res = await fetch(`/api/hr/reports/dashboard?requesterId=${currentUser.id}&department=all&month=${m}&year=${y}`);
      const data = await res.json();
      const map: Record<string, any> = {};
      (data?.team?.byDivision || []).forEach((d: any) => { map[d.department] = { avgKpi: d.avgKpi, avgCompletion: d.avgCompletion, headcount: d.headcount }; });
      setDivScores(map);
    } catch (e) { console.error('divScores', e); }
  };

  // Skor per orang untuk divisi terpilih (menyatukan "kinerja" ke daftar anggota).
  const [deptPeopleScores, setDeptPeopleScores] = useState<Record<string, { kpiScore: number; completionRate: number; qualityScore: number }>>({});
  const fetchDeptPeopleScores = async (dept: string) => {
    if (!currentUser?.id || !dept) return;
    try {
      const m = new Date().getMonth() + 1, y = new Date().getFullYear();
      const res = await fetch(`/api/hr/reports/dashboard?requesterId=${currentUser.id}&department=${encodeURIComponent(dept)}&month=${m}&year=${y}`);
      const data = await res.json();
      const map: Record<string, any> = {};
      (data?.people || []).forEach((p: any) => { map[String(p.id)] = { kpiScore: p.kpiScore, completionRate: p.completionRate, qualityScore: p.qualityScore }; });
      setDeptPeopleScores(map);
    } catch (e) { console.error('deptPeopleScores', e); }
  };


  const [search, setSearch] = useState('');
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptRequests, setDeptRequests] = useState<any[]>([]);
  const [loadingDeptRequests, setLoadingDeptRequests] = useState(false);
  const [changeDeptId, setChangeDeptId] = useState<string | null>(null);
  const [changeDeptVal, setChangeDeptVal] = useState('');

  const [currentPagePeople, setCurrentPagePeople] = useState(1);
  const [currentPageContacts, setCurrentPageContacts] = useState(1);

  // Drill-down state: null = dept cards, string = people in that dept
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  useEffect(() => { if (selectedDept) fetchDeptPeopleScores(selectedDept); }, [selectedDept]);

  // reset pages on filter/search change
  useEffect(() => {
    setCurrentPagePeople(1);
  }, [search, selectedDept]);

  useEffect(() => {
    setCurrentPageContacts(1);
  }, [search]);

  const filteredContacts = useMemo(() => {
    const list = state?.contacts || [];
    if (!search) return list;
    return list.filter((c: any) => 
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.role?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [state?.contacts, search]);

  const contactsPerPage = 5;
  const totalPagesContacts = Math.ceil(filteredContacts.length / contactsPerPage);
  const paginatedContacts = useMemo(() => {
    const start = (currentPageContacts - 1) * contactsPerPage;
    return filteredContacts.slice(start, start + contactsPerPage);
  }, [filteredContacts, currentPageContacts]);

  useEffect(() => {
    if (activeTab === 'users' && isHR) {
      fetchUsers();
      fetchDepartments();
      fetchDeptRequests();
      fetchDivScores();

      const handleUpdate = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchUsers();
          fetchDepartments();
          fetchDeptRequests();
        }
      };
      window.addEventListener('hp_db_update', handleUpdate);
      return () => window.removeEventListener('hp_db_update', handleUpdate);
    }
    if (activeTab === 'surveys') refreshSurveys();
  }, [activeTab, isHR, refreshSurveys]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/hr/users?adminId=${currentUser?.id}`);
      const data = await res.json();
      if (data.users) setDbUsers(data.users);
    } catch (e) { console.error(e); }
    setLoadingUsers(false);
  };

  const fetchDeptRequests = async () => {
    if (!currentUser?.id) return;
    setLoadingDeptRequests(true);
    try {
      const res = await fetch(`/api/hr/department-requests?requesterId=${currentUser.id}`);
      const data = await res.json();
      if (data.requests) setDeptRequests(data.requests);
    } catch (e) { console.error(e); }
    setLoadingDeptRequests(false);
  };

  const handleDeptRequestAction = async (targetUserId: string, action: string, department?: string) => {
    try {
      await fetch('/api/hr/department-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUser?.id, targetUserId, action, department }),
      });
      fetchDeptRequests();
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/hr/departments');
      const data = await res.json();
      if (data.departments) setDepartments(data.departments);
    } catch (e) { console.error(e); }
  };

  const handleUpdateUser = async (targetUserId: string, updates: any) => {
    try {
      const res = await fetch("/api/hr/update-role", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: currentUser?.id, targetUserId, ...updates }),
      });
      if (res.ok) fetchUsers();
    } catch (e) { console.error(e); }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) return;
    try {
      const res = await fetch("/api/hr/delete-user", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: currentUser?.id, targetUserId }),
      });
      if (res.ok) fetchUsers();
    } catch (e) { console.error(e); }
  };

  const handleCreateUser = async (formData: any) => {
    const res = await fetch("/api/hr/create-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId: currentUser?.id, ...formData }),
    });
    if (res.ok) fetchUsers();
    else { const err = await res.json(); throw new Error(err.error || "Gagal"); }
  };

  const managers = dbUsers.filter(u => u.role === 'manager');
  // Yang boleh dipasang sebagai atasan. Sengaja lebih luas dari kartu statistik
  // "Manager" di atas: server menerima manager DAN hr (lihat
  // `validateManagerAssignment`), jadi daftar pilihannya harus sama persis —
  // kalau tidak, HR melihat pilihan yang ditolak server, atau sebaliknya
  // kehilangan pilihan yang sebenarnya sah.
  const assignableManagers = dbUsers.filter(u => u.role === 'manager' || u.role === 'hr');
  const managerNameById: Record<string, string> = {};
  dbUsers.forEach(u => { managerNameById[String(u.id)] = u.name; });

  // Group users by department
  const usersByDept: Record<string, any[]> = {};
  dbUsers.forEach(u => {
    const dept = u.department || 'Tanpa Departemen';
    if (!usersByDept[dept]) usersByDept[dept] = [];
    usersByDept[dept].push(u);
  });

  // Filtered users in selected dept
  const deptUsers = selectedDept
    ? (usersByDept[selectedDept] || []).filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.job_title?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const peoplePerPage = 10;
  const totalPagesPeople = Math.ceil(deptUsers.length / peoplePerPage);
  const paginatedPeople = useMemo(() => {
    const start = (currentPagePeople - 1) * peoplePerPage;
    return deptUsers.slice(start, start + peoplePerPage);
  }, [deptUsers, currentPagePeople]);

  const inputStyle: React.CSSProperties = {
    width: '100%', marginTop: 8, padding: 12, borderRadius: HP_TOKENS.radiusSm,
    border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
    outline: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink, boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader
        title="Management Console"
        subtitle="Kelola karyawan, role & pelaporan"
      />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          !isPureHR && { key: 'summary', label: 'Ringkasan' },
          isHR && { key: 'users', label: 'People' },
          { key: 'attendance', label: 'Attendance' },
          // Tab ini pernah digantung di `!isHR`, padahal layar ini hanya dirender
          // untuk orang yang `isHR`-nya true — jadi syaratnya tidak pernah
          // terpenuhi dan DivisionTargetsView tidak bisa dibuka siapa pun.
          { key: 'targets', label: 'Targets' },
          { key: 'office', label: 'Office' },
          { key: 'schedule', label: 'Work Hours' },
          { key: 'contacts', label: 'Contacts' },
          { key: 'surveys', label: 'Surveys' },
        ].filter(Boolean).map((t: any) => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedDept(null); }} className="hp-tap" style={{
            flex: '0 0 auto', padding: '10px 16px', borderRadius: HP_TOKENS.radiusMd,
            background: activeTab === t.key ? HP_TOKENS.lavender : HP_TOKENS.lineSoft,
            color: activeTab === t.key ? '#fff' : HP_TOKENS.inkSoft,
            border: 'none', fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Ringkasan organisasi + aksi Kelola ──
          Isi yang sama dengan Home milik akun HR murni, disusun dari komponen
          bersama supaya satu perubahan berlaku untuk kedua permukaan. */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Menunggu `hrData` sungguhan. HRWellbeingDashboard punya data contoh
              sebagai fallback, jadi tanpa penjaga ini layar sempat menampilkan
              divisi dan angka karangan seolah-olah itu data perusahaan. */}
          {state?.hrData ? (
            <HRAnalyticsTabs state={state} openModal={openModal} />
          ) : (
            <div aria-busy="true" aria-label="Memuat ringkasan organisasi" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="hp-skeleton" style={{ height: 132 }} />
              <div className="hp-skeleton" style={{ height: 88 }} />
            </div>
          )}
          <HRManageList openModal={openModal} />
        </div>
      )}

      {/* ── Users / People (Department Cards → People List) ── */}
      {activeTab === 'users' && isHR && (
        <>
          {/* Review KPI quick-access bar for HR */}
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => openModal('kpi_review')}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: HP_TOKENS.radiusMd, border: 'none', cursor: 'pointer',
                background: HP_TOKENS.yellowWash, color: HP_TOKENS.yellowInk,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              📋 Review & Flag Laporan KPI Karyawan
            </button>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => openModal('create_user', { managers: assignableManagers, onSave: handleCreateUser })} className="hp-tap" style={{
              flex: 1, padding: '12px', borderRadius: HP_TOKENS.radiusMd, border: 'none',
              background: HP_TOKENS.ink, color: HP_TOKENS.onPrimary,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <HPGlyph name="plus" size={14} color={HP_TOKENS.onPrimary} />
              Tambah Akun
            </button>
            <button onClick={() => openModal('manage_depts')} className="hp-tap" style={{
              padding: '12px 16px', borderRadius: HP_TOKENS.radiusMd,
              border: `1.5px solid ${HP_TOKENS.line}`, background: HP_TOKENS.card,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, color: HP_TOKENS.ink,
            }}>
              🏢 Departemen
            </button>
          </div>

          {/* Dashboard & Unduh Laporan (semua divisi) — hasil lebur tab Laporan ke People */}
          <button onClick={() => setShowAllDash(s => !s)} className="hp-tap" style={{
            width: '100%', padding: '13px 16px', borderRadius: HP_TOKENS.radiusMd, border: 'none', cursor: 'pointer', marginBottom: 12,
            background: showAllDash ? HP_TOKENS.sage : `${HP_TOKENS.sage}`, color: HP_TOKENS.onPrimary,
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            📊 {showAllDash ? 'Tutup Dashboard' : 'Dashboard & Unduh Laporan (semua divisi)'}
          </button>
          {showAllDash && (
            <div style={{ marginBottom: 16 }}>
              <ReportDashboard openModal={openModal} />
            </div>
          )}

          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Loading...</div>
          ) : !selectedDept ? (
            /* ── Department Cards View ── */
            <>
              {/* ── Pengajuan Divisi (Pending HR Approval) ── */}
              {(loadingDeptRequests || deptRequests.length > 0) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}><HPGlyph name="note" size={14} color="currentColor" /></span>
                    <span style={{ ...HP_TEXT.h, fontSize: 14 }}>Pengajuan Divisi</span>
                    {deptRequests.length > 0 && (
                      <span style={{
                        background: HP_TOKENS.lavender, color: '#fff',
                        borderRadius: HP_TOKENS.radius, padding: '2px 8px',
                        fontFamily: HP_FONT, fontWeight: 700, fontSize: 11,
                      }}>{deptRequests.length}</span>
                    )}
                  </div>
                  {loadingDeptRequests ? (
                    <div style={{ padding: '12px 0', color: HP_TOKENS.inkMute, fontFamily: HP_FONT, fontSize: 13 }}>Memuat pengajuan...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {deptRequests.map(req => (
                        <HPCard key={req.id} padding={14} style={{ border: `1.5px solid ${HP_TOKENS.line}` }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <HPAvatar name={req.name} size={42} />
                            <div style={{ flex: 1 }}>
                              <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{req.name}</div>
                              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{req.email}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                <span style={{ fontSize: 12 }}><HPGlyph name="folder" size={12} color="currentColor" /></span>
                                <span style={{
                                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.blue,
                                }}>{req.department || '—'}</span>
                                <span style={{
                                  background: HP_TOKENS.warningWash, color: HP_TOKENS.warningInk,
                                  borderRadius: HP_TOKENS.radius, padding: '2px 8px',
                                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 10,
                                }}>pending</span>
                              </div>
                              {/* Ubah divisi input */}
                              {changeDeptId === String(req.id) && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                  <input
                                    value={changeDeptVal}
                                    onChange={e => setChangeDeptVal(e.target.value)}
                                    placeholder="Nama divisi baru..."
                                    style={{
                                      flex: 1, padding: '8px 12px', borderRadius: HP_TOKENS.radiusSm,
                                      border: `1.5px solid ${HP_TOKENS.line}`,
                                      fontFamily: HP_FONT, fontSize: 13, outline: 'none',
                                      background: HP_TOKENS.card, color: HP_TOKENS.ink,
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      if (changeDeptVal.trim()) {
                                        handleDeptRequestAction(String(req.id), 'change', changeDeptVal.trim());
                                        setChangeDeptId(null); setChangeDeptVal('');
                                      }
                                    }}
                                    className="hp-tap"
                                    style={{
                                      padding: '8px 12px', borderRadius: HP_TOKENS.radiusSm, border: 'none',
                                      background: HP_TOKENS.blue, color: '#fff',
                                      fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                    }}
                                  >Simpan</button>
                                  <button
                                    onClick={() => { setChangeDeptId(null); setChangeDeptVal(''); }}
                                    className="hp-tap"
                                    style={{
                                      padding: '8px 12px', borderRadius: HP_TOKENS.radiusSm, border: 'none',
                                      background: HP_TOKENS.lineSoft, color: HP_TOKENS.inkSoft,
                                      fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                    }}
                                  >Batal</button>
                                </div>
                              )}
                            </div>
                            {/* Action buttons */}
                            {changeDeptId !== String(req.id) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <button
                                  onClick={() => handleDeptRequestAction(String(req.id), 'approve')}
                                  className="hp-tap"
                                  style={{
                                    padding: '6px 12px', borderRadius: HP_TOKENS.radiusSm, border: 'none',
                                    background: HP_TOKENS.successWash, color: HP_TOKENS.successInk,
                                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, cursor: 'pointer',
                                  }}
                                >✓ Setuju</button>
                                <button
                                  onClick={() => { setChangeDeptId(String(req.id)); setChangeDeptVal(req.department || ''); }}
                                  className="hp-tap"
                                  style={{
                                    padding: '6px 12px', borderRadius: HP_TOKENS.radiusSm, border: 'none',
                                    background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue,
                                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, cursor: 'pointer',
                                  }}
                                >✎ Ubah</button>
                                <button
                                  onClick={() => handleDeptRequestAction(String(req.id), 'reject')}
                                  className="hp-tap"
                                  style={{
                                    padding: '6px 12px', borderRadius: HP_TOKENS.radiusSm, border: 'none',
                                    background: HP_TOKENS.dangerWash, color: HP_TOKENS.dangerInk,
                                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, cursor: 'pointer',
                                  }}
                                >✕ Tolak</button>
                              </div>
                            )}
                          </div>
                        </HPCard>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Total', value: dbUsers.length, color: HP_TOKENS.lavenderInk, bg: HP_TOKENS.lavenderSoft },
                  { label: 'Departemen', value: Object.keys(usersByDept).length, color: HP_TOKENS.blue, bg: HP_TOKENS.blueSoft },
                  { label: 'Manager', value: managers.length, color: HP_TOKENS.sageInk, bg: HP_TOKENS.sageSoft },
                ].map(s => (
                  <div key={s.label} style={{
                    flex: 1, padding: '14px 10px', borderRadius: HP_TOKENS.radiusMd, textAlign: 'center',
                    background: s.bg, border: `1px solid ${s.color}20`,
                  }}>
                    <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 24, color: s.color }}>{s.value}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Department Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {Object.entries(usersByDept).map(([dept, users], i) => {
                  const color = DEPT_COLORS[i % DEPT_COLORS.length];
                  const emoji = DEPT_EMOJIS[dept] || '📁';
                  return (
                    <button
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      className="hp-tap"
                      style={{
                        padding: '18px 16px', borderRadius: HP_TOKENS.radius,
                        background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', flexDirection: 'column', gap: 8,
                        transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: -10, right: -10,
                        fontSize: 50, opacity: 0.08,
                      }}>{emoji}</div>
                      <div style={{
                        width: 42, height: 42, borderRadius: HP_TOKENS.radiusMd,
                        background: `${color}15`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 20,
                      }}>{emoji}</div>
                      <div>
                        <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{dept}</div>
                        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                          {users.length} anggota
                        </div>
                      </div>
                      {/* Scorecard divisi (KPI + penyelesaian task) */}
                      {divScores[dept] && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, padding: '8px 10px', borderRadius: HP_TOKENS.radiusSm, background: HP_TOKENS.lineSoft }}>
                          <MiniDonut value={divScores[dept].avgKpi} size={38} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: scoreInk(divScores[dept].avgKpi) }}>{divScores[dept].avgKpi}% <span style={{ fontSize: 9, fontWeight: 700, color: HP_TOKENS.inkMute }}>KPI</span></div>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 9 }}>{divScores[dept].avgCompletion}% task</div>
                          </div>
                        </div>
                      )}
                      {/* Mini avatar stack */}
                      <div style={{ display: 'flex', marginTop: 4 }}>
                        {users.slice(0, 4).map((u, j) => (
                          <div key={u.id} style={{ marginLeft: j > 0 ? -8 : 0, zIndex: 4 - j }}>
                            <HPAvatar name={u.name} size={24} image={u.avatar_image} />
                          </div>
                        ))}
                        {users.length > 4 && (
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', marginLeft: -8,
                            background: HP_TOKENS.lineSoft, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 700, color: HP_TOKENS.inkMute, fontFamily: HP_FONT,
                          }}>+{users.length - 4}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── People List in Department ── */
            <>
              {/* Back button + dept header */}
              <button onClick={() => { setSelectedDept(null); setSearch(''); }} className="hp-tap" style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                padding: '10px 16px', borderRadius: HP_TOKENS.radiusMd,
                background: HP_TOKENS.lineSoft, border: 'none', cursor: 'pointer',
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.ink,
              }}>
                <HPGlyph name="chevronLeft" size={14} color={HP_TOKENS.ink} />
                {DEPT_EMOJIS[selectedDept] || '📁'} {selectedDept}
                <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginLeft: 4 }}>
                  ({usersByDept[selectedDept]?.length || 0} orang)
                </span>
              </button>

              {/* Dashboard divisi (skor, chart, unduh) — kartu per-orang disembunyikan, digabung ke daftar di bawah */}
              <div style={{ marginBottom: 16 }}>
                <ReportDashboard openModal={openModal} lockedDept={selectedDept} compact hidePeople />
              </div>

              {/* Satu daftar: kinerja + aksi admin (profil, edit, role) dalam satu tempat */}
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, margin: '0 4px 8px' }}>ANGGOTA & KINERJA</div>

              {/* Search */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: HP_TOKENS.paper, borderRadius: HP_TOKENS.radiusMd, padding: '10px 14px', marginBottom: 12,
                border: `1.5px solid ${HP_TOKENS.line}`,
              }}>
                <HPGlyph name="leaf" size={16} color={HP_TOKENS.blue} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama atau jabatan..."
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 14, color: HP_TOKENS.ink,
                  }}
                />
              </div>

              {/* People list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {paginatedPeople.map(u => (
                  <HPCard key={u.id} padding={14} style={{ border: `1.5px solid ${HP_TOKENS.line}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <HPAvatar name={u.name} size={46} image={u.avatar_image} />
                      <div
                        style={{ flex: 1, cursor: 'pointer' }}
                        onClick={() => openModal('employee_profile', { employeeId: u.id, employeeName: u.name })}
                        className="hp-tap"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{u.name}</div>
                          <div style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                            background: u.role === 'hr' ? HP_TOKENS.primaryWash : u.role === 'manager' ? HP_TOKENS.blueSoft : HP_TOKENS.yellowSoft,
                            color: u.role === 'hr' ? HP_TOKENS.primary : u.role === 'manager' ? HP_TOKENS.blue : HP_TOKENS.yellow,
                            fontFamily: HP_FONT,
                          }}>
                            {u.role.toUpperCase()}
                          </div>
                        </div>
                        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginTop: 3 }}>
                          {u.job_title || 'No Title'} · Lvl {u.level || 1} · {u.points || 0} EXP
                        </div>
                        {/* Atasan langsung. Ditampilkan karena inilah yang
                            menentukan apakah pekerjaan orang ini punya penilai —
                            dan sampai sekarang tidak ada satu layar pun yang
                            memperlihatkannya, jadi yang kosong tidak pernah
                            ketahuan. Hanya untuk yang bukan HR: konsol HR tidak
                            bergantung pada atasan. */}
                        {u.role !== 'hr' && (
                          <div style={{ ...HP_TEXT.tiny, fontWeight: 700, marginTop: 3, color: u.manager_id && managerNameById[String(u.manager_id)] ? HP_TOKENS.inkFade : HP_TOKENS.coralInk }}>
                            {u.manager_id && managerNameById[String(u.manager_id)]
                              ? `Atasan: ${managerNameById[String(u.manager_id)]}`
                              : 'Belum punya atasan'}
                          </div>
                        )}
                      </div>
                      {/* Kinerja per orang (KPI + task) */}
                      {deptPeopleScores[String(u.id)] && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <MiniDonut value={deptPeopleScores[String(u.id)].kpiScore} size={34} />
                          <div>
                            <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, color: scoreInk(deptPeopleScores[String(u.id)].kpiScore) }}>{deptPeopleScores[String(u.id)].kpiScore}%</div>
                            <div style={{ ...HP_TEXT.tiny, fontSize: 8, color: HP_TOKENS.inkMute }}>{deptPeopleScores[String(u.id)].completionRate}% task</div>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => openModal('employee_profile', { employeeId: u.id, employeeName: u.name })} className="hp-tap" style={{
                           padding: '6px 10px', borderRadius: 8, border: `1px solid ${HP_TOKENS.blue}30`,
                           background: HP_TOKENS.blueSoft, fontSize: 10, fontWeight: 700, color: HP_TOKENS.blue,
                           fontFamily: HP_FONT, cursor: 'pointer',
                        }}>Profil</button>
                        {deptPeopleScores[String(u.id)] && (
                          <button onClick={async () => {
                            const s = deptPeopleScores[String(u.id)];
                            try {
                              await downloadPersonExcel({ requesterId: currentUser?.id || '', scopeLabel: selectedDept, month: new Date().getMonth() + 1, year: new Date().getFullYear(),
                                person: { id: u.id, name: u.name, jobTitle: u.job_title, kpiScore: s.kpiScore, completionRate: s.completionRate, qualityScore: s.qualityScore, tasksCompleted: 0, totalTasks: 0, weekly: [] } });
                            } catch (e) { console.error(e); }
                          }} className="hp-tap" style={{
                            padding: '6px 9px', borderRadius: 8, border: `1px solid ${HP_TOKENS.sage}30`,
                            background: HP_TOKENS.sageWash, fontSize: 10, fontWeight: 700, color: HP_TOKENS.sageInk,
                            fontFamily: HP_FONT, cursor: 'pointer',
                          }}><HPGlyph name="arrowDown" size={12} color="currentColor" /></button>
                        )}
                        <button onClick={() => openModal('edit_user', {
                          user: u, managers: assignableManagers,
                          onSave: (updates: any) => handleUpdateUser(u.id, updates),
                          onDelete: () => handleDeleteUser(u.id)
                        })} className="hp-tap" style={{
                          padding: '6px 10px', borderRadius: 8, border: `1px solid ${HP_TOKENS.line}`,
                          background: HP_TOKENS.card, fontSize: 10, fontWeight: 700, color: HP_TOKENS.inkMute,
                          fontFamily: HP_FONT, cursor: 'pointer',
                        }}>Edit</button>
                      </div>
                    </div>
                  </HPCard>
                ))}
                {deptUsers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>
                    {search ? `Tidak ditemukan "${search}"` : 'Belum ada anggota di departemen ini'}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPagesPeople > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <button 
                    onClick={() => setCurrentPagePeople(p => Math.max(1, p - 1))}
                    disabled={currentPagePeople === 1}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                      background: currentPagePeople === 1 ? HP_TOKENS.lineSoft : '#fff',
                      color: currentPagePeople === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                      fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                      cursor: currentPagePeople === 1 ? 'default' : 'pointer',
                      opacity: currentPagePeople === 1 ? 0.6 : 1, transition: 'all 0.2s'
                    }}
                  >
                    Sebelumnya
                  </button>
                  <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                    {currentPagePeople} / {totalPagesPeople}
                  </span>
                  <button 
                    onClick={() => setCurrentPagePeople(p => Math.min(totalPagesPeople, p + 1))}
                    disabled={currentPagePeople === totalPagesPeople}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                      background: currentPagePeople === totalPagesPeople ? HP_TOKENS.lineSoft : '#fff',
                      color: currentPagePeople === totalPagesPeople ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                      fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                      cursor: currentPagePeople === totalPagesPeople ? 'default' : 'pointer',
                      opacity: currentPagePeople === totalPagesPeople ? 0.6 : 1, transition: 'all 0.2s'
                    }}
                  >
                    Berikutnya
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tugas & KPI pribadi sengaja tidak ada di sini. Akun HR murni memang
          konsol saja, dan pemakai hrAccess membukanya dari tab peran aslinya
          yang tidak lagi tergantikan saat masuk konsol. */}

      {activeTab === 'attendance' && <HRAttendanceView currentUser={currentUser} openModal={openModal} />}
      {activeTab === 'targets' && <DivisionTargetsView openModal={openModal} />}
      {activeTab === 'office' && <OfficeSettingsMap />}

      {activeTab === 'surveys' && (
        <>
          <HPCard style={{ background: HP_TOKENS.lavenderSoft, border: `1.5px solid ${HP_TOKENS.lavender}20`, marginBottom: 16 }} padding={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: HP_TOKENS.radiusSm, background: HP_TOKENS.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HPGlyph name="book" size={22} color={HP_TOKENS.onPrimary} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Survey Internal</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 2 }}>
                  Buat dan kelola survey dengan pertanyaan internal.
                </div>
              </div>
            </div>
          </HPCard>
          <button onClick={() => openModal('manage_surveys')} className="hp-tap" style={{
            width: '100%', padding: '16px', borderRadius: HP_TOKENS.radiusMd, border: 'none',
            background: `${HP_TOKENS.lavender}`,
            color: HP_TOKENS.onPrimary, fontFamily: HP_FONT, fontWeight: 700, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <HPGlyph name="book" size={18} color={HP_TOKENS.onPrimary} />
            Kelola Survey
          </button>
        </>
      )}

      {activeTab === 'schedule' && (
        <>
          <HPCard style={{ background: HP_TOKENS.sageSoft, border: 'none', marginBottom: 16 }} padding={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: HP_TOKENS.radiusSm, background: HP_TOKENS.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HPGlyph name="calendar" size={24} color={HP_TOKENS.onPrimary} />
              </div>
              <div>
                <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Jam Kerja Organisasi</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft }}>Set jam operasional & waktu istirahat</div>
              </div>
            </div>
          </HPCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <HPCard padding={16}>
              <div style={{ ...HP_TEXT.h, fontSize: 14, marginBottom: 16 }}>Jam Operasional</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 6 }}>JAM MULAI</div>
                  <input type="time" value={state?.workSchedule?.start || "08:00"}
                    onChange={(e) => updateState({ workSchedule: { ...state?.workSchedule, start: e.target.value, end: state?.workSchedule?.end ?? '17:00', breakStart: state?.workSchedule?.breakStart ?? '12:00', breakEnd: state?.workSchedule?.breakEnd ?? '13:00', midDayCheckInTime: state?.workSchedule?.midDayCheckInTime ?? '12:00' } })}
                    style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 6 }}>JAM SELESAI</div>
                  <input type="time" value={state?.workSchedule?.end || "17:00"}
                    onChange={(e) => updateState({ workSchedule: { ...state?.workSchedule, start: state?.workSchedule?.start ?? '08:00', end: e.target.value, breakStart: state?.workSchedule?.breakStart ?? '12:00', breakEnd: state?.workSchedule?.breakEnd ?? '13:00', midDayCheckInTime: state?.workSchedule?.midDayCheckInTime ?? '12:00' } })}
                    style={inputStyle} />
                </div>
              </div>
            </HPCard>
            <HPCard padding={16}>
              <div style={{ ...HP_TEXT.h, fontSize: 14, marginBottom: 16 }}>Waktu Istirahat</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 6 }}>MULAI</div>
                  <input type="time" value={state?.workSchedule?.breakStart || "12:00"}
                    onChange={(e) => updateState({ workSchedule: { ...state?.workSchedule, start: state?.workSchedule?.start ?? '08:00', end: state?.workSchedule?.end ?? '17:00', breakStart: e.target.value, breakEnd: state?.workSchedule?.breakEnd ?? '13:00', midDayCheckInTime: state?.workSchedule?.midDayCheckInTime ?? '12:00' } })}
                    style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginBottom: 6 }}>SELESAI</div>
                  <input type="time" value={state?.workSchedule?.breakEnd || "13:00"}
                    onChange={(e) => updateState({ workSchedule: { ...state?.workSchedule, start: state?.workSchedule?.start ?? '08:00', end: state?.workSchedule?.end ?? '17:00', breakStart: state?.workSchedule?.breakStart ?? '12:00', breakEnd: e.target.value, midDayCheckInTime: state?.workSchedule?.midDayCheckInTime ?? '12:00' } })}
                    style={inputStyle} />
                </div>
              </div>
            </HPCard>
          </div>
        </>
      )}

      {activeTab === 'contacts' && (
        <>
          <SectionHeader icon="phone" label="Kontak Organisasi" action="+ Tambah" onAction={() => {
            openModal('contact_editor', {
              onSave: (newContact: any) => { updateState({ contacts: [...(state?.contacts || []), newContact] }); }
            });
          }} />
          
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: HP_TOKENS.paper, borderRadius: HP_TOKENS.radiusMd, padding: '10px 14px', marginBottom: 16,
            border: `1.5px solid ${HP_TOKENS.line}`,
          }}>
            <HPGlyph name="search" size={16} color={HP_TOKENS.blue} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari kontak..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 14, color: HP_TOKENS.ink,
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paginatedContacts.map((contact: any) => (
              <HPCard key={contact.id} padding={14} style={{ border: `1.5px solid ${HP_TOKENS.lineSoft}`, transition: 'all 0.2s', ':hover': { borderColor: HP_TOKENS.blue } } as any}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: HP_TOKENS.radiusMd, background: `${HP_TOKENS.blueSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HPGlyph name="people" size={22} color={HP_TOKENS.blue} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{contact.name}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{contact.role}</div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 8 }}>
                    <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.ink }}>{contact.phone}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue, marginTop: 2 }}>{contact.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button onClick={() => {
                      openModal('contact_editor', {
                        contact,
                        onSave: (updated: any) => { 
                          updateState({ contacts: state?.contacts.map((c:any) => c.id === updated.id ? updated : c) }); 
                        }
                      });
                    }} style={{ background: HP_TOKENS.blueWash, border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer' }}>
                      <HPGlyph name="edit" size={14} color={HP_TOKENS.blue} />
                    </button>
                    <button onClick={() => {
                      if (confirm("Hapus kontak ini?")) {
                        updateState({ contacts: (state?.contacts || []).filter((c: any) => c.id !== contact.id) });
                      }
                    }} style={{ background: HP_TOKENS.coralSoft, border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer' }}>
                      <HPGlyph name="trash" size={14} color={HP_TOKENS.coralInk} />
                    </button>
                  </div>
                </div>
              </HPCard>
            ))}
            {filteredContacts.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Tidak ada kontak yang cocok.</div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPagesContacts > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button 
                onClick={() => setCurrentPageContacts(p => Math.max(1, p - 1))}
                disabled={currentPageContacts === 1}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: currentPageContacts === 1 ? HP_TOKENS.lineSoft : '#fff',
                  color: currentPageContacts === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                  cursor: currentPageContacts === 1 ? 'default' : 'pointer',
                  opacity: currentPageContacts === 1 ? 0.6 : 1, transition: 'all 0.2s'
                }}
              >
                Sebelumnya
              </button>
              <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                {currentPageContacts} / {totalPagesContacts}
              </span>
              <button 
                onClick={() => setCurrentPageContacts(p => Math.min(totalPagesContacts, p + 1))}
                disabled={currentPageContacts === totalPagesContacts}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                  background: currentPageContacts === totalPagesContacts ? HP_TOKENS.lineSoft : '#fff',
                  color: currentPageContacts === totalPagesContacts ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                  cursor: currentPageContacts === totalPagesContacts ? 'default' : 'pointer',
                  opacity: currentPageContacts === totalPagesContacts ? 0.6 : 1, transition: 'all 0.2s'
                }}
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}
