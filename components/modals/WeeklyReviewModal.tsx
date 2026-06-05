"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import Modal from "@/components/ui/Modal";

interface ReviewItem {
  kpiId: string;
  kpiTitle: string;
  weight: number;
  employeeId: string;
  employeeName: string;
  links: {
    id: number;
    taskId: string;
    taskTitle: string;
    taskDone: boolean;
    taskDate: string;
    linkedBy: string;
    status: string;
    reviewedAt: string | null;
  }[];
}

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#FFF3BF', color: '#E67700', label: 'Pending' },
  approved: { bg: '#D3F9D8', color: '#2B8A3E', label: 'Approved' },
  rejected: { bg: '#FFE3E3', color: '#C92A2A', label: 'Rejected' },
  moved:    { bg: '#D0EBFF', color: '#1864AB', label: 'Dipindah' },
};

export default function WeeklyReviewModal({ onClose }: { onClose: () => void }) {
  const { user } = useHP();
  const [reviewData, setReviewData] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ linkId: number; show: boolean } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const reviewsPerPage = 5;
  const totalPages = Math.ceil(reviewData.length / reviewsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedReviews = useMemo(() => {
    const start = (activePage - 1) * reviewsPerPage;
    return reviewData.slice(start, start + reviewsPerPage);
  }, [reviewData, activePage]);

  useEffect(() => { fetchData(); }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kpi/review?managerId=${user?.id}&month=${month}&year=${year}`);
      const data = await res.json();
      setReviewData(data.reviewData || []);
      setCurrentPage(1);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAction = async (linkId: number, action: string, newKpiId?: string) => {
    setActionLoading(linkId);
    try {
      await fetch('/api/kpi/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, action, newKpiId, reviewedBy: user?.id })
      });

      // Send notification to employee
      const link = reviewData.flatMap(k => k.links).find(l => l.id === linkId);
      const kpi = reviewData.find(k => k.links.some(l => l.id === linkId));
      if (link && kpi) {
        const notifTitle = action === 'approve' ? '✅ Task Disetujui' :
          action === 'reject' ? '❌ Task Ditolak' : '↗️ Task Dipindah';
        const notifMsg = action === 'approve'
          ? `Manager menyetujui task "${link.taskTitle}" untuk KPI "${kpi.kpiTitle}"`
          : action === 'reject'
          ? `Manager menolak task "${link.taskTitle}" untuk KPI "${kpi.kpiTitle}". Silakan revisi.`
          : `Manager memindahkan task "${link.taskTitle}" ke KPI lain.`;

        await fetch('/api/ext/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: kpi.employeeId,
            title: notifTitle,
            message: notifMsg,
            type: action === 'approve' ? 'success' : action === 'reject' ? 'warning' : 'info',
            referenceId: String(linkId),
            referenceType: 'weekly_review',
          })
        });
      }

      fetchData();
    } catch (e) { console.error(e); }
    setActionLoading(null);
    setMoveTarget(null);
  };

  const totalPending = reviewData.reduce((sum, kpi) => 
    sum + kpi.links.filter(l => l.status === 'pending').length, 0
  );

  const selectStyle: React.CSSProperties = {
    padding: 10, borderRadius: 10, border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 13, background: HP_TOKENS.card, outline: 'none',
  };

  return (
    <Modal onClose={onClose} title="📋 Weekly Review">
      <div style={{ marginTop: 4 }}>
        {/* Month/Year */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...selectStyle, flex: 2 }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...selectStyle, flex: 1 }}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Summary Badge */}
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 16,
          background: totalPending > 0 ? '#FFF3BF' : HP_TOKENS.sageWash,
          border: `1px solid ${totalPending > 0 ? '#FFD43B' : HP_TOKENS.sage}40`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkSoft }}>
            {totalPending > 0 ? `⏳ ${totalPending} task menunggu review` : '✅ Semua sudah direview'}
          </span>
        </div>

        {/* Review Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: HP_TOKENS.inkMute }}>Memuat data review...</div>
        ) : reviewData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: HP_TOKENS.inkMute }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ ...HP_TEXT.body, fontWeight: 700 }}>Belum ada KPI yang di-assign</div>
            <div style={{ ...HP_TEXT.small, marginTop: 4 }}>Buat KPI terlebih dahulu di menu Kelola KPI</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {paginatedReviews.map(kpi => (
              <div key={kpi.kpiId} style={{
                borderRadius: 20, background: HP_TOKENS.card,
                border: `1.5px solid ${HP_TOKENS.line}`, overflow: 'hidden',
              }}>
                {/* KPI Header */}
                <div style={{ 
                  padding: '14px 16px', borderBottom: `1px solid ${HP_TOKENS.line}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: HP_TOKENS.paper,
                }}>
                  <div style={{ fontSize: 18 }}>🎯</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 14 }}>{kpi.kpiTitle}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                        background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue, fontFamily: HP_FONT
                      }}>Bobot: {kpi.weight}%</span>
                      <HPAvatar name={kpi.employeeName} size={16} />
                      <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600 }}>
                        {kpi.employeeName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Task Links */}
                {kpi.links.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: HP_TOKENS.inkMute }}>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>
                      Belum ada task yang di-tag ke KPI ini
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    {kpi.links.map(link => {
                      const st = STATUS_STYLE[link.status] || STATUS_STYLE.pending;
                      const isPending = link.status === 'pending';

                      return (
                        <div key={link.id} style={{
                          padding: '10px 16px',
                          borderBottom: `1px solid ${HP_TOKENS.line}10`,
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          {/* Task Done Indicator */}
                          <div style={{ 
                            width: 20, height: 20, borderRadius: 10,
                            background: link.taskDone ? HP_TOKENS.sage : 'transparent',
                            border: `1.5px solid ${link.taskDone ? HP_TOKENS.sage : HP_TOKENS.line}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {link.taskDone && <HPGlyph name="check" size={10} color="#F4F7F9" />}
                          </div>

                          {/* Task Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              ...HP_TEXT.body, fontSize: 13, fontWeight: 600,
                              color: link.taskDone ? HP_TOKENS.ink : HP_TOKENS.inkSoft,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {link.taskTitle}
                            </div>
                            {link.taskDate && (
                              <div style={{ ...HP_TEXT.small, fontSize: 10, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                                {new Date(link.taskDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </div>
                            )}
                          </div>

                          {/* Status / Actions */}
                          {isPending ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => handleAction(link.id, 'approve')}
                                disabled={actionLoading === link.id}
                                style={{
                                  padding: '5px 10px', borderRadius: 8, border: 'none',
                                  background: HP_TOKENS.sage, color: '#F4F7F9',
                                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 10, cursor: 'pointer',
                                  opacity: actionLoading === link.id ? 0.5 : 1,
                                }}
                              >✓</button>
                              <button
                                onClick={() => handleAction(link.id, 'reject')}
                                disabled={actionLoading === link.id}
                                style={{
                                  padding: '5px 10px', borderRadius: 8, border: 'none',
                                  background: HP_TOKENS.coral, color: '#F4F7F9',
                                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 10, cursor: 'pointer',
                                  opacity: actionLoading === link.id ? 0.5 : 1,
                                }}
                              >✗</button>
                              <button
                                onClick={() => setMoveTarget({ linkId: link.id, show: true })}
                                disabled={actionLoading === link.id}
                                style={{
                                  padding: '5px 8px', borderRadius: 8,
                                  border: `1px solid ${HP_TOKENS.line}`,
                                  background: HP_TOKENS.card, color: HP_TOKENS.blue,
                                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 10, cursor: 'pointer',
                                }}
                              >↗</button>
                            </div>
                          ) : (
                            <span style={{
                              padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                              background: st.bg, color: st.color, fontFamily: HP_FONT,
                            }}>{st.label}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Move Target Selector (inline) */}
                {moveTarget?.show && kpi.links.some(l => l.id === moveTarget.linkId) && (
                  <div style={{
                    padding: '10px 16px', background: HP_TOKENS.blueWash,
                    borderTop: `1px solid ${HP_TOKENS.blue}20`,
                    display: 'flex', gap: 8, alignItems: 'center',
                  }}>
                    <span style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.blue, whiteSpace: 'nowrap' }}>Pindah ke:</span>
                    <select
                      onChange={e => {
                        if (e.target.value) handleAction(moveTarget.linkId, 'move', e.target.value);
                      }}
                      style={{ ...selectStyle, flex: 1, fontSize: 11 }}
                    >
                      <option value="">Pilih KPI...</option>
                      {reviewData
                        .filter(k => k.kpiId !== kpi.kpiId)
                        .map(k => <option key={k.kpiId} value={k.kpiId}>{k.kpiTitle} ({k.weight}%)</option>)}
                    </select>
                    <button
                      onClick={() => setMoveTarget(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <HPGlyph name="close" size={14} color={HP_TOKENS.inkMute} />
                    </button>
                  </div>
                )}
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
    </Modal>
  );
}
