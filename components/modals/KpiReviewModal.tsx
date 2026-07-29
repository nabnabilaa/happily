"use client";

import React, { useState, useEffect } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPBar from "@/components/ui/HPBar";
import Modal from "@/components/ui/Modal";

interface Props {
  onClose: () => void;
}

type ReviewAction = 'approved' | 'revision' | 'rejected' | 'clear';

export default function KpiReviewModal({ onClose }: Props) {
  const { user, notify } = useHP();
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<any>(null);
  const [action, setAction] = useState<ReviewAction>('approved');
  const [note, setNote] = useState('');
  const [penaltyPct, setPenaltyPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // Task harian milik KPI yang sedang dibuka — dasar keputusan ACC, jadi diambil
  // saat KPI dipilih dan bukan sekaligus untuk seluruh daftar (N+1 di modal).
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  /*
   * Hasil kerja yang tidak menempel ke KPI mana pun, dikelompokkan per karyawan.
   *
   * Memilih weekly target itu opsional saat membuat task, jadi grup ini bukan
   * kasus langka. Task-nya tetap pekerjaan orang dan tetap harus terlihat serta
   * bisa di-ACC — kalau tidak, ia menggantung "menunggu ACC" selamanya dan
   * hilang dari pandangan manajer.
   */
  const [unlinkedGroups, setUnlinkedGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // Peran dikirim apa adanya; server memverifikasinya sendiri lewat
  // getRequesterAccess, jadi HR mendapat cakupan lintas divisi tanpa nilai ini
  // perlu dipercaya.
  const kpiListUrl = () => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    return `/api/kpi?userId=${user?.id}&role=${user?.role || 'manager'}&month=${month}&year=${year}`;
  };

  const unlinkedUrl = () => `/api/tasks/unlinked-review?reviewerId=${user?.id}`;

  const loadAll = async () => {
    const [kpiRes, unlinkedRes] = await Promise.all([
      fetch(kpiListUrl()).then(r => r.json()).catch(() => ({})),
      fetch(unlinkedUrl()).then(r => r.json()).catch(() => ({})),
    ]);
    setKpis(kpiRes.kpis || []);
    setUnlinkedGroups(unlinkedRes.groups || []);
  };

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [user?.id]);

  const handleGroupSubmit = async (groupAction: 'approved' | 'revision' | 'rejected') => {
    if (!selectedGroup) return;
    if (groupAction !== 'approved' && !note.trim()) {
      notify('Catatan Wajib', 'Tolong isi catatan/alasan untuk karyawan.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/tasks/unlinked-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: user?.id,
          employeeId: selectedGroup.employeeId,
          action: groupAction,
          note: note.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Gagal');

      const failed = (data.failedTasks || []).length;
      notify(
        groupAction === 'approved' ? 'Hasil Kerja Disetujui' : 'Hasil Kerja Dikembalikan',
        `${data.processed || 0} task diproses.` + (failed > 0 ? ` ${failed} gagal — cek ulang.` : ''),
        failed > 0 ? 'warning' : 'success'
      );

      await loadAll();
      setSelectedGroup(null);
      setNote('');
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('hp_db_update'));
    } catch (e: any) {
      notify('Gagal', e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!selectedKpi?.id) { setTasks([]); return; }
    let cancelled = false;
    setTasksLoading(true);
    fetch(`/api/kpi/tasks?goalId=${selectedKpi.id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setTasks(d.tasks || []); })
      .catch(() => { if (!cancelled) setTasks([]); })
      .finally(() => { if (!cancelled) setTasksLoading(false); });
    return () => { cancelled = true; };
  }, [selectedKpi?.id]);

  const awaitingCount = tasks.filter(t => t.awaitingReview).length;

  const handleSubmit = async () => {
    if (!selectedKpi) return;
    // Catatan wajib hanya untuk keputusan yang merugikan karyawan — mereka
    // berhak tahu alasannya. ACC tidak perlu dibebani formalitas.
    if ((action === 'revision' || action === 'rejected') && !note.trim()) {
      notify('Catatan Wajib', 'Tolong isi catatan/alasan untuk HR/karyawan.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/kpi/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiId: selectedKpi.id, action, note: note.trim(), penaltyPct, reviewedBy: user?.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Gagal');

      if (action === 'approved') {
        const failed = (data.failedTasks || []).length;
        notify(
          'KPI Disetujui',
          `KPI di-ACC beserta ${data.approvedTasks || 0} task harian di dalamnya.` +
            (failed > 0 ? ` ${failed} task gagal diproses — cek ulang.` : ''),
          failed > 0 ? 'warning' : 'success'
        );
      } else {
        const msg = action === 'clear'
          ? `Review dihapus. Progress dikembalikan ke ${data.restoredMetric}.`
          : `KPI ${action === 'rejected' ? 'ditolak' : 'diminta revisi'}. Penalti: ${penaltyPct}% (${data.penaltyAmount} unit).`;
        notify('Review KPI Berhasil', msg, 'success');
      }

      // Refresh list
      await loadAll();
      setSelectedKpi(null);
      setNote('');
      setPenaltyPct(0);
      setAction('approved');
      // Layar lain (kartu KPI, dashboard) ikut memuat ulang keputusan ini.
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('hp_db_update'));
    } catch (e: any) {
      notify('Gagal', e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const reviewColor = (status: string | null) => {
    if (status === 'approved') return HP_TOKENS.sageInk;
    if (status === 'rejected') return HP_TOKENS.coral;
    if (status === 'revision') return HP_TOKENS.warning;
    return HP_TOKENS.inkMute;
  };

  const reviewBg = (status: string | null) => {
    if (status === 'approved') return HP_TOKENS.sageSoft;
    if (status === 'rejected') return HP_TOKENS.coralSoft;
    if (status === 'revision') return HP_TOKENS.yellowWash;
    return HP_TOKENS.paper;
  };

  const reviewLabel = (status: string | null) => {
    if (status === 'approved') return '✅ DI-ACC';
    if (status === 'rejected') return '❌ DITOLAK';
    return '⚠️ REVISI';
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: HP_TOKENS.radiusSm, boxSizing: 'border-box',
    border: `1.5px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 13,
    outline: 'none', background: HP_TOKENS.card, color: HP_TOKENS.ink,
  };

  return (
    <Modal onClose={onClose} title="📋 Review Laporan KPI">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: HP_TOKENS.inkMute, fontFamily: HP_FONT }}>
            Memuat data KPI...
          </div>
        ) : kpis.length === 0 && unlinkedGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: HP_TOKENS.inkMute, fontFamily: HP_FONT }}>
            Tidak ada KPI yang perlu direview bulan ini.
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div style={{
              padding: '12px 14px', borderRadius: HP_TOKENS.radiusSm,
              background: HP_TOKENS.blueWash, border: `1px solid ${HP_TOKENS.blue}25`,
              fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.blue,
            }}>
              💡 Keputusan diambil per KPI, bukan per task harian. Pilih satu KPI untuk melihat target dan task hariannya, lalu ACC — atau tandai Revisi/Tolak + penalti % kalau progressnya tidak sesuai.
            </div>

            {/* KPI List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {kpis.map(kpi => {
                const pct = kpi.metricTarget > 0
                  ? Math.min(100, Math.round((kpi.metricCurrent / kpi.metricTarget) * 100))
                  : 0;
                const isSelected = selectedKpi?.id === kpi.id;
                const hasReview = !!kpi.reviewStatus;

                return (
                  <div
                    key={kpi.id}
                    onClick={() => {
                      setSelectedKpi(isSelected ? null : kpi);
                      setSelectedGroup(null);
                      setNote(kpi.reviewNote || '');
                      setPenaltyPct(kpi.penaltyPct || 0);
                      setAction(
                        kpi.reviewStatus === 'rejected' ? 'rejected'
                          : kpi.reviewStatus === 'revision' ? 'revision'
                            : 'approved'
                      );
                    }}
                    style={{
                      padding: 14, borderRadius: HP_TOKENS.radiusMd, cursor: 'pointer',
                      border: `1.5px solid ${isSelected ? HP_TOKENS.blue : hasReview ? reviewColor(kpi.reviewStatus) + '50' : HP_TOKENS.line}`,
                      background: isSelected ? HP_TOKENS.blueWash : hasReview ? reviewBg(kpi.reviewStatus) : HP_TOKENS.card,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.ink, marginBottom: 2 }}>
                          {kpi.title}
                        </div>
                        <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                          {kpi.assigneeName || 'Karyawan'} · Bobot {kpi.weight}%
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <HPBar value={pct} tone="blue" height={5} />
                          </div>
                          <span style={{ fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.blue, minWidth: 36 }}>
                            {pct}%
                          </span>
                        </div>
                        <div style={{ fontFamily: HP_FONT, fontSize: 10, color: HP_TOKENS.inkMute, marginTop: 4 }}>
                          Progress: {kpi.metricCurrent} / {kpi.metricTarget} {kpi.targetDescription ? `(${kpi.targetDescription})` : ''}
                        </div>
                      </div>
                      {hasReview && (
                        <div style={{
                          padding: '3px 8px', borderRadius: 6, flexShrink: 0,
                          background: reviewBg(kpi.reviewStatus),
                          color: reviewColor(kpi.reviewStatus),
                          fontSize: 9, fontWeight: 700
                        }}>
                          {reviewLabel(kpi.reviewStatus)}
                        </div>
                      )}
                    </div>
                    {hasReview && kpi.reviewNote && (
                      <div style={{ marginTop: 8, fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkSoft, fontStyle: 'italic' }}>
                        📝 "{kpi.reviewNote}"
                        {kpi.penaltyPct > 0 && <span style={{ color: HP_TOKENS.coralInk, fontStyle: 'normal', fontWeight: 700 }}> · Penalti {kpi.penaltyPct}%</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hasil kerja tanpa KPI — satu grup per karyawan.
                Task ini tidak menempel ke target mana pun karena memilih weekly
                target itu opsional. Tetap ditampilkan: itu pekerjaan yang sudah
                mereka selesaikan, dan tanpa jalur ini ia menggantung selamanya. */}
            {unlinkedGroups.length > 0 && (
              <div>
                <div style={{ fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 8 }}>
                  HASIL KERJA TANPA KPI ({unlinkedGroups.length} ORANG)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {unlinkedGroups.map(grp => {
                    const isSelected = selectedGroup?.employeeId === grp.employeeId;
                    return (
                      <div
                        key={grp.employeeId}
                        onClick={() => {
                          setSelectedGroup(isSelected ? null : grp);
                          setSelectedKpi(null);
                          setNote('');
                        }}
                        style={{
                          padding: 14, borderRadius: HP_TOKENS.radiusMd, cursor: 'pointer',
                          border: `1.5px solid ${isSelected ? HP_TOKENS.blue : HP_TOKENS.line}`,
                          background: isSelected ? HP_TOKENS.blueWash : HP_TOKENS.card,
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, color: HP_TOKENS.ink }}>
                              {grp.employeeName}
                            </div>
                            <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkMute, marginTop: 2 }}>
                              {grp.tasks.length} task selesai · belum terhubung ke KPI
                            </div>
                          </div>
                          <div style={{
                            flexShrink: 0, padding: '3px 8px', borderRadius: 6,
                            background: HP_TOKENS.yellowSoft, color: HP_TOKENS.yellowDark,
                            fontSize: 9, fontWeight: 700,
                          }}>
                            MENUNGGU ACC
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form keputusan untuk grup tanpa KPI. Tidak ada penalti di sini —
                penalti memotong `metric_current`, dan grup ini tidak punya metrik. */}
            {selectedGroup && (
              <div style={{
                padding: 16, borderRadius: HP_TOKENS.radiusMd,
                border: `1.5px solid ${HP_TOKENS.blue}30`, background: HP_TOKENS.blueWash,
              }}>
                <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, color: HP_TOKENS.blue, marginBottom: 12 }}>
                  REVIEW: HASIL KERJA {selectedGroup.employeeName.toUpperCase()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
                  {selectedGroup.tasks.map((t: any) => (
                    <div key={t.id} style={{
                      padding: '8px 10px', borderRadius: HP_TOKENS.radiusSm,
                      background: HP_TOKENS.card, border: `1px solid ${HP_TOKENS.lineSoft}`,
                    }}>
                      <div style={{ fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.ink }}>
                        {t.title}
                      </div>
                      {t.proofNotes && (
                        <div style={{ fontFamily: HP_FONT, fontSize: 10, color: HP_TOKENS.inkMute, fontStyle: 'italic', marginTop: 2 }}>
                          "{t.proofNotes}"
                        </div>
                      )}
                      {(t.proofLinks || []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                          {t.proofLinks.map((link: string, i: number) => (
                            <a
                              key={i} href={link} target="_blank" rel="noopener noreferrer"
                              style={{ fontFamily: HP_FONT, fontSize: 10, fontWeight: 700, color: HP_TOKENS.blue, textDecoration: 'none' }}
                            >
                              📎 Bukti {t.proofLinks.length > 1 ? i + 1 : ''}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                    CATATAN (wajib untuk Revisi/Tolak)
                  </div>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Catatan untuk karyawan. Wajib diisi kalau kamu meminta revisi atau menolak."
                    rows={2}
                    style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleGroupSubmit('approved')}
                    disabled={submitting}
                    style={{
                      flex: 2, padding: 12, borderRadius: HP_TOKENS.radiusSm, border: 'none',
                      background: HP_TOKENS.sage, color: HP_TOKENS.onPrimary,
                      fontFamily: HP_FONT, fontWeight: 700, fontSize: 13,
                      cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? 'Memproses...' : `✅ ACC ${selectedGroup.tasks.length} Task`}
                  </button>
                  <button
                    onClick={() => handleGroupSubmit('revision')}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: 12, borderRadius: HP_TOKENS.radiusSm,
                      border: `1.5px solid ${HP_TOKENS.yellow}`, background: HP_TOKENS.card,
                      color: HP_TOKENS.yellowInk, fontFamily: HP_FONT, fontWeight: 700, fontSize: 13,
                      cursor: submitting ? 'default' : 'pointer',
                    }}
                  >
                    Revisi
                  </button>
                  <button
                    onClick={() => handleGroupSubmit('rejected')}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: 12, borderRadius: HP_TOKENS.radiusSm,
                      border: `1.5px solid ${HP_TOKENS.coral}`, background: HP_TOKENS.card,
                      color: HP_TOKENS.coralInk, fontFamily: HP_FONT, fontWeight: 700, fontSize: 13,
                      cursor: submitting ? 'default' : 'pointer',
                    }}
                  >
                    Tolak
                  </button>
                </div>
              </div>
            )}

            {/* Review Form — shown when KPI is selected */}
            {selectedKpi && (
              <div style={{
                padding: 16, borderRadius: HP_TOKENS.radiusMd,
                border: `1.5px solid ${HP_TOKENS.blue}30`, background: HP_TOKENS.blueWash,
              }}>
                <div style={{ fontFamily: HP_FONT, fontWeight: 700, fontSize: 12, color: HP_TOKENS.blue, marginBottom: 12 }}>
                  REVIEW: {selectedKpi.title}
                </div>

                {/* Target — angka yang sedang dinilai, dieja ulang di sini supaya
                    keputusan diambil tanpa harus menggulir balik ke daftar. */}
                <div style={{
                  padding: '10px 12px', borderRadius: HP_TOKENS.radiusSm, marginBottom: 12,
                  background: HP_TOKENS.card, border: `1px solid ${HP_TOKENS.line}`,
                }}>
                  <div style={{ fontFamily: HP_FONT, fontSize: 10, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 4 }}>
                    TARGET
                  </div>
                  <div style={{ fontFamily: HP_FONT, fontSize: 13, fontWeight: 700, color: HP_TOKENS.ink }}>
                    {selectedKpi.metricCurrent} / {selectedKpi.metricTarget}
                    {selectedKpi.metricUnit ? ` ${selectedKpi.metricUnit}` : ''}
                  </div>
                  {selectedKpi.targetDescription && (
                    <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkSoft, marginTop: 2 }}>
                      {selectedKpi.targetDescription}
                    </div>
                  )}
                </div>

                {/* Task harian pendukung — bukti kerja di balik angka di atas. */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                    TASK HARIAN ({tasks.length}){awaitingCount > 0 ? ` · ${awaitingCount} MENUNGGU ACC` : ''}
                  </div>
                  {tasksLoading ? (
                    <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkMute, padding: '8px 0' }}>
                      Memuat task…
                    </div>
                  ) : tasks.length === 0 ? (
                    <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkMute, padding: '8px 0' }}>
                      Belum ada task harian yang menempel ke KPI ini.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                      {tasks.map(t => (
                        <div key={t.id} style={{
                          padding: '8px 10px', borderRadius: HP_TOKENS.radiusSm,
                          background: HP_TOKENS.card,
                          border: `1px solid ${t.awaitingReview ? HP_TOKENS.yellow + '60' : HP_TOKENS.lineSoft}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.ink }}>
                                {t.title}
                              </div>
                              {t.proofNotes && (
                                <div style={{ fontFamily: HP_FONT, fontSize: 10, color: HP_TOKENS.inkMute, fontStyle: 'italic', marginTop: 2 }}>
                                  "{t.proofNotes}"
                                </div>
                              )}
                              {(t.proofLinks || []).length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                  {t.proofLinks.map((link: string, i: number) => (
                                    <a
                                      key={i} href={link} target="_blank" rel="noopener noreferrer"
                                      style={{ fontFamily: HP_FONT, fontSize: 10, fontWeight: 700, color: HP_TOKENS.blue, textDecoration: 'none' }}
                                    >
                                      📎 Bukti {t.proofLinks.length > 1 ? i + 1 : ''}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{
                              flexShrink: 0, padding: '2px 7px', borderRadius: 5, fontSize: 8, fontWeight: 700,
                              background: t.verified ? HP_TOKENS.sageSoft : t.awaitingReview ? HP_TOKENS.yellowSoft : HP_TOKENS.paper,
                              color: t.verified ? HP_TOKENS.sageInk : t.awaitingReview ? HP_TOKENS.yellowDark : HP_TOKENS.inkMute,
                            }}>
                              {t.verified ? 'DI-ACC' : t.awaitingReview ? 'MENUNGGU' : t.done ? 'SELESAI' : 'BERJALAN'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Selector */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 6 }}>TINDAKAN</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {([
                      { key: 'approved', label: '✅ ACC', bg: HP_TOKENS.sageSoft, color: HP_TOKENS.sageInk },
                      { key: 'revision', label: '⚠️ Minta Revisi', bg: HP_TOKENS.yellowWash, color: HP_TOKENS.yellowInk },
                      { key: 'rejected', label: '❌ Tolak', bg: HP_TOKENS.coralSoft, color: HP_TOKENS.coralInk },
                      ...(selectedKpi.reviewStatus ? [{ key: 'clear', label: '↩️ Hapus Flag', bg: HP_TOKENS.paper, color: HP_TOKENS.inkSoft }] : [])
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setAction(opt.key as any)}
                        style={{
                          flex: 1, padding: '9px 6px', borderRadius: HP_TOKENS.radiusSm, cursor: 'pointer',
                          border: `1.5px solid ${action === opt.key ? opt.color + '60' : HP_TOKENS.line}`,
                          background: action === opt.key ? opt.bg : HP_TOKENS.card,
                          color: action === opt.key ? opt.color : HP_TOKENS.inkMute,
                          fontFamily: HP_FONT, fontWeight: 700, fontSize: 11,
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {action === 'approved' && (
                  <div style={{
                    padding: '10px 14px', borderRadius: HP_TOKENS.radiusSm, marginBottom: 12,
                    background: HP_TOKENS.sageSoft, border: `1px solid ${HP_TOKENS.sage}40`,
                    fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.sageInk,
                  }}>
                    {awaitingCount > 0
                      ? `✅ KPI ini akan di-ACC beserta ${awaitingCount} task harian yang masih menunggu. Poin task mereka ikut cair.`
                      : '✅ KPI ini akan di-ACC. Tidak ada task harian yang menunggu review.'}
                  </div>
                )}

                {(action === 'revision' || action === 'rejected') && (
                  <>
                    {/* Penalty % */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                        PENALTI PROGRESS (%) — {penaltyPct}% dari progress saat ini
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        {[0, 10, 20, 30, 50].map(p => (
                          <button
                            key={p}
                            onClick={() => setPenaltyPct(p)}
                            style={{
                              flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: penaltyPct === p ? HP_TOKENS.coral : HP_TOKENS.lineSoft,
                              color: penaltyPct === p ? '#fff' : HP_TOKENS.inkSoft,
                              fontFamily: HP_FONT, fontWeight: 700, fontSize: 11,
                              transition: 'all 0.15s',
                            }}
                          >
                            {p === 0 ? 'Tanpa' : `-${p}%`}
                          </button>
                        ))}
                      </div>
                      <input
                        type="range" min="0" max="100" value={penaltyPct}
                        onChange={e => setPenaltyPct(Number(e.target.value))}
                        style={{ width: '100%', accentColor: HP_TOKENS.coral }}
                      />
                      {penaltyPct > 0 && (
                        <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.coralInk, fontWeight: 700, marginTop: 4 }}>
                          Progress akan berkurang: {selectedKpi.metricCurrent} → {Math.max(0, Math.round(selectedKpi.metricCurrent * (1 - penaltyPct / 100)))}
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                        CATATAN (wajib diisi) *
                      </div>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Jelaskan kenapa KPI ini perlu direvisi/ditolak. Catatan ini akan terlihat oleh karyawan."
                        rows={3}
                        style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                      />
                    </div>
                  </>
                )}

                {action === 'clear' && (
                  <div style={{
                    padding: '10px 14px', borderRadius: HP_TOKENS.radiusSm, marginBottom: 12,
                    background: HP_TOKENS.sageSoft, border: `1px solid ${HP_TOKENS.sage}40`,
                    fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.sageInk,
                  }}>
                    ✅ Flag review akan dihapus dan progress dikembalikan ke nilai semula.
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setSelectedKpi(null)}
                    style={{
                      flex: 1, padding: 12, borderRadius: HP_TOKENS.radiusSm,
                      border: `1.5px solid ${HP_TOKENS.line}`, background: HP_TOKENS.card,
                      fontFamily: HP_FONT, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: HP_TOKENS.inkMute,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      flex: 2, padding: 12, borderRadius: HP_TOKENS.radiusSm, border: 'none',
                      background: action === 'approved' ? HP_TOKENS.sage : action === 'clear' ? HP_TOKENS.inkMute : action === 'rejected' ? HP_TOKENS.coral : HP_TOKENS.warning,
                      color: '#fff', fontFamily: HP_FONT, fontWeight: 700, fontSize: 13,
                      cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? 'Memproses...' :
                      action === 'approved' ? '✅ ACC KPI' :
                        action === 'clear' ? '↩️ Hapus Flag' :
                          action === 'rejected' ? '❌ Tolak KPI' : '⚠️ Kirim Revisi'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
