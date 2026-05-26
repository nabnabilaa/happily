import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixHabits() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  try {
    const [users] = await pool.query("SELECT id FROM users WHERE role = 'employee'");
    
    // Clear all existing habits
    await pool.query("DELETE FROM habits");

    const habits = [
      { name: 'Minum Air Putih 2L', glyph: 'water', is_done: 1, streak: 4 },
      { name: 'Olahraga Ringan 15m', glyph: 'fire', is_done: 0, streak: 1 }
    ];

    const dates = [];
    const d = new Date();
    for (let i = 0; i <= 3; i++) {
      const past = new Date(d);
      past.setDate(d.getDate() - i);
      dates.push(past.toISOString().split('T')[0]);
    }

    for (const user of (users as any[])) {
      const empId = user.id;
      for (const h of habits) {
        const dts = h.is_done ? JSON.stringify(dates) : '[]';
        await pool.query(
          "INSERT INTO habits (user_id, name, streak, target_days, is_done_today, glyph, completed_dates) VALUES (?, ?, ?, 30, ?, ?, ?)",
          [empId, h.name, h.streak, h.is_done, h.glyph, dts]
        );
      }
    }
    
    console.log("Habits restored for all employees!");
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
fixHabits();
