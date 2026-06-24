import { db } from '../lib/db';

async function run() {
  const result = await db.execute("SELECT * FROM ext_sync_log ORDER BY synced_at DESC LIMIT 10");
  console.log(JSON.stringify(result.rows, null, 2));
}

run().catch(console.error);
