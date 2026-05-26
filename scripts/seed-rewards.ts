import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seedRewards() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  try {
    const conn = await pool.getConnection();
    console.log("Clearing old rewards...");
    await conn.query("DELETE FROM rewards");

    console.log("Seeding dummy rewards...");

    const dummyRewards = [
      { title: 'Tumbler Eksklusif Flowbee', cost: 500, category: 'Merchandise', glyph: 'star', desc: 'Tumbler stainless steel tahan panas dan dingin dengan logo perusahaan.', stock: 50 },
      { title: 'Voucher GoFood Rp 50.000', cost: 1000, category: 'Voucher', glyph: 'gift', desc: 'Voucher digital GoFood senilai 50 ribu rupiah.', stock: 100 },
      { title: 'Tiket Nonton Cinema XXI', cost: 1500, category: 'Voucher', glyph: 'ticket', desc: 'Satu buah tiket nonton gratis di seluruh jaringan Cinema XXI.', stock: 30 },
      { title: 'Hoodie Perusahaan DX', cost: 2500, category: 'Merchandise', glyph: 'shirt', desc: 'Hoodie nyaman dan stylish khusus untuk anggota tim Digital Experience.', stock: 20 },
      { title: 'Parkir VIP 1 Bulan', cost: 3000, category: 'Office', glyph: 'car', desc: 'Akses slot parkir VIP di depan lobby kantor selama 1 bulan penuh.', stock: 5 },
      { title: 'Cuti Tambahan 1 Hari', cost: 5000, category: 'Benefit', glyph: 'sun', desc: 'Tambahan kuota cuti tahunan sebanyak 1 hari (memerlukan persetujuan HR).', stock: 10 }
    ];

    for (const r of dummyRewards) {
      const rewardId = `rwd_${uuidv4().substring(0, 8)}`;
      await conn.query(
        `INSERT INTO rewards (id, title, points_cost, category, glyph, description, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [rewardId, r.title, r.cost, r.category, r.glyph, r.desc, r.stock]
      );
    }

    console.log("Rewards seeding completed.");
    conn.release();
  } catch(e) {
    console.error("Failed:", e);
  }
  process.exit(0);
}
seedRewards();
