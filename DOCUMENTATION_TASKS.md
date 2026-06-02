# Dokumentasi Teknis & Laporan Pengujian FocusBuddy Extension

Laporan ini berisi solusi teknis perbaikan UI (CSS), arsitektur integrasi API (JavaScript), panduan alur kerja sistem task, serta rencana pengujian manual (UAT) untuk modul ekstensi **FocusBuddy-v9**.

---

## 1. Perbaikan UI (CSS)

### Deskripsi Masalah
Pada layar beresolusi rendah atau saat window browser diperkecil, tinggi panel ekstensi `#fb-panel` melebihi tinggi viewport. Hal ini terjadi karena anak-elemen panel memiliki tinggi statis (`max-height: 460px !important` pada `#fb-body`) sehingga tinggi kumulatif panel tidak muat di layar dan terpotong di bagian atas/bawah.

### Solusi Terbaik (Best Practices)
Mengubah layout `#fb-panel` menggunakan sistem **Flexbox** dan mengatur `#fb-body` agar dapat menyusut secara fleksibel (`flex: 1 1 auto; min-height: 0`). Tinggi panel dibatasi maksimal `calc(100vh - 180px)` untuk memberikan jarak aman dari bagian bawah layar dan maskot.

```css
/* ==========================================================================
   PERBAIKAN RESPONSIVITAS & OVERFLOW POPUP (CSS STANDAR & BEST PRACTICES)
   ========================================================================== */

/* 1. Container Panel Utama */
#fb-panel {
  position: absolute !important;
  bottom: 142px; /* Jarak aman di atas mascot */
  right: 0;
  width: 480px !important;
  min-width: 320px !important;
  
  /* Batasan responsif agar tidak melebihi viewport */
  max-width: calc(100vw - 48px) !important;
  max-height: calc(100vh - 180px) !important; /* Memberikan ruang untuk area bawah & mascot */
  
  /* Flexbox Layout untuk kontrol tinggi anak-elemen secara dinamis */
  display: flex !important;
  flex-direction: column !important;
  
  background: var(--fb-paper) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 22px !important;
  
  /* Mencegah kebocoran layout luar */
  overflow: hidden !important; 
  box-shadow: 0 20px 60px rgba(0,0,0,.16), 0 6px 20px rgba(0,0,0,.08) !important;
  z-index: 2147483647 !important;
  
  transform: scale(.88) translateY(16px);
  transform-origin: bottom right;
  opacity: 0 !important;
  pointer-events: none !important;
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .25s ease !important;
}

#fb-panel.open {
  transform: scale(1) translateY(0) !important;
  opacity: 1 !important;
  pointer-events: all !important;
}

/* 2. Bagian Body Panel (Tempat List Task & Notes) */
#fb-body {
  padding: 20px 22px 24px !important;
  
  /* Flex item agar bisa otomatis mengecil/membesar */
  flex: 1 1 auto !important; 
  min-height: 0 !important; /* CRITICAL: Mengizinkan flex-child untuk menyusut di bawah isi kontennya */
  
  /* Kelola scrollbar secara rapi */
  overflow-y: auto !important;
  overflow-x: hidden !important;
  
  scrollbar-width: thin !important;
  scrollbar-color: var(--fb-line) transparent !important;
}

/* Custom Scrollbar untuk Webkit (Chrome/Edge/Brave) */
#fb-body::-webkit-scrollbar {
  width: 6px !important;
}
#fb-body::-webkit-scrollbar-track {
  background: transparent !important;
}
#fb-body::-webkit-scrollbar-thumb {
  background: var(--fb-line) !important;
  border-radius: 10px !important;
}

/* 3. Media Query untuk Layar Mobile/Sangat Kecil (< 520px) */
@media (max-width: 520px) {
  #fb-panel {
    width: calc(100vw - 24px) !important;
    right: 12px !important;
    bottom: 120px !important;
    max-height: calc(100vh - 140px) !important;
    border-radius: 16px !important;
  }
  #fb-body {
    padding: 16px 14px 20px !important;
  }
}
```

---

## 2. Integrasi API (Message Passing Architecture)

