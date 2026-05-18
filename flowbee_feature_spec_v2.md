# Flowbee — Spesifikasi Fitur Lengkap (Revisi 2)

> Prinsip dasar tidak berubah: Manager & HR adalah Employee. RBAC berlapis. Semua aktivitas tercatat dan bisa diaudit.

---

## BAGIAN 1 — ROLE: EMPLOYEE

### 1. Sistem Poin & Level (Gamification)

#### Sumber Poin
| Aktivitas | Poin | Catatan |
|---|---|---|
| Clock-in tepat waktu (sebelum 08.00) | +10 | Terlambat 1–15 menit = +5, lebih = 0 |
| Clock-out (hadir penuh) | +5 | |
| Task disetujui Manager | +15 | Poin masuk SETELAH approval |
| Task direvisi lalu disetujui | +8 | |
| Isi Mood & Energy | +5 | Satu kali per hari |
| Dapat Kudos dari Manager | +20 | |
| **KPI Bulanan tercapai (verified Manager)** | **+150** | Bonus besar di akhir bulan |
| **KPI Bulanan melampaui target** | **+250** | Jika ada metrik kuantitatif |
| Streak 5 hari kerja berturut-turut aktif | +25 bonus | |
| **Streak 1 bulan penuh (semua hari kerja aktif)** | **+200 bonus** | Dihitung dari hari kerja kalender, bukan 30 hari flat |
| Survey diisi | +5 | Per survey |

> **Catatan Streak Bulanan:** 1 bulan = seluruh hari kerja di bulan tersebut (rata-rata 21–23 hari). Sistem membaca kalender kerja (senin–jumat, kecuali libur nasional). Jika bulan itu ada 22 hari kerja dan employee aktif semua 22 hari → streak bonus diberikan.

#### Anti-Abuse Rules
- Task hanya dihitung jika memiliki **deskripsi minimal 20 karakter** dan terhubung ke KPI (atau KPI Mandiri).
- Poin dari approval task baru masuk **setelah Manager menyetujui**.
- Manager bisa menandai task sebagai "tidak valid" tanpa memberikan poin.
- Batas maksimum poin harian dari task: **75 poin** (≈ 5 task disetujui).
- Penalti XP: tidak aktif 3 hari kerja berturut-turut → −15 XP/hari mulai hari ke-4. Dikonfigurasi Superadmin.

#### Rumus Level
```
Level 1:   0 – 499 XP        → "Rookie"
Level 2:   500 – 1.499 XP    → "Contributor"
Level 3:   1.500 – 3.499 XP  → "Performer"
Level 4:   3.500 – 6.999 XP  → "Achiever"
Level 5:   7.000 – 12.499 XP → "Leader"
Level 6:   12.500 – 19.999 XP→ "Champion"
Level 7:   20.000+ XP        → "Legend"
```

---

### 2. Sistem Notifikasi

#### A. Notifikasi Sistem (Event-Based)
| Trigger | Pesan |
|---|---|
| Jam 07.45 (belum clock-in) | "⏰ Hari kerja dimulai pukul 08.00. Jangan lupa clock-in!" |
| 30 menit setelah jam 08.00, belum clock-in | "🔴 Kamu belum clock-in. Segera lakukan!" |
| 3 jam setelah clock-in, belum ada task | "💡 Sudah 3 jam tanpa task baru. Yuk tambahkan progressmu!" |
| Task disetujui | "✅ Task '[judul]' disetujui. +15 XP" |
| Task diminta revisi | "🔄 Revisi diperlukan untuk '[judul]': [catatan Manager]" |
| Task ditolak | "❌ Task '[judul]' ditolak. Alasan: [catatan]" |
| Dapat Kudos | "🎉 [Manager] memberikan Kudos! +20 XP" |
| Naik level | "🚀 Kamu naik ke Level [N] — [Rank Name]!" |
| Streak mau putus (sore, belum ada aktivitas) | "🔥 Streak-mu hampir putus! Lakukan aktivitas hari ini." |
| KPI baru ditambahkan Manager | "📌 Manager menambahkan KPI baru bulan ini: [judul KPI]" |
| Survey baru tersedia | "📋 Survey baru: '[judul]'. Deadline: [tanggal]" |
| Weekly AI Summary siap (setiap Jumat malam) | "📊 Rangkuman mingguanmu sudah siap. Cek di Logbook!" |

#### B. Notifikasi AI Bijak (Hemat Token)
AI tidak dipanggil setiap kali notifikasi dikirim. Alurnya:

