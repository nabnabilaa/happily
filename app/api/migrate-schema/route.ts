import { NextResponse } from "next/server";
import { db } from "@/lib/turso";
import { seedNotificationTemplates } from "@/lib/notificationService";

export async function POST() {
  const results: string[] = [];

  // ═══════════════════════════════════════════════════════
  // PHASE 1: Create Missing Tables
  // ═══════════════════════════════════════════════════════
  const tables = [
    {
      desc: "Create departments table",
      sql: `CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      desc: "Create logbook_entries table",
      sql: `CREATE TABLE IF NOT EXISTS logbook_entries (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        type VARCHAR(50) DEFAULT 'note',
        title VARCHAR(500),
        description TEXT,
        content TEXT,
        mood VARCHAR(50),
        energy VARCHAR(50),
        points INT DEFAULT 0,
        xp_earned INT DEFAULT 0,
        metadata_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    },
    {
      desc: "Create attendance table",
      sql: `CREATE TABLE IF NOT EXISTS attendance (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(100) NOT NULL,
        check_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        check_out_at DATETIME,
        check_in_type VARCHAR(20) DEFAULT 'WFO',
        office_id VARCHAR(100),
        notes TEXT,
        lat DOUBLE,
        lng DOUBLE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    },
    {
      desc: "Create global_settings table",
      sql: `CREATE TABLE IF NOT EXISTS global_settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT
      )`
    },
    {
      desc: "Create rewards table",
      sql: `CREATE TABLE IF NOT EXISTS rewards (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        points_cost INT NOT NULL,
        category VARCHAR(100),
        tone VARCHAR(50),
        glyph VARCHAR(50),
        description TEXT,
        stock INT DEFAULT 999
      )`
    },
    {
      desc: "Create user_status table (Presence Board)",
      sql: `CREATE TABLE IF NOT EXISTS user_status (
        user_id VARCHAR(100) PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'offline',
        reason TEXT,
        attachment_url TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    },
    {
      desc: "Create personal_kpis table (KPI Mandiri)",
      sql: `CREATE TABLE IF NOT EXISTS personal_kpis (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        target_description TEXT,
        target_value DOUBLE,
        current_value DOUBLE DEFAULT 0,
        metric_unit VARCHAR(50),
        month INT,
        year INT,
        status VARCHAR(50) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    },
    {
      desc: "Create ai_weekly_summaries table",
      sql: `CREATE TABLE IF NOT EXISTS ai_weekly_summaries (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        week_start VARCHAR(20),
        week_end VARCHAR(20),
        summary_text TEXT,
        score INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    },
    {
      desc: "Create manager_weekly_notes table",
      sql: `CREATE TABLE IF NOT EXISTS manager_weekly_notes (
        id VARCHAR(100) PRIMARY KEY,
        manager_id VARCHAR(100) NOT NULL,
        employee_id VARCHAR(100) NOT NULL,
        week_start VARCHAR(20),
        note TEXT,
        rating INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES users(id),
        FOREIGN KEY (employee_id) REFERENCES users(id)
      )`
    },
    {
      desc: "Create message_channels table (Chat)",
      sql: `CREATE TABLE IF NOT EXISTS message_channels (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        type VARCHAR(20) DEFAULT 'dm',
        created_by VARCHAR(100),
        avatar_emoji VARCHAR(10) DEFAULT '💬',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`
    },
    {
      desc: "Create message_channel_members table",
      sql: `CREATE TABLE IF NOT EXISTS message_channel_members (
        id INT PRIMARY KEY AUTO_INCREMENT,
        channel_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_read_at DATETIME,
        FOREIGN KEY (channel_id) REFERENCES message_channels(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(channel_id, user_id)
      )`
    },
    {
      desc: "Create messages table",
      sql: `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(100) PRIMARY KEY,
        channel_id VARCHAR(100) NOT NULL,
        sender_id VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text',
        reply_to VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (channel_id) REFERENCES message_channels(id),
        FOREIGN KEY (sender_id) REFERENCES users(id)
      )`
    },
    {
      desc: "Create office_locations table",
      sql: `CREATE TABLE IF NOT EXISTS office_locations (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        lat DOUBLE NOT NULL,
        lng DOUBLE NOT NULL,
        radius INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      desc: "Create surveys table",
      sql: `CREATE TABLE IF NOT EXISTS surveys (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        deadline DATETIME,
        target_audience VARCHAR(50) DEFAULT 'company',
        target_departments TEXT,
        questions TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_by VARCHAR(100),
        url VARCHAR(255),
        response_count INT DEFAULT 0,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`
    },
    {
      desc: "Create survey_responses table",
      sql: `CREATE TABLE IF NOT EXISTS survey_responses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        survey_id INT NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        answers TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (survey_id) REFERENCES surveys(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(survey_id, user_id)
      )`
    },
    {
      desc: "Create notification_templates table",
      sql: `CREATE TABLE IF NOT EXISTS notification_templates (
        trigger_key VARCHAR(255) PRIMARY KEY,
        title_template VARCHAR(255) NOT NULL,
        message_template TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        category VARCHAR(50) DEFAULT 'general',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    },
    {
      desc: "Create notes table",
      sql: `CREATE TABLE IF NOT EXISTS notes (
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
      )`
    },
    {
      desc: "Create kpi_daily_inputs table",
      sql: `CREATE TABLE IF NOT EXISTS kpi_daily_inputs (
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
      )`
    },
    {
      desc: "Create ext_sync_log table",
      sql: `CREATE TABLE IF NOT EXISTS ext_sync_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100),
        tasks_synced INT,
        direction VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    }
  ];

  for (const t of tables) {
    try {
      await db.execute(t.sql);
      results.push(`✅ ${t.desc}`);
    } catch (e: any) {
      results.push(`❌ ${t.desc}: ${e.message}`);
    }
  }
  // Fix logbook_entries if created with old schema (missing columns)
  const logbookFixCols = [
    { col: 'description', sql: 'ALTER TABLE logbook_entries ADD COLUMN description TEXT' },
    { col: 'points', sql: 'ALTER TABLE logbook_entries ADD COLUMN points INT DEFAULT 0' },
    { col: 'xp_earned', sql: 'ALTER TABLE logbook_entries ADD COLUMN xp_earned INT DEFAULT 0' },
    { col: 'metadata_json', sql: 'ALTER TABLE logbook_entries ADD COLUMN metadata_json TEXT' },
  ];
  for (const fix of logbookFixCols) {
    try { await db.execute(fix.sql); results.push(`✅ logbook_entries.${fix.col}`); }
    catch (e: any) { /* column exists, ignore */ }
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 2: Add Missing Columns (ALTER TABLE)
  // ═══════════════════════════════════════════════════════
  const columns = [
    // ── Users table ──
    { desc: "users.coins", sql: "ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0" },
    { desc: "users.manager_id", sql: "ALTER TABLE users ADD COLUMN manager_id TEXT" },
    { desc: "users.department", sql: "ALTER TABLE users ADD COLUMN department TEXT" },
    { desc: "users.user_role_context", sql: "ALTER TABLE users ADD COLUMN user_role_context TEXT" },
    { desc: "users.last_activity_at", sql: "ALTER TABLE users ADD COLUMN last_activity_at TEXT" },
    { desc: "users.personal_wellbeing_goal", sql: "ALTER TABLE users ADD COLUMN personal_wellbeing_goal TEXT" },
    { desc: "users.wellbeing_routine", sql: "ALTER TABLE users ADD COLUMN wellbeing_routine TEXT" },
    { desc: "users.avatar_image", sql: "ALTER TABLE users ADD COLUMN avatar_image TEXT" },
    { desc: "users.is_onboarded", sql: "ALTER TABLE users ADD COLUMN is_onboarded INTEGER DEFAULT 0" },

    // ── Goals table ──
    { desc: "goals.parent_id", sql: "ALTER TABLE goals ADD COLUMN parent_id TEXT" },
    { desc: "goals.assigned_by_id", sql: "ALTER TABLE goals ADD COLUMN assigned_by_id TEXT" },
    { desc: "goals.status", sql: "ALTER TABLE goals ADD COLUMN status TEXT DEFAULT 'pending'" },
    { desc: "goals.is_kpi", sql: "ALTER TABLE goals ADD COLUMN is_kpi INTEGER DEFAULT 0" },
    { desc: "goals.owner_name", sql: "ALTER TABLE goals ADD COLUMN owner_name TEXT" },

    // ── Daily Priorities table ──
    { desc: "daily_priorities.id_to_varchar", sql: "ALTER TABLE daily_priorities MODIFY COLUMN id VARCHAR(100)" },
    { desc: "daily_priorities.goal_id", sql: "ALTER TABLE daily_priorities ADD COLUMN goal_id TEXT" },
    { desc: "daily_priorities.is_verified", sql: "ALTER TABLE daily_priorities ADD COLUMN is_verified INTEGER DEFAULT 0" },
    { desc: "daily_priorities.target_date", sql: "ALTER TABLE daily_priorities ADD COLUMN target_date TEXT" },
    { desc: "daily_priorities.description", sql: "ALTER TABLE daily_priorities ADD COLUMN description TEXT" },
    { desc: "daily_priorities.time_tracked", sql: "ALTER TABLE daily_priorities ADD COLUMN time_tracked INTEGER DEFAULT 0" },
    { desc: "daily_priorities.timer_started_at", sql: "ALTER TABLE daily_priorities ADD COLUMN timer_started_at TEXT" },
    { desc: "daily_priorities.proof_link", sql: "ALTER TABLE daily_priorities ADD COLUMN proof_link TEXT" },
    { desc: "daily_priorities.proof_notes", sql: "ALTER TABLE daily_priorities ADD COLUMN proof_notes TEXT" },
    { desc: "daily_priorities.metric_value", sql: "ALTER TABLE daily_priorities ADD COLUMN metric_value DECIMAL(15,2)" },
    { desc: "daily_priorities.progress", sql: "ALTER TABLE daily_priorities ADD COLUMN progress INTEGER DEFAULT 0" },
    { desc: "daily_priorities.is_project", sql: "ALTER TABLE daily_priorities ADD COLUMN is_project BOOLEAN DEFAULT 0" },
    { desc: "daily_priorities.project_duration_days", sql: "ALTER TABLE daily_priorities ADD COLUMN project_duration_days INTEGER" },
    { desc: "daily_priorities.project_description", sql: "ALTER TABLE daily_priorities ADD COLUMN project_description TEXT" },
    { desc: "daily_priorities.source", sql: "ALTER TABLE daily_priorities ADD COLUMN source VARCHAR(50) DEFAULT 'website'" },
    { desc: "daily_priorities.kpi_id", sql: "ALTER TABLE daily_priorities ADD COLUMN kpi_id VARCHAR(100)" },
    { desc: "daily_priorities.department", sql: "ALTER TABLE daily_priorities ADD COLUMN department VARCHAR(100)" },
    { desc: "daily_priorities.submitted_at", sql: "ALTER TABLE daily_priorities ADD COLUMN submitted_at DATETIME" },

    // ── Notes table ──
    { desc: "notes.id_to_varchar", sql: "ALTER TABLE notes MODIFY COLUMN id VARCHAR(255)" },
    { desc: "notes.related_event_id", sql: "ALTER TABLE notes ADD COLUMN related_event_id VARCHAR(255)" },
    { desc: "notes.source", sql: "ALTER TABLE notes ADD COLUMN source VARCHAR(50) DEFAULT 'web'" },

    // ── XP Transactions table ──
    { desc: "xp_transactions.id_to_varchar", sql: "ALTER TABLE xp_transactions MODIFY COLUMN id VARCHAR(255)" },
    { desc: "xp_transactions.action_type", sql: "ALTER TABLE xp_transactions ADD COLUMN action_type VARCHAR(100)" },
    { desc: "xp_transactions.description", sql: "ALTER TABLE xp_transactions ADD COLUMN description TEXT" },

    // ── Rewards table ──
    { desc: "rewards.stock", sql: "ALTER TABLE rewards ADD COLUMN stock INTEGER DEFAULT 999" },
  ];

  for (const c of columns) {
    try {
      await db.execute(c.sql);
      results.push(`✅ Added/Modified ${c.desc}`);
    } catch (e: any) {
      if (e.message?.includes("duplicate column") || e.message?.includes("already exists") || e.message?.includes("Duplicate column") || e.message?.includes("Multiple primary key defined")) {
        results.push(`⏭️ ${c.desc} (already exists/applied)`);
      } else {
        results.push(`❌ ${c.desc}: ${e.message}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 3: Seed default departments if empty
  // ═══════════════════════════════════════════════════════
  try {
    const deptCheck = await db.execute("SELECT COUNT(*) as cnt FROM departments");
    const deptCount = Number(deptCheck.rows[0]?.cnt) || 0;
    if (deptCount === 0) {
      const defaultDepts = ["Product", "Engineering", "Marketing", "HR", "Finance", "Operations", "Design"];
      for (const dept of defaultDepts) {
        await db.execute({ sql: "INSERT IGNORE INTO departments (name) VALUES (?)", args: [dept] });
      }
      results.push(`✅ Seeded ${defaultDepts.length} default departments`);
    } else {
      results.push(`⏭️ Departments already populated (${deptCount})`);
    }
  } catch (e: any) {
    results.push(`❌ Seed departments: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 4: Backfill manager_id for existing seed data
  // ═══════════════════════════════════════════════════════
  try {
    // Set employees in "Digital Experience" team to report to manager "user_manager" (Budi Santoso)
    const managerCheck = await db.execute({
      sql: "SELECT id FROM users WHERE id = 'user_manager'",
      args: []
    });
    if (managerCheck.rows.length > 0) {
      // Set all employees to report to Budi Santoso if they don't have a manager yet
      await db.execute({
        sql: "UPDATE users SET manager_id = 'user_manager' WHERE role = 'employee' AND (manager_id IS NULL OR manager_id = '')",
        args: []
      });
      results.push("✅ Backfilled manager_id for existing employees → user_manager");
    } else {
      results.push("⏭️ No user_manager found, skipping backfill");
    }
  } catch (e: any) {
    results.push(`❌ Backfill manager_id: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 5: Backfill department for existing seed data
  // ═══════════════════════════════════════════════════════
  try {
    // Map team_id to department names
    const teamsRes = await db.execute("SELECT id, name FROM teams");
    for (const team of teamsRes.rows) {
      // Find a matching department name
      let deptName = String(team.name);
      // Map team names to department categories
      if (deptName.includes("Digital") || deptName.includes("Product")) deptName = "Product";
      else if (deptName.includes("Engineer")) deptName = "Engineering";
      else if (deptName.includes("Market") || deptName.includes("Growth")) deptName = "Marketing";
      else if (deptName.includes("People") || deptName.includes("Culture") || deptName.includes("HR")) deptName = "HR";

      await db.execute({
        sql: "UPDATE users SET department = ? WHERE team_id = ? AND (department IS NULL OR department = '')",
        args: [deptName, String(team.id)]
      });
    }
    results.push("✅ Backfilled department from teams for existing users");
  } catch (e: any) {
    results.push(`❌ Backfill department: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 6: Cleanup legacy tables
  // ═══════════════════════════════════════════════════════
  try {
    await db.execute("DROP TABLE IF EXISTS director_questions");
    results.push("✅ Cleaned up legacy tables");
  } catch (e: any) {
    results.push(`❌ Cleanup: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 6.5: Seed Notification Templates
  // ═══════════════════════════════════════════════════════
  try {
    const templatesCount = await seedNotificationTemplates();
    results.push(`✅ Seeded ${templatesCount} notification templates`);
  } catch (e: any) {
    results.push(`❌ Seed notification templates: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 7: Verify final state
  // ═══════════════════════════════════════════════════════
  const verification: string[] = [];
  try {
    const usersSchema = await db.execute("SHOW COLUMNS FROM users");
    const userCols = usersSchema.rows.map(r => String(r.Field || r.field));
    const requiredUserCols = ["manager_id", "department", "coins", "user_role_context", "is_onboarded"];
    for (const col of requiredUserCols) {
      verification.push(userCols.includes(col) ? `✅ users.${col}` : `❌ users.${col} MISSING`);
    }

    const goalsSchema = await db.execute("SHOW COLUMNS FROM goals");
    const goalCols = goalsSchema.rows.map(r => String(r.Field || r.field));
    const requiredGoalCols = ["parent_id", "assigned_by_id", "status", "is_kpi"];
    for (const col of requiredGoalCols) {
      verification.push(goalCols.includes(col) ? `✅ goals.${col}` : `❌ goals.${col} MISSING`);
    }

    const dpSchema = await db.execute("SHOW COLUMNS FROM daily_priorities");
    const dpCols = dpSchema.rows.map(r => String(r.Field || r.field));
    const requiredDpCols = ["goal_id", "is_verified"];
    for (const col of requiredDpCols) {
      verification.push(dpCols.includes(col) ? `✅ daily_priorities.${col}` : `❌ daily_priorities.${col} MISSING`);
    }

    // Check departments table
    const deptCount = await db.execute("SELECT COUNT(*) as cnt FROM departments");
    verification.push(`✅ departments table: ${deptCount.rows[0]?.cnt} entries`);

    // Check manager assignments
    const managedUsers = await db.execute("SELECT COUNT(*) as cnt FROM users WHERE manager_id IS NOT NULL AND manager_id != ''");
    verification.push(`✅ Users with manager: ${managedUsers.rows[0]?.cnt}`);

    // Check department assignments
    const deptUsers = await db.execute("SELECT COUNT(*) as cnt FROM users WHERE department IS NOT NULL AND department != ''");
    verification.push(`✅ Users with department: ${deptUsers.rows[0]?.cnt}`);

  } catch (e: any) {
    verification.push(`❌ Verification error: ${e.message}`);
  }

  return NextResponse.json({ 
    results, 
    verification,
    summary: `Migration complete. ${results.filter(r => r.startsWith('✅')).length} successful, ${results.filter(r => r.startsWith('⏭️')).length} skipped, ${results.filter(r => r.startsWith('❌')).length} failed.`
  });
}

// Also allow GET for easy browser access
export async function GET() {
  return POST();
}
