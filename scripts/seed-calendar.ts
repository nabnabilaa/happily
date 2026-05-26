import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seedCalendar() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  try {
    const conn = await pool.getConnection();
    const empId = "user_employee";
    
    console.log("Clearing old calendar events...");
    await conn.query("DELETE FROM calendar_attendees WHERE user_id = ?", [empId]);
    await conn.query("DELETE FROM calendar_events WHERE creator_id = ?", [empId]);

    console.log("Seeding dummy calendar events...");

    const dummyEvents = [
      {
        title: "Daily Standup - Tim DX",
        description: "Sinkronisasi harian tim Digital Experience.",
        startExpr: "DATE_ADD(CURDATE(), INTERVAL '09:30' HOUR_MINUTE)",
        endExpr: "DATE_ADD(CURDATE(), INTERVAL '10:00' HOUR_MINUTE)",
        location: "Google Meet Link"
      },
      {
        title: "1:1 with Budi Santoso",
        description: "Review progress OKR bulanan.",
        startExpr: "DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 1 DAY), INTERVAL '14:00' HOUR_MINUTE)",
        endExpr: "DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 1 DAY), INTERVAL '15:00' HOUR_MINUTE)",
        location: "Ruang Meeting A"
      },
      {
        title: "All Hands Meeting Perusahaan",
        description: "Update dari manajemen tentang pencapaian bulan ini.",
        startExpr: "DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 2 DAY), INTERVAL '15:00' HOUR_MINUTE)",
        endExpr: "DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 2 DAY), INTERVAL '17:00' HOUR_MINUTE)",
        location: "Townhall Area Utama"
      },
      {
        title: "Sesi Mentoring Teknis",
        description: "Diskusi arsitektur dan best practices bersama Lead Engineer.",
        startExpr: "DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 1 DAY), INTERVAL '11:00' HOUR_MINUTE)",
        endExpr: "DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 1 DAY), INTERVAL '12:00' HOUR_MINUTE)",
        location: "Ruang Meeting B"
      },
      {
        title: "Weekly Product Review",
        description: "Demonstrasi fitur yang sudah diselesaikan minggu ini.",
        startExpr: "DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 3 DAY), INTERVAL '16:00' HOUR_MINUTE)",
        endExpr: "DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 3 DAY), INTERVAL '17:00' HOUR_MINUTE)",
        location: "Google Meet Link"
      }
    ];

    for (const e of dummyEvents) {
      const eventId = `cal_${uuidv4().substring(0, 8)}`;
      await conn.query(
        `INSERT INTO calendar_events (id, creator_id, title, description, start_time, end_time, location, event_type, color)
         VALUES (?, ?, ?, ?, ${e.startExpr}, ${e.endExpr}, ?, 'meeting', '#3B6FA0')`,
        [eventId, empId, e.title, e.description, e.location]
      );
    }

    console.log("Calendar seeding completed.");
    conn.release();
  } catch(e) {
    console.error("Failed:", e);
  }
  process.exit(0);
}
seedCalendar();
