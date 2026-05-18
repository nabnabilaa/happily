import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function createTables() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'happily_productive',
  });
  const c = await pool.getConnection();
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS ai_weekly_summaries (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      week_start DATE,
      week_end DATE,
      summary_text TEXT,
      score INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_aws_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS ai_monthly_analyses (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      month INT,
      year INT,
      analysis_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ama_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS ext_sync_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255),
      tasks_synced INT,
      direction VARCHAR(20),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of tables) {
    try {
      await c.query(sql);
      const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
      console.log(`✅ ${name}`);
    } catch (e: any) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR') console.log('⏭️ already exists');
      else console.error('❌', e.message);
    }
  }

  console.log('Done!');
  c.release();
  await pool.end();
  process.exit(0);
}

createTables();
