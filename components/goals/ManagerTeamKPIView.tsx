import React, { useState, useMemo } from 'react';
import { HP_TOKENS, HP_FONT, HP_TEXT } from '@/lib/constants';
import HPGlyph from '@/components/ui/HPGlyph';
import HPCard from '@/components/ui/HPCard';
import HPBar from '@/components/ui/HPBar';
import HPAvatar from '@/components/ui/HPAvatar';
import SectionHeader from '@/components/home/SectionHeader';
import GoalCard from '@/components/goals/GoalCard';

const TONE: Record<string, string> = { sage: HP_TOKENS.sage, blue: HP_TOKENS.blue, lavender: HP_TOKENS.lavender, yellow: HP_TOKENS.yellow, coral: HP_TOKENS.coral };
// Legible twin of TONE. A tint only owes 3:1; the percentage figure beside it
// owes 4.5:1, and `yellow` as text is 2.2:1 on white.
const TONE_INK: Record<string, string> = { sage: HP_TOKENS.sageInk, blue: HP_TOKENS.blue, lavender: HP_TOKENS.lavenderInk, yellow: HP_TOKENS.yellowInk, coral: HP_TOKENS.coralInk };

interface ManagerTeamKPIViewProps {
  topLevelGoals: any[];
  assignedGoals: any[];
  teamTasks: any[];
  state: any;
  user: any;
  openModal: (name: string, props?: any) => void;
  setGoalToDelete: (id: string) => void;
  handleEditProgress: (id: string, progress: number) => void;
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <SectionHeader
          icon="people"
          label="Target & KPI Anggota Tim"
          count={String(topLevelGoals.length)}
          action="+ Buat Target / KPI"
          onAction={() => openModal('manage_kpi', { initialShowForm: true })}
        />
        <button
          onClick={() => openModal('kpi_review')}
          style={{
            padding: '8px 14px', borderRadius: HP_TOKENS.radiusSm, border: 'none', cursor: 'pointer',
            background: HP_TOKENS.yellowWash, color: HP_TOKENS.yellowInk,
            fontFamily: 'inherit', fontWeight: 700, fontSize: 11,
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8,
          }}
        >
          📋 Review KPI
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {paginatedKPIs.map(g => {
          const childGoals = assignedGoals.filter((c: any) => String(c.parent_id) === String(g.id));
          const childIds = childGoals.map((c: any) => String(c.id));
          const allRelatedTasks = teamTasks.filter((t: any) =>
            t.goalId && (String(t.goalId) === String(g.id) || childIds.includes(String(t.goalId)))
          );
          const ownerName = g.owner || state.managerData?.members?.find((m: any) => String(m.id) === String(g.ownerId))?.name || 'Team Member';
          

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
                    <div style={{ ...HP_TEXT.tiny, fontWeight: 700, color: HP_TOKENS.ink, letterSpacing: '0.02em' }}>
                      {ownerName.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: HP_TOKENS.inkFade, marginTop: 1 }}>{g.is_kpi ? 'KPI TARGET' : 'GOAL'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ 
                      fontSize: 9, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                      background: g.status === 'approved' ? HP_TOKENS.sage : g.status === 'rejected' ? HP_TOKENS.coral : g.status === 'revision' ? HP_TOKENS.yellow : HP_TOKENS.yellow,
                      color: HP_TOKENS.onPrimary
                    }}>
                      {g.status === 'approved' ? 'ACCEPT' : g.status === 'rejected' ? 'REJECT' : g.status === 'revision' ? 'REVISI' : 'ON PROGRESS'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setGoalToDelete(g.id); }}
                      className="hp-tap"
                      style={{
                        width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(26,29,35,0.05)',
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
                  <GoalCard
                    g={g}
                    isReadOnly={true}
                    tasks={allRelatedTasks}
                    onEditProgress={(p) => handleEditProgress(String(g.id), p)}
                    managerMode={true}
                  />
                </div>

                {childGoals.length > 0 && (
                  <div style={{ padding: '12px 16px', background: `${HP_TOKENS.blue}08`, borderTop: `1px solid ${HP_TOKENS.lineSoft}` }}>
                    <div style={{ ...HP_TEXT.tiny, fontWeight: 700, color: HP_TOKENS.blue, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HPGlyph name="link" size={12} color={HP_TOKENS.blue} />
                      ALIGNED OKR ({childGoals.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {childGoals.map((child: any) => {
                        const childToneColor = TONE[child.tone] || HP_TOKENS.sage;
                        const childToneInk = TONE_INK[child.tone] || HP_TOKENS.sageInk;
                        return (
                          <div key={child.id} style={{
                            padding: '14px 16px', background: HP_TOKENS.card, borderRadius: HP_TOKENS.radiusMd,
                            border: `1.5px solid ${child.status === 'pending' ? `${HP_TOKENS.yellow}40` : HP_TOKENS.lineSoft}`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{
                                    width: 22, height: 22, borderRadius: 7, background: `${childToneColor}15`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}>
                                    <HPGlyph name="target" size={12} color={childToneInk} />
                                  </div>
                                  <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{child.title}</div>
                                  {(child.progress || 0) >= 100 && (
                                    <div style={{ padding: '2px 7px', borderRadius: 5, background: HP_TOKENS.sageSoft, color: HP_TOKENS.sageInk, fontSize: 8, fontWeight: 700 }}>DONE</div>
                                  )}
                                  <div style={{
                                    padding: '2px 7px', borderRadius: 5, fontSize: 8, fontWeight: 700,
                                    background: child.status === 'approved' ? HP_TOKENS.sageSoft : child.status === 'rejected' ? HP_TOKENS.coralSoft : child.status === 'revision' ? HP_TOKENS.yellowSoft : HP_TOKENS.yellowSoft,
                                    color: child.status === 'approved' ? HP_TOKENS.sage : child.status === 'rejected' ? HP_TOKENS.coral : child.status === 'revision' ? HP_TOKENS.yellowDark : HP_TOKENS.yellowDark,
                                  }}>
                                    {child.status === 'approved' ? 'ACCEPT' : child.status === 'revision' ? 'REVISI' : child.status === 'rejected' ? 'REJECT' : 'PENDING'}
                                  </div>
                                </div>
                                <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4, marginLeft: 30, fontSize: 10 }}>Due: {child.due}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ ...HP_TEXT.h, fontSize: 14, color: childToneInk }}>{child.progress || 0}%</div>
                              </div>
                            </div>
                            <div style={{ marginTop: 10 }}>
                              <HPBar value={child.progress || 0} tone={child.tone} height={5} />
                            </div>
                            {child.status === 'pending' && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); handleApproveGoal(String(child.id)); }} className="hp-tap" style={{ flex: 1, padding: '8px', borderRadius: HP_TOKENS.radiusSm, border: 'none', background: HP_TOKENS.sage, color: HP_TOKENS.onPrimary, fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Approve</button>
                                <button onClick={(e) => { e.stopPropagation(); handleRevisionGoal(String(child.id)); }} className="hp-tap" style={{ flex: 1, padding: '8px', borderRadius: HP_TOKENS.radiusSm, border: `1.5px solid ${HP_TOKENS.yellow}`, background: HP_TOKENS.card, color: HP_TOKENS.yellowInk, fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Revisi</button>
                                <button onClick={(e) => { e.stopPropagation(); handleRejectGoal(String(child.id)); }} className="hp-tap" style={{ flex: 1, padding: '8px', borderRadius: HP_TOKENS.radiusSm, border: `1.5px solid ${HP_TOKENS.coral}`, background: HP_TOKENS.card, color: HP_TOKENS.coralInk, fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Reject</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {g.status === 'pending' && (
                  <div style={{ padding: '12px 16px', background: HP_TOKENS.paper, borderTop: `1px solid ${HP_TOKENS.lineSoft}` }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={(e) => { e.stopPropagation(); handleApproveGoal(String(g.id)); }} className="hp-tap" style={{ flex: 1, padding: '12px', borderRadius: HP_TOKENS.radiusSm, border: 'none', background: HP_TOKENS.sage, color: HP_TOKENS.onPrimary, fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Approve KPI</button>
                      <button onClick={(e) => { e.stopPropagation(); handleRevisionGoal(String(g.id)); }} className="hp-tap" style={{ flex: 1, padding: '12px', borderRadius: HP_TOKENS.radiusSm, border: `1.5px solid ${HP_TOKENS.yellow}`, background: HP_TOKENS.card, color: HP_TOKENS.yellowInk, fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Revisi</button>
                      <button onClick={(e) => { e.stopPropagation(); handleRejectGoal(String(g.id)); }} className="hp-tap" style={{ flex: 1, padding: '12px', borderRadius: HP_TOKENS.radiusSm, border: `1.5px solid ${HP_TOKENS.coral}`, background: HP_TOKENS.card, color: HP_TOKENS.coralInk, fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Reject</button>
                    </div>
                  </div>
                )}
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
