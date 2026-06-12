import React, { useState, useMemo } from 'react';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';
import HPCard from '@/components/ui/HPCard';
import HPBar from '@/components/ui/HPBar';
import HPAvatar from '@/components/ui/HPAvatar';
import SectionHeader from '@/components/home/SectionHeader';
import GoalCard from '@/components/goals/GoalCard';

const TONE: Record<string, string> = { sage: HP_TOKENS.sage, blue: HP_TOKENS.blue, lavender: HP_TOKENS.lavender, yellow: HP_TOKENS.yellow, coral: HP_TOKENS.coral };

interface ManagerTeamKPIViewProps {
  topLevelGoals: any[];
  assignedGoals: any[];
  teamTasks: any[];
  state: any;
  user: any;
  openModal: (name: string, props?: any) => void;
  setGoalToDelete: (id: string) => void;
  handleEditProgress: (id: string, progress: number) => void;
  handleVerifyTask: (taskId: string, goalId: string) => void;
  handleRejectTask: (taskId: string, goalId: string, action: 'reject' | 'revision') => void;
  handleApproveGoal: (goalId: string) => void;
  handleRevisionGoal: (goalId: string) => void;
  handleRejectGoal: (goalId: string) => void;
}

export default function ManagerTeamKPIView({
  topLevelGoals,
  assignedGoals,
  teamTasks,
  state,
  user,
  openModal,
  setGoalToDelete,
  handleEditProgress,
  handleVerifyTask,
  handleRejectTask,
  handleApproveGoal,
  handleRevisionGoal,
  handleRejectGoal
}: ManagerTeamKPIViewProps) {
  const [currentPageKPI, setCurrentPageKPI] = useState(1);
  const kpiPerPage = 5;
  const totalPagesKPI = Math.ceil(topLevelGoals.length / kpiPerPage);
  const activePageKPI = Math.min(currentPageKPI, Math.max(1, totalPagesKPI));
  const paginatedKPIs = useMemo(() => {
    const start = (activePageKPI - 1) * kpiPerPage;
    return topLevelGoals.slice(start, start + kpiPerPage);
  }, [topLevelGoals, activePageKPI]);

  return (
    <>
      <SectionHeader 
        icon="people" 
        label="Assigned to Members (KPIs)" 
        count={String(topLevelGoals.length)} 
        action="+ Buat KPI"
        onAction={() => openModal('new_goal', { scope: 'employee' })}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {paginatedKPIs.map(g => {
          const childGoals = assignedGoals.filter((c: any) => String(c.parent_id) === String(g.id));
          const childIds = childGoals.map((c: any) => String(c.id));
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
                      color: '#F4F7F9'
                    }}>
                      {g.status === 'approved' ? 'ACCEPT' : g.status === 'rejected' ? 'REJECT' : g.status === 'revision' ? 'REVISI' : 'ON PROGRESS'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setGoalToDelete(g.id); }}
                      className="hp-tap"
                      style={{
                        width: 24, height: 24, borderRadius: 12, border: 'none', background: 'rgba(26,29,35,0.05)',
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

                {childGoals.length > 0 && (
                  <div style={{ padding: '12px 16px', background: `${HP_TOKENS.blue}08`, borderTop: `1px solid ${HP_TOKENS.lineSoft}` }}>
                    <div style={{ ...HP_TEXT.tiny, fontWeight: 900, color: HP_TOKENS.blue, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HPGlyph name="link" size={12} color={HP_TOKENS.blue} />
                      ALIGNED OKR ({childGoals.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {childGoals.map((child: any) => {
                        const childToneColor = TONE[child.tone] || HP_TOKENS.sage;
                        return (
                          <div key={child.id} style={{
                            padding: '14px 16px', background: HP_TOKENS.card, borderRadius: 16,
                            border: `1.5px solid ${child.status === 'pending' ? `${HP_TOKENS.yellow}40` : HP_TOKENS.lineSoft}`,
                            boxShadow: '0 2px 8px rgba(26,29,35,0.02)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{
                                    width: 22, height: 22, borderRadius: 7, background: `${childToneColor}15`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}>
                                    <HPGlyph name="target" size={12} color={childToneColor} />
                                  </div>
                                  <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{child.title}</div>
                                  {(child.progress || 0) >= 100 && (
                                    <div style={{ padding: '2px 7px', borderRadius: 5, background: HP_TOKENS.sageSoft, color: HP_TOKENS.sage, fontSize: 8, fontWeight: 900 }}>DONE</div>
                                  )}
                                  <div style={{
                                    padding: '2px 7px', borderRadius: 5, fontSize: 8, fontWeight: 900,
                                    background: child.status === 'approved' ? HP_TOKENS.sageSoft : child.status === 'rejected' ? HP_TOKENS.coralSoft : child.status === 'revision' ? HP_TOKENS.yellowSoft : HP_TOKENS.yellowSoft,
                                    color: child.status === 'approved' ? HP_TOKENS.sage : child.status === 'rejected' ? HP_TOKENS.coral : child.status === 'revision' ? '#8A6814' : '#8A6814',
                                  }}>
                                    {child.status === 'approved' ? 'ACCEPT' : child.status === 'revision' ? 'REVISI' : child.status === 'rejected' ? 'REJECT' : 'PENDING'}
                                  </div>
                                </div>
                                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4, marginLeft: 30, fontSize: 10 }}>Due: {child.due}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ ...HP_TEXT.h, fontSize: 14, color: childToneColor }}>{child.progress || 0}%</div>
                              </div>
                            </div>
                            <div style={{ marginTop: 10 }}>
                              <HPBar value={child.progress || 0} tone={child.tone} height={5} />
                            </div>
                            {child.status === 'pending' && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); handleApproveGoal(String(child.id)); }} className="hp-tap" style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: HP_TOKENS.sage, color: '#F4F7F9', fontFamily: HP_FONT, fontWeight: 900, fontSize: 11, cursor: 'pointer', boxShadow: `0 2px 8px ${HP_TOKENS.sage}40` }}>Approve</button>
                                <button onClick={(e) => { e.stopPropagation(); handleRevisionGoal(String(child.id)); }} className="hp-tap" style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.yellow}`, background: HP_TOKENS.card, color: '#8A6814', fontFamily: HP_FONT, fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>Revisi</button>
                                <button onClick={(e) => { e.stopPropagation(); handleRejectGoal(String(child.id)); }} className="hp-tap" style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.coral}`, background: HP_TOKENS.card, color: HP_TOKENS.coral, fontFamily: HP_FONT, fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>Reject</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ padding: '16px', background: HP_TOKENS.paper, borderTop: `1px solid ${HP_TOKENS.lineSoft}` }}>
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
                            background: HP_TOKENS.card, borderRadius: 18, border: `1.5px solid ${HP_TOKENS.yellow}30`,
                            boxShadow: '0 4px 12px rgba(26,29,35,0.02)'
                          }}>
                            <div style={{ 
                              width: 32, height: 32, borderRadius: 10, background: HP_TOKENS.yellow,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <HPGlyph name="zap" size={16} color="#F4F7F9" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: HP_TOKENS.ink }}>{t.title}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <div style={{ padding: '2px 6px', borderRadius: 4, background: HP_TOKENS.paper, fontSize: 9, fontWeight: 800, color: HP_TOKENS.inkFade }}>{t.est || '15m'}</div>
                                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.yellow, fontWeight: 900, fontSize: 8 }}>WAITING ACC</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={(e) => { e.stopPropagation(); handleVerifyTask(t.id, g.id); }} className="hp-tap" style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: HP_TOKENS.sage, color: '#F4F7F9', fontSize: 11, fontWeight: 900, cursor: 'pointer', boxShadow: `0 4px 12px ${HP_TOKENS.sage}40` }}>ACC</button>
                              <button onClick={(e) => { e.stopPropagation(); handleRejectTask(t.id, g.id, 'revision'); }} className="hp-tap" style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${HP_TOKENS.yellow}`, background: HP_TOKENS.card, color: '#8A6814', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>Revisi</button>
                              <button onClick={(e) => { e.stopPropagation(); handleRejectTask(t.id, g.id, 'reject'); }} className="hp-tap" style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${HP_TOKENS.coral}`, background: HP_TOKENS.card, color: HP_TOKENS.coral, fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>Tolak</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

                  {verifiedTasks.length > 0 && (
                    <div>
                      <div style={{ ...HP_TEXT.tiny, fontWeight: 900, color: HP_TOKENS.inkFade, marginBottom: 10 }}>HISTORY SELESAI</div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        {verifiedTasks.map((t: any) => (
                          <div key={t.id} style={{ padding: '4px 10px', borderRadius: 8, background: HP_TOKENS.lineSoft, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
                            <HPGlyph name="check" size={10} color={HP_TOKENS.sage} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: HP_TOKENS.inkSoft }}>{t.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {g.status === 'pending' && (
                     <div style={{ display: 'flex', gap: 10, marginTop: 24, borderTop: `1px dashed ${HP_TOKENS.line}`, paddingTop: 16 }}>
                       <button onClick={(e) => { e.stopPropagation(); handleApproveGoal(String(g.id)); }} className="hp-tap" style={{ flex: 1, padding: '14px', borderRadius: 14, border: 'none', background: HP_TOKENS.sage, color: '#F4F7F9', fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>Approve KPI</button>
                      <button onClick={(e) => { e.stopPropagation(); handleRevisionGoal(String(g.id)); }} className="hp-tap" style={{ flex: 1, padding: '14px', borderRadius: 14, border: `1.5px solid ${HP_TOKENS.yellow}`, background: HP_TOKENS.card, color: '#8A6814', fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>Revisi</button>
                      <button onClick={(e) => { e.stopPropagation(); handleRejectGoal(String(g.id)); }} className="hp-tap" style={{ flex: 1, padding: '14px', borderRadius: 14, border: `1.5px solid ${HP_TOKENS.coral}`, background: HP_TOKENS.card, color: HP_TOKENS.coral, fontFamily: HP_FONT, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>Reject</button>
                    </div>
                  )}
                </div>
              </HPCard>
            </div>
          );
        })}
        {topLevelGoals.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>Belum ada OKR yang ditugaskan.</div>}
      </div>

      {totalPagesKPI > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button 
            onClick={() => setCurrentPageKPI(p => Math.max(1, p - 1))}
            disabled={activePageKPI === 1}
            style={{
              padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
              background: activePageKPI === 1 ? HP_TOKENS.lineSoft : '#fff',
              color: activePageKPI === 1 ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
              cursor: activePageKPI === 1 ? 'default' : 'pointer',
              opacity: activePageKPI === 1 ? 0.6 : 1, transition: 'all 0.2s'
            }}
          >Sebelumnya</button>
          <span style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
            {activePageKPI} / {totalPagesKPI}
          </span>
          <button 
            onClick={() => setCurrentPageKPI(p => Math.min(totalPagesKPI, p + 1))}
            disabled={activePageKPI === totalPagesKPI}
            style={{
              padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
              background: activePageKPI === totalPagesKPI ? HP_TOKENS.lineSoft : '#fff',
              color: activePageKPI === totalPagesKPI ? HP_TOKENS.inkMute : HP_TOKENS.inkSoft,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, 
              cursor: activePageKPI === totalPagesKPI ? 'default' : 'pointer',
              opacity: activePageKPI === totalPagesKPI ? 0.6 : 1, transition: 'all 0.2s'
            }}
          >Berikutnya</button>
        </div>
      )}
    </>
  );
}
