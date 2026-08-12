/**
 * Mengirim ulang pemberitahuan untuk penukaran reward yang masih menggantung.
 *
 * Selama kunci template `hr_alert` tidak ada, `dispatchNotification` membatalkan
 * pengiriman tanpa menyisakan apa pun — koin karyawan terpotong, barisnya masuk
 * antrean, dan tidak seorang pun di HR diberi tahu. Skrip ini menutup lubang
 * yang sudah terjadi; yang baru sudah tertangani sejak templatenya ada.
 *
 * Hanya menyentuh baris berstatus `pending_*`, dan melewati penerima yang sudah
 * punya pemberitahuan dengan judul + isi yang sama (jadi aman diulang).
 *
 *   npx tsx scripts/notify-pending-redemptions.ts          # lihat saja
 *   npx tsx scripts/notify-pending-redemptions.ts --apply  # kirim
 */
import { db } from "../lib/db";
import { dispatchNotification } from "../lib/notificationService";

async function alreadyNotified(userId: string, title: string, message: string) {
  const res = await db.execute({
    sql: "SELECT id FROM notifications WHERE user_id = ? AND title = ? AND (message <=> ?) LIMIT 1",
    args: [userId, title, message],
  });
  return res.rows.length > 0;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const pending = await db.execute(`
    SELECT r.id, r.status, r.points_spent, r.created_at,
           u.id AS user_id, u.name AS user_name, u.manager_id, u.department,
           rew.title AS reward_title
      FROM reward_redemptions r
      JOIN users u   ON r.user_id = u.id
      JOIN rewards rew ON r.reward_id = rew.id
     WHERE r.status LIKE 'pending%'
     ORDER BY r.created_at ASC
  `);

  const hrRes = await db.execute("SELECT id, name FROM users WHERE role = 'hr' OR hr_access = 1");

  console.log(`Penukaran menggantung : ${pending.rows.length}`);
  console.log(`Penerima HR           : ${hrRes.rows.length}`);

  let sent = 0;
  let skipped = 0;

  for (const r of pending.rows as any[]) {
    const title = "🎁 Permintaan Reward Menunggu";
    const message =
      `${r.user_name} menukar ${r.points_spent} poin untuk "${r.reward_title}" ` +
      `pada ${new Date(r.created_at).toLocaleString("id-ID")}. Status: ${r.status}. Mohon diproses.`;

    console.log(`\n· ${r.id.slice(0, 8)}  ${r.user_name} — ${r.reward_title} (${r.points_spent} poin, ${r.status})`);

    // `pending_manager` adalah urusan manajer orang itu; `pending_hr` urusan HR.
    const targets =
      r.status === "pending_manager" && r.manager_id
        ? [{ id: String(r.manager_id), name: "manajer" }]
        : (hrRes.rows as any[]).map((h) => ({ id: String(h.id), name: String(h.name) }));

    for (const t of targets) {
      if (await alreadyNotified(t.id, title, message)) {
        console.log(`    ↷ ${t.name} sudah punya pemberitahuan ini`);
        skipped++;
        continue;
      }
      console.log(`    ${apply ? "→" : "·"} ${t.name} (${t.id})`);
      if (!apply) continue;
      await dispatchNotification(t.id, "hr_alert", { title, message }, { dedupeWindowMinutes: 0 });
      sent++;
    }
  }

  console.log(
    apply
      ? `\nTerkirim: ${sent}, dilewati: ${skipped}.`
      : `\nUji coba saja — belum ada yang dikirim. Jalankan ulang dengan --apply.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
