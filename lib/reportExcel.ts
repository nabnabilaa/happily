// Advanced report downloads (client-side): ExcelJS workbooks with embedded chart images + JSZip.
// Charts are our SVG rendered to PNG via canvas, then embedded into the .xlsx.

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const C = { sage: '4A7C59', blue: '3B82F6', coral: 'EF4444', amber: 'F59E0B', violet: '8B5CF6', ink: '1A1D23', mute: '6B7280', line: 'E5E7EB', head: '2F5A3C', wash: 'F4F7F9' };
const toneHex = (v: number) => (v >= 80 ? C.sage : v >= 50 ? C.amber : C.coral);
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// ── SVG chart builders (standalone strings) ──
function donutSvg(value: number, hex: string, size = 180): string {
  const v = Math.max(0, Math.min(100, value));
  const path = 'M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="${size}" height="${size}">
    <g transform="rotate(-90 18 18)">
      <path d="${path}" fill="none" stroke="#${hex}33" stroke-width="3.4"/>
      <path d="${path}" fill="none" stroke="#${hex}" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="${v}, 100"/>
    </g>
    <text x="18" y="19" text-anchor="middle" font-size="8" font-weight="700" fill="#${hex}" font-family="Arial">${Math.round(v)}%</text>
  </svg>`;
}

// Capaian per KPI 1 orang (untuk chart ringkasan pada laporan per-orang).
function personByKpi(p: any): { title: string; avgAchievement: number }[] {
  return (p?.kpis || []).map((k: any) => ({ title: k.title || '', avgAchievement: Math.round(Number(k.achievement) || 0) }));
}

// Capaian per KPI (horizontal) — pengganti tren mingguan di ringkasan.
function kpiBarsSvg(byKpi: { title: string; avgAchievement: number }[], w = 360): string {
  const rows = (byKpi || []).slice(0, 8);
  if (!rows.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="60"><text x="10" y="24" font-family="Arial" font-size="12" fill="#6B7280">Belum ada KPI</text></svg>`;
  const rh = 26, top = 26, labelW = 132, barW = w - labelW - 44;
  const h = top + rows.length * rh + 10;
  const bars = rows.map((k, i) => {
    const y = top + i * rh;
    const bw = barW * (Math.min(100, k.avgAchievement) / 100);
    return `<text x="6" y="${y + 14}" font-size="11" font-family="Arial" fill="#1A1D23">${esc((k.title || '').slice(0, 20))}</text>
      <rect x="${labelW}" y="${y + 3}" width="${barW}" height="14" rx="7" fill="#E5E7EB"/>
      <rect x="${labelW}" y="${y + 3}" width="${bw}" height="14" rx="7" fill="#${toneHex(k.avgAchievement)}"/>
      <text x="${w - 32}" y="${y + 14}" font-size="11" font-weight="700" font-family="Arial" fill="#1A1D23">${k.avgAchievement}%</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#FFFFFF"/>
    <text x="6" y="16" font-size="12" font-weight="700" fill="#2F5A3C" font-family="Arial">Capaian per KPI</text>${bars}</svg>`;
}

const DONUT_PATH = 'M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0 -31.831';
function donutGroup(cx: number, cy: number, r: number, value: number, hex: string, label: string): string {
  const v = Math.max(0, Math.min(100, value));
  return `<g transform="translate(${cx - r},${cy - r}) scale(${(2 * r) / 36})">
    <g transform="rotate(-90 18 18)">
      <path d="${DONUT_PATH}" fill="none" stroke="#${hex}33" stroke-width="3.2"/>
      <path d="${DONUT_PATH}" fill="none" stroke="#${hex}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${v}, 100"/>
    </g>
    <text x="18" y="20" text-anchor="middle" font-size="9" font-weight="700" fill="#${hex}" font-family="Arial">${Math.round(v)}%</text>
  </g>
  <text x="${cx}" y="${cy + r + 16}" text-anchor="middle" font-size="12" font-weight="700" fill="#6B7280" font-family="Arial">${label}</text>`;
}

function multiDonutSvg(items: { value: number; hex: string; label: string }[], w = 540, h = 170): string {
  const per = w / items.length;
  const groups = items.map((it, i) => donutGroup(per * i + per / 2, 68, 52, it.value, it.hex, it.label)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#FFFFFF"/>${groups}</svg>`;
}

function peopleBarsSvg(people: any[], w = 540): string {
  const rows = people.slice(0, 12);
  const rh = 24, pad = 10, labelW = 130, barW = w - labelW - 46;
  const h = pad * 2 + rows.length * rh + 20;
  const bars = rows.map((p, i) => {
    const y = pad + 20 + i * rh;
    const bw = barW * (Math.min(100, p.kpiScore) / 100);
    return `<text x="6" y="${y + 15}" font-size="11" font-family="Arial" fill="#1A1D23">${esc((p.name || '').slice(0, 18))}</text>
      <rect x="${labelW}" y="${y + 4}" width="${barW}" height="14" rx="7" fill="#E5E7EB"/>
      <rect x="${labelW}" y="${y + 4}" width="${bw}" height="14" rx="7" fill="#${toneHex(p.kpiScore)}"/>
      <text x="${w - 34}" y="${y + 15}" font-size="11" font-weight="700" font-family="Arial" fill="#1A1D23">${p.kpiScore}%</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#FFFFFF"/>
    <text x="6" y="16" font-size="12" font-weight="700" fill="#2F5A3C" font-family="Arial">Skor KPI per Orang</text>${bars}</svg>`;
}

async function svgToPngBytes(svg: string, w: number, h: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale; canvas.height = h * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => { if (!b) return reject(new Error('toBlob null')); b.arrayBuffer().then(a => resolve(new Uint8Array(a))); }, 'image/png');
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// ── Data fetch (reuse existing export endpoints) ──
async function fetchRows(baseQuery: string, type: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/hr/reports/export?${baseQuery}&type=${type}`);
    const json = await res.json();
    return json.data || [];
  } catch { return []; }
}

interface ExportBundle { logbook: any[]; weekly: any[]; monthly: any[]; kpi: any[]; }
async function fetchBundle(requesterId: string, month: number, year: number, scope: { department?: string; userIds?: string }): Promise<ExportBundle> {
  const q = `requesterId=${requesterId}&month=${month}&year=${year}` +
    (scope.userIds ? `&userIds=${encodeURIComponent(scope.userIds)}` : scope.department && scope.department !== 'all' ? `&department=${encodeURIComponent(scope.department)}` : '');
  const [logbook, weekly, monthly, kpi] = await Promise.all([fetchRows(q, 'logbook'), fetchRows(q, 'weekly'), fetchRows(q, 'monthly'), fetchRows(q, 'kpi')]);
  return { logbook, weekly, monthly, kpi };
}

// ── Worksheet helpers ──
const HEAD_FILL = (ws: any, row: any, hex: string) => { row.eachCell((c: any) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }; c.alignment = { vertical: 'middle' }; }); };

function sectionTitle(ws: any, text: string, hex = C.head) {
  const row = ws.addRow([text]);
  row.font = { bold: true, size: 12, color: { argb: `FF${hex}` } };
  ws.addRow([]);
  return row;
}

function safeSheetName(name: string, used: Set<string>): string {
  let base = (name || 'Orang').replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 28).trim() || 'Orang';
  let n = base, i = 2;
  while (used.has(n.toLowerCase())) { n = `${base.slice(0, 26)} ${i++}`; }
  used.add(n.toLowerCase());
  return n;
}

const fmtDate = (v: any) => (v ? String(v).slice(0, 10) : '');

function addPersonDetail(ws: any, person: any, b: { logbook: any[]; weekly: any[]; monthly: any[]; kpi: any[] }) {
  const name = person.name;
  const mine = (arr: any[]) => arr.filter(r => (r.user_name || '') === name);

  // BULANAN summary
  sectionTitle(ws, '📊 RINGKASAN BULANAN');
  const mrow = mine(b.monthly)[0] || {};
  [
    ['Total Task', Number(mrow.total_tasks || person.totalTasks || 0)],
    ['Task Selesai', Number(mrow.tasks_completed || person.tasksCompleted || 0)],
    ['Penyelesaian (%)', Number(mrow.completion_rate ?? person.completionRate ?? 0)],
    ['Skor KPI (%)', Number(mrow.kpi_score ?? person.kpiScore ?? 0)],
    ['Skor Kualitas (%)', Number(mrow.quality_score ?? person.qualityScore ?? 0)],
    ['Hari Hadir', Number(mrow.attendance_days ?? person.attendanceDays ?? 0)],
    ['Hari Kerja', Number(mrow.total_working_days ?? person.workingDays ?? 0)],
  ].forEach(([k, v]) => { const r = ws.addRow([k, v]); r.getCell(1).font = { bold: true, color: { argb: 'FF6B7280' } }; });
  ws.addRow([]);

  // TARGET PER KPI — dikelompokkan per KPI (header sekali), tiap target: nama + durasi bebas.
  // (Sebelumnya selang-seling "M1,M2,M1,M2" karena target lintas-KPI ditampilkan datar.)
  sectionTitle(ws, '📅 TARGET PER KPI');
  const wk = mine(b.weekly);
  if (wk.length) {
    const groups = new Map<string, any[]>();
    for (const r of wk) {
      const key = r.kpi_title || '(Tanpa KPI)';
      (groups.get(key) || groups.set(key, []).get(key))!.push(r);
    }
    for (const [kpiTitle, rows] of groups) {
      const kh = ws.addRow([`🎯 ${kpiTitle}`]);
      kh.getCell(1).font = { bold: true, size: 11, color: { argb: `FF${C.head}` } };
      const sh = ws.addRow(['Target', 'Durasi', 'Target', 'Aktual', 'Pencapaian %', 'Status']);
      HEAD_FILL(ws, sh, C.blue);
      rows
        .sort((a, b) => Number(a.week_number || 0) - Number(b.week_number || 0))
        .forEach(r => {
          const t = Number(r.target_value || 0), cur = Number(r.current_value || 0);
          const ach = t > 0 ? Math.round((cur / t) * 100) : 0;
          const dur = r.timeframe || (r.week_number ? `Minggu ${r.week_number}` : '');
          const row = ws.addRow([r.title || '(target)', dur, t, cur, ach, r.status || '']);
          row.getCell(5).font = { bold: true, color: { argb: `FF${toneHex(ach)}` } };
        });
      ws.addRow([]);
    }
  } else {
    ws.addRow(['(tidak ada target)']);
    ws.addRow([]);
  }

  // HARIAN (logbook)
  sectionTitle(ws, '📝 LOGBOOK HARIAN');
  const lh = ws.addRow(['Tanggal', 'Task', 'Status', 'KPI Terkait', 'Bukti']);
  HEAD_FILL(ws, lh, C.sage);
  const lb = mine(b.logbook);
  if (lb.length) lb.forEach(r => {
    const status = r.is_done ? (r.is_verified ? 'Verified' : 'Selesai') : 'Belum';
    const row = ws.addRow([fmtDate(r.target_date || r.created_at), r.title || '', status, r.goal_title || '', r.proof_link || '']);
    row.getCell(3).font = { bold: true, color: { argb: r.is_done ? `FF${C.sage}` : `FF${C.coral}` } };
  });
  else ws.addRow(['(tidak ada aktivitas harian)']);

  ws.columns = [{ width: 26 }, { width: 12 }, { width: 12 }, { width: 22 }, { width: 32 }, { width: 12 }];
}

// ── Public builders ──
async function makeWorkbook() {
  const ExcelJS: any = (await import('exceljs')).default || (await import('exceljs'));
  return { ExcelJS, wb: new ExcelJS.Workbook() };
}

async function buildSummarySheet(wb: any, ExcelJS: any, opts: { title: string; scopeLabel: string; period: string; team: any; people: any[] }) {
  const ws = wb.addWorksheet('Ringkasan', { properties: { tabColor: { argb: `FF${C.head}` } } });
  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = opts.title;
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: `FF${C.head}` } };
  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `${opts.scopeLabel} · ${opts.period} · ${opts.team.headcount} orang · dibuat ${new Date().toLocaleString('id-ID')}`;
  ws.getCell('A2').font = { color: { argb: `FF${C.mute}` }, size: 10 };
  ws.addRow([]);

  // Stat row
  const stat = ws.addRow(['Penyelesaian Task', `${opts.team.avgCompletion}%`, 'Skor KPI', `${opts.team.avgKpiScore}%`, 'Kualitas', `${opts.team.avgQuality}%`]);
  stat.eachCell((c: any, i: number) => { c.font = { bold: true, size: i % 2 ? 10 : 13, color: { argb: i % 2 ? `FF${C.mute}` : `FF${C.ink}` } }; });
  ws.addRow([]);

  // Embedded charts (3 donut + tren mingguan + perbandingan per orang)
  try {
    const donutsPng = await svgToPngBytes(multiDonutSvg([
      { value: opts.team.avgCompletion, hex: C.blue, label: 'Task' },
      { value: opts.team.avgKpiScore, hex: C.sage, label: 'Skor KPI' },
      { value: opts.team.avgQuality, hex: C.violet, label: 'Kualitas' },
    ]), 540, 170);
    ws.addImage(wb.addImage({ buffer: donutsPng, extension: 'png' }), { tl: { col: 0.2, row: 5.2 }, ext: { width: 430, height: 135 } });

    if (opts.team.byKpi?.length) {
      const kSvg = kpiBarsSvg(opts.team.byKpi);
      const kH = 26 + 26 * Math.min(8, opts.team.byKpi.length) + 10;
      const barsPng = await svgToPngBytes(kSvg, 360, kH);
      ws.addImage(wb.addImage({ buffer: barsPng, extension: 'png' }), { tl: { col: 0.2, row: 13.2 }, ext: { width: 300, height: kH * (300 / 360) } });
    }
    if (opts.people?.length > 1) {
      const pplSvg = peopleBarsSvg(opts.people);
      const pplH = 20 + 24 * Math.min(12, opts.people.length) + 20;
      const pplPng = await svgToPngBytes(pplSvg, 540, pplH);
      ws.addImage(wb.addImage({ buffer: pplPng, extension: 'png' }), { tl: { col: 3.4, row: 13.2 }, ext: { width: 380, height: pplH * (380 / 540) } });
    }
  } catch (e) { console.warn('chart embed failed', e); }
  for (let i = 0; i < 22; i++) ws.addRow([]);

  // Per-person table
  const th = ws.addRow(['Nama', 'Jabatan', 'Task', 'Penyelesaian %', 'Skor KPI %', 'Kualitas %']);
  HEAD_FILL(ws, th, C.head);
  opts.people.forEach(p => {
    const row = ws.addRow([p.name, p.jobTitle || '', `${p.tasksCompleted}/${p.totalTasks}`, p.completionRate, p.kpiScore, p.qualityScore]);
    row.getCell(5).font = { bold: true, color: { argb: `FF${toneHex(p.kpiScore)}` } };
    row.getCell(6).font = { bold: true, color: { argb: `FF${toneHex(p.qualityScore)}` } };
  });
  ws.columns = [{ width: 24 }, { width: 22 }, { width: 12 }, { width: 15 }, { width: 12 }, { width: 12 }];
  return ws;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface DivisionExcelOpts { requesterId: string; department: string; scopeLabel: string; month: number; year: number; team: any; people: any[]; }

// Excel Divisi: Ringkasan (chart) + 1 tab per orang (harian/mingguan/bulanan).
export async function downloadDivisionExcel(o: DivisionExcelOpts) {
  const { ExcelJS, wb } = await makeWorkbook();
  const period = `${MONTHS[o.month - 1]} ${o.year}`;
  await buildSummarySheet(wb, ExcelJS, { title: `Laporan Kinerja — ${o.scopeLabel}`, scopeLabel: o.scopeLabel, period, team: o.team, people: o.people });

  const bundle = await fetchBundle(o.requesterId, o.month, o.year, { department: o.department });
  const used = new Set<string>(['ringkasan']);
  for (const p of o.people) {
    const ws = wb.addWorksheet(safeSheetName(p.name, used));
    const nameRow = ws.addRow([p.name]); nameRow.font = { bold: true, size: 14, color: { argb: `FF${C.head}` } };
    ws.addRow([`${p.jobTitle || ''} · ${o.scopeLabel} · ${period}`]).font = { color: { argb: `FF${C.mute}` }, size: 10 };
    ws.addRow([]);
    addPersonDetail(ws, p, bundle);
  }

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `laporan_${o.scopeLabel}_${MONTHS[o.month - 1]}${o.year}.xlsx`.toLowerCase().replace(/\s+/g, '_'));
}

// ZIP per orang: satu file .xlsx terpisah untuk tiap orang.
export async function downloadDivisionZip(o: DivisionExcelOpts) {
  const JSZip: any = (await import('jszip')).default || (await import('jszip'));
  const zip = new JSZip();
  const period = `${MONTHS[o.month - 1]} ${o.year}`;
  const bundle = await fetchBundle(o.requesterId, o.month, o.year, { department: o.department });

  for (const p of o.people) {
    const { ExcelJS, wb } = await makeWorkbook();
    await buildSummarySheet(wb, ExcelJS, { title: `Laporan — ${p.name}`, scopeLabel: o.scopeLabel, period, team: { ...o.team, headcount: 1, avgCompletion: p.completionRate, avgKpiScore: p.kpiScore, avgQuality: p.qualityScore, byKpi: personByKpi(p) }, people: [p] });
    const ws = wb.addWorksheet('Detail');
    addPersonDetail(ws, p, bundle);
    const buf = await wb.xlsx.writeBuffer();
    const fname = `${(p.name || 'orang').replace(/[^a-z0-9]+/gi, '_')}.xlsx`.toLowerCase();
    zip.file(fname, buf);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `laporan_per_orang_${o.scopeLabel}_${MONTHS[o.month - 1]}${o.year}.zip`.toLowerCase().replace(/\s+/g, '_'));
}

// Satu orang → satu Excel (Ringkasan + detail harian/mingguan/bulanan).
export async function downloadPersonExcel(o: { requesterId: string; person: any; scopeLabel: string; month: number; year: number; team?: any }) {
  const { ExcelJS, wb } = await makeWorkbook();
  const period = `${MONTHS[o.month - 1]} ${o.year}`;
  // Ambil data agregat asli orang ini (biar angka task/KPI/weekly benar, bukan stub 0/0).
  let p = o.person;
  try {
    const res = await fetch(`/api/hr/reports/dashboard?requesterId=${o.requesterId}&userIds=${p.id}&month=${o.month}&year=${o.year}&week=0`);
    const real = (await res.json())?.people?.[0];
    if (real) p = { ...o.person, ...real };
  } catch { /* pakai data yang ada */ }
  await buildSummarySheet(wb, ExcelJS, { title: `Laporan — ${p.name}`, scopeLabel: o.scopeLabel, period, team: { headcount: 1, avgCompletion: p.completionRate, avgKpiScore: p.kpiScore, avgQuality: p.qualityScore, byKpi: personByKpi(p) }, people: [p] });
  const bundle = await fetchBundle(o.requesterId, o.month, o.year, { userIds: p.id });
  const ws = wb.addWorksheet('Detail');
  addPersonDetail(ws, p, bundle);
  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `laporan_${(p.name || 'orang').replace(/[^a-z0-9]+/gi, '_')}_${MONTHS[o.month - 1]}${o.year}.xlsx`.toLowerCase());
}
