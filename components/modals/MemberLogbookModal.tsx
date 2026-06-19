"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import HPBar from "@/components/ui/HPBar";
import HPCard from "@/components/ui/HPCard";

interface MemberLogbookModalProps {
  onClose: () => void;
  memberId: string;
  memberName: string;
  goalId?: string;
  goalTitle?: string;
  childGoals?: any[];
}

export default function MemberLogbookModal({ onClose, memberId, memberName, goalId, goalTitle, childGoals = [] }: MemberLogbookModalProps) {
  const { state, updateState, user } = useHP();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const logsPerPage = 5;
  const totalPages = Math.ceil(logs.length / logsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedLogs = useMemo(() => {
    const start = (activePage - 1) * logsPerPage;
    return logs.slice(start, start + logsPerPage);
  }, [logs, activePage]);

  useEffect(() => {
    const teamTasks = state?.managerData?.teamTasks || [];

    const timer = setTimeout(() => {
      const memberTasks = teamTasks.filter((t: any) => String(t.userId) === String(memberId));
      
      // Group by date (local date)
      const groups: Record<string, any[]> = {};
      memberTasks.forEach((t: any) => {
        const d = new Date(t.createdAt || Date.now());
        const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(t);
      });

      // Sort dates descending
      const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
      
      const newLogs = sortedDates.map(dateStr => {
        const today = new Date().toLocaleDateString('en-CA');
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
        
        let label = dateStr;
        if (dateStr === today) label = 'Hari ini';
        else if (dateStr === yesterday) label = 'Kemarin';
        else {
          const d = new Date(dateStr);
          label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }

        return {
          date: dateStr,
          label,
          tasks: groups[dateStr]
        };
      });

      setLogs(newLogs);
      setLoading(false);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [memberId, state?.managerData?.teamTasks]);

  const handleVerify = async (taskId: string, action: 'approve' | 'reject' | 'revision' = 'approve') => {
    try {
      const url = action === 'approve' ? "/api/manager/verify-task" : "/api/manager/reject-task";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          taskId, 
          managerId: user?.id, 
          ...(action === 'approve' ? { goalId } : { action }) 
        })
      });

      if (!res.ok) throw new Error("Failed");

      // Update local state to reflect verification
      updateState((s: any) => {
        const newTeamTasks = s.managerData?.teamTasks?.map((t: any) => 
          t.id === taskId 
            ? { 
                ...t, 
                verified: action === 'approve', 
                done: action === 'approve', 
                status: action 
              } 
            : t
        ) || [];
        
        let newGoals = s.goals;
        if (goalId && action === 'approve') {
          const tasksForGoal = newTeamTasks.filter((t: any) => String(t.goalId) === String(goalId));
          const verifiedCount = tasksForGoal.filter((t: any) => t.verified).length;
          newGoals = s.goals.map((g: any) => 
            String(g.id) === String(goalId) 
              ? { ...g, metric: `${verifiedCount}/${tasksForGoal.length} verified` } 
              : g
          );
        }

        return {
          ...s,
          goals: newGoals,
          managerData: {
            ...s.managerData,
            teamTasks: newTeamTasks
          }
        };
      });

      // Update current view logs
      setLogs(prev => prev.map(day => ({
        ...day,
        tasks: day.tasks.map((t: any) => 
          t.id === taskId 
            ? { 
                ...t, 
                verified: action === 'approve', 
                done: action === 'approve', 
                status: action 
              } 
            : t
        )
      })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal onClose={onClose} title="Member Logbook 📋" noPadding>
      <div style={{ padding: '0 20px 24px' }}>
        {/* Header Info */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0',
          borderBottom: `1.5px solid ${HP_TOKENS.lineSoft}`, marginBottom: 20
        }}>
          <HPAvatar name={memberName} size={54} />
          <div style={{ flex: 1 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 18 }}>{memberName}</div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>{goalTitle || 'KPI Progress'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: HP_TOKENS.sage }}>{state?.goals?.find((g: any) => String(g.id) === String(goalId))?.alignment || 100}%</div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkFade }}>Alignment</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ display: 'inline-block', width: 24, height: 24, border: `3px solid ${HP_TOKENS.line}`, borderTopColor: HP_TOKENS.blue, borderRadius: '50%', animation: 'hpSpin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Aligned Child Goals Section */}
            {childGoals.length > 0 && (
              <div>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                }}>
                  <HPGlyph name="link" size={14} color={HP_TOKENS.blue} />
                  <div style={{ ...HP_TEXT.tiny, fontWeight: 900, color: HP_TOKENS.blue, fontSize: 10, letterSpacing: '0.05em' }}>
                    ALIGNED OKR ({childGoals.length})
                  </div>
                  <div style={{ height: 1.5, flex: 1, background: HP_TOKENS.lineSoft, opacity: 0.5 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {childGoals.map((child: any) => (
                    <HPCard key={child.id} padding={16} style={{
                      border: `1.5px solid ${HP_TOKENS.blue}20`,
                      background: `${HP_TOKENS.blue}06`,
                      borderRadius: 20,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 14,
                          background: child.progress >= 100 ? HP_TOKENS.sage : HP_TOKENS.blue,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 4px 12px ${child.progress >= 100 ? HP_TOKENS.sage : HP_TOKENS.blue}30`
                        }}>
                          <HPGlyph name="target" size={20} color="#F4F7F9" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.ink }}>{child.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            {child.progress >= 100 && (
                              <div style={{ padding: '2px 7px', borderRadius: 5, background: HP_TOKENS.sageSoft, color: HP_TOKENS.sage, fontSize: 8, fontWeight: 900 }}>DONE</div>
                            )}
                            <div style={{
                              padding: '3px 9px', borderRadius: 6, fontSize: 9, fontWeight: 900,
                              background: child.status === 'approved' ? HP_TOKENS.sageSoft : child.status === 'rejected' ? HP_TOKENS.coralSoft : HP_TOKENS.yellowSoft,
                              color: child.status === 'approved' ? HP_TOKENS.sage : child.status === 'rejected' ? HP_TOKENS.coral : '#8A6814',
                            }}>
                              {(child.status || 'pending').toUpperCase()}
                            </div>
                            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 10 }}>
                               · Due: {child.due}
                            </div>
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <HPBar value={child.progress || 0} tone={child.tone || 'blue'} height={5} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ ...HP_TEXT.h, fontSize: 18, color: child.progress >= 100 ? HP_TOKENS.sage : HP_TOKENS.blue }}>{child.progress || 0}%</div>
                        </div>
                      </div>
                    </HPCard>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Tasks grouped by date */}
            {paginatedLogs.map((day, idx) => (
              <div key={day.date}>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
                  position: 'sticky', top: 0, background: HP_TOKENS.card, zIndex: 10, padding: '8px 0'
                }}>
                  <div style={{ 
                    padding: '6px 14px', borderRadius: 12, 
                    background: (activePage === 1 && idx === 0) ? HP_TOKENS.blue : HP_TOKENS.paper,
                    border: `1.5px solid ${(activePage === 1 && idx === 0) ? HP_TOKENS.blue : HP_TOKENS.lineSoft}`,
                    color: (activePage === 1 && idx === 0) ? '#fff' : HP_TOKENS.inkSoft, 
                    fontSize: 10, fontWeight: 900, letterSpacing: '0.05em',
                    boxShadow: (activePage === 1 && idx === 0) ? `0 4px 12px ${HP_TOKENS.blue}40` : 'none'
                  }}>
                    {day.label.toUpperCase()} — {new Date(day.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                  </div>
                  <div style={{ height: 1.5, flex: 1, background: HP_TOKENS.lineSoft, opacity: 0.5 }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {day.tasks.length === 0 ? (
                    <div style={{ 
                      padding: '20px', textAlign: 'center', borderRadius: 20, 
                      background: HP_TOKENS.paper, border: `1.5px dashed ${HP_TOKENS.line}`,
                      color: HP_TOKENS.inkFade, fontSize: 12, fontStyle: 'italic'
                    }}>
                      Tidak ada aktivitas tercatat pada tanggal ini.
                    </div>
                  ) : (
                    day.tasks.map((t: any) => {
                      const isRejected = !t.verified && !t.done && t.status === 'reject';
                      const isRevision = !t.verified && !t.done && t.status === 'revision';
                      
                      const cardBorder = t.verified 
                        ? `1.5px solid ${HP_TOKENS.sage}30` 
                        : t.done 
                          ? `1.5px solid ${HP_TOKENS.yellow}40` 
                          : isRejected
                            ? `1.5px solid ${HP_TOKENS.coral}30`
                            : isRevision
                              ? `1.5px solid ${HP_TOKENS.yellow}30`
                              : `1.5px solid ${HP_TOKENS.lineSoft}`;

                      const cardBg = t.verified 
                        ? HP_TOKENS.sageWash 
                        : isRejected
                          ? HP_TOKENS.coralWash
                          : isRevision
                            ? HP_TOKENS.yellowWash
                            : '#fff';

                      const glyphBg = t.verified 
                        ? HP_TOKENS.sage 
                        : t.done 
                          ? HP_TOKENS.yellow 
                          : isRejected
                            ? HP_TOKENS.coral
                            : isRevision
                              ? HP_TOKENS.yellow
                              : HP_TOKENS.lineSoft;

                      const glyphShadow = t.verified 
                        ? `0 4px 12px ${HP_TOKENS.sage}40` 
                        : t.done 
                          ? `0 4px 12px ${HP_TOKENS.yellow}40` 
                          : isRejected
                            ? `0 4px 12px ${HP_TOKENS.coral}40`
                            : isRevision
                              ? `0 4px 12px ${HP_TOKENS.yellow}40`
                              : 'none';

                      const glyphName = t.verified 
                        ? "check" 
                        : t.done 
                          ? "zap" 
                          : isRejected
                            ? "close" 
                            : isRevision
                              ? "refresh" 
                              : "activity";

                      return (
                        <HPCard key={t.id} padding={16} style={{ 
                          border: cardBorder,
                          background: cardBg,
                          boxShadow: '0 4px 20px rgba(26,29,35,0.02)',
                          borderRadius: 22,
                          transition: 'transform 0.2s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ 
                              width: 40, height: 40, borderRadius: 14, 
                              background: glyphBg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: glyphShadow
                            }}>
                              <HPGlyph name={glyphName} size={20} color={t.verified || t.done || isRejected || isRevision ? "#fff" : HP_TOKENS.inkMute} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ ...HP_TEXT.h, fontSize: 15, color: HP_TOKENS.ink, lineHeight: 1.3 }}>{t.title}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                <div style={{ 
                                  padding: '2px 8px', borderRadius: 6, background: HP_TOKENS.paper,
                                  fontSize: 10, fontWeight: 800, color: HP_TOKENS.inkMute 
                                }}>
                                  {t.est || '15m'}
                                </div>
                                {t.verified && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 4, height: 4, borderRadius: 2, background: HP_TOKENS.sage }} />
                                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.sage, fontWeight: 900, fontSize: 9 }}>VERIFIED</div>
                                  </div>
                                )}
                                {!t.verified && t.done && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 4, height: 4, borderRadius: 2, background: HP_TOKENS.yellow }} />
                                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.yellow, fontWeight: 900, fontSize: 9 }}>WAITING FOR ACC</div>
                                  </div>
                                )}
                                {isRejected && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 4, height: 4, borderRadius: 2, background: HP_TOKENS.coral }} />
                                    <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.coral, fontWeight: 900, fontSize: 9 }}>DITOLAK</div>
                                  </div>
                                )}
                                {isRevision && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 4, height: 4, borderRadius: 2, background: '#8A6814' }} />
                                    <div style={{ ...HP_TEXT.tiny, color: '#8A6814', fontWeight: 900, fontSize: 9 }}>BUTUH REVISI</div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {t.done && !t.verified && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button 
                                  onClick={() => handleVerify(t.id, 'approve')}
                                  className="hp-tap"
                                  style={{
                                    padding: '8px 16px', borderRadius: 10, border: 'none',
                                    background: HP_TOKENS.sage, color: '#F4F7F9', fontSize: 11, fontWeight: 900, 
                                    cursor: 'pointer', boxShadow: `0 4px 12px ${HP_TOKENS.sage}40`
                                  }}
                                >
                                  ACC
                                </button>
                                <button 
                                  onClick={() => handleVerify(t.id, 'revision')}
                                  className="hp-tap"
                                  style={{
                                    padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.yellow}`,
                                    background: HP_TOKENS.card, color: '#8A6814', fontSize: 11, fontWeight: 900, 
                                    cursor: 'pointer'
                                  }}
                                >
                                  Revisi
                                </button>
                                <button 
                                  onClick={() => handleVerify(t.id, 'reject')}
                                  className="hp-tap"
                                  style={{
                                    padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${HP_TOKENS.coral}`,
                                    background: HP_TOKENS.card, color: HP_TOKENS.coral, fontSize: 11, fontWeight: 900, 
                                    cursor: 'pointer'
                                  }}
                                >
                                  Tolak
                                </button>
                              </div>
                            )}
                            {t.verified && (
                              <div style={{ 
                                width: 32, height: 32, borderRadius: 16, background: HP_TOKENS.sageWash,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: HP_TOKENS.sage
                              }}>
                                <HPGlyph name="check" size={20} stroke={3} />
                              </div>
                            )}
                          </div>
                        </HPCard>
                      );
                    })
                  )}
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
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

      <style jsx>{`
        @keyframes hpSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}
