"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import Modal from "@/components/ui/Modal";
import HPGlyph from "@/components/ui/HPGlyph";

interface AIAuditModalProps {
  onClose: () => void;
  type: 'weekly' | 'monthly';
}

// ── helpers ─────────────────────────────────────────────────────────────────

function currentWeekOfMonth() {
  return Math.min(4, Math.ceil(new Date().getDate() / 7));
}

function scoreColor(n: number) {
  return n >= 80 ? HP_TOKENS.sage : n >= 60 ? HP_TOKENS.yellow : HP_TOKENS.coral;
}

function ProgressBar({ value, max = 100, color, height = 8 }: { value: number; max?: number; color: string; height?: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div style={{ flex: 1, height, background: HP_TOKENS.lineSoft, borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 0.8s ease' }} />
    </div>
  );
}

// ── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ t }: { t: any }) {
  const [open, setOpen] = useState(false);
  const hasDetail = t.notes || t.proofLinks?.length > 0 || t.description;
  return (
    <div style={{ marginBottom: 2 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          borderRadius: 8, background: t.done ? `${HP_TOKENS.sage}10` : HP_TOKENS.lineSoft,
          cursor: hasDetail ? 'pointer' : 'default',
        }}
        onClick={() => hasDetail && setOpen(o => !o)}
        className={hasDetail ? 'hp-tap' : ''}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          background: t.verified ? HP_TOKENS.sage : t.done ? `${HP_TOKENS.sage}40` : HP_TOKENS.lineSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {(t.done || t.verified) && <HPGlyph name="check" size={10} color={t.verified ? '#fff' : HP_TOKENS.sage} />}
        </div>
        <span style={{
          flex: 1, fontSize: 12, fontWeight: 700,
          color: t.done ? HP_TOKENS.ink : HP_TOKENS.inkSoft,
          textDecoration: t.done ? 'none' : 'none',
        }}>
          {t.title}
        </span>
        {t.proofLinks?.length > 0 && (
          <div style={{ background: HP_TOKENS.blueWash, borderRadius: 6, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: HP_TOKENS.blue }}>
            🔗 {t.proofLinks.length}
          </div>
        )}
        {t.metricValue !== null && t.metricValue !== undefined && (
          <div style={{ fontSize: 10, fontWeight: 800, color: HP_TOKENS.blue }}>
            +{Number(t.metricValue).toLocaleString('id-ID')}
          </div>
        )}
        {t.status === 'revision' && (
          <div style={{ background: HP_TOKENS.yellowWash, borderRadius: 6, padding: '2px 6px', fontSize: 9, fontWeight: 800, color: '#8A6814' }}>REVISI</div>
        )}
        {t.status === 'reject' && (
          <div style={{ background: HP_TOKENS.coralSoft, borderRadius: 6, padding: '2px 6px', fontSize: 9, fontWeight: 800, color: HP_TOKENS.coral }}>TOLAK</div>
        )}
        {hasDetail && <HPGlyph name={open ? 'chevron-up' : 'chevron-down'} size={12} color={HP_TOKENS.inkMute} />}
      </div>

      {open && hasDetail && (
        <div style={{ marginLeft: 26, padding: '6px 10px', background: HP_TOKENS.paper, borderRadius: 8, marginTop: 2 }}>
          {t.description && (
            <div style={{ fontSize: 11, color: HP_TOKENS.inkSoft, marginBottom: 4 }}>{t.description}</div>
          )}
          {t.notes && (
            <div style={{ fontSize: 11, color: HP_TOKENS.inkMute, fontStyle: 'italic', marginBottom: 6 }}>
              📝 {t.notes}
            </div>
          )}
          {t.proofLinks?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {t.proofLinks.map((link: string, i: number) => (
                <a key={i} href={link} target="_blank" rel="noreferrer" style={{
                  fontSize: 11, color: HP_TOKENS.blue, fontWeight: 700,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'block'
                }}>
                  🔗 {link}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Weekly target row ─────────────────────────────────────────────────────────

function WeeklyTargetRow({ wt, highlight }: { wt: any; highlight?: boolean }) {
  const [open, setOpen] = useState(highlight ?? false);
  const sc = scoreColor(wt.progress);
  const doneTasks = wt.tasks.filter((t: any) => t.done).length;
  return (
    <div style={{
      border: `1.5px solid ${highlight ? sc + '60' : HP_TOKENS.lineSoft}`,
      borderRadius: 12, marginBottom: 8, overflow: 'hidden',
      background: highlight ? `${sc}06` : HP_TOKENS.card,
    }}>
      <div
        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
        onClick={() => setOpen(o => !o)}
        className="hp-tap"
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: `${sc}20`, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 900, color: sc
        }}>
          W{wt.weekNumber}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: HP_TOKENS.ink }}>{wt.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <ProgressBar value={wt.currentValue} max={wt.targetValue} color={sc} />
            <span style={{ fontSize: 11, fontWeight: 900, color: sc, flexShrink: 0 }}>
              {wt.currentValue}/{wt.targetValue} {wt.metricUnit}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: sc, fontFamily: HP_FONT }}>{wt.progress}%</div>
          <div style={{ fontSize: 10, color: HP_TOKENS.inkMute }}>{doneTasks}/{wt.tasks.length} task</div>
        </div>
        <HPGlyph name={open ? 'chevron-up' : 'chevron-down'} size={14} color={HP_TOKENS.inkMute} />
      </div>

      {open && (
        <div style={{ padding: '0 14px 10px', borderTop: `1px solid ${HP_TOKENS.lineSoft}` }}>
          {wt.description && (
            <div style={{ fontSize: 11, color: HP_TOKENS.inkSoft, margin: '8px 0 6px', fontStyle: 'italic' }}>
              {wt.description}
            </div>
          )}
          {wt.tasks.length > 0 ? wt.tasks.map((t: any) => <TaskRow key={t.id} t={t} />) : (
            <div style={{ fontSize: 11, color: HP_TOKENS.inkMute, padding: '6px 0' }}>Belum ada task di target ini.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── KPI accordion ─────────────────────────────────────────────────────────────

function KpiAccordion({ kpi, type }: { kpi: any; type: 'weekly' | 'monthly' }) {
  const [open, setOpen] = useState(true);
  const sc = scoreColor(kpi.progress);
  const curWeek = currentWeekOfMonth();
  const visibleTargets = type === 'weekly'
    ? kpi.weeklyTargets.filter((wt: any) => wt.weekNumber === curWeek)
    : kpi.weeklyTargets;

  return (
    <div style={{
      background: HP_TOKENS.card, border: `1.5px solid ${HP_TOKENS.line}`,
      borderRadius: 16, overflow: 'hidden', marginBottom: 12,
    }}>
      {/* KPI header */}
      <div
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        onClick={() => setOpen(o => !o)}
        className="hp-tap"
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: `${sc}20`, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <HPGlyph name="target" size={18} color={sc} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: HP_TOKENS.ink }}>{kpi.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <ProgressBar value={kpi.progress} color={sc} />
            <span style={{ fontSize: 11, fontWeight: 900, color: sc, flexShrink: 0 }}>{kpi.progress}%</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: '#fff', background: HP_TOKENS.inkMute,
            padding: '2px 6px', borderRadius: 5
          }}>
            {kpi.weight}%
          </div>
          <div style={{ fontSize: 10, color: HP_TOKENS.inkMute, marginTop: 4 }}>
            {kpi.weeklyTargets.length} target
          </div>
        </div>
        <HPGlyph name={open ? 'chevron-up' : 'chevron-down'} size={14} color={HP_TOKENS.inkMute} />
      </div>

      {open && (
        <div style={{ padding: '4px 12px 12px', borderTop: `1px solid ${HP_TOKENS.lineSoft}` }}>
          {/* For monthly: show mini progress timeline across weeks */}
          {type === 'monthly' && kpi.weeklyTargets.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, padding: '8px 0' }}>
              {[1, 2, 3, 4].map(wn => {
                const wt = kpi.weeklyTargets.find((w: any) => w.weekNumber === wn);
                const pct = wt?.progress ?? 0;
                const c = wt ? scoreColor(pct) : HP_TOKENS.lineSoft;
                return (
                  <div key={wn} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: HP_TOKENS.inkMute, marginBottom: 4 }}>W{wn}</div>
                    <div style={{ height: 40, background: HP_TOKENS.lineSoft, borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${pct}%`, background: c, borderRadius: '0 0 6px 6px', transition: 'height 0.8s ease', minHeight: wt ? 2 : 0 }} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: c, marginTop: 3 }}>{wt ? `${pct}%` : '–'}</div>
                  </div>
                );
              })}
            </div>
          )}

          {visibleTargets.length === 0 ? (
            <div style={{ fontSize: 11, color: HP_TOKENS.inkMute, padding: '8px 4px' }}>
              {type === 'weekly' ? `Belum ada target untuk minggu ke-${curWeek}.` : 'Belum ada target mingguan.'}
            </div>
          ) : (
            visibleTargets.map((wt: any) => (
              <WeeklyTargetRow key={wt.id} wt={wt} highlight={type === 'weekly' && wt.weekNumber === curWeek} />
            ))
          )}

          {/* Unlinked tasks */}
          {kpi.unlinkedTasks?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 6 }}>TASK LANGSUNG KE KPI</div>
              {kpi.unlinkedTasks.map((t: any) => <TaskRow key={t.id} t={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Summary section ────────────────────────────────────────────────────────

function AISummarySection({ member, type, accentColor, onGenerate, generating }: {
  member: any; type: 'weekly' | 'monthly'; accentColor: string;
  onGenerate: () => void; generating: boolean;
}) {
  const curWeek = currentWeekOfMonth();

  if (type === 'weekly') {
    const summary = member.aiWeeklySummaries?.[member.aiWeeklySummaries.length - 1];
    if (!summary) {
      return (
        <div style={{
          background: `${accentColor}10`, border: `1.5px dashed ${accentColor}50`,
          borderRadius: 16, padding: '16px', marginBottom: 16, textAlign: 'center'
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft, marginBottom: 10 }}>
            Belum ada rangkuman AI untuk minggu ini.
          </div>
          <button onClick={onGenerate} disabled={generating} style={{
            padding: '10px 20px', borderRadius: 12, border: 'none',
            background: generating ? HP_TOKENS.lineSoft : accentColor, color: '#fff',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: generating ? 'default' : 'pointer'
          }} className="hp-tap">
            {generating ? '⏳ Generating...' : '🤖 Generate Rangkuman AI'}
          </button>
        </div>
      );
    }
    return (
      <div style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}30`, borderRadius: 16, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: accentColor }}>
            🤖 RANGKUMAN AI — {new Date(summary.weekStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {new Date(summary.weekEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </div>
          <div style={{ padding: '2px 8px', borderRadius: 10, background: `${scoreColor(summary.score)}20`, fontSize: 10, fontWeight: 800, color: scoreColor(summary.score) }}>
            Skor {summary.score}
          </div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: HP_TOKENS.ink }}>{summary.text}</div>
        <button onClick={onGenerate} disabled={generating} style={{
          marginTop: 8, padding: '6px 12px', borderRadius: 8, border: `1px solid ${accentColor}40`,
          background: 'transparent', color: accentColor,
          fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, cursor: generating ? 'default' : 'pointer'
        }}>
          {generating ? '⏳ Updating...' : '↻ Perbarui'}
        </button>
      </div>
    );
  }

  // Monthly
  if (!member.aiMonthlyAnalysis && !member.aiWeeklySummaries?.length) {
    return (
      <div style={{
        background: `${accentColor}10`, border: `1.5px dashed ${accentColor}50`,
        borderRadius: 16, padding: '16px', marginBottom: 16, textAlign: 'center'
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: HP_TOKENS.inkSoft, marginBottom: 10 }}>
          Belum ada analisa AI bulan ini.
        </div>
        <button onClick={onGenerate} disabled={generating} style={{
          padding: '10px 20px', borderRadius: 12, border: 'none',
          background: generating ? HP_TOKENS.lineSoft : accentColor, color: '#fff',
          fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: generating ? 'default' : 'pointer'
        }} className="hp-tap">
          {generating ? '⏳ Generating...' : '🔮 Generate Analisa Bulanan AI'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Weekly summaries timeline */}
      {member.aiWeeklySummaries?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 8 }}>PROGRES MINGGU</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {member.aiWeeklySummaries.map((s: any, i: number) => {
              const wn = i + 1;
              const sc = scoreColor(s.score);
              return (
                <details key={i} style={{ flex: '0 0 auto', width: 120 }}>
                  <summary style={{
                    padding: '6px 10px', borderRadius: 10, background: `${sc}15`,
                    border: `1.5px solid ${sc}40`, fontSize: 11, fontWeight: 800, color: sc,
                    cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between'
                  }}>
                    <span>W{wn}</span><span>{s.score}%</span>
                  </summary>
                  <div style={{
                    marginTop: 4, padding: '8px', borderRadius: 10,
                    background: HP_TOKENS.paper, border: `1px solid ${HP_TOKENS.line}`,
                    fontSize: 11, lineHeight: 1.5, color: HP_TOKENS.inkSoft
                  }}>
                    {s.text}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly AI analysis */}
      {member.aiMonthlyAnalysis && (
        <div style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}30`, borderRadius: 16, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, marginBottom: 8 }}>🔮 ANALISA BULANAN AI</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: HP_TOKENS.ink }}>{member.aiMonthlyAnalysis}</div>
        </div>
      )}

      <button onClick={onGenerate} disabled={generating} style={{
        marginTop: 8, padding: '6px 12px', borderRadius: 8, border: `1px solid ${accentColor}40`,
        background: 'transparent', color: accentColor,
        fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, cursor: generating ? 'default' : 'pointer'
      }}>
        {generating ? '⏳ Updating...' : '↻ Perbarui Analisa'}
      </button>
    </div>
  );
}

// ── Excel export ──────────────────────────────────────────────────────────────

async function exportExcel(members: any[], type: 'weekly' | 'monthly', periodLabel: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows: any[][] = [
    [`Laporan ${type === 'weekly' ? 'Mingguan' : 'Bulanan'} Tim`, periodLabel],
    [],
    ['Nama', 'Jabatan', 'Departemen', 'Skor KPI Rata-rata', 'Task Selesai', 'Task Total', 'Rangkuman AI'],
    ...members.map(m => {
      const allTasks = m.kpis.flatMap((k: any) => k.weeklyTargets.flatMap((wt: any) => wt.tasks));
      const doneTasks = allTasks.filter((t: any) => t.done).length;
      const kpiAvg = m.kpis.length > 0
        ? Math.round(m.kpis.reduce((a: number, k: any) => a + k.progress, 0) / m.kpis.length)
        : 0;
      const aiText = type === 'weekly'
        ? (m.aiWeeklySummaries?.[m.aiWeeklySummaries.length - 1]?.text || '-')
        : (m.aiMonthlyAnalysis || m.aiWeeklySummaries?.map((s: any) => s.text).join(' | ') || '-');
      return [m.name, m.jobTitle, m.department, `${kpiAvg}%`, doneTasks, allTasks.length, aiText];
    })
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Ringkasan Tim');

  // Per-member sheets
  for (const m of members) {
    const rows: any[][] = [
      [`Laporan ${type === 'weekly' ? 'Mingguan' : 'Bulanan'} — ${m.name}`],
      [`Jabatan: ${m.jobTitle || '-'} | Dept: ${m.department || '-'} | Periode: ${periodLabel}`],
      [],
    ];

    // AI Summaries
    if (type === 'weekly' && m.aiWeeklySummaries?.length) {
      rows.push(['=== RANGKUMAN AI ===']);
      for (const s of m.aiWeeklySummaries) {
        rows.push([`${s.weekStart} – ${s.weekEnd}`, `Skor: ${s.score}`, s.text]);
      }
      rows.push([]);
    } else if (type === 'monthly') {
      if (m.aiMonthlyAnalysis) {
        rows.push(['=== ANALISA BULANAN AI ==='], ['', m.aiMonthlyAnalysis], []);
      }
      if (m.aiWeeklySummaries?.length) {
        rows.push(['=== RANGKUMAN MINGGUAN ===']);
        m.aiWeeklySummaries.forEach((s: any, i: number) => {
          rows.push([`Minggu ${i + 1} (${s.weekStart} – ${s.weekEnd})`, `Skor: ${s.score}`, s.text]);
        });
        rows.push([]);
      }
    }

    // KPIs
    rows.push(['=== KPI & TARGET & TASK ===']);
    rows.push(['KPI', 'Bobot', 'Progress KPI', 'Minggu', 'Target Mingguan', 'Progress Target', 'Judul Task', 'Status', 'Catatan', 'Link Bukti 1', 'Link Bukti 2']);

    for (const kpi of m.kpis) {
      rows.push([kpi.title, `${kpi.weight}%`, `${kpi.progress}%`, '', '', '', '', '', '', '', '']);
      for (const wt of kpi.weeklyTargets) {
        rows.push(['', '', '', `W${wt.weekNumber}: ${wt.title}`, `${wt.currentValue}/${wt.targetValue} ${wt.metricUnit}`, `${wt.progress}%`, '', '', '', '', '']);
        for (const t of wt.tasks) {
          rows.push(['', '', '', '', '', '', t.title, t.done ? 'Selesai' : 'Belum', t.notes || '', t.proofLinks?.[0] || '', t.proofLinks?.[1] || '']);
        }
      }
      if (kpi.unlinkedTasks?.length) {
        rows.push(['', '', '', '(Task Langsung)', '', '', '', '', '', '', '']);
        for (const t of kpi.unlinkedTasks) {
          rows.push(['', '', '', '', '', '', t.title, t.done ? 'Selesai' : 'Belum', t.notes || '', t.proofLinks?.[0] || '', t.proofLinks?.[1] || '']);
        }
      }
    }

    // Sanitize sheet name
    const sheetName = String(m.name).replace(/[:\\/?\[\]*]/g, '').substring(0, 28);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
  }

  XLSX.writeFile(wb, `laporan-tim-${periodLabel.replace(/\s/g, '-').replace(/[/\\]/g, '-')}.xlsx`);
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function AIAuditModal({ onClose, type }: AIAuditModalProps) {
  const { user } = useHP();
  const isWeekly = type === 'weekly';
  const accentColor = isWeekly ? HP_TOKENS.blue : '#6B5F8E';

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const periodLabel = isWeekly
    ? (() => {
        const d = new Date();
        const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
        return `${monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${friday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      })()
    : now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/ai/team-report?managerId=${user.id}&type=${type}&month=${month}&year=${year}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal memuat data');
      setMembers(json.members || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, type, month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerate = async () => {
    if (!user?.id || generating) return;
    setGenerating(true);
    try {
      const endpoint = isWeekly ? '/api/ai/weekly-summary' : '/api/ai/monthly-analysis';
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: user.id, month, year }),
      });
      await fetchData();
    } catch (e) {
      console.error('Generate failed:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportExcel(members, type, periodLabel);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  const selectedMember = members[selectedIdx];

  return (
    <Modal onClose={onClose} title={isWeekly ? 'Rangkuman Mingguan AI' : 'Analisa Bulanan AI'}>
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 40,
            background: isWeekly ? HP_TOKENS.blueWash : HP_TOKENS.lavenderSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', animation: 'hpPulse 1.5s infinite'
          }}>
            <HPGlyph name="sparkle" size={40} color={accentColor} />
          </div>
          <div style={{ ...HP_TEXT.h, fontSize: 16 }}>Memuat data tim...</div>
          <div style={{ fontSize: 13, color: HP_TOKENS.inkMute, marginTop: 6 }}>
            Mengambil KPI, target, task, dan catatan.
          </div>
        </div>
      ) : error ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: HP_TOKENS.coral }}>{error}</div>
          <button onClick={fetchData} style={{
            marginTop: 16, padding: '10px 20px', borderRadius: 10, border: 'none',
            background: accentColor, color: '#fff', fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer'
          }} className="hp-tap">Coba Lagi</button>
        </div>
      ) : members.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: HP_TOKENS.inkMute }}>
          Tidak ada anggota tim ditemukan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Controls row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <select
                value={selectedIdx}
                onChange={e => setSelectedIdx(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px 36px 10px 12px',
                  borderRadius: 12, border: `1.5px solid ${accentColor}40`,
                  background: HP_TOKENS.card, fontFamily: HP_FONT, fontWeight: 700,
                  fontSize: 13, color: HP_TOKENS.ink, appearance: 'none', cursor: 'pointer'
                }}
              >
                {members.map((m, i) => (
                  <option key={i} value={i}>{m.name} — {m.jobTitle || m.department || 'Tim'}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <HPGlyph name="chevron-down" size={14} color={HP_TOKENS.inkMute} />
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                flexShrink: 0, padding: '10px 14px', borderRadius: 12,
                border: `1.5px solid ${HP_TOKENS.sage}60`,
                background: HP_TOKENS.sageWash, color: HP_TOKENS.sage,
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: exporting ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}
              className="hp-tap"
            >
              <HPGlyph name="download" size={14} color={HP_TOKENS.sage} />
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>

          {/* Period chip */}
          <div style={{
            padding: '6px 12px', borderRadius: 8, background: `${accentColor}10`,
            border: `1px solid ${accentColor}25`, fontSize: 11, fontWeight: 700, color: accentColor
          }}>
            {isWeekly ? '📅' : '🗓️'} {periodLabel} · {members.length} anggota
          </div>

          {/* Selected member content */}
          {selectedMember && (
            <div>
              {/* AI Summary */}
              <AISummarySection
                member={selectedMember}
                type={type}
                accentColor={accentColor}
                onGenerate={handleGenerate}
                generating={generating}
              />

              {/* KPIs */}
              <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontWeight: 800, marginBottom: 8 }}>
                KPI · TARGET · TASK
              </div>
              {selectedMember.kpis.length === 0 ? (
                <div style={{
                  padding: 20, textAlign: 'center', background: HP_TOKENS.lineSoft,
                  borderRadius: 12, fontSize: 13, color: HP_TOKENS.inkMute
                }}>
                  Belum ada KPI untuk anggota ini bulan ini.
                </div>
              ) : (
                selectedMember.kpis.map((kpi: any) => (
                  <KpiAccordion key={kpi.id} kpi={kpi} type={type} />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
