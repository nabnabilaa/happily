/**
 * Konfigurasi ekonomi poin — AMAN untuk komponen klien.
 *
 * Dipisah dari `lib/points.ts` karena file itu mengimpor `lib/db` (mysql2), dan
 * komponen klien seperti SystemGuideModal perlu membaca nilai poin tanpa ikut
 * menyeret driver database ke dalam bundle browser.
 *
 * Di sinilah angka ekonominya didefinisikan. Jangan menulis ulang salinannya di
 * UI: guide yang menyimpan angkanya sendiri pasti melenceng begitu ekonominya
 * berubah, dan itu persis yang terjadi sebelumnya.
 */

/**
 * Dua lapis pengaman yang saling melengkapi:
 *
 *   1. KUNCI IDEMPOTEN (`ref_id`) — satu kejadian hanya dibayar sekali,
 *      selamanya. Membatalkan lalu mengulang aksi yang sama tidak menghasilkan
 *      poin baru, karena kuncinya sudah hangus. Ini yang mematikan celah
 *      "batalin lalu kumpulin lagi".
 *
 *   2. KUOTA HARIAN PER AKSI — begitu kuota penuh, aksi tetap tercatat dan
 *      tetap dirayakan, tapi bernilai 0 poin. Tidak ada lagi cap global buta
 *      yang mematikan semua aktivitas sekaligus; plafon harian muncul sendiri
 *      dari jumlah kuota.
 *
 * Urutan pemeriksaannya penting: kunci dulu, baru kuota. Kalau dibalik,
 * mengulang aksi lama akan membakar jatah aksi baru.
 */

export type PointsKind = "earn" | "reversal";

export type PointsScope = "daily" | "lifetime" | "monthly";

export interface PointsAction {
  /** Poin per kejadian. 0 = dicatat di tempat lain, tapi tidak berpoin. */
  value: number;
  /** Berapa kali per hari (WIB) aksi ini berpoin. null = tanpa kuota harian. */
  dailyQuota: number | null;
  /**
   * Umur kunci idempoten. `daily` boleh berulang tiap hari, `lifetime` sekali
   * seumur hidup, `monthly` sekali per bulan. Dipakai untuk membentuk `ref_id`
   * default kalau pemanggil tidak mengirimkannya.
   */
  scope: PointsScope;
  /**
   * Plafon POIN harian, untuk aksi yang nilainya variabel.
   *
   * Kuota slot saja tidak cukup begitu satu kejadian bisa bernilai berapa pun.
   * Sesi fokus dibayar proporsional terhadap menit (lihat lib/focusRoom.ts):
   * satu sesi bisa 13 poin atau 90 poin, jadi "3 slot" berarti antara 39 dan
   * 270 poin — rentang yang tidak membatasi apa-apa. Slot membatasi frekuensi;
   * plafon ini membatasi besarnya.
   *
   * Aksi bernilai tetap tidak membutuhkannya: di sana slot × nilai sudah
   * menentukan plafonnya sendiri.
   */
  dailyPointCap?: number;
  label: string;
  logbook: { type: string; emoji: string };
}

/**
 * ── Kelulusan training dibayar per hari, bukan borongan ─────────────────────
 *
 * Kapan sebuah training "tamat" tidak bisa ditebak di depan. Berapa hari yang
 * pantas untuk "baca buku"? Tergantung bukunya, tergantung ritme orangnya.
 * Karena itu tidak ada gerbang jumlah hari: tombol "Tamat" ditekan saat orangnya
 * merasa selesai, dan itu memang keputusan dia.
 *
 * Yang menahan penyalahgunaan bukan gerbang, melainkan asal bayarannya. Dulu
 * kelulusan bernilai 500 poin flat tanpa syarat apa pun — buat habit, tekan
 * "Tamat", +500, ulangi dengan nama lain, tak terbatas. Sekarang bayarannya
 * lahir dari hari-hari yang benar-benar dicentang, dan satu hari centang
 * menuntut satu hari sungguhan (habit_complete berkunci per tanggal dan hanya
 * berlaku untuk hari ini). Training yang dijalani tiga hari dibayar seperti
 * tiga hari; yang dijalani dua bulan dibayar penuh.
 *
 * Tarifnya sedikit di atas satu centang harian (15). Menuntaskan sesuatu memang
 * pantas bernilai lebih dari sekadar menjalaninya, tapi bukan puluhan kali
 * lipat.
 *
 * Dideklarasikan sebelum registry karena dipakai di dalamnya.
 */
