"use client";

import React, { useState, useEffect, useRef } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import Modal from "@/components/ui/Modal";

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

interface KPIData {
  id: string;
  title: string;
  targetDescription: string;
  weight: number;
  status: string;
  finalScore: number | null;
  managerNotes: string | null;
  links: { total: number; approved: number; pending: number; rejected: number; moved: number };
}

interface Report {
  totalTasks: number;
  tasksCompleted: number;
  activeDays: number;
  totalWorkingDays: number;
  completionRate: number;
  avgTasksPerDay: number;
  kpiScore?: number;
  managerSummary?: string;
  status: string;
}

export default function MonthlyReportModal({ onClose, targetUserId, targetUserName }: {
  onClose: () => void;
  targetUserId?: string;
  targetUserName?: string;
}) {
  const { user } = useHP();
  const [report, setReport] = useState<Report | null>(null);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Form state for manager review
  const [kpiScores, setKpiScores] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // If manager is viewing employee's report, use targetUserId. Otherwise show own report.
  const viewUserId = targetUserId || user?.id;
  const viewUserName = targetUserName || user?.name;
  const isManager = !!targetUserId && targetUserId !== user?.id;

  useEffect(() => {
    fetchReport();
  }, [month, year, viewUserId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?userId=${viewUserId}&month=${month}&year=${year}`);
      const data = await res.json();
      setReport(data.report || null);
      setKpiData(data.kpiData || []);
      // Pre-fill scores if already reviewed
      if (data.kpiData) {
        const scores: Record<string, number> = {};
        data.kpiData.forEach((k: KPIData) => {
          scores[k.id] = k.finalScore ?? 0;
        });
        setKpiScores(scores);
      }
      if (data.report?.managerSummary) setSummary(data.report.managerSummary);
      setSubmitted(data.report?.status === 'reviewed');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const scores = kpiData.map(k => ({
        kpiId: k.id, score: kpiScores[k.id] || 0, weight: k.weight
      }));

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: viewUserId, month, year,
          managerSummary: summary,
          kpiScores: scores,
          reviewedBy: user?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        fetchReport();
      }
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  // Calculate weighted score from local inputs
  const calcWeightedScore = () => {
    let total = 0;
    kpiData.forEach(k => {
      total += ((kpiScores[k.id] || 0) * k.weight) / 100;
    });
    return Math.round(total);
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const kpiHTML = kpiData.map(k => `
      <div style="margin-bottom:12px;padding:12px;border:1px solid #ddd;border-radius:8px">
        <b>${k.title}</b> (Bobot: ${k.weight}%)<br/>
        <small>Target: ${k.targetDescription || '-'}</small><br/>
        <small>Tasks: ${k.links.total} total, ${k.links.approved} approved</small><br/>
        ${k.finalScore !== null ? `<b>Skor: ${k.finalScore}/100</b>` : ''}
      </div>
    `).join('');

    printWindow.document.write(`
      <html><head><title>Laporan Bulanan - ${viewUserName} - ${MONTHS[month-1]} ${year}</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;max-width:700px;margin:0 auto}
      h1{font-size:20px}h2{font-size:16px;margin-top:24px}
      .stat{display:inline-block;text-align:center;padding:12px 24px;border:1px solid #ddd;border-radius:8px;margin-right:8px}
      .stat b{font-size:24px;display:block}</style></head><body>
      <h1>📊 Laporan Bulanan — ${viewUserName}</h1>
      <p>Periode: ${MONTHS[month-1]} ${year}</p>
      <hr/>
      <div style="margin:16px 0">
        <div class="stat"><b>${report?.totalTasks || 0}</b>Total Task</div>
        <div class="stat"><b>${report?.tasksCompleted || 0}</b>Selesai (${report?.completionRate || 0}%)</div>
        <div class="stat"><b>${report?.activeDays || 0}/${report?.totalWorkingDays || 22}</b>Hari Aktif</div>
      </div>
      ${kpiData.length > 0 ? `<h2>🎯 KPI Performance</h2>${kpiHTML}` : ''}
      ${report?.kpiScore ? `<p><b>Skor KPI Tertimbang: ${report.kpiScore}/100</b></p>` : ''}
      ${report?.managerSummary ? `<h2>📝 Catatan Manager</h2><p>${report.managerSummary}</p>` : ''}
      <hr/><small>Dicetak dari FlowBuddy pada ${new Date().toLocaleDateString('id-ID')}</small>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const selectStyle: React.CSSProperties = {
    padding: 10, borderRadius: 10, border: `1.5px solid ${HP_TOKENS.line}`,
    fontFamily: HP_FONT, fontSize: 13, background: HP_TOKENS.card, outline: 'none',
  };

  const statCard = (label: string, value: string | number, sub?: string, tone?: string) => (
    <div style={{
      flex: 1, padding: '12px', borderRadius: 14, textAlign: 'center',
      background: tone === 'sage' ? HP_TOKENS.sageWash : tone === 'blue' ? HP_TOKENS.blueWash : HP_TOKENS.paper,
      border: `1px solid ${HP_TOKENS.line}`,
    }}>
      <div style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 22, color: HP_TOKENS.ink }}>{value}</div>
      <div style={{ ...HP_TEXT.small, fontSize: 10, fontWeight: 700, color: HP_TOKENS.inkMute, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ ...HP_TEXT.small, fontSize: 9, color: HP_TOKENS.inkSoft, marginTop: 1 }}>{sub}</div>}
    </div>
  );

  return (
    <Modal onClose={onClose} title="📊 Laporan Bulanan">
      <div style={{ marginTop: 4 }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          {viewUserName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <HPAvatar name={viewUserName} size={28} />
              <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{viewUserName}</div>
            </div>
          )}
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...selectStyle, flex: 0 }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...selectStyle, flex: 0, width: 80 }}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Status Badge */}
        {submitted && (
          <div style={{
            padding: '8px 14px', borderRadius: 10, marginBottom: 12,
            background: HP_TOKENS.sageWash, border: `1px solid ${HP_TOKENS.sage}40`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>✅</span>
            <span style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.sage }}>
              Laporan sudah direview
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Memuat laporan...</div>
        ) : !report ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: HP_TOKENS.inkMute }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ ...HP_TEXT.body, fontWeight: 700 }}>Belum ada data untuk periode ini</div>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {statCard('Total Task', report.totalTasks)}
              {statCard('Selesai', report.tasksCompleted, `${report.completionRate}%`, 'sage')}
              {statCard('Hari Aktif', `${report.activeDays}/${report.totalWorkingDays}`, undefined, 'blue')}
            </div>

            {/* KPI Section */}
            {kpiData.length > 0 && (
              <>
                <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 8 }}>
                  KPI PERFORMANCE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {kpiData.map(kpi => (
                    <div key={kpi.id} style={{
                      padding: 14, borderRadius: 16, background: HP_TOKENS.card,
                      border: `1.5px solid ${HP_TOKENS.line}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...HP_TEXT.h, fontSize: 13 }}>{kpi.title}</div>
                          {kpi.targetDescription && (
                            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute, marginTop: 3 }}>
                              Target: {kpi.targetDescription}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                              background: HP_TOKENS.blueSoft, color: HP_TOKENS.blue, fontFamily: HP_FONT
                            }}>Bobot: {kpi.weight}%</span>
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                              background: '#D3F9D8', color: '#2B8A3E', fontFamily: HP_FONT
                            }}>✓ {kpi.links.approved} approved</span>
                            {kpi.links.pending > 0 && (
                              <span style={{
                                padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                                background: '#FFF3BF', color: '#E67700', fontFamily: HP_FONT
                              }}>⏳ {kpi.links.pending} pending</span>
                            )}
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800,
                              background: HP_TOKENS.paper, color: HP_TOKENS.inkMute, fontFamily: HP_FONT
                            }}>📋 {kpi.links.total} total tasks</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Input (Manager only) */}
                      {isManager && (
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkMute, whiteSpace: 'nowrap' }}>
                            Skor:
                          </span>
                          <input
                            type="range" min={0} max={100}
                            value={kpiScores[kpi.id] || 0}
                            onChange={e => setKpiScores(prev => ({ ...prev, [kpi.id]: Number(e.target.value) }))}
                            style={{ flex: 1, accentColor: HP_TOKENS.sage }}
                            disabled={submitted}
                          />
                          <div style={{
                            width: 44, textAlign: 'center',
                            padding: '4px 0', borderRadius: 8,
                            background: (kpiScores[kpi.id] || 0) >= 70 ? HP_TOKENS.sageWash : (kpiScores[kpi.id] || 0) >= 40 ? '#FFF3BF' : '#FFE3E3',
                            fontFamily: HP_FONT, fontWeight: 900, fontSize: 14,
                            color: (kpiScores[kpi.id] || 0) >= 70 ? HP_TOKENS.sage : (kpiScores[kpi.id] || 0) >= 40 ? '#E67700' : HP_TOKENS.coral,
                          }}>
                            {kpiScores[kpi.id] || 0}
                          </div>
                        </div>
                      )}

                      {/* Show existing score for employee view */}
                      {!isManager && kpi.finalScore !== null && (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkMute }}>Skor:</span>
                          <div style={{
                            padding: '4px 12px', borderRadius: 8,
                            background: kpi.finalScore >= 70 ? HP_TOKENS.sageWash : kpi.finalScore >= 40 ? '#FFF3BF' : '#FFE3E3',
                            fontFamily: HP_FONT, fontWeight: 900, fontSize: 16,
                            color: kpi.finalScore >= 70 ? HP_TOKENS.sage : kpi.finalScore >= 40 ? '#E67700' : HP_TOKENS.coral,
                          }}>
                            {kpi.finalScore}/100
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Weighted Score Preview */}
                {isManager && (
                  <div style={{
                    padding: '14px', borderRadius: 16, marginBottom: 16,
                    background: `linear-gradient(135deg, ${HP_TOKENS.ink}, #2C3E50)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ ...HP_TEXT.body, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                      Skor KPI Tertimbang
                    </span>
                    <span style={{ fontFamily: HP_FONT, fontWeight: 900, fontSize: 28, color: '#F4F7F9' }}>
                      {calcWeightedScore()}<span style={{ fontSize: 14, opacity: 0.5 }}>/100</span>
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Manager Summary */}
            {isManager && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                  CATATAN MANAGER
                </div>
                <textarea
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Tambahkan catatan/feedback untuk employee..."
                  disabled={submitted}
                  rows={3}
                  style={{
                    width: '100%', padding: 12, borderRadius: 12,
                    border: `1.5px solid ${HP_TOKENS.line}`,
                    fontFamily: HP_FONT, fontSize: 13, background: HP_TOKENS.card, outline: 'none',
                    resize: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* Show manager summary for employee */}
            {!isManager && report.managerSummary && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...HP_TEXT.small, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 6 }}>
                  CATATAN DARI MANAGER
                </div>
                <div style={{
                  padding: 14, borderRadius: 14, background: HP_TOKENS.sageWash,
                  border: `1px solid ${HP_TOKENS.sage}30`,
                  ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.ink, lineHeight: 1.6,
                }}>
                  {report.managerSummary}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {isManager && !submitted && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    flex: 2, padding: 14, borderRadius: 14, border: 'none',
                    background: HP_TOKENS.sage, color: '#F4F7F9',
                    fontFamily: HP_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer',
                    opacity: submitting ? 0.5 : 1,
                    boxShadow: '0 4px 12px rgba(26,29,35,0.1)',
                  }}
                >
                  {submitting ? 'Menyimpan...' : '✅ Finalisasi Laporan'}
                </button>
              )}
              <button
                onClick={exportPDF}
                style={{
                  flex: 1, padding: 14, borderRadius: 14,
                  border: `1.5px solid ${HP_TOKENS.line}`,
                  background: HP_TOKENS.card, color: HP_TOKENS.ink,
                  fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                }}
              >
                📄 Export PDF
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
