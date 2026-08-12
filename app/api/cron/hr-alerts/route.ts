import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cronAuth';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/notificationService';

/**
 * Peringatan kesejahteraan: siapa yang perlu ditengok minggu ini.
 *
 * Tiga hal membuat versi sebelumnya tidak pernah menghasilkan apa pun, dan
 * ketiganya gagal tanpa suara:
 *
 * 1. Ia membaca `users.mood`. Kolom itu tidak ada — check-in menulis ke
 *    `users.mood_key` dan `mood_checkins`. Query-nya melempar error, tertangkap
 *    `catch`, dan endpoint-nya balas 500 yang tidak seorang pun lihat.
 * 2. Ia mencari mood `'burnout'`. Nilai yang benar-benar dipakai aplikasi hanya
 *    joy | calm | neutral | tired | stress; 'burnout' tidak pernah tertulis
 *    sekali pun. Jadi memperbaiki nama kolomnya saja tetap menghasilkan nol.
 * 3. Ia hanya mengabari HR. Yang paling bisa bertindak justru atasan langsung
 *    orang itu — HR biasanya baru bergerak setelah manajernya menyerah.
 *
 * Ambangnya sekarang berdasar POLA, bukan satu titik: seseorang muncul kalau
 * dalam 7 hari terakhir ia mencatat `stress`/`tired` minimal tiga kali. Satu
 * hari buruk dialami semua orang; tiga hari dalam seminggu adalah kabar.
 */

/** Berapa kali mood berat dalam sepekan sebelum dianggap perlu ditengok. */
const HEAVY_MOOD_THRESHOLD = 3;
const HEAVY_MOODS = ['stress', 'tired'];

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const concerningRes = await db.execute({
      sql: `SELECT u.id, u.name, u.manager_id,
                   COUNT(*) AS heavy_days,
                   SUM(CASE WHEN mc.mood_key = 'stress' THEN 1 ELSE 0 END) AS stress_days
              FROM mood_checkins mc
              JOIN users u ON u.id = mc.user_id
             WHERE mc.created_at > NOW() - INTERVAL 7 DAY
               AND mc.mood_key IN (?, ?)
             GROUP BY u.id, u.name, u.manager_id
            HAVING heavy_days >= ?`,
      args: [...HEAVY_MOODS, HEAVY_MOOD_THRESHOLD],
    });

    if (concerningRes.rows.length === 0) {
      return NextResponse.json({ success: true, message: 'Tidak ada pola mood yang perlu ditindak', alerts: 0 });
    }

    // HR-Admin mencakup role `hr` DAN pemegang `hr_access` — keduanya membuka
    // konsol yang sama, jadi keduanya perlu tahu.
    const hrRes = await db.execute("SELECT id FROM users WHERE role = 'hr' OR hr_access = 1");

    let sent = 0;
    for (const person of concerningRes.rows as any[]) {
      const heavy = Number(person.heavy_days) || 0;
      const stress = Number(person.stress_days) || 0;
      const title = '🌱 Perlu Ditengok';
      const message =
        `${person.name} mencatat mood berat ${heavy} kali dalam 7 hari terakhir` +
        `${stress > 0 ? ` (${stress} di antaranya "stress")` : ''}. ` +
        `Mungkin waktunya ngobrol santai.`;

      // Atasan langsung lebih dulu — dia yang bisa mengatur ulang beban kerja.
      const recipients = new Set<string>();
      if (person.manager_id) recipients.add(String(person.manager_id));
      for (const hr of hrRes.rows as any[]) recipients.add(String(hr.id));
      // Orang itu sendiri tidak dikabari tentang dirinya.
      recipients.delete(String(person.id));

      for (const userId of recipients) {
        const res = await dispatchNotification(userId, 'hr_alert', { title, message });
        if (res.success && !res.deduped) sent++;
      }
    }

    return NextResponse.json({
      success: true,
      flagged: concerningRes.rows.length,
      notificationsSent: sent,
    });
  } catch (error: any) {
    console.error('HR Alerts Cron Error:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}
