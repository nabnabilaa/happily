import { db } from './lib/db';

async function seed() {
  try {
    const userId = 'user_hr'; // Ganti dengan ID user yang sedang dilihat (biasanya 'user_employee' untuk employee test)
    
    // Get today's date in local time
    const today = new Date();
    today.setHours(today.getHours() + 7);
    const dateStr = today.toISOString().split('T')[0];

    console.log(`Seeding data for user ${userId} on ${dateStr}...`);

    // 1. Tambahkan data attendance untuk hari ini (jika belum ada)
    // Jika sudah ada (checked in), kita biarkan. Tapi kita set check_out_at agar lengkap.
    await db.execute({
      sql: `UPDATE attendance 
            SET check_out_at = CONCAT(?, ' 17:00:00'), duration_minutes = 480, status = 'present' 
            WHERE user_id = ? AND DATE(CONVERT_TZ(check_in_at, '+00:00', '+07:00')) = ?`,
      args: [dateStr, userId, dateStr]
    });

    // 2. Tambahkan Mood (jika belum ada)
    const moodRes = await db.execute({
      sql: `SELECT id FROM mood_checkins WHERE user_id = ? AND DATE(CONVERT_TZ(created_at, '+00:00', '+07:00')) = ?`,
      args: [userId, dateStr]
    });
    if (moodRes.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO mood_checkins (user_id, mood_key, energy_key, tag, created_at)
              VALUES (?, 'focus', 'High', 'Siap menyelesaikan task!', CONCAT(?, ' 09:00:00'))`,
        args: [userId, dateStr]
      });
    }

    // 3. Tambahkan Logbook Entries
    await db.execute({
      sql: `INSERT INTO logbook_entries (user_id, content, created_at)
            VALUES (?, 'Menyelesaikan modul frontend untuk fitur Logbook.', CONCAT(?, ' 11:30:00'))`,
      args: [userId, dateStr]
    });
    await db.execute({
      sql: `INSERT INTO logbook_entries (user_id, content, created_at)
            VALUES (?, 'Meeting dengan tim membahas arsitektur database baru.', CONCAT(?, ' 14:00:00'))`,
      args: [userId, dateStr]
    });

    // 4. Skip XP Transactions (since id is not auto increment and we don't know the format)

    console.log("Seeding selesai! Coba buka modal kalender lagi untuk melihat perubahannya.");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding:", err);
    process.exit(1);
  }
}

seed();
