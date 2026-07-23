import { db } from '../lib/db';

// Seeds a realistic demo department ("Growth Marketing") with a manager + 5 employees,
// each having monthly KPIs, weekly targets, daily tasks (logbook), and attendance —
// for June 2026 (full) and July 2026 (up to the 13th). Re-runnable (clears demo_* first).

const DEPT = 'Growth Marketing';
const MGR = { id: 'demo_mgr', name: 'Dina Pratama', job: 'Growth Manager', perf: 0.88 };
const EMPLOYEES = [
  { id: 'demo_emp_1', name: 'Rani Kusuma', job: 'Content Strategist', perf: 0.9 },
  { id: 'demo_emp_2', name: 'Bagas Nugroho', job: 'SEO Specialist', perf: 0.82 },
  { id: 'demo_emp_3', name: 'Sinta Dewi', job: 'Social Media Lead', perf: 0.7 },
  { id: 'demo_emp_4', name: 'Yoga Prakoso', job: 'Growth Analyst', perf: 0.55 },
  { id: 'demo_emp_5', name: 'Maya Lestari', job: 'Performance Marketer', perf: 0.95 },
];

// Model target: 1 KPI diselesaikan beberapa target dgn DURASI BEBAS (bukan wajib mingguan).
// Tiap KPI punya rencana target (span = jumlah minggu yang dicakup, name = nama target nyata).
const KPI_TEMPLATES = [
  {
    key: 'a', title: 'Pertumbuhan Traffic Organik', desc: 'Naikkan sesi organik bulan ini', weight: 40, unit: '%',
    plan: [
      { span: 2, name: 'Audit teknis & riset keyword' },
      { span: 2, name: 'Optimasi on-page 20 halaman' },
      { span: 1, name: 'Publikasi 6 artikel pilar' },
    ],
  },
  {
    key: 'b', title: 'Konversi Lead Berkualitas', desc: 'Jumlah MQL yang dihasilkan', weight: 35, unit: 'lead',
    plan: [
      { span: 3, name: 'Kampanye lead magnet' },
      { span: 2, name: 'Nurture & follow-up MQL' },
    ],
  },
  {
    key: 'c', title: 'Konsistensi Publikasi Konten', desc: 'Konten terbit sesuai kalender', weight: 25, unit: 'konten',
    plan: [
      { span: 1, name: 'Susun kalender editorial' },
      { span: 4, name: 'Eksekusi kalender konten' },
    ],
  },
];

// Bagi rencana target ke minggu yang tersedia (durasi bervariasi, sisa minggu masuk target terakhir).
function distributeTargets(plan: { span: number; name: string }[], weeks: number[]) {
  const out: { name: string; weeks: number[]; weekStart: number; timeframe: string }[] = [];
  let idx = 0;
  for (let i = 0; i < plan.length && idx < weeks.length; i++) {
    const take = Math.min(plan[i].span, weeks.length - idx);
    const span = weeks.slice(idx, idx + take);
    out.push({ name: plan[i].name, weeks: span, weekStart: span[0], timeframe: '' });
    idx += take;
  }
  if (idx < weeks.length && out.length) out[out.length - 1].weeks.push(...weeks.slice(idx));
  for (const t of out) {
    const a = t.weeks[0], b = t.weeks[t.weeks.length - 1];
    t.timeframe = a === b ? `Minggu ${a}` : `Minggu ${a}–${b}`;
  }
  return out;
}

const TASK_TEMPLATES = [
  'Riset kata kunci & kompetitor', 'Menulis artikel blog', 'Optimasi on-page SEO', 'Menjadwalkan post media sosial',
  'Analisa performa campaign', 'A/B test landing page', 'Update dashboard metrik', 'Koordinasi dengan tim desain',
  'Review copy iklan', 'Menyusun laporan mingguan', 'Outreach backlink', 'Membalas komentar & DM audiens',
];

const pad = (n: number) => String(n).padStart(2, '0');
const dstr = (y: number, m: number, d: number, h = 0, mi = 0, s = 0) => `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(s)}`;
const weekOfMonth = (day: number) => Math.min(5, Math.ceil(day / 7));

// weekdays (Mon–Fri) of a month up to maxDay
function weekdays(year: number, month: number, maxDay: number): number[] {
  const out: number[] = [];
  const last = new Date(year, month, 0).getDate();
  for (let d = 1; d <= Math.min(maxDay, last); d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) out.push(d);
  }
  return out;
}

const PERIODS = [
  { year: 2026, month: 6, maxDay: 31, weeks: [1, 2, 3, 4, 5] }, // Juni penuh
  { year: 2026, month: 7, maxDay: 13, weeks: [1, 2] },          // Juli s/d tgl 13
];