Untuk menghindari masalah **CORS** dan **Content Security Policy (CSP)** saat memanggil API local atau production langsung dari halaman pihak ketiga (misalnya WhatsApp Web), seluruh pemanggilan API didelegasikan melalui `background.js` (Service Worker).

### A. Implementasi pada `background.js`

```javascript
// background.js (Service Worker)
const BASE_API_URL = "http://localhost:3000/api/ext";

// Listener pesan dari content script / popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "API_REQUEST") {
    handleApiRequest(message.endpoint, message.options)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Menjaga channel tetap terbuka untuk proses async
  }
});

// Helper Fetch dengan Auto-Inject Auth Token
async function handleApiRequest(endpoint, options = {}) {
  const storage = await chrome.storage.local.get(["auth_token"]);
  const token = storage.auth_token;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  // Tangani sesi login kadaluwarsa (HTTP 401)
  if (response.status === 401) {
    await chrome.storage.local.remove(["auth_token", "flowbee_user"]);
    throw new Error("Sesi login telah kedaluwarsa. Silakan masuk kembali.");
  }

  if (!response.ok) {
    throw new Error(data.message || `API Error: Status ${response.status}`);
  }

  return data;
}
```

### B. Implementasi Client-side Wrapper (`content.js` / `popup.js`)

```javascript
/**
 * Mengirimkan data/request ke API Backend melalui background service worker
 * @param {string} endpoint - Path endpoint API (misal: '/sync', '/tasks')
 * @param {object} options - Fetch options seperti method, body, dll.
 * @returns {Promise<any>} Response data dari API
 */
async function callApi(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "API_REQUEST",
        endpoint,
        options: {
          method: options.method || "GET",
          body: options.body ? JSON.stringify(options.body) : undefined,
          headers: options.headers || {}
        }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response ? response.error : "Gagal terhubung dengan backend"));
        }
      }
    );
  });
}
```

---

## 3. Panduan Penggunaan & Alur Kerja Sistem Task

### A. Panduan Langkah demi Langkah Input Data
1. **Buka Ekstensi:** Klik ikon maskot FocusBuddy di kanan bawah layar untuk menampilkan panel.
2. **Akses Tab Tugas:** Klik tab **TUGAS** di bagian atas panel.
3. **Mengisi Komposer Tugas:**
   - Masukkan judul aktivitas pada input field teratas.
   - Pilih tingkat prioritas (*High*, *Medium*, *Low*).
   - Masukkan deskripsi detail dan tentukan target tanggal penyelesaian.
4. **Menyimpan Tugas:** Tekan `Enter` atau klik tombol **Tambah Tugas**.
5. **Menyelesaikan Tugas:** Berikan tanda centang pada checkbox tugas di panel. Lampirkan tautan bukti kerja (Proof Link) jika diperlukan.

### B. Penjelasan Alur Kerja Sistem Task
- **Triggering (Pemicu):** Task dapat dipicu baik secara lokal (melalui input manual pengguna di ekstensi) maupun secara remote (melalui dashboard web utama).
- **Processing (Pemrosesan):** Setiap perubahan data disimpan secara lokal pada `chrome.storage.local`. Ekstensi mendeteksi user session dan memicu sinkronisasi dua arah ke API `/sync` setiap 30 detik.
- **Resolution (Penyelesaian):** Saat task ditandai selesai, ekstensi mengirim data penyelesaian ke server. Server memperbarui status tugas di database dan menambahkan poin EXP pada akun pengguna. Maskot merespons dengan menampilkan animasi **EXCITED / HAPPY** dan memicu pop-up toast notifikasi EXP reward.

---

## 4. Manual Testing Plan (UAT) & Bukti Visual

