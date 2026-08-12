/**
 * Siapa yang boleh menyentuh alat vendor.
 *
 * Mode review (lib/anonymize.ts) bukan fitur produk. Ia ada supaya pemilik
 * aplikasi bisa menunjukkan aplikasinya ke pihak luar tanpa memperlihatkan
 * karyawan sungguhan. Perusahaan yang memakai aplikasi ini tidak punya
 * kepentingan apa pun terhadapnya — bagi mereka, tombol yang menyamarkan nama
 * karyawan mereka sendiri hanyalah tombol yang merusak data di layar.
 *
 * Kenapa daftar di environment, bukan peran baru di database:
 *
 *  1. Peran hidup di kolom `users.role`, dan `/api/hr/update-role` mengizinkan
 *     siapa pun ber-akses HR mengubah peran siapa pun. Artinya HR di perusahaan
 *     pelanggan bisa memberi dirinya sendiri peran itu. Hal yang harus berada di
 *     luar jangkauan pelanggan tidak boleh disimpan di tempat yang bisa ditulis
 *     administrator pelanggan.
 *
 *  2. Peran menjalar. Satu peran baru berarti `canHrAdmin`, `canManageTeam`,
 *     TabNav, dan setiap layar yang bercabang berdasarkan peran ikut harus tahu
 *     tentangnya — dan setiap tempat yang lupa adalah satu celah.
 *
 *  3. Peran adalah konsep produk: "orang ini bekerja di sini dan boleh apa".
 *     "Orang ini yang menjual aplikasinya" bukan konsep produk.
 *
 * Environment hanya bisa diubah lewat dashboard hosting. Tidak ada jalur dari
 * dalam aplikasi untuk menambah dirinya sendiri ke daftar ini.
 *
 * Isi dengan id akun, dipisah koma:
 *   REVIEW_MODE_OWNERS=u_db5wroa,u_h0ic18g
 *
 * Kosong berarti tidak ada yang berhak — alat vendornya menghilang sepenuhnya.
 * Itu default yang benar untuk deployment milik pelanggan.
 */

/** Id akun (bukan email: email ikut tersamarkan saat mode review menyala). */
export function reviewModeOwners(): string[] {
  return (process.env.REVIEW_MODE_OWNERS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isReviewModeOwner(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const owners = reviewModeOwners();
  if (!owners.length) return false;
  return owners.includes(String(userId));
}
