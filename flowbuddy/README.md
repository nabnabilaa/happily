# Flowbuddy Extension

## 📂 Struktur Proyek yang Baru

Karena file `content.js` sebelumnya sangat besar (7600+ baris), kode tersebut kini telah dipecah (*refactored*) menjadi beberapa modul kecil di dalam folder **`src/`** agar jauh lebih rapi dan mudah untuk dikembangkan.

Jika Anda ingin mengubah kode logika Flowbuddy, **jangan edit `content.js` secara langsung!**
Silakan edit file-file yang ada di dalam folder `src/` (misalnya `src/11-tasks.js` untuk fitur tugas, `src/13-notes.js` untuk fitur catatan, dll).

## 🚀 Cara Build (Menyatukan Kode)

Setelah Anda selesai mengedit file di dalam `src/`, Anda perlu menyatukannya kembali menjadi file `content.js` tunggal agar bisa dibaca oleh browser.

Cukup buka terminal/CMD di dalam folder `flowbuddy` ini, lalu jalankan perintah:

```bash
node build.js
```

Perintah di atas akan secara otomatis menggabungkan seluruh file `src/` sesuai urutan dan menulis ulang file `content.js` yang siap pakai. Setelah itu, buka browser Anda dan klik tombol **Reload / Refresh** ekstensi di halaman `chrome://extensions`.

Selamat mengembangkan fitur baru! 🐝
