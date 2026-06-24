import { db } from '../lib/db';

async function run() {
  const result = await db.execute("SELECT id, name, role, user_role_context, department FROM users WHERE id = 'user_manager'");
  console.log(JSON.stringify(result.rows, null, 2));
}

run().catch(console.error);
