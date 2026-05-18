import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function check() {
  try {
    const res = await db.execute("PRAGMA table_info(attendance);");
    console.log("Attendance table schema:", res.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

check();
