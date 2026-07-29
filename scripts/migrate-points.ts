/**
 * Migrasi skema untuk sistem poin.
 *
 * Dijalankan langsung terhadap database (Aiven), BUKAN lewat
 * /api/migrate-schema. Route itu tidak cocok untuk database hidup karena tiga
 * alasan: ia juga menjatuhkan tabel legacy dan menyemai baris demo, ia butuh
 * server Next berjalan, dan ia POST tanpa autentikasi apa pun — siapa pun yang
 * tahu URL-nya bisa memicu perubahan skema di produksi.
 *
 * Script ini sengaja sempit: hanya menambah kolom, indeks, dan satu tabel.
 * Tidak ada DROP, tidak ada penyemaian, tidak ada UPDATE selain mengisi kolom
 * baru untuk baris lama.
 *
 * Aman dijalankan berulang kali — semua langkah memeriksa keberadaan dulu.
 *
 *   npx tsx scripts/migrate-points.ts
 *   npx tsx scripts/migrate-points.ts --dry-run
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DRY = process.argv.includes("--dry-run");

type Step = {
  desc: string;
  /** Melewati langkah ini kalau sudah diterapkan. */
  skipIf: (c: mysql.Connection) => Promise<boolean>;
  sql: string;
};

async function columnExists(c: mysql.Connection, table: string, column: string) {
  const [rows]: any = await c.execute(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function indexExists(c: mysql.Connection, table: string, index: string) {
  const [rows]: any = await c.execute(
    `SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1`,
    [table, index],
  );
  return rows.length > 0;
}

async function tableExists(c: mysql.Connection, table: string) {
  const [rows]: any = await c.execute(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [table],
  );
  return rows.length > 0;
}

const STEPS: Step[] = [
  {
    // Kunci idempoten: identitas kejadian yang dibayar. Inilah yang membuat
    // "batalkan lalu kumpulkan lagi" berhenti menghasilkan poin.
    desc: "xp_transactions.ref_id",
    skipIf: (c) => columnExists(c, "xp_transactions", "ref_id"),
    sql: "ALTER TABLE xp_transactions ADD COLUMN ref_id VARCHAR(120) DEFAULT NULL",
  },
  {
    // Ledger append-only: pembatalan ditulis sebagai baris 'reversal' bernilai
    // negatif, bukan dengan menghapus baris aslinya.
    desc: "xp_transactions.kind",
    skipIf: (c) => columnExists(c, "xp_transactions", "kind"),
    sql: "ALTER TABLE xp_transactions ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'earn'",
  },
  {
    // Baris lama tidak punya ref_id. Diberi penanda unik supaya tidak bentrok
    // dengan kunci unik di bawah, sekaligus menjaga riwayat tetap utuh untuk
    // penjumlahan leaderboard.
    desc: "backfill ref_id baris lama",
    skipIf: async (c) => {
      // Saat dry-run, kolomnya belum dibuat karena langkah sebelumnya tidak
      // benar-benar dijalankan. Itu bukan kegagalan — laporkan sebagai "akan
      // dijalankan", jangan sebagai error yang membingungkan.
      if (!(await columnExists(c, "xp_transactions", "ref_id"))) return false;
      const [rows]: any = await c.execute(
        "SELECT 1 FROM xp_transactions WHERE ref_id IS NULL LIMIT 1",
      );
      return rows.length === 0;
    },
    sql: "UPDATE xp_transactions SET ref_id = CONCAT('legacy:', id) WHERE ref_id IS NULL",
  },
  {
    // Penegak anti-bayar-ganda yang sebenarnya. Guard di sisi klien hilang tiap
    // komponen remount; batasan di sini tidak. Sekaligus menangkap balapan dua
    // permintaan bersamaan dengan ref_id sama.
    desc: "unique key uniq_points_award",
    skipIf: (c) => indexExists(c, "xp_transactions", "uniq_points_award"),
    sql: `ALTER TABLE xp_transactions
            ADD UNIQUE KEY uniq_points_award (user_id, action_type, ref_id, kind)`,
  },
  {
    // Kuota harian dihitung per (user, aksi, hari) — indeks ini menjaga query
    // itu tetap murah saat ledger membesar.
    desc: "index idx_points_quota",
    skipIf: (c) => indexExists(c, "xp_transactions", "idx_points_quota"),
    sql: `ALTER TABLE xp_transactions
            ADD INDEX idx_points_quota (user_id, action_type, created_at)`,
  },
  {
    // Senggol tidak berpoin; tabel ini murni untuk rate limit supaya sapaan
    // ringan tidak jadi jalur spam notifikasi.
    desc: "tabel senggol_log",
    skipIf: (c) => tableExists(c, "senggol_log"),
    sql: `CREATE TABLE IF NOT EXISTS senggol_log (
            id INT PRIMARY KEY AUTO_INCREMENT,
            sender_id VARCHAR(100) NOT NULL,
            receiver_id VARCHAR(100) NOT NULL,
            type VARCHAR(20) DEFAULT 'greet',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_senggol_sender (sender_id, created_at),
            INDEX idx_senggol_pair (sender_id, receiver_id, created_at)
          )`,
  },
];

async function main() {
  const uri = process.env.MYSQL_URI;
  const conn = uri
    ? await mysql.createConnection({ uri, timezone: "Z" })
    : await mysql.createConnection({
        host: process.env.MYSQL_HOST || "localhost",
        user: process.env.MYSQL_USER || "root",
        password: process.env.MYSQL_PASSWORD || "",
        database: process.env.MYSQL_DATABASE || "happily_productive",
        timezone: "Z",
      });

  const [dbRow]: any = await conn.execute("SELECT DATABASE() AS db");
  console.log(`\n  Database: ${dbRow[0].db}${DRY ? "   (DRY RUN — tidak ada yang ditulis)" : ""}\n`);

  let applied = 0;
  let skipped = 0;

  for (const step of STEPS) {
    try {
      if (await step.skipIf(conn)) {
        console.log(`  ⏭  ${step.desc} — sudah ada`);
        skipped++;
        continue;
      }
      if (DRY) {
        console.log(`  ○  ${step.desc} — akan dijalankan`);
        continue;
      }

      // Duplikat harus dibereskan sebelum unique key bisa dipasang. Diperiksa
      // tepat sebelum langkah itu — bukan di awal — karena kolom yang
      // dibutuhkannya baru ada setelah langkah-langkah sebelumnya berjalan.
      if (step.desc.includes("uniq_points_award")) {
        const [dupes]: any = await conn.execute(
          `SELECT user_id, action_type, ref_id, kind, COUNT(*) AS n
             FROM xp_transactions
            WHERE ref_id IS NOT NULL
            GROUP BY user_id, action_type, ref_id, kind
           HAVING n > 1
            LIMIT 5`,
        );
        if (dupes.length > 0) {
          console.log("  ⚠  Ada baris kembar di xp_transactions — unique key dilewati:");
          for (const d of dupes) {
            console.log(`     ${d.user_id} / ${d.action_type} / ${d.ref_id} → ${d.n}×`);
          }
          console.log("     Bereskan dulu, lalu jalankan script ini lagi.");
          continue;
        }
      }

      await conn.execute(step.sql);
      console.log(`  ✅ ${step.desc}`);
      applied++;
    } catch (e: any) {
      console.log(`  ❌ ${step.desc}: ${e.message}`);
    }
  }

  console.log(`\n  ${applied} diterapkan, ${skipped} dilewati.\n`);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
