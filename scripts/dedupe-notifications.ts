/**
 * Bersihkan notifikasi duplikat yang terlanjur tersimpan sebelum guard anti-spam
 * dipasang (useTimeReminders remount berkali-kali, cron yang mengirim ulang).
 *
 *   npx tsx scripts/dedupe-notifications.ts           # dry-run, hanya melapor
 *   npx tsx scripts/dedupe-notifications.ts --apply   # benar-benar menghapus
 *
 * Aturan: dalam satu HARI KALENDER WIB, baris dengan (user_id, title, message)
 * identik dianggap satu kejadian. Yang dipertahankan adalah yang paling awal —
 * itu momen aslinya. Kejadian yang sama di hari berbeda TIDAK digabung, jadi
 * pengingat harian yang wajar (istirahat, pulang) tetap utuh sebagai riwayat.
 *
 * Kalau salah satu salinan sudah pernah dibaca, penyintasnya ikut ditandai
 * terbaca — user sudah melihat isinya, jangan dimunculkan lagi sebagai baru.
 */
import { db } from "@/lib/db";
import { sqlWibDate } from "@/lib/timeUtils";

const APPLY = process.argv.includes("--apply");

async function main() {
  const groups = await db.execute(
    `SELECT
       user_id,
       title,
       COALESCE(message, '') AS msg,
       ${sqlWibDate('created_at')} AS wib_day,
       COUNT(*)                    AS copies,
       MIN(created_at)             AS keep_at,
       MAX(is_read)                AS any_read
     FROM notifications
     GROUP BY user_id, title, COALESCE(message, ''), ${sqlWibDate('created_at')}
     HAVING copies > 1
     ORDER BY copies DESC`
  );

  if (groups.rows.length === 0) {
    console.log("Tidak ada duplikat. Selesai.");
    process.exit(0);
  }

  const removable = groups.rows.reduce((sum: number, r: any) => sum + (Number(r.copies) - 1), 0);
  console.log(`${groups.rows.length} grup duplikat, ${removable} baris bisa dihapus.\n`);
  console.table(
    groups.rows.slice(0, 20).map((r: any) => ({
      user: r.user_id,
      title: String(r.title).slice(0, 42),
      hari_wib: r.wib_day instanceof Date ? r.wib_day.toISOString().slice(0, 10) : String(r.wib_day),
      salinan: Number(r.copies),
    }))
  );
  if (groups.rows.length > 20) console.log(`… dan ${groups.rows.length - 20} grup lainnya\n`);

  if (!APPLY) {
    console.log("\nDRY-RUN — tidak ada yang dihapus. Jalankan ulang dengan --apply untuk eksekusi.");
    process.exit(0);
  }

  let deleted = 0;
  let marked = 0;

  for (const g of groups.rows as any[]) {
    const keepRes = await db.execute({
      sql: `SELECT id FROM notifications
            WHERE user_id = ? AND title = ? AND COALESCE(message, '') = ?
              AND ${sqlWibDate('created_at')} = ?
            ORDER BY created_at ASC, id ASC
            LIMIT 1`,
      args: [g.user_id, g.title, g.msg, g.wib_day],
    });
    const keepId = keepRes.rows[0]?.id;
    if (!keepId) continue;

    const del = await db.execute({
      sql: `DELETE FROM notifications
            WHERE user_id = ? AND title = ? AND COALESCE(message, '') = ?
              AND ${sqlWibDate('created_at')} = ?
              AND id <> ?`,
      args: [g.user_id, g.title, g.msg, g.wib_day, keepId],
    });
    deleted += (del as any).rows?.affectedRows ?? Number(g.copies) - 1;

    if (Number(g.any_read) === 1) {
      await db.execute({
        sql: `UPDATE notifications SET is_read = 1 WHERE id = ?`,
        args: [keepId],
      });
      marked++;
    }
  }

  console.log(`\nSelesai. ${deleted} baris duplikat dihapus, ${marked} penyintas ditandai terbaca.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});