```
[PERTAMA KALI / MINGGUAN — pakai token]
Setiap Jumat malam, AI dipanggil SEKALI per user:
  - Input: data seminggu (task, mood, XP, attendance)
  - Output: 3 hal tersimpan di DB:
      1. Kalimat motivasi pagi (untuk Senin depan)
      2. Ringkasan pencapaian minggu ini
      3. Satu saran pengembangan diri

[SELANJUTNYA — TIDAK pakai token]
Notifikasi pagi Senin → ambil dari DB (kalimat motivasi yang sudah di-generate)
Notifikasi sore harian → template statis berdasarkan kondisi (no AI call)
```

Dengan cara ini, AI dipanggil **maksimal sekali per user per minggu**, bukan setiap notifikasi.

#### C. Notifikasi In-App & Push
- Bell icon di navbar dengan badge jumlah belum dibaca.
- Push notification opsional (aktifkan di Settings).
- Riwayat notifikasi tersimpan 30 hari.

---

### 3. Kehadiran & Status (Presence)

#### Halaman Status Semua Employee (Presence Board)
Ada halaman khusus yang menampilkan semua employee dengan status saat ini — bisa dilihat oleh semua role.

```
┌─────────────────────────────────────────────────────┐
│  PRESENCE BOARD  — Senin, 10 Juni 2025              │
├──────────────────┬──────────────┬───────────────────┤
│ Nama             │ Status       │ Sejak             │
├──────────────────┼──────────────┼───────────────────┤
│ Ahmad Fauzi      │ 🟢 Working   │ 07.58             │
│ Budi Santoso     │ 🔵 In Meeting│ 09.30             │
│ Citra Lestari    │ 🟡 On Break  │ 11.45             │
│ Dewi Rahayu      │ 🔴 Sakit     │ (izin hari ini)   │
│ Eko Prasetyo     │ ⚫ Off Today  │ (cuti)            │
└──────────────────┴──────────────┴───────────────────┘
```

- Manager & HR bisa filter by departemen.
- Bisa search by nama.
- Real-time (atau refresh tiap 5 menit).

#### Status yang Tersedia
| Status | Ikon | Keterangan |
|---|---|---|
| `Working` | 🟢 | Aktif bekerja (default setelah clock-in) |
| `In Meeting` | 🔵 | Sedang rapat |
| `Deep Focus` | 🟣 | Mode fokus, notifikasi ditunda |
| `On Break` | 🟡 | Istirahat singkat |
| `Away` | 🟠 | Tidak di meja |
| `Sakit` | 🔴 | Izin sakit + wajib isi alasan/keterangan |
| `Off Today` | ⚫ | Cuti / libur / WFH full |

#### Input Sakit & Izin
Saat memilih status `Sakit` atau `Off Today`:
```
[Modal]
Jenis Ketidakhadiran:
  ○ Sakit  ○ Cuti Tahunan  ○ Izin Keperluan  ○ Lainnya

Keterangan (wajib untuk Sakit/Izin):
  [________________]

Upload surat dokter (opsional, untuk sakit):
  [Pilih File]

[Kirim]
```
- Data ini langsung masuk ke log attendance dan terlihat oleh Manager & HR.
- Tidak mengurangi streak jika sakit dengan keterangan (flagged sebagai "excused absence").

#### Clock-in (Jam Kerja: 08.00)
- Saat clock-in, pilih mode kerja: WFO / WFH.
- Catatan rencana hari ini (opsional, maks 100 karakter).
- GPS opsional untuk validasi WFO.

#### Clock-out
```
User klik "Clock Out"
  ↓
[Modal] Summary Hari Ini (otomatis dari data yang sudah ada):
  - Task selesai: 3 dari 5
  - XP hari ini: +63
  - Mood sudah diisi: ✅ / ❌
  ↓
[Prompt] Task belum selesai: [A], [B] → Pindah ke besok? (Ya/Tidak per task)
  ↓
[Rating] Seberapa produktif harimu? ★★★★☆
  ↓
[Konfirmasi] "Clock out pukul 17.43. Sampai besok! 🎉"
```
- Jika tidak clock-out sampai tengah malam → auto clock-out, tidak dapat poin clock-out, diberi flag "Auto Clock-out" di log.

---

### 4. Goals / Task Harian & KPI

