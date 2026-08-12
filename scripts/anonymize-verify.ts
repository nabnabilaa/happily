/**
 * Uji kebocoran: jalankan query yang benar-benar dipakai route-route aplikasi
 * dengan penyamaran menyala, lalu periksa hasilnya baris demi baris apakah masih
 * ada nama, email, atau foto asli yang lolos.
 *
 *   npx tsx scripts/anonymize-verify.ts
 *
 * Hanya membaca. Keluar dengan kode 1 kalau ada kebocoran, supaya bisa dijadikan
 * gerbang sebelum sesi review dimulai.
 */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { resetMaskMap } from '../lib/anonymize';

dotenv.config({ path: '.env.local' });

// Harus diset SEBELUM query pertama lewat db.execute.
process.env.ANONYMIZE_DATA = '1';

/** Query yang mencerminkan permukaan yang dilihat peninjau. */
const QUERIES: { label: string; sql: string }[] = [
  {
    label: 'leaderboard',
    sql: 'SELECT id, name, points, level, `rank`, avatar_image, department FROM users ORDER BY points DESC LIMIT 20',
  },
  {
    label: 'chat/messages',
    sql: `SELECT m.*, u.name as sender_name, u.avatar_image as sender_avatar
            FROM messages m JOIN users u ON m.sender_id = u.id
           ORDER BY m.created_at DESC LIMIT 60`,
  },
  {
    label: 'notifications',
    sql: 'SELECT id, title, message, type, action_url FROM notifications ORDER BY created_at DESC LIMIT 80',
  },
  {
    label: 'hr/dashboard users',
    sql: `SELECT u.id, u.name, u.email, u.job_title as role, u.department, u.avatar_image, t.name as team_name
            FROM users u LEFT JOIN teams t ON u.team_id = t.id LIMIT 40`,
  },
  // `/api/hr/users` memakai SELECT * — jadi yang diuji juga harus SELECT *,
  // termasuk kolom yang tidak pernah dipakai UI tapi tetap terkirim.
  { label: 'hr/users (SELECT *)', sql: 'SELECT * FROM users LIMIT 80' },
  {
    label: 'presence board (/api/status)',
    sql: `SELECT u.id, u.name, u.job_title, u.avatar_image, u.role, u.points, u.department,
                 t.name as team_name, us.status, us.reason, us.attachment_url
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            LEFT JOIN user_status us ON u.id = us.user_id
           WHERE u.role IN ('employee','manager') LIMIT 80`,
  },
  {
    label: 'kpi + assignee',
    sql: `SELECT k.*, u.name as assignee_name FROM monthly_kpis k
            JOIN users u ON k.assigned_to = u.id LIMIT 40`,
  },
  {
    label: 'attendance logs',
    sql: `SELECT a.*, u.name as user_name, u.email as user_email, u.department as user_department
            FROM attendance a JOIN users u ON a.user_id = u.id
           ORDER BY a.check_in_at DESC LIMIT 40`,
  },
  {
    label: 'focus room participants',
    sql: `SELECT fp.*, u.name, u.avatar_image AS avatar
            FROM focus_room_participants fp JOIN users u ON u.id = fp.user_id LIMIT 40`,
  },
  {
    label: 'kudos',
    sql: `SELECT k.id, k.message, k.value_tag, s.name as sender_name, r.name as receiver_name
            FROM kudos k JOIN users s ON k.sender_id = s.id JOIN users r ON k.receiver_id = r.id
           ORDER BY k.created_at DESC LIMIT 40`,
  },
  { label: 'mood wall', sql: 'SELECT id, mood, content, department FROM mood_wall_posts ORDER BY created_at DESC LIMIT 40' },
  { label: 'daily priorities', sql: `SELECT dp.*, u.name as user_name FROM daily_priorities dp JOIN users u ON dp.user_id = u.id LIMIT 40` },
  { label: 'goals + owner', sql: `SELECT g.*, u.name as owner_name FROM goals g JOIN users u ON g.owner_id = u.id LIMIT 40` },
  { label: 'notes + author', sql: `SELECT n.id, n.title, n.content, u.name as author_name, u.department as author_department FROM notes n JOIN users u ON n.user_id = u.id LIMIT 40` },
  { label: 'departments', sql: 'SELECT id, name FROM departments' },
  { label: 'teams', sql: 'SELECT id, name, department FROM teams' },
  { label: 'user_status', sql: `SELECT us.*, u.name FROM user_status us JOIN users u ON us.user_id = u.id LIMIT 40` },
  { label: 'survey responses', sql: `SELECT sr.*, u.name as user_name, u.department as user_department FROM survey_responses sr JOIN users u ON sr.user_id = u.id LIMIT 40` },
  { label: 'reward redemptions', sql: `SELECT rr.*, u.name as user_name, u.email as user_email FROM reward_redemptions rr JOIN users u ON rr.user_id = u.id LIMIT 40` },
  // Teks yang ditulis AI adalah jalur kebocoran yang paling mudah terlewat: nama
  // karyawan sudah ikut terkarang di dalam kalimatnya, bukan di kolom tersendiri.
  { label: 'AI: report narratives', sql: 'SELECT id, scope, type, narrative FROM report_narratives LIMIT 60' },
  { label: 'AI: weekly summaries', sql: 'SELECT id, user_id, summary_text, score FROM ai_weekly_summaries LIMIT 40' },
  { label: 'AI: monthly analyses', sql: 'SELECT id, user_id, analysis_text FROM ai_monthly_analyses LIMIT 40' },
  { label: 'AI: memory', sql: 'SELECT id, user_id, kind, content, source FROM ai_memory LIMIT 60' },
  { label: 'logbook entries', sql: 'SELECT id, user_id, title, content, description, metadata_json FROM logbook_entries LIMIT 60' },
  { label: 'xp transactions', sql: 'SELECT id, user_id, action_type, description FROM xp_transactions ORDER BY created_at DESC LIMIT 80' },
  { label: 'notification templates', sql: 'SELECT trigger_key, title_template, message_template FROM notification_templates' },
  { label: 'manager weekly notes', sql: 'SELECT id, manager_id, employee_id, note, rating FROM manager_weekly_notes LIMIT 40' },
  { label: 'monthly reports', sql: 'SELECT id, user_id, manager_summary, kpi_score, status FROM monthly_reports LIMIT 40' },
  { label: 'user skills', sql: 'SELECT id, user_id, name, current_level FROM user_skills LIMIT 60' },
  { label: 'learning items', sql: 'SELECT id, title, meta_info, tag FROM learning_items LIMIT 40' },
  // Nama yang tertanam di dalam nama benda, bukan di kolom nama orang:
  // "nabila's Room" tidak sama dengan nilai `users.name` mana pun.
  { label: 'focus rooms', sql: 'SELECT id, name, description, mode, status, join_code FROM focus_rooms LIMIT 40' },
  { label: 'chat channels', sql: 'SELECT id, name, type, avatar_emoji FROM message_channels LIMIT 60' },
  {
    label: 'chat channel members',
    sql: `SELECT mcm.channel_id, u.name, u.avatar_image FROM message_channel_members mcm
            JOIN users u ON mcm.user_id = u.id LIMIT 80`,
  },
  { label: 'calendar events', sql: 'SELECT id, creator_id, title, description, location, event_type FROM calendar_events LIMIT 80' },
  {
    label: 'calendar attendees',
    sql: `SELECT ca.event_id, ca.status, u.name, u.email FROM calendar_attendees ca
            JOIN users u ON ca.user_id = u.id LIMIT 80`,
  },
  // Alamat Gmail asli + token OAuth. Token tidak pernah dipakai UI, tapi ia ikut
  // terkirim setiap kali route memakai SELECT *.
  { label: 'google integrations', sql: 'SELECT * FROM google_integrations' },
  { label: 'habits', sql: 'SELECT id, user_id, name, streak, glyph FROM habits LIMIT 80' },
  { label: 'user rewards', sql: 'SELECT id, user_id, title, points FROM user_rewards LIMIT 40' },
  { label: 'password resets', sql: 'SELECT email, created_at FROM password_resets LIMIT 20' },
  // Uji regresi untuk lubang yang pernah ada: penyamaran tidak boleh bergantung
  // pada nama kolom. Alias di sini sengaja dibuat bahasa Indonesia dan tidak ada
  // di daftar mana pun — kalau uji ini bocor, berarti penyaringan kembali
  // mengandalkan nama kolom dan route mana pun bisa melewatinya dengan alias.
  {
    label: 'alias tak dikenal (regresi)',
    sql: `SELECT n.title as judul, n.message as pesan, u.name as siapa, u.email as alamat,
                 u.avatar_image as gambar, u.department as bagian, u.job_title as posisi
            FROM notifications n JOIN users u ON n.user_id = u.id
           ORDER BY n.created_at DESC LIMIT 80`,
  },
  {
    label: 'alias tak dikenal — chat',
    sql: `SELECT m.content as tulisan, u.name as pengirim, c.name as ruang
            FROM messages m JOIN users u ON m.sender_id = u.id
            LEFT JOIN message_channels c ON m.channel_id = c.id LIMIT 60`,
  },
];

