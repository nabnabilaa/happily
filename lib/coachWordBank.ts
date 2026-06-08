export type CoachCategory = 
  | 'task_overload' 
  | 'task_rejected' 
  | 'task_approved' 
  | 'task_empty'
  | 'streak_high'
  | 'mood_low'
  | 'mood_high'
  | 'approval_pending' 
  | 'team_mood_low' 
  | 'company_mood_low'
  | 'wellbeing_goal';

export interface CoachPhrase {
  tone: 'sage' | 'yellow' | 'coral' | 'blue' | 'lavender';
  title: string;
  body: string;
}

// Database Kata (Word Bank) untuk AI Coach
export const COACH_WORD_BANK: Record<string, Record<string, CoachPhrase[]>> = {
  // 1. GENERAL (Berlaku untuk semua Role: Employee, Manager, HR karena semua punya task & mood)
  general: {
    task_overload: [
      { tone: 'yellow', title: 'Banyak tugas? Tarik napas dulu 🌬️', body: 'Ada {count} tugas menumpuk. Coba pecah jadi bagian kecil dan kerjakan satu per satu.' },
      { tone: 'yellow', title: 'Fokus ke satu hal 🎯', body: 'Jangan panik dengan {count} tugasmu. Selesaikan yang paling berdampak tinggi dulu hari ini.' },
      { tone: 'lavender', title: 'Ayo mulai hari kamu ✨', body: 'Ada {count} tugas menunggu. Coba mulai dari yang paling ringan untuk memicu momentum.' }
    ],
    task_rejected: [
      { tone: 'yellow', title: 'Revisi itu wajar 💡', body: 'Beberapa tugasmu butuh revisi. Jadikan ini pijakan untuk hasil yang lebih sempurna!' },
      { tone: 'sage', title: 'Feedback adalah hadiah 🎁', body: 'Jangan berkecil hati karena revisi. Klien atau atasanmu tahu kamu bisa lebih baik lagi.' }
    ],
    task_approved: [
      { tone: 'blue', title: 'Semua prioritas selesai! 🚀', body: 'Luar biasa, kamu menyelesaikan semua target hari ini. Jangan lupa istirahat yang cukup ya.' },
      { tone: 'blue', title: 'Kerja bagus hari ini! 🏆', body: 'Kamu sudah menyelesaikan semua tugasmu. Waktunya merayakan kemenangan kecilmu!' }
    ],
    task_empty: [
      { tone: 'sage', title: 'Siap untuk hari ini?', body: 'Tentukan prioritasmu di daftar tugas dan biarkan aku membantumu tetap fokus.' },
      { tone: 'lavender', title: 'Papan tulismu masih kosong 📝', body: 'Belum ada tugas hari ini. Apa satu hal penting yang ingin kamu selesaikan?' }
    ],
    streak_high: [
      { tone: 'yellow', title: 'Streak {streak} hari 🎉', body: 'Kamu rutin menyapa diri sendiri — ini kebiasaan kecil yang dampaknya besar bagi produktivitasmu.' },
      { tone: 'sage', title: 'Konsistensi luar biasa! 🔥', body: 'Sudah {streak} hari berturut-turut kamu menjaga ritme kerjamu. Pertahankan momentum ini!' }
    ],
    mood_low: [
      { tone: 'coral', title: 'Energi kamu butuh perhatian', body: 'Mood kamu sedang {mood}. Mau coba 5-menit reset di modul Wellbeing? Istirahat sejenak bisa ningkatin fokus kamu lagi.' },
      { tone: 'coral', title: 'Jangan dipaksakan 🛑', body: 'Terlihat kamu sedang {mood}. Kesehatan mentalmu lebih penting dari deadline mana pun. Minum air dulu ya.' }
    ],
    mood_high: [
      { tone: 'sage', title: 'Vibe kamu positif hari ini! ✨', body: 'Gunakan energi positif ini untuk menyelesaikan tugas-tugas "Deep Work" atau bantu tim yang sedang butuh support.' },
      { tone: 'blue', title: 'Energi sedang memuncak 🔋', body: 'Hari yang luar biasa! Saatnya tackling pekerjaan yang selama ini kamu hindari.' }
    ],
    wellbeing_goal: [
      { tone: 'sage', title: 'Fokus Wellbeing Personal', body: 'Kamu sudah menyelesaikan rutinitas harian untuk goal "{goal}". Terus sayangi dirimu!' },
      { tone: 'lavender', title: 'Langkah kecil bermakna 🌱', body: 'Goal "{goal}" mu berjalan baik hari ini. Kesehatan adalah investasi jangka panjang.' }
    ]
  },

  // 2. MANAGER SPECIFIC (Hanya muncul jika role = manager)
  manager: {
    approval_pending: [
      { tone: 'yellow', title: 'Tim menunggu ulasanmu ⏳', body: 'Ada beberapa tugas tim yang menunggu approval-mu. Jangan biarkan proses mereka terhambat.' },
      { tone: 'lavender', title: 'Waktunya jadi katalisator 🚀', body: 'Selesaikan review dan approval hari ini agar anggota tim bisa melanjutkan pekerjaan mereka.' }
    ],
    team_mood_low: [
      { tone: 'coral', title: 'Cek kondisi tim kamu 🤝', body: 'Beberapa anggota tim terlihat sedang kelelahan. Mungkin ini saat yang tepat untuk sesi 1-on-1 singkat.' },
      { tone: 'yellow', title: 'Beban kerja tim terlalu berat? ⚖️', body: 'Indikator stres tim sedang naik. Coba tinjau ulang deadline atau redistribusi beban kerja mereka.' }
    ]
  },

  // 3. HR SPECIFIC (Hanya muncul jika role = hr)
  hr: {
    company_mood_low: [
      { tone: 'coral', title: 'Alert: Burnout Perusahaan 📉', body: 'Tingkat stres karyawan sedang tinggi. Pertimbangkan untuk mengirim pengumuman apresiasi atau adakan Ice Breaking.' },
      { tone: 'yellow', title: 'Waktunya intervensi budaya 🏢', body: 'Banyak keluhan kelelahan di logbook. Pastikan kebijakan jam kerja dan keseimbangan kehidupan kerja diterapkan.' }
    ]
  }
};
