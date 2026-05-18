import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function initBase() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'happily_productive',
    waitForConnections: true,
  });

  try {
    const connection = await pool.getConnection();
    console.log("🐝 Membuat tabel-tabel utama (Base Tables) di MySQL/MariaDB...\n");

    const baseTables = [
      `CREATE TABLE IF NOT EXISTS teams (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          department VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS departments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          password_hash VARCHAR(255),
          job_title VARCHAR(255),
          team_id VARCHAR(255),
          manager_id VARCHAR(255),
          department VARCHAR(255),
          streak INT DEFAULT 0,
          points INT DEFAULT 0,
          coins INT DEFAULT 0,
          level INT DEFAULT 1,
          rank VARCHAR(10) DEFAULT 'E',
          avatar_image LONGTEXT,
          avatar_config_json TEXT,
          user_role_context TEXT,
          is_onboarded BOOLEAN DEFAULT 0,
          last_activity_at DATETIME,
          personal_wellbeing_goal TEXT,
          wellbeing_routine TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (team_id) REFERENCES teams(id),
          FOREIGN KEY (manager_id) REFERENCES users(id)
      )`,

      `CREATE TABLE IF NOT EXISTS mood_checkins (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          mood_key VARCHAR(50) NOT NULL,
          energy_key VARCHAR(50) NOT NULL,
          tag VARCHAR(255),
          note TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
      )`,

      `CREATE TABLE IF NOT EXISTS goals (
          id VARCHAR(255) PRIMARY KEY,
          owner_id VARCHAR(255) NOT NULL,
          parent_id VARCHAR(255),
          assigned_by_id VARCHAR(255),
          title VARCHAR(500) NOT NULL,
          progress INT DEFAULT 0,
          alignment INT,
          due_date VARCHAR(100),
          tone VARCHAR(50),
          metric VARCHAR(255),
          scope VARCHAR(50),
          status VARCHAR(50) DEFAULT 'pending',
          is_kpi BOOLEAN DEFAULT 0,
          owner_name VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(id),
          FOREIGN KEY (parent_id) REFERENCES goals(id),
          FOREIGN KEY (assigned_by_id) REFERENCES users(id)
      )`,

      `CREATE TABLE IF NOT EXISTS sub_goals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          goal_id VARCHAR(255) NOT NULL,
          title VARCHAR(500) NOT NULL,
          is_done BOOLEAN DEFAULT 0,
          FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS daily_priorities (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          goal_id VARCHAR(255),
          title VARCHAR(500) NOT NULL,
          goal_title VARCHAR(500),
          energy_level VARCHAR(50),
          est_time VARCHAR(50),
          is_done BOOLEAN DEFAULT 0,
          is_verified BOOLEAN DEFAULT 0,
          tone VARCHAR(50),
          type VARCHAR(100),
          points_awarded INT DEFAULT 50,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (goal_id) REFERENCES goals(id)
      )`,

      `CREATE TABLE IF NOT EXISTS habits (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          streak INT DEFAULT 0,
          target_days INT DEFAULT 7,
          is_done_today BOOLEAN DEFAULT 0,
          glyph VARCHAR(50),
          history_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
      )`,

      `CREATE TABLE IF NOT EXISTS kudos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sender_id VARCHAR(255) NOT NULL,
          receiver_id VARCHAR(255) NOT NULL,
          value_tag VARCHAR(100),
          message TEXT,
          likes_count INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id),
          FOREIGN KEY (receiver_id) REFERENCES users(id)
      )`,

      `CREATE TABLE IF NOT EXISTS surveys (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          url VARCHAR(500) NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          published_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS xp_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          amount INT NOT NULL,
          activity_type VARCHAR(100) NOT NULL,
          reference_id VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
      )`,

      `CREATE TABLE IF NOT EXISTS rewards (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          points_cost INT NOT NULL,
          category VARCHAR(255),
          tone VARCHAR(50),
          glyph VARCHAR(50),
          description TEXT,
          stock INT DEFAULT 999
      )`,

      `CREATE TABLE IF NOT EXISTS learning_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          meta_info VARCHAR(255),
          tag VARCHAR(255),
          tone VARCHAR(50),
          status VARCHAR(50) DEFAULT 'new',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS user_skills (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          current_level INT DEFAULT 0,
          target_level INT DEFAULT 100,
          FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    ];

    let success = 0;
    let failed = 0;

    for (const sql of baseTables) {
      try {
        await connection.query(sql);
        const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        console.log(`  ✅ Tabel '${name}' berhasil dibuat.`);
        success++;
      } catch (e: any) {
        const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        console.error(`  ❌ Gagal membuat tabel '${name}':`, e.message);
        failed++;
      }
    }

    console.log(`\n🐝 Base Tables Initialization Selesai! ✅ ${success} berhasil, ❌ ${failed} gagal.`);
    connection.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Gagal terhubung ke MySQL:", error);
    process.exit(1);
  }
}

initBase();
