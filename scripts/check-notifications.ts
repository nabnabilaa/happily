import { db } from "../lib/db";

async function run() {
  console.log("Checking notifications table...");
  try {
    const res = await db.execute("SHOW TABLES LIKE 'notifications'");
    if (res.rows.length === 0) {
      console.log("⚠️ notifications table DOES NOT exist! Creating it now...");
      
      const createSql = `CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'info',
        reference_id VARCHAR(100),
        reference_type VARCHAR(100),
        is_read TINYINT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`;
      
      await db.execute(createSql);
      console.log("✅ notifications table created successfully.");
    } else {
      console.log("✅ notifications table exists.");
      const columns = await db.execute("SHOW COLUMNS FROM notifications");
      console.log("Columns:");
      columns.rows.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });

      const countRes = await db.execute("SELECT COUNT(*) as count FROM notifications");
      console.log(`Total notifications: ${countRes.rows[0].count}`);
    }
    process.exit(0);
  } catch (error) {
    console.error("Error inspecting database:", error);
    process.exit(1);
  }
}

run();
