import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function check() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  const [rows] = await pool.query("SELECT * FROM goals");
  console.log("ALL GOALS:", rows);
  process.exit(0);
}
check();
