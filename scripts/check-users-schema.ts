import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const pool = mysql.createPool({
    uri: process.env.MYSQL_URI,
    waitForConnections: true,
  });
  const [rows] = await pool.query('DESCRIBE users');
  console.log(rows);
  process.exit(0);
}
check();
