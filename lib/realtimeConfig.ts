/**
 * Satu-satunya tempat cluster Pusher ditentukan.
 *
 * Sebelumnya nilai default tersebar di enam berkas dengan dua nilai berbeda:
 * lobby dan sesi multiplayer memakai `mt1`, sementara halaman sinkronisasi HP
 * dan listener sesi solo memakai `ap1`. Kalau variabel environment tidak diisi,
 * desktop dan HP terhubung ke region yang berbeda dan tidak akan pernah saling
 * melihat — kegagalan yang sangat sulit didiagnosis karena tidak ada error apa
 * pun yang muncul; pesan hanya tidak sampai.
 */
export const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1';

export const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || '';

/** Kunci contoh dari berkas .env template tidak boleh dianggap konfigurasi sah. */
export function isPusherConfigured(): boolean {
  return Boolean(PUSHER_KEY) && !PUSHER_KEY.includes('MASUKKAN');
}
