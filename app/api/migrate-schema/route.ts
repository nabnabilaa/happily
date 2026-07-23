import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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
      desc: "Create monthly_kpis table",
      sql: `CREATE TABLE IF NOT EXISTS monthly_kpis (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        target_description TEXT,
        weight DOUBLE,
        month INT,
        year INT,
        assigned_to VARCHAR(100),
        assigned_by VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        metric_target DOUBLE,
        metric_current DOUBLE DEFAULT 0,
        final_score DOUBLE,
        manager_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      desc: "Create goals table",
      sql: `CREATE TABLE IF NOT EXISTS goals (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        owner_id VARCHAR(100) NOT NULL,
        owner_name VARCHAR(255),
        assigned_by_id VARCHAR(100),
        progress INT DEFAULT 0,
        alignment INT DEFAULT 100,
        due_date VARCHAR(100),
        tone VARCHAR(50) DEFAULT 'blue',
        metric VARCHAR(255),
        scope VARCHAR(50) DEFAULT 'personal',
        status VARCHAR(50) DEFAULT 'pending',
        is_kpi INT DEFAULT 0,
        parent_id VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    },
    {
      desc: "Create sub_goals table",
      sql: `CREATE TABLE IF NOT EXISTS sub_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        goal_id VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        is_done INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
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
    },
    {
      desc: "Create mood_wall_posts table",
      sql: `CREATE TABLE IF NOT EXISTS mood_wall_posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        mood VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        department VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      desc: "Create push_subscriptions table",
      sql: `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(100) NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, endpoint(255))
      )`
    },
    {
      desc: "Create active_challenges table",
      sql: `CREATE TABLE IF NOT EXISTS active_challenges (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        points INT DEFAULT 50,
        progress INT DEFAULT 0,
        target INT DEFAULT 1,
        status VARCHAR(50) DEFAULT 'active',
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_challenges_user (user_id),
        INDEX idx_challenges_status (status)
      )`
    },
    {
      desc: "Create calendar_events table",
      sql: `CREATE TABLE IF NOT EXISTS calendar_events (
        id VARCHAR(100) PRIMARY KEY,
        creator_id VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        notification_offset_minutes INT DEFAULT 15,
        recurrence VARCHAR(50),
        recurrence_end DATETIME,
        location VARCHAR(500),
        event_type VARCHAR(50) DEFAULT 'event',
        color VARCHAR(50) DEFAULT '#3B6FA0',
        is_all_day BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id)
      )`
    },
    {
      desc: "Create calendar_attendees table",
      sql: `CREATE TABLE IF NOT EXISTS calendar_attendees (
        event_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (event_id, user_id),
        FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    },
    {
      desc: "Create focus_rooms table",
      sql: `CREATE TABLE IF NOT EXISTS focus_rooms (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mode VARCHAR(50) DEFAULT 'hardcore',
        duration_mins INT DEFAULT 25,
        status VARCHAR(50) DEFAULT 'waiting',
        host_id VARCHAR(100) NOT NULL,
        started_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (host_id) REFERENCES users(id)
      )`
    },
    {
      desc: "Create focus_room_participants table",
      sql: `CREATE TABLE IF NOT EXISTS focus_room_participants (
        room_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'joined',
        is_host BOOLEAN DEFAULT FALSE,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES focus_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    },
    {
      desc: "Create weekly_targets table",
      sql: `CREATE TABLE IF NOT EXISTS weekly_targets (
        id VARCHAR(100) PRIMARY KEY,
        kpi_id VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        week_number INT NOT NULL,
        target_value DOUBLE DEFAULT 100,
        current_value DOUBLE DEFAULT 0,
        metric_unit VARCHAR(50) DEFAULT '%',
        status VARCHAR(50) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kpi_id) REFERENCES monthly_kpis(id) ON DELETE CASCADE
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
    { desc: "users.focus_task_id", sql: "ALTER TABLE users ADD COLUMN focus_task_id VARCHAR(255) DEFAULT NULL" },
    { desc: "users.focus_progress", sql: "ALTER TABLE users ADD COLUMN focus_progress INTEGER DEFAULT 0" },
    { desc: "users.focus_intention", sql: "ALTER TABLE users ADD COLUMN focus_intention TEXT DEFAULT NULL" },
    { desc: "users.mood_key", sql: "ALTER TABLE users ADD COLUMN mood_key VARCHAR(50) DEFAULT NULL" },
    { desc: "users.division_id", sql: "ALTER TABLE users ADD COLUMN division_id INT DEFAULT NULL" },
    { desc: "users.department_status", sql: "ALTER TABLE users ADD COLUMN department_status VARCHAR(20) DEFAULT NULL" },
    { desc: "users.hr_access", sql: "ALTER TABLE users ADD COLUMN hr_access INTEGER DEFAULT 0" },
    { desc: "users.onboarding_answers", sql: "ALTER TABLE users ADD COLUMN onboarding_answers TEXT DEFAULT NULL" },

    // ── Divisions table ──
    { desc: "divisions.manager_id", sql: "ALTER TABLE divisions ADD COLUMN manager_id VARCHAR(100) DEFAULT NULL" },

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
    { desc: "daily_priorities.status", sql: "ALTER TABLE daily_priorities ADD COLUMN status VARCHAR(50) DEFAULT NULL" },
    { desc: "daily_priorities.weekly_target_id", sql: "ALTER TABLE daily_priorities ADD COLUMN weekly_target_id VARCHAR(100) DEFAULT NULL" },
    { desc: "daily_priorities.weekly_target_title", sql: "ALTER TABLE daily_priorities ADD COLUMN weekly_target_title VARCHAR(500) DEFAULT NULL" },

    // ── Notes table ──
    { desc: "notes.id_to_varchar", sql: "ALTER TABLE notes MODIFY COLUMN id VARCHAR(255)" },
    { desc: "notes.related_event_id", sql: "ALTER TABLE notes ADD COLUMN related_event_id VARCHAR(255)" },
    { desc: "notes.source", sql: "ALTER TABLE notes ADD COLUMN source VARCHAR(50) DEFAULT 'web'" },
    { desc: "notes.color", sql: "ALTER TABLE notes ADD COLUMN color VARCHAR(50)" },

    // ── XP Transactions table ──
    { desc: "xp_transactions.id_to_varchar", sql: "ALTER TABLE xp_transactions MODIFY COLUMN id VARCHAR(255)" },
    { desc: "xp_transactions.action_type", sql: "ALTER TABLE xp_transactions ADD COLUMN action_type VARCHAR(100)" },
    { desc: "xp_transactions.description", sql: "ALTER TABLE xp_transactions ADD COLUMN description TEXT" },

    // ── Rewards table ──
    { desc: "rewards.stock", sql: "ALTER TABLE rewards ADD COLUMN stock INTEGER DEFAULT 999" },
    {
      desc: "Add description to focus_rooms",
      sql: `ALTER TABLE focus_rooms ADD COLUMN description TEXT`
    },
    {
      desc: "monthly_kpis.scope",
      sql: `ALTER TABLE monthly_kpis ADD COLUMN scope VARCHAR(50) DEFAULT 'assigned'`
    },
    {
      desc: "task_kpi_links.weekly_target_id",
      sql: `ALTER TABLE task_kpi_links ADD COLUMN weekly_target_id VARCHAR(100) DEFAULT NULL`
    },
    // ── KPI Review columns ──
    {
      desc: "monthly_kpis.review_status",
      sql: `ALTER TABLE monthly_kpis ADD COLUMN review_status VARCHAR(20) DEFAULT NULL`
    },
    {
      desc: "monthly_kpis.review_note",
      sql: `ALTER TABLE monthly_kpis ADD COLUMN review_note TEXT DEFAULT NULL`
    },
    {
      desc: "monthly_kpis.penalty_pct",
      sql: `ALTER TABLE monthly_kpis ADD COLUMN penalty_pct INT DEFAULT 0`
    },
    {
      desc: "monthly_kpis.original_metric_current",
      sql: `ALTER TABLE monthly_kpis ADD COLUMN original_metric_current DOUBLE DEFAULT NULL`
    },
    {
      desc: "monthly_kpis.reviewed_by",
      sql: `ALTER TABLE monthly_kpis ADD COLUMN reviewed_by VARCHAR(100) DEFAULT NULL`
    },
    {
      desc: "monthly_kpis.reviewed_at",
      sql: `ALTER TABLE monthly_kpis ADD COLUMN reviewed_at DATETIME DEFAULT NULL`
    },
    // ── Partial task progress ──
    {
      desc: "daily_priorities.partial_progress",
      sql: `ALTER TABLE daily_priorities ADD COLUMN partial_progress INT DEFAULT 0`
    },
    // ── Task completion tracking ──
    {
      desc: "daily_priorities.completed_at",
      sql: `ALTER TABLE daily_priorities ADD COLUMN completed_at DATETIME DEFAULT NULL`
    },
    {
      desc: "daily_priorities.due_date",
      sql: `ALTER TABLE daily_priorities ADD COLUMN due_date DATE DEFAULT NULL`
    },
    // ── KPI metric tracking ──
    {
      desc: "monthly_kpis.kpi_type",
      sql: `ALTER TABLE monthly_kpis ADD COLUMN kpi_type VARCHAR(20) DEFAULT 'completion'`
    },
    {
      desc: "monthly_kpis.metric_period",
      sql: `ALTER TABLE monthly_kpis ADD COLUMN metric_period VARCHAR(10) DEFAULT NULL`
    },
    {
      // Free-form durasi target (mis. "Minggu 1–2", "3 minggu pertama", "Sepanjang bulan").
      // Model target: 1 KPI diselesaikan beberapa target dgn durasi bebas — bukan wajib mingguan.
      desc: "weekly_targets.timeframe",
      sql: `ALTER TABLE weekly_targets ADD COLUMN timeframe VARCHAR(120) DEFAULT NULL`
    }
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
  // PHASE 7: Seed KPIs and Daily Priorities
  // ═══════════════════════════════════════════════════════
  try {
    const kpiCheck = await db.execute("SELECT COUNT(*) as cnt FROM monthly_kpis");
    if (Number(kpiCheck.rows[0]?.cnt) === 0) {
      const kpis = [
        {
          id: "kpi_team_1", title: "Meningkatkan User Engagement Aplikasi sebesar 25%", target_description: "DAU naik dari 10k ke 12.5k",
          weight: 40, month: 6, year: 2026, assigned_to: "user_manager", assigned_by: "user_director", status: "active", metric_target: 12500, metric_current: 11000, scope: "team"
        },
        {
          id: "kpi_emp_1", title: "Merancang UI/UX untuk Fitur Gamifikasi", target_description: "Menyelesaikan 3 flow utama gamifikasi dengan rating kepuasan user > 4.0",
          weight: 60, month: 6, year: 2026, assigned_to: "user_employee", assigned_by: "user_manager", status: "active", metric_target: 3, metric_current: 1, scope: "assigned"
        }
      ];
      for (const kpi of kpis) {
        await db.execute({
          sql: `INSERT INTO monthly_kpis (id, title, target_description, weight, month, year, assigned_to, assigned_by, status, metric_target, metric_current, scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [kpi.id, kpi.title, kpi.target_description, kpi.weight, kpi.month, kpi.year, kpi.assigned_to, kpi.assigned_by, kpi.status, kpi.metric_target, kpi.metric_current, kpi.scope]
        });
      }
      
      // Seed Daily Priorities for Sari Wijaya linked to kpi_emp_1
      const dps = [
        { id: "dp_emp_1", user_id: "user_employee", title: "Riset Kompetitor Gamifikasi", desc: "Menganalisis 3 aplikasi kompetitor", target_date: "2026-06-19", kpi_id: "kpi_emp_1", status: "done", is_done: 1, is_verified: 0, tone: "blue", proof_link: "https://figma.com/riset-kompetitor" },
        { id: "dp_emp_2", user_id: "user_employee", title: "Wireframing Sistem Point & Reward", desc: "Buat wireframe lo-fi", target_date: "2026-06-19", kpi_id: "kpi_emp_1", status: "revision", is_done: 1, is_verified: 0, tone: "amber", proof_notes: "Coba tambahkan animasi di bagian point pop up ya." },
        { id: "dp_emp_3", user_id: "user_employee", title: "Desain High-Fidelity Leaderboard", desc: "Buat screen leaderboard", target_date: "2026-06-20", kpi_id: "kpi_emp_1", status: "todo", is_done: 0, is_verified: 0, tone: "rose", proof_link: "" },
      ];
      for (const dp of dps) {
        await db.execute({
          sql: `INSERT INTO daily_priorities (id, user_id, title, description, target_date, kpi_id, goal_title, status, is_done, is_verified, tone, proof_link, proof_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [dp.id, dp.user_id, dp.title, dp.desc, dp.target_date, dp.kpi_id, "Merancang UI/UX untuk Fitur Gamifikasi", dp.status, dp.is_done, dp.is_verified, dp.tone, dp.proof_link, dp.proof_notes || null]
        });
      }
      results.push("✅ Seeded KPIs and Daily Priorities for Sari Wijaya");
    } else {
      results.push("⏭️ KPIs already populated");
    }
  } catch(e: any) {
    results.push(`❌ KPI Seeding: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // PHASE 9: Verify final state
  // ═══════════════════════════════════════════════════════
  const verification: string[] = [];
  try {
    const usersSchema = await db.execute("SHOW COLUMNS FROM users");
    const userCols = usersSchema.rows.map(r => String(r.Field || r.field));
    const requiredUserCols = ["manager_id", "department", "coins", "user_role_context", "is_onboarded", "division_id", "onboarding_answers"];
    for (const col of requiredUserCols) {
      verification.push(userCols.includes(col) ? `✅ users.${col}` : `❌ users.${col} MISSING`);
    }

    const dpSchema = await db.execute("SHOW COLUMNS FROM daily_priorities");
    const dpCols = dpSchema.rows.map(r => String(r.Field || r.field));
    const requiredDpCols = ["kpi_id", "is_verified"];
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

    const kpiCount = await db.execute("SELECT COUNT(*) as cnt FROM monthly_kpis");
    verification.push(`✅ monthly_kpis table: ${kpiCount.rows[0]?.cnt} entries`);

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

