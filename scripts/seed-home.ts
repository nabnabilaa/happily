import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function check() {
  const pool = mysql.createPool(process.env.MYSQL_URI || '');
  const [rows]: any = await pool.query("SELECT state_json FROM flowbee_state WHERE user_id = 'user_employee'");
  if (rows.length > 0) {
    const state = JSON.parse(rows[0].state_json);
    state.priorities = [
      { id: 1, title: 'Finalisasi Dokumen Kebutuhan Sistem', status: 'done', tone: 'sage' },
      { id: 2, title: 'Testing API dengan Postman', status: 'pending', tone: 'blue' },
      { id: 3, title: 'Review Code PR #142', status: 'pending', tone: 'yellow' }
    ];
    state.mood = 'happy';
    state.moodReason = 'Habis makan siang enak';
    state.habits = [
      { 
        name: 'Minum Air Putih 2L', 
        completed_dates: [new Date().toISOString().split('T')[0]]
      },
      { 
        name: 'Olahraga Ringan', 
        completed_dates: []
      }
    ];
    await pool.query("UPDATE flowbee_state SET state_json = ? WHERE user_id = 'user_employee'", [JSON.stringify(state)]);
    console.log("State updated");
  } else {
    console.log("No state found");
  }
  process.exit(0);
}
check();
