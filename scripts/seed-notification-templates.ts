/**
 * Menyalin template notifikasi bawaan ke tabel `notification_templates` —
 * HANYA yang belum ada di sana.
 *
 * Kenapa bukan `seedNotificationTemplates()` yang sudah ada di
 * lib/notificationService.ts: fungsi itu memakai ON DUPLICATE KEY UPDATE, jadi
 * menjalankannya akan MENIMPA template yang sudah disunting lewat layar admin.
 * Skrip ini hanya mengisi yang kosong, jadi aman dijalankan berulang.
 *
 * Perlu dijalankan karena tabel ini yang dibaca lebih dulu oleh `dispatch`;
 * yang belum ada di sana masih tertolong fallback di memori, tapi tidak muncul
 * di layar kelola template sehingga HR tidak tahu kalimatnya bisa diubah.
 *
 *   npx tsx scripts/seed-notification-templates.ts          # lihat saja
 *   npx tsx scripts/seed-notification-templates.ts --apply  # tulis
 */
import { db } from "../lib/db";
import { FALLBACK_TEMPLATES } from "../lib/notificationService";

async function main() {
  const apply = process.argv.includes("--apply");

  const existingRes = await db.execute("SELECT trigger_key FROM notification_templates");
  const existing = new Set(existingRes.rows.map((r) => String(r.trigger_key)));

  const missing = Object.entries(FALLBACK_TEMPLATES).filter(([key]) => !existing.has(key));

  console.log(`Template di DB   : ${existing.size}`);
  console.log(`Template bawaan  : ${Object.keys(FALLBACK_TEMPLATES).length}`);
  console.log(`Belum ada di DB  : ${missing.length}`);

  if (missing.length === 0) {
    console.log("\nTidak ada yang perlu ditambahkan.");
    process.exit(0);
  }

  for (const [key, t] of missing) {
    console.log(`  ${apply ? "+" : "·"} ${key.padEnd(24)} ${t.titleTemplate}`);
    if (!apply) continue;
    await db.execute({
      sql: `INSERT INTO notification_templates (trigger_key, title_template, message_template, type, category)
            VALUES (?, ?, ?, ?, ?)`,
      args: [key, t.titleTemplate, t.messageTemplate, t.type, t.category],
    });
  }

  console.log(
    apply
      ? `\n${missing.length} template ditambahkan.`
      : `\nUji coba saja. Jalankan ulang dengan --apply untuk menulis.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
