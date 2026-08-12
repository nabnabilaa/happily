/**
 * Penyamaran identitas untuk sesi demo/review.
 *
 * Satu database dipakai bersama: karyawan Maxy yang memakai aplikasi ini setiap
 * hari, plus puluhan orang yang pernah mendaftar untuk mencoba. Ketika aplikasi
 * ditinjau perusahaan lain, tidak ada satu pun dari mereka yang boleh terlihat —
 * bukan hanya namanya di leaderboard, tapi juga emailnya, foto wajahnya, dan
 * namanya yang sudah ikut tertulis di dalam teks notifikasi.
 *
 * Kenapa di lapisan hasil query, bukan di tiap route: nama user muncul di ~60
 * route dengan belasan alias berbeda (`user_name`, `sender_name`,
 * `assignee_name`, `author_name`, `host_name`, `role` yang sebetulnya berisi
 * `job_title`, ...). Menambal per-route berarti satu route yang terlewat = satu
 * kebocoran, dan setiap route baru harus ingat menambal dirinya sendiri.
 * `db.execute` di lib/db.ts adalah satu-satunya pintu semua query — menyaring di
 * situ membuat route yang belum ada pun otomatis ikut tersaring.
 *
 * Penyamaran dilakukan berdasarkan NILAI, bukan nama kolom. Daftar nama/email/
 * departemen asli dibaca dari tabel `users`, lalu nilai apa pun yang cocok
 * diganti kembarannya yang palsu — jadi alias kolom sebanyak apa pun tidak perlu
 * didaftarkan. Data di database TIDAK pernah diubah: mematikan flag ini
 * memulihkan tampilan asli seketika.
 *
 * Menyalakan: tombol "Mode review" di halaman `/studio` — alat pemilik aplikasi
 * yang tidak ditautkan dari mana pun dan hanya terbuka untuk akun yang terdaftar
 * di `REVIEW_MODE_OWNERS` (lihat lib/ownerAccess.ts). Sengaja BUKAN di konsol
 * HR: perusahaan yang memakai aplikasi ini tidak berkepentingan menyamarkan
 * karyawannya sendiri, dan tombolnya tidak boleh ikut terlihat di layar saat
 * aplikasi sedang didemokan. Statusnya tersimpan di tabel `app_settings`, jadi
 * berlaku untuk seluruh instance server tanpa perlu redeploy. Lihat
 * `reviewModeActive` di bawah untuk hubungannya dengan env `ANONYMIZE_DATA`.
 *
 * Periksa hasilnya sebelum sesi review dimulai:
 *   npx tsx scripts/anonymize-preview.ts   → lihat siapa jadi siapa
 *   npx tsx scripts/anonymize-verify.ts    → uji kebocoran di query nyata
 */

type RawExec = (sql: string, args?: unknown[]) => Promise<Record<string, unknown>[]>;

/** Nama depan & belakang dummy. Dikombinasikan jadi 40 × 20 = 800 nama unik. */
const FIRST_NAMES = [
  "Andi", "Budi", "Citra", "Dewi", "Eka", "Fajar", "Gita", "Hendra",
  "Indah", "Joko", "Kartika", "Lukman", "Mira", "Naufal", "Okta", "Putri",
  "Rangga", "Sari", "Tegar", "Umi", "Vina", "Wahyu", "Yoga", "Zahra",
  "Aditya", "Bagas", "Cahya", "Dimas", "Elang", "Farah", "Galih", "Hana",
  "Ilham", "Jasmin", "Kevin", "Laras", "Maulana", "Nadia", "Oskar", "Prita",
];

const LAST_NAMES = [
  "Pratama", "Wijaya", "Santoso", "Nugroho", "Saputra", "Halim", "Kusuma",
  "Maulida", "Permana", "Rahayu", "Setiawan", "Utami", "Wibowo", "Yulianti",
  "Anggraini", "Firmansyah", "Handoko", "Puspita", "Mahendra", "Suryani",
];

