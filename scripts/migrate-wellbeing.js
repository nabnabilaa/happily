const { createClient } = require("@libsql/client");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function migrate() {
  try {
    console.log("Adding columns to users table...");
    await db.execute("ALTER TABLE users ADD COLUMN personal_wellbeing_goal TEXT DEFAULT ''");
    await db.execute("ALTER TABLE users ADD COLUMN wellbeing_routine TEXT DEFAULT '[]'");
    console.log("Migration successful!");
  } catch (e) {
    console.error("Migration failed (maybe columns already exist):", e.message);
  }
}

migrate();
