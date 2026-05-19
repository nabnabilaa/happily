import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const AIVEN_URL = process.env.MYSQL_URI || '';
async function seedAiven() {
  console.log("🌱 Menyambungkan ke Aiven MySQL Database...");
  
  const pool = mysql.createPool({
    uri: AIVEN_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const connection = await pool.getConnection();
    console.log("✅ Berhasil terhubung ke database. Mulai seeding besar-besaran...");

    const passwordHash = await bcrypt.hash("password123", 10);
    const adminHash = await bcrypt.hash("admin123", 10);
    const hrHash = await bcrypt.hash("hr123", 10);

    // 0. Hapus Data Lama
    console.log("- Menghapus data lama...");
    const tablesToClear = [
      "ext_sync_log", "calendar_attendees", "calendar_events",
      "ai_monthly_analyses", "ai_weekly_summaries", "monthly_reports",
      "task_kpi_links", "monthly_kpis", "office_locations",
      "notifications", "logbook_entries", "attendance",
      "xp_transactions", "kudos", "habits", "daily_priorities",
      "sub_goals", "goals", "mood_checkins", "user_skills",
      "user_rewards", "rewards", "users", "teams"
    ];

    for (const table of tablesToClear) {
      try {
        await connection.query(`DELETE FROM ${table}`);
      } catch (e: any) {
        // Abaikan jika tabel tidak ada
      }
    }

    // 1. Teams
    console.log("- Membuat 8 Tim (Departments)...");
    const teams = [
      { id: "team_dx", name: "Digital Experience", dept: "Product" },
      { id: "team_eng", name: "Engineering", dept: "Technology" },
      { id: "team_mkt", name: "Marketing", dept: "Growth" },
      { id: "team_hr", name: "People & Culture", dept: "HR" },
      { id: "team_sales", name: "Sales Enterprise", dept: "Sales" },
      { id: "team_cs", name: "Customer Success", dept: "Operations" },
      { id: "team_data", name: "Data & Analytics", dept: "Technology" },
      { id: "team_fin", name: "Finance & Legal", dept: "Finance" },
    ];

    for (const t of teams) {
      await connection.query("INSERT INTO teams (id, name, department) VALUES (?, ?, ?)", [t.id, t.name, t.dept]);
    }

    // 2. Users (50+ users)
    console.log("- Membuat 50+ User (Admin, HR, Manager, Employees)...");
    
    const users: any[] = [];
    
    // Core users
    users.push({ id: "user_admin", name: "Super Admin", email: "admin@gmail.com", role: "admin", teamId: "team_eng", title: "System Administrator", points: 15000, pass: adminHash, managerId: null });
    users.push({ id: "user_hr", name: "Maya Sari (HR)", email: "hr@gmail.com", role: "hr", teamId: "team_hr", title: "HR Business Partner", points: 8200, pass: hrHash, managerId: null });
    users.push({ id: "user_manager", name: "Budi Santoso (Manager)", email: "manager@gmail.com", role: "manager", teamId: "team_dx", title: "Product Manager", points: 12150, pass: passwordHash, managerId: null });
    users.push({ id: "user_employee", name: "Sari Wijaya (Emp)", email: "employee@gmail.com", role: "employee", teamId: "team_dx", title: "Product Designer", points: 6340, pass: passwordHash, managerId: "user_manager" });

    // Generate 5 Managers for the other teams
    const managerIds = ["user_manager"];
    for (let i = 1; i <= 5; i++) {
      const t = teams[i+1]; // skip DX and HR
      const mId = `manager_${i}`;
      managerIds.push(mId);
      users.push({
        id: mId,
        name: `Manager ${t.name}`,
        email: `manager${i}@company.com`,
        role: "manager",
        teamId: t.id,
        title: `Head of ${t.name}`,
        points: 8000 + Math.floor(Math.random() * 5000),
        pass: passwordHash,
        managerId: null
      });
    }

    // Generate 45 Employees
    const firstNames = ["Andi", "Bima", "Citra", "Dewi", "Eko", "Fajar", "Gita", "Hendra", "Indah", "Joko", "Kiki", "Lestari", "Rizky", "Nia", "Oka", "Putri", "Qori", "Rama", "Sinta", "Tito", "Umar", "Vina", "Wira", "Xander", "Yani", "Zaki"];
    const lastNames = ["Pratama", "Wijaya", "Kusuma", "Santoso", "Hidayat", "Saputra", "Gunawan", "Setiawan", "Wibowo", "Nugroho", "Sari", "Lestari", "Rahayu", "Putri", "Pangestu"];
    
    const employeeIds: string[] = ["user_employee"];

    for (let i = 1; i <= 45; i++) {
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const team = teams[Math.floor(Math.random() * teams.length)];
      
      // Assign to a manager if not HR/Admin
      let mId = null;
      if (team.id === "team_dx") mId = "user_manager";
      else if (team.dept === "Technology" && team.id !== "team_eng") mId = managerIds[1];
      else if (team.dept === "Growth") mId = managerIds[2];
      else if (team.dept === "Sales") mId = managerIds[3];
      else if (team.dept === "Operations") mId = managerIds[4];

      const empId = `emp_${i}`;
      employeeIds.push(empId);
      users.push({
        id: empId,
        name: `${fName} ${lName}`,
        email: `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@company.com`,
        role: "employee",
        teamId: team.id,
        title: `Staff ${team.name}`,
        points: 500 + Math.floor(Math.random() * 4500),
        pass: passwordHash,
        managerId: mId
      });
    }

    for (const u of users) {
      const level = Math.floor(u.points/1000) + 1;
      await connection.query(
        `INSERT INTO users (id, email, name, role, password_hash, job_title, team_id, manager_id, points, level, \`rank\`, is_onboarded) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'C', 1)`,
        [u.id, u.email, u.name, u.role, u.pass, u.title, u.teamId, u.managerId, u.points, level]
      );
    }

    // 3. Office Locations
    console.log("- Membuat Lokasi Kantor (Offices)...");
    const offices = [
      { id: "hq_jkt", name: "Jakarta HQ", lat: -6.2088, lng: 106.8456, radius: 200 },
      { id: "branch_bdg", name: "Bandung Branch", lat: -6.9175, lng: 107.6191, radius: 150 },
      { id: "branch_sby", name: "Surabaya Tech Hub", lat: -7.2504, lng: 112.7688, radius: 200 },
    ];
    for (const o of offices) {
      await connection.query("INSERT INTO office_locations (id, name, lat, lng, radius) VALUES (?, ?, ?, ?, ?)", [o.id, o.name, o.lat, o.lng, o.radius]);
    }

    // 4. Attendance
    console.log("- Generate Data Absensi (Attendance) 30 hari terakhir...");
    for (const u of users) {
      if (u.role === 'admin') continue;
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - i * 86400000);
        // Skip weekends roughly
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        // Randomly 90% attend
        if (Math.random() > 0.1) {
          const checkIn = new Date(date); checkIn.setHours(8 + Math.random(), Math.floor(Math.random()*60), 0);
          const checkOut = new Date(date); checkOut.setHours(17 + Math.random()*2, Math.floor(Math.random()*60), 0);
          
          const type = Math.random() > 0.7 ? 'WFH' : 'WFO';
          const office = type === 'WFO' ? offices[Math.floor(Math.random() * offices.length)] : null;
          
          const mysqlIn = checkIn.toISOString().slice(0, 19).replace('T', ' ');
          const mysqlOut = checkOut.toISOString().slice(0, 19).replace('T', ' ');

          await connection.query(
            `INSERT INTO attendance (user_id, check_in_at, check_out_at, check_in_type, office_id, location_lat, location_lng, mood)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [u.id, mysqlIn, mysqlOut, type, office ? office.id : null, office ? office.lat : 0, office ? office.lng : 0, 'joy']
          );
        }
      }
    }

    // 5. Mood Checkins
    console.log("- Generate Mood Check-ins...");
    const moods = ['joy', 'calm', 'neutral', 'tired', 'stress'];
    const energies = ['low', 'mid', 'high'];
    for (const u of users) {
      for (let i = 0; i < 15; i++) {
        if (Math.random() > 0.5) {
          const checkinDate = new Date(Date.now() - i * 86400000);
          const mysqlDate = checkinDate.toISOString().slice(0, 19).replace('T', ' ');
          await connection.query(
            "INSERT INTO mood_checkins (user_id, mood_key, energy_key, tag, created_at) VALUES (?, ?, ?, ?, ?)",
            [u.id, moods[Math.floor(Math.random()*5)], energies[Math.floor(Math.random()*3)], "Work", mysqlDate]
          );
        }
      }
    }

    // 6. Kudos (Massive network)
    console.log("- Generate 200+ Kudos (Apresiasi)...");
    const kudosTags = ["Collaboration", "Innovation", "Leadership", "Hard Work", "Problem Solving"];
    for (let i = 0; i < 200; i++) {
      const sender = users[Math.floor(Math.random() * users.length)];
      const receiver = users[Math.floor(Math.random() * users.length)];
      if (sender.id === receiver.id) continue;
      
      const tag = kudosTags[Math.floor(Math.random() * kudosTags.length)];
      const msgs = [
        `Kerja bagus banget untuk project minggu lalu!`,
        `Terima kasih sudah bantu saya di task yang susah ini.`,
        `Ide kamu di meeting tadi sangat cemerlang.`,
        `Dedikasi yang luar biasa, salut!`,
        `Presentasi yang memukau klien, good job!`
      ];
      const msg = msgs[Math.floor(Math.random() * msgs.length)];
      
      const date = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000);
      const mysqlDate = date.toISOString().slice(0, 19).replace('T', ' ');

      await connection.query(
        "INSERT INTO kudos (id, sender_id, receiver_id, value_tag, message, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [`kudos_${i}`, sender.id, receiver.id, tag, msg, mysqlDate]
      );
    }

    // 7. Monthly KPIs & Goals
    console.log("- Generate Monthly KPIs dan Goals...");
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    for (const mId of managerIds) {
      const manager = users.find(u => u.id === mId);
      if (!manager) continue;
      
      // Get employees for this manager
      const teamEmps = users.filter(u => u.managerId === mId);
      
      for (const emp of teamEmps) {
        // Create 2 KPIs per employee
        for (let k = 1; k <= 2; k++) {
          const kpiId = `kpi_${emp.id}_${k}`;
          await connection.query(
            `INSERT INTO monthly_kpis (id, title, target_description, weight, month, year, assigned_to, assigned_by, status, metric_target, metric_current)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
            [kpiId, `Target Q${Math.ceil(currentMonth/3)}: Initiative ${k}`, `Selesaikan 100% dengan kualitas tinggi`, 50, currentMonth, currentYear, emp.id, manager.id, 100, Math.floor(Math.random()*80)]
          );

          // Create 3 Tasks for each KPI
          for (let t = 1; t <= 3; t++) {
            const isDone = Math.random() > 0.4 ? 1 : 0;
            await connection.query(
              `INSERT INTO daily_priorities (user_id, kpi_id, title, energy_level, est_time, is_done, is_verified, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'website')`,
              [emp.id, kpiId, `Task ${t} untuk KPI ${k}`, 'mid', '2h', isDone, isDone ? (Math.random() > 0.5 ? 1 : 0) : 0]
            );
          }
        }
      }
    }

    // 8. Calendar Events
    console.log("- Generate Ratusan Event Kalender...");
    for (let i = 0; i < 150; i++) {
      const creator = users[Math.floor(Math.random() * users.length)];
      const eventId = `evt_${uuidv4()}`;
      
      // Random date within next/past 15 days
      const daysOffset = Math.floor(Math.random() * 30) - 15;
      const startDate = new Date(Date.now() + daysOffset * 86400000);
      startDate.setHours(9 + Math.floor(Math.random()*8), 0, 0); // 9am - 5pm
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1 + Math.floor(Math.random()*2));

      await connection.query(
        `INSERT INTO calendar_events (id, creator_id, title, description, start_time, end_time, event_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [eventId, creator.id, `Meeting ${creator.teamId}`, `Pembahasan progres divisi.`, startDate.toISOString().slice(0,19).replace('T',' '), endDate.toISOString().slice(0,19).replace('T',' '), 'meeting']
      );

      // Add attendees
      await connection.query("INSERT INTO calendar_attendees (event_id, user_id, status) VALUES (?, ?, 'accepted')", [eventId, creator.id]);
      
      // Invite 2 random users
      for (let a=0; a<2; a++) {
        const guest = users[Math.floor(Math.random() * users.length)];
        if (guest.id !== creator.id) {
          try {
            await connection.query("INSERT INTO calendar_attendees (event_id, user_id, status) VALUES (?, ?, 'pending')", [eventId, guest.id]);
          } catch(e) {} // ignore duplicates
        }
      }
    }

    // 9. Rewards
    console.log("- Menambahkan Katalog Hadiah...");
    const initialRewards = [
      { id: "r1", title: "Cuti Tambahan 1 Hari", points: 2000, cat: "Wellbeing", tone: "blue", stock: 10 },
      { id: "r2", title: "Lunch with CEO", points: 5000, cat: "Growth", tone: "yellow", stock: 2 },
      { id: "r3", title: "Voucher Kopi 50rb", points: 500, cat: "Daily", tone: "sage", stock: 150 },
      { id: "r4", title: "Merchandise Kaos Flowbee", points: 1500, cat: "Daily", tone: "coral", stock: 30 },
      { id: "r5", title: "Spotify Premium 1 Bulan", points: 1200, cat: "Wellbeing", tone: "sage", stock: 20 },
    ];
    for (const r of initialRewards) {
      await connection.query(
        "INSERT INTO rewards (id, title, points_cost, category, tone, glyph, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [r.id, r.title, r.points, r.cat, r.tone, "gift", "Reward spesial untuk tim yang bekerja keras.", r.stock]
      );
    }

    console.log("\n✅ SEEDING AIVEN DATABASE SELESAI!");
    connection.release();
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error("❌ Gagal seeding Aiven:", error);
    process.exit(1);
  }
}

seedAiven();
