import { db } from '../lib/turso';
async function run() {
  try {
    const result = await db.execute("SELECT CURDATE() as curdate, NOW() as now");
    console.log('--- DB TIME ---');
    console.log(result.rows[0]);

    const users = await db.execute("SELECT id, name, role FROM users");
    console.log('--- USERS ---');
    console.log(users.rows);

    const priorities = await db.execute("SELECT id, user_id, title, is_done, created_at, target_date FROM daily_priorities");
    console.log('--- DAILY PRIORITIES ---');
    console.log(priorities.rows);
  } catch (error) {
    console.error(error);
  }
}
run();
