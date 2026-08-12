/**
 * Merapikan tiga peninggalan data yang membuat alur manager–HR–employee salah
 * sasaran. Sekali jalan; setelah ini alurnya menjaga dirinya sendiri.
 *
 * FASE 1 — Lepaskan tautan atasan bawaan data contoh.
 *   Backfill di migrate-schema pernah menyetel `manager_id = 'user_manager'`
 *   untuk SETIAP karyawan yang belum punya atasan. Bukan keputusan siapa pun,
 *   tapi sejak itu satu akun "memimpin" puluhan orang lintas divisi — dan
 *   karena penugasan eksplisit mengalahkan divisi, tautan palsu itu menimpa
 *   struktur yang sebenarnya benar.
 *
 * FASE 2 — Minta divisi kepada yang belum punya.
 *   Alur onboarding versi lama tidak menanyakan divisi; yang melewatinya
 *   ditandai selesai dan tidak akan pernah ditanya lagi. Menandai mereka
 *   "belum onboarding" membuat aplikasi menanyakannya sendiri saat login
 *   berikutnya — memakai alur yang sudah ada, tanpa HR mengisi satu per satu.
 *   Yang memang belum pernah onboarding tidak disentuh: mereka sudah otomatis
 *   ditanya.
 *
 * FASE 3 — Arsipkan KPI milik akun yang sudah dihapus.
 *   Penghapusan user dulu tidak membersihkan apa pun yang menempel padanya.
 *   Barisnya diarsipkan, BUKAN dihapus, jadi tetap bisa dilihat kalau ternyata
 *   masih dibutuhkan.
 *
 *   npx tsx scripts/repair-org-data.ts          # lihat saja, tidak menulis
 *   npx tsx scripts/repair-org-data.ts --apply  # kerjakan
 */
import { db } from "../lib/db";

const APPLY = process.argv.includes("--apply");

function head(title: string) {
  console.log(`\n${"═".repeat(66)}\n${title}\n${"═".repeat(66)}`);
}

async function fase1() {
  head("FASE 1 — Lepaskan tautan atasan bawaan data contoh");

  const rows = (await db.execute(`
    SELECT u.id, u.name, u.department
      FROM users u
     WHERE u.manager_id = 'user_manager'
     ORDER BY u.department, u.name`)).rows as any[];

  console.log(`Karyawan yang menempel ke 'user_manager': ${rows.length}`);
  const byDept = new Map<string, number>();
  for (const r of rows) {
    const d = r.department || "(tanpa divisi)";
    byDept.set(d, (byDept.get(d) || 0) + 1);
  }
  for (const [d, n] of byDept) console.log(`  ${String(d).padEnd(24)} ${n} orang`);

  if (rows.length === 0) return 0;

  console.log(
    `\nSetelah dilepas, mereka kembali ditemukan lewat divisinya masing-masing.\n` +
    `Yang belum punya divisi akan mengisinya sendiri lewat FASE 2.`
  );

  if (APPLY) {
    await db.execute("UPDATE users SET manager_id = NULL WHERE manager_id = 'user_manager'");
    console.log(`✅ ${rows.length} tautan dilepas.`);
  }
  return rows.length;
}

async function fase2() {
  head("FASE 2 — Minta divisi kepada yang belum punya");

  const rows = (await db.execute(`
    SELECT id, name, last_activity_at
      FROM users
     WHERE role = 'employee'
       AND (department IS NULL OR department = '')
       AND is_onboarded = 1
     ORDER BY name`)).rows as any[];

  const belum = (await db.execute(`
    SELECT COUNT(*) AS c FROM users
     WHERE role = 'employee' AND (department IS NULL OR department = '')
       AND (is_onboarded = 0 OR is_onboarded IS NULL)`)).rows[0] as any;

  console.log(`Sudah ditandai onboarding tapi tanpa divisi : ${rows.length}  ← akan ditanya ulang`);
  console.log(`Belum onboarding sama sekali                : ${belum.c}  ← sudah otomatis ditanya, tidak disentuh`);

  if (rows.length === 0) return 0;

  console.log(`\nContoh 10 nama pertama:`);
  for (const r of rows.slice(0, 10)) {
    console.log(`  ${String(r.name).padEnd(32)} terakhir aktif: ${r.last_activity_at || "-"}`);
  }
  if (rows.length > 10) console.log(`  … dan ${rows.length - 10} lainnya`);

  console.log(
    `\nMereka akan melihat layar onboarding sekali saat login berikutnya, lalu\n` +
    `memilih divisinya sendiri. Data lain (poin, task, KPI) tidak tersentuh.`
  );

  if (APPLY) {
    await db.execute(`
      UPDATE users SET is_onboarded = 0
       WHERE role = 'employee'
         AND (department IS NULL OR department = '')
         AND is_onboarded = 1`);
    console.log(`✅ ${rows.length} akan ditanya divisinya saat login berikutnya.`);
  }
  return rows.length;
}

async function fase3() {
  head("FASE 3 — Arsipkan KPI milik akun yang sudah dihapus");

  const rows = (await db.execute(`
    SELECT k.id, k.title, k.assigned_to, k.month, k.year, k.status
      FROM monthly_kpis k
      LEFT JOIN users u ON k.assigned_to = u.id
     WHERE k.scope <> 'team' AND u.id IS NULL AND k.status <> 'archived'`)).rows as any[];

  console.log(`KPI menunjuk akun yang tidak ada: ${rows.length}`);
  const byOwner = new Map<string, number>();
  for (const r of rows) byOwner.set(String(r.assigned_to), (byOwner.get(String(r.assigned_to)) || 0) + 1);
  console.log(`Tersebar di ${byOwner.size} id pemilik yang sudah terhapus.`);

  if (rows.length === 0) return 0;

  console.log(`\nDiarsipkan (status = 'archived'), tidak dihapus — masih bisa dipanggil balik.`);

  if (APPLY) {
    await db.execute(`
      UPDATE monthly_kpis k
        LEFT JOIN users u ON k.assigned_to = u.id
         SET k.status = 'archived'
       WHERE k.scope <> 'team' AND u.id IS NULL AND k.status <> 'archived'`);
    console.log(`✅ ${rows.length} KPI diarsipkan.`);
  }
  return rows.length;
}

async function main() {
  console.log(APPLY ? "MODE: MENULIS" : "MODE: UJI COBA (tidak ada yang ditulis)");

  const a = await fase1();
  const b = await fase2();
  const c = await fase3();

  head("RINGKASAN");
  console.log(`  Tautan atasan palsu dilepas     : ${a}`);
  console.log(`  Akan ditanya divisinya          : ${b}`);
  console.log(`  KPI diarsipkan                  : ${c}`);
  console.log(
    APPLY
      ? `\nSelesai. Periksa hasilnya: npx tsx scripts/report-org-gaps.ts`
      : `\nBelum ada yang ditulis. Jalankan ulang dengan --apply untuk mengerjakan.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
