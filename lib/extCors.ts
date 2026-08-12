/**
 * CORS untuk endpoint yang dipanggil ekstensi FlowBuddy.
 *
 * ── Kenapa yang lama berbahaya ──────────────────────────────────────────────
 *
 * Empat route memakai pola ini:
 *
 *     "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
 *     "Access-Control-Allow-Credentials": "true",
 *
 * Memantulkan origin pemanggil sambil mengizinkan credentials sama saja dengan
 * mengizinkan SEMUA origin membawa cookie. Situs mana pun yang dibuka korban
 * bisa memanggil `/api/ext/sync` dari latar, cookie sesinya ikut terkirim, dan
 * balasannya bisa dibaca situs itu — task, catatan, daftar rekan kerja, sampai
 * agregat HR. Spesifikasi CORS sebenarnya melarang `*` bersama credentials
 * justru untuk mencegah ini; memantulkan origin adalah cara memutar larangan
 * itu tanpa mendapatkan keamanannya.
 *
 * ── Kenapa pemisahannya seperti di bawah ────────────────────────────────────
 *
 * Ekstensi mengambil data lewat service worker (`flowbuddy/background.js:347`)
 * dan fetch di sana TIDAK menyertakan `credentials` — itu sebabnya
 * `PUT /api/manager/tasks/pending` sampai sekarang masih menerima `managerId`
 * dari body. Jadi ekstensi tidak pernah butuh `Allow-Credentials`.
 *
 * Maka izinnya dipecah:
 *   • origin aplikasi  → boleh, DENGAN credentials (dipakai halaman web-nya)
 *   • chrome-extension → boleh, TANPA credentials (cukup untuk ekstensi)
 *   • selain itu       → tidak ada header CORS sama sekali; browser menolaknya
 *
 * Permintaan tanpa header `Origin` (server-ke-server, curl, service worker yang
 * tidak mengirimnya) dibiarkan lewat: CORS adalah penjaga di sisi browser, dan
 * permintaan tanpa origin bukan permintaan lintas-situs yang perlu dijaga di
 * sini. Yang menjaganya adalah cookie sesi.
 */

/** Origin aplikasi yang sah. Cocok dengan `content_scripts.matches` di manifest ekstensi. */
const DEFAULT_APP_ORIGINS = [
  "https://flowbuddy.maxy.academy",
  "https://happily-flowbuddy.vercel.app",
];

function appOrigins(): string[] {
  // `EXT_ALLOWED_ORIGINS` untuk domain preview/staging tanpa perlu ubah kode.
  const extra = (process.env.EXT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const vercel = process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [];

  return [...DEFAULT_APP_ORIGINS, ...vercel, ...extra];
}

/** localhost dengan port berapa pun, hanya di luar produksi. */
function isDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");

  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    // Origin ikut menentukan isi balasan, jadi cache bersama tidak boleh
    // menyajikan balasan satu origin kepada origin lain.
    Vary: "Origin",
  };

  // Bukan permintaan lintas-asal dari browser — tidak ada yang perlu dinegosiasikan.
  if (!origin) return base;

  if (appOrigins().includes(origin) || isDevOrigin(origin)) {
    return {
      ...base,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };
  }

  if (origin.startsWith("chrome-extension://")) {
    // Tanpa `Allow-Credentials`: ekstensi tidak mengirim cookie, jadi memberinya
    // izin itu hanya memperluas serangan tanpa menambah kemampuan apa pun.
    return { ...base, "Access-Control-Allow-Origin": origin };
  }

  // Origin asing: sengaja tidak ada `Allow-Origin`. Browser yang menolaknya.
  return base;
}