/**
 * Departemen dipetakan satu-ke-satu, bukan lewat hash acak: filter "per
 * departemen" di konsol HR/manager mengirim balik nilai yang tampil sebagai
 * parameter query, jadi dua departemen asli yang tertimpa jadi satu nama palsu
 * akan menggabungkan dua tim yang berbeda di layar.
 */
const DEPARTMENT_POOL = [
  "Divisi Pemasaran", "Divisi Produk", "Divisi Teknologi", "Divisi Operasional",
  "Divisi SDM", "Divisi Keuangan", "Divisi Desain", "Divisi Penjualan",
  "Divisi Layanan", "Divisi Riset", "Divisi Legal", "Divisi Logistik",
];

const JOB_TITLE_POOL = [
  "Staf Junior", "Staf", "Staf Senior", "Spesialis", "Analis", "Koordinator",
  "Supervisor", "Lead Tim", "Manajer", "Asisten Manajer", "Spesialis Senior",
  "Analis Senior", "Kepala Bagian", "Konsultan Internal",
];

const DUMMY_EMAIL_DOMAIN = "demo.flowbee";

/**
 * Departemen/jabatan sependek "HR" dan "IT" tidak disapu di dalam nilai
 * terstruktur — dua huruf akan mencacah kata lain. Sebagai nilai kolom utuh
 * keduanya tetap tersamarkan.
 */
const MIN_LEN_FOR_ORG_SWEEP = 5;

/**
 * Nama yang secara kebetulan juga kata umum di aplikasi ini. Tetap disamarkan
 * sebagai nilai kolom nama, tapi TIDAK disapu di dalam kalimat.
 *
 * "Maxy" adalah nama perusahaannya sendiri: menyapunya akan mengubah "MAXY AI
 * HUB", "Maxy Academy", dan judul laporan di mana-mana. "HR"/"IT" adalah nama
 * departemen yang juga dipakai sebagai kata biasa.
 *
 * Tambahkan di sini kalau ada nama akun yang bertabrakan dengan kata umum dan
 * membuat teks terbaca aneh setelah disamarkan.
 */
const SHORT_NAME_KEEP_IN_TEXT = new Set(["Maxy", "maxy", "HP", "HR", "IT", "DM"]);

/** Panjang minimum agar sebuah nama pendek ikut disapu di dalam kalimat. */
const MIN_LEN_FOR_SHORT_SWEEP = 3;

/**
 * Panggilan tambahan yang perlu disapu tapi bukan nilai `users.name` mana pun.
 *
 * Orang menyapa rekannya dengan nama depan saja: satu pesan chat berbunyi "hi
 * luvena", sementara di database namanya "Luvena Cornelia". Nama utuh tidak
 * pernah cocok, jadi panggilan itu lolos.
 *
 * Kenapa daftar manual dan bukan memecah semua nama jadi kata: tabel `users` di
 * sini juga memuat akun uji dan nama perusahaan — "Test Register User", "Mock
 * Employee", "Ciputra Group – Human Ca", "Wilbert's Blog". Menyapu setiap kata
 * dari nama-nama itu berarti menyapu "User", "Group", "Employee", dan "Blog" di
 * seluruh aplikasi.
 *
 * Setiap istilah dipetakan otomatis ke nama palsu milik akun yang namanya memuat
 * istilah itu. Tambahkan panggilan lain di sini kalau muncul di data.
 */
const EXTRA_SWEEP_TERMS = ["Luvena", "Radiffan", "Melsyana", "Syabina", "Yanuarin"];

/** Umur cache peta. Pendaftar baru ikut tersamarkan tanpa perlu restart. */
const MAP_TTL_MS = 5 * 60 * 1000;

/**
 * Lampiran milik karyawan asli — surat sakit di `user_status.attachment_url`,
 * bukti pengerjaan task, bukti klaim reward. Isinya dokumen dan tangkapan layar
 * orang sungguhan, jadi ikut ditutup.
 *
 * Konsekuensinya jujur: fitur "lihat bukti" jadi kosong selama sesi review. Set
 * `false` kalau fitur lampiran justru bagian yang ingin diperlihatkan — tapi
 * sadari bahwa yang terbuka adalah berkas milik karyawan asli.
 */
