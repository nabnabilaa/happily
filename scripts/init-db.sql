-- Happily Productive 3.0 - Normalized Schema for Turso (LibSQL/SQLite)

-- 1. Organizations & Teams
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Core Entity)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'employee', 'manager', 'hr'
    password_hash TEXT,
    job_title TEXT,
    team_id TEXT,
    manager_id TEXT, -- Added for hierarchy
    department TEXT, -- Added for organizational grouping
    streak INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0, -- Added for rewards
    level INTEGER DEFAULT 1,
    rank TEXT DEFAULT 'E',
    avatar_image TEXT,
    avatar_config_json TEXT,
    user_role_context TEXT,
    is_onboarded INTEGER DEFAULT 0, -- Added for onboarding flow
    last_activity_at DATETIME,
    personal_wellbeing_goal TEXT,
    wellbeing_routine TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- 3. Wellbeing Domain
CREATE TABLE IF NOT EXISTS mood_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    mood_key TEXT NOT NULL, -- 'joy', 'calm', etc.
    energy_key TEXT NOT NULL, -- 'low', 'mid', 'high'
    tag TEXT,
    note TEXT, -- Private journal
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. Performance & OKR Domain
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    parent_id TEXT, -- Added for OKR alignment
    assigned_by_id TEXT, -- Added for manager assignment
    title TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    alignment INTEGER,
    due_date TEXT,
    tone TEXT,
    metric TEXT,
    scope TEXT, -- 'personal', 'team', 'company', 'assigned'
    status TEXT DEFAULT 'pending', -- Added for approval flow
    is_kpi INTEGER DEFAULT 0, -- Added for KPI tracking
    owner_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES goals(id),
    FOREIGN KEY (assigned_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sub_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_done BOOLEAN DEFAULT 0,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- 5. Productivity Domain (Tasks)
CREATE TABLE IF NOT EXISTS daily_priorities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    goal_id TEXT, -- Added for task-goal linkage
    title TEXT NOT NULL,
    goal_title TEXT,
    energy_level TEXT,
    est_time TEXT,
    is_done BOOLEAN DEFAULT 0,
    is_verified INTEGER DEFAULT 0, -- Added for manager verification
    tone TEXT,
    type TEXT,
    points_awarded INTEGER DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (goal_id) REFERENCES goals(id)
);


-- 6. Habit Domain
CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    streak INTEGER DEFAULT 0,
    target_days INTEGER DEFAULT 7,
    is_done_today BOOLEAN DEFAULT 0,
    glyph TEXT,
    history_json TEXT, -- Array of booleans [true, false, ...]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. Social & Recognition Domain
CREATE TABLE IF NOT EXISTS kudos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    value_tag TEXT, -- 'Collaboration', 'Innovation', etc.
    message TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- 8. HR & Feedback Domain
CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'archived'
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Gamification Engine (XP Logs)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    activity_type TEXT NOT NULL, -- 'quest_completion', 'habit_done', 'kudos_received'
    reference_id TEXT, -- ID of the task/habit/kudos
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 10. Rewards Domain
CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    points_cost INTEGER NOT NULL,
    category TEXT,
    tone TEXT,
    glyph TEXT,
    description TEXT,
    stock INTEGER DEFAULT 999
);

-- 11. Learning & Growth Domain
CREATE TABLE IF NOT EXISTS learning_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    meta_info TEXT, -- '8 menit · Microlearning'
    tag TEXT,
    tone TEXT,
    status TEXT DEFAULT 'new', -- 'new', 'started', 'completed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    current_level INTEGER DEFAULT 0,
    target_level INTEGER DEFAULT 100,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
