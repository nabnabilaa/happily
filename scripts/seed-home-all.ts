import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seedHome() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  try {
    const conn = await pool.getConnection();
    const empId = "user_employee";

    console.log("Seeding home data...");

    // 1. Priorities
    await conn.query("DELETE FROM daily_priorities WHERE user_id = ?", [empId]);
    const priorities = [
      { title: 'Finalisasi Dokumen Kebutuhan Sistem', status: 1, tone: 'sage' },
      { title: 'Testing API dengan Postman', status: 0, tone: 'blue' },
      { title: 'Review Code PR #142', status: 0, tone: 'yellow' }
    ];
    for (const p of priorities) {
      await conn.query(
        "INSERT INTO daily_priorities (id, user_id, title, is_done, tone, target_date) VALUES (?, ?, ?, ?, ?, CURDATE())",
        [`prio_${uuidv4().substring(0,8)}`, empId, p.title, p.status, p.tone]
      );
    }

    // 2. Habits
    await conn.query("DELETE FROM habits WHERE user_id = ?", [empId]);
    const habits = [
      { name: 'Minum Air Putih 2L', glyph: 'water', is_done: 1 },
      { name: 'Olahraga Ringan 15m', glyph: 'fire', is_done: 0 }
    ];
    for (const h of habits) {
      const dates = h.is_done ? JSON.stringify([new Date().toISOString().split('T')[0]]) : '[]';
      await conn.query(
        "INSERT INTO habits (user_id, name, streak, target_days, is_done_today, glyph, completed_dates) VALUES (?, ?, 3, 30, ?, ?, ?)",
        [empId, h.name, h.is_done, h.glyph, dates]
      );
    }

    // 3. Attendance & Mood
    await conn.query("DELETE FROM attendance WHERE user_id = ? AND DATE(check_in_at) = CURDATE()", [empId]);
    await conn.query(
      "INSERT INTO attendance (user_id, check_in_at, check_in_type, status, mood) VALUES (?, DATE_ADD(CURDATE(), INTERVAL 8 HOUR), 'WFO', 'present', 'happy')",
      [empId]
    );

    await conn.query("DELETE FROM mood_checkins WHERE user_id = ? AND DATE(created_at) = CURDATE()", [empId]);
    await conn.query(
      "INSERT INTO mood_checkins (user_id, mood_key, energy_key, tag, created_at) VALUES (?, 'joy', 'high', 'Semangat Pagi', NOW())",
      [empId]
    );

    console.log("Home seeding completed.");
    conn.release();
    await pool.end();
  } catch(e) {
    console.error("Failed:", e);
  }
  process.exit(0);
}
seedHome();
