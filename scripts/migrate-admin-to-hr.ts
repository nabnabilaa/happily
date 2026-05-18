import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
  // Check how many admin users exist
  const before = await db.execute("SELECT id, name, email, role FROM users WHERE role = 'admin'");
  console.log(`Found ${before.rows.length} admin user(s):`);
  before.rows.forEach(r => console.log(`  - ${r.name} (${r.email})`));

  if (before.rows.length === 0) {
    console.log("No admin users to migrate. Done.");
    return;
  }

  // Update all admin users to hr
  await db.execute("UPDATE users SET role = 'hr' WHERE role = 'admin'");

  // Verify
  const after = await db.execute("SELECT id, name, email, role FROM users WHERE role = 'admin'");
  console.log(`\nMigration complete. Remaining admin users: ${after.rows.length}`);

  const hrUsers = await db.execute("SELECT id, name, email, role FROM users WHERE role = 'hr'");
  console.log(`HR users now: ${hrUsers.rows.length}`);
  hrUsers.rows.forEach(r => console.log(`  - ${r.name} (${r.email}) → role: ${r.role}`));
}

main().catch(console.error);
