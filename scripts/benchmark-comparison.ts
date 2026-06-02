/**
 * Benchmark Comparison Script (Detailed Scenarios Edition)
 * Mengukur dan membandingkan beban tulis (Write Queries) database MySQL antara:
 * 1. Metode Lama: Wipe-and-Reinsert (DELETE + INSERT all)
 * 2. Metode Baru: Programmatic Diffing Updates (Incremental)
 * 
 * Jalankan dengan: npx tsx scripts/benchmark-comparison.ts
 */

// Using vanilla ANSI escape codes for clean styling
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function printScenario(
  title: string,
  desc: string,
  nHabits: number,
  nSkills: number,
  nRewards: number,
  nPriorities: number,
  newWrites: number,
  note: string
) {
  // Metode lama menghapus semua dan memasukkan kembali untuk setiap sync
  const oldUserWrites = 1; // UPDATE users
  const oldHabitWrites = 1 + nHabits; // DELETE + N INSERT
  const oldSkillWrites = 1 + nSkills; // DELETE + M INSERT
  const oldRewardHistoryWrites = 1 + nRewards; // DELETE + K INSERT
  const oldPriorityWrites = 1 + nPriorities; // DELETE + P INSERT (Upsert)
  
  const totalOldWrites = oldUserWrites + oldHabitWrites + oldSkillWrites + oldRewardHistoryWrites + oldPriorityWrites;
  const savings = ((totalOldWrites - newWrites) / totalOldWrites) * 100;

  console.log(`${BOLD}${CYAN}---------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}Skenario: ${title}${RESET}`);
  console.log(`Deskripsi: ${desc}`);
  console.log(`Data User: Habits (${nHabits}), Skills (${nSkills}), Rewards (${nRewards}), Priorities (${nPriorities})`);
  console.log(`- ${RED}Metode Lama (Wipe-and-Reinsert)${RESET} : ${RED}${totalOldWrites} write queries${RESET} (1 UPDATE user, ${oldHabitWrites} habits, ${oldSkillWrites} skills, ${oldRewardHistoryWrites} rewards, ${oldPriorityWrites} priorities)`);
  console.log(`- ${GREEN}Metode Baru (Incremental Diffing)${RESET}: ${GREEN}${newWrites} write queries${RESET} (${note})`);
  console.log(`👉 ${BOLD}Efisiensi Penghematan: ${GREEN}${savings.toFixed(1)}% hemat${RESET}`);
  console.log(``);

  return { totalOldWrites, newWrites };
}