const HIDE_ATTACHMENTS = true;

const KEY_NAME = /(^|_)name$|nama/i;
const KEY_EMAIL = /e_?mail/i;
const KEY_AVATAR = /avatar|picture|photo|foto/i;
const KEY_AVATAR_KEEP = /config|json|url_expires/i;

/** Alamat email di mana pun — di kolom email, di dalam kalimat, di dalam JSON. */
const EMAIL_IN_TEXT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Kolom yang isinya pilihan terstruktur, bukan kalimat bebas: jawaban
 * onboarding ("Kamu di divisi apa?" → "Engineering"), metadata JSON, payload
 * event. Di sini departemen dan jabatan asli ikut disapu.
 *
 * Kenapa hanya di sini dan tidak di semua kolom teks: menyapu "Product" atau
 * "Design" di dalam kalimat bebas akan mengubah judul task "Product roadmap"
 * jadi "Divisi Keuangan roadmap". Kolom pilihan tidak punya risiko itu karena
 * nilainya selalu satu opsi utuh.
 */
const KEY_OPTION = /onboarding|answer|jawaban|metadata|payload|division|divisi/i;

/**
 * Kredensial tidak pernah dikirim ke luar selama mode review.
 *
 * `/api/hr/users` memakai `SELECT *`, jadi hash bcrypt milik karyawan asli ikut
 * terkirim ke siapa pun yang memegang akses HR — termasuk peninjau. Tidak ada UI
 * yang membacanya, jadi mengosongkannya tidak mengubah apa pun di layar. Ini
 * tambalan mode review, BUKAN perbaikan akar masalahnya: route itu memang
 * sebaiknya berhenti mengirim kolom yang tidak dipakai.
 */
const KEY_SECRET = /password|secret|token|api_?key|credential/i;

const KEY_ATTACHMENT = /attachment|proof|receipt|document|file_url|upload/i;

/**
 * Batas yang perlu diketahui siapa pun yang mengubah berkas ini.
 *
 * Aturan penyamaran di sini ada dua jenis, dan keandalannya berbeda:
 *
 *  1. Berdasarkan NILAI — nama, email, departemen, jabatan, foto. Ini kebal
 *     terhadap nama kolom: route boleh menamai kolomnya `pesan`, `sender_name`,
 *     atau `x`, hasilnya tetap tersamarkan.
 *
 *  2. Berdasarkan NAMA KOLOM — kredensial (KEY_SECRET) dan lampiran
 *     (KEY_ATTACHMENT). Keduanya tidak bisa dikenali dari nilainya: token OAuth
 *     hanyalah string panjang, dan URL lampiran tidak berbeda bentuk dari URL
 *     lain. Konsekuensinya jujur: route yang mengalias `refresh_token` menjadi
 *     `rt` akan melewati penyaringan ini.
 *
 * Versi pertama berkas ini menyapu nama HANYA di kolom yang namanya cocok dengan
 * daftar bahasa Inggris (`title`, `message`, `content`). Kolom yang dialias ke
 * bahasa Indonesia — `pesan`, `judul` — lolos utuh, dan uji kebocorannya ikut
 * lolos karena uji itu memakai alias yang sama dengan route hari ini. Karena itu
 * jenis (1) sekarang tidak lagi melihat nama kolom sama sekali.
 */

export interface MaskMap {
  /** Nilai persis → dummy. Berlaku di kolom apa pun. */
  exact: Map<string, string>;
  /** Nama pendek → dummy. Hanya berlaku di kolom yang namanya kolom nama. */
  shortNames: Map<string, string>;
  /** Pola gabungan semua nama, untuk sapuan di dalam kalimat. Tidak peka
   *  huruf besar-kecil — orang menulis nama rekannya dengan huruf kecil. */
  textPattern: RegExp | null;
  /** nama huruf-kecil → dummy. Pasangan `textPattern` saat mengganti. */
  sweepLookup: Map<string, string>;
  /** Pola departemen & jabatan, hanya untuk kolom pilihan (lihat KEY_OPTION). */
  optionPattern: RegExp | null;
  /** URL foto profil asli. Dikenali dari nilainya, bukan dari nama kolomnya. */
  avatars: Set<string>;
  /** Dummy → nilai asli. Dipakai membalik parameter query. */
  reverse: Map<string, string>;
  builtAt: number;
  userCount: number;
}