#### Jika Tidak Ada KPI dari Manager
Employee bisa tetap memasukkan task → terhubung ke **KPI Mandiri** (personal KPI yang dibuat sendiri):
```
Tidak ada KPI aktif dari Manager?
  ↓
"Tambahkan ke KPI Mandiri"
  ↓
Employee isi: Judul KPI Mandiri, target, periode
  ↓
Task terhubung ke KPI Mandiri ini
  ↓
KPI Mandiri tetap bisa di-review oleh Manager (opsional)
```

#### Alur Task Harian (Lengkap)
```
Employee tambah task → Pilih KPI (dari Manager atau KPI Mandiri)
  ↓
Isi deskripsi (min. 20 karakter) → Submit
  ↓
Manager review → Approve / Revisi / Tolak
  ↓
Jika Approved → XP masuk, task tercatat otomatis di Logbook hari itu
Jika Revisi   → Employee edit → resubmit → Manager review lagi
Jika Tolak    → Task = "Rejected", no XP, alasan tercatat
```

---

### 5. Logbook — Kalender Aktivitas Harian

> **Logbook bukan form yang diisi manual.** Logbook adalah tampilan otomatis yang merangkum semua aktivitas employee dalam satu hari, dikumpulkan dari data yang sudah ada (task, attendance, mood, status).

#### Tampilan Kalender Logbook
- Tampil sebagai kalender bulanan (bisa navigasi antar bulan dan tahun).
- Setiap hari ditandai warna berdasarkan aktivitas:
  - ⬜ Abu-abu: tidak hadir / tidak ada data.
  - 🟩 Hijau muda–tua: hadir, skor aktivitas rendah–tinggi.
  - 🟥 Merah: ada flag (auto clock-out, task semua ditolak, absen tanpa keterangan).
  - 🟦 Biru: sakit dengan keterangan.

#### Klik Satu Hari → Detail Aktivitas
```
┌──────────────────────────────────────────────┐
│  Selasa, 10 Juni 2025                        │
│  WFO  |  Clock-in: 07.57  |  Clock-out: 17.32│
├──────────────────────────────────────────────┤
│  TASK HARI INI                               │
│  ✅ Approved  — Dokumentasi endpoint /users  │
│  ✅ Approved  — Fix bug login redirect       │
│  🔄 Revisi    — Review PR #47 (catatan: ...)  │
│  ❌ Rejected  — Refactor auth (alasan: ...)   │
├──────────────────────────────────────────────┤
│  MOOD & ENERGY                               │
│  Mood: 😊 Baik (4/5)  |  Energy: ⚡ Tinggi  │
├──────────────────────────────────────────────┤
│  XP HARI INI                                 │
│  Clock-in tepat: +10  |  Task approved: +30  │
│  Mood: +5  |  Total hari ini: +45 XP         │
└──────────────────────────────────────────────┘
```

Tidak ada field "tulis logbook" — semua data otomatis terkumpul dari aktivitas yang sudah diinput.

#### Ringkasan Mingguan (Otomatis, AI)
Setiap Jumat malam, sistem menjalankan AI job untuk setiap user:
- Input ke AI: semua task minggu ini (judul, status, KPI), mood harian, XP, attendance.
- Output AI (tersimpan di DB, tidak di-generate ulang):
  - Paragraf ringkasan: "Minggu ini kamu menyelesaikan X task, Y di antaranya disetujui..."
  - Highlight terbaik minggu ini.
  - Satu catatan perhatian (jika ada mood rendah atau task banyak yang revisi).
- Ringkasan ini tampil di bawah minggu tersebut di kalender logbook.
- Juga terlihat oleh Manager dan HR.

#### Ringkasan Bulanan
- Agregasi otomatis: total task approved, total XP, rata-rata mood, rata-rata rating produktivitas.
- Status KPI: tercapai / tidak tercapai / dalam proses (dari penilaian Manager).
- Tampil sebagai tab/section di bawah kalender bulan tersebut.

---

### 6. Reward & Perhitungan Poin

Quality Score per bulan:
```
Quality Score = (Task Approved / Task Submitted) × 100
```
- Reward bulanan hanya jika Quality Score ≥ 70% DAN ada setidaknya 1 KPI yang dinilai Manager.
- Bonus KPI tercapai: +150 XP (atau +250 jika melampaui target).
- HR bisa lihat breakdown XP tiap orang: sumber poin apa saja, berapa banyak.

---

### 7. Profil Employee (Lengkap)

- Foto, nama, jabatan, departemen, level, rank, total XP, streak saat ini.
- **Tab Logbook:** kalender aktivitas (seperti di atas).
- **Tab KPI:** KPI aktif + historis, status, nilai Manager.
- **Tab Task:** semua task (filter: bulan, status, KPI).
- **Tab Kudos:** semua kudos yang diterima.
- **Tab Attendance:** log kehadiran lengkap (jam masuk/keluar, mode, flag).

