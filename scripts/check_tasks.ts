import { db } from '../lib/db';

async function run() {
  const result = await db.execute("SELECT id, user_id, title, is_done, is_verified, status FROM daily_priorities WHERE user_id = 'u_32reh29'");
  console.log(JSON.stringify(result.rows, null, 2));
}

run().catch(console.error);