let cached: MaskMap | null = null;
let building: Promise<MaskMap> | null = null;

/* ── Saklar mode review ────────────────────────────────────────────────────
 *
 * Ada dua cara menyalakannya, dan keduanya sengaja tidak setara:
 *
 *  • Tombol di `/studio` → tersimpan di `app_settings`. Ini saklar sehari-hari:
 *    berlaku ke semua instance tanpa redeploy, dan bisa dimatikan lagi. Hanya
 *    akun di `REVIEW_MODE_OWNERS` yang bisa membukanya.
 *
 *  • Env `ANONYMIZE_DATA=1` → MENGUNCI mode review menyala, dan tombolnya
 *    dinonaktifkan. Ini lapisan kedua di atas daftar pemilik: kalau perangkat
 *    pemiliknya sendiri yang sedang dipegang orang lain saat sesi berlangsung,
 *    saklarnya tetap tidak bisa dimatikan dari dalam aplikasi. Env hanya bisa
 *    diubah lewat dashboard hosting.
 *
 * Jadi: pakai tombol untuk latihan dan pemeriksaan sendiri; pasang env sebelum
 * sesi yang sebenarnya. Nilai selain yang truthy (kosong, `0`, tidak diset)
 * berarti "tidak mengunci" — bukan "paksa mati".
 */

const SETTING_KEY = "anonymize_data";

/** Umur cache status saklar. Menentukan jeda maksimum sebuah instance server
 *  lain menyadari tombol baru saja ditekan. Sengaja pendek: yang dipertaruhkan
 *  saat penyalaan terlambat adalah nama asli yang masih tersaji. */
const STATE_TTL_MS = 10 * 1000;

/** Setelah tabelnya diketahui belum ada, berhenti menanyainya tiap 10 detik. */
const NO_TABLE_TTL_MS = 5 * 60 * 1000;

let stateCache: { value: boolean; readAt: number; ttl: number } | null = null;
let warnedNoTable = false;

function truthy(raw: string): boolean {
  const value = raw.trim().toLowerCase();
  return value === "1" || value === "true" || value === "on" || value === "yes";
}

/** True jika env mengunci mode review menyala (tombol HR jadi read-only). */
export function reviewModeLockedByEnv(): boolean {
  return truthy(process.env.ANONYMIZE_DATA || "");
}

