import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function createTable() {
  const pool = mysql.createPool({
    uri: process.env.MYSQL_URI,
    waitForConnections: true,
  });

  try {
    const query = `
      CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (email)
      )
    `;
    await pool.query(query);
    console.log("Table password_resets created or already exists.");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    process.exit(0);
  }
}

createTable();
