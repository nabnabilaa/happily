import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const pool = mysql.createPool({
    uri: process.env.MYSQL_URI,
    waitForConnections: true,
  });
  const [rows] = await pool.query('SELECT id, email, role FROM users LIMIT 10');
  console.log("Current users in DB (first 10):");
  console.log(rows);
  process.exit(0);
}
check();
