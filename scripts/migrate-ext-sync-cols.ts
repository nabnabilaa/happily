import { db } from '../lib/turso';

async function migrate() {
  const cols = [
    { name: 'proof_link', type: 'TEXT' },
    { name: 'proof_notes', type: 'TEXT' },
    { name: 'metric_value', type: 'DOUBLE' },
    { name: 'progress', type: 'INT DEFAULT 0' },
    { name: 'is_project', type: 'BOOLEAN DEFAULT 0' },
    { name: 'project_duration_days', type: 'INT' },
    { name: 'project_description', type: 'TEXT' },
    { name: 'source', type: 'VARCHAR(50)' },
    { name: 'kpi_id', type: 'VARCHAR(100)' }
  ];

  for (const c of cols) {
    try {
      await db.execute(`ALTER TABLE daily_priorities ADD COLUMN ${c.name} ${c.type}`);
      console.log(`Added column ${c.name}`);
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log(`Column ${c.name} already exists`);
      } else {
        console.error(`Failed to add ${c.name}:`, e.message);
      }
    }
  }

  // Also alter daily_priorities ID to allow string UUIDs if it's currently INT AUTO_INCREMENT
  // Actually, wait, it's INT AUTO_INCREMENT. But in the ext sync: `INSERT INTO daily_priorities (id, ...`
  // The extension uses Date.now() which is a big number. An INT in MySQL is max 2147483647.
  // Date.now() is 1700000000000. It will OUT OF RANGE!
  try {
    await db.execute(`ALTER TABLE daily_priorities MODIFY COLUMN id VARCHAR(100)`);
    console.log(`Changed daily_priorities.id to VARCHAR(100)`);
  } catch (e: any) {
    console.log('Failed to alter id:', e.message);
  }

  // Same for notes table!
  try {
    await db.execute(`ALTER TABLE notes MODIFY COLUMN id VARCHAR(100)`);
    console.log(`Changed notes.id to VARCHAR(100)`);
  } catch (e: any) {
    console.log('Failed to alter notes.id:', e.message);
  }

  try {
    await db.execute(`ALTER TABLE notes ADD COLUMN related_event_id VARCHAR(100)`);
    console.log(`Added notes.related_event_id`);
  } catch(e: any) {}

  try {
    await db.execute(`ALTER TABLE notes ADD COLUMN source VARCHAR(50)`);
    console.log(`Added notes.source`);
  } catch(e: any) {}

  // Create ext_sync_log table
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS ext_sync_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(100),
      tasks_synced INT,
      direction VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log(`Created ext_sync_log`);
  } catch(e: any) {}

  console.log('Done!');
  process.exit(0);
}

migrate();
