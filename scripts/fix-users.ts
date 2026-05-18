import { db } from '../lib/turso';

async function main() {
  try {
    await db.execute('ALTER TABLE users ADD COLUMN department VARCHAR(255)');
    console.log('✅ Added department to users');
  } catch (e: any) {
    if (e.message.includes('duplicate column name')) {
      console.log('✅ department column already exists');
    } else {
      console.error('❌', e.message);
    }
  }
}
main();