interface Leak {
  query: string;
  column: string;
  found: string;
  sample: string;
}

/**
 * Kolom yang isinya pilihan/identitas, bukan kalimat karangan orang. Nama
 * departemen yang muncul di sini adalah data terstruktur dan wajib tersamarkan.
 *
 * Di luar daftar ini, kata seperti "Design" atau "Product" di dalam prosa
 * dilaporkan sebagai peringatan, bukan kebocoran: "Rangkuman Workshop Design
 * System" adalah judul catatan biasa, dan menyapunya akan berbunyi "Rangkuman
 * Workshop Divisi Logistik System" — merusak tampilan tanpa melindungi siapa
 * pun, karena nama dan email orangnya sudah tersamarkan.
 */
const STRUCTURED_COLUMN = /onboarding|answer|jawaban|metadata|payload|division|divisi|department|job_?title|(^|_)role$/i;

function walk(
  value: unknown,
  key: string,
  visit: (key: string, text: string) => void,
  depth = 0,
): void {
  if (value === null || value === undefined || depth > 5) return;
  if (typeof value === 'string') return visit(key, value);
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, key, visit, depth + 1));
    return;
  }
  if (typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walk(v, k, visit, depth + 1);
    }
  }
}

/**
 * Uji arsitektur, bukan uji data: penyamaran ini berdiri di atas satu asumsi —
 * bahwa `lib/db.ts` adalah SATU-SATUNYA tempat aplikasi menyentuh MySQL. Asumsi
 * itu benar hari ini, tapi tidak ada yang menahannya: satu route yang membuat
 * pool sendiri akan melewati penyaringan tanpa error, tanpa peringatan, dan
 * tanpa ada yang tahu sampai nama asli muncul di layar peninjau.
 *
 * Skrip di direktori `scripts/` sengaja dikecualikan — itu perkakas pengembangan
 * yang memang perlu melihat data asli, dan tidak pernah dijalankan pengunjung.
 */
