import { db } from '../lib/turso';

async function run() {
  try {
    console.log('Adding lock columns...');
    await db.execute('ALTER TABLE notes ADD COLUMN locked_by TEXT');
    await db.execute('ALTER TABLE notes ADD COLUMN locked_at TEXT');
    console.log('Success!');
  } catch (error) {
    console.error('Migration failed (maybe columns already exist?):', error);
  }
  process.exit(0);
}

run();
