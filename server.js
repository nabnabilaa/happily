/**
 * Titik masuk untuk hosting cPanel (Passenger).
 *
 * Vercel menjalankan Next tanpa berkas seperti ini — ia tahu sendiri cara
 * menyalakan aplikasinya. cPanel tidak: "Setup Node.js App" menjalankan SATU
 * berkas yang kita tunjuk sebagai Application startup file, dan berkas itu yang
 * harus menyalakan servernya. Tanpa ini, aplikasi berhenti di layar default
 * Passenger dan tidak ada satu pun route yang terjawab.
 *
 * Cara pakai di cPanel → Setup Node.js App:
 *   Application root        : folder hasil git clone/pull
 *   Application startup file: server.js
 *   Node.js version         : 20.9 ke atas (syarat Next 16)
 *
 * Yang harus sudah terjadi sebelum aplikasi dinyalakan:
 *   npm ci --omit=dev  (atau npm install)
 *   npm run build      → menghasilkan folder .next
 *
 * `.next` TIDAK ikut git (lihat .gitignore), jadi build harus dijalankan di
 * server setiap kali menarik perubahan — atau hasil buildnya diunggah manual.
 * Melewatkan langkah ini adalah penyebab paling sering "server jalan tapi semua
 * halaman 500": kodenya baru, hasil buildnya masih yang lama atau tidak ada.
 */

const http = require("http");
const next = require("next");

// Passenger menentukan port/soket lewat env. Angka 3000 hanya untuk uji manual
// lewat SSH (`node server.js`), bukan nilai yang dipakai di produksi.
const port = process.env.PORT || 3000;

// `dev: false` disebut eksplisit, bukan diturunkan dari NODE_ENV: sebagian
// panel lupa memasang NODE_ENV=production, dan Next yang menyala dalam mode dev
// di server akan mencoba mengompilasi ulang tiap permintaan — lambatnya terbaca
// seperti server yang kelebihan beban, bukan seperti salah konfigurasi.
const app = next({ dev: false });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http.createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`Flowbee siap di port ${port}`);
    });
  })
  .catch((error) => {
    // Kegagalan saat prepare (folder .next hilang, dependensi tidak lengkap)
    // harus mematikan proses, bukan meninggalkan server yang hidup tapi tidak
    // bisa melayani apa pun — Passenger akan mencatat dan menyalakannya ulang.
    console.error("Gagal menyalakan Next:", error);
    process.exit(1);
  });
