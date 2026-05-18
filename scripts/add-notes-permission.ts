import { db } from '../lib/turso';

async function run() {
  try {
    console.log('Adding shared_permission column...');
    await db.execute("ALTER TABLE notes ADD COLUMN shared_permission VARCHAR(20) DEFAULT 'view'");
    console.log('Success!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
  process.exit(0);
}

run();
