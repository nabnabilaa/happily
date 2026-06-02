import mysql from 'mysql2/promise';
import { marked } from 'marked';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrateNotes() {
  console.log("Menyambungkan ke database untuk migrasi notes...");
  const pool = mysql.createPool({
    uri: process.env.MYSQL_URI,
    waitForConnections: true,
  });

  try {
    const [rows] = await pool.query('SELECT id, content FROM notes');
    const notes = rows as any[];
    
    console.log(`Ditemukan ${notes.length} catatan. Memulai konversi...`);

    let updatedCount = 0;
    for (const note of notes) {
      if (!note.content) continue;
      
      // Jika content sudah berupa HTML (ada tag HTML dasar), kita skip saja
      // Tapi kita cek yang kelihatannya markdown (ada #, *, -, dll)
      const hasHtml = /<\/?[a-z][\s\S]*>/i.test(note.content);
      
      // Karena kita baru saja pasang TinyMCE, kebanyakan konten lama belum punya HTML tag yang valid
      // Kita akan convert content-nya
      if (!hasHtml) {
        // Konversi markdown ke HTML
        // Gunakan fungsi sync parse dari marked
        const htmlContent = marked.parse(note.content, { async: false });
        
        await pool.query('UPDATE notes SET content = ? WHERE id = ?', [htmlContent, note.id]);
        updatedCount++;
      }
    }
    
    console.log(`✅ Selesai! Berhasil mengonversi ${updatedCount} catatan dari Markdown ke HTML.`);

  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  } finally {
    process.exit(0);
  }
}

migrateNotes();
