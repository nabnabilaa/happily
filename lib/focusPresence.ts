"use client";

/**
 * Perisai fokus sisi klien.
 *
 * Ada dua jalur notifikasi di aplikasi ini, dan keduanya harus ditahan secara
 * terpisah karena berangkat dari tempat yang berbeda:
 *
 *   • PUSH dari server (lib/pushService.ts) — ditahan di server, lewat
 *     `isFocusProtected()`. Server tahu keadaan ruangan dari tabelnya sendiri.
 *
 *   • `new Notification(...)` dan toast yang ditembakkan LANGSUNG dari browser
 *     saat pesan realtime masuk (lib/HPContext.tsx). Ini tidak pernah melewati
 *     server, jadi penjaga di server tidak bisa melihatnya sama sekali. Itulah
 *     yang ditahan modul ini.
 *
 * Perisainya kedaluwarsa sendiri, dan itu bagian dari rancangannya. Kalau
 * pemegang sesi ter-unmount, tabnya di-bekukan, atau komponennya crash, perisai
 * yang tidak punya masa berlaku akan membungkam notifikasi user tanpa batas —
 * dan kegagalan berbentuk KETIADAAN tidak akan pernah dilaporkan siapa pun.
 * Lebih baik bocor satu notifikasi daripada diam selamanya.
 */

/** Sedikit lebih panjang dari dua siklus detak (20 dtk) dan satu discover (30 dtk). */
const SHIELD_TTL_MS = 70_000;

let shieldUntilMs = 0;

/**
 * Dipanggil setiap kali keadaan ruangan diperbarui, oleh siapa pun yang sedang
 * memegangnya — `useFocusSession` saat layar fokus terbuka, `FocusSessionKeeper`
 * saat layarnya ditutup.
 *
 * `active` harus berarti "sedang benar-benar fokus", bukan "punya ruangan":
 * ruang tunggu belum menghitung apa pun, dan orang yang sedang menjauh sudah
 * terlanjur terganggu.
 */
export function setFocusShield(active: boolean): void {
  shieldUntilMs = active ? Date.now() + SHIELD_TTL_MS : 0;

  // Extension FlowBuddy mendengarkan ini lewat content script-nya
  // (flowbuddy/js/sync.js) dan meneruskannya ke service worker, yang memakainya
  // untuk memblokir situs distraksi dan menahan notifikasinya sendiri.
  //
  // Dikirim setiap kali, bukan hanya saat keadaannya berubah: sinyal inilah
  // yang memperpanjang masa berlaku di sisi extension. Berhenti mengirim adalah
  // cara sesi fokus berakhir kalau tabnya ditutup paksa.
  if (typeof window !== "undefined") {
    try {
      window.postMessage({ type: "FLOWBEE_FOCUS_STATE", active }, window.location.origin);
    } catch {
      /* extension tidak terpasang, atau postMessage ditolak. Bukan alasan gagal. */
    }
  }
}

/** True selama perisainya masih berlaku. */
export function focusShieldUp(): boolean {
  return Date.now() < shieldUntilMs;
}
