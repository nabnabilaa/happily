import { db } from '../lib/turso';
async function run() {
  try {
    const schema = await db.execute("DESCRIBE daily_priorities");
    console.log('daily_priorities Schema:', schema.rows);
  } catch (error) {
    console.error(error);
  }
}
run();
