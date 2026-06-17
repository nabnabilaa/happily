# Spesifikasi UI/UX & Perintah Implementasi — Ekstensi FlowBuddy

Dokumen ini merapikan seluruh hasil analisa UI/UX FlowBuddy (struktur navigasi, sistem desain, RBAC, pembagian fitur, dark mode) menjadi satu spesifikasi yang konsisten, lalu menutup dengan perintah implementasi siap pakai untuk AI Agent / Developer.

---

## 1. Ringkasan
FlowBuddy adalah ekstensi peramban bertema modular & context-aware, mengadopsi mental model aplikasi perpesanan, dipadukan dengan sistem akses berbasis peran (RBAC). Arah pengembangan terbaru mengubah ekstensi menjadi **ultra-lightweight**: fitur berat (Timer, OKR, Laporan, Kalender penuh) dipindah ke Web App utama, sementara ekstensi murni fokus pada aksi cepat (tugas, catatan, chat, approval, direktori).

Gaya visual menyasar keseimbangan **Fun & Happy** namun tetap **Professional**, dicapai lewat tipografi membulat, sudut *rounded*, *micro-interaction* bertema "dopamine hit" kecil, dan palet warna yang didominasi netral dengan aksen cerah secukupnya.

---

## 2. Struktur & Alur Navigasi
*   **Inbox View:** Daftar kontak dengan *preview* pesan terakhir, stempel waktu, *badge* notifikasi belum terbaca.
*   **Chat View:** Ruang obrolan detail, tombol kembali, kolom input di area bawah.
*   **Navigasi Adaptif:** Menu bawah otomatis menyesuaikan peran pengguna, mengurangi *cognitive load*.

---

## 3. Sistem Desain Visual

### 3.1 Tipografi & Ikonografi
*   **Font utama:** Nunito (rounded, bersahabat).
*   **Ikon:** SVG minimalis, *stroke-width* konsisten 2px.
*   **Avatar kontak tanpa foto:** Bentuk lingkaran dengan warna latar variatif (*rose, emerald, indigo*).
*   **Chat bubble:** Sudut asimetris — pesan masuk abu-abu terang, pesan keluar biru muda.
*   **Sudut elemen:** (Kartu, tombol, *bubble*): `border-radius: 12–16px`, hindari sudut tajam.
*   **Bayangan:** *Soft drop shadow*, hindari *border* keras; sedikit *glassmorphism* pada *header/dropdown*.

### 3.2 Palet Warna (Final)
*Netral / Kanvas (≈60% area):*

| Elemen | Warna |
| :--- | :--- |
| Background utama | `#F8FAFC` (Slate 50) |
| Background kartu | `#FFFFFF` |
| Teks utama | `#334155` (Slate 700) |
| Teks sekunder | `#64748B` (Slate 500) |

*Warna per role (≈30% area — header, ikon aktif, bubble keluar):*

| Role | Primary | Soft Background |
| :--- | :--- | :--- |
| **Employee** | `#3B82F6` (Vibrant Blue) | `#DBEAFE` |
| **Manager** | `#4F46E5` (Deep Indigo) | `#E0E7FF` |
| **HR** | `#8B5CF6` (Happy Purple) | `#EDE9FE` |

*Aksen fun (≈10% area — CTA, badge, status):*

| Fungsi | Warna | Background |
| :--- | :--- | :--- |
| **Sukses / Selesai / Approve** | `#22C55E` (Emerald) | `#DCFCE7` |
| **Urgent / Streak / Prioritas** | `#F59E0B` atau `#FB923C` | — |
| **Hapus / Peringatan** | `#EF4444` (Coral Red) | `#FEE2E2` |

### 3.3 Aturan Komposisi
Gunakan rasio **60% netral – 30% warna role – 10% aksen fun** agar tampilan tetap profesional namun tidak monoton. Implementasikan seluruh warna sebagai CSS variables (`var(--primary-color)`, dst.) agar pergantian tema role ↔ dark mode terjadi instan tanpa *reload*.

---

## 4. Sistem RBAC (Role-Based Access)
UI tidak sekadar menonaktifkan fitur yang tidak relevan, melainkan menyembunyikannya total dan mengganti tema visual secara menyeluruh.

| Peran | Aksen | Menu Tambahan | Fokus Visibilitas |
| :--- | :--- | :--- | :--- |
| **Employee** | Vibrant Blue | (Menu fundamental) | OKR individu, tugas pribadi |
| **Manager** | Deep Indigo | Tim | *Team overview*, validasi tugas |
| **HR** | Happy Purple | People | *Company metrics*, laporan makro |

*Label status role (`EMPLOYEE`, dst.) ditampilkan di header dengan huruf kapital 10px.*

