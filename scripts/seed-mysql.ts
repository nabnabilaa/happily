import { db } from "../lib/turso";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding Real Correlated Data to MySQL/MariaDB...\n");

  try {
    const passwordHash = await bcrypt.hash("password123", 10);

    // 0. Clear existing data
    console.log("- Menghapus data lama...");
    const tables = [
      "xp_transactions",
      "kudos",
      "habits",
      "daily_priorities",
      "sub_goals",
      "goals",
      "mood_checkins",
      "user_skills",
      "users",
      "teams",
      "surveys",
      "rewards",
      "learning_items"
    ];

    for (const table of tables) {
      try {
        await db.execute(`DELETE FROM ${table}`);
        console.log(`  🗑️ Data di tabel '${table}' dikosongkan.`);
      } catch (e) {
        console.warn(`  ⚠️ Gagal mengosongkan tabel ${table}:`, (e as Error).message);
      }
    }

    // 1. Create Teams
    console.log("\n- Membuat tim...");
    const teams = [
      { id: "team_dx", name: "Digital Experience", dept: "Product" },
      { id: "team_eng", name: "Engineering", dept: "Technology" },
      { id: "team_mkt", name: "Marketing", dept: "Growth" },
      { id: "team_hr", name: "People & Culture", dept: "HR" },
    ];

    for (const t of teams) {
      await db.execute({
        sql: "INSERT INTO teams (id, name, department) VALUES (?, ?, ?)",
        args: [t.id, t.name, t.dept],
      });
      console.log(`  👥 Tim '${t.name}' ditambahkan.`);
    }

    // 2. Create Users
    console.log("\n- Membuat user baru...");
    const users = [
      { id: "user_admin", name: "Super Admin", email: "admin@gmail.com", role: "admin", teamId: "team_eng", title: "System Administrator", points: 5000, pass: "admin123", managerId: null },
      { id: "user_hr", name: "Maya Sari", email: "hr@gmail.com", role: "hr", teamId: "team_hr", title: "HR Business Partner", points: 3200, pass: "hr123", managerId: null },
      { id: "user_manager", name: "Budi Santoso", email: "manager@gmail.com", role: "manager", teamId: "team_dx", title: "Product Manager", points: 2150, pass: "manager123", managerId: null },
      { id: "user_employee", name: "Sari Wijaya", email: "employee@gmail.com", role: "employee", teamId: "team_dx", title: "Product Designer", points: 1340, pass: "employee123", managerId: "user_manager" },
      { id: "user_emp_2", name: "Rizky Hidayat", email: "rizky@company.com", role: "employee", teamId: "team_dx", title: "Senior Designer", points: 1800, pass: "password123", managerId: "user_manager" },
      { id: "user_emp_3", name: "Dian Kusuma", email: "dian@company.com", role: "employee", teamId: "team_dx", title: "UX Researcher", points: 850, pass: "password123", managerId: "user_manager" },
    ];

    for (const u of users) {
      const passHash = await bcrypt.hash(u.pass, 10);
      await db.execute({
        sql: `REPLACE INTO users (id, email, name, role, password_hash, job_title, team_id, manager_id, points, level, rank) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [u.id, u.email, u.name, u.role, passHash, u.title, u.teamId, u.managerId, u.points, Math.floor(u.points/100)+1, 'D'],
      });
      console.log(`  👤 User '${u.name}' (${u.role}) ditambahkan.`);
    }

    // 3. Mood Checkins
    console.log("\n- Membuat riwayat mood check-ins...");
    const moods = ['joy', 'calm', 'neutral', 'tired', 'stress'];
    const energies = ['low', 'mid', 'high'];
    
    for (const u of users) {
      for (let i = 0; i < 5; i++) {
        const mood = u.id === "user_emp_3" ? "tired" : moods[Math.floor(Math.random() * 3)];
        const checkinDate = new Date(Date.now() - i * 86400000);
        // Format ISO String to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
        const mysqlDate = checkinDate.toISOString().slice(0, 19).replace('T', ' ');

        await db.execute({
          sql: "INSERT INTO mood_checkins (user_id, mood_key, energy_key, tag, created_at) VALUES (?, ?, ?, ?, ?)",
          args: [u.id, mood, energies[Math.floor(Math.random() * 3)], "Work", mysqlDate],
        });
      }
    }
    console.log("  ❤️ Riwayat Mood Check-ins ditambahkan untuk semua user.");

    // 4. Kudos
    console.log("\n- Membuat feed kudos / apresiasi...");
    const kudosData = [
      { id: "kudos_1", sender: "user_manager", receiver: "user_employee", msg: "Makasih banyak Sari — handoff kemarin super jelas!", tag: "Collaboration" },
      { id: "kudos_2", sender: "user_employee", receiver: "user_emp_2", msg: "Ide prototype Rizky keren banget, user suka!", tag: "Innovation" },
      { id: "kudos_3", sender: "user_hr", receiver: "user_manager", msg: "Budi handling team conflict dengan sangat profesional.", tag: "Leadership" },
    ];

    for (const k of kudosData) {
      await db.execute({
        sql: "INSERT INTO kudos (id, sender_id, receiver_id, value_tag, message) VALUES (?, ?, ?, ?, ?)",
        args: [k.id, k.sender, k.receiver, k.tag, k.msg],
      });
    }
    console.log("  🎉 Kudos feed berhasil ditambahkan.");

    // 5. Goals & Sub-goals
    console.log("\n- Membuat OKR/Goals...");
    const userGoals = [
      { id: "goal_1", owner: "user_employee", title: "Launch Apps Redesign", progress: 68, tone: "sage", scope: "assigned", assignedById: "user_manager", status: "pending" },
      { id: "goal_2", owner: "user_employee", title: "DS Migration Q2", progress: 42, tone: "blue", scope: "team", assignedById: null, status: "approved" },
    ];

    for (const g of userGoals) {
      await db.execute({
        sql: "INSERT INTO goals (id, owner_id, title, progress, tone, scope, assigned_by_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [g.id, g.owner, g.title, g.progress, g.tone, g.scope, g.assignedById, g.status],
      });
      
      await db.execute({
        sql: "INSERT INTO sub_goals (goal_id, title, is_done) VALUES (?, ?, ?)",
        args: [g.id, "Audit current components", 1],
      });
    }
    console.log("  🎯 Target Goals & Sub-goals berhasil ditambahkan.");

    // 6. Skills
    console.log("\n- Membuat keahlian (Skills)...");
    const skills = [
      { user: "user_employee", name: "User Research", level: 70 },
      { user: "user_employee", name: "Interaction Design", level: 82 },
      { user: "user_employee", name: "Design Systems", level: 65 },
    ];

    for (const s of skills) {
      await db.execute({
        sql: "INSERT INTO user_skills (user_id, name, current_level, target_level) VALUES (?, ?, ?, ?)",
        args: [s.user, s.name, s.level, 100],
      });
    }
    console.log("  🧠 Data user skills berhasil ditambahkan.");

    // 7. Rewards
    console.log("\n- Membuat katalog hadiah (Rewards)...");
    const initialRewards = [
      { id: "reward_1", title: "Cuti Tambahan 1 Hari", points: 2000, cat: "Wellbeing", tone: "blue", stock: 10 },
      { id: "reward_2", title: "Lunch with CEO", points: 5000, cat: "Growth", tone: "yellow", stock: 2 },
      { id: "reward_3", title: "Voucher Kopi 50rb", points: 500, cat: "Daily", tone: "sage", stock: 50 },
    ];

    for (const r of initialRewards) {
      await db.execute({
        sql: `INSERT INTO rewards (id, title, points_cost, category, tone, glyph, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [r.id, r.title, r.points, r.cat, r.tone, "gift", "Reward spesial untuk tim.", r.stock]
      });
    }
    console.log("  🎁 Katalog Rewards berhasil di-seed.");

    // 8. Learning Items
    console.log("\n- Membuat materi pembelajaran (Learning)...");
    const learningItems = [
      { title: "Prinsip Dasar Tipografi", meta: "8 menit · Microlearning", tag: "Design Systems", tone: "blue" },
      { title: "Panduan GROW Coaching", meta: "15 menit · Video", tag: "Leadership", tone: "yellow" },
      { title: "Pengantar User Journey Mapping", meta: "12 menit · Artikel", tag: "User Research", tone: "sage" },
    ];

    for (const l of learningItems) {
      await db.execute({
        sql: `INSERT INTO learning_items (title, meta_info, tag, tone, status) VALUES (?, ?, ?, ?, 'new')`,
        args: [l.title, l.meta, l.tag, l.tone]
      });
    }
    console.log("  📚 Modul pembelajaran berhasil ditambahkan.");

    console.log("\n✅ DATABASE SEEDING BERHASIL SELESAI!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