export const REVIEW_MODE_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS app_settings (
    setting_key   VARCHAR(64)  NOT NULL PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_by    VARCHAR(64)  NULL,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`;

/**
 * Status mode review saat ini. Dipanggil di depan SETIAP query, jadi hasilnya
 * di-cache; yang benar-benar menyentuh database hanya sekali per 10 detik.
 *
 * Bacaannya memakai `rawExec` (tanpa penyamaran) bukan `db.execute`, karena
 * `db.execute` justru pemanggil fungsi ini — lewat sana berarti memanggil diri
 * sendiri tanpa henti.
 */
export async function reviewModeActive(rawExec: RawExec): Promise<boolean> {
  if (reviewModeLockedByEnv()) return true;

  const now = Date.now();
  if (stateCache && now - stateCache.readAt < stateCache.ttl) return stateCache.value;

  try {
    const rows = await rawExec(
      "SELECT setting_value FROM app_settings WHERE setting_key = ?",
      [SETTING_KEY],
    );
    const value = rows.length ? truthy(String(rows[0].setting_value ?? "")) : false;
    stateCache = { value, readAt: now, ttl: STATE_TTL_MS };
    return value;
  } catch (error) {
    // Tabelnya belum pernah dibuat: tombol belum pernah dipakai, jadi "mati"
    // memang jawaban yang benar. Diberitahukan sekali supaya tidak terbaca
    // sebagai kerusakan.
    if ((error as { code?: string })?.code === "ER_NO_SUCH_TABLE") {
      if (!warnedNoTable) {
        warnedNoTable = true;
        console.warn(
          "[anonymize] Tabel app_settings belum ada — mode review dianggap mati. " +
            "Tabelnya dibuat otomatis saat tombol di /studio pertama kali ditekan.",
        );
      }
      stateCache = { value: false, readAt: now, ttl: NO_TABLE_TTL_MS };
      return false;
    }

    // Gangguan lain: pertahankan status terakhir yang diketahui, jangan
    // diam-diam turun ke "mati". Kalau belum pernah tahu sama sekali, "mati"
    // adalah satu-satunya jawaban yang tersisa — tapi dalam keadaan itu query
    // datanya sendiri juga sedang gagal, jadi tidak ada yang tersaji.
    console.warn(
      "[anonymize] Gagal membaca status mode review: " +
        (error instanceof Error ? error.message : String(error)),
    );
    if (stateCache) {
      stateCache = { ...stateCache, readAt: now, ttl: STATE_TTL_MS };
      return stateCache.value;
    }
    return false;
  }
}

/**
 * Membuang cache status di proses ini.
 *
 * Dipanggil route yang menulis saklarnya, supaya orang yang menekan tombol
 * melihat efeknya seketika. Instance server lain tetap menunggu TTL — tidak ada
 * jalur antar-instance di sini, dan menambahkannya (Pusher, revalidate) berarti
 * satu lagi hal yang bisa gagal diam-diam. 10 detik cukup pendek.
 */
export function invalidateReviewModeCache(): void {
  stateCache = null;
}

/** FNV-1a 32-bit. Dipakai supaya nama palsu untuk orang yang sama selalu sama,
 *  di semua instance dan setelah restart, tanpa perlu menyimpan state. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function dummyNameFor(userId: string, attempt: number): string {
  const h = hash32(`${userId}#${attempt}`);
  const first = FIRST_NAMES[h % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(h / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
}

function slugify(name: string): string {
  // Hanya menerima nama dari pool di atas, jadi cukup ASCII.
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pola "salah satu dari nilai ini, sebagai kata utuh". Pemanggil mengurutkan
 *  dari yang terpanjang supaya "Andi Pratama" tidak cocok sebagian di "Andi". */
function buildSweepPattern(values: string[]): RegExp | null {
  if (!values.length) return null;
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(${values.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
}

function pickFromPool(value: string, pool: string[], taken: Set<string>): string {
  // Coba slot hasil hash lebih dulu supaya pemetaan stabil, lalu geser ke slot
  // berikutnya yang masih kosong agar pemetaan tetap satu-ke-satu.
  const start = hash32(value) % pool.length;
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(start + i) % pool.length];
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
  // Pool habis: beri nomor supaya tetap unik.
  const fallback = `${pool[start]} ${taken.size + 1}`;
  taken.add(fallback);
  return fallback;
}

async function buildMap(rawExec: RawExec): Promise<MaskMap> {
  const exact = new Map<string, string>();
  const shortNames = new Map<string, string>();
  const reverse = new Map<string, string>();
  const longNames: string[] = [];

  const users = await rawExec(
    "SELECT id, name, email, department, job_title, avatar_image FROM users",
  );

  const avatars = new Set<string>();
  for (const user of users) {
    if (typeof user.avatar_image === "string" && user.avatar_image.trim().length > 8) {
      avatars.add(user.avatar_image.trim());
    }
  }

  const usedNames = new Set<string>();
  const usedEmails = new Set<string>();

  // Urutan stabil supaya penyelesaian tabrakan nama tidak berubah tiap proses.
  const sorted = [...users].sort((a, b) =>
    String(a.id).localeCompare(String(b.id)),
  );

  for (const user of sorted) {
    const id = String(user.id ?? "");
    if (!id) continue;

    let dummyName = dummyNameFor(id, 0);
    for (let attempt = 1; usedNames.has(dummyName) && attempt < 12; attempt++) {
      dummyName = dummyNameFor(id, attempt);
    }
    usedNames.add(dummyName);

    let dummyEmail = `${slugify(dummyName)}@${DUMMY_EMAIL_DOMAIN}`;
    if (usedEmails.has(dummyEmail)) {
      dummyEmail = `${slugify(dummyName)}.${hash32(id) % 1000}@${DUMMY_EMAIL_DOMAIN}`;
    }
    usedEmails.add(dummyEmail);

    const realName = typeof user.name === "string" ? user.name.trim() : "";
    if (realName) {
      // Tiga tingkat, sesuai risiko masing-masing panjang nama:
      //  • ≥3 karakter → `exact`, dicocokkan sebagai nilai utuh di kolom apa pun
      //  • <3 karakter → `shortNames`, hanya di kolom nama; "HP" sebagai nilai
      //    utuh terlalu sering muncul sebagai hal lain untuk diganti di mana-mana
      //  • `longNames`  → yang juga disapu di dalam kalimat
      if (realName.length >= MIN_LEN_FOR_SHORT_SWEEP) {
        exact.set(realName, dummyName);
        if (!SHORT_NAME_KEEP_IN_TEXT.has(realName)) longNames.push(realName);
      } else {
        shortNames.set(realName, dummyName);
      }
      if (!reverse.has(dummyName)) reverse.set(dummyName, realName);
    }

    const realEmail = typeof user.email === "string" ? user.email.trim() : "";
    if (realEmail) {
      exact.set(realEmail, dummyEmail);
      if (!reverse.has(dummyEmail)) reverse.set(dummyEmail, realEmail);
    }
  }

  // Departemen dan jabatan dikumpulkan dari semua tempat yang menyimpannya,
  // supaya daftar filter di konsol HR dan nilai di kartu karyawan menyebut
  // departemen palsu yang sama.
  const deptValues = new Set<string>();
  const jobValues = new Set<string>();
  for (const user of users) {
    if (typeof user.department === "string" && user.department.trim())
      deptValues.add(user.department.trim());
    if (typeof user.job_title === "string" && user.job_title.trim())
      jobValues.add(user.job_title.trim());
  }

  for (const [sql, column, bucket] of [
    ["SELECT name FROM departments", "name", deptValues],
    ["SELECT DISTINCT department FROM teams", "department", deptValues],
  ] as const) {
    try {
      const rows = await rawExec(sql);
      for (const row of rows) {
        const value = row[column];
        if (typeof value === "string" && value.trim()) bucket.add(value.trim());
      }
    } catch {
      // Tabel opsional — kalau belum ada, daftar dari `users` sudah cukup.
    }
  }

  const takenDepts = new Set<string>();
  for (const dept of [...deptValues].sort()) {
    const dummy = pickFromPool(dept, DEPARTMENT_POOL, takenDepts);
    exact.set(dept, dummy);
    if (!reverse.has(dummy)) reverse.set(dummy, dept);
  }

  const takenJobs = new Set<string>();
  for (const job of [...jobValues].sort()) {
    const dummy = pickFromPool(job, JOB_TITLE_POOL, takenJobs);
    exact.set(job, dummy);
    if (!reverse.has(dummy)) reverse.set(dummy, job);
  }

  // Panggilan tambahan mewarisi nama palsu pemiliknya, jadi "hi luvena" dan
  // "Luvena Cornelia" menunjuk ke orang yang sama di mata peninjau.
  for (const term of EXTRA_SWEEP_TERMS) {
    const lower = term.toLowerCase();
    const owner = [...exact.keys()].find(
      (real) => !real.includes("@") && real.toLowerCase().includes(lower),
    );
    const dummy = owner ? exact.get(owner) : undefined;
    if (dummy && !exact.has(term)) {
      exact.set(term, dummy);
      longNames.push(term);
    }
  }

  // Nama terpanjang lebih dulu: tanpa ini "Andi" cocok lebih dulu dan menyisakan
  // potongan " Pratama" pada "Andi Pratama".
  longNames.sort((a, b) => b.length - a.length);
  const textPattern = buildSweepPattern(longNames);
  const sweepLookup = new Map<string, string>();
  for (const name of longNames) {
    const dummy = exact.get(name);
    if (dummy) sweepLookup.set(name.toLowerCase(), dummy);
  }

  // "HR" dan "IT" tidak ikut disapu di dalam teks — dua huruf akan mencacah
  // kata lain. Sebagai nilai kolom utuh keduanya tetap tersamarkan.
  const optionValues = [...deptValues, ...jobValues]
    .filter((value) => value.length >= MIN_LEN_FOR_ORG_SWEEP)
    .sort((a, b) => b.length - a.length);
  const optionPattern = buildSweepPattern(optionValues);

  return {
    exact,
    shortNames,
    textPattern,
    sweepLookup,
    optionPattern,
    avatars,
    reverse,
    builtAt: Date.now(),
    userCount: sorted.length,
  };
}

export async function ensureMaskMap(rawExec: RawExec): Promise<MaskMap> {
  if (cached && Date.now() - cached.builtAt < MAP_TTL_MS) return cached;
  if (building) return building;

  building = (async () => {
    try {
      const isFirstBuild = !cached;
      cached = await buildMap(rawExec);
      if (isFirstBuild) {
        // Dicetak sekali per proses. Flag yang menyala tanpa disadari adalah
        // masalah dua arah: data asli bisa tersaji ke peninjau kalau flag lupa
        // dinyalakan, dan karyawan bisa bingung melihat rekannya berganti nama
        // kalau flag lupa dimatikan. Baris ini membuat keadaannya terlihat di log.
        console.warn(
          `[anonymize] MODE REVIEW AKTIF — ${cached.userCount} akun disamarkan (nama, email, foto, departemen, jabatan). ` +
            (reviewModeLockedByEnv()
              ? `Dikunci oleh env ANONYMIZE_DATA; hapus variabel itu untuk mengembalikan tampilan asli.`
              : `Matikan lewat tombol "Mode review" di /studio untuk mengembalikan tampilan asli.`),
        );
      }
      return cached;
    } catch (error) {
      // Gagal keras, bukan diam-diam lolos. Kalau peta tidak bisa dibangun,
      // satu-satunya alternatif adalah menyajikan nama asli ke pihak yang
      // sedang meninjau — dan itu justru hal yang flag ini ada untuk mencegah.
      // Aplikasi yang error terlihat dalam sedetik; kebocoran tidak.
      if (cached) return cached; // peta lama masih lebih baik daripada bocor
      throw new Error(
        "Mode review aktif tapi peta penyamaran gagal dibangun: " +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      building = null;
    }
  })();

  return building;
}

/** Buang cache peta. Dipakai skrip verifikasi agar tidak memakai peta basi. */
export function resetMaskMap(): void {
  cached = null;
  building = null;
}

function maskString(key: string, value: string, map: MaskMap): string | null {
  // Nyaris semua avatar di sini adalah URL foto Google — wajah asli. Dikosongkan
  // supaya UI jatuh ke inisial dari nama palsu (HPAvatar sudah menanganinya).
  //
  // Dua jalur, sengaja: berdasarkan nilai untuk foto yang sudah terdaftar di
  // `users.avatar_image` (kebal alias kolom), dan berdasarkan nama kolom untuk
  // foto yang baru diunggah dan belum masuk peta yang di-cache.
  if (map.avatars.has(value.trim())) return null;
  if (KEY_AVATAR.test(key) && !KEY_AVATAR_KEEP.test(key)) {
    return value ? null : value;
  }

  if (KEY_SECRET.test(key)) return value ? null : value;

  if (HIDE_ATTACHMENTS && KEY_ATTACHMENT.test(key)) return value ? null : value;

  const direct = map.exact.get(value);
  if (direct !== undefined) return direct;

  const trimmed = value.trim();
  if (trimmed !== value) {
    const trimmedHit = map.exact.get(trimmed);
    if (trimmedHit !== undefined) return trimmedHit;
  }

  if (KEY_NAME.test(key)) {
    const short = map.shortNames.get(value) ?? map.shortNames.get(trimmed);
    if (short !== undefined) return short;
  }

  if (value.length < MIN_LEN_FOR_SHORT_SWEEP) return value;

  const isOption = KEY_OPTION.test(key);
  let swept = value;

  // Nama disapu di SETIAP nilai string, tanpa melihat nama kolomnya.
  //
  // Ini menutup dua hal sekaligus: nama yang tertanam di dalam nama benda
  // ("nabila's Room" di `focus_rooms.name`), dan nama di dalam kalimat notifikasi
  // yang kolomnya dialias ke apa pun. Aman disapu tanpa pandang kolom karena yang
  // dicocokkan hanya nama utuh ≥5 karakter dengan batas kata — bukan potongan.
  if (map.textPattern) {
    map.textPattern.lastIndex = 0;
    swept = swept.replace(
      map.textPattern,
      (matched) => map.sweepLookup.get(matched.toLowerCase()) ?? matched,
    );
  }

  // Alamat email juga tidak melihat nama kolom: alamat asli sama membocorkan
  // orangnya baik saat berada di kolom `email`, di dalam kalimat chat, maupun di
  // dalam JSON. Yang sudah berdomain palsu dilewati supaya tidak berganti dua kali.
  if (swept.includes("@")) {
    swept = swept.replace(EMAIL_IN_TEXT, (address) => {
      if (address.toLowerCase().endsWith(`@${DUMMY_EMAIL_DOMAIN}`)) return address;
      return map.exact.get(address) ?? `pengguna.${hash32(address) % 10000}@${DUMMY_EMAIL_DOMAIN}`;
    });
  }

  // Departemen asli ikut tertulis di jawaban onboarding ("Kamu di divisi apa?"
  // → "Engineering"). Tanpa sapuan ini kartu karyawan menyebut departemen palsu
  // sementara jawaban onboarding di kartu yang sama menyebut yang asli.
  if (map.optionPattern && isOption) {
    map.optionPattern.lastIndex = 0;
    swept = swept.replace(map.optionPattern, (matched) => map.exact.get(matched) ?? matched);
  }

  return swept;
}

function maskValue(key: string, value: unknown, map: MaskMap, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return maskString(key, value, map);
  if (depth > 4) return value;
  if (Array.isArray(value)) {
    return value.map((item) => maskValue(key, item, map, depth + 1));
  }
  if (typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    maskRow(value as Record<string, unknown>, map, depth + 1);
  }
  return value;
}

/** Menyamarkan satu baris DI TEMPAT. Baris hasil query selalu objek baru milik
 *  pemanggil, jadi tidak ada pihak lain yang memegang versi aslinya. */
function maskRow(row: Record<string, unknown>, map: MaskMap, depth = 0): Record<string, unknown> {
  for (const key of Object.keys(row)) {
    row[key] = maskValue(key, row[key], map, depth);
  }
  return row;
}

export function maskRows<T>(rows: T[], map: MaskMap): T[] {
  for (const row of rows) {
    if (row && typeof row === "object") {
      maskRow(row as Record<string, unknown>, map);
    }
  }
  return rows;
}

/**
 * Membalik nilai palsu di parameter query menjadi nilai asli.
 *
 * Tanpa ini, penyamaran merusak alurnya sendiri: UI menerima "Divisi Produk"
 * lalu mengirimkannya balik sebagai filter departemen, dan query mencari
 * departemen bernama "Divisi Produk" yang tidak pernah ada di database — layar
 * jadi kosong. Berlaku juga untuk login: email palsu yang dikirim balik tetap
 * menemukan akun yang benar.
 *
 * Hanya kecocokan nilai PENUH yang dibalik, jadi kalimat yang kebetulan
 * menyebut nama palsu tidak ikut ditulis ulang.
 */
export function unmaskArgs(args: unknown[], map: MaskMap): unknown[] {
  if (!map.reverse.size) return args;
  let changed = false;
  const out = args.map((arg) => {
    if (typeof arg !== "string") return arg;
    const real = map.reverse.get(arg);
    if (real === undefined) return arg;
    changed = true;
    return real;
  });
  return changed ? out : args;
}
