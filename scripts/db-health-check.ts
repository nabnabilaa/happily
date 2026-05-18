import { db } from "@/lib/turso";

async function check() {
  const userId = "user_admin"; // We just migrated this to HR, let's use it as test
  console.log("--- DATABASE HEALTH CHECK ---");

  const tests = [
    { name: "Users Table", sql: "SELECT * FROM users LIMIT 1" },
    { name: "Daily Priorities", sql: "SELECT * FROM daily_priorities LIMIT 1" },
    { name: "Habits", sql: "SELECT * FROM habits LIMIT 1" },
    { name: "Goals", sql: "SELECT * FROM goals LIMIT 1" },
    { name: "Sub Goals", sql: "SELECT * FROM sub_goals LIMIT 1" },
    { name: "Surveys", sql: "SELECT * FROM surveys LIMIT 1" },
    { name: "Mood Checkins", sql: "SELECT * FROM mood_checkins LIMIT 1" },
    { name: "Kudos", sql: "SELECT * FROM kudos LIMIT 1" },
    { name: "User Skills", sql: "SELECT * FROM user_skills LIMIT 1" },
    { name: "Global Settings", sql: "SELECT * FROM global_settings LIMIT 1" },
    { name: "Attendance", sql: "SELECT * FROM attendance LIMIT 1" },
    { name: "Logbook", sql: "SELECT * FROM logbook_entries LIMIT 1" },
    { name: "Teams", sql: "SELECT * FROM teams LIMIT 1" },
    { name: "Learning Items", sql: "SELECT * FROM learning_items LIMIT 1" },
  ];

  for (const t of tests) {
    try {
      await db.execute(t.sql);
      console.log(`✅ ${t.name}`);
    } catch (e: any) {
      console.log(`❌ ${t.name}: ${e.message}`);
    }
  }

  console.log("\n--- TABLE SCHEMAS ---");
  const tables = ["users", "goals", "daily_priorities"];
  for (const table of tables) {
    try {
      const res = await db.execute(`PRAGMA table_info(${table})`);
      console.log(`\nSchema for ${table}:`);
      res.rows.forEach(r => console.log(`  - ${r.name} (${r.type})`));
    } catch (e: any) {
      console.log(`❌ Schema ${table}: ${e.message}`);
    }
  }
}

check().catch(console.error);
