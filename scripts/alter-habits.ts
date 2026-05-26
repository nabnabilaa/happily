import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  try {
    const conn = await pool.getConnection();
    await conn.query("ALTER TABLE habits ADD COLUMN completed_dates JSON DEFAULT NULL");
    console.log("Success");
    conn.release();
  } catch(e: any) {
    console.log("Error or already exists:", e.message);
  }
  process.exit(0);
}
run();
