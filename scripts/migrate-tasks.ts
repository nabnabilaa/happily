import { db } from "../lib/turso";

async function run() {
  console.log("Adding columns to daily_priorities...");
  try {
    await db.execute("ALTER TABLE daily_priorities ADD COLUMN target_date TEXT");
    console.log("Added target_date.");
  } catch (e: any) {
    console.log("target_date:", e.message);
  }
  
  try {
    await db.execute("ALTER TABLE daily_priorities ADD COLUMN description TEXT");
    console.log("Added description.");
  } catch (e: any) {
    console.log("description:", e.message);
  }
  
  console.log("Migration complete.");
}

run();