function checkSingleDoor(): string[] {
  const violations: string[] = [];
  const roots = ['app', 'lib', 'hooks', 'components'];
  const allowed = path.normalize('lib/db.ts');

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        if (path.normalize(full) === allowed) continue;
        const source = fs.readFileSync(full, 'utf8');
        if (/from\s+['"]mysql2|require\(['"]mysql2/.test(source)) {
          violations.push(`${full} mengimpor mysql2 langsung`);
        }
        // `executeUnmasked` mengembalikan baris tanpa penyamaran. Ia ada karena
        // pemeriksaan password memang butuh hash yang asli, dan pemakaian yang
        // sah selalu berbentuk sempit: satu kolom, dibandingkan di server,
        // tidak pernah dikirim ke klien. Pemakaian yang tidak sah bentuknya
        // sama persis di mata TypeScript — jadi daftarnya dijaga di sini.
        if (/\bexecuteUnmasked\b/.test(source) && !UNMASKED_ALLOWED.has(path.normalize(full))) {
          violations.push(`${full} memakai db.executeUnmasked (tidak ada di daftar yang diizinkan)`);
        }
      }
    }
  };

  roots.forEach(walk);
  return violations;
}

/** Berkas yang boleh membaca nilai tanpa penyamaran. Tambah ke sini hanya kalau
 *  nilainya dibandingkan di server dan tidak pernah masuk respons. */
