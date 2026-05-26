import { db } from '../lib/db';

async function run() {
  await db.execute({
    sql: "UPDATE users SET points = 1500, coins = 1500, level = 6, `rank` = 'C' WHERE id = 'employee'"
  });
  console.log("Done");
  process.exit(0);
}

run();
