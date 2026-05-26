import { db } from '../lib/db';

async function run() {
  // 1. Delete junk entries
  await db.execute({
    sql: "DELETE FROM daily_priorities WHERE title = ? OR title = ?",
    args: ["hai ndbdlijd n debuj", "jecn wejencj qndjkdn"]
  });
  console.log("✅ Junk titles deleted");

  // 2. Remove duplicates — keep only one per title per user
  const all = await db.execute(
    "SELECT id, title, user_id FROM daily_priorities ORDER BY user_id, title, id"
  );
  const seen = new Map<string, string>();
  const toDelete: string[] = [];
  for (const r of all.rows) {
    const key = `${r.user_id}::${r.title}`;
    if (seen.has(key)) {
      toDelete.push(String(r.id));
    } else {
      seen.set(key, String(r.id));
    }
  }
  for (const id of toDelete) {
    await db.execute({ sql: "DELETE FROM daily_priorities WHERE id = ?", args: [id] });
  }
  console.log(`✅ Deleted ${toDelete.length} duplicates`);

  // 3. Show remaining
  const remaining = await db.execute(
    "SELECT id, title, user_id FROM daily_priorities ORDER BY user_id, title"
  );
  console.log("Remaining priorities:");
  for (const r of remaining.rows) {
    console.log(`  [${r.user_id}] ${r.title}`);
  }

  process.exit(0);
}
run();
