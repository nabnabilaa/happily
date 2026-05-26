import { db } from '../lib/db';

async function run() {
  await db.execute("DELETE FROM daily_priorities WHERE user_id = 'user_employee'");
  console.log("Deleted priorities for user_employee");
  process.exit(0);
}

run();