export const TRAINING_POINTS_PER_DAY = 20;

/**
 * Plafon satu kelulusan, sekaligus plafon HARIAN untuk seluruh kelulusan.
 *
 * Dua-duanya perlu. Tanpa plafon per kelulusan, training berumur setahun
 * bernilai 7.300 poin. Tanpa plafon harian (`dailyPointCap`), menamatkan sepuluh
 * training sekaligus dalam satu sore tetap menumpuk — persis alasan sesi fokus
 * punya plafon serupa: kuota membatasi berapa KALI, bukan berapa BESAR.
 */
export const TRAINING_GRADUATION_MAX = 500;

/**
 * Minimal satu hari benar-benar tercatat. Bukan gerbang lama yang menuntut
 * seminggu — cuma menutup kasus "buat habit, langsung tamatkan" yang tidak
 * pernah dijalani sehari pun.
 */
export const TRAINING_GRADUATION_MIN_DAYS = 1;

/** Bayaran kelulusan untuk sekian hari tercatat. Klien memakainya untuk
 *  menunjukkan perkiraan; server memakainya sebagai angka sebenarnya. */
export function trainingGraduationPoints(completedDays: number): number {
  const days = Math.max(0, Math.floor(completedDays));
  if (days < TRAINING_GRADUATION_MIN_DAYS) return 0;
  return Math.min(TRAINING_GRADUATION_MAX, days * TRAINING_POINTS_PER_DAY);
}

