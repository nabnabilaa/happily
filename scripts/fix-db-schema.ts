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
  console.log("Adding global_settings table...");

  try {
    // 1. Create table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS global_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Created global_settings table.");

    // 2. Insert default Work Schedule if not exists
    const defaultWorkSchedule = {
      start: "08:00",
      end: "17:00",
      breakStart: "12:00",
      breakEnd: "13:00"
    };

    await db.execute({
      sql: `INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING`,
      args: ["work_schedule", JSON.stringify(defaultWorkSchedule)]
    });

    console.log("Inserted default work_schedule.");

    // 3. Insert default Contacts if not exists
    const defaultContacts = [
      { id: '1', name: 'HR Helpdesk', role: 'Support & Admin', email: 'hr@company.com', phone: '021-1234567' },
      { id: '2', name: 'IT Support', role: 'Technical Issues', email: 'it@company.com', phone: '0812-3456-7890' },
      { id: '3', name: 'Security Office', role: 'Safety & Emergency', email: 'security@company.com', phone: '021-9876543' }
    ];

    await db.execute({
      sql: `INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING`,
      args: ["contacts", JSON.stringify(defaultContacts)]
    });

    console.log("Inserted default contacts.");

    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration error:", err);
  }
}

main();
