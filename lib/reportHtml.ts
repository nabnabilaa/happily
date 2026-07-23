// Builds a self-contained, print-ready HTML report (charts as inline SVG) and opens it
// in a new tab for the user to Save-as-PDF. No external deps — works with the community setup.

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const C = {
  ink: '#1A1D23', mute: '#6B7280', line: '#E5E7EB', card: '#FFFFFF', bg: '#F4F7F9',
  sage: '#4A7C59', blue: '#3B82F6', coral: '#EF4444', amber: '#F59E0B', violet: '#8B5CF6',
};

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const toneFor = (v: number) => (v >= 80 ? C.sage : v >= 50 ? C.amber : C.coral);

function donut(value: number, color: string, size = 72): string {
  const v = Math.max(0, Math.min(100, value));
  return `<svg viewBox="0 0 36 36" width="${size}" height="${size}" style="transform:rotate(-90deg)">
    <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${color}22" stroke-width="3.5"/>
    <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${v}, 100"/>
  </svg>`;
}

function donutTile(value: number, label: string, color: string): string {
  return `<div class="donut-tile">
    <div class="donut-wrap">${donut(value, color, 84)}<div class="donut-num" style="color:${color}">${Math.round(value)}<span>%</span></div></div>
    <div class="donut-label">${esc(label)}</div>
  </div>`;
}

// Per-target: nama target + durasi bebas + kontribusi % (bukan model rigid M1–M5).
function targetList(targets: any[]): string {
  if (!targets?.length) return `<div class="empty">Belum ada target.</div>`;
  const rows = targets.map(t => {
    const v = Math.max(3, Math.min(100, t.achievement));
    return `<div class="trow"><div class="trow-top"><span class="trow-title">${esc(t.title || 'Target')}</span><span class="trow-val" style="color:${toneFor(t.achievement)}">${t.achievement}%</span></div>
      <div class="mini-track"><div class="mini-fill" style="width:${v}%;background:${toneFor(t.achievement)}"></div></div>
      ${t.timeframe ? `<div class="trow-sub">${esc(t.timeframe)}</div>` : ''}</div>`;
  }).join('');
  return `<div class="tlist">${rows}</div>`;
}

// Team-level: capaian rata-rata per KPI (pengganti tren mingguan).
function kpiBreakdown(byKpi: { title: string; avgAchievement: number; count: number }[]): string {
  if (!byKpi?.length) return `<div class="empty">Belum ada KPI.</div>`;
  return byKpi.map(k => `<tr>
    <td>${esc(k.title)}</td><td class="num">${k.count}</td>
    <td><div class="mini-track"><div class="mini-fill" style="width:${Math.min(100, k.avgAchievement)}%;background:${toneFor(k.avgAchievement)}"></div></div><span class="mini-num">${k.avgAchievement}%</span></td>
  </tr>`).join('');
}

function healthBar(h: { onTrack: number; atRisk: number; behind: number; total: number }): string {
  if (!h?.total) return '';
  const pct = (n: number) => (n / h.total) * 100;
  return `<div class="health">
    <div class="health-track">
      <div style="width:${pct(h.onTrack)}%;background:${C.sage}"></div>
      <div style="width:${pct(h.atRisk)}%;background:${C.amber}"></div>
      <div style="width:${pct(h.behind)}%;background:${C.coral}"></div>
    </div>
    <div class="health-legend">
      <span><i style="background:${C.sage}"></i>On-track ${h.onTrack}</span>
      <span><i style="background:${C.amber}"></i>Berisiko ${h.atRisk}</span>
      <span><i style="background:${C.coral}"></i>Tertinggal ${h.behind}</span>
    </div>
  </div>`;
}

function divisionRows(byDivision: any[]): string {
  if (!byDivision?.length) return '';
  return byDivision.map(d => `<tr>
    <td>${esc(d.department)}</td><td class="num">${d.headcount}</td>
    <td><div class="mini-track"><div class="mini-fill" style="width:${Math.min(100, d.avgCompletion)}%;background:${C.blue}"></div></div><span class="mini-num">${d.avgCompletion}%</span></td>
    <td><div class="mini-track"><div class="mini-fill" style="width:${Math.min(100, d.avgKpi)}%;background:${toneFor(d.avgKpi)}"></div></div><span class="mini-num">${d.avgKpi}%</span></td>
  </tr>`).join('');
}

