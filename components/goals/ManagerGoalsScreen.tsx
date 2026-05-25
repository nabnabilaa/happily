"use client";

import React, { useState } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPBar from "@/components/ui/HPBar";
import HPAvatar from "@/components/ui/HPAvatar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/home/SectionHeader";

import HRAttendanceView from "@/components/goals/HRAttendanceView";
import GoalCard from "@/components/goals/GoalCard";

interface Props { openModal: (name: string, props?: any) => void; }

const TONE: Record<string, string> = { sage: HP_TOKENS.sage, blue: HP_TOKENS.blue, lavender: HP_TOKENS.lavender, yellow: HP_TOKENS.yellow, coral: HP_TOKENS.coral };
const TONE_SOFT: Record<string, string> = { sage: HP_TOKENS.sageSoft, blue: HP_TOKENS.blueSoft, lavender: HP_TOKENS.lavenderSoft, yellow: HP_TOKENS.yellowSoft, coral: HP_TOKENS.coralSoft };

export default function ManagerGoalsScreen({ openModal }: Props) {
  const { state, user, updateState, notify } = useHP();
  const [activeTab, setActiveTab] = useState<'kpi' | 'members' | 'attendance' | 'personal'>('kpi');

  if (!state || !user) return null;

  // Filter for goals relevant to the manager: goals assigned by manager OR goals owned by team members
  const assignedGoals = state.goals.filter((g: any) => 
    (g.scope === 'assigned' && String(g.assignedById) === String(user.id)) || 
    (String(g.ownerId) !== String(user.id) && g.scope !== 'company')
  );
  const teamTasks = state.managerData?.teamTasks || [];
  const personalTasks = state.priorities || [];

  // Only show top-level goals — hide children whose parent is already in the list
  const topLevelGoals = assignedGoals.filter((g: any) => {
    if (!g.parent_id) return true;
    return !assignedGoals.some((p: any) => String(p.id) === String(g.parent_id));
  });

  const handleVerifyTask = async (taskId: string, goalId: string) => {
    try {
      // 1. Call API
      const res = await fetch("/api/manager/verify-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, goalId, managerId: user.id })
      });

      if (!res.ok) throw new Error("Failed to verify");

      // 2. Update local state
      updateState((s: any) => {
        const newTeamTasks = s.managerData?.teamTasks?.map((t: any) => 
          t.id === taskId ? { ...t, verified: true, done: true } : t
        ) || [];
        
        const tasksForGoal = newTeamTasks.filter((t: any) => String(t.goalId) === String(goalId));
        const verifiedCount = tasksForGoal.filter((t: any) => t.verified).length;
        const newProgress = tasksForGoal.length > 0 
          ? Math.round((verifiedCount / tasksForGoal.length) * 100) 
          : 0;

        const newGoals = s.goals.map((g: any) => 
          String(g.id) === String(goalId) 
            ? { ...g, metric: `${verifiedCount}/${tasksForGoal.length} verified` } 
            : g
        );

        return {
          ...s,
          goals: newGoals,
          managerData: {
            ...s.managerData,
            teamTasks: newTeamTasks
          }
        };
      });
    } catch (e) {
      console.error(e);
      alert("Gagal memverifikasi tugas.");
    }
  };

  const handleDeleteGoal = async (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hapus KPI ini?")) return;

    // 1. Update local state
    updateState((s: any) => ({
      ...s,
      goals: s.goals.filter((g: any) => String(g.id) !== String(goalId))
    }));

    // 2. Persist deletion
    try {
      await fetch('/api/goals/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId })
      });
    } catch (e) { console.error('Failed to delete goal:', e); }
  };

  const handleEditProgress = async (goalId: string, newProgress: number) => {
    // 1. Update local state immediately
    updateState((s: any) => ({
      ...s,
      goals: s.goals.map((goal: any) =>
        String(goal.id) === String(goalId)
          ? { ...goal, progress: newProgress }
          : goal
      )
    }));
    // 2. Persist directly to DB
    try {
      await fetch('/api/goals/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, updates: { progress: newProgress } })
      });
      notify('Progress Tersimpan', `Progress KPI diupdate menjadi ${newProgress}%.`, 'info');
    } catch (e) { console.error('Failed to save progress:', e); }
  };

  const handleApproveGoal = async (goalId: string) => {
    updateState((s: any) => ({
      ...s,
      goals: s.goals.map((goal: any) =>
        String(goal.id) === String(goalId) ? { ...goal, status: 'approved' } : goal
      )
    }));
    try {
      await fetch('/api/goals/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, updates: { status: 'approved' } })
      });
      notify('KPI Approved', `Goal telah disetujui.`, 'success');
    } catch (e) { console.error('Failed to approve:', e); }
  };

  const handleRejectGoal = async (goalId: string) => {
    updateState((s: any) => ({
      ...s,
      goals: s.goals.map((goal: any) =>
        String(goal.id) === String(goalId) ? { ...goal, status: 'rejected' } : goal
      )
    }));
    try {
      await fetch('/api/goals/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, updates: { status: 'rejected' } })
      });
      notify('KPI Rejected', `Goal telah ditolak.`, 'error');
    } catch (e) { console.error('Failed to reject:', e); }
  };

  const handleRevisionGoal = async (goalId: string) => {
    updateState((s: any) => ({
      ...s,
      goals: s.goals.map((goal: any) =>
        String(goal.id) === String(goalId) ? { ...goal, status: 'revision' } : goal
      )
    }));
    try {
      await fetch('/api/goals/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, updates: { status: 'revision' } })
      });
      notify('KPI Revision', `Goal membutuhkan perbaikan (revisi).`, 'warning');
    } catch (e) { console.error('Failed to request revision:', e); }
  };

  return (
    <div style={{ padding: '0 16px 120px', fontFamily: HP_FONT }}>
      <ScreenHeader title="Tim & KPI" subtitle="Pantau goal tim dan performa anggota" />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {([
          { key: 'kpi', label: 'KPI Tim' },
          { key: 'personal', label: 'Personal' },
          { key: 'members', label: 'Anggota' },
          { key: 'attendance', label: 'Absensi' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className="hp-tap" style={{
            flex: '0 0 auto', padding: '10px 16px', borderRadius: 14,
            background: activeTab === t.key ? HP_TOKENS.blue : HP_TOKENS.lineSoft,
            color: activeTab === t.key ? '#fff' : HP_TOKENS.inkSoft,
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 11, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── KPI Tim ── */}
      {activeTab === 'kpi' && (
        <>
          {/* Assigned KPIs */}
          <SectionHeader 
            icon="people" 
            label="Assigned to Members (KPIs)" 
            count={String(topLevelGoals.length)} 
            action="+ Buat KPI"
            onAction={() => openModal('new_goal', { scope: 'employee' })}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {topLevelGoals.map(g => {
              // Find child/aligned goals
              const childGoals = assignedGoals.filter((c: any) => String(c.parent_id) === String(g.id));
              const childIds = childGoals.map((c: any) => String(c.id));

              // Collect tasks for this goal AND all its children
              const allRelatedTasks = teamTasks.filter((t: any) =>
                t.goalId && (String(t.goalId) === String(g.id) || childIds.includes(String(t.goalId)))
              );
              const ownerName = g.owner || state.managerData?.members?.find((m: any) => String(m.id) === String(g.ownerId))?.name || 'Team Member';
              
              const pendingVerification = allRelatedTasks.filter((t: any) => t.done && !t.verified);
              const verifiedTasks = allRelatedTasks.filter((t: any) => t.verified);
              const activeTasks = allRelatedTasks.filter((t: any) => !t.done);

              return (
                <div 
                  key={g.id} 
                  style={{ marginBottom: 12, cursor: 'pointer' }} 
                  className="hp-tap"
                  onClick={() => openModal('member_logbook', { 
                    memberId: g.ownerId, 
                    memberName: ownerName,
                    goalId: g.id,
                    goalTitle: g.title,
                    childGoals: childGoals
                  })}
                >
                  <div style={{ 
                    padding: '10px 16px', 
                    background: g.status === 'pending' ? HP_TOKENS.yellowWash : g.status === 'approved' ? HP_TOKENS.sageWash : HP_TOKENS.coralWash, 
                    borderRadius: '20px 20px 0 0', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: `1.5px solid ${HP_TOKENS.line}`, borderBottom: 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <HPAvatar name={ownerName} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ ...HP_TEXT.tiny, fontWeight: 900, color: HP_TOKENS.ink, letterSpacing: '0.02em' }}>
                          {ownerName.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: HP_TOKENS.inkFade, marginTop: 1 }}>{g.is_kpi ? 'KPI TARGET' : 'GOAL'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ 
                          fontSize: 9, fontWeight: 900, padding: '4px 10px', borderRadius: 99,
                          background: g.status === 'approved' ? HP_TOKENS.sage : g.status === 'rejected' ? HP_TOKENS.coral : g.status === 'revision' ? HP_TOKENS.yellow : HP_TOKENS.yellow,
                          color: '#fff'
                        }}>
                          {g.status === 'approved' ? 'ACCEPT' : g.status === 'rejected' ? 'REJECT' : g.status === 'revision' ? 'REVISI' : 'ON PROGRESS'}
                        </div>
                        <button 
                          onClick={(e) => handleDeleteGoal(g.id, e)}
                          className="hp-tap"
                          style={{
                            width: 24, height: 24, borderRadius: 12, border: 'none', background: 'rgba(0,0,0,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}
                        >
                          <HPGlyph name="trash" size={12} color={HP_TOKENS.inkFade} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <HPCard padding={0} style={{ borderRadius: '0 0 20px 20px', overflow: 'hidden', borderTop: 'none' }}>
                    <div onClick={() => openModal('member_logbook', { 
                      memberId: g.ownerId, 
                      memberName: ownerName,
                      goalId: g.id,
                      goalTitle: g.title,
                      childGoals: childGoals
                    })} className="hp-tap">
                      <GoalCard g={g} isReadOnly={true} tasks={allRelatedTasks} onEditProgress={(p) => handleEditProgress(String(g.id), p)} />
                    </div>

                    {/* ── Aligned Child Goals (embedded inside parent) ── */}
                    {childGoals.length > 0 && (
                      <div style={{ padding: '12px 16px', background: `${HP_TOKENS.blue}08`, borderTop: `1px solid ${HP_TOKENS.lineSoft}` }}>
                        <div style={{ ...HP_TEXT.tiny, fontWeight: 900, color: HP_TOKENS.blue, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <HPGlyph name="link" size={12} color={HP_TOKENS.blue} />
                          ALIGNED OKR ({childGoals.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {childGoals.map((child: any) => {
                            const childTasks = teamTasks.filter((t: any) => t.goalId && String(t.goalId) === String(child.id));
                            const childToneColor = TONE[child.tone] || HP_TOKENS.sage;
                            return (
                              <div key={child.id} style={{
                                padding: '14px 16px', background: '#fff', borderRadius: 16,
                                border: `1.5px solid ${child.status === 'pending' ? `${HP_TOKENS.yellow}40` : HP_TOKENS.lineSoft}`,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{
                                        width: 22, height: 22, borderRadius: 7,
                                        background: `${childToneColor}15`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                      }}>
                                        <HPGlyph name="target" size={12} color={childToneColor} />
                                      </div>
                                      <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{child.title}</div>
                                      {(child.progress || 0) >= 100 && (
                                        <div style={{
                                          padding: '2px 7px', borderRadius: 5,
                                          background: HP_TOKENS.sageSoft, color: HP_TOKENS.sage,
                                          fontSize: 8, fontWeight: 900
                                        }}>DONE</div>
                                      )}
                                      <div style={{
                                        padding: '2px 7px', borderRadius: 5, fontSize: 8, fontWeight: 900,
                                        background: child.status === 'approved' ? HP_TOKENS.sageSoft : child.status === 'rejected' ? HP_TOKENS.coralSoft : child.status === 'revision' ? HP_TOKENS.yellowSoft : HP_TOKENS.yellowSoft,
                                        color: child.status === 'approved' ? HP_TOKENS.sage : child.status === 'rejected' ? HP_TOKENS.coral : child.status === 'revision' ? '#8A6814' : '#8A6814',
                                      }}>
                                        {child.status === 'approved' ? 'ACCEPT' : child.status === 'revision' ? 'REVISI' : child.status === 'rejected' ? 'REJECT' : 'PENDING'}
                                      </div>
                                    </div>
                                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4, marginLeft: 30, fontSize: 10 }}>
                                      Due: {child.due}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ ...HP_TEXT.h, fontSize: 14, color: childToneColor }}>{child.progress || 0}%</div>
                                  </div>
                                </div>
                                <div style={{ marginTop: 10 }}>
                                  <HPBar value={child.progress || 0} tone={child.tone} height={5} />
                                </div>
                                {/* Approve / Reject / Revisi for child goal */}
                                {child.status === 'pending' && (
                                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleApproveGoal(String(child.id)); }}
                                      className="hp-tap"
                                      style={{
                                        flex: 1, padding: '8px', borderRadius: 10, border: 'none',
                                        background: HP_TOKENS.sage, color: '#fff', fontFamily: HP_FONT,
                                        fontWeight: 900, fontSize: 11, cursor: 'pointer',
                                        boxShadow: `0 2px 8px ${HP_TOKENS.sage}40`
                                      }}
                                    >Approve</button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRevisionGoal(String(child.id)); }}
                                      className="hp-tap"
                                      style={{
                                        flex: 1, padding: '8px', borderRadius: 10,
                                        border: `1.5px solid ${HP_TOKENS.yellow}`,
                                        background: '#fff', color: '#8A6814', fontFamily: HP_FONT,
                                        fontWeight: 900, fontSize: 11, cursor: 'pointer'
                                      }}
                                    >Revisi</button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRejectGoal(String(child.id)); }}
                                      className="hp-tap"
                                      style={{
                                        flex: 1, padding: '8px', borderRadius: 10,
                                        border: `1.5px solid ${HP_TOKENS.coral}`,
                                        background: '#fff', color: HP_TOKENS.coral, fontFamily: HP_FONT,
                                        fontWeight: 900, fontSize: 11, cursor: 'pointer'
                                      }}
                                    >Reject</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ padding: '16px', background: HP_TOKENS.paper, borderTop: `1px solid ${HP_TOKENS.lineSoft}` }}>
                      {/* Section: Pending Verification */}
                      {pendingVerification.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ ...HP_TEXT.tiny, fontWeight: 900, color: HP_TOKENS.yellow, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <HPGlyph name="zap" size={12} color={HP_TOKENS.yellow} />
                            MENUNGGU PERSETUJUAN (ACC)
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pendingVerification.map((t: any) => (
                              <div key={t.id} style={{ 
                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', 
                                background: '#fff', borderRadius: 18, border: `1.5px solid ${HP_TOKENS.yellow}30`,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                              }}>
                                <div style={{ 
                                  width: 32, height: 32, borderRadius: 10, background: HP_TOKENS.yellow,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                  <HPGlyph name="zap" size={16} color="#fff" />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: HP_TOKENS.ink }}>{t.title}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    <div style={{ padding: '2px 6px', borderRadius: 4, background: HP_TOKENS.paper, fontSize: 9, fontWeight: 800, color: HP_TOKENS.inkFade }}>{t.est || '15m'}</div>
                                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.yellow, fontWeight: 900, fontSize: 8 }}>WAITING ACC</div>
                                  </div>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleVerifyTask(t.id, g.id); }}
                                  className="hp-tap"
                                  style={{
                                    padding: '8px 16px', borderRadius: 10, border: 'none',
                                    background: HP_TOKENS.sage, color: '#fff', fontSize: 11, fontWeight: 900, cursor: 'pointer',
                                    boxShadow: `0 4px 12px ${HP_TOKENS.sage}40`
                                  }}
                                >
                                  ACC
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section: Active Progress */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ ...HP_TEXT.tiny, fontWeight: 900, color: HP_TOKENS.inkMute, marginBottom: 10 }}>PROGRESS HARI INI</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {activeTasks.map((t: any) => (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7 }}>
                              <div style={{ width: 6, height: 6, borderRadius: 3, background: HP_TOKENS.line }} />
                              <div style={{ fontSize: 12, color: HP_TOKENS.inkSoft, fontWeight: 600 }}>{t.title}</div>
                            </div>
                          ))}
                          {activeTasks.length === 0 && <div style={{ fontSize: 11, color: HP_TOKENS.inkMute, fontStyle: 'italic' }}>Tidak ada task aktif saat ini.</div>}
                        </div>
                      </div>

                      {/* Section: History */}
                      {verifiedTasks.length > 0 && (
                        <div>
                          <div style={{ ...HP_TEXT.tiny, fontWeight: 900, color: HP_TOKENS.inkFade, marginBottom: 10 }}>HISTORY SELESAI</div>
                          <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                            {verifiedTasks.map((t: any) => (
                              <div key={t.id} style={{ 
                                padding: '4px 10px', borderRadius: 8, background: HP_TOKENS.lineSoft,
                                display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6
                              }}>
                                <HPGlyph name="check" size={10} color={HP_TOKENS.sage} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: HP_TOKENS.inkSoft }}>{t.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Global Goal Approval (Only if pending) */}
                      {g.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 10, marginTop: 24, borderTop: `1px dashed ${HP_TOKENS.line}`, paddingTop: 16 }}>
                           <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              handleApproveGoal(String(g.id));
                            }}
                            className="hp-tap"
                            style={{
                              flex: 1, padding: '14px', borderRadius: 14, border: 'none',
                              background: HP_TOKENS.sage, color: '#fff', fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, cursor: 'pointer'
                            }}
                          >
                            Approve KPI
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              handleRevisionGoal(String(g.id));
                            }}
                            className="hp-tap"
                            style={{
                              flex: 1, padding: '14px', borderRadius: 14, border: `1.5px solid ${HP_TOKENS.yellow}`,
                              background: '#fff', color: '#8A6814', fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, cursor: 'pointer'
                            }}
                          >
                            Revisi
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              handleRejectGoal(String(g.id));
                            }}
                            className="hp-tap"
                            style={{
                              flex: 1, padding: '14px', borderRadius: 14, border: `1.5px solid ${HP_TOKENS.coral}`,
                              background: '#fff', color: HP_TOKENS.coral, fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, cursor: 'pointer'
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </HPCard>
                </div>
              );
            })}
            {topLevelGoals.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Belum ada OKR yang ditugaskan.</div>}
          </div>
        </>
      )}

      {/* ── Personal Tasks ── */}
      {activeTab === 'personal' && (
        <>
          <SectionHeader 
            icon="sparkle" 
            label="Daily Tasks Saya" 
            count={String(personalTasks.length)} 
            action="+ Tambah Task"
            onAction={() => openModal('manage_priorities')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {personalTasks.map((t: any) => (
              <HPCard key={t.id} padding={14}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button 
                    onClick={() => updateState((s: any) => ({
                      ...s,
                      priorities: s.priorities.map((p: any) => p.id === t.id ? { ...p, done: !p.done } : p)
                    }))}
                    style={{ 
                      width: 24, height: 24, borderRadius: 8, border: `2px solid ${t.done ? HP_TOKENS.sage : HP_TOKENS.line}`,
                      background: t.done ? HP_TOKENS.sage : 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    {t.done && <HPGlyph name="check" size={14} color="#fff" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 14, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? HP_TOKENS.inkMute : HP_TOKENS.ink }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>{t.goal || 'General'}</div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.blue }}>{t.est || '15m'}</div>
                    </div>
                  </div>
                </div>
              </HPCard>
            ))}
            {personalTasks.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Belum ada task harian. Mulai harimu dengan fokus!</div>}
          </div>
        </>
      )}

      {/* ── Members ── */}
      {activeTab === 'members' && (
        <>
          <SectionHeader icon="people" label="Anggota Tim" count={String(state.managerData?.members?.length || 0)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(state.managerData?.members || []).map((m: any) => (
              <HPCard key={m.id} padding={14}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <HPAvatar name={m.name} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{m.name}</div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{m.role}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HPGlyph name={m.mood === 'joy' ? 'sparkle' : m.mood === 'stress' ? 'zap' : 'activity'} size={14} color={HP_TOKENS.ink} />
                      </div>
                      <div style={{ flex: 1, height: 4, background: HP_TOKENS.lineSoft, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${m.wellbeing}%`, height: '100%', background: m.wellbeing > 70 ? HP_TOKENS.sage : m.wellbeing > 40 ? HP_TOKENS.yellow : HP_TOKENS.coral, borderRadius: 2 }} />
                      </div>
                      <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                        {m.wellbeing > 80 ? '😊' : m.wellbeing > 60 ? '🙂' : m.wellbeing > 40 ? '😐' : '😟'} WB {m.wellbeing}%
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 10, fontFamily: HP_FONT,
                      background: m.statusTone === 'sage' ? HP_TOKENS.sageSoft : m.statusTone === 'yellow' ? HP_TOKENS.yellowSoft : HP_TOKENS.coralSoft,
                      color: m.statusTone === 'sage' ? HP_TOKENS.sage : m.statusTone === 'yellow' ? '#8A6814' : HP_TOKENS.coral,
                      marginBottom: 4,
                    }}>
                      {m.status}
                    </div>
                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>
                      Task {m.tasks.done}/{m.tasks.total}
                    </div>
                  </div>
                </div>
              </HPCard>
            ))}
          </div>
        </>
      )}

      {/* ── Attendance ── */}
      {activeTab === 'attendance' && (
        <HRAttendanceView currentUser={user} openModal={openModal} />
      )}


    </div>
  );
}