---

### 8. Fitur Chat

| Jenis | Keterangan |
|---|---|
| Direct Message | Chat 1-on-1 ke siapa saja yang terdaftar |
| Group Chat | Buat grup dengan anggota pilihan |
| Tim Channel | Channel otomatis per departemen/tim |

Fitur: teks, emoji, attachment (maks 10 MB), reply, read receipt, mention, pin pesan, search riwayat.

---

## BAGIAN 2 — ROLE: MANAGER

> Manager mendapat semua fitur Employee + fitur berikut.

### 1. KPI Management

- Buat KPI per orang atau per tim, bisa multi-item dalam satu form.
- Tutup / selesaikan KPI di akhir periode + beri nilai.
- Lihat KPI Mandiri employee (bisa ikut me-review).
- Lihat target semua divisi, tidak hanya timnya sendiri.

### 2. Approval Task

- Dashboard antrian task pending approval dari seluruh anggota tim.
- Approve / Revisi (dengan catatan) / Tolak (dengan alasan).
- Semua keputusan tercatat lengkap → terlihat oleh Employee dan HR.

### 3. Weekly & Monthly Review

- Setiap Jumat malam, AI-generated summary per anggota tim sudah tersimpan di DB.
- Manager membaca → menulis catatan penilaian mingguan → simpan.
- Di akhir bulan: nilai KPI tercapai/tidak, tutup KPI.

### 4. Dashboard Tim

- Status semua anggota tim saat ini (dari Presence Board, difilter by tim).
- Alert: anggota tidak aktif 2+ hari, mood sangat rendah 3 hari berturut-turut.
- Lihat target semua divisi.

### 5. GROW Coaching 1-on-1

- Modal coaching dengan AI assistant berbasis model GROW.
- Hasil sesi tersimpan di profil employee.
- Notifikasi ke employee saat sesi dijadwalkan.

### 6. Chat (Extended)

- Semua fitur chat Employee.
- Pengumuman ke Tim sendiri.
- Pengumuman ke semua Manager (lintas divisi).
- Pengumuman ke divisi lain (lintas divisi).

---

## BAGIAN 3 — ROLE: HR

> HR mendapat semua fitur Employee + fitur berikut.

### 1. Survey Management

#### Buat Survey
```
Judul, Deskripsi, Deadline
Target Audiens: Seluruh Perusahaan / Departemen Tertentu / Individu Tertentu
Tampilkan ke: ☑ Employee  ☑ Manager  ☑ HR  (semua bisa kena survey)
```

#### Tipe Pertanyaan
| Tipe | Keterangan |
|---|---|
| Yes / No | Biner |
| Multiple Choice | 2–6 opsi |
| Rating Scale | 1–5 atau 1–10 |
| Text Singkat | Maks 200 karakter |
| Text Panjang | Maks 1000 karakter |
| Ranking | Urutkan pilihan |

- Preview sebelum publish.
- Analitik hasil: chart per pertanyaan, export CSV/PDF.

### 2. Attendance Log

- Lihat log semua karyawan, filter by user / departemen / rentang tanggal.
- Setiap entri: tanggal, clock-in, clock-out, durasi, mode (WFO/WFH), keterangan izin/sakit, flag.
- Log disimpan permanen, tidak ada cutoff hapus otomatis.
- Export Excel/CSV untuk payroll atau audit.

### 3. Users & Departemen Management

```
Departemen: Product
  ├── Ahmad Fauzi     → [Lihat Profil Lengkap]
  ├── Budi Santoso    → [Lihat Profil Lengkap]
  └── Citra Lestari   → [Lihat Profil Lengkap]
```

#### Profil Detail dari Sisi HR
Semua tab profil Employee + tambahan:
- **Tab Logbook** — kalender aktivitas + rangkuman mingguan AI.
- **Tab Laporan Bulanan** — KPI status, nilai Manager, mood trend.
- **Tab Penilaian Manager** — catatan mingguan/bulanan dari Manager.
- **Tab Catatan HR Internal** — catatan privat HR (tidak terlihat employee).

### 4. Melihat Target Semua Divisi

- KPI semua divisi dan semua orang dalam satu halaman.
- Filter: by departemen, by bulan, by status (active / completed / not achieved).

### 5. Notifikasi HR