function personCard(p: any): string {
  const kpiRows = (p.kpis || []).map((k: any) => `<tr>
    <td>${esc(k.title)}</td><td class="num">${k.weight}%</td>
    <td><div class="mini-track"><div class="mini-fill" style="width:${Math.min(100, k.achievement)}%;background:${toneFor(k.achievement)}"></div></div><span class="mini-num">${k.achievement}%</span></td>
  </tr>`).join('') || `<tr><td colspan="3" class="empty">Belum ada KPI bulan ini.</td></tr>`;
  return `<div class="person">
    <div class="person-head">
      <div class="avatar">${esc((p.name || '?').charAt(0).toUpperCase())}</div>
      <div class="person-id"><div class="person-name">${esc(p.name)}</div><div class="person-role">${esc(p.jobTitle || p.department)}</div></div>
      <div class="person-donut">${donut(p.kpiScore, toneFor(p.kpiScore), 56)}<div class="person-donut-num" style="color:${toneFor(p.kpiScore)}">${p.kpiScore}</div></div>
    </div>
    <div class="person-stats">
      <div><b>${p.tasksCompleted}/${p.totalTasks}</b><span>Task (${p.completionRate}%)</span></div>
      <div><b>${p.attendanceDays}/${p.workingDays}</b><span>Hadir</span></div>
      <div><b>${p.qualityScore}%</b><span>Kualitas</span></div>
    </div>
    <table class="kpi-table"><thead><tr><th>KPI</th><th>Bobot</th><th>Pencapaian</th></tr></thead><tbody>${kpiRows}</tbody></table>
    ${p.targets?.length ? `<div class="person-weekly">${targetList(p.targets)}</div>` : ''}
  </div>`;
}

