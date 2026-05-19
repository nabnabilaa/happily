import { db } from '../lib/turso';
async function run() {
  const rows = await db.execute("SELECT id, title, is_done, goal_id, kpi_id, created_at FROM daily_priorities WHERE goal_id = '1779083107092' OR kpi_id = '1779083107092'");
  console.log(rows.rows);
}
run();
