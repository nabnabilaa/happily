import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seedGoals() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  try {
    const conn = await pool.getConnection();
    console.log("Clearing old goals for employee...");
    
    const empId = "user_employee";
    const mgrId = "user_manager";
    
    // Clear sub_goals related to employee's goals first
    await conn.query(`DELETE FROM sub_goals WHERE goal_id IN (SELECT id FROM goals WHERE owner_id = ?)`, [empId]);
    await conn.query(`DELETE FROM goals WHERE owner_id = ?`, [empId]);

    console.log("Seeding dummy goals...");

    const dummyGoals = [
      { 
        title: 'Peluncuran Fitur Analytics v2', 
        progress: 60, 
        alignment: 100, 
        tone: 'sage', 
        metric: 'Tahap Testing', 
        scope: 'assigned',
        sub: ['Selesaikan integrasi API', 'Lakukan UAT dengan QA', 'Siapkan dokumen rilis']
      },
      { 
        title: 'Meningkatkan Skor Kepuasan Klien (CSAT)', 
        progress: 30, 
        alignment: 80, 
        tone: 'blue', 
        metric: 'Target: 4.8/5.0', 
        scope: 'assigned',
        sub: ['Analisis feedback Q1', 'Buat panduan respons cepat']
      },
      { 
        title: 'Penyelesaian Sertifikasi AWS Cloud', 
        progress: 10, 
        alignment: 50, 
        tone: 'yellow', 
        metric: '2/10 Modul Selesai', 
        scope: 'personal',
        sub: ['Selesaikan Modul 1-5', 'Ikuti tryout sertifikasi']
      }
    ];

    for (const g of dummyGoals) {
      const newGoalId = `goal_${uuidv4().substring(0, 8)}`;
      await conn.query(
        `INSERT INTO goals (id, title, owner_id, owner_name, assigned_by_id, progress, alignment, tone, metric, scope, status, due_date)
         VALUES (?, ?, ?, 'User Employee', ?, ?, ?, ?, ?, ?, 'active', DATE_ADD(NOW(), INTERVAL 30 DAY))`,
        [newGoalId, g.title, empId, mgrId, g.progress, g.alignment, g.tone, g.metric, g.scope]
      );
      
      for (const [index, subTitle] of g.sub.entries()) {
        await conn.query(
          `INSERT INTO sub_goals (goal_id, title, is_done) VALUES (?, ?, ?)`,
          [newGoalId, subTitle, index === 0 ? 1 : 0] // First sub-goal marked as done
        );
      }
    }

    console.log("Goals seeding completed.");
    conn.release();
  } catch(e) {
    console.error("Failed:", e);
  }
  process.exit(0);
}
seedGoals();
