import { db } from '../lib/turso';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrateV2() {
  try {
    console.log("🐝 Flowbee v2.0 Migration — Phase ALL...\n");

    const migrations = [
      // ── NOTES TABLE ──
      `CREATE TABLE IF NOT EXISTS notes (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          title VARCHAR(500),
          content TEXT NOT NULL,
          visibility VARCHAR(20) DEFAULT 'private',
          shared_with_divisions TEXT,
          shared_with_users TEXT,
          source VARCHAR(20) DEFAULT 'web',
          related_event_id VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_notes_user (user_id),
          INDEX idx_notes_vis (visibility)
      )`,

      // ── CALENDAR ENHANCEMENTS ──
      "ALTER TABLE calendar_events ADD COLUMN recurrence VARCHAR(50) DEFAULT NULL",
      "ALTER TABLE calendar_events ADD COLUMN recurrence_end DATE DEFAULT NULL",
      "ALTER TABLE calendar_events ADD COLUMN location TEXT DEFAULT NULL",
      "ALTER TABLE calendar_events ADD COLUMN color VARCHAR(7) DEFAULT '#3B6FA0'",
      "ALTER TABLE calendar_events ADD COLUMN is_all_day BOOLEAN DEFAULT 0",

      // ── DAILY_PRIORITIES ENHANCEMENTS ──
      "ALTER TABLE daily_priorities ADD COLUMN department VARCHAR(100)",
      "ALTER TABLE daily_priorities ADD COLUMN progress INT DEFAULT 0",
      "ALTER TABLE daily_priorities ADD COLUMN is_project BOOLEAN DEFAULT 0",
      "ALTER TABLE daily_priorities ADD COLUMN project_duration_days INT DEFAULT NULL",
      "ALTER TABLE daily_priorities ADD COLUMN project_description TEXT",
      "ALTER TABLE daily_priorities ADD COLUMN submitted_at DATETIME DEFAULT NULL",

      // ── MONTHLY_KPIS ENHANCEMENTS ──
      "ALTER TABLE monthly_kpis ADD COLUMN kpi_type VARCHAR(20) DEFAULT 'completion'",
      "ALTER TABLE monthly_kpis ADD COLUMN metric_unit VARCHAR(50)",
      "ALTER TABLE monthly_kpis ADD COLUMN daily_input_required BOOLEAN DEFAULT 0",

      // ── KPI DAILY INPUTS ──
      `CREATE TABLE IF NOT EXISTS kpi_daily_inputs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          kpi_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          date DATE NOT NULL,
          value DECIMAL(15,2) NOT NULL,
          notes TEXT,
          proof_link TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_kdi_kpi (kpi_id),
          INDEX idx_kdi_user (user_id),
          UNIQUE KEY uk_kpi_user_date (kpi_id, user_id, date)
      )`,

      // ── MOOD SCHEDULING ──
      "ALTER TABLE mood_checkins ADD COLUMN scheduled_time VARCHAR(5)",

      // ── MOOD SCHEDULE CONFIG (global) ──
      `INSERT IGNORE INTO global_settings (\`key\`, value) VALUES ('mood_checkin_times', '["09:00","14:00"]')`,
    ];

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const sql of migrations) {
      try {
        await db.execute(sql);
        const label = sql.trim().substring(0, 70).replace(/\s+/g, ' ');
        console.log(`  ✅ ${label}...`);
        success++;
      } catch (e: any) {
        if (e.message?.includes('duplicate column') || e.message?.includes('already exists') || e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_ENTRY') {
          skipped++;
        } else {
          const label = sql.trim().substring(0, 70).replace(/\s+/g, ' ');
          console.error(`  ❌ ${label}...`, e.message);
          failed++;
        }
      }
    }

    console.log(`\n🐝 V2 Migration selesai! ✅ ${success} berhasil, ⏭️ ${skipped} sudah ada, ❌ ${failed} gagal`);
    process.exit(0);
  } catch (error) {
    console.error("Gagal terkoneksi:", error);
    process.exit(1);
  }
}

migrateV2();
