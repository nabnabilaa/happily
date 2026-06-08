import { db } from '../lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  const email = "test@onboard.com";
  const password = "password";
  const hash = await bcrypt.hash(password, 10);
  
  await db.execute({
    sql: "INSERT INTO users (id, email, name, role, password_hash, points, coins, level, `rank`, streak, is_onboarded) VALUES (?, ?, ?, ?, ?, 0, 0, 1, 'E', 0, 0)",
    args: ["u_test_onboard", email, "Test User", "employee", hash]
  });
  console.log("User created: " + email + " / " + password);
}
main().catch(console.error);
