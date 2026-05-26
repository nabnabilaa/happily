import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seedChat() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  try {
    const conn = await pool.getConnection();
    console.log("Clearing old chat data...");
    await conn.query("DELETE FROM messages");
    await conn.query("DELETE FROM message_channel_members");
    await conn.query("DELETE FROM message_channels");

    console.log("Seeding new chat data for Employee...");

    const hrId = "user_hr";
    const mgrId = "user_manager";
    const empId = "user_employee";

    // 1. Broadcast dari HR (Emp included)
    const broadcastId = `ch_${uuidv4()}`;
    await conn.query(`INSERT INTO message_channels (id, name, type, avatar_emoji) VALUES (?, 'Pengumuman HR', 'broadcast', '📢')`, [broadcastId]);
    await conn.query(`INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?), (?, ?), (?, ?)`, 
      [broadcastId, hrId, broadcastId, mgrId, broadcastId, empId]);
    
    await conn.query(`INSERT INTO messages (id, channel_id, sender_id, content, message_type, created_at) VALUES 
      (?, ?, ?, 'Selamat pagi semuanya, mohon diingat batas pengisian Performance Review Q2 adalah hari Jumat ini pukul 17:00.', 'text', DATE_SUB(NOW(), INTERVAL 2 DAY)),
      (?, ?, ?, 'Bagi yang memiliki sisa cuti tahunan lebih dari 5 hari, harap menjadwalkan cuti bersama manajer masing-masing sebelum akhir bulan.', 'text', DATE_SUB(NOW(), INTERVAL 1 DAY))`,
      [`msg_${uuidv4()}`, broadcastId, hrId, `msg_${uuidv4()}`, broadcastId, hrId]);

    // 2. Group Chat (Product Team - Emp included)
    const groupId = `ch_${uuidv4()}`;
    await conn.query(`INSERT INTO message_channels (id, name, type, avatar_emoji) VALUES (?, 'Tim Produk DX', 'group', '💻')`, [groupId]);
    await conn.query(`INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?), (?, ?)`, 
      [groupId, empId, groupId, mgrId]);
    
    await conn.query(`INSERT INTO messages (id, channel_id, sender_id, content, message_type, created_at) VALUES 
      (?, ?, ?, 'Halo tim, bagaimana progress untuk integrasi API payment gateway hari ini?', 'text', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
      (?, ?, ?, 'Halo Pak Budi, untuk integrasi API sudah mencapai 90%. Saat ini sedang dalam tahap UAT.', 'text', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
      (?, ?, ?, 'Bagus sekali. Tolong kabari saya kalau butuh bantuan terkait akses kredensial production.', 'text', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
      (?, ?, ?, 'Baik Pak, akan segera diupdate setelah UAT selesai sore ini.', 'text', DATE_SUB(NOW(), INTERVAL 2 HOUR))`,
      [
        `msg_${uuidv4()}`, groupId, mgrId, 
        `msg_${uuidv4()}`, groupId, empId, 
        `msg_${uuidv4()}`, groupId, mgrId, 
        `msg_${uuidv4()}`, groupId, empId
      ]);

    // 3. DM Employee to Manager (Emp included)
    const dm1Id = `ch_${uuidv4()}`;
    await conn.query(`INSERT INTO message_channels (id, name, type, avatar_emoji) VALUES (?, 'DM Emp Mgr', 'dm', '')`, [dm1Id]);
    await conn.query(`INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?), (?, ?)`, 
      [dm1Id, empId, dm1Id, mgrId]);
    
    await conn.query(`INSERT INTO messages (id, channel_id, sender_id, content, message_type, created_at) VALUES 
      (?, ?, ?, 'Selamat sore Pak Budi, saya ingin menginfokan bahwa fitur dashboard analitik sudah berhasil dideploy ke staging.', 'text', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
      (?, ?, ?, 'Terima kasih atas updatenya, Sari. Apakah sudah dicoba oleh tim QA?', 'text', DATE_SUB(NOW(), INTERVAL 50 MINUTE)),
      (?, ?, ?, 'Sudah Pak, saat ini tinggal menunggu approval akhir dari tim QA. Jika lancar, besok pagi siap rilis.', 'text', DATE_SUB(NOW(), INTERVAL 10 MINUTE))`,
      [
        `msg_${uuidv4()}`, dm1Id, empId,
        `msg_${uuidv4()}`, dm1Id, mgrId,
        `msg_${uuidv4()}`, dm1Id, empId
      ]);

    // 4. DM Employee to HR (Changed from Mgr to HR, so Emp is included)
    const dm2Id = `ch_${uuidv4()}`;
    await conn.query(`INSERT INTO message_channels (id, name, type, avatar_emoji) VALUES (?, 'DM Emp HR', 'dm', '')`, [dm2Id]);
    await conn.query(`INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?), (?, ?)`, 
      [dm2Id, empId, dm2Id, hrId]);

    await conn.query(`INSERT INTO messages (id, channel_id, sender_id, content, message_type, created_at) VALUES 
      (?, ?, ?, 'Halo Ibu Maya, saya ingin berkonsultasi terkait prosedur pengajuan klaim lembur untuk minggu ini.', 'text', DATE_SUB(NOW(), INTERVAL 2 DAY)),
      (?, ?, ?, 'Halo. Untuk klaim lembur, silakan mengisi form e-Claim yang ada di portal HRD paling lambat tanggal 25 ya.', 'text', DATE_SUB(NOW(), INTERVAL 1 DAY)),
      (?, ?, ?, 'Baik, terima kasih atas informasinya Ibu Maya.', 'text', NOW())`,
      [
        `msg_${uuidv4()}`, dm2Id, empId,
        `msg_${uuidv4()}`, dm2Id, hrId,
        `msg_${uuidv4()}`, dm2Id, empId
      ]);

    console.log("Chat seeding completed.");
    conn.release();
  } catch(e) {
    console.error("Failed:", e);
  }
  process.exit(0);
}
seedChat();
