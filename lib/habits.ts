/**
 * Aturan pencocokan nama habit.
 *
 * HARUS sama persis dengan yang dipakai sinkronisasi di
 * `app/api/storage/route.ts` — di sana nama di-`trim().toLowerCase()` untuk
 * dedupe dan untuk memutuskan baris mana yang di-UPDATE. Kalau route lain
 * memakai aturan yang sedikit berbeda, "Lari Pagi" dan "lari pagi " akan
 * dianggap dua habit oleh yang satu dan satu habit oleh yang lain, dan
 * penghapusan akan meleset ke baris yang salah.
 */
export function normalizeHabitName(name: unknown): string {
  return String(name ?? "").trim().toLowerCase();
}
