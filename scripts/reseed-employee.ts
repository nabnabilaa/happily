import { db } from '../lib/db';

async function run() {
  const userId = 'user_employee';

  // Re-seed dummy priorities
  const priorities = [
    { id: 'prio_d1', title: 'Finalisasi Dokumen Kebutuhan Sistem', energy: 'high', est: '2 jam', tone: 'blue' },
    { id: 'prio_d2', title: 'Review Code PR #142', energy: 'medium', est: '1 jam', tone: 'green' },
    { id: 'prio_d3', title: 'Testing API dengan Postman', energy: 'low', est: '30 menit', tone: 'yellow' },
  ];

  for (const p of priorities) {
    await db.execute({
      sql: `INSERT INTO daily_priorities (id, user_id, title, energy_level, est_time, is_done, tone, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE title=VALUES(title)`,
      args: [p.id, userId, p.title, p.energy, p.est, p.tone]
    });
  }
  console.log("✅ Re-seeded priorities");

  // Re-seed dummy habits
  await db.execute({ sql: "DELETE FROM habits WHERE user_id = ?", args: [userId] });
  const habits = [
    { name: 'Belajar AI', streak: 12, target: 30, glyph: 'star', completedDates: generateDates(12) },
    { name: 'Olahraga Pagi', streak: 5, target: 21, glyph: 'heart', completedDates: generateDates(5) },
    { name: 'Baca Buku 15 Menit', streak: 8, target: 14, glyph: 'book', completedDates: generateDates(8) },
  ];

  for (const h of habits) {
    await db.execute({
      sql: `INSERT INTO habits (user_id, name, streak, target_days, is_done_today, glyph, completed_dates) VALUES (?, ?, ?, ?, 0, ?, ?)`,
      args: [userId, h.name, h.streak, h.target, h.glyph, JSON.stringify(h.completedDates)]
    });
  }
  console.log("✅ Re-seeded habits");

  // Fix points
  await db.execute({
    sql: "UPDATE users SET points = 1500, coins = 1500, level = 6, `rank` = 'C' WHERE id = ?",
    args: [userId]
  });
  console.log("✅ Fixed points: 1500 XP, Level 6, Rank C");

  process.exit(0);
}

function generateDates(count: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

run();
