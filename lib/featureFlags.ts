/**
 * Saklar alur, bukan saklar peran.
 *
 * Dipakai untuk mematikan satu bagian alur sementara tanpa menghapus kodenya —
 * jadi menyalakannya kembali cukup mengubah satu baris di sini, bukan
 * membongkar ulang komponen yang tersebar.
 */

/**
 * Status "Menunggu review" pada kartu task karyawan.
 *
 * Dimatikan untuk alur employee yang berfokus personal: menunggu keputusan
 * atasan bukan hal yang bisa ditindaklanjuti si karyawan, dan menampilkannya
 * mengubah layar yang seharusnya bercerita tentang progres dirinya menjadi
 * papan antrean birokrasi.
 */
export const SHOW_EMPLOYEE_PENDING_REVIEW = false;

/**
 * HASIL review yang menuntut tindakan: "Revisi" dan "Ditolak", berikut catatan
 * dari manajer.
 *
 * Ini SENGAJA menyala meski status "menunggu" disembunyikan, dan alasannya
 * bukan soal transparansi melainkan soal jujur pada konsekuensi: penolakan
 * mengembalikan task menjadi belum-selesai DAN menarik kembali poin yang sudah
 * dibayar (lihat `reversePoints` di lib/taskReview.ts). Tanpa penanda ini,
 * yang dialami karyawan adalah task yang tiba-tiba mundur sendiri dan poin yang
 * hilang tanpa sebab yang terlihat di mana pun — notifikasinya mudah terlewat,
 * kartunya tidak berkata apa-apa.
 *
 * Bereskan dulu penarikan poinnya kalau ini mau dimatikan.
 */
export const SHOW_EMPLOYEE_REVIEW_OUTCOME = true;
