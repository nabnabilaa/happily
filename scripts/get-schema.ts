import { db } from "../lib/db";

async function main() {
  try {
    const p = await db.execute("SHOW CREATE TABLE daily_priorities");
    console.log(p.rows[0]["Create Table"]);
    const tkl = await db.execute("SHOW CREATE TABLE task_kpi_links");
    console.log(tkl.rows[0]["Create Table"]);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
main();
