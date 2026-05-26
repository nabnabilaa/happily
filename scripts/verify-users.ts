import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verify() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  try {
    const [rows] = await pool.query("SELECT id, role FROM users");
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
verify();
