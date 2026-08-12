import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Siapa yang sedang melihat, untuk permintaan yang sedang berjalan.
 *
 * Penyamaran di `lib/anonymize.ts` bekerja di lapisan hasil query — satu pintu
 * untuk seluruh aplikasi, dan itu memang kekuatannya. Tapi lapisan itu tidak
 * tahu apa pun tentang SIAPA yang bertanya, jadi ia menyamarkan semua orang
 * dengan cara yang sama, termasuk orang yang sedang membuka layarnya sendiri.
 *
 * Akibatnya aneh dipakai: kamu membuka halaman depan dan disapa dengan nama
 * orang lain; kamu mencari dirimu di papan peringkat dan tidak menemukannya.
 * Padahal yang perlu dilindungi mode review adalah identitas orang lain — nama
 * dirimu sendiri tidak kamu sembunyikan dari dirimu sendiri.
 *
 * Berkas ini menyimpan id penonton selama satu permintaan, supaya penyamaran
 * bisa mengecualikan nilai milik penonton itu saja.
 *
 * Kenapa `enterWith` dan bukan `run(store, callback)`: `run` mengharuskan
 * seluruh badan handler dibungkus di dalam callback, yang berarti menyunting
 * puluhan route. `enterWith` menetapkan store untuk sisa konteks async saat ini
 * dan seluruh turunannya — dipanggil sekali di `getAuthUserId`, ia menjangkau
 * setiap `db.execute` yang terjadi setelahnya dalam permintaan yang sama.
 *
 * Batasnya jujur: konteks yang hilang berarti tidak ada pengecualian, bukan
 * kebocoran. Arah gagalnya sengaja begitu — kalau id penonton tak diketahui,
 * semua orang tetap tersamarkan.
 */

interface ViewerStore {
  userId: string;
}

const storage = new AsyncLocalStorage<ViewerStore>();

/**
 * Menandai permintaan yang sedang berjalan sebagai milik `userId`.
 *
 * Dipanggil dari `getAuthUserId` — satu-satunya tempat cookie sesi dibaca — jadi
 * setiap route yang mengautentikasi ikut tercakup tanpa perlu diubah.
 */
export function markViewer(userId: string | null | undefined): void {
  if (!userId) return;
  const current = storage.getStore();
  if (current?.userId === String(userId)) return;
  storage.enterWith({ userId: String(userId) });
}

/** Id penonton permintaan ini, atau null di luar konteks permintaan (cron, skrip). */
export function getViewerId(): string | null {
  return storage.getStore()?.userId ?? null;
}

/**
 * Menjalankan `fn` seolah-olah tidak ada penonton.
 *
 * Dipakai jalur yang hasilnya bukan untuk mata penonton itu sendiri — mis.
 * membangun peta penyamaran, atau pekerjaan latar yang kebetulan terpicu di
 * dalam permintaan seseorang.
 */
export function withoutViewer<T>(fn: () => T): T {
  return storage.exit(fn);
}