function narrativeHtml(md: string): string {
  if (!md) return '';
  const html = esc(md)
    .replace(/^##\s?(.+)$/gm, '<h3>$1</h3>')
    .replace(/^-\s?(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\n{2,}/g, '<br/>');
  return `<div class="narrative">${html}</div>`;
}

export interface ReportPayload {
  period: { month: number; year: number; week: number };
  scopeLabel: string;
  team: any;
  people: any[];
  narrative?: string;
}

export function buildReportHTML({ period, scopeLabel, team, people, narrative }: ReportPayload): string {
  const periodLabel = period.week > 0 ? `Minggu ${period.week} · ${MONTHS[period.month - 1]} ${period.year}` : `${MONTHS[period.month - 1]} ${period.year}`;
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Laporan ${esc(scopeLabel)} — ${esc(periodLabel)}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin:0; font-family:'Inter',-apple-system,Segoe UI,Roboto,sans-serif; color:${C.ink}; background:${C.bg}; }
  .page { max-width:900px; margin:0 auto; padding:32px; }
  .cover { background:linear-gradient(135deg,${C.sage},#2f5a3c); color:#fff; border-radius:20px; padding:28px 30px; margin-bottom:20px; }
  .cover h1 { margin:0 0 4px; font-size:26px; }
  .cover .sub { opacity:.85; font-size:14px; font-weight:600; }
  .cover .meta { margin-top:14px; font-size:12px; opacity:.8; }
  .card { background:${C.card}; border:1px solid ${C.line}; border-radius:16px; padding:20px; margin-bottom:18px; }
  .card h2 { margin:0 0 16px; font-size:16px; }
  .donut-row { display:flex; gap:14px; flex-wrap:wrap; }
  .donut-tile { flex:1; min-width:120px; text-align:center; background:${C.bg}; border-radius:14px; padding:14px 10px; }
  .donut-wrap { position:relative; display:inline-block; }
  .donut-num { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:20px; }
  .donut-num span { font-size:11px; margin-left:1px; }
  .donut-label { margin-top:6px; font-size:12px; font-weight:700; color:${C.mute}; }
  .stat-row { display:flex; gap:12px; flex-wrap:wrap; margin-top:4px; }
  .stat { flex:1; min-width:110px; background:${C.bg}; border-radius:12px; padding:12px 14px; }
  .stat b { display:block; font-size:22px; }
  .stat span { font-size:11px; color:${C.mute}; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
  .wbars { display:flex; gap:10px; align-items:flex-end; height:150px; padding-top:10px; }
  .wbar { flex:1; display:flex; flex-direction:column; align-items:center; height:100%; }
  .wbar-val { font-size:11px; font-weight:800; margin-bottom:4px; }
  .wbar-track { flex:1; width:70%; max-width:44px; background:${C.line}; border-radius:8px 8px 4px 4px; display:flex; align-items:flex-end; overflow:hidden; }
  .wbar-fill { width:100%; border-radius:8px 8px 0 0; }
  .wbar-lbl { margin-top:6px; font-size:11px; font-weight:700; color:${C.mute}; }
  .health-track { display:flex; height:16px; border-radius:8px; overflow:hidden; background:${C.line}; }
  .health-legend { display:flex; gap:16px; margin-top:10px; font-size:12px; font-weight:600; color:${C.mute}; }
  .health-legend i { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:5px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { text-align:left; color:${C.mute}; font-size:11px; text-transform:uppercase; letter-spacing:.4px; padding:6px 8px; border-bottom:1px solid ${C.line}; }
  td { padding:7px 8px; border-bottom:1px solid ${C.bg}; vertical-align:middle; }
  td.num { font-weight:700; }
  .mini-track { display:inline-block; width:70px; height:7px; background:${C.line}; border-radius:4px; overflow:hidden; vertical-align:middle; margin-right:6px; }
  .mini-fill { height:100%; border-radius:4px; }
  .mini-num { font-weight:700; font-size:11px; }
  .people { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .person { border:1px solid ${C.line}; border-radius:14px; padding:14px; background:${C.card}; break-inside:avoid; }
  .person-head { display:flex; align-items:center; gap:10px; }
  .avatar { width:40px; height:40px; border-radius:12px; background:${C.sage}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; }
  .person-id { flex:1; min-width:0; }
  .person-name { font-weight:800; font-size:14px; }
  .person-role { font-size:11px; color:${C.mute}; }
  .person-donut { position:relative; }
  .person-donut-num { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; }
  .person-stats { display:flex; gap:8px; margin:12px 0; }
  .person-stats div { flex:1; background:${C.bg}; border-radius:10px; padding:8px; text-align:center; }
  .person-stats b { display:block; font-size:14px; }
  .person-stats span { font-size:10px; color:${C.mute}; }
  .kpi-table { margin-top:4px; }
  .person-weekly { margin-top:10px; }
  .tlist { display:flex; flex-direction:column; gap:8px; }
  .trow-top { display:flex; justify-content:space-between; align-items:baseline; gap:8px; margin-bottom:3px; }
  .trow-title { font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .trow-val { font-size:12px; font-weight:700; flex-shrink:0; }
  .trow-sub { font-size:10px; color:${C.mute}; margin-top:2px; }
  .narrative { font-size:13px; line-height:1.6; }
  .narrative h3 { font-size:14px; margin:14px 0 6px; color:${C.sage}; }
  .narrative ul { margin:6px 0; padding-left:18px; }
  .narrative li { margin:3px 0; }
  .empty { color:${C.mute}; font-size:12px; text-align:center; padding:10px; }
  .foot { text-align:center; color:${C.mute}; font-size:11px; margin-top:20px; }
  .print-hint { position:fixed; top:14px; right:14px; background:${C.sage}; color:#fff; padding:10px 16px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; border:none; box-shadow:0 4px 14px rgba(0,0,0,.2); }
  @media print { .print-hint { display:none; } body { background:#fff; } .page { padding:0; } .card, .person { break-inside:avoid; } }
</style></head><body>
<button class="print-hint" onclick="window.print()">🖨️ Simpan sebagai PDF</button>
<div class="page">
  <div class="cover">
    <h1>Laporan Kinerja ${period.week > 0 ? 'Mingguan' : 'Bulanan'}</h1>
    <div class="sub">${esc(scopeLabel)} · ${esc(periodLabel)}</div>
    <div class="meta">Dibuat ${esc(now)} · ${team.headcount} orang</div>
  </div>

  <div class="card">
    <h2>Ringkasan Tim</h2>
    <div class="donut-row">
      ${donutTile(team.avgCompletion, 'Penyelesaian Task', C.blue)}
      ${donutTile(team.avgKpiScore, 'Skor KPI', C.sage)}
      ${donutTile(team.avgQuality, 'Kualitas', C.violet)}
    </div>
    <div class="stat-row" style="margin-top:12px">
      <div class="stat"><b>${team.headcount}</b><span>Karyawan</span></div>
      <div class="stat"><b>${team.tasksCompleted}/${team.totalTasks}</b><span>Task Selesai</span></div>
      <div class="stat"><b>${team.kpiHealth?.total || 0}</b><span>Total KPI</span></div>
    </div>
    ${healthBar(team.kpiHealth)}
  </div>

  ${team.byKpi?.length ? `<div class="card"><h2>Capaian per KPI</h2>
    <table><thead><tr><th>KPI</th><th>Jml</th><th>Rata-rata Pencapaian</th></tr></thead><tbody>${kpiBreakdown(team.byKpi)}</tbody></table>
  </div>` : ''}

  ${team.byDivision?.length > 1 ? `<div class="card"><h2>Per Divisi</h2>
    <table><thead><tr><th>Divisi</th><th>Orang</th><th>Penyelesaian</th><th>Skor KPI</th></tr></thead><tbody>${divisionRows(team.byDivision)}</tbody></table>
  </div>` : ''}

  ${narrative ? `<div class="card"><h2>✨ Analisa AI</h2>${narrativeHtml(narrative)}</div>` : ''}

  <div class="card"><h2>Detail Per Orang</h2>
    <div class="people">${people.map(personCard).join('')}</div>
  </div>

  <div class="foot">Flowbee · Laporan dibuat otomatis</div>
</div>
</body></html>`;
}

export function openReportForPrint(payload: ReportPayload) {
  const html = buildReportHTML(payload);
  const win = window.open('', '_blank');
  if (!win) { alert('Popup diblokir. Izinkan popup untuk mengunduh laporan PDF.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
