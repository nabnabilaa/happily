"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPBar from "@/components/ui/HPBar";
import HPAvatar from "@/components/ui/HPAvatar";
import SectionHeader from "@/components/home/SectionHeader";

interface Props {
  openModal: (name: string, props?: any) => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function DivisionTargetsView({ openModal }: Props) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
    const handleUpdate = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true);
      }
    };
    window.addEventListener('hp_db_update', handleUpdate);
    return () => window.removeEventListener('hp_db_update', handleUpdate);
  }, [month, year]);

  const fetchData = async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await fetch(`/api/kpi/by-department?month=${month}&year=${year}`);
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filteredDepartments = departments.filter(d => d.department.toLowerCase().includes(search.toLowerCase()));

  const totalHeadcount = departments.reduce((s, d) => s + d.headcount, 0);
  const totalKpis = departments.reduce((s, d) => s + d.totalKpis, 0);
  const totalApproved = departments.reduce((s, d) => s + d.approvedTasks, 0);
  const totalTasks = departments.reduce((s, d) => s + d.totalTasks, 0);
  const overallApprovalRate = totalTasks > 0 ? Math.round((totalApproved / totalTasks) * 100) : 0;

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, background: HP_TOKENS.card, outline: 'none',
    color: HP_TOKENS.ink,
  };

  return (
    <div>
      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...selectStyle, flex: 2 }}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...selectStyle, flex: 1 }}>
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: HP_TOKENS.paper, borderRadius: 14, padding: '10px 14px', marginBottom: 16,
        border: `1.5px solid ${HP_TOKENS.line}`,
      }}>
        <HPGlyph name="search" size={16} color={HP_TOKENS.blue} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari divisi..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 14, color: HP_TOKENS.ink,
          }}
        />
      </div>

      {/* Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16,
        padding: '14px', borderRadius: 16, background: HP_TOKENS.lavenderSoft,
        border: `1px solid ${HP_TOKENS.lavender}20`,
      }}>
        {[
          { label: 'Divisi', value: departments.length, color: HP_TOKENS.lavender },
          { label: 'Karyawan', value: totalHeadcount, color: HP_TOKENS.blue },
          { label: 'KPI Aktif', value: totalKpis, color: '#8A6814' },
          { label: 'Approval', value: `${overallApprovalRate}%`, color: HP_TOKENS.sage },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 18, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: HP_TOKENS.inkMute }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Memuat data divisi...</div>
      ) : filteredDepartments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: HP_TOKENS.inkMute }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <div style={{ ...HP_TEXT.h, fontSize: 15 }}>Belum ada data divisi</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredDepartments.map(dept => {
            const isExpanded = expandedDept === dept.department;
            const approvalRate = dept.totalTasks > 0 ? Math.round((dept.approvedTasks / dept.totalTasks) * 100) : 0;
            const scoreTone = dept.avgScore >= 80 ? 'sage' : dept.avgScore >= 50 ? 'yellow' : 'coral';

            return (
              <HPCard key={dept.department} padding={0} style={{ overflow: 'hidden', border: `1.5px solid ${isExpanded ? `${HP_TOKENS.lavender}40` : HP_TOKENS.line}` }}>
                {/* Department Header */}
                <button
                  onClick={() => setExpandedDept(isExpanded ? null : dept.department)}
                  className="hp-tap"
                  style={{
                    width: '100%', padding: '14px 16px', background: isExpanded ? HP_TOKENS.lavenderSoft : 'transparent',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'all 0.2s', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: isExpanded ? HP_TOKENS.lavender : HP_TOKENS.lineSoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: HP_FONT, fontWeight: 900, fontSize: 14,
                    color: isExpanded ? '#fff' : HP_TOKENS.inkSoft,
                  }}>
                    {dept.department.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{dept.department}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>👥 {dept.headcount}</span>
                      <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>🎯 {dept.totalKpis} KPI</span>
                      {dept.avgScore > 0 && (
                        <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS[scoreTone], fontWeight: 800 }}>⭐ {dept.avgScore}%</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                      background: approvalRate >= 70 ? HP_TOKENS.sageWash : approvalRate >= 40 ? HP_TOKENS.yellowSoft : HP_TOKENS.coralSoft,
                      color: approvalRate >= 70 ? HP_TOKENS.sage : approvalRate >= 40 ? '#8A6814' : HP_TOKENS.coral,
                      fontFamily: HP_FONT,
                    }}>
                      {approvalRate}%
                    </div>
                    <HPGlyph name={isExpanded ? "chevronLeft" : "chevronRight"} size={14} color={HP_TOKENS.inkMute} />
                  </div>
                </button>

                {/* Expanded: User list */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${HP_TOKENS.line}` }}>
                    {/* Progress bar */}
                    <div style={{ padding: '12px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                        <span>Task Approval Progress</span>
                        <span>{dept.approvedTasks}/{dept.totalTasks}</span>
                      </div>
                      <HPBar value={approvalRate} tone={approvalRate >= 70 ? 'sage' : approvalRate >= 40 ? 'yellow' : 'coral'} height={6} />
                    </div>

                    {/* Users */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {dept.users.map((u: any) => (
                        <button
                          key={u.id}
                          onClick={() => openModal('employee_profile', { employeeId: u.id, employeeName: u.name })}
                          className="hp-tap"
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                            borderRadius: 10, background: HP_TOKENS.paper, border: `1px solid ${HP_TOKENS.lineSoft}`,
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <HPAvatar name={u.name} size={28} />
                          <div style={{ flex: 1 }}>
                            <div style={{ ...HP_TEXT.small, fontWeight: 700, fontSize: 12, color: HP_TOKENS.ink }}>{u.name}</div>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 10 }}>{u.jobTitle || 'Team Member'}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {u.kpiCount > 0 && (
                              <span style={{
                                padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                                background: HP_TOKENS.yellowSoft, color: '#8A6814', fontFamily: HP_FONT,
                              }}>
                                {u.kpiCount} KPI
                              </span>
                            )}
                            {u.avgScore !== null && (
                              <span style={{
                                padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                                background: u.avgScore >= 80 ? HP_TOKENS.sageWash : u.avgScore >= 50 ? HP_TOKENS.yellowSoft : HP_TOKENS.coralSoft,
                                color: u.avgScore >= 80 ? HP_TOKENS.sage : u.avgScore >= 50 ? '#8A6814' : HP_TOKENS.coral,
                                fontFamily: HP_FONT,
                              }}>
                                {u.avgScore}%
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                      {dept.users.length === 0 && (
                        <div style={{ ...HP_TEXT.tiny, textAlign: 'center', padding: 16, color: HP_TOKENS.inkMute }}>Tidak ada anggota</div>
                      )}
                    </div>
                  </div>
                )}
              </HPCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
