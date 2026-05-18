import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function run() {
  console.log("🚀 Updating database schema...");

  try {
    // 1. Create office_locations table
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
    console.log("✅ office_locations table created or already exists.");

    // 2. Insert a default office location if table is empty
    const officeCount = await db.execute("SELECT COUNT(*) as count FROM office_locations");
    if (officeCount.rows[0].count === 0) {
      await db.execute({
        sql: "INSERT INTO office_locations (id, name, lat, lng, radius) VALUES (?, ?, ?, ?, ?)",
        args: ["office_hq", "Kantor Pusat (Bandung)", -6.9175, 107.6191, 1000] // Default 1km radius
      });
      console.log("✅ Inserted default office location.");
    }

    // 3. Alter attendance table to add new columns
    const attendanceSchema = await db.execute("PRAGMA table_info(attendance);");
    const columns = attendanceSchema.rows.map((row: any) => row.name);

    if (!columns.includes("check_in_type")) {
      await db.execute("ALTER TABLE attendance ADD COLUMN check_in_type TEXT DEFAULT 'WFO'");
      console.log("✅ Added check_in_type column to attendance.");
    }
    
    if (!columns.includes("office_id")) {
      await db.execute("ALTER TABLE attendance ADD COLUMN office_id TEXT");
      console.log("✅ Added office_id column to attendance.");
    }

    if (!columns.includes("notes")) {
      await db.execute("ALTER TABLE attendance ADD COLUMN notes TEXT");
      console.log("✅ Added notes column to attendance.");
    }

    if (!columns.includes("check_in_at")) {
      await db.execute("ALTER TABLE attendance ADD COLUMN check_in_at DATETIME DEFAULT CURRENT_TIMESTAMP");
      // Backfill check_in_at from created_at for existing rows
      await db.execute("UPDATE attendance SET check_in_at = created_at WHERE check_in_at IS NULL");
      console.log("✅ Added check_in_at column to attendance and backfilled from created_at.");
    }

    console.log("🎉 Database update complete!");
  } catch (error) {
    console.error("❌ Error updating database:", error);
  } finally {
    process.exit();
  }
}

run();
