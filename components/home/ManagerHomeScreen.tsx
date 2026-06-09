"use client";

import React, { useState } from "react";
import { useHP, calculateLevelProgress } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPCard from "@/components/ui/HPCard";
import HPAvatar from "@/components/ui/HPAvatar";
import SectionHeader from "@/components/home/SectionHeader";
import BlobBackground from "@/components/home/BlobBackground";
import BeeMascot, { getMoodColor } from "@/components/ui/BeeMascot";
import AttendanceWidget from "@/components/home/AttendanceWidget";
import SurveySection from "@/components/home/SurveySection";

import TaskHarianWidget from "@/components/home/TaskHarianWidget";
import { generateAIInsights } from "@/lib/aiInsights";
import InsightCard from "@/components/home/InsightCard";

interface Props { openModal: (name: string, props?: any) => void; }

interface TeamMember {
  id: string | number;
  name: string;
  role: string;
  status: string;
  wellbeing: number;
  statusTone: string;
  glyph?: string;
  tasks: { done: number; total: number };
}

export default function ManagerHomeScreen({ openModal }: Props) {
  const { state, user, awardXP, refresh, updateState } = useHP();
  const managerData = state?.managerData || { members: [], goals: [], approvals: [], teamTasks: [] };
  const { members, goals, approvals = [], teamTasks = [] } = managerData;
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((a: number, b: any) => a + Number(b.progress), 0) / goals.length) : 0;

  const aiInsights = React.useMemo(() => generateAIInsights(state, user), [state, user]);

  const [currentPageApprovals, setCurrentPageApprovals] = useState(1);
  const [currentPagePendingTasks, setCurrentPagePendingTasks] = useState(1);
  const [taskLoadingId, setTaskLoadingId] = useState<string | null>(null);

  const approvalsPerPage = 5;
  const totalPagesApprovals = Math.ceil((approvals || []).length / approvalsPerPage);
  const activePageApprovals = Math.min(currentPageApprovals, Math.max(1, totalPagesApprovals));
  const paginatedApprovals = (approvals || []).slice((activePageApprovals - 1) * approvalsPerPage, activePageApprovals * approvalsPerPage);

  const pendingTasks = teamTasks.filter((t: any) => t.done && !t.verified);
  const pendingTasksPerPage = 5;
  const totalPagesPendingTasks = Math.ceil(pendingTasks.length / pendingTasksPerPage);
  const activePagePendingTasks = Math.min(currentPagePendingTasks, Math.max(1, totalPagesPendingTasks));
  const paginatedPendingTasks = pendingTasks.slice((activePagePendingTasks - 1) * pendingTasksPerPage, activePagePendingTasks * pendingTasksPerPage);

  if (!user || !state) return null;
  const levelProgress = calculateLevelProgress(user.points || 0);

  return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 120, fontFamily: HP_FONT }}>
      <BlobBackground colors={[HP_TOKENS.blueWash, HP_TOKENS.yellowWash, HP_TOKENS.blueSoft]} />

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px' }} className="hp-stagger">

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${HP_TOKENS.paper}, ${HP_TOKENS.card})`,
          borderRadius: 24, padding: '24px 20px', marginTop: 8,
          border: `1.5px solid ${HP_TOKENS.line}`, boxShadow: '0 10px 30px rgba(26,29,35,0.04)',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -20, right: -10, fontSize: 100, fontWeight: 900, color: HP_TOKENS.lineSoft, zIndex: 0, opacity: 0.4 }}>
            {user.level}
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div 
                className="hp-tap"
                onClick={() => openModal('profile_editor')}
                style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
              >
                <HPAvatar name={user.name} size={52} rank={user.rank} levelProgress={levelProgress} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 20 }}>{user.name.split(' ')[0]}</div>
                    <div style={{ background: HP_TOKENS.blue, color: '#F4F7F9', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 6 }}>
                      MANAGER
                    </div>
                  </div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2, fontWeight: 700 }}>
                    Level {user.level} · Class {user.rank || 'E'}
                  </div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 1 }}>
                    {user.role} · {members.length} anggota tim
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => openModal('system_guide')} className="hp-tap" style={{
                  background: HP_TOKENS.lineSoft, border: 'none', borderRadius: 20, width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>
                  <HPGlyph name="sparkle" size={16} color={HP_TOKENS.blue} />
                </button>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99,
                  background: HP_TOKENS.blueSoft, fontFamily: HP_FONT, fontWeight: 900, fontSize: 14, color: HP_TOKENS.blue,
                }}>
                  🔥 <span>{user.streak}</span>
                </div>
              </div>
            </div>

            {/* Level progress & Total points */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Level Progress</div>
                <div style={{ width: '100%', height: 6, background: HP_TOKENS.lineSoft, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${levelProgress * 100}%`, height: '100%', 
                    background: HP_TOKENS.blue, 
                    transition: '1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 4 }}>Total Point</div>
                <div style={{ ...HP_TEXT.h, fontSize: 24 }}>{user.points.toLocaleString()}</div>
              </div>
            </div>

            {/* Team health bar - Only showing KPI Progress now */}
            <div style={{
              background: HP_TOKENS.lineSoft, borderRadius: 20, padding: '16px 20px', 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>🎯</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute }}>RATA-RATA PROGRES KPI TIM</div>
                  <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: HP_TOKENS.blue, marginTop: -2 }}>
                    {avgProgress}<span style={{ fontSize: 14, color: HP_TOKENS.inkMute }}>%</span>
                  </div>
                </div>
              </div>
              <div style={{ width: 64, height: 64, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="32" cy="32" r="26"
                    fill="transparent"
                    stroke={`${HP_TOKENS.blue}20`}
                    strokeWidth="5"
                  />
                  <circle
                    cx="32" cy="32" r="26"
                    fill="transparent"
                    stroke={HP_TOKENS.blue}
                    strokeWidth="5"
                    strokeDasharray={163.36}
                    strokeDashoffset={163.36 - (163.36 * avgProgress) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                  />
                </svg>
                <div style={{ position: 'absolute', fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, color: HP_TOKENS.blue }}>
                  {avgProgress}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Widget — Smart: Clock-in / Clock-out / Done */}
        <div style={{ marginTop: 16 }}>
          <AttendanceWidget openModal={openModal} />
        </div>

        {/* KPI Management Button */}
        <button 
          onClick={() => openModal('manage_kpi')}
          style={{
            marginTop: 10, width: '100%', padding: '14px', borderRadius: 20, 
            background: `linear-gradient(135deg, ${HP_TOKENS.blue}, #2B5286)`, color: '#F4F7F9',
            border: 'none', fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 4px 12px rgba(59,111,160,0.3)'
          }} className="hp-tap"
        >
          🎯 Kelola KPI Bulanan
        </button>

        {/* Action Row: Management & Communication */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <button
            onClick={() => openModal('weekly_review')}
            style={{
              padding: '12px', borderRadius: 16,
              background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
              color: HP_TOKENS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }} className="hp-tap"
          >
            📋 Weekly Review
          </button>
          <button
            onClick={() => openModal('monthly_report')}
            style={{
              padding: '12px', borderRadius: 16,
              background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
              color: HP_TOKENS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }} className="hp-tap"
          >
            📊 Laporan Bulanan
          </button>
          <button
            onClick={() => openModal('appreciate')}
            style={{
              padding: '12px', borderRadius: 16,
              background: HP_TOKENS.blueWash, border: `1.5px solid ${HP_TOKENS.blueSoft}`,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
              color: HP_TOKENS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }} className="hp-tap"
          >
            🌟 Beri Kudos
          </button>
          <button
            onClick={() => openModal('announcement')}
            style={{
              padding: '12px', borderRadius: 16,
              background: HP_TOKENS.sageWash, border: `1.5px solid ${HP_TOKENS.sageSoft}`,
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
              color: HP_TOKENS.sage, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }} className="hp-tap"
          >
            📢 Pengumuman
          </button>
        </div>

        {/* Friday Reminders & AI Summaries */}
        {(() => {
          const today = new Date();
          const isFriday = today.getDay() === 5;
          // Last working day of month: find last weekday (Mon-Fri)
          const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          let lastWorkDay = lastDayOfMonth;
          while (lastWorkDay.getDay() === 0 || lastWorkDay.getDay() === 6) {
            lastWorkDay = new Date(lastWorkDay.getTime() - 86400000);
          }
          const isLastWorkingDayOfMonth = today.getDate() === lastWorkDay.getDate() && today.getMonth() === lastWorkDay.getMonth();
          
          if (!isFriday && !isLastWorkingDayOfMonth) return null;
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {/* Weekly AI Summary Button (Setiap Jumat) */}
              <div style={{
                padding: '12px 16px', borderRadius: 16,
                background: HP_TOKENS.blueWash, border: `1.5px solid ${HP_TOKENS.blue}40`,
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }} onClick={() => openModal('ai_weekly_summary')} className="hp-tap"
              >
                <div style={{ fontSize: 20 }}>🤖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.ink }}>Rangkuman Mingguan AI</div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                    Analisa performa mingguan per orang (Jumat)
                  </div>
                </div>
                <HPGlyph name="sparkle" size={14} color={HP_TOKENS.blue} />
              </div>

              {/* Monthly AI Analysis Button (Hari Kerja Akhir Bulan) */}
              {isLastWorkingDayOfMonth && (
                <div style={{
                  padding: '12px 16px', borderRadius: 16,
                  background: HP_TOKENS.lavenderSoft, border: `1.5px solid #6B5F8E40`,
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                }} onClick={() => openModal('ai_monthly_analysis')} className="hp-tap"
                >
                  <div style={{ fontSize: 20 }}>🔮</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 13, color: HP_TOKENS.ink }}>Analisa Bulanan AI (Hari Kerja Akhir Bulan)</div>
                    <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                      Evaluasi laporan bulanan vs KPI tim
                    </div>
                  </div>
                  <HPGlyph name="sparkle" size={14} color="#6B5F8E" />
                </div>
              )}
            </div>
          );
        })()}

        {/* Task Harian Widget for Manager (as an employee) */}
        <TaskHarianWidget openModal={openModal} />

        {/* Professional Growth / AI Coach Insights */}
        <div style={{ marginTop: 24 }}>
          <SectionHeader icon="heart" label="AI Coach Insights" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aiInsights.map((ins, i) => (
              <InsightCard key={i} ins={ins} idx={i} />
            ))}
          </div>
        </div>

        {/* Pending Approvals Widget */}
        {approvals.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <SectionHeader icon="alertCircle" label="Persetujuan Target Tim" count={`${approvals.length}`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {paginatedApprovals.map((appr: any) => (
                <HPCard key={appr.id} padding={16} style={{ borderLeft: `4px solid ${HP_TOKENS.blue}`, background: HP_TOKENS.card }}>
                  <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{appr.desc}</div>
                  <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                    Diajukan oleh: <b>{appr.from}</b> · {appr.type}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={async (e) => {
                        const target = e.currentTarget;
                        target.disabled = true;
                        try {
                          await fetch("/api/goals/update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ goalId: appr.id, updates: { status: 'approved' } })
                          });
                          await refresh();
                        } catch (err) {
                          console.error(err);
                          target.disabled = false;
                        }
                      }}
                      className="hp-tap"
                      style={{
                        padding: '6px 12px', borderRadius: 8, background: HP_TOKENS.sage, color: '#F4F7F9',
                        fontFamily: HP_FONT, fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer'
                      }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={async (e) => {
                        const target = e.currentTarget;
                        target.disabled = true;
                        try {
                          await fetch("/api/goals/update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ goalId: appr.id, updates: { status: 'revision' } })
                          });
                          await refresh();
                        } catch (err) {
                          console.error(err);
                          target.disabled = false;
                        }
                      }}
                      className="hp-tap"
                      style={{
                        padding: '6px 12px', borderRadius: 8, background: HP_TOKENS.yellowWash, color: HP_TOKENS.yellow,
                        fontFamily: HP_FONT, fontSize: 11, fontWeight: 800, border: `1px solid ${HP_TOKENS.yellow}`, cursor: 'pointer'
                      }}
                    >
                      ↻ Revisi
                    </button>
                    <button
                      onClick={async (e) => {
                        const target = e.currentTarget;
                        target.disabled = true;
                        try {
                          await fetch("/api/goals/update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ goalId: appr.id, updates: { status: 'rejected' } })
                          });
                          await refresh();
                        } catch (err) {
                          console.error(err);
                          target.disabled = false;
                        }
                      }}
                      className="hp-tap"
                      style={{
                        padding: '6px 12px', borderRadius: 8, background: HP_TOKENS.coralSoft, color: HP_TOKENS.coral,
                        fontFamily: HP_FONT, fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer'
                      }}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </HPCard>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPagesApprovals > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button 
                  onClick={() => setCurrentPageApprovals(p => Math.max(1, p - 1))}
                  disabled={activePageApprovals === 1}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: activePageApprovals === 1 ? HP_TOKENS.lineSoft : '#fff',
                    color: activePageApprovals === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                    cursor: activePageApprovals === 1 ? 'default' : 'pointer',
                    opacity: activePageApprovals === 1 ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Sebelumnya
                </button>
                <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                  {activePageApprovals} / {totalPagesApprovals}
                </span>
                <button 
                  onClick={() => setCurrentPageApprovals(p => Math.min(totalPagesApprovals, p + 1))}
                  disabled={activePageApprovals === totalPagesApprovals}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: activePageApprovals === totalPagesApprovals ? HP_TOKENS.lineSoft : '#fff',
                    color: activePageApprovals === totalPagesApprovals ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                    cursor: activePageApprovals === totalPagesApprovals ? 'default' : 'pointer',
                    opacity: activePageApprovals === totalPagesApprovals ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pending Task Verifications Widget */}
        {pendingTasks.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <SectionHeader icon="check" label="Verifikasi Tugas Anggota Tim" count={`${pendingTasks.length}`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {paginatedPendingTasks.map((task: any) => {
                const isLoading = taskLoadingId === task.id;

                const handleAction = async (action: 'approve' | 'reject' | 'revision') => {
                  if (isLoading) return;
                  setTaskLoadingId(task.id);
                  try {
                    const res = await fetch("/api/manager/verify-task", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ taskId: task.id, goalId: task.goalId, managerId: user.id, action })
                    });
                    if (res.ok) {
                      updateState((s: any) => {
                        if (!s || !s.managerData) return s;
                        const newTeamTasks = (s.managerData.teamTasks || []).map((t: any) => {
                          if (t.id === task.id) {
                            if (action === 'approve') {
                              return { ...t, verified: true, done: true, status: 'approved' };
                            } else {
                              return { ...t, verified: false, done: false, status: action };
                            }
                          }
                          return t;
                        });
                        return {
                          ...s,
                          managerData: {
                            ...s.managerData,
                            teamTasks: newTeamTasks
                          }
                        };
                      });
                      await refresh();
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setTaskLoadingId(null);
                  }
                };

                return (
                  <HPCard key={task.id} padding={12} style={{ background: HP_TOKENS.card }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Task Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: HP_TOKENS.yellowWash,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <HPGlyph name="zap" size={16} color={HP_TOKENS.yellow} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...HP_TEXT.body, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.title}
                          </div>
                          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                            SELESAI OLEH: <b style={{ color: HP_TOKENS.blue }}>{task.userName} ({task.userCode || 'EMP'})</b>
                          </div>
                        </div>
                        {isLoading && (
                          <div style={{ fontSize: 10, color: HP_TOKENS.inkMute, fontFamily: HP_FONT, fontWeight: 700 }}>
                            ...
                          </div>
                        )}
                      </div>

                      {/* 3 Action Buttons: Accept, Reject, Revisi */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                        {/* Accept */}
                        <button
                          onClick={() => handleAction('approve')}
                          disabled={isLoading}
                          className="hp-tap"
                          style={{
                            padding: '9px 4px', borderRadius: 10, border: 'none',
                            background: HP_TOKENS.sage, color: '#F4F7F9',
                            fontFamily: HP_FONT, fontSize: 11, fontWeight: 900, cursor: isLoading ? 'default' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            boxShadow: `0 2px 6px ${HP_TOKENS.sage}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3
                          }}
                        >
                          ✓ Accept
                        </button>

                        {/* Reject */}
                        <button
                          onClick={() => handleAction('reject')}
                          disabled={isLoading}
                          className="hp-tap"
                          style={{
                            padding: '9px 4px', borderRadius: 10,
                            border: `1.5px solid ${HP_TOKENS.coral}`,
                            background: HP_TOKENS.card, color: HP_TOKENS.coral,
                            fontFamily: HP_FONT, fontSize: 11, fontWeight: 900, cursor: isLoading ? 'default' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3
                          }}
                        >
                          ✗ Reject
                        </button>

                        {/* Revisi */}
                        <button
                          onClick={() => handleAction('revision')}
                          disabled={isLoading}
                          className="hp-tap"
                          style={{
                            padding: '9px 4px', borderRadius: 10,
                            border: `1.5px solid ${HP_TOKENS.yellow}`,
                            background: HP_TOKENS.card, color: '#8A6814',
                            fontFamily: HP_FONT, fontSize: 11, fontWeight: 900, cursor: isLoading ? 'default' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3
                          }}
                        >
                          ↻ Revisi
                        </button>
                      </div>
                    </div>
                  </HPCard>
                );
              })}
            </div>


            {/* Pagination Controls */}
            {totalPagesPendingTasks > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button 
                  onClick={() => setCurrentPagePendingTasks(p => Math.max(1, p - 1))}
                  disabled={activePagePendingTasks === 1}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: activePagePendingTasks === 1 ? HP_TOKENS.lineSoft : '#fff',
                    color: activePagePendingTasks === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                    cursor: activePagePendingTasks === 1 ? 'default' : 'pointer',
                    opacity: activePagePendingTasks === 1 ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Sebelumnya
                </button>
                <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
                  {activePagePendingTasks} / {totalPagesPendingTasks}
                </span>
                <button 
                  onClick={() => setCurrentPagePendingTasks(p => Math.min(totalPagesPendingTasks, p + 1))}
                  disabled={activePagePendingTasks === totalPagesPendingTasks}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                    background: activePagePendingTasks === totalPagesPendingTasks ? HP_TOKENS.lineSoft : '#fff',
                    color: activePagePendingTasks === totalPagesPendingTasks ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
                    fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
                    cursor: activePagePendingTasks === totalPagesPendingTasks ? 'default' : 'pointer',
                    opacity: activePagePendingTasks === totalPagesPendingTasks ? 0.6 : 1, transition: 'all 0.2s'
                  }}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}





        {/* Survey Section — Smart targeting + internal questions */}
        <SurveySection openModal={openModal} />

        {/* AI Coach for Manager - with Bee Mascot */}
        <div style={{ 
          marginTop: 16, 
          background: getMoodColor('happy'), 
          borderRadius: 22,
          padding: '16px 20px',
          boxShadow: `0 8px 22px ${getMoodColor('happy')}40`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 20
        }} onClick={() => openModal('coach')} className="hp-tap">
          <BeeMascot mood="happy" size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 15, color: '#F4F7F9' }}>AI Manager Coach</div>
            <div style={{ ...HP_TEXT.small, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              Feedback, coaching & pengelolaan tim
            </div>
          </div>
          <HPGlyph name="arrow" size={18} color="#F4F7F9" />
        </div>
      </div>
    </div>
  );
}
