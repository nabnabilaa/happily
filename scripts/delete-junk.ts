import { db } from '../lib/db';

async function run() {
  await db.execute({
    sql: "DELETE FROM daily_priorities WHERE user_id = 'user_employee' AND id NOT IN ('prio_d1', 'prio_d2', 'prio_d3')"
  });
  console.log('Deleted junk priorities for user_employee');
  process.exit(0);
}

run();
