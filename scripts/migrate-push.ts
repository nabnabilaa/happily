import { db } from "../lib/db";

async function run() {
  console.log("Running migration for push_subscriptions...");
  try {
    const sql = `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id VARCHAR(100) NOT NULL,
      endpoint VARCHAR(500) NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, endpoint(255))
    )`;
    await db.execute(sql);
    console.log("✅ push_subscriptions table created successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create push_subscriptions table:", error);
    process.exit(1);
  }
}

run();
