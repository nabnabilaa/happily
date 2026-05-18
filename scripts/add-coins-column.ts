import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Turso credentials missing. Check .env.local.");
  process.exit(1);
}

const db = createClient({
  url: url,
  authToken: authToken,
});

async function main() {
  console.log("Adding 'coins' column to users table...");

  try {
    await db.execute(`
      ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0
    `);
    console.log("Added 'coins' column.");
  } catch (err: any) {
    if (err.message.includes("duplicate column name")) {
      console.log("'coins' column already exists.");
    } else {
      console.error("Error adding 'coins' column:", err);
    }
  }

  console.log("Migration complete.");
}

main();
