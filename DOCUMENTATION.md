# Dokumentasi Proyek Bee Flow 🐝

## 1. Pendahuluan
**Bee Flow** adalah platform manajemen produktivitas dan kesejahteraan (wellbeing) berbasis web yang dirancang untuk menyelaraskan pertumbuhan profesional karyawan dengan kebahagiaan mereka di tempat kerja. Platform ini mengintegrasikan gamifikasi tingkat lanjut, analisis berbasis AI, dan sistem peran (role-based) untuk menciptakan alur kerja yang bahagia.

## 2. Arsitektur Teknis
Proyek ini dibangun menggunakan teknologi terbaru untuk memastikan performa dan skalabilitas:

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Library UI**: [React 19](https://react.dev/)
-   **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: Vanilla CSS dengan Sistem Token Kustom
-   **Manajemen State**: React Context API (`HPContext`)
-   **Ikonografi**: Sistem `HPGlyph` kustom
-   **Avatar**: [DiceBear](https://www.dicebear.com/) (Legacy) bertransisi ke sistem frame persegi kustom.

## 3. Struktur Folder Utama
```text
├── app/                  # Routing Next.js & API endpoints
│   ├── api/              # Endpoints (storage, ai, dll.)
│   ├── globals.css       # Style global
│   └── layout.tsx        # Layout utama
├── components/           # Komponen UI modular
│   ├── auth/             # Layar pemilihan peran & autentikasi
│   ├── home/             # Dashboard berdasarkan peran
│   ├── growth/           # Fitur pengembangan diri & analytics
│   ├── modals/           # Sistem modal interaktif (Coach, Goals, dll.)
│   └── ui/               # Komponen atomik (Buttons, Glyphs, dll.)
├── data/                 # Penyimpanan data lokal (storage.json)
├── lib/                  # Logika inti & utilitas
│   ├── HPContext.tsx     # State management global
│   ├── constants.ts      # Design tokens (warna, font)
│   └── mockData.ts       # Data awal untuk prototipe
└── public/               # Aset statis (gambar, font)
```

## 4. Sistem Peran (Role-Based System)
Aplikasi ini memiliki tiga tampilan utama yang disesuaikan dengan tanggung jawab pengguna:

-   **Employee (Karyawan)**: Fokus pada manajemen tugas pribadi, pelacakan kebiasaan (habits), pengembangan skill, dan kesejahteraan mental.
-   **Manager (Manajer)**: Berfokus pada pemantauan kinerja tim, pemberian apresiasi (recognition), coaching GROW, dan penyelarasan tujuan tim.
-   **HR (Human Resources)**: Fokus pada analitik budaya perusahaan, keterlibatan karyawan (engagement), dan manajemen program kesejahteraan di tingkat organisasi.

## 5. Mekanisme Gamifikasi & Identity
Ini adalah inti dari Bee Flow yang mendorong keterlibatan pengguna:

-   **Rank & Leveling**:
    -   Pengguna memulai dari Rank **E** hingga mencapai Rank **S**.
    -   Level dihitung secara otomatis berdasarkan akumulasi **XP (Points)**.
    -   Rank diberikan berdasarkan level: E (Lv 1-10), D (Lv 11-20), C (Lv 21-35), B (Lv 36-50), A (Lv 51-70), S (Lv 70+).
-   **Streaks & Persistence**: Menghitung hari berturut-turut pengguna aktif.
-   **Penalty Logic**: Jika pengguna tidak aktif melebihi ambang batas (`penaltyThresholdDays`), poin akan dikurangi dan streak akan direset ke 0.
-   **Avatar Identity**: Setiap pengguna memiliki persona unik yang dapat dikustomisasi, mencerminkan identitas profesional mereka dalam platform.

## 6. Fitur Unggulan
-   **AI Coach**: Asisten cerdas yang memberikan saran pertumbuhan, membantu refleksi harian, dan membimbing sesi coaching GROW.
-   **Skill Syncing**: Kemajuan skill dihitung secara otomatis menggunakan logika analisis teks yang memetakan aktivitas ke kategori skill tertentu (misal: "interaction design" ke "Interaction Design").
-   **Wellbeing Check-in**: Pelacakan mood dan energi harian untuk mencegah burnout.
-   **Peer Recognition**: Memungkinkan sesama rekan kerja untuk memberikan apresiasi yang berdampak langsung pada poin dan moral.

## 7. Alur Data & Persistensi
-   Aplikasi menggunakan `HPProvider` untuk membungkus seluruh konten, memastikan state global tersedia di mana saja melalui hook `useHP()`.
-   Data disimpan sementara di memori selama sesi berlangsung dan diinisialisasi dari `data/storage.json`.
-   Setiap perubahan state secara otomatis melakukan sinkronisasi ke `/api/storage` melalui metode POST.

## 8. Panduan Pengembangan
Untuk menjalankan proyek secara lokal:
1.  Instal dependensi: `npm install`
2.  Jalankan server pengembangan: `npm run dev`
3.  Akses di: `http://localhost:3000`

---
*Dokumentasi ini dibuat untuk versi Bee Flow - Mei 2026.*
