import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'happily_productive',
    waitForConnections: true,
  });

  try {
    const connection = await pool.getConnection();
    console.log("🐝 Menjalankan migrasi MySQL (Phase 1)...\n");

    const migrations = [
      // ===== EXISTING TABLE ALTERS =====
      "ALTER TABLE goals ADD COLUMN assigned_by_id VARCHAR(255)",
      "ALTER TABLE goals ADD COLUMN parent_id VARCHAR(255)",
      "ALTER TABLE goals ADD COLUMN status VARCHAR(50) DEFAULT 'pending'",
      "ALTER TABLE goals ADD COLUMN is_kpi BOOLEAN DEFAULT 0",
      "ALTER TABLE users ADD COLUMN manager_id VARCHAR(255)",
      "ALTER TABLE users ADD COLUMN personal_wellbeing_goal TEXT",
      "ALTER TABLE users ADD COLUMN wellbeing_routine TEXT",
      "ALTER TABLE users ADD COLUMN is_onboarded BOOLEAN DEFAULT 0",
      "ALTER TABLE daily_priorities ADD COLUMN is_verified BOOLEAN DEFAULT 0",
      "ALTER TABLE daily_priorities ADD COLUMN goal_id VARCHAR(255)",

      // NEW: KPI & Extension columns for daily_priorities
      "ALTER TABLE daily_priorities ADD COLUMN kpi_id VARCHAR(255)",
      "ALTER TABLE daily_priorities ADD COLUMN source VARCHAR(20) DEFAULT 'website'",

      // NEW: Attendance columns (fix incomplete table)
      "ALTER TABLE attendance ADD COLUMN check_out_at DATETIME",
      "ALTER TABLE attendance ADD COLUMN location_lat DECIMAL(10,8)",
      "ALTER TABLE attendance ADD COLUMN location_lng DECIMAL(11,8)",
      "ALTER TABLE attendance ADD COLUMN check_in_type VARCHAR(20) DEFAULT 'WFO'",
      "ALTER TABLE attendance ADD COLUMN office_id VARCHAR(255)",
      "ALTER TABLE attendance ADD COLUMN notes TEXT",
      "ALTER TABLE attendance ADD COLUMN mood VARCHAR(50)",

      // NEW: Logbook missing columns
      "ALTER TABLE logbook_entries ADD COLUMN title TEXT",
      "ALTER TABLE logbook_entries ADD COLUMN content TEXT",
      "ALTER TABLE logbook_entries ADD COLUMN points INT DEFAULT 0",
      "ALTER TABLE logbook_entries ADD COLUMN metadata_json TEXT",

      // NEW: Proof of Work & Metrics
      "ALTER TABLE daily_priorities ADD COLUMN proof_link TEXT",
      "ALTER TABLE daily_priorities ADD COLUMN proof_notes TEXT",
      "ALTER TABLE daily_priorities ADD COLUMN metric_value DECIMAL(15,2)",
      "ALTER TABLE monthly_kpis ADD COLUMN metric_target DECIMAL(15,2)",
      "ALTER TABLE monthly_kpis ADD COLUMN metric_current DECIMAL(15,2)",

      // ===== EXISTING TABLE CREATES =====
      `CREATE TABLE IF NOT EXISTS global_settings (
          \`key\` VARCHAR(100) PRIMARY KEY,
          value TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS attendance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          check_in_at DATETIME,
          check_out_at DATETIME,
          location_lat DECIMAL(10,8),
          location_lng DECIMAL(11,8),
          check_in_type VARCHAR(20) DEFAULT 'WFO',
          office_id VARCHAR(255),
          notes TEXT,
          mood VARCHAR(50)
      )`,
      `CREATE TABLE IF NOT EXISTS logbook_entries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          type VARCHAR(100),
          title TEXT,
          content TEXT,
          points INT DEFAULT 0,
          metadata_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS rewards (
         id VARCHAR(255) PRIMARY KEY,
         title TEXT NOT NULL,
         points_cost INTEGER NOT NULL,
         category TEXT,
         tone TEXT,
         glyph TEXT,
         description TEXT,
         stock INTEGER DEFAULT 999
      )`,
      `CREATE TABLE IF NOT EXISTS user_rewards (
         id VARCHAR(255) PRIMARY KEY,
         user_id VARCHAR(255) NOT NULL,
         title TEXT NOT NULL,
         points INTEGER NOT NULL,
         date TEXT NOT NULL,
         glyph TEXT
      )`,

      // ===== NEW TABLES (Phase 1) =====

      // XP Transaction Log
      `CREATE TABLE IF NOT EXISTS xp_transactions (
         id VARCHAR(255) PRIMARY KEY,
         user_id VARCHAR(255) NOT NULL,
         amount INT NOT NULL,
         action_type VARCHAR(100) NOT NULL,
         description TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_xp_user (user_id),
         INDEX idx_xp_type (action_type)
      )`,

      // Mood Check-ins (time-series)
      `CREATE TABLE IF NOT EXISTS mood_checkins (
         id INT AUTO_INCREMENT PRIMARY KEY,
         user_id VARCHAR(255) NOT NULL,
         mood_key VARCHAR(50) NOT NULL,
         energy_key VARCHAR(50),
         tag VARCHAR(100),
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_mood_user (user_id),
         INDEX idx_mood_date (created_at)
      )`,

      // Kudos / Apresiasi
      `CREATE TABLE IF NOT EXISTS kudos (
         id VARCHAR(255) PRIMARY KEY,
         sender_id VARCHAR(255) NOT NULL,
         receiver_id VARCHAR(255) NOT NULL,
         value_tag VARCHAR(100),
         message TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_kudos_sender (sender_id),
         INDEX idx_kudos_receiver (receiver_id)
      )`,

      // Notifications
      `CREATE TABLE IF NOT EXISTS notifications (
         id VARCHAR(255) PRIMARY KEY,
         user_id VARCHAR(255) NOT NULL,
         title VARCHAR(255) NOT NULL,
         message TEXT,
         type VARCHAR(20) DEFAULT 'info',
         is_read BOOLEAN DEFAULT FALSE,
         action_url TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_notif_user (user_id),
         INDEX idx_notif_unread (user_id, is_read)
      )`,

      // Office Locations (for geofencing)
      `CREATE TABLE IF NOT EXISTS office_locations (
         id VARCHAR(255) PRIMARY KEY,
         name TEXT NOT NULL,
         lat DECIMAL(10,8) NOT NULL,
         lng DECIMAL(11,8) NOT NULL,
         radius INT DEFAULT 200
      )`,

      // ===== NEW TABLES (Phase 2 — KPI) =====

      // Monthly KPIs
      `CREATE TABLE IF NOT EXISTS monthly_kpis (
         id VARCHAR(255) PRIMARY KEY,
         title TEXT NOT NULL,
         target_description TEXT,
         weight INT DEFAULT 0,
         month INT NOT NULL,
         year INT NOT NULL,
         assigned_to VARCHAR(255),
         assigned_by VARCHAR(255),
         status VARCHAR(20) DEFAULT 'active',
         final_score INT,
         manager_notes TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_kpi_assignee (assigned_to),
         INDEX idx_kpi_period (month, year)
      )`,

      // Task ↔ KPI Links
      `CREATE TABLE IF NOT EXISTS task_kpi_links (
         id INT AUTO_INCREMENT PRIMARY KEY,
         task_id VARCHAR(255) NOT NULL,
         kpi_id VARCHAR(255) NOT NULL,
         linked_by VARCHAR(20) DEFAULT 'employee',
         status VARCHAR(20) DEFAULT 'pending',
         reviewed_by VARCHAR(255),
         reviewed_at DATETIME,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_tkl_task (task_id),
         INDEX idx_tkl_kpi (kpi_id)
      )`,

      // Monthly Reports
      `CREATE TABLE IF NOT EXISTS monthly_reports (
         id VARCHAR(255) PRIMARY KEY,
         user_id VARCHAR(255) NOT NULL,
         month INT NOT NULL,
         year INT NOT NULL,
         total_tasks INT DEFAULT 0,
         tasks_completed INT DEFAULT 0,
         active_days INT DEFAULT 0,
         total_working_days INT DEFAULT 22,
         kpi_score DECIMAL(5,2),
         manager_summary TEXT,
         status VARCHAR(20) DEFAULT 'draft',
         reviewed_by VARCHAR(255),
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_report_user (user_id),
         INDEX idx_report_period (month, year)
      )`,

      // Push Notification Subscriptions
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
         id INT AUTO_INCREMENT PRIMARY KEY,
         user_id VARCHAR(255) NOT NULL,
         endpoint TEXT NOT NULL,
         p256dh TEXT NOT NULL,
         auth TEXT NOT NULL,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_push_user (user_id)
      )`,

      // Extension Sync Log
      `CREATE TABLE IF NOT EXISTS ext_sync_log (
         id INT AUTO_INCREMENT PRIMARY KEY,
         user_id VARCHAR(255) NOT NULL,
         tasks_synced INT DEFAULT 0,
         direction VARCHAR(20) NOT NULL,
         synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // AI Weekly Summaries
      `CREATE TABLE IF NOT EXISTS ai_weekly_summaries (
         id VARCHAR(255) PRIMARY KEY,
         user_id VARCHAR(255) NOT NULL,
         week_start DATE NOT NULL,
         week_end DATE NOT NULL,
         summary_text TEXT,
         score INT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_ws_user (user_id)
      )`,

      // AI Monthly Analyses
      `CREATE TABLE IF NOT EXISTS ai_monthly_analyses (
         id VARCHAR(255) PRIMARY KEY,
         user_id VARCHAR(255) NOT NULL,
         month INT NOT NULL,
         year INT NOT NULL,
         analysis_text TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_ma_user (user_id)
      )`,

      // Calendar Events
      `CREATE TABLE IF NOT EXISTS calendar_events (
         id VARCHAR(255) PRIMARY KEY,
         creator_id VARCHAR(255) NOT NULL,
         title VARCHAR(255) NOT NULL,
         description TEXT,
         start_time DATETIME NOT NULL,
         end_time DATETIME NOT NULL,
         notification_offset_minutes INT DEFAULT 15,
         event_type VARCHAR(50) DEFAULT 'meeting',
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_cal_creator (creator_id)
      )`,

      // Calendar Attendees
      `CREATE TABLE IF NOT EXISTS calendar_attendees (
         event_id VARCHAR(255) NOT NULL,
         user_id VARCHAR(255) NOT NULL,
         status VARCHAR(20) DEFAULT 'pending',
         PRIMARY KEY (event_id, user_id),
         INDEX idx_cal_att_user (user_id)
      )`
    ];

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const sql of migrations) {
      try {
        await connection.query(sql);
        const label = sql.trim().substring(0, 60).replace(/\s+/g, ' ');
        console.log(`  ✅ ${label}...`);
        success++;
      } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR') {
          skipped++;
        } else {
          const label = sql.trim().substring(0, 60).replace(/\s+/g, ' ');
          console.error(`  ❌ ${label}...`, e.message);
          failed++;
        }
      }
    }

    console.log(`\n🐝 Migrasi selesai! ✅ ${success} berhasil, ⏭️ ${skipped} sudah ada, ❌ ${failed} gagal`);
    connection.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Gagal terkoneksi:", error);
    process.exit(1);
  }
}

migrate();
