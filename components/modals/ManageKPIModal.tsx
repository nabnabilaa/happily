"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import Modal from "@/components/ui/Modal";

interface ManageKPIModalProps {
  onClose: () => void;
  initialShowForm?: boolean;
}

interface KPI {
  id: string;
  title: string;
  targetDescription: string;
  weight: number;
  assignedTo: string;
  assigneeName: string | null;
  status: string;
  finalScore: number | null;
  scope?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role?: string;
  job_title?: string;
}

const now = new Date();
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function ManageKPIModal({ onClose, initialShowForm = false }: ManageKPIModalProps) {
  const { user, updateState } = useHP();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [currentPage, setCurrentPage] = useState(1);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [scope, setScope] = useState<'assigned' | 'team'>('assigned');

  // Form
  const [showForm, setShowForm] = useState(initialShowForm);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [weight, setWeight] = useState(25);
  const [assignTo, setAssignTo] = useState('');
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Weekly Targets States
  const [expandedKpiId, setExpandedKpiId] = useState<string | null>(null);
  const [weeklyTargetsMap, setWeeklyTargetsMap] = useState<Record<string, any[]>>({});
  const [loadingTargetsKpiId, setLoadingTargetsKpiId] = useState<string | null>(null);
  
  // Weekly Target Form
  const [newWtTitle, setNewWtTitle] = useState('');
  const [newWtWeek, setNewWtWeek] = useState(1);
  const [newWtTargetVal, setNewWtTargetVal] = useState(100);
  const [newWtUnit, setNewWtUnit] = useState('%');
  const [wtSaving, setWtSaving] = useState(false);
  const [wtError, setWtError] = useState<string | null>(null);

  const fetchWeeklyTargets = async (kpiId: string) => {
    setLoadingTargetsKpiId(kpiId);
    try {
      const res = await fetch(`/api/kpi/weekly-targets?kpiId=${kpiId}`);
      const data = await res.json();
      setWeeklyTargetsMap(prev => ({ ...prev, [kpiId]: data.weeklyTargets || [] }));
    } catch (e) { console.error(e); }
    setLoadingTargetsKpiId(null);
  };

  useEffect(() => {
    if (expandedKpiId) {
      fetchWeeklyTargets(expandedKpiId);
    }
  }, [expandedKpiId]);

  const handleCreateWeeklyTarget = async (kpiId: string) => {
    if (!newWtTitle) return;
    setWtSaving(true);
    setWtError(null);
    try {
      const res = await fetch('/api/kpi/weekly-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiId,
          title: newWtTitle,
          weekNumber: newWtWeek,
          targetValue: newWtTargetVal,
          metricUnit: newWtUnit
        })
      });
      if (!res.ok) {
        const data = await res.json();
        setWtError(data.error || 'Gagal menyimpan');
      } else {
        setNewWtTitle('');
        setNewWtWeek(prev => Math.min(5, prev + 1));
        fetchWeeklyTargets(kpiId);
      }
    } catch (e) { setWtError('Gagal menyimpan'); }
    setWtSaving(false);
  };

  const handleDeleteWeeklyTarget = async (kpiId: string, wtId: string) => {
    try {
      const res = await fetch(`/api/kpi/weekly-targets?id=${wtId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchWeeklyTargets(kpiId);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchKPIs();
    fetchMembers();
    setCurrentPage(1);
  }, [month, year]);

  const fetchKPIs = async () => {
    try {
      const res = await fetch(`/api/kpi?userId=${user?.id}&role=${user?.role}&month=${month}&year=${year}`);
      const data = await res.json();
      setKpis(data.kpis || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        const currentUserRow = data.users.find((u: any) => String(u.id) === String(user?.id));
        if (currentUserRow) {
          setTeamId(currentUserRow.team_id);
        }
        setMembers(data.users.filter((u: any) => String(u.id) !== String(user?.id)));
      }
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!title || !assignTo) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, targetDescription: target, weight, month, year,
          assignedTo: assignTo, assignedBy: user?.id, scope
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }

      setTitle(''); setTarget(''); setWeight(25); setAssignTo(''); setScope('assigned');
      setShowForm(false);
      fetchKPIs();
      updateState((s: any) => ({ ...s, goals: [...(s.goals || [])] })); // trigger refetch
    } catch (e) { setError('Gagal menyimpan'); }
    setSaving(false);
  };

  const handleDelete = async (kpiId: string) => {
    await fetch(`/api/kpi?id=${kpiId}`, { method: 'DELETE' });
    fetchKPIs();
    updateState((s: any) => ({ ...s, goals: [...(s.goals || [])] })); // trigger refetch
  };

  // Group KPIs by assignee
  const groupedKPIs = kpis.reduce((acc: Record<string, { id: string; name: string; items: KPI[]; totalWeight: number }>, k) => {
    const key = k.assignedTo || 'unassigned';
    if (!acc[key]) {
      acc[key] = {
        id: key,
        name: k.scope === 'team' ? 'Seluruh Tim' : (k.assigneeName || 'Unassigned'),
        items: [],
        totalWeight: 0
      };
    }
    acc[key].items.push(k);
    acc[key].totalWeight += k.weight;
    return acc;
  }, {});

  const weightEntries = Object.values(groupedKPIs);
  const hasExceeded = weightEntries.some(e => e.totalWeight > 100);
  const all100 = weightEntries.length > 0 && weightEntries.every(e => e.totalWeight === 100);

  const itemsPerPage = 2;
  const totalPages = Math.ceil(weightEntries.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedEntries = weightEntries.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  let statusText = 'Bobot KPI Anggota Tim';
  let statusColor = HP_TOKENS.blue;
  let statusBg = HP_TOKENS.blueWash;

  if (hasExceeded) {
    const exceededNames = weightEntries.filter(e => e.totalWeight > 100).map(e => e.name.split(' ')[0]).join(', ');
    statusText = `⚠️ Bobot ${exceededNames} melebihi 100%!`;
    statusColor = HP_TOKENS.coral;
    statusBg = '#FFF5F5';
  } else if (all100) {
    statusText = 'Bobot semua anggota pas 100% ✅';
    statusColor = HP_TOKENS.sage;
    statusBg = HP_TOKENS.sageWash;
  } else if (weightEntries.length > 0) {
    const incompleteNames = weightEntries.filter(e => e.totalWeight < 100).map(e => e.name.split(' ')[0]).join(', ');
    statusText = `ℹ️ Bobot ${incompleteNames} kurang dari 100%`;
    statusColor = HP_TOKENS.blue;
    statusBg = HP_TOKENS.blueWash;
  }

  const selectStyle: React.CSSProperties = {
    padding: 12, borderRadius: 12, border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 13, background: HP_TOKENS.card, outline: 'none', width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <Modal onClose={onClose} title="📊 KPI Bulanan">
      <div style={{ marginTop: 4 }}>
        {/* Month/Year Selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 2, position: 'relative' }}>
            <div 
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              style={{ ...selectStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
            >
              <span>{MONTHS[month - 1]}</span>
              <HPGlyph name="chevron-down" size={16} color={HP_TOKENS.inkMute} />
            </div>
            {showMonthDropdown && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} onClick={() => setShowMonthDropdown(false)} />
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(26,29,35,0.12)', border: `1px solid ${HP_TOKENS.line}`, zIndex: 101, maxHeight: 250, overflowY: 'auto', padding: 8 }}>
                  {MONTHS.map((m, i) => (
                    <div 
                      key={i} className="hp-tap"
                      onClick={() => { setMonth(i + 1); setShowMonthDropdown(false); }}
                      style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: month === (i + 1) ? HP_TOKENS.blueWash : 'transparent',
                        ...HP_TEXT.body, color: month === (i + 1) ? HP_TOKENS.blue : HP_TOKENS.ink, fontSize: 13, fontWeight: month === (i + 1) ? 700 : 500,
                        marginBottom: 4
                      }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div 
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              style={{ ...selectStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
            >
              <span>{year}</span>
              <HPGlyph name="chevron-down" size={16} color={HP_TOKENS.inkMute} />
            </div>
            {showYearDropdown && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} onClick={() => setShowYearDropdown(false)} />
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(26,29,35,0.12)', border: `1px solid ${HP_TOKENS.line}`, zIndex: 101, maxHeight: 250, overflowY: 'auto', padding: 8 }}>
                  {[2025, 2026, 2027].map(y => (
                    <div 
                      key={y} className="hp-tap"
                      onClick={() => { setYear(y); setShowYearDropdown(false); }}
                      style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: year === y ? HP_TOKENS.blueWash : 'transparent',
                        ...HP_TEXT.body, color: year === y ? HP_TOKENS.blue : HP_TOKENS.ink, fontSize: 13, fontWeight: year === y ? 700 : 500,
                        marginBottom: 4
                      }}
                    >
                      {y}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 1. Add Form (Always visible at top) */}
        <div style={{ 
          padding: 16, borderRadius: 20, background: HP_TOKENS.sageWash,
          display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20,
          border: `1px solid ${HP_TOKENS.sage}20`
        }}>
          <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.sage, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
            <span>🎯</span> Buat KPI Baru
          </div>

          {error && (
            <div style={{ padding: 10, borderRadius: 10, background: '#FFF5F5', color: '#E03131', fontSize: 12, fontWeight: 700 }}>
              {error}
            </div>
          )}

          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Judul KPI (mis: Redesign checkout flow)"
            style={selectStyle}
          />
          <textarea
            value={target} onChange={e => setTarget(e.target.value)}
            placeholder="Target terukur (mis: Deliverable hi-fi di Figma)"
            rows={2}
            style={{ ...selectStyle, resize: 'none' }}
          />

          <div style={{ ...HP_TEXT.small, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute }}>Tipe KPI</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              type="button"
              onClick={() => { setScope('assigned'); setAssignTo(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: 12, fontSize: 12, fontWeight: 800,
                background: scope === 'assigned' ? HP_TOKENS.blue : '#fff',
                color: scope === 'assigned' ? '#fff' : HP_TOKENS.ink,
                border: `1.5px solid ${scope === 'assigned' ? HP_TOKENS.blue : HP_TOKENS.line}`,
                cursor: 'pointer', fontFamily: HP_FONT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <span>👤</span> Individu
            </button>
            <button 
              type="button"
              onClick={() => { setScope('team'); setAssignTo(teamId || 'team_1'); }}
              style={{
                flex: 1, padding: '10px', borderRadius: 12, fontSize: 12, fontWeight: 800,
                background: scope === 'team' ? HP_TOKENS.blue : '#fff',
                color: scope === 'team' ? '#fff' : HP_TOKENS.ink,
                border: `1.5px solid ${scope === 'team' ? HP_TOKENS.blue : HP_TOKENS.line}`,
                cursor: 'pointer', fontFamily: HP_FONT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <span>👥</span> Seluruh Tim
            </button>
          </div>

          <div style={{ ...HP_TEXT.small, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute }}>Bobot (%)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[10, 20, 25, 30, 40, 50].map(w => (
              <button key={w} onClick={() => setWeight(w)} style={{
                flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 800,
                background: weight === w ? HP_TOKENS.sage : '#fff',
                color: weight === w ? '#fff' : HP_TOKENS.ink,
                border: `1px solid ${weight === w ? HP_TOKENS.sage : HP_TOKENS.line}`,
                cursor: 'pointer', fontFamily: HP_FONT,
              }}>
                {w}%
              </button>
            ))}
          </div>

          {scope === 'assigned' ? (
            <>
              <div style={{ ...HP_TEXT.small, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute }}>Assign ke</div>
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                  style={{ ...selectStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                >
                  <span>
                    {assignTo === "" ? "Pilih anggota tim..." : members.find(m => m.id === assignTo)?.name || "Pilih anggota tim..."}
                  </span>
                  <HPGlyph name="chevron-down" size={16} color={HP_TOKENS.inkMute} />
                </div>
                {showAssignDropdown && (
                  <>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} onClick={() => setShowAssignDropdown(false)} />
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(26,29,35,0.12)', border: `1px solid ${HP_TOKENS.line}`, zIndex: 101, maxHeight: 200, overflowY: 'auto', padding: 8 }}>
                      <div 
                        className="hp-tap"
                        onClick={() => { setAssignTo(""); setShowAssignDropdown(false); }}
                        style={{
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          background: assignTo === "" ? HP_TOKENS.blueWash : 'transparent',
                          ...HP_TEXT.body, color: assignTo === '' ? HP_TOKENS.blue : HP_TOKENS.ink, fontSize: 13, fontWeight: assignTo === "" ? 700 : 500,
                          marginBottom: 4
                        }}
                      >
                        Pilih anggota tim...
                      </div>
                      {members.map(m => (
                        <div 
                          key={m.id} className="hp-tap"
                          onClick={() => { setAssignTo(m.id); setShowAssignDropdown(false); }}
                          style={{
                            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                            background: assignTo === m.id ? HP_TOKENS.blueWash : 'transparent',
                            ...HP_TEXT.body, color: assignTo === m.id ? HP_TOKENS.blue : HP_TOKENS.ink, fontSize: 13, fontWeight: assignTo === m.id ? 700 : 500,
                            marginBottom: 4
                          }}
                        >
                          {m.name} — {m.job_title || m.role}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: 12, borderRadius: 12, background: HP_TOKENS.blueWash, border: `1px solid ${HP_TOKENS.blueSoft}` }}>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.blue, fontWeight: 700 }}>
                👥 Target KPI Tim
              </div>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, marginTop: 2 }}>
                KPI ini akan ditugaskan ke seluruh anggota tim secara kolektif.
              </div>
            </div>
          )}

          <button onClick={handleCreate} disabled={!title || !assignTo || saving} style={{
            width: '100%', padding: 12, borderRadius: 12, border: 'none',
            background: HP_TOKENS.sage, color: '#F4F7F9',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            opacity: !title || !assignTo || saving ? 0.5 : 1,
            marginTop: 4
          }}>
            {saving ? 'Menyimpan...' : 'Buat KPI'}
          </button>
        </div>

        <div style={{ margin: '24px 0 16px', height: 1, background: HP_TOKENS.line }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ ...HP_TEXT.h, fontSize: 15, color: HP_TOKENS.ink, fontWeight: 800 }}>
            📋 Daftar KPI Terdaftar
          </div>
          <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700 }}>
            {kpis.length} KPI
          </div>
        </div>

        {/* Weight status indicator */}
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '10px 14px', borderRadius: 12, marginBottom: 16,
          background: statusBg,
          border: `1px solid ${statusColor}30`
        }}>
          <span style={{ 
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 13,
            color: statusColor
          }}>
            {statusText}
          </span>
        </div>

        {/* 2. KPI List (Always visible at bottom) */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Memuat...</div>
        ) : kpis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: HP_TOKENS.inkMute }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
            <div style={{ ...HP_TEXT.body, fontWeight: 700 }}>Belum ada KPI untuk {MONTHS[month - 1]} {year}</div>
            <div style={{ ...HP_TEXT.small, marginTop: 4 }}>Silakan buat KPI baru di atas</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
            {paginatedEntries.map(group => (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>👤</span>
                    <span style={{ ...HP_TEXT.small, fontWeight: 800, color: HP_TOKENS.inkSoft }}>
                      {group.name}
                    </span>
                  </div>
                  <span style={{ 
                    fontFamily: HP_FONT, fontSize: 12, fontWeight: 900,
                    color: group.totalWeight === 100 ? HP_TOKENS.sage : group.totalWeight > 100 ? HP_TOKENS.coral : HP_TOKENS.blue 
                  }}>
                    Total Bobot: {group.totalWeight}% {group.totalWeight > 100 ? '⚠️' : ''}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(k => (
                    <div key={k.id} style={{
                      padding: 14, borderRadius: 16, background: HP_TOKENS.card,
                      border: `1.5px solid ${HP_TOKENS.line}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{k.title}</div>
                          {k.targetDescription && (
                            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                              Target: {k.targetDescription}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                            <div style={{
                              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                              background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue, fontFamily: HP_FONT
                            }}>
                              Bobot: {k.weight}%
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedKpiId(expandedKpiId === k.id ? null : k.id)}
                              style={{
                                background: expandedKpiId === k.id ? HP_TOKENS.blue : HP_TOKENS.blueWash,
                                color: expandedKpiId === k.id ? '#fff' : HP_TOKENS.blue,
                                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                                border: 'none', cursor: 'pointer', fontFamily: HP_FONT,
                                display: 'flex', alignItems: 'center', gap: 4
                              }}
                            >
                              <span>📅</span> Target Mingguan
                            </button>
                          </div>
                        </div>
                        <button onClick={() => handleDelete(k.id)} style={{ 
                          background: 'none', border: 'none', cursor: 'pointer', padding: 4 
                        }}>
                          <HPGlyph name="close" size={16} color={HP_TOKENS.coral} />
                        </button>
                      </div>

                      {expandedKpiId === k.id && (
                        <div style={{ 
                          marginTop: 12, padding: 12, borderRadius: 12, 
                          background: HP_TOKENS.paper, border: `1.5px solid ${HP_TOKENS.line}` 
                        }}>
                          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 8, fontSize: 9, letterSpacing: '0.05em' }}>
                            📅 TARGET MINGGUAN (KPI BREAKDOWN)
                          </div>
                          
                          {/* Targets list */}
                          {loadingTargetsKpiId === k.id ? (
                            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, textAlign: 'center', padding: 10, fontSize: 11 }}>
                              Memuat target mingguan...
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                              {(weeklyTargetsMap[k.id] || []).length === 0 ? (
                                <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontStyle: 'italic', fontSize: 11 }}>
                                  Belum ada target mingguan. Buat di bawah.
                                </div>
                              ) : (
                                (weeklyTargetsMap[k.id] || []).map((wt: any) => (
                                  <div key={wt.id} style={{ 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                    padding: '8px 10px', borderRadius: 10, background: '#fff', border: `1px solid ${HP_TOKENS.lineSoft}` 
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        padding: '2px 6px', borderRadius: 4, background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue, 
                                        fontSize: 9, fontWeight: 900 
                                      }}>M{wt.weekNumber}</div>
                                      <div style={{ ...HP_TEXT.small, fontSize: 11, fontWeight: 700, color: HP_TOKENS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {wt.title}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: 10, fontWeight: 800, color: HP_TOKENS.inkMute }}>
                                        {wt.targetValue} {wt.metricUnit}
                                      </span>
                                      <button 
                                        type="button"
                                        onClick={() => handleDeleteWeeklyTarget(k.id, wt.id)}
                                        style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                      >
                                        <span style={{ color: HP_TOKENS.coral, fontSize: 16, fontWeight: 800, lineHeight: 1 }}>×</span>
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Add Form */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: `1px dashed ${HP_TOKENS.line}` }}>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, fontWeight: 800, fontSize: 9 }}>+ Tambah Target Mingguan</div>
                            {wtError && (
                              <div style={{ fontSize: 10, color: HP_TOKENS.coral, fontWeight: 700 }}>{wtError}</div>
                            )}
                            <div style={{ display: 'flex', gap: 6 }}>
                              <select 
                                value={newWtWeek} 
                                onChange={e => setNewWtWeek(Number(e.target.value))}
                                style={{ 
                                  padding: 6, borderRadius: 8, border: `1px solid ${HP_TOKENS.line}`,
                                  fontFamily: HP_FONT, fontSize: 11, background: '#fff', outline: 'none', color: HP_TOKENS.ink
                                }}
                              >
                                {[1,2,3,4,5].map(w => <option key={w} value={w}>Minggu {w}</option>)}
                              </select>
                              <input 
                                type="text"
                                value={newWtTitle}
                                onChange={e => setNewWtTitle(e.target.value)}
                                placeholder="Target minggu ini (mis: Finalisasi Figma flow)"
                                style={{ 
                                  flex: 1, padding: 6, borderRadius: 8, border: `1px solid ${HP_TOKENS.line}`,
                                  fontFamily: HP_FONT, fontSize: 11, background: '#fff', outline: 'none', color: HP_TOKENS.ink
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: HP_TOKENS.inkMute, fontWeight: 700 }}>Nilai Target:</span>
                              <input 
                                type="number"
                                value={newWtTargetVal}
                                onChange={e => setNewWtTargetVal(Number(e.target.value))}
                                style={{ 
                                  width: 55, padding: 6, borderRadius: 8, border: `1px solid ${HP_TOKENS.line}`,
                                  fontFamily: HP_FONT, fontSize: 11, background: '#fff', outline: 'none', color: HP_TOKENS.ink
                                }}
                              />
                              <select 
                                value={newWtUnit} 
                                onChange={e => setNewWtUnit(e.target.value)}
                                style={{ 
                                  padding: 6, borderRadius: 8, border: `1px solid ${HP_TOKENS.line}`,
                                  fontFamily: HP_FONT, fontSize: 11, background: '#fff', outline: 'none', color: HP_TOKENS.ink
                                }}
                              >
                                <option value="%">%</option>
                                <option value="task">task</option>
                                <option value="leads">leads</option>
                                <option value="sales">sales</option>
                              </select>
                              <button 
                                type="button"
                                onClick={() => handleCreateWeeklyTarget(k.id)}
                                disabled={!newWtTitle || wtSaving}
                                style={{
                                  padding: '6px 12px', borderRadius: 8, border: 'none',
                                  background: HP_TOKENS.sage, color: '#fff',
                                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
                                  opacity: (!newWtTitle || wtSaving) ? 0.5 : 1, marginLeft: 'auto'
                                }}
                              >
                                {wtSaving ? '...' : 'Tambah'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      </div>
                    ))}
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: activePage === 1 ? HP_TOKENS.lineSoft : '#fff',
                    color: activePage === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                    cursor: activePage === 1 ? 'default' : 'pointer',
                    opacity: activePage === 1 ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Sebelumnya
                </button>
                <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                  {activePage} / {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={activePage === totalPages}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: activePage === totalPages ? HP_TOKENS.lineSoft : '#fff',
                    color: activePage === totalPages ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                    cursor: activePage === totalPages ? 'default' : 'pointer',
                    opacity: activePage === totalPages ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
