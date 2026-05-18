import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function init() {
  console.log("🚀 Initializing Turso Database...");
  
  try {
    const sqlPath = path.join(process.cwd(), "scripts/init-db.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    
    // Split by semicolon to execute multiple statements
    // Note: This is a simple split, complex SQL might need a better parser
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await db.execute(statement);
    }
    
    console.log("✅ Database initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
  } finally {
    process.exit();
  }
}

init();