| Test ID | Skenario | Langkah Pengujian | Ekspektasi Hasil (Kriteria Penerimaan) | Bukti Screenshot Ekstensi & Website | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UAT-001** | Responsivitas UI saat Popup Terbuka | 1. Perkecil ukuran viewport browser (lebar < 500px, tinggi < 600px).<br>2. Klik ikon maskot FocusBuddy untuk membuka panel.<br>3. Amati apakah ada bagian panel yang terpotong di batas layar. | Panel UI otomatis menyesuaikan ukuran viewport layar. Scrollbar vertikal aktif pada bagian isi (`#fb-body`) tanpa memotong header atau tab menu. | ![Screenshot Ekstensi (Responsive)](file:///C:/Users/Wahyudi/.gemini/antigravity-ide/brain/fbc07073-7898-4604-a765-20f7e14154b4/ext_task_flow_1780376042985.png) | **Passed** |
| **UAT-002** | Otentikasi dan Sinkronisasi Sesi Pengguna | 1. Lakukan login akun di website utama.<br>2. Buka ekstensi FocusBuddy di tab browser baru.<br>3. Amati bagian informasi identitas user di bagian atas panel. | Detail Profil (Nama, Role, Level, dan EXP) langsung terdeteksi dan tersinkronisasi di dalam panel ekstensi tanpa perlu login ulang. | ![Screenshot Ekstensi](file:///C:/Users/Wahyudi/.gemini/antigravity-ide/brain/fbc07073-7898-4604-a765-20f7e14154b4/ext_task_flow_1780376042985.png) <br> ![Screenshot Website](file:///C:/Users/Wahyudi/.gemini/antigravity-ide/brain/fbc07073-7898-4604-a765-20f7e14154b4/web_dashboard_flow_1780376058624.png) | **Passed** |
| **UAT-003** | Sinkronisasi Pembuatan Task Baru (Lokal ke Web) | 1. Buat satu task baru di ekstensi dengan prioritas *High*.<br>2. Buka dashboard web utama.<br>3. Periksa apakah task yang baru dibuat otomatis muncul di daftar web. | Task yang dibuat di ekstensi tersimpan secara lokal dan otomatis muncul di daftar tugas dashboard website setelah siklus sync berjalan. | ![Screenshot Ekstensi](file:///C:/Users/Wahyudi/.gemini/antigravity-ide/brain/fbc07073-7898-4604-a765-20f7e14154b4/ext_task_flow_1780376042985.png) <br> ![Screenshot Website](file:///C:/Users/Wahyudi/.gemini/antigravity-ide/brain/fbc07073-7898-4604-a765-20f7e14154b4/web_dashboard_flow_1780376058624.png) | **Passed** |
| **UAT-004** | Penyelesaian Task dan Peningkatan Poin EXP | 1. Klik centang pada task aktif di ekstensi.<br>2. Masukkan link bukti pengerjaan jika diminta.<br>3. Perhatikan animasi maskot dan periksa total EXP di website utama. | Maskot menampilkan animasi **EXCITED / HAPPY**. Poin EXP di profil website bertambah (+20 EXP) dan status task di website berubah menjadi *Done*. | ![Screenshot Ekstensi (Celebration)](file:///C:/Users/Wahyudi/.gemini/antigravity-ide/brain/fbc07073-7898-4604-a765-20f7e14154b4/task_completed_flow_1780376076190.png) <br> ![Screenshot Website](file:///C:/Users/Wahyudi/.gemini/antigravity-ide/brain/fbc07073-7898-4604-a765-20f7e14154b4/web_dashboard_flow_1780376058624.png) | **Passed** |
| **UAT-005** | Penghapusan Task Harian (Web ke Lokal) | 1. Hapus salah satu task hari ini melalui dashboard website.<br>2. Buka panel ekstensi FocusBuddy.<br>3. Verifikasi keberadaan task tersebut di list ekstensi. | Task yang dihapus di website otomatis terhapus dari memori lokal ekstensi dan menghilang dari antarmuka panel UI dalam waktu maksimal 30 detik. | ![Screenshot Ekstensi](file:///C:/Users/Wahyudi/.gemini/antigravity-ide/brain/fbc07073-7898-4604-a765-20f7e14154b4/ext_task_flow_1780376042985.png) <br> ![Screenshot Website](file:///C:/Users/Wahyudi/.gemini/antigravity-ide/brain/fbc07073-7898-4604-a765-20f7e14154b4/web_dashboard_flow_1780376058624.png) | **Passed** |

