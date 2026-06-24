import { db } from '../lib/db';

async function run() {
  const result = await db.execute("SHOW TABLES");
  console.log(JSON.stringify(result.rows, null, 2));
}

run().catch(console.error);