async function clearDemo() {
  console.log('🧹 Membersihkan data demo lama...');
  await db.execute("DELETE FROM daily_priorities WHERE user_id LIKE 'demo_%'");
  await db.execute("DELETE FROM weekly_targets WHERE id LIKE 'demo_%'");
  await db.execute("DELETE FROM monthly_kpis WHERE id LIKE 'demo_%'");
  await db.execute("DELETE FROM attendance WHERE user_id LIKE 'demo_%'");
  await db.execute("DELETE FROM logbook_entries WHERE user_id LIKE 'demo_%'");
  await db.execute("DELETE FROM users WHERE id LIKE 'demo_%'");
}

async function ensureDepartment() {
  const res = await db.execute({ sql: "SELECT id FROM departments WHERE name = ?", args: [DEPT] });
  if (!res.rows.length) {
    await db.execute({ sql: "INSERT INTO departments (name) VALUES (?)", args: [DEPT] });
    console.log(`🏢 Departemen "${DEPT}" dibuat.`);
  }
}

async function seedUsers() {
  // Manager
  await db.execute({
    sql: `INSERT INTO users (id, email, name, role, department, job_title, level, points, coins)
          VALUES (?, ?, ?, 'manager', ?, ?, 5, 2400, 2400)`,
    args: [MGR.id, `${MGR.id}@demo.flowbee`, MGR.name, DEPT, MGR.job],
  });
  // Employees (reporting to the manager)
  for (const e of EMPLOYEES) {
    const lvl = Math.round(2 + e.perf * 4);
    const pts = Math.round(500 + e.perf * 2500);
    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, department, job_title, manager_id, level, points, coins)
            VALUES (?, ?, ?, 'employee', ?, ?, ?, ?, ?, ?)`,
      args: [e.id, `${e.id}@demo.flowbee`, e.name, DEPT, e.job, MGR.id, lvl, pts, pts],
    });
  }
  console.log(`👥 ${EMPLOYEES.length} karyawan + 1 manager dibuat.`);
}

async function seedForEmployee(e: typeof EMPLOYEES[number]) {
  for (const P of PERIODS) {
    const days = weekdays(P.year, P.month, P.maxDay);
    // ── KPIs (+ target berdurasi bebas) ──
    const kpiIds: Record<string, string> = {};
    // Per KPI: peta minggu → id target (agar task harian bisa dilink ke target yang mencakup minggunya).
    const weekTargetId: Record<string, Record<number, string>> = {};
    const lastTargetId: Record<string, string> = {};
    const targetTitleById: Record<string, string> = {};
    for (const t of KPI_TEMPLATES) {
      const kpiId = `demo_${e.id}_${P.month}_${t.key}`;
      kpiIds[t.key] = kpiId;
      weekTargetId[t.key] = {};
      const finalScore = Math.round((e.perf * 100) + (Math.random() * 16 - 8));
      const score = Math.max(20, Math.min(100, finalScore));
      const metricTarget = t.key === 'a' ? 30 : t.key === 'b' ? 50 : 16;
      const metricCurrent = Math.round(metricTarget * e.perf * (0.9 + Math.random() * 0.2));
      await db.execute({
        sql: `INSERT INTO monthly_kpis (id, title, target_description, weight, month, year, assigned_to, assigned_by, status, final_score, kpi_type, metric_target, metric_current, metric_unit, scope)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'metric', ?, ?, ?, 'assigned')`,
        args: [kpiId, t.title, t.desc, t.weight, P.month, P.year, e.id, MGR.id, score >= 90 ? 'completed' : 'active', score, metricTarget, metricCurrent, t.unit],
      });
      // Target (durasi bervariasi, nama nyata + timeframe) — bukan seragam minggu 1–5.
      const targets = distributeTargets(t.plan, P.weeks);
      let ti = 0;
      for (const tg of targets) {
        const wtId = `demo_${e.id}_${P.month}_${t.key}_t${ti++}`;
        const target = 100;
        const current = Math.max(20, Math.min(115, Math.round(e.perf * 100 + (Math.random() * 24 - 12))));
        await db.execute({
          sql: `INSERT INTO weekly_targets (id, kpi_id, title, description, week_number, target_value, current_value, metric_unit, status, timeframe)
                VALUES (?, ?, ?, ?, ?, ?, ?, '%', ?, ?)`,
          args: [wtId, kpiId, tg.name, t.desc, tg.weekStart, target, current, current >= 100 ? 'completed' : 'active', tg.timeframe],
        });
        for (const w of tg.weeks) weekTargetId[t.key][w] = wtId;
        lastTargetId[t.key] = wtId;
        targetTitleById[wtId] = tg.name;
      }
    }

    // ── Daily tasks (logbook harian) ──
    let taskN = 0;
    for (const d of days) {
      const w = weekOfMonth(d);
      const nTasks = 1 + (d % 2); // 1–2 tasks/hari
      for (let i = 0; i < nTasks; i++) {
        const tpl = TASK_TEMPLATES[(taskN + d) % TASK_TEMPLATES.length];
        const done = Math.random() < e.perf;
        const verified = done && Math.random() < 0.8;
        const kpiTpl = KPI_TEMPLATES[taskN % 3];
        const kpiKey = kpiTpl.key;
        const kpiId = kpiIds[kpiKey];
        // Link ke target yang mencakup minggu ini; kalau tak ada, ke target terakhir KPI tsb.
        const wtId = weekTargetId[kpiKey][w] || lastTargetId[kpiKey];
        const wtTitle = targetTitleById[wtId] || kpiTpl.title;
        const id = `demo_${e.id}_${P.month}_t${taskN}`;
        const dateStr = dstr(P.year, P.month, d, 9 + i, 30);
        await db.execute({
          sql: `INSERT INTO daily_priorities (id, user_id, title, goal_title, is_done, is_verified, tone, type, points_awarded, created_at, kpi_id, source, proof_link, proof_notes, target_date, description, progress, status, weekly_target_id, weekly_target_title, completed_at, department)
                VALUES (?, ?, ?, ?, ?, ?, 'blue', 'task', 50, ?, ?, 'website', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id, e.id, tpl, kpiTpl.title, done ? 1 : 0, verified ? 1 : 0, dateStr, kpiId,
            done ? `https://drive.demo/${e.id}/${taskN}` : null, done ? 'Bukti pekerjaan terlampir.' : null,
            dstr(P.year, P.month, d), `Detail: ${tpl.toLowerCase()} untuk ${kpiTpl.title}.`,
            done ? 100 : Math.round(Math.random() * 60), done ? 'done' : 'todo',
            wtId, wtTitle, done ? dateStr : null, DEPT,
          ],
        });
        taskN++;
      }
    }

    // ── Attendance ──
    for (const d of days) {
      const late = Math.random() > e.perf;
      const inH = late ? 9 : 8, inM = late ? 25 : 50 + Math.floor(Math.random() * 8);
      const dur = 480 + Math.floor(Math.random() * 90);
      await db.execute({
        sql: `INSERT INTO attendance (user_id, check_in_at, check_out_at, check_in_type, notes, mood, duration_minutes, status)
              VALUES (?, ?, ?, 'WFO', ?, ?, ?, 'present')`,
        args: [e.id, dstr(P.year, P.month, d, inH, inM), dstr(P.year, P.month, d, 17, 30 + Math.floor(Math.random() * 20)),
          late ? 'Terlambat sedikit' : 'Tepat waktu', ['joy', 'calm', 'neutral', 'tired'][d % 4], dur],
      });
    }

    // ── Logbook entries (untuk tab Logbook) ──
    for (let k = 0; k < 6; k++) {
      const d = days[Math.min(days.length - 1, k * 3)];
      const tpl = TASK_TEMPLATES[(k * 2) % TASK_TEMPLATES.length];
      await db.execute({
        sql: `INSERT INTO logbook_entries (user_id, type, title, content, description, points, xp_earned, created_at)
              VALUES (?, 'task_done', ?, ?, ?, 50, 50, ?)`,
        args: [e.id, `Menyelesaikan: ${tpl}`, `Selesai mengerjakan ${tpl.toLowerCase()}.`, `Terkait ${KPI_TEMPLATES[k % 3].title}.`, dstr(P.year, P.month, d, 16, 0)],
      });
    }
  }
  console.log(`  ✓ ${e.name} (perf ${Math.round(e.perf * 100)}%)`);
}

async function run() {
  console.log('🌱 Seeding demo department...');
  await clearDemo();
  await ensureDepartment();
  await seedUsers();
  for (const e of [MGR, ...EMPLOYEES]) await seedForEmployee(e); // manager juga punya KPI/task sendiri
  console.log(`\n✅ Selesai. Departemen "${DEPT}": ${EMPLOYEES.length} karyawan, KPI + target mingguan + task harian + absensi untuk Juni & Juli 2026.`);
  console.log('   Login/lihat sebagai HR → tab People → kartu "Growth Marketing".');
  process.exit(0);
}

run().catch(e => { console.error('❌ Seed gagal:', e); process.exit(1); });