function runBenchmark() {
  // Konfigurasi Ukuran Data Pengguna Standar
  const habitsCount = 8;     // Jumlah habit aktif
  const skillsCount = 10;    // Jumlah skill terdaftar
  const rewardsCount = 6;    // Riwayat penukaran reward
  const prioritiesCount = 5; // Jumlah prioritas harian

  console.log(`\n===============================================================`);
  console.log(`🚀 ${BOLD}SIMULASI BENCHMARK SKENARIO NYATA (REALISTIC SCENARIOS)${RESET}`);
  console.log(`===============================================================`);
  console.log(`Parameter Awal Database per User:`);
  console.log(`  * Total Habits          : ${habitsCount} item`);
  console.log(`  * Total Skills          : ${skillsCount} item`);
  console.log(`  * Total Riwayat Rewards : ${rewardsCount} item`);
  console.log(`  * Total Daily Priorities: ${prioritiesCount} item`);
  console.log(`===============================================================\n`);

  let totalOld = 0;
  let totalNew = 0;

  // --- SKENARIO 1 ---
  let res = printScenario(
    "1. Idle Sync (Sinkronisasi Otomatis Berkala)",
    "Tab browser terbuka dan melakukan auto-sync berkala (debounce 1.5 detik) tanpa ada perubahan data.",
    habitsCount, skillsCount, rewardsCount, prioritiesCount,
    1, // Hanya update users (lastActivityDate / metadata)
    "Hanya 1 kueri UPDATE untuk metadata user"
  );
  totalOld += res.totalOldWrites * 0.70; // Diasumsikan 70% dari total sync adalah idle sync
  totalNew += res.newWrites * 0.70;

  // --- SKENARIO 2 ---
  res = printScenario(
    "2. Check-in Harian (Centang 1 Habit & Ubah Mood)",
    "Pengguna membuka dashboard pagi hari, mengubah mood harian dan mencentang satu tugas habit.",
    habitsCount, skillsCount, rewardsCount, prioritiesCount,
    2, // 1 update user (mood), 1 update status habit
    "1 UPDATE user, 1 UPDATE spesifik baris habit"
  );
  totalOld += res.totalOldWrites * 0.15; // Diasumsikan 15% dari total sync
  totalNew += res.newWrites * 0.15;

  // --- SKENARIO 3 ---
  res = printScenario(
    "3. Penyelarasan OKR Tim (Tambah 1 Goal/Prioritas)",
    "Pengguna menambahkan 1 tugas prioritas baru yang disejajarkan dengan OKR Perusahaan.",
    habitsCount, skillsCount, rewardsCount, prioritiesCount,
    2, // 1 update user, 1 insert priority baru
    "1 UPDATE user, 1 INSERT priority baru"
  );
  totalOld += res.totalOldWrites * 0.10; // Diasumsikan 10% dari total sync
  totalNew += res.newWrites * 0.10;

  // --- SKENARIO 4 ---
  res = printScenario(
    "4. Penukaran Hadiah (Redeem 1 Reward & Log)",
    "Karyawan membelanjakan koin untuk menukar voucher hadiah (mengurangi poin & menambah 1 riwayat transaksi).",
    habitsCount, skillsCount, rewardsCount, prioritiesCount,
    3, // 1 update user (poin), 1 update rewards (stok), 1 insert user_rewards (riwayat)
    "1 UPDATE user, 1 UPDATE stok reward, 1 INSERT riwayat"
  );
  totalOld += res.totalOldWrites * 0.03; // Diasumsikan 3% dari total sync
  totalNew += res.newWrites * 0.03;

  // --- SKENARIO 5 ---
  res = printScenario(
    "5. Peningkatan Skill Otomatis (AI Coach Progression)",
    "AI Coach menganalisis aktivitas pengguna dan menaikkan progress 1 Skill secara otomatis.",
    habitsCount, skillsCount, rewardsCount, prioritiesCount,
    2, // 1 update user, 1 update progress skill
    "1 UPDATE user, 1 UPDATE progress skill"
  );
  totalOld += res.totalOldWrites * 0.02; // Diasumsikan 2% dari total sync
  totalNew += res.newWrites * 0.02;

  // --- ANALISIS SKALA ---
  console.log(`${BOLD}${YELLOW}===============================================================${RESET}`);
  console.log(`${BOLD}📈 ANALISIS PERFORMA & PROYEKSI TRAFIK (WEIGHTED AVERAGE)${RESET}`);
  console.log(`${BOLD}${YELLOW}===============================================================${RESET}`);
  
  const weightedOld = Math.round(totalOld);
  const weightedNew = Math.round(totalNew);
  const totalSavings = ((weightedOld - weightedNew) / weightedOld) * 100;

  console.log(`Rata-rata tertimbang Write Queries per Sync:`);
  console.log(`  - Metode Lama: ${RED}${weightedOld} write operations${RESET}`);
  console.log(`  - Metode Baru: ${GREEN}${weightedNew} write operations${RESET}`);
  console.log(`  👉 Penghematan Kueri Tulis Rata-rata: ${GREEN}${totalSavings.toFixed(1)}%${RESET}`);
  console.log(``);

  // Perhitungan skala pengguna
  const users = [100, 1000, 5000];
  const syncsPerHourPerUser = 24; // Rata-rata 24 sinkronisasi per jam per user saat aktif
  
  console.log(`${BOLD}Proyeksi Total Operasi Tulis ke Database per Jam:${RESET}`);
  for (const n of users) {
    const oldHourly = weightedOld * n * syncsPerHourPerUser;
    const newHourly = weightedNew * n * syncsPerHourPerUser;
    const diff = oldHourly - newHourly;
    console.log(`\n👥 Untuk ${BOLD}${n.toLocaleString()} User Aktif${RESET}:`);
    console.log(`  - ${RED}Metode Lama${RESET} : ${oldHourly.toLocaleString()} writes/jam`);
    console.log(`  - ${GREEN}Metode Baru${RESET} : ${newHourly.toLocaleString()} writes/jam`);
    console.log(`  👉 ${BOLD}Menghemat: ${CYAN}${diff.toLocaleString()} write queries/jam${RESET} (${((diff/oldHourly)*100).toFixed(1)}% beban DB terpangkas!)`);
  }
  console.log(`${BOLD}${YELLOW}===============================================================${RESET}\n`);
}

runBenchmark();
