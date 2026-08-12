"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_TEXT, HP_FONT } from "@/lib/constants";
import { useHP } from "@/lib/HPContext";
import HPCard from "@/components/ui/HPCard";
import HPChip from "@/components/ui/HPChip";
import HPBar from "@/components/ui/HPBar";
import HPGlyph from "@/components/ui/HPGlyph";
import { isAwaitingReview } from "@/lib/taskStatus";
import { SHOW_EMPLOYEE_PENDING_REVIEW, SHOW_EMPLOYEE_REVIEW_OUTCOME } from "@/lib/featureFlags";

interface GoalCardProps {
  g: any;
  isReadOnly?: boolean;
  tasks?: any[];
  onEditProgress?: (progress: number) => void;
  /**
   * Menyunting progres dalam satuan asli KPI (12 dari 20 buku), bukan persen.
   * Dipakai KPI mandiri: `target_value` dan `metric_unit`-nya ditulis karyawan
   * sendiri, jadi slider 0-100% membuang justru angka yang dia pedulikan.
   * Kalau diisi, `onEditProgress` menerima nilai absolut, bukan persentase.
   */
  absoluteProgress?: { current: number; target: number; unit: string } | null;
  /**
   * Menampilkan kartu dari sudut pandang manajer/HR: bukti kerja anggota ikut
   * tampil. Bukan wewenang memutus — ACC diberikan per KPI di Review KPI.
   */
  managerMode?: boolean;
  onViewDetails?: () => void;
}

