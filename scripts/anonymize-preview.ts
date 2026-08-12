/**
 * Melihat siapa jadi siapa sebelum sesi review dimulai.
 *
 *   npx tsx scripts/anonymize-preview.ts
 *
 * Skrip ini hanya membaca. Ia membangun peta penyamaran yang sama seperti yang
 * dipakai aplikasi saat `ANONYMIZE_DATA=1`, lalu mencetaknya berdampingan
 * dengan data asli supaya bisa diperiksa manusia. Tidak ada satu pun baris
 * database yang diubah.
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { ensureMaskMap, resetMaskMap, maskRows, unmaskArgs } from '../lib/anonymize';

dotenv.config({ path: '.env.local' });

async function main() {
  const pool = process.env.MYSQL_URI
    ? mysql.createPool(process.env.MYSQL_URI)
    : mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      });

  const rawExec = async (sql: string, args?: unknown[]) => {
    const [rows] = await pool.execute(sql, (args ?? []) as any[]);
    return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  };

  resetMaskMap();
  const map = await ensureMaskMap(rawExec);

  const users = await rawExec(
    'SELECT id, name, email, role, department, job_title, avatar_image FROM users ORDER BY role, name',
  );

  const masked = maskRows(
    users.map((u) => ({ ...u })),
    map,
  );

  console.log(`\nPeta penyamaran — ${map.userCount} akun\n`);
  console.log(
    'ROLE'.padEnd(9) +
      'NAMA ASLI'.padEnd(26) +
      '→ NAMA TAMPIL'.padEnd(24) +
      'EMAIL TAMPIL'.padEnd(34) +
      'DEPARTEMEN TAMPIL',
  );
  console.log('─'.repeat(120));

  users.forEach((real, i) => {
    const fake = masked[i];
    console.log(
      String(real.role ?? '-').padEnd(9) +
        String(real.name ?? '-').slice(0, 24).padEnd(26) +
        ('→ ' + String(fake.name ?? '-')).slice(0, 22).padEnd(24) +
        String(fake.email ?? '-').slice(0, 32).padEnd(34) +
        String(fake.department ?? '—'),
    );
  });

  const realAvatars = users.filter(
    (u) => typeof u.avatar_image === 'string' && u.avatar_image,
  ).length;
  const leakedAvatars = masked.filter(
    (u) => typeof u.avatar_image === 'string' && u.avatar_image,
  ).length;

  console.log('\nDepartemen:');
  const depts = new Set<string>();
  users.forEach((u) => {
    if (typeof u.department === 'string' && u.department.trim()) depts.add(u.department.trim());
  });
  [...depts].sort().forEach((d) => console.log(`  ${d.padEnd(22)} → ${map.exact.get(d)}`));

  console.log('\nJabatan:');
  const jobs = new Set<string>();
  users.forEach((u) => {
    if (typeof u.job_title === 'string' && u.job_title.trim()) jobs.add(u.job_title.trim());
  });
  [...jobs].sort().forEach((j) => console.log(`  ${j.padEnd(22)} → ${map.exact.get(j)}`));

  console.log(`\nFoto profil: ${realAvatars} terpasang → ${leakedAvatars} yang masih tampil`);
  console.log(
    `Nama disapu di dalam teks: ${
      map.textPattern ? [...map.exact.keys()].filter((k) => !k.includes('@')).length : 0
    } nama`,
  );
  console.log(
    `Nama terlalu pendek untuk disapu di kalimat (hanya diganti di kolom nama): ${[
      ...map.shortNames.keys(),
    ]
      .map((n) => JSON.stringify(n))
      .join(', ')}`,
  );

  // Bukti pembalikan parameter: nilai palsu yang dikirim balik UI sebagai filter
  // harus tetap menemukan datanya.
  const sampleDept = [...depts][0];
  if (sampleDept) {
    const fakeDept = map.exact.get(sampleDept)!;
    const back = unmaskArgs([fakeDept], map)[0];
    console.log(
      `\nUji filter balik: UI mengirim "${fakeDept}" → query mencari "${back}" → ${
        back === sampleDept ? 'OK' : 'GAGAL'
      }`,
    );
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