---

## 5. Pembagian Fitur per Role (Ultra-Lightweight)

### Employee
*   **Dipertahankan di ekstensi:** Tasks (*quick-add* & centang), Notes (*brain-dump*), Chat.
*   **Dipindah ke Web App:** Timer (dihapus total), OKR individual (jadi tombol link), Calendar (jadi notifikasi pengingat saja).

### Manager
*   **Dipertahankan di ekstensi:** Tasks & Notes, Verify Tasks (approval 1-klik), Team Status (mini status online/sibuk + Chat).
*   **Dipindah ke Web App:** Timer (dihapus total), seluruh modul OKR & evaluasi tim.

### HR
*   **Dipertahankan di ekstensi:** Tasks & Notes, People Search (direktori mini), Quick Broadcast (pengumuman via Chat).
*   **Dipindah ke Web App:** Timer (dihapus total), Company Metrics & laporan OKR, Full People Overview (demi privasi).

---

## 6. Tata Letak Navigasi Bawah

| Role | Tab 1 | Tab 2 | Tab 3 |
| :--- | :--- | :--- | :--- |
| **Employee** | Tugas | Catatan | Chat |
| **Manager** | Tugas | Approval | Tim & Chat |
| **HR** | Tugas | Kontak | Broadcast & Chat |

*Akses fitur lengkap (OKR, Laporan, Kalender penuh) ditaruh di ikon ⚙️ Settings pojok kanan atas header → dropdown "Buka Web Dashboard Lengkap".*

---

## 7. Mode Gelap (Dark Mode — Toggle Manual)
Gunakan atribut data (`data-theme="dark"`) pada `<html>`, bukan deteksi otomatis `prefers-color-scheme`, dan simpan preferensi di `localStorage` (atau `chrome.storage` bila perlu sinkron antar perangkat) agar tidak *white-flash* saat ekstensi dibuka ulang.

```css
:root {
  --bg-main: #F8FAFC;
  --bg-card: #FFFFFF;
  --text-primary: #334155;
  --color-role-employee: #3B82F6;
  --border-light: #E2E8F0;
  --transition-speed: 0.3s;
}

[data-theme="dark"] {
  --bg-main: #0F172A;
  --bg-card: #1E293B;
  --text-primary: #F1F5F9;
  --color-role-employee: #60A5FA;
  --border-light: rgba(255, 255, 255, 0.1);
}

body {
  background-color: var(--bg-main);
  color: var(--text-primary);
  transition: background-color var(--transition-speed) ease, color var(--transition-speed) ease;
}

#theme-toggle {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

#theme-toggle:hover {
  background-color: rgba(100, 116, 139, 0.1);
  transform: scale(1.1) rotate(15deg);
}

#theme-toggle:active {
  transform: scale(0.9);
}
```

```javascript
const themeToggleBtn = document.getElementById('theme-toggle');
const rootElement = document.documentElement;

const savedTheme = localStorage.getItem('flowbuddy-theme');
if (savedTheme === 'dark') {
  rootElement.setAttribute('data-theme', 'dark');
  updateButtonUI('dark');
}

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = rootElement.getAttribute('data-theme');
  if (currentTheme === 'dark') {
    rootElement.removeAttribute('data-theme');
    localStorage.setItem('flowbuddy-theme', 'light');
    updateButtonUI('light');
  } else {
    rootElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('flowbuddy-theme', 'dark');
    updateButtonUI('dark');
  }
});

function updateButtonUI(theme) {
  themeToggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
}
```

---

## 8. Micro-interactions, Gamifikasi & Tone of Voice
*   **Checkmark animation:** *Bounce*/coret halus saat tugas dicentang selesai.
*   **Mini confetti/sparkles:** Muncul ±1 detik saat Manager menekan *Approve* atau seluruh *to-do* harian selesai.
*   **Hover state hidup:** Tombol membesar (`scale(1.05)`) dengan transisi *spring*, bukan sekadar ganti warna.
*   **Sapaan personal di header:** Dinamis sesuai waktu, contoh: "Pagi yang produktif, Budi! ☀️" alih-alih label statis "Dashboard".
*   **Empty state menyenangkan:** Ilustrasi ramah (clay 3D minimalis/vektor) + *copy* positif, contoh: Inbox kosong → "Hore! Inbox zero. Saatnya ambil nafas sejenak ☕." Tugas kosong → "Kamu sudah menyelesaikan semuanya! Nikmati sisa harimu."
*   **Gamifikasi ringan:** Ikon api 🔥 + angka di pojok profil untuk *daily streak*; *progress bar to-do* harian yang berubah abu-abu → hijau cerah saat 100%.
*   **Emoji secukupnya:** Pada *toast notification*, contoh: "✅ Tugas berhasil disetujui!", "🎉 Semua beres!" — jangan berlebihan.

