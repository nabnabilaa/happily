export function isMidDayWindow(): boolean {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  return currentMins >= (11 * 60 + 30) && currentMins <= (13 * 60 + 30);
}

/**
 * ── Waktu WIB untuk kode yang jalan di server ──────────────────────────────
 *
 * Aturan mainnya:
 *   • Semua kolom DATETIME di MySQL menyimpan UTC.
 *   • Jam dinding yang dipakai bisnis (jam kerja, "hari ini") adalah WIB.
 *
 * Di komponen klien `new Date().getHours()` sudah benar karena browser user
 * memang berjalan di WIB. Di server TIDAK: Vercel menjalankan Node dengan
 * TZ=UTC, jadi `getHours()`, `getDay()`, dan `toISOString().slice(0,10)`
 * meleset 7 jam — antara 00:00–07:00 WIB bahkan meleset satu hari penuh.
 * Untuk kode server, pakai helper di bawah ini, jangan metode lokal Date.
 */
export const WIB_OFFSET_MINUTES = 7 * 60;
export const WIB_OFFSET_MS = WIB_OFFSET_MINUTES * 60 * 1000;

/**
 * Date yang komponen UTC-nya sama dengan jam dinding WIB. Hanya untuk dibaca
 * lewat getUTC*() di helper ini — jangan disimpan atau dikirim ke mana-mana.
 */
function wibShifted(at: Date = new Date()): Date {
  return new Date(at.getTime() + WIB_OFFSET_MS);
}

/** Tanggal kalender WIB, format YYYY-MM-DD. */
export function wibDateString(at: Date = new Date()): string {
  return wibShifted(at).toISOString().slice(0, 10);
}

/** Jam WIB (0–23). */
export function wibHour(at: Date = new Date()): number {
  return wibShifted(at).getUTCHours();
}

/** Menit sejak tengah malam WIB (0–1439). */
export function wibMinutesOfDay(at: Date = new Date()): number {
  const d = wibShifted(at);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Hari dalam minggu menurut WIB — 0 = Minggu, 5 = Jumat, 6 = Sabtu. */
export function wibDayOfWeek(at: Date = new Date()): number {
  return wibShifted(at).getUTCDay();
}

/** True kalau tanggal WIB-nya Sabtu atau Minggu. */
export function isWibWeekend(at: Date = new Date()): boolean {
  const d = wibDayOfWeek(at);
  return d === 0 || d === 6;
}

/**
 * Ekspresi SQL: kolom DATETIME (UTC) dibaca sebagai tanggal kalender WIB.
 * Pakai ini menggantikan `DATE(kolom)` setiap kali maksudnya "hari WIB".
 */
export function sqlWibDate(column: string): string {
  return `DATE(CONVERT_TZ(${column}, '+00:00', '+07:00'))`;
}

/**
 * Ekspresi SQL: tanggal kalender WIB hari ini.
 * Pakai ini menggantikan `CURDATE()`, yang di MySQL ini menghasilkan tanggal
 * UTC dan karenanya salah hari sepanjang 00:00–07:00 WIB.
 */
export const SQL_WIB_TODAY = `DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))`;

/**
 * Ekspresi SQL: saat ini sebagai jam dinding WIB.
 *
 * Untuk dibandingkan dengan kolom yang menyimpan jam dinding WIB, bukan UTC —
 * `calendar_events.start_time` satu-satunya sejauh ini, karena ditulis langsung
 * dari input form ("2026-07-29 09:00:00" berarti jam 9 pagi WIB).
 *
 * Membandingkannya dengan `NOW()` atau `UTC_TIMESTAMP()` meleset tujuh jam:
 * agenda yang sudah lewat masih dianggap akan datang, dan ujung rentang
 * "7 hari ke depan" terpotong. Salah diam-diam — hasilnya tetap berupa daftar
 * yang tampak wajar.
 */
export const SQL_WIB_NOW = `CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')`;
