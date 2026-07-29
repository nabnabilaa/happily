/**
 * Adds the manager-review columns to `daily_priorities`.
 *
 * Deliberately narrow: /api/migrate-schema also backfills manager_id, drops
 * legacy tables and seeds demo rows, none of which you want anywhere near a
 * live database. This only adds columns — no UPDATE, no INSERT, no DROP.
 *
 * Safe to run more than once: existing columns are skipped.
 *
 *   npx tsx scripts/add-review-columns.ts
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const COLUMNS: { name: string; ddl: string }[] = [
  { name: 'review_note', ddl: 'ADD COLUMN review_note TEXT DEFAULT NULL' },
  { name: 'reviewed_by', ddl: 'ADD COLUMN reviewed_by VARCHAR(100) DEFAULT NULL' },
  { name: 'reviewed_at', ddl: 'ADD COLUMN reviewed_at DATETIME DEFAULT NULL' },
];

async function run() {
  const uri = process.env.MYSQL_URI;
  const pool = uri
    ? mysql.createPool(uri)
    : mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      });

  const conn = await pool.getConnection();
  try {
    const [dbRows]: any = await conn.query('SELECT DATABASE() as db');
    const dbName = dbRows[0]?.db;
    console.log(`Target database: ${dbName}`);

    const [existing]: any = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'daily_priorities'`,
      [dbName]
    );
    const present = new Set(existing.map((r: any) => r.COLUMN_NAME));

    const missing = COLUMNS.filter(c => !present.has(c.name));
    if (missing.length === 0) {
      console.log('All review columns already present — nothing to do.');
      return;
    }

    // One ALTER for all missing columns: MySQL rewrites the table per
    // statement, so batching keeps the lock window short.
    const sql = `ALTER TABLE daily_priorities ${missing.map(c => c.ddl).join(', ')}`;
    console.log(`Running: ${sql}`);
    await conn.query(sql);
    console.log(`Added: ${missing.map(c => c.name).join(', ')}`);
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
