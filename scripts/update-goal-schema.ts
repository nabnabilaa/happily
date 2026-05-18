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
  console.log("Updating schema for KPI/Goal approval system...");

  try {
    // 1. Add status to goals
    try {
      await db.execute(`ALTER TABLE goals ADD COLUMN status TEXT DEFAULT 'pending'`);
      console.log("Added 'status' to goals.");
    } catch (e: any) { console.log("'status' might already exist in goals."); }

    // 2. Add is_kpi to goals
    try {
      await db.execute(`ALTER TABLE goals ADD COLUMN is_kpi BOOLEAN DEFAULT 0`);
      console.log("Added 'is_kpi' to goals.");
    } catch (e: any) { console.log("'is_kpi' might already exist in goals."); }

    // 3. Add goal_id to daily_priorities
    try {
      await db.execute(`ALTER TABLE daily_priorities ADD COLUMN goal_id TEXT`);
      console.log("Added 'goal_id' to daily_priorities.");
    } catch (e: any) { console.log("'goal_id' might already exist in daily_priorities."); }

  } catch (err) {
    console.error("Migration error:", err);
  }

  console.log("Migration complete.");
}

main();
