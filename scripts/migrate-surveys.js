const { createClient } = require("@libsql/client");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function migrate() {
  try {
    console.log("Creating surveys table...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS surveys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
      )
    `);
    console.log("Migration successful!");
  } catch (e) {
    console.error("Migration failed:", e.message);
  }
}

migrate();
