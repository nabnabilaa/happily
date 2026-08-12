/**
 * Penjaga bersama untuk seluruh endpoint /api/cron/*.
 *
 * Ada dua cara sah memanggilnya, dan sebelumnya kebanyakan route hanya
 * mengenali yang pertama:
 *
 *  1. `?secret=<CRON_SECRET>` — dipakai pemanggil manual dan cron eksternal.
 *  2. Header `Authorization: Bearer <CRON_SECRET>` — INI yang dikirim Vercel
 *     Cron. Route yang cuma memeriksa query string akan menolak jadwal
 *     Vercel-nya sendiri dengan 401, dan karena tidak ada yang membaca log
 *     cron, kegagalannya tidak pernah terlihat: pekerjaannya sekadar tidak
 *     pernah terjadi.
 *
 * Kalau `CRON_SECRET` tidak diset, endpoint dibiarkan terbuka — perilaku lama
 * yang dipertahankan supaya pengembangan lokal tidak perlu menyiapkan apa pun.
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;

  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}