// ── Registry aksi ───────────────────────────────────────────────────────────
// Angka di sini adalah satu-satunya tempat nilai poin didefinisikan. UI dan
// guide harus membaca dari sini, jangan menulis ulang angkanya sendiri.
export const POINTS_ACTIONS: Record<string, PointsAction> = {
  // ── Kehadiran ──
  check_in_ontime: {
    value: 10, dailyQuota: 1, scope: "daily",
    label: "Check-in tepat waktu",
    logbook: { type: "checkin", emoji: "✅" },
  },
  check_in_late_minor: {
    value: 5, dailyQuota: 1, scope: "daily",
    label: "Check-in (sedikit terlambat)",
    logbook: { type: "checkin", emoji: "⏰" },
  },
  check_in_late: {
    value: 0, dailyQuota: 1, scope: "daily",
    label: "Check-in terlambat",
    logbook: { type: "checkin", emoji: "⚠️" },
  },
  tutup_hari: {
    value: 20, dailyQuota: 1, scope: "daily",
    label: "Tutup hari",
    logbook: { type: "checkin", emoji: "🌙" },
  },

  // ── Task ──
  // Poin task dibayar dua tahap: 20 saat karyawan menandai selesai (umpan balik
  // instan), 10 lagi saat manajer meng-ACC. Kalau manajer menolak, keduanya
  // ditarik kembali lewat reversePoints() — jadi mengarang task berakhir nol,
  // bukan untung.
  task_complete: {
    value: 20, dailyQuota: 5, scope: "lifetime",
    label: "Task selesai",
    logbook: { type: "task_done", emoji: "🎯" },
  },
  task_approved: {
    value: 10, dailyQuota: 5, scope: "lifetime",
    label: "Task disetujui manajer",
    logbook: { type: "task_done", emoji: "✅" },
  },

  // ── Kebiasaan & fokus ──
  habit_complete: {
    value: 15, dailyQuota: 2, scope: "daily",
    label: "Latihan selesai",
    logbook: { type: "activity", emoji: "🌿" },
  },
  // Nilai sebenarnya dihitung lib/focusRoom.ts dari menit yang terbukti dan
  // dikirim lewat `overrideValue`; `value` di bawah hanya acuan kalau pemanggil
  // tidak menghitung sendiri.
  //
  // `dailyPointCap` 60 ≈ dua blok kerja dalam ~2 jam terkredit. Lewat itu sesi
  // tetap berjalan dan tetap masuk logbook, hanya berhenti berpoin — sejalan
  // dengan prinsip di focusRoom.ts: poin itu insentif, logbook itu rekaman.
  focus_session: {
    value: 15, dailyQuota: 2, scope: "lifetime", dailyPointCap: 60,
    label: "Sesi fokus selesai",
    logbook: { type: "activity", emoji: "⏱️" },
  },
  breathing: {
    value: 5, dailyQuota: 1, scope: "daily",
    label: "Latihan pernapasan",
    logbook: { type: "activity", emoji: "🧘" },
  },

  // ── Wellbeing ──
  mood_checkin: {
    value: 5, dailyQuota: 1, scope: "daily",
    label: "Mood check-in",
    logbook: { type: "mood", emoji: "💭" },
  },
  midday_checkin: {
    value: 5, dailyQuota: 1, scope: "daily",
    label: "Cek progres siang",
    logbook: { type: "activity", emoji: "☀️" },
  },

  // ── Sosial ──
  // Nilainya sengaja kecil. Yang membuat totalnya besar adalah banyaknya orang
  // berbeda yang terbantu — bukan besarnya nilai per kejadian. Rem "satu orang
  // tidak bisa mengapresiasi orang yang sama dua kali sehari" ada di
  // app/api/kudos, bukan di sini.
  apresiasi_received: {
    value: 8, dailyQuota: 5, scope: "lifetime",
    label: "Menerima apresiasi",
    logbook: { type: "kudos", emoji: "🌟" },
  },

  // ── Nudge & survei ──
  nudge_daily: {
    value: 10, dailyQuota: 3, scope: "daily",
    label: "Nudge harian",
    logbook: { type: "activity", emoji: "🎲" },
  },
  survey_complete: {
    value: 20, dailyQuota: 1, scope: "lifetime",
    label: "Mengisi survei",
    logbook: { type: "activity", emoji: "📋" },
  },
  learning_complete: {
    value: 25, dailyQuota: 2, scope: "lifetime",
    label: "Lulus modul belajar",
    logbook: { type: "activity", emoji: "📚" },
  },

  // ── Coworking ──
  // AKTIF. Nilainya variabel: `lib/focusRoom.ts` menghitung poin dari menit
  // fokus yang terbukti di server lalu mengirimkannya lewat `overrideValue`.
  // Angka di bawah adalah nilai acuan kalau pemanggil tidak menghitung sendiri.
  //
  // Kuncinya `focus:<roomId>` (lihat refFor.focus), jadi satu ruangan hanya
  // membayar satu kali per orang berapa kali pun penyelesaiannya dipanggil ulang.
  coworking_session: {
    value: 20, dailyQuota: 3, scope: "lifetime", dailyPointCap: 60,
    label: "Sesi coworking",
    logbook: { type: "activity", emoji: "👥" },
  },

  // ── Milestone ──
  // Tanpa kuota harian: kejadiannya langka dan kuncinya seumur hidup (atau per
  // periode), jadi tidak bisa diulang.
  streak_5: {
    value: 25, dailyQuota: null, scope: "lifetime",
    label: "Streak 5 hari",
    logbook: { type: "streak", emoji: "🔥" },
  },
  streak_14: {
    value: 50, dailyQuota: null, scope: "lifetime",
    label: "Streak 14 hari",
    logbook: { type: "streak", emoji: "⚡" },
  },
  streak_30: {
    value: 100, dailyQuota: null, scope: "lifetime",
    label: "Streak 30 hari",
    logbook: { type: "streak", emoji: "🏆" },
  },
  streak_monthly: {
    value: 200, dailyQuota: null, scope: "monthly",
    label: "Streak sebulan penuh",
    logbook: { type: "streak", emoji: "💎" },
  },
  andalan_tim: {
    value: 50, dailyQuota: null, scope: "monthly",
    label: "Andalan Tim",
    logbook: { type: "kudos", emoji: "🤝" },
  },
  kpi_achieved: {
    value: 150, dailyQuota: null, scope: "monthly",
    label: "KPI tercapai",
    logbook: { type: "kpi", emoji: "🏆" },
  },
  // KPI yang ditetapkan sendiri oleh karyawan. Nilainya jauh di bawah KPI resmi
  // justru karena targetnya ditentukan sendiri — tanpa verifikasi manajer,
  // besar poinnya harus kecil supaya tidak jadi jalur memerah yang mudah.
  personal_kpi_achieved: {
    value: 20, dailyQuota: null, scope: "lifetime",
    label: "KPI mandiri tercapai",
    logbook: { type: "kpi", emoji: "🎯" },
  },
  kpi_exceeded: {
    value: 250, dailyQuota: null, scope: "monthly",
    label: "KPI melampaui target",
    logbook: { type: "kpi", emoji: "🚀" },
  },
  // Aksi bernilai VARIABEL: nilainya dihitung server dari jumlah hari latihan
  // yang benar-benar tercatat (lihat trainingGraduationPoints di bawah), lalu
  // dikirim sebagai `overrideValue`. `value` di sini adalah tarif per hari,
  // bukan bayaran sekali jalan.
  training_graduated: {
    value: TRAINING_POINTS_PER_DAY, dailyQuota: null, scope: "lifetime",
    dailyPointCap: TRAINING_GRADUATION_MAX,
    label: "Lulus training",
    logbook: { type: "activity", emoji: "🎓" },
  },
};

