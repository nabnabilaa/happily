import { db } from "@/lib/db";
import { generateAI, hasAIKey } from "@/lib/aiClient";

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export const normScope = (department?: string) => (!department || department === 'all' ? 'all' : department);
export const periodLabelOf = (month: number, year: number, week: number) =>
  week > 0 ? `Minggu ${week} ${MONTHS[month - 1]} ${year}` : `${MONTHS[month - 1]} ${year}`;

let tableReady = false;
async function ensureNarrativeTable() {
  if (tableReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS report_narratives (
    id VARCHAR(80) PRIMARY KEY,
    scope VARCHAR(120) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    week INT NOT NULL DEFAULT 0,
    type VARCHAR(20) NOT NULL,
    narrative MEDIUMTEXT,
    generated_by_ai TINYINT DEFAULT 0,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_scope_period (scope, month, year, week)
  )`);
  tableReady = true;
}

export interface NarrativeKey { scope: string; month: number; year: number; week: number; }

export async function getStoredNarrative(key: NarrativeKey): Promise<{ narrative: string; generatedByAI: boolean; generatedAt: string } | null> {
  try {
    await ensureNarrativeTable();
    const res = await db.execute({
      sql: "SELECT narrative, generated_by_ai, generated_at FROM report_narratives WHERE scope = ? AND month = ? AND year = ? AND week = ?",
      args: [key.scope, key.month, key.year, key.week],
    });
    const row = res.rows[0] as any;
    if (!row) return null;
    return { narrative: row.narrative || '', generatedByAI: !!row.generated_by_ai, generatedAt: String(row.generated_at) };
  } catch { return null; }
}

export async function saveNarrative(key: NarrativeKey & { type: string; narrative: string; generatedByAI: boolean }) {
  await ensureNarrativeTable();
  const id = `rn_${key.scope}_${key.year}_${key.month}_${key.week}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 78);
  await db.execute({
    sql: `INSERT INTO report_narratives (id, scope, month, year, week, type, narrative, generated_by_ai, generated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE narrative = VALUES(narrative), type = VALUES(type),
            generated_by_ai = VALUES(generated_by_ai), generated_at = NOW()`,
    args: [id, key.scope, key.month, key.year, key.week, key.type, key.narrative, key.generatedByAI ? 1 : 0],
  });
}

// Build + generate the narrative for a computed scope. Persists the result.
export async function generateReportNarrative(input: {
  team: any; people: any[]; month: number; year: number; week: number; scopeLabel: string; scope: string; persist?: boolean;
}): Promise<{ narrative: string; generatedByAI: boolean; periodLabel: string }> {
  const { team, people, month, year, week, scopeLabel, scope } = input;
  const isWeekly = week > 0;
  const periodLabel = periodLabelOf(month, year, week);

  let narrative = '';
  let generatedByAI = false;

  if (hasAIKey() && people.length) {
    const system = isWeekly
      ? 'Kamu adalah AI HR analyst senior. Buat laporan MINGGUAN tim yang mendetail dalam bahasa Indonesia. Uraikan secara konkret apa yang dikerjakan tim selama minggu tersebut, progres tiap KPI/target, siapa yang menonjol, siapa yang perlu perhatian, hambatan, dan rekomendasi actionable. Gunakan sub-judul format "## Judul" dan bullet "- ". Jangan mengarang data di luar yang diberikan.'
      : 'Kamu adalah AI HR analyst senior. Buat laporan BULANAN tim yang mendetail dan naratif dalam bahasa Indonesia. Rangkum menyeluruh capaian tim sepanjang bulan, tren mingguan, pencapaian per KPI, kekuatan tim, area perbaikan, anggota menonjol & yang perlu perhatian, serta rekomendasi strategis. Gunakan sub-judul format "## Judul" dan bullet "- ". Jangan mengarang data di luar yang diberikan.';
    const prompt = buildScopePrompt({ periodLabel, scopeLabel, team, people, isWeekly });
    narrative = await generateAI(system, prompt, { temperature: 0.6, maxTokens: 1400 });
    generatedByAI = !!narrative;
  }
  if (!narrative) narrative = fallbackNarrative(team, people, periodLabel);

  if (input.persist !== false) {
    try { await saveNarrative({ scope, month, year, week, type: isWeekly ? 'weekly' : 'monthly', narrative, generatedByAI }); }
    catch (e) { console.warn('saveNarrative failed:', e); }
  }
  return { narrative, generatedByAI, periodLabel };
}

