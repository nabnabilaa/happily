import { GET } from '../app/api/migrate-schema/route';

async function run() {
  console.log("Running schema migration...");
  const res = await GET();
  const data = await res.json();
  console.log("Migration Summary:", data.summary);
  console.log("Migration Results:", data.results);
}

run().catch(console.error);
