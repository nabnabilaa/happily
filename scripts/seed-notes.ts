import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seedNotes() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  try {
    const conn = await pool.getConnection();
    console.log("Seeding notes for user_employee...");

    const empId = "user_employee";
    
    // Clear old dummy notes (if any) to prevent duplicates
    await conn.query(`DELETE FROM notes WHERE user_id = ?`, [empId]);

    const notes = [
      { title: "Follow Up Meeting Klien PT Sinar Abadi", content: "Melakukan diskusi terkait kebutuhan sistem pelaporan penjualan bulanan. Klien meminta penambahan fitur filter berdasarkan wilayah dan kategori produk. Tindak lanjut: tim development melakukan analisis kebutuhan dan estimasi waktu pengerjaan." },
      { title: "Evaluasi Progress Pengembangan Sistem", content: "Progress pengembangan modul autentikasi dan dashboard telah mencapai 80%. Ditemukan beberapa kendala pada integrasi API eksternal. Dibutuhkan proses pengujian tambahan sebelum tahap deployment." },
      { title: "Review Hasil Uji Coba Aplikasi", content: "Pengujian fungsi utama aplikasi berjalan sesuai kebutuhan. Ditemukan bug minor pada fitur pencarian data dan validasi input formulir. Perbaikan dijadwalkan pada sprint berikutnya." },
      { title: "Rencana Implementasi Fitur Baru", content: "Direncanakan penambahan fitur notifikasi otomatis untuk pengguna terkait aktivitas sistem dan pengingat tugas. Tahapan berikutnya adalah pembuatan desain antarmuka dan penyesuaian database." },
      { title: "Monitoring Aktivitas Tim Mingguan", content: "Seluruh anggota tim telah menyelesaikan tugas prioritas minggu ini. Fokus pekerjaan selanjutnya adalah optimalisasi performa aplikasi dan penyempurnaan pengalaman pengguna." },
      { title: "Analisis Kebutuhan Pengguna", content: "Berdasarkan hasil wawancara, pengguna membutuhkan tampilan data yang lebih ringkas dan mudah dipahami. Direkomendasikan penambahan grafik visual serta fitur ekspor laporan." }
    ];

    for (const note of notes) {
      const noteId = `note_${uuidv4().substring(0, 8)}`;
      await conn.query(
        `INSERT INTO notes (id, user_id, title, content, visibility, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'private', 'web', NOW(), NOW())`,
        [noteId, empId, note.title, note.content]
      );
    }

    console.log("Notes seeding completed.");
    conn.release();
  } catch(e) {
    console.error("Failed:", e);
  }
  process.exit(0);
}
seedNotes();