const UNMASKED_ALLOWED = new Set([path.normalize('app/api/auth/login/route.ts')]);

async function main() {
  const doorViolations = checkSingleDoor();
  console.log(
    doorViolations.length === 0
      ? 'Arsitektur: lib/db.ts masih satu-satunya pintu ke MySQL.\n'
      : `Arsitektur: ${doorViolations.length} berkas melewati lib/db.ts —\n` +
          doorViolations.map((v) => `  ${v}`).join('\n') +
          '\n',
  );

  // Sisi "kebenaran": daftar data asli, dibaca lewat koneksi mentah yang TIDAK
  // lewat lapisan penyamaran.
  const rawPool = mysql.createPool(process.env.MYSQL_URI || '');
  const [rawUsers] = await rawPool.execute(
    'SELECT id, name, email, avatar_image, department, job_title FROM users',
  );

  // Ambang 3 karakter, sama dengan ambang penyapuan. Versi sebelumnya memakai 5
  // dan karena itu tidak pernah melihat "wil menyapamu!" di notifikasi — nama
  // yang tidak dicari tidak akan pernah dilaporkan bocor.
  const keepInText = new Set(['Maxy', 'maxy', 'HP', 'HR', 'IT', 'DM']);
  const realNames = (rawUsers as any[])
    .map((u) => String(u.name ?? '').trim())
    .filter((n) => n.length >= 3 && !keepInText.has(n));
  const realEmails = (rawUsers as any[])
    .map((u) => String(u.email ?? '').trim().toLowerCase())
    .filter(Boolean);
  const realEmailSet = new Set(realEmails);
  const realAvatars = new Set(
    (rawUsers as any[])
      .map((u) => String(u.avatar_image ?? '').trim())
      .filter((a) => a.length > 8),
  );

  // Departemen & jabatan asli. Versi pertama pemeriksa ini hanya mencari nama,
  // email, dan foto — dan karena itu ia lolos begitu saja pada
  // `users.onboarding_answers`, yang menyimpan departemen asli di dalam JSON
  // jawaban onboarding. Apa yang tidak dicari tidak akan pernah ketemu.
  const realOrgTerms = [
    ...new Set(
      (rawUsers as any[])
        .flatMap((u) => [String(u.department ?? '').trim(), String(u.job_title ?? '').trim()])
        .filter((v) => v.length >= 4),
    ),
  ];
  const orgPattern = realOrgTerms.length
    ? new RegExp(
        `(?<![\\p{L}\\p{N}])(${realOrgTerms
          .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|')})(?![\\p{L}\\p{N}])`,
        'u',
      )
    : null;

  console.log(
    `Pembanding: ${realNames.length} nama (≥5 karakter), ${realEmails.length} email, ` +
      `${realAvatars.size} foto profil, ${realOrgTerms.length} departemen/jabatan.\n`,
  );

  resetMaskMap();
  const { db } = await import('../lib/db');

  const leaks: Leak[] = [];
  const warnings: Leak[] = [];
  let rowsChecked = 0;

  for (const q of QUERIES) {
    let rows: any[];
    try {
      rows = (await db.execute(q.sql)).rows;
    } catch (error: any) {
      console.log(`  ~ ${q.label.padEnd(26)} dilewati (${error.code || error.message})`);
      continue;
    }

    const before = leaks.length;
    for (const row of rows) {
      rowsChecked++;
      walk(row, '(row)', (column, text) => {
        for (const name of realNames) {
          if (text.includes(name)) {
            leaks.push({ query: q.label, column, found: name, sample: text.slice(0, 100) });
            return;
          }
        }
        const lower = text.toLowerCase();
        if (realEmailSet.has(lower)) {
          leaks.push({ query: q.label, column, found: text, sample: 'email persis' });
          return;
        }
        for (const email of realEmails) {
          if (lower.includes(email)) {
            leaks.push({ query: q.label, column, found: email, sample: text.slice(0, 100) });
            return;
          }
        }
        if (realAvatars.has(text)) {
          leaks.push({ query: q.label, column, found: 'foto profil asli', sample: text.slice(0, 60) });
          return;
        }
        if (orgPattern) {
          const orgHit = orgPattern.exec(text);
          if (orgHit) {
            const isStructured =
              STRUCTURED_COLUMN.test(column) || text.trim() === orgHit[1];
            (isStructured ? leaks : warnings).push({
              query: q.label,
              column,
              found: `departemen/jabatan asli "${orgHit[1]}"`,
              sample: text.slice(0, 100),
            });
          }
        }
      });
    }

    const added = leaks.length - before;
    console.log(
      `  ${added === 0 ? 'OK  ' : 'BOCOR'} ${q.label.padEnd(28)} ${String(rows.length).padStart(4)} baris` +
        (added ? `  ← ${added} kebocoran` : ''),
    );
  }

  // Filter yang dikirim balik UI harus tetap menemukan data (pembalikan parameter).
  const [deptRows] = await rawPool.execute(
    "SELECT department FROM users WHERE department IS NOT NULL AND department <> '' LIMIT 1",
  );
  const realDept = (deptRows as any[])[0]?.department;
  let roundTrip = 'dilewati (tidak ada departemen terisi)';
  if (realDept) {
    const shown = (await db.execute('SELECT department FROM users WHERE department = ? LIMIT 1', [realDept]))
      .rows[0]?.department;
    const backCount = (
      await db.execute('SELECT COUNT(*) as c FROM users WHERE department = ?', [shown])
    ).rows[0]?.c;
    roundTrip =
      Number(backCount) > 0
        ? `OK — filter "${shown}" mengembalikan ${backCount} akun`
        : `GAGAL — filter "${shown}" mengembalikan 0 akun`;
  }

  console.log(`\n${rowsChecked} baris diperiksa.`);
  console.log(`Pembalikan filter departemen: ${roundTrip}`);

  if (leaks.length === 0) {
    console.log('\nTidak ada nama, email, foto, atau departemen terstruktur yang lolos.');
  } else {
    console.log(`\n${leaks.length} KEBOCORAN:`);
    for (const leak of leaks.slice(0, 40)) {
      console.log(`  [${leak.query}] kolom "${leak.column}" → ${leak.found}`);
      console.log(`      ${leak.sample}`);
    }
    if (leaks.length > 40) console.log(`  ... dan ${leaks.length - 40} lagi`);
  }

  if (warnings.length) {
    // Bukan kebocoran identitas: nama departemen sebagai kata biasa di dalam
    // judul/isi tulisan dan di dalam id laporan. Dibiarkan dengan sengaja —
    // menyapunya merusak kalimat, dan orangnya sudah tidak bisa dikenali.
    const byColumn = new Map<string, number>();
    for (const w of warnings) {
      const key = `${w.query} · ${w.column}`;
      byColumn.set(key, (byColumn.get(key) ?? 0) + 1);
    }
    console.log(
      `\n${warnings.length} peringatan — nama departemen muncul sebagai kata biasa di dalam teks/id (dibiarkan dengan sengaja):`,
    );
    for (const [key, count] of [...byColumn.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(3)}×  ${key}`);
    }
    console.log(`  contoh: ${warnings[0].sample}`);
  }

  await rawPool.end();
  const pass =
    leaks.length === 0 && doorViolations.length === 0 && !roundTrip.startsWith('GAGAL');
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