---

## 9. Rekomendasi Perbaikan (Belum Diimplementasi)
*   Ganti `display: none` antar Inbox/Chat dengan animasi *sliding* kiri-kanan.
*   Pastikan setiap tab navigasi bawah benar-benar memicu perubahan konten di area utama (bukan dekoratif).
*   Tambahkan `aria-label/title` pada tombol ikon (mis. tombol "Back") untuk *screen reader*.
*   Rancang *empty state* ilustratif untuk Inbox kosong dan Tugas kosong (lihat bagian 8).

---

## 10. Perintah Implementasi untuk Claude
Gunakan blok berikut sebagai *prompt* langsung ke Claude (misalnya di Claude Code) untuk mengeksekusi spesifikasi di atas.

```text
Implementasikan ekstensi browser "FlowBuddy" sesuai spesifikasi berikut. Bekerja secara bertahap dan konfirmasikan setiap tahap besar sebelum lanjut ke tahap berikutnya.

KONTEKS PROJECT
- Ekstensi peramban (manifest v3), arsitektur ultra-lightweight.
- Web App utama terpisah menampung fitur berat (Timer, OKR, Laporan, Kalender penuh) — ekstensi hanya menyediakan tombol/link ke sana.
- 3 role pengguna: Employee, Manager, HR — masing-masing punya tema warna dan menu berbeda.

TAHAP 1 — DESIGN SYSTEM
- Buat CSS variables untuk warna netral, warna per role, dan warna aksen fun sesuai tabel di bagian 3.2.
- Terapkan font Nunito, border-radius 12-16px pada kartu/tombol/bubble, soft shadow.
- Siapkan struktur tema dark mode lewat atribut [data-theme="dark"] (bukan prefers-color-scheme), lihat bagian 7.

TAHAP 2 — NAVIGASI & LAYOUT
- Bangun Inbox View (list kontak + preview + timestamp + badge unread) dan Chat View (header, area pesan, input bawah, tombol back).
- Bangun bottom navigation yang berubah sesuai role:
  - Employee: Tugas | Catatan | Chat
  - Manager: Tugas | Approval | Tim & Chat
  - HR: Tugas | Kontak | Broadcast & Chat
- Pastikan setiap tab benar-benar mengganti konten area utama (bukan tampil/sembunyi statis tanpa state management).
- Tambahkan ikon ⚙️ Settings di header kanan atas → dropdown "Buka Web Dashboard Lengkap" (link keluar ke Web App).

TAHAP 3 — FITUR PER ROLE
- Employee: Tasks (quick-add, toggle selesai), Notes (input bebas/brain-dump), Chat.
- Manager: semua fitur Employee + Verify Tasks (approve 1-klik) + Team Status (status online/sibuk anggota tim).
- HR: semua fitur Employee + People Search (direktori mini, search by nama) + Quick Broadcast (kirim pengumuman lewat Chat).
- Jangan render fitur role lain sama sekali di DOM (bukan hanya disembunyikan via CSS).

TAHAP 4 — MICRO-INTERACTIONS
- Animasi checkmark (bounce) saat tugas selesai.
- Confetti/sparkles ringan (±1 detik) saat Approve ditekan atau semua tugas harian selesai.
- Hover state tombol: scale(1.05) dengan easing spring.
- Toggle dark mode: rotasi/scale icon saat hover & klik, simpan preferensi ke localStorage, load preferensi sebelum render pertama untuk mencegah white-flash.

TAHAP 5 — TONE OF VOICE & EMPTY STATES
- Sapaan header dinamis berdasarkan waktu dan nama user.
- Empty state untuk Inbox kosong dan Tugas kosong, masing-masing dengan ilustrasi ringan + copy positif (lihat bagian 8 untuk contoh teks).
- Gunakan emoji secukupnya pada notifikasi toast, jangan berlebihan.

TAHAP 6 — AKSESIBILITAS & POLISH
- Tambahkan aria-label/title pada semua tombol ikon (terutama tombol "Back").
- Pastikan kontras warna teks vs background memenuhi standar AA.
- Ganti transisi Inbox↔Chat dari display:none menjadi slide transition kiri/kanan.

OUTPUT YANG DIHARAPKAN
- Struktur file ekstensi (manifest.json, popup/sidepanel HTML, CSS, JS) yang modular per role.
- Implementasi CSS variables yang memudahkan pergantian tema role dan dark mode tanpa reload.
- Tidak ada fitur berat (Timer, OKR, Laporan, Kalender penuh) yang ter-render di ekstensi — hanya link ke Web App.
```