export default function GoalCard({ g, isReadOnly, tasks, onEditProgress, absoluteProgress, managerMode, onViewDetails }: GoalCardProps) {
  const { state, updateState, notify } = useHP();
  // Two maps, not one. A tone has to do two jobs with two different contrast
  // duties: tint a fill or a track (3:1 is plenty) and carry a percentage
  // figure (4.5:1). One map meant the figure inherited the fill's shade — and
  // `yellow` as text is 2.2:1 on white, effectively invisible.
  const tones: Record<string, string> = {
    sage: HP_TOKENS.sage,
    blue: HP_TOKENS.blue,
    lavender: HP_TOKENS.lavender,
    yellow: HP_TOKENS.yellow,
    coral: HP_TOKENS.coral,
  };
  const toneInks: Record<string, string> = {
    sage: HP_TOKENS.sageInk,
    blue: HP_TOKENS.blue,
    lavender: HP_TOKENS.lavenderInk,
    yellow: HP_TOKENS.yellowInk,
    coral: HP_TOKENS.coralInk,
  };

  /**
   * Konsol manager/HR selalu melihat status review — di sana itu memang
   * pekerjaannya. Di sisi karyawan dibedakan dua hal:
   *
   *  - MENUNGGU keputusan: disembunyikan. Tidak ada yang bisa ia kerjakan, dan
   *    badge "PENDING" membuat KPI yang ia buat sendiri terasa seperti
   *    pengajuan yang menanti restu.
   *  - HASIL yang menuntut tindakan (revisi/ditolak, berikut catatannya):
   *    ditampilkan. Di sinilah ada yang harus ia perbaiki — dan di jalur task,
   *    di sinilah poinnya ditarik kembali.
   */
  const showReviewPending = Boolean(managerMode) || SHOW_EMPLOYEE_PENDING_REVIEW;
  const showReviewOutcome = Boolean(managerMode) || SHOW_EMPLOYEE_REVIEW_OUTCOME;
  const statusNeedsAction = g.status === 'rejected' || g.status === 'revision';
  const showStatusBadge = showReviewPending || (showReviewOutcome && statusNeedsAction);

  const [showHistory, setShowHistory] = useState(false);
  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Weekly Targets
  const [weeklyTargets, setWeeklyTargets] = useState<any[]>([]);
  const [loadingWeeklyTargets, setLoadingWeeklyTargets] = useState(false);
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [newTargetTitle, setNewTargetTitle] = useState('');
  const [newTargetValue, setNewTargetValue] = useState('100');
  const [newTargetUnit, setNewTargetUnit] = useState('%');
  const [savingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    async function fetchWeeklyTargets() {
      if (!g.id) return;
      setLoadingWeeklyTargets(true);
      try {
        const res = await fetch(`/api/kpi/weekly-targets?kpiId=${g.id}`);
        const data = await res.json();
        setWeeklyTargets(data.weeklyTargets || []);
      } catch (e) {
        console.error("Failed to load weekly targets for GoalCard:", e);
      } finally {
        setLoadingWeeklyTargets(false);
      }
    }
    fetchWeeklyTargets();

    const handleUpdate = () => {
      fetchWeeklyTargets();
    };
    window.addEventListener('hp_db_update', handleUpdate);
    return () => window.removeEventListener('hp_db_update', handleUpdate);
  }, [g.id]);

  const fetchHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setLoadingHistory(true);
    setShowHistory(true);
    try {
      const res = await fetch(`/api/kpi/tasks?goalId=${g.id}`);
      const data = await res.json();
      if (data.tasks) setHistoryTasks(data.tasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const parentGoal = g.parent_id ? state?.goals.find((item: any) => String(item.id) === String(g.parent_id)) : null;

  // All priorities from state (used for weekly_target_id lookups which don't need goal filtering)
  const allPriorities = tasks || state?.priorities || [];
  // Link to actual priorities (tasks) in state that are connected to this goal
  const linkedTasks = allPriorities.filter((p: any) =>
    (p.goal_id && String(p.goal_id) === String(g.id)) ||
    (p.goalId && String(p.goalId) === String(g.id)) ||
    (p.kpi_id && String(p.kpi_id) === String(g.id)) ||
    (p.kpiId && String(p.kpiId) === String(g.id))
  );
  const hasTodayTasks = linkedTasks.length > 0;
  // Submitted-but-unverified work, for the manager review block below.
  const tasksAwaitingReview = managerMode
    ? linkedTasks.filter((t: any) => isAwaitingReview(t))
    : [];
  const hasTasks = hasTodayTasks || (g.metric && String(g.metric).includes('task selesai'));
  const doneTaskCount = linkedTasks.filter((p: any) => p.done).length;
  // Hitung progress dengan mempertimbangkan partial_progress (anti double-count)
  const taskProgress = hasTodayTasks
    ? Math.round(linkedTasks.reduce((sum: number, t: any) => {
        const contrib = t.done ? 100 : (t.partial_progress || 0);
        return sum + contrib;
      }, 0) / linkedTasks.length)
    : null;
  
  // Untuk KPI dari API: hitung dari task count per weekly target (bukan DB currentValue)
  // Pakai allPriorities (bukan linkedTasks) karena task lama mungkin tidak punya goal_id yang cocok
  const weeklyTargetsProgress = weeklyTargets.length > 0
    ? Math.round(
        weeklyTargets.reduce((sum: number, wt: any) => {
          const wtTasks = allPriorities.filter((t: any) =>
            (t.weekly_target_id && String(t.weekly_target_id) === String(wt.id)) ||
            (t.weeklyTargetId && String(t.weeklyTargetId) === String(wt.id))
          );
          const pct = wtTasks.length > 0
            ? Math.round(wtTasks.reduce((s: number, t: any) => s + (t.done ? 100 : (t.partial_progress || 0)), 0) / wtTasks.length)
            : Math.min(100, Math.round(((wt.currentValue || 0) / (wt.targetValue || 100)) * 100));
          return sum + pct;
        }, 0) / weeklyTargets.length
      )
    : null;

  // Final display progress: weekly targets progress (untuk KPI) > task progress > stored progress
  const rollupFromTargets = g.isApiKpi && weeklyTargetsProgress !== null;
  const displayProgress = rollupFromTargets
    ? weeklyTargetsProgress
    : hasTodayTasks && taskProgress !== null
      ? taskProgress
      : (g.progress || 0);

  /**
   * Begitu KPI punya target mingguan, angkanya dihitung naik dari target-target
   * itu (lihat `displayProgress`) — nilai yang disimpan manual tidak lagi
   * terpakai. Menyisakan tombol edit di sana berarti menawarkan suntingan yang
   * diam-diam tidak berpengaruh, jadi editor satuan-asli hanya hidup selama KPI
   * itu masih berdiri sendiri.
   */
  const canEditProgress = Boolean(onEditProgress) && !(absoluteProgress && rollupFromTargets);

  const deleteGoal = () => {
    if (isReadOnly) return;
    updateState((s: any) => ({
      ...s,
      goals: s.goals.filter((item: any) => String(item.id) !== String(g.id))
    }));
    notify('Goal Dihapus', `Goal "${g.title}" telah dihapus.`, 'info');
    setShowDeleteModal(false);
  };

  // Catatan: kartu ini menampilkan task sebagai bacaan saja — satu-satunya aksi
  // task di sini milik manager (verify/reject di bawah). Toggle "selesai" milik
  // TaskHarianWidget dan TaskCompleteModal, yang menulis lewat
  // /api/priorities/complete. Versi sebelumnya menyimpan salinan toggle di sini
  // yang hanya mengubah React state; itu sudah dihapus, bukan disambungkan,
  // karena tidak pernah ada yang memanggilnya.

  const toneColor = tones[g.tone] || HP_TOKENS.sage;
  /** Same tone, legible. Use for any text or glyph; `toneColor` for surfaces. */
  const toneInk = toneInks[g.tone] || HP_TOKENS.sageInk;

  // Manager mode: expandable task detail
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  };

  // Editable progress state (for manager)
  const [editingProgress, setEditingProgress] = useState(false);
  const [tempProgress, setTempProgress] = useState(String(displayProgress));
  
  return (
    <HPCard padding={16} style={{ 
      border: `1.5px solid ${HP_TOKENS.line}`,
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: HP_TOKENS.radiusSm, 
          background: `${toneColor}15`, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <HPGlyph name="target" size={16} color={toneInk} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {showStatusBadge && g.status && (
                <div style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: g.status === 'approved' ? HP_TOKENS.sageSoft : g.status === 'rejected' ? HP_TOKENS.coralSoft : g.status === 'revision' ? HP_TOKENS.yellowSoft : HP_TOKENS.yellowSoft,
                  color: g.status === 'approved' ? HP_TOKENS.sage : g.status === 'rejected' ? HP_TOKENS.coral : HP_TOKENS.yellowDark,
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.5
                }}>
                  {g.status === 'approved' ? 'ACCEPT' : g.status === 'revision' ? 'REVISI' : g.status === 'rejected' ? 'REJECT' : 'PENDING'}
                </div>
              )}
              {/* Review status badge from HR/Manager */}
              {showReviewOutcome && g.reviewStatus === 'revision' && (
                <div style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: HP_TOKENS.yellowWash, color: HP_TOKENS.yellowInk,
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 3
                }}>⚠️ PERLU REVISI</div>
              )}
              {showReviewOutcome && g.reviewStatus === 'rejected' && (
                <div style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: HP_TOKENS.coralSoft, color: HP_TOKENS.coralInk,
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 3
                }}>❌ DITOLAK</div>
              )}
              {displayProgress >= 100 && (!showReviewOutcome || !g.reviewStatus) && (
                <div style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: HP_TOKENS.sageSoft, color: HP_TOKENS.sageInk,
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.5
                }}>DONE</div>
              )}
            </div>
            
            {!isReadOnly && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: HP_TOKENS.lineSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: HP_TOKENS.inkFade, fontWeight: 700, lineHeight: 1 }}>×</span>
                </div>
              </button>
            )}
          </div>

          <div style={{ ...HP_TEXT.h, fontSize: 16, lineHeight: 1.4, color: HP_TOKENS.ink, marginTop: 4 }}>
            {g.title}
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: 20, padding: 12, borderRadius: HP_TOKENS.radiusSm,
        background: HP_TOKENS.sunken
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HPGlyph name="calendar" size={12} color={HP_TOKENS.inkFade} />
            <span style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkFade, fontSize: 11 }}>
              Due: {g.due ? g.due.split(' ')[0] : '-'}
            </span>
          </div>
          <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.ink, fontSize: 12 }}>
            {weeklyTargets.length > 0
              ? `${weeklyTargets.length} target mingguan`
              : hasTodayTasks
                ? `${doneTaskCount}/${linkedTasks.length} task selesai` 
                : (g.metric && String(g.metric).includes('task selesai')) 
                  ? String(g.metric) 
                  : (displayProgress >= 100 ? 'Target Tercapai ✨' : (g.metric || 'Progress'))
            }
          </div>
        </div>

        {/* Bar Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
               <span style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 700 }}>PROGRESS</span>
               {editingProgress ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }} onClick={(e) => e.stopPropagation()}>
                    {absoluteProgress ? (
                      <>
                        <input
                          type="number" min="0" max={absoluteProgress.target || undefined} inputMode="decimal"
                          value={tempProgress}
                          onChange={(e) => setTempProgress(e.target.value)}
                          autoFocus
                          style={{
                            width: 78, padding: '6px 10px', borderRadius: 8,
                            border: `1.5px solid ${HP_TOKENS.line}`, background: HP_TOKENS.card,
                            color: HP_TOKENS.ink, fontFamily: HP_FONT, fontSize: 13, fontWeight: 700,
                            outline: 'none',
                          }}
                        />
                        <span style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, fontWeight: 700, flex: 1 }}>
                          dari {absoluteProgress.target} {absoluteProgress.unit}
                        </span>
                      </>
                    ) : (
                      <>
                        <input
                          type="range" min="0" max="100"
                          value={tempProgress}
                          onChange={(e) => setTempProgress(e.target.value)}
                          style={{
                            flex: 1, accentColor: toneColor, cursor: 'pointer', height: 6
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: toneInk, minWidth: 35, textAlign: 'right' }}>
                          {tempProgress}%
                        </span>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const ceiling = absoluteProgress
                          ? (absoluteProgress.target > 0 ? absoluteProgress.target : Number(tempProgress))
                          : 100;
                        const val = Math.max(0, Math.min(ceiling, Number(tempProgress) || 0));
                        onEditProgress?.(val);
                        setEditingProgress(false);
                      }}
                      style={{
                        padding: '5px 12px', borderRadius: 8, border: 'none',
                        background: HP_TOKENS.sage, color: HP_TOKENS.onPrimary, fontSize: 11,
                        fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      ✓ Simpan
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingProgress(false); }}
                      style={{
                        padding: '5px 8px', borderRadius: 8, border: `1.5px solid ${HP_TOKENS.line}`,
                        background: HP_TOKENS.card, color: HP_TOKENS.inkFade, fontSize: 11,
                        fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      ✕ Batal
                    </button>
                  </div>
               ) : (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: canEditProgress ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    if (canEditProgress) {
                      e.stopPropagation();
                      setTempProgress(String(absoluteProgress ? absoluteProgress.current : displayProgress));
                      setEditingProgress(true);
                    }
                  }}
                >
                  <span style={{ ...HP_TEXT.h, fontSize: 13, color: toneInk }}>{displayProgress}%</span>
                  {canEditProgress && (
                    <span style={{
                      fontSize: 10, color: toneInk, opacity: 0.6,
                      padding: '2px 6px', borderRadius: 6, background: `${toneColor}10`,
                      fontWeight: 700
                    }}>✏️ edit</span>
                  )}
                </div>
               )}
            </div>
            <HPBar value={displayProgress} tone={g.tone} height={8}/>
          </div>
        </div>
      </div>

      {/* Review Note Banner — shown to employee when flagged */}
      {showReviewOutcome && g.reviewStatus && g.reviewNote && (
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: HP_TOKENS.radiusSm,
          background: g.reviewStatus === 'rejected' ? HP_TOKENS.coralSoft : HP_TOKENS.yellowWash,
          border: `1px solid ${g.reviewStatus === 'rejected' ? HP_TOKENS.coral + '40' : HP_TOKENS.yellow}`,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ display: 'flex', flexShrink: 0 }}><HPGlyph name={g.reviewStatus === 'rejected' ? 'close' : 'alertCircle'} size={14} color="currentColor" /></span>
          <div>
            <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, color: g.reviewStatus === 'rejected' ? HP_TOKENS.coral : HP_TOKENS.yellowDark, marginBottom: 2 }}>
              {g.reviewStatus === 'rejected' ? 'KPI Ditolak oleh HR/Manager' : 'Catatan Revisi dari HR/Manager'}
            </div>
            <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkSoft, lineHeight: 1.4 }}>{g.reviewNote}</div>
            {g.penaltyPct > 0 && (
              <div style={{ marginTop: 4, fontFamily: HP_FONT, fontSize: 10, fontWeight: 700, color: HP_TOKENS.coralInk }}>
                Penalti progress: -{g.penaltyPct}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bukti kerja yang menunggu keputusan — TANPA tombol.

          ACC tidak lagi diberikan per task harian. Satu keputusan diambil di
          tingkat KPI lewat Review KPI (`KpiReviewModal` + POST /api/kpi/review),
          dan keputusan itulah yang mencairkan seluruh task di bawahnya
          sekaligus. Daftar ini tetap ada karena manajer butuh melihat apa yang
          sedang ia setujui; yang dicabut cuma wewenang memutus di sini, supaya
          tidak ada dua sumber kebenaran untuk status task yang sama. */}
      {managerMode && tasksAwaitingReview.length > 0 && (
        <div style={{ marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            ...HP_TEXT.tiny, fontWeight: 700, color: HP_TOKENS.yellowInk,
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <HPGlyph name="zap" size={12} color={HP_TOKENS.yellowInk} />
            MENUNGGU ACC ({tasksAwaitingReview.length}) — DIPUTUS DI REVIEW KPI
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasksAwaitingReview.map((t: any) => {
              const links: string[] = Array.isArray(t.proofLinks) ? t.proofLinks : [];

              return (
                <div key={t.id} style={{
                  padding: '10px 12px', borderRadius: HP_TOKENS.radiusSm,
                  background: HP_TOKENS.yellowWash, border: `1px solid ${HP_TOKENS.yellow}40`,
                }}>
                  <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.ink, fontSize: 12 }}>
                    {t.title}
                  </div>

                  {(t.notes || links.length > 0 || t.metricValue !== null) && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {t.metricValue !== null && t.metricValue !== undefined && (
                        <div style={{ ...HP_TEXT.tiny, fontSize: 10, color: HP_TOKENS.inkSoft }}>
                          Hasil: {t.metricValue}
                        </div>
                      )}
                      {t.notes && (
                        <div style={{ ...HP_TEXT.tiny, fontSize: 10, color: HP_TOKENS.inkMute, fontStyle: 'italic' }}>
                          “{t.notes}”
                        </div>
                      )}
                      {links.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {links.map((link: string, i: number) => (
                            <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                              style={{ ...HP_TEXT.tiny, fontSize: 10, fontWeight: 700, color: HP_TOKENS.blue, textDecoration: 'none' }}>
                              📎 Bukti {links.length > 1 ? i + 1 : ''}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Button Lihat Detail */}
      {onViewDetails && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            className="hp-tap"
            style={{
              width: '100%', padding: '12px', borderRadius: HP_TOKENS.radiusSm, border: `1.5px solid ${HP_TOKENS.lineSoft}`,
              background: '#fff', color: HP_TOKENS.ink,
              fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Lihat Detail Target & Task <span><HPGlyph name="arrow" size={12} color="currentColor" /></span>
          </button>
        </div>
      )}



      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: HP_TOKENS.radiusLg, padding: 32,
            width: '100%', maxWidth: 400, textAlign: 'center',
            boxShadow: HP_TOKENS.shadowLg,
            animation: 'hpPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: HP_TOKENS.coralWash, color: HP_TOKENS.coralInk, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <HPGlyph name="target" size={32} />
            </div>
            <div style={{ ...HP_TEXT.h, fontSize: 20, marginBottom: 8 }}>Hapus Target/KPI?</div>
            <div style={{ ...HP_TEXT.body, color: HP_TOKENS.inkSoft, marginBottom: 24 }}>
              Apakah Anda yakin ingin menghapus Target/KPI <b>"{g.title}"</b>?
            </div>
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <button onClick={(e) => { e.stopPropagation(); deleteGoal(); }} className="hp-tap" style={{
                padding: '16px', borderRadius: HP_TOKENS.radiusMd, border: 'none',
                background: HP_TOKENS.coral, color: '#fff',
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Ya, Hapus
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(false); }} className="hp-tap" style={{
                padding: '16px', borderRadius: HP_TOKENS.radiusMd, border: 'none',
                background: HP_TOKENS.lineSoft, color: HP_TOKENS.inkSoft,
                fontFamily: HP_FONT, fontWeight: 700, fontSize: 16, cursor: 'pointer',
                width: '100%'
              }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </HPCard>
  );
}

