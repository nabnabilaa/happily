import { db } from '../lib/turso';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * HR Module Overhaul — Phase 1 Migration
 * 
 * Changes:
 * 1. Upgrade surveys table: add description, deadline, target_audience, target_departments, questions, created_by
 * 2. Create survey_responses table for internal survey answers
 * 3. Add duration_minutes + status to attendance
 * 4. Add reference_id + reference_type to notifications  
 * 5. Create attendance yearly retention index
 */
async function migrate() {
  try {
    console.log("🐝 HR Overhaul Migration — Phase 1\n");

    const migrations: { desc: string; sql: string }[] = [
      // ═══════════════════════════════════════════════════════
      // SURVEYS TABLE UPGRADES (internal-only survey builder)
      // ═══════════════════════════════════════════════════════
      {
        desc: "surveys.description",
        sql: "ALTER TABLE surveys ADD COLUMN description TEXT"
      },
      {
        desc: "surveys.deadline",
        sql: "ALTER TABLE surveys ADD COLUMN deadline DATETIME"
      },
      {
        desc: "surveys.target_audience",
        sql: "ALTER TABLE surveys ADD COLUMN target_audience VARCHAR(20) DEFAULT 'company'"
      },
      {
        desc: "surveys.target_departments",
        sql: "ALTER TABLE surveys ADD COLUMN target_departments TEXT"
      },
      {
        desc: "surveys.questions",
        sql: "ALTER TABLE surveys ADD COLUMN questions TEXT"
      },
      {
        desc: "surveys.created_by",
        sql: "ALTER TABLE surveys ADD COLUMN created_by VARCHAR(255)"
      },
      {
        desc: "surveys.response_count",
        sql: "ALTER TABLE surveys ADD COLUMN response_count INT DEFAULT 0"
      },

      // ═══════════════════════════════════════════════════════
      // SURVEY RESPONSES TABLE (new)
      // ═══════════════════════════════════════════════════════
      {
        desc: "Create survey_responses table",
        sql: `CREATE TABLE IF NOT EXISTS survey_responses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          survey_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          answers TEXT NOT NULL,
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_sr_survey (survey_id),
          INDEX idx_sr_user (user_id),
          UNIQUE KEY unique_response (survey_id, user_id)
        )`
      },

      // ═══════════════════════════════════════════════════════
      // ATTENDANCE TABLE UPGRADES (clock-out + duration + status)
      // ═══════════════════════════════════════════════════════
      {
        desc: "attendance.duration_minutes",
        sql: "ALTER TABLE attendance ADD COLUMN duration_minutes INT"
      },
      {
        desc: "attendance.status",
        sql: "ALTER TABLE attendance ADD COLUMN status VARCHAR(20) DEFAULT 'present'"
      },

      // ═══════════════════════════════════════════════════════
      // NOTIFICATIONS TABLE UPGRADES (reference linking)
      // ═══════════════════════════════════════════════════════
      {
        desc: "notifications.reference_id",
        sql: "ALTER TABLE notifications ADD COLUMN reference_id VARCHAR(255)"
      },
      {
        desc: "notifications.reference_type",
        sql: "ALTER TABLE notifications ADD COLUMN reference_type VARCHAR(50)"
      },

      // ═══════════════════════════════════════════════════════
      // ATTENDANCE INDEX for yearly retention query
      // ═══════════════════════════════════════════════════════
      {
        desc: "Index attendance by check_in_at",
        sql: "CREATE INDEX IF NOT EXISTS idx_att_checkin_date ON attendance (check_in_at)"
      },
    ];

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const m of migrations) {
      try {
        await db.execute(m.sql);
        console.log(`  ✅ ${m.desc}`);
        success++;
      } catch (e: any) {
        if (e.message?.includes('duplicate column') || e.message?.includes('already exists') || e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_KEYNAME') {
          console.log(`  ⏭️ ${m.desc} (already exists)`);
          skipped++;
        } else {
          console.error(`  ❌ ${m.desc}: ${e.message}`);
          failed++;
        }
      }
    }

    console.log(`\n🐝 Phase 1 complete! ✅ ${success} new, ⏭️ ${skipped} existed, ❌ ${failed} failed`);
    process.exit(0);
  } catch (error) {
    console.error("Connection failed:", error);
    process.exit(1);
  }
}

migrate();
