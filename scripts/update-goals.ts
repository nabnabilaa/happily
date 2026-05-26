import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function update() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  await pool.query("UPDATE goals SET scope='assigned' WHERE title LIKE '%Analytics%' OR title LIKE '%Kepuasan%'");
  await pool.query("UPDATE goals SET scope='personal' WHERE title LIKE '%Sertifikasi%'");
  console.log('Updated scopes in DB');
  process.exit(0);
}
update();
