import { db } from '../lib/db';

async function check() {
  try {
    const res = await db.execute("SELECT COUNT(*) as c FROM users");
    console.log("Total users:", res.rows[0].c);
    const res2 = await db.execute("SELECT COUNT(*) as c FROM calendar_events");
    console.log("Total events:", res2.rows[0].c);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
check();