function buildScopePrompt(d: any): string {
  const { periodLabel, scopeLabel, team, people, isWeekly } = d;
  let p = `Periode: ${periodLabel}\nCakupan: ${scopeLabel}\n\n`;
  p += `RINGKASAN TIM:\n`;
  p += `- Jumlah orang: ${team.headcount}\n`;
  p += `- Rata-rata penyelesaian task: ${team.avgCompletion}% (${team.tasksCompleted}/${team.totalTasks} task)\n`;
  p += `- Rata-rata skor KPI: ${team.avgKpiScore}%\n`;
  p += `- Rata-rata skor kualitas: ${team.avgQuality}%\n`;
  if (team.kpiHealth?.total) p += `- Kesehatan KPI: ${team.kpiHealth.onTrack} on-track, ${team.kpiHealth.atRisk} berisiko, ${team.kpiHealth.behind} tertinggal\n`;
  if (team.byKpi?.length) p += `- Capaian per KPI: ${team.byKpi.map((k: any) => `${k.title} ${k.avgAchievement}%`).join(', ')}\n`;
  if (team.byDivision?.length > 1) {
    p += `\nPER DIVISI:\n`;
    team.byDivision.forEach((dv: any) => { p += `- ${dv.department}: ${dv.headcount} orang, penyelesaian ${dv.avgCompletion}%, KPI ${dv.avgKpi}%\n`; });
  }
  p += `\nDETAIL PER ORANG:\n`;
  people.slice(0, 25).forEach((person: any) => {
    p += `\n• ${person.name} (${person.jobTitle || person.department}) — task ${person.tasksCompleted}/${person.totalTasks} (${person.completionRate}%), skor KPI ${person.kpiScore}%, hadir ${person.attendanceDays}/${person.workingDays} hari\n`;
    (person.kpis || []).forEach((k: any) => {
      p += `   - KPI "${k.title}" (bobot ${k.weight}%): pencapaian ${k.achievement}%`;
      if (k.weekly?.length) p += ` — target: ${k.weekly.map((w: any) => `${w.title}${w.timeframe ? ` (${w.timeframe})` : ''}: ${w.achievement}%`).join('; ')}`;
      p += `\n`;
    });
  });
  p += `\nTUGAS: ${isWeekly ? 'Buat laporan mingguan tim yang mendetail dan naratif' : 'Buat laporan bulanan tim yang mendetail dan naratif'} berdasarkan data di atas. Sertakan angka konkret.`;
  return p;
}

function fallbackNarrative(team: any, people: any[], periodLabel: string): string {
  const top = [...people].sort((a, b) => b.kpiScore - a.kpiScore)[0];
  const low = [...people].sort((a, b) => a.kpiScore - b.kpiScore)[0];
  return `## Ringkasan ${periodLabel}\n` +
    `- Tim ${team.headcount} orang menyelesaikan ${team.tasksCompleted}/${team.totalTasks} task (${team.avgCompletion}%).\n` +
    `- Rata-rata skor KPI tim: ${team.avgKpiScore}%, kualitas ${team.avgQuality}%.\n` +
    (top ? `- Performa terbaik: ${top.name} (KPI ${top.kpiScore}%).\n` : '') +
    (low && low !== top ? `- Perlu perhatian: ${low.name} (KPI ${low.kpiScore}%).\n` : '') +
    `\n_(AI narrative tidak tersedia — menampilkan ringkasan otomatis.)_`;
}