/**
 * Nama aksi lama → nama baru. Ada supaya pemanggil yang belum dimigrasi tidak
 * patah, dan supaya dua nama berbeda tidak diam-diam berbagi kuota yang sama.
 */
const ACTION_ALIASES: Record<string, string> = {
  priority_complete: "task_complete",
  task_revised_approved: "task_approved",
  daily_reflection: "tutup_hari",
  check_out: "tutup_hari",
  check_in: "check_in_ontime",
  daily_challenge: "nudge_daily",
  realization_check: "midday_checkin",
  goal_complete: "kpi_achieved",
  streak_7: "streak_5",
};

export function resolveAction(action: string): string | null {
  const name = ACTION_ALIASES[action] ?? action;
  return POINTS_ACTIONS[name] ? name : null;
}

/**
 * Plafon harian teoretis — jumlah semua kuota. Dipakai hanya sebagai pemutus
 * arus (lihat DAILY_SAFETY_CEILING) dan untuk perhitungan internal. JANGAN
 * ditampilkan ke user: kuota per aksi ditunjukkan sebagai penghitung hidup di
 * widget masing-masing, bukan sebagai tabel plafon di guide.
 */
export function theoreticalDailyMax(): number {
  return Object.values(POINTS_ACTIONS).reduce(
    (sum, a) => sum + (a.dailyQuota ? a.value * a.dailyQuota : 0),
    0,
  );
}

/**
 * Pemutus arus, bukan aturan produk. Dengan kuota per aksi yang benar, angka
 * ini seharusnya TIDAK PERNAH tercapai — kalau menyala, berarti ada bug dan
 * kejadiannya perlu diselidiki, bukan dianggap normal.
 */
export const DAILY_SAFETY_CEILING = 550;

