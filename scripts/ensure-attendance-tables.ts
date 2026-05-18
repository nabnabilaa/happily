import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function run() {
  console.log("🚀 Ensuring attendance tables exist...");

  try {
    // 1. attendance_tokens
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_tokens (
        token TEXT PRIMARY KEY,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ attendance_tokens table ready.");

    // 2. office_locations
    await db.execute(`
      CREATE TABLE IF NOT EXISTS office_locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        radius INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ office_locations table ready.");

    // 3. attendance
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        location_lat REAL,
        location_lng REAL,
        mood TEXT,
        check_in_type TEXT DEFAULT 'WFO',
        office_id TEXT,
        notes TEXT,
        check_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ attendance table ready.");

    // Insert default office if empty
    const officeCount = await db.execute("SELECT COUNT(*) as count FROM office_locations");
    if (officeCount.rows[0].count === 0) {
      await db.execute({
        sql: "INSERT INTO office_locations (id, name, lat, lng, radius) VALUES (?, ?, ?, ?, ?)",
        args: ["office_hq", "Kantor Pusat (Bandung)", -6.9175, 107.6191, 1000]
      });
      console.log("✅ Inserted default office location.");
    }

    console.log("🎉 All tables are synchronized!");
  } catch (error) {
    console.error("❌ Error ensuring tables:", error);
  } finally {
    process.exit();
  }
}

run();
