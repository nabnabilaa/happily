"use client";

import React, { useState, useEffect, useMemo } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";
import { useHP } from "@/lib/HPContext";
import HRAttendanceView from "@/components/goals/HRAttendanceView";
import DivisionTargetsView from "@/components/goals/DivisionTargetsView";
import OfficeSettingsMap from "@/components/hr/OfficeSettingsMap";
import GoalCard from "@/components/goals/GoalCard";
import ManagerPersonalView from "@/components/goals/ManagerPersonalView";

interface Props { openModal: (name: string, props?: any) => void; }

const DEPT_EMOJIS: Record<string, string> = {
  'Product': '🚀', 'Engineering': '⚙️', 'Marketing': '📣', 'HR': '👥',
  'Finance': '💰', 'Operations': '📦', 'Design': '🎨', 'Sales': '📈',
};
const DEPT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'];
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function HRPeopleScreen({ openModal }: Props) {
  const { state, user: currentUser, updateState, refreshSurveys } = useHP();
  const isHR = currentUser?.role === 'hr';
  const [activeTab, setActiveTab] = useState<'users' | 'attendance' | 'targets' | 'office' | 'schedule' | 'contacts' | 'surveys' | 'personal' | 'hr_reports'>(isHR ? 'users' : 'attendance');
  const [apiKpis, setApiKpis] = useState<any[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);

  // Laporan & Ekspor states
  const [reportType, setReportType] = useState<'logbook' | 'kpi' | 'weekly' | 'monthly'>('logbook');
  const [reportDept, setReportDept] = useState('all');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchReportData = async () => {
    if (!currentUser?.id) return;
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/hr/reports/export?adminId=${currentUser.id}&type=${reportType}&department=${reportDept}&month=${reportMonth}&year=${reportYear}`);
      const data = await res.json();
      setReportData(data.data || []);
    } catch (e) {
      console.error("Failed to fetch report data:", e);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'hr_reports' && isHR) {
      fetchReportData();
    }
  }, [activeTab, reportType, reportDept, reportMonth, reportYear]);

  const handleExportReportCSV = () => {
    if (reportData.length === 0) return;
    
    // Include BOM for proper Excel UTF-8 display
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";

    let headers: string[] = [];
    if (reportType === 'logbook') {
      headers = ["Nama", "Departemen", "Tanggal", "Judul Task", "Deskripsi", "Status", "Bukti Link", "Bukti Notes", "KPI Terkait", "Target Mingguan"];
    } else if (reportType === 'kpi') {
      headers = ["Nama", "Departemen", "KPI Title", "Target Deskripsi", "Bobot (%)", "Skor Akhir", "Status", "Catatan Manager"];
    } else if (reportType === 'weekly') {
      headers = ["Nama", "Departemen", "KPI Title", "Minggu Ke", "Target Mingguan", "Nilai Target", "Unit"];
    } else if (reportType === 'monthly') {
      headers = ["Nama", "Departemen", "Jabatan", "Total Task", "Task Selesai", "Hari Aktif", "Hari Kerja", "Skor KPI", "Skor Kualitas", "Catatan Manager", "Status Laporan"];
    }

    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

    for (const r of reportData) {
      let row: string[] = [];
      if (reportType === 'logbook') {
        row = [
          r.user_name || "",
          r.department || "",
          r.target_date ? r.target_date.slice(0, 10) : (r.created_at ? r.created_at.slice(0, 10) : ""),
          r.title || "",
          r.description || "",
          r.is_done ? (r.is_verified ? "Verified" : "Selesai") : "Belum Selesai",
          r.proof_link || "",
          r.proof_notes || "",
          r.goal_title || "",
          r.weekly_target_title || ""
        ];
      } else if (reportType === 'kpi') {
        row = [
          r.user_name || "",
          r.department || "",
          r.title || "",
          r.target_description || "",
          String(r.weight || 0),
          r.final_score !== null ? String(r.final_score) : "-",
          r.status || "",
          r.manager_notes || ""
        ];
      } else if (reportType === 'weekly') {
        row = [
          r.user_name || "",
          r.department || "",
          r.kpi_title || "",
          `Minggu ${r.week_number}`,
          r.title || "",
          String(r.target_value || 0),
          r.metric_unit || ""
        ];
      } else if (reportType === 'monthly') {
        row = [
          r.user_name || "",
          r.department || "",
          r.job_title || "",
          String(r.total_tasks || 0),
          String(r.tasks_completed || 0),
          String(r.active_days || 0),
          String(r.total_working_days || 0),
          String(r.kpi_score || 0),
          String(r.quality_score || 0),
          r.manager_summary || "",
          r.status || ""
        ];
      }

      csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `laporan_${reportType}_${reportDept}_${reportMonth}_${reportYear}.csv`.toLowerCase().replace(/\s+/g, '_');
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    async function fetchKPIs() {
      if (!currentUser?.id) return;
      try {
        setLoadingKpis(true);
        const m = new Date().getMonth() + 1;
        const y = new Date().getFullYear();

        const managerRes = await fetch(`/api/kpi?userId=${currentUser.id}&role=employee&month=${m}&year=${y}`);
        const managerData = await managerRes.json();
        const managerKpis = (managerData.kpis || []).map((k: any) => ({
          id: String(k.id),
          title: k.title,
          progress: k.finalScore !== null && k.finalScore !== undefined ? Number(k.finalScore) : 0,
          alignment: k.weight || 0,
          due: `${m}/${y}`,
          tone: 'lavender',
          metric: k.targetDescription || 'KPI Bulanan (Manager)',
          scope: 'assigned',
          owner: k.assigneeName || currentUser.name || 'You',
          ownerId: String(k.assignedTo),
          status: k.status === 'active' ? 'approved' : k.status,
          is_kpi: true,
          isApiKpi: true,
          subGoals: []
        }));

        const personalRes = await fetch(`/api/kpi/personal?userId=${currentUser.id}&month=${m}&year=${y}`);
        const personalData = await personalRes.json();
        const personalKpis = (personalData.kpis || []).map((k: any) => ({
          id: String(k.id),
          title: k.title,
          progress: k.progress || 0,
          alignment: 0,
          due: `${m}/${y}`,
          tone: 'sage',
          metric: k.targetDescription || `${k.currentValue || 0}/${k.targetValue || 0} ${k.metricUnit || ''}`,
          scope: 'personal',
          owner: currentUser.name || 'You',
          ownerId: String(currentUser.id),
          status: k.status || 'active',
          is_kpi: true,
          isApiKpi: true,
          subGoals: []
        }));

        setApiKpis([...managerKpis, ...personalKpis]);
      } catch (e) {
        console.error("Failed to load KPIs in HRPeopleScreen:", e);
      } finally {
        setLoadingKpis(false);
      }
    }
    fetchKPIs();
  }, [currentUser?.id]);

  const personalTasks = state?.priorities || [];
  const myAssignedGoals = state?.goals?.filter((g: any) => g.scope === 'assigned' && String(g.ownerId) === String(currentUser?.id)) || [];
  const myPersonalGoals = state?.goals?.filter((g: any) => g.scope === 'personal' && String(g.ownerId) === String(currentUser?.id)) || [];

  const combinedMyGoals = useMemo(() => {
    const combined = [...myAssignedGoals, ...myPersonalGoals];
    apiKpis.forEach((k: any) => {
      if (!combined.some((g: any) => String(g.id) === String(k.id) || g.title.toLowerCase() === k.title.toLowerCase())) {
        combined.push(k);
      }
    });
    return combined;
  }, [apiKpis, myAssignedGoals, myPersonalGoals]);

  const [currentPageKPI, setCurrentPageKPI] = useState(1);
  const kpisPerPage = 5;
  const totalPagesKPI = Math.ceil(combinedMyGoals.length / kpisPerPage);
  const paginatedKPIs = useMemo(() => {
    const start = (currentPageKPI - 1) * kpisPerPage;
    return combinedMyGoals.slice(start, start + kpisPerPage);
  }, [combinedMyGoals, currentPageKPI]);

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
    width: '100%', marginTop: 8, padding: 12, borderRadius: 12,
    border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14,
    outline: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink, boxSizing: 'border-box',
  };

  const handleDeleteTask = (taskId: string | number) => {
    if (confirm("Apakah Anda yakin ingin menghapus task ini?")) {
      updateState((s: any) => {
        const newPriorities = s.priorities.filter((p: any) => p.id !== taskId);
        
        const taskToDelete = s.priorities.find((p: any) => p.id === taskId);
        const targetId = taskToDelete?.goal_id || taskToDelete?.kpi_id;
        
        const updatedGoals = s.goals.map((goal: any) => {
          if (targetId && String(goal.id) === String(targetId)) {
            const todayTasks = newPriorities.filter((p: any) => 
              (p.goal_id && String(p.goal_id) === String(goal.id)) || 
              (p.kpi_id && String(p.kpi_id) === String(goal.id))
            );
            const total = todayTasks.length;
            const completed = todayTasks.filter((p: any) => p.done).length;
            const newProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
            return { 
              ...goal, 
              progress: newProgress, 
              metric: total > 0 ? `${completed}/${total} task selesai` : `0/0 task selesai`
            };
          }
          return goal;
        });

        const extraState: any = {};
        if (s.focusTaskId === taskId) {
          extraState.focusTaskId = null;
          extraState.focusProgress = 0;
          extraState.intention = "";
        }

        return {
          ...s,
          priorities: newPriorities,
          goals: updatedGoals,
          ...extraState
        };
      });
    }
  };

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader
        title={isHR ? "Management Console" : "People"}
        subtitle={isHR ? "Kelola karyawan, role & pelaporan" : "Kelola karyawan & organisasi"}
      />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          isHR && { key: 'users', label: 'People' },
          isHR && { key: 'hr_reports', label: 'Laporan & Ekspor' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'targets', label: 'Targets' },
          { key: 'office', label: 'Office' },
          { key: 'schedule', label: 'Work Hours' },
          { key: 'contacts', label: 'Contacts' },
          { key: 'surveys', label: 'Surveys' },
        ].filter(Boolean).map((t: any) => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedDept(null); }} className="hp-tap" style={{
            flex: '0 0 auto', padding: '10px 16px', borderRadius: 14,
            background: activeTab === t.key ? HP_TOKENS.lavender : HP_TOKENS.lineSoft,
            color: activeTab === t.key ? '#fff' : HP_TOKENS.inkSoft,
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Users / People (Department Cards → People List) ── */}
      {activeTab === 'users' && isHR && (
        <>
          {/* Review KPI quick-access bar for HR */}
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => openModal('kpi_review')}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: '#FFF3CC', color: '#8A6814',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              📋 Review & Flag Laporan KPI Karyawan
            </button>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => openModal('create_user', { onSave: handleCreateUser })} className="hp-tap" style={{
              flex: 1, padding: '12px', borderRadius: 14, border: 'none',
              background: HP_TOKENS.ink, color: '#F4F7F9',
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <HPGlyph name="plus" size={14} color="#F4F7F9" />
              Tambah Akun
            </button>
            <button onClick={() => openModal('manage_depts')} className="hp-tap" style={{
              padding: '12px 16px', borderRadius: 14,
              border: `1.5px solid ${HP_TOKENS.line}`, background: HP_TOKENS.card,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, color: HP_TOKENS.ink,
            }}>
              🏢 Departemen
            </button>
          </div>

          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Loading...</div>
          ) : !selectedDept ? (
            /* ── Department Cards View ── */
            <>
              {/* ── Pengajuan Divisi (Pending HR Approval) ── */}
              {(loadingDeptRequests || deptRequests.length > 0) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>📋</span>
                    <span style={{ ...HP_TEXT.h, fontSize: 14 }}>Pengajuan Divisi</span>
                    {deptRequests.length > 0 && (
                      <span style={{
                        background: HP_TOKENS.lavender, color: '#fff',
                        borderRadius: 20, padding: '2px 8px',
                        fontFamily: HP_FONT, fontWeight: 800, fontSize: 11,
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
                                <span style={{ fontSize: 12 }}>📁</span>
                                <span style={{
                                  fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.blue,
                                }}>{req.department || '—'}</span>
                                <span style={{
                                  background: '#FEF3C7', color: '#D97706',
                                  borderRadius: 20, padding: '2px 8px',
                                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 10,
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
                                      flex: 1, padding: '8px 12px', borderRadius: 10,
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
                                      padding: '8px 12px', borderRadius: 10, border: 'none',
                                      background: HP_TOKENS.blue, color: '#fff',
                                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                                    }}
                                  >Simpan</button>
                                  <button
                                    onClick={() => { setChangeDeptId(null); setChangeDeptVal(''); }}
                                    className="hp-tap"
                                    style={{
                                      padding: '8px 12px', borderRadius: 10, border: 'none',
                                      background: HP_TOKENS.lineSoft, color: HP_TOKENS.inkSoft,
                                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
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
                                    padding: '6px 12px', borderRadius: 10, border: 'none',
                                    background: '#D1FAE5', color: '#065F46',
                                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                                  }}
                                >✓ Setuju</button>
                                <button
                                  onClick={() => { setChangeDeptId(String(req.id)); setChangeDeptVal(req.department || ''); }}
                                  className="hp-tap"
                                  style={{
                                    padding: '6px 12px', borderRadius: 10, border: 'none',
                                    background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue,
                                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                                  }}
                                >✎ Ubah</button>
                                <button
                                  onClick={() => handleDeptRequestAction(String(req.id), 'reject')}
                                  className="hp-tap"
                                  style={{
                                    padding: '6px 12px', borderRadius: 10, border: 'none',
                                    background: '#FEE2E2', color: '#B91C1C',
                                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
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
                  { label: 'Total', value: dbUsers.length, color: HP_TOKENS.lavender, bg: HP_TOKENS.lavenderSoft },
                  { label: 'Departemen', value: Object.keys(usersByDept).length, color: HP_TOKENS.blue, bg: HP_TOKENS.blueSoft },
                  { label: 'Manager', value: managers.length, color: HP_TOKENS.sage, bg: HP_TOKENS.sageSoft },
                ].map(s => (
                  <div key={s.label} style={{
                    flex: 1, padding: '14px 10px', borderRadius: 16, textAlign: 'center',
                    background: s.bg, border: `1px solid ${s.color}20`,
                  }}>
                    <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 24, color: s.color }}>{s.value}</div>
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
                        padding: '18px 16px', borderRadius: 20,
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
                        width: 42, height: 42, borderRadius: 14,
                        background: `${color}15`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 20,
                      }}>{emoji}</div>
                      <div>
                        <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{dept}</div>
                        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                          {users.length} anggota
                        </div>
                      </div>
                      {/* Mini avatar stack */}
                      <div style={{ display: 'flex', marginTop: 4 }}>
                        {users.slice(0, 4).map((u, j) => (
                          <div key={u.id} style={{ marginLeft: j > 0 ? -8 : 0, zIndex: 4 - j }}>
                            <HPAvatar name={u.name} size={24} image={u.avatar_image} />
                          </div>
                        ))}
                        {users.length > 4 && (
                          <div style={{
                            width: 24, height: 24, borderRadius: 12, marginLeft: -8,
                            background: HP_TOKENS.lineSoft, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 900, color: HP_TOKENS.inkMute, fontFamily: HP_FONT,
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
                padding: '10px 16px', borderRadius: 14,
                background: HP_TOKENS.lineSoft, border: 'none', cursor: 'pointer',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.ink,
              }}>
                <HPGlyph name="chevronLeft" size={14} color={HP_TOKENS.ink} />
                {DEPT_EMOJIS[selectedDept] || '📁'} {selectedDept}
                <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginLeft: 4 }}>
                  ({usersByDept[selectedDept]?.length || 0} orang)
                </span>
              </button>

              {/* Search */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: HP_TOKENS.paper, borderRadius: 14, padding: '10px 14px', marginBottom: 12,
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
                            padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 900,
                            background: u.role === 'hr' ? '#EDE8F5' : u.role === 'manager' ? HP_TOKENS.blueSoft : HP_TOKENS.yellowSoft,
                            color: u.role === 'hr' ? '#7B6BB5' : u.role === 'manager' ? HP_TOKENS.blue : HP_TOKENS.yellow,
                            fontFamily: HP_FONT,
                          }}>
                            {u.role.toUpperCase()}
                          </div>
                        </div>
                        <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700, marginTop: 3 }}>
                          {u.job_title || 'No Title'} · Lvl {u.level || 1} · {u.points || 0} EXP
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => openModal('employee_profile', { employeeId: u.id, employeeName: u.name })} className="hp-tap" style={{
                           padding: '6px 10px', borderRadius: 8, border: `1px solid ${HP_TOKENS.blue}30`,
                           background: HP_TOKENS.blueSoft, fontSize: 10, fontWeight: 800, color: HP_TOKENS.blue,
                           fontFamily: HP_FONT, cursor: 'pointer',
                        }}>Profil</button>
                        <button onClick={() => openModal('edit_user', {
                          user: u, managers,
                          onSave: (updates: any) => handleUpdateUser(u.id, updates),
                          onDelete: () => handleDeleteUser(u.id)
                        })} className="hp-tap" style={{
                          padding: '6px 10px', borderRadius: 8, border: `1px solid ${HP_TOKENS.line}`,
                          background: HP_TOKENS.card, fontSize: 10, fontWeight: 800, color: HP_TOKENS.inkMute,
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

      {/* ── Personal Tasks & KPIs ── */}
      {activeTab === 'personal' && (
        <ManagerPersonalView 
          personalTasks={personalTasks}
          combinedMyGoals={combinedMyGoals}
          loadingKpis={loadingKpis}
          updateState={updateState}
          openModal={openModal}
          setTaskToDelete={handleDeleteTask}
        />
      )}

      {activeTab === 'attendance' && <HRAttendanceView currentUser={currentUser} openModal={openModal} />}
      {activeTab === 'targets' && <DivisionTargetsView openModal={openModal} />}
      {activeTab === 'office' && <OfficeSettingsMap />}

      {activeTab === 'surveys' && (
        <>
          <HPCard style={{ background: HP_TOKENS.lavenderSoft, border: `1.5px solid ${HP_TOKENS.lavender}20`, marginBottom: 16 }} padding={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: HP_TOKENS.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HPGlyph name="book" size={22} color="#F4F7F9" />
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
            width: '100%', padding: '16px', borderRadius: 16, border: 'none',
            background: `linear-gradient(135deg, ${HP_TOKENS.lavender}, #5A4E8C)`,
            color: '#F4F7F9', fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 6px 20px rgba(123,107,181,0.3)',
          }}>
            <HPGlyph name="book" size={18} color="#F4F7F9" />
            Kelola Survey
          </button>
        </>
      )}

      {activeTab === 'schedule' && (
        <>
          <HPCard style={{ background: HP_TOKENS.sageSoft, border: 'none', marginBottom: 16 }} padding={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: HP_TOKENS.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HPGlyph name="calendar" size={24} color="#F4F7F9" />
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
            background: HP_TOKENS.paper, borderRadius: 14, padding: '10px 14px', marginBottom: 16,
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
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${HP_TOKENS.blueSoft}, ${HP_TOKENS.lavenderSoft})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HPGlyph name="people" size={22} color={HP_TOKENS.blue} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{contact.name}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{contact.role}</div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 8 }}>
                    <div style={{ ...HP_TEXT.small, fontWeight: 800, color: HP_TOKENS.ink }}>{contact.phone}</div>
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
                      <HPGlyph name="trash" size={14} color={HP_TOKENS.coral} />
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

      {/* ── Laporan & Ekspor Tab ── */}
      {activeTab === 'hr_reports' && isHR && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header Info */}
          <HPCard style={{ background: HP_TOKENS.blueWash, border: `1.5px solid ${HP_TOKENS.blue}20` }} padding={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: HP_TOKENS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HPGlyph name="book" size={20} color="#F4F7F9" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Laporan & Ekspor Divisi</div>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 2 }}>
                  Unduh kegiatan harian (logbook), KPI, target mingguan, & bulanan per divisi.
                </div>
              </div>
            </div>
          </HPCard>

          {/* Parameters Form / Card */}
          <HPCard padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 4 }}>PILIH DIVISI</div>
                <select 
                  value={reportDept} 
                  onChange={e => setReportDept(e.target.value)} 
                  style={{ ...inputStyle, marginTop: 0, height: 44 }}
                >
                  <option value="all">Semua Divisi</option>
                  {departments.map(d => (
                    <option key={d.id || d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 4 }}>TIPE LAPORAN</div>
                <select 
                  value={reportType} 
                  onChange={e => setReportType(e.target.value as any)} 
                  style={{ ...inputStyle, marginTop: 0, height: 44 }}
                >
                  <option value="logbook">📝 Logbook / Kegiatan Harian</option>
                  <option value="kpi">🎯 Sasaran & KPI Bulanan</option>
                  <option value="weekly">📅 Target & Laporan Mingguan</option>
                  <option value="monthly">📊 Rekap Performa Bulanan</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 4 }}>BULAN</div>
                <select 
                  value={reportMonth} 
                  onChange={e => setReportMonth(Number(e.target.value))} 
                  style={{ ...inputStyle, marginTop: 0, height: 44 }}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 4 }}>TAHUN</div>
                <select 
                  value={reportYear} 
                  onChange={e => setReportYear(Number(e.target.value))} 
                  style={{ ...inputStyle, marginTop: 0, height: 44 }}
                >
                  {[2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              onClick={handleExportReportCSV} 
              disabled={reportData.length === 0}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: reportData.length > 0 ? HP_TOKENS.sage : HP_TOKENS.lineSoft,
                color: reportData.length > 0 ? '#fff' : HP_TOKENS.inkMute,
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: reportData.length > 0 ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 8
              }}
            >
              <span>📥</span> Unduh Laporan (CSV)
            </button>
          </HPCard>

          {/* Table Preview */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 900 }}>PRATINJAU DATA ({reportData.length} baris)</div>
              <button 
                onClick={fetchReportData} 
                style={{ background: 'none', border: 'none', color: HP_TOKENS.blue, fontWeight: 800, fontSize: 10, cursor: 'pointer' }}
              >
                Refresh
              </button>
            </div>

            {loadingReport ? (
              <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Memuat pratinjau...</div>
            ) : reportData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', background: HP_TOKENS.card, borderRadius: 16, border: `1.5px dashed ${HP_TOKENS.line}` }}>
                <span style={{ fontSize: 24 }}>📭</span>
                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4 }}>Tidak ada data laporan untuk pilihan ini.</div>
              </div>
            ) : (
              <div style={{ 
                overflowX: 'auto', background: HP_TOKENS.card, borderRadius: 16, 
                border: `1.5px solid ${HP_TOKENS.line}`, padding: 4 
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left', fontFamily: HP_FONT }}>
                  <thead>
                    <tr style={{ borderBottom: `1.5px solid ${HP_TOKENS.line}`, color: HP_TOKENS.inkMute }}>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Nama</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Divisi</th>
                      {reportType === 'logbook' && (
                        <>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>Tanggal</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>Task</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>Status</th>
                        </>
                      )}
                      {reportType === 'kpi' && (
                        <>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>KPI</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>Bobot</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>Skor</th>
                        </>
                      )}
                      {reportType === 'weekly' && (
                        <>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>KPI</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>Minggu</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>Target</th>
                        </>
                      )}
                      {reportType === 'monthly' && (
                        <>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>Selesai/Total Task</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>Skor KPI</th>
                          <th style={{ padding: '10px 12px', fontWeight: 800 }}>Kualitas</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.slice(0, 10).map((r, i) => (
                      <tr key={i} style={{ borderBottom: i === reportData.slice(0, 10).length - 1 ? 'none' : `1px solid ${HP_TOKENS.lineSoft}`, color: HP_TOKENS.ink }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{r.user_name}</td>
                        <td style={{ padding: '10px 12px' }}>{r.department}</td>
                        {reportType === 'logbook' && (
                          <>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{r.target_date ? r.target_date.slice(0, 10) : (r.created_at ? r.created_at.slice(0, 10) : "")}</td>
                            <td style={{ padding: '10px 12px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: r.is_done ? HP_TOKENS.sage : HP_TOKENS.coral }}>
                              {r.is_done ? (r.is_verified ? 'Verified' : 'Done') : 'Todo'}
                            </td>
                          </>
                        )}
                        {reportType === 'kpi' && (
                          <>
                            <td style={{ padding: '10px 12px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{r.weight}%</td>
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: r.final_score !== null ? HP_TOKENS.blue : HP_TOKENS.inkMute }}>
                              {r.final_score !== null ? `${r.final_score}/100` : '-'}
                            </td>
                          </>
                        )}
                        {reportType === 'weekly' && (
                          <>
                            <td style={{ padding: '10px 12px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.kpi_title}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>M{r.week_number}</td>
                            <td style={{ padding: '10px 12px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title} ({r.target_value} {r.metric_unit})</td>
                          </>
                        )}
                        {reportType === 'monthly' && (
                          <>
                            <td style={{ padding: '10px 12px' }}>{r.tasks_completed}/{r.total_tasks}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: HP_TOKENS.blue }}>{r.kpi_score}%</td>
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: r.quality_score >= 80 ? HP_TOKENS.sage : r.quality_score >= 50 ? HP_TOKENS.yellow : HP_TOKENS.coral }}>
                              {r.quality_score}%
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.length > 10 && (
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, textAlign: 'center', padding: '8px 0', borderTop: `1px solid ${HP_TOKENS.line}` }}>
                    Menampilkan 10 dari {reportData.length} baris. Unduh CSV untuk data lengkap.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