- Manager menolak/merevisi task employee (awareness).
- Mood sangat rendah > 3 hari berturut-turut pada seorang employee.
- Response rate survey rendah menjelang deadline.

### 6. Chat (Extended)

- Semua fitur Employee.
- Pengumuman ke seluruh perusahaan.
- Pengumuman per departemen.
- Channel HR-Only (internal).

---

## BAGIAN 4 — STRATEGI TOKEN AI (HEMAT & EFISIEN)

### Prinsip: Generate Once, Serve Many

```
SEKALI PAKAI TOKEN (per user per minggu):
  Setiap Jumat malam (cron job):
    1. Kumpulkan data seminggu dari DB (task, mood, attendance, XP)
    2. Panggil AI → generate 3 output:
         a. Paragraf ringkasan minggu
         b. Kalimat motivasi untuk Senin depan
         c. Catatan perhatian (jika ada anomali)
    3. Simpan semua output ke tabel `ai_weekly_summaries`

SETERUSNYA TANPA TOKEN:
  - Logbook → tampilkan dari DB (no AI call)
  - Notifikasi motivasi Senin → ambil dari DB
  - Dashboard rangkuman → query DB biasa
  - Presence Board → query DB real-time
```

### Kapan AI Dipanggil
| Situasi | Frekuensi | Token |
|---|---|---|
| Weekly summary per user | 1× per minggu (Jumat malam, cron) | Ya |
| GROW Coaching session | Per sesi (dipicu Manager) | Ya |
| Notifikasi motivasi harian | Tidak (ambil dari DB) | Tidak |
| Tampilan logbook | Tidak (dari DB) | Tidak |
| Presence Board | Tidak (query DB) | Tidak |

---

## BAGIAN 5 — ALUR TERINTEGRASI

### Alur Harian
```
08.00 → Clock-in (pilih WFO/WFH) → status = Working
  ↓
Tambah task → pilih KPI / KPI Mandiri → submit
  ↓
Manager review task → Approve / Revisi / Tolak
  ↓
Notifikasi hasil → XP masuk (jika approved)
  ↓
Isi Mood & Energy (siang atau sore)
  ↓
Clock-out → summary otomatis → rating produktivitas
  ↓
Semua data masuk ke Logbook hari itu (otomatis)
```

### Alur Mingguan (Jumat Malam — Cron Job)
```
Sistem kumpulkan data seminggu semua user
  ↓
AI dipanggil sekali per user → output disimpan ke DB
  ↓
Sabtu pagi: notifikasi ke employee "Rangkuman mingguanmu siap"
  ↓
Manager membaca rangkuman → tulis catatan penilaian
  ↓
HR bisa melihat semua rangkuman semua user
```

### Alur Bulanan
```
Akhir bulan: Manager review KPI → nilai + tutup KPI
  ↓
Poin KPI tercapai masuk ke employee (+150 / +250 XP)
  ↓
HR generate laporan engagement bulanan
  ↓
Reward diklaim jika Quality Score ≥ 70%
```

---

## BAGIAN 6 — TABEL DATABASE BARU / DIPERBARUI

| Tabel | Keterangan |
|---|---|
| `notifications` | Notifikasi per user (type, message, is_read) |
| `user_status` | Status kehadiran saat ini per user |
| `attendance_logs` | Clock-in/out + mode + keterangan izin/sakit + flag |
| `ai_weekly_summaries` | Output AI per user per minggu (tersimpan, tidak di-generate ulang) |
| `manager_weekly_notes` | Catatan penilaian mingguan Manager per employee |
| `kpi_items` | Item detail dalam satu KPI (bisa multi per KPI) |
| `kpi_personal` | KPI Mandiri yang dibuat sendiri oleh employee |
| `task_history` | Audit trail perubahan status task |
| `surveys` | Data survey |
| `survey_questions` | Pertanyaan per survey (dengan tipe) |
| `survey_responses` | Jawaban per user per pertanyaan |
| `messages` | Pesan chat |
| `message_channels` | Channel/grup chat |
| `message_channel_members` | Anggota tiap channel |
| `hr_internal_notes` | Catatan privat HR per employee |
| `xp_transactions` | Riwayat transaksi XP (sumber, jumlah, timestamp) |
| `work_calendar` | Hari kerja & libur nasional (untuk hitung streak bulanan) |

---

*Revisi 2 — disesuaikan: streak bulanan berbasis hari kerja, KPI tercapai dapat poin besar, weekly reflection = AI auto Jumat, logbook = kalender otomatis dari task, jam kerja 08.00, strategi hemat token AI, presence board + input sakit.*
