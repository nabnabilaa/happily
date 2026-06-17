# FlowBuddy — Ekstensi Browser Ultra-Lightweight

Ekstensi browser bertema modular & context-aware untuk produktivitas kerja.  
Mengadopsi mental model aplikasi perpesanan, dipadukan dengan sistem akses berbasis peran (RBAC).

## 🚀 Instalasi (Chrome)

1. Buka `chrome://extensions/`
2. Aktifkan **Developer mode** (toggle pojok kanan atas)
3. Klik **Load unpacked**
4. Pilih folder `flowbuddy/`
5. Klik ikon ekstensi di toolbar — popup 380×600 muncul

## 🎭 Role-Based Access (RBAC)

| Role | Tab 1 | Tab 2 | Tab 3 |
|---|---|---|---|
| **Employee** | Tugas | Catatan | Chat |
| **Manager** | Tugas | Approval | Tim & Chat |
| **HR** | Tugas | Kontak | Broadcast & Chat |

Gunakan menu **⋮ → Ganti Role (Demo)** untuk mencoba role lain.

## 🎨 Fitur

- ✅ **Tasks** — Quick-add, toggle selesai dengan bounce animation, progress bar harian
- 📝 **Notes** — Brain-dump textarea dengan auto-save
- 💬 **Chat** — Inbox + chat detail dengan slide transition
- 📋 **Approval** (Manager) — Verifikasi tugas 1-klik dengan confetti
- 👥 **Team Status** (Manager) — Status online/sibuk anggota tim
- 👤 **Contacts** (HR) — Direktori karyawan dengan pencarian
- 📢 **Broadcast** (HR) — Kirim pengumuman ke seluruh karyawan
- 🌙 **Dark Mode** — Toggle manual, disimpan di localStorage
- 🔥 **Daily Streak** — Gamifikasi ringan
- 🎉 **Confetti & Sparkles** — Micro-interactions saat task selesai / approve

## 🏗 Struktur File

```
flowbuddy/
├── manifest.json       ← Manifest v3 (popup-based)
├── popup.html          ← Main popup UI
├── background.js       ← Service worker (alarm, notifikasi)
├── css/
│   ├── tokens.css      ← Design system variables + dark mode
│   ├── layout.css      ← Header, footer, content area
│   ├── components.css  ← Cards, badges, bubbles, buttons
│   └── animations.css  ← Micro-interactions, confetti
├── js/
│   ├── app.js          ← Main orchestrator
│   ├── rbac.js         ← Role-based access control
│   ├── theme.js        ← Dark mode toggle
│   ├── views/
│   │   ├── tasks.js    ← Quick-add, toggle, confetti
│   │   ├── notes.js    ← Brain-dump textarea
│   │   ├── chat.js     ← Inbox + chat detail
│   │   ├── approval.js ← Manager: verify tasks
│   │   ├── team.js     ← Manager: team status
│   │   ├── contacts.js ← HR: people directory
│   │   └── broadcast.js← HR: announcements
│   └── utils/
│       ├── greeting.js ← Dynamic time-based greeting
│       └── confetti.js ← Confetti & sparkle effects
└── icons/              ← Extension icons
```

## 🔗 Web Dashboard

Fitur berat (Timer, OKR, Laporan, Kalender penuh) tersedia di:  
**https://happily-flowbuddy.vercel.app/**

Akses via menu **⋮ → Buka Web Dashboard Lengkap** di ekstensi.
