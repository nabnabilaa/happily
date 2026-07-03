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

export default function KpiReviewModal({ onClose }: Props) {
  const { user, notify } = useHP();
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<any>(null);
  const [action, setAction] = useState<'revision' | 'rejected' | 'clear'>('revision');
  const [note, setNote] = useState('');
  const [penaltyPct, setPenaltyPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    setLoading(true);
    fetch(`/api/kpi?userId=${user.id}&role=manager&month=${month}&year=${year}`)
      .then(r => r.json())
      .then(d => setKpis(d.kpis || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!selectedKpi) return;
    if (action !== 'clear' && !note.trim()) {
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

      const msg = action === 'clear'
        ? `Review dihapus. Progress dikembalikan ke ${data.restoredMetric}.`
        : `KPI ${action === 'rejected' ? 'ditolak' : 'diminta revisi'}. Penalti: ${penaltyPct}% (${data.penaltyAmount} unit).`;
      notify('Review KPI Berhasil', msg, 'success');

      // Refresh list
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const updated = await fetch(`/api/kpi?userId=${user?.id}&role=manager&month=${month}&year=${year}`).then(r => r.json());
      setKpis(updated.kpis || []);
      setSelectedKpi(null);
      setNote('');
      setPenaltyPct(0);
      setAction('revision');
    } catch (e: any) {
      notify('Gagal', e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const reviewColor = (status: string | null) => {
    if (status === 'rejected') return HP_TOKENS.coral;
    if (status === 'revision') return '#D4A017';
    return HP_TOKENS.inkMute;
  };

  const reviewBg = (status: string | null) => {
    if (status === 'rejected') return HP_TOKENS.coralSoft;
    if (status === 'revision') return '#FFF3CC';
    return HP_TOKENS.paper;
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
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
        ) : kpis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: HP_TOKENS.inkMute, fontFamily: HP_FONT }}>
            Tidak ada KPI yang perlu direview bulan ini.
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              background: HP_TOKENS.blueWash, border: `1px solid ${HP_TOKENS.blue}25`,
              fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.blue,
            }}>
              💡 Pilih KPI yang perlu ditinjau. Jika progress tidak sesuai, tandai dengan Revisi atau Tolak + penalti %.
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
                      setNote(kpi.reviewNote || '');
                      setPenaltyPct(kpi.penaltyPct || 0);
                      setAction(kpi.reviewStatus === 'rejected' ? 'rejected' : 'revision');
                    }}
                    style={{
                      padding: 14, borderRadius: 14, cursor: 'pointer',
                      border: `1.5px solid ${isSelected ? HP_TOKENS.blue : hasReview ? reviewColor(kpi.reviewStatus) + '50' : HP_TOKENS.line}`,
                      background: isSelected ? HP_TOKENS.blueWash : hasReview ? reviewBg(kpi.reviewStatus) : HP_TOKENS.card,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, color: HP_TOKENS.ink, marginBottom: 2 }}>
                          {kpi.title}
                        </div>
                        <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                          {kpi.assigneeName || 'Karyawan'} · Bobot {kpi.weight}%
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <HPBar value={pct} tone="blue" height={5} />
                          </div>
                          <span style={{ fontFamily: HP_FONT, fontSize: 12, fontWeight: 800, color: HP_TOKENS.blue, minWidth: 36 }}>
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
                          fontSize: 9, fontWeight: 900
                        }}>
                          {kpi.reviewStatus === 'rejected' ? '❌ DITOLAK' : '⚠️ REVISI'}
                        </div>
                      )}
                    </div>
                    {hasReview && kpi.reviewNote && (
                      <div style={{ marginTop: 8, fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.inkSoft, fontStyle: 'italic' }}>
                        📝 "{kpi.reviewNote}"
                        {kpi.penaltyPct > 0 && <span style={{ color: HP_TOKENS.coral, fontStyle: 'normal', fontWeight: 700 }}> · Penalti {kpi.penaltyPct}%</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Review Form — shown when KPI is selected */}
            {selectedKpi && (
              <div style={{
                padding: 16, borderRadius: 14,
                border: `1.5px solid ${HP_TOKENS.blue}30`, background: HP_TOKENS.blueWash,
              }}>
                <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 12, color: HP_TOKENS.blue, marginBottom: 12 }}>
                  REVIEW: {selectedKpi.title}
                </div>

                {/* Action Selector */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: HP_FONT, fontSize: 11, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 6 }}>TINDAKAN</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([
                      { key: 'revision', label: '⚠️ Minta Revisi', bg: '#FFF3CC', color: '#8A6814' },
                      { key: 'rejected', label: '❌ Tolak', bg: HP_TOKENS.coralSoft, color: HP_TOKENS.coral },
                      ...(selectedKpi.reviewStatus ? [{ key: 'clear', label: '✅ Hapus Flag', bg: HP_TOKENS.sageSoft, color: HP_TOKENS.sage }] : [])
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setAction(opt.key as any)}
                        style={{
                          flex: 1, padding: '9px 6px', borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${action === opt.key ? opt.color + '60' : HP_TOKENS.line}`,
                          background: action === opt.key ? opt.bg : HP_TOKENS.card,
                          color: action === opt.key ? opt.color : HP_TOKENS.inkMute,
                          fontFamily: HP_FONT, fontWeight: 800, fontSize: 11,
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {action !== 'clear' && (
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
                              fontFamily: HP_FONT, fontWeight: 800, fontSize: 11,
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
                        <div style={{ fontFamily: HP_FONT, fontSize: 11, color: HP_TOKENS.coral, fontWeight: 700, marginTop: 4 }}>
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
                    padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                    background: HP_TOKENS.sageSoft, border: `1px solid ${HP_TOKENS.sage}40`,
                    fontFamily: HP_FONT, fontSize: 12, fontWeight: 700, color: HP_TOKENS.sage,
                  }}>
                    ✅ Flag review akan dihapus dan progress dikembalikan ke nilai semula.
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setSelectedKpi(null)}
                    style={{
                      flex: 1, padding: 12, borderRadius: 10,
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
                      flex: 2, padding: 12, borderRadius: 10, border: 'none',
                      background: action === 'clear' ? HP_TOKENS.sage : action === 'rejected' ? HP_TOKENS.coral : '#D4A017',
                      color: '#fff', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13,
                      cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? 'Memproses...' :
                      action === 'clear' ? '✅ Hapus Flag' :
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
