import { db } from '../lib/turso';
async function run() {
  const schema = await db.execute("PRAGMA table_info(logbook_entries)");
  console.log('Logbook Schema:', schema.rows);
}
run();
