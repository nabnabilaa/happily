import { createClient } from "@libsql/client";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function seed() {
  console.log("🌱 Seeding Real Correlated Data...");

  try {
    const passwordHash = await bcrypt.hash("password123", 10);

    // 0. Clear existing data
    console.log("- Clearing old data...");
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
      } catch (e) {
        console.warn(`Could not clear table ${table}:`, e);
      }
    }

    // 1. Create Teams
    console.log("- Creating teams...");
    const teams = [
      { id: uuidv4(), name: "Digital Experience", dept: "Product" },
      { id: uuidv4(), name: "Engineering", dept: "Technology" },
      { id: uuidv4(), name: "Marketing", dept: "Growth" },
      { id: uuidv4(), name: "People & Culture", dept: "HR" },
    ];

    for (const t of teams) {
      await db.execute({
        sql: "INSERT INTO teams (id, name, department) VALUES (?, ?, ?)",
        args: [t.id, t.name, t.dept],
      });
    }

    // 2. Create Users
    console.log("- Creating users...");
    const users = [
      { id: "user_admin", name: "Super Admin", email: "admin@gmail.com", role: "admin", team: "Engineering", title: "System Administrator", points: 5000, pass: "admin123" },
      { id: "user_hr", name: "Maya Sari", email: "hr@gmail.com", role: "hr", team: "People & Culture", title: "HR Business Partner", points: 3200, pass: "hr123" },
      { id: "user_manager", name: "Budi Santoso", email: "manager@gmail.com", role: "manager", team: "Digital Experience", title: "Product Manager", points: 2150, pass: "manager123" },
      { id: "user_employee", name: "Sari Wijaya", email: "employee@gmail.com", role: "employee", team: "Digital Experience", title: "Product Designer", points: 1340, pass: "employee123" },
      { id: "user_emp_2", name: "Rizky Hidayat", email: "rizky@company.com", role: "employee", team: "Digital Experience", title: "Senior Designer", points: 1800, pass: "password123" },
      { id: "user_emp_3", name: "Dian Kusuma", email: "dian@company.com", role: "employee", team: "Digital Experience", title: "UX Researcher", points: 850, pass: "password123" },
    ];

    for (const u of users) {
      const teamId = teams.find(t => t.name === u.team)?.id || null;
      const passHash = await bcrypt.hash(u.pass, 10);
      await db.execute({
        sql: `INSERT OR REPLACE INTO users (id, email, name, role, password_hash, job_title, team_id, points, level, rank) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [u.id, u.email, u.name, u.role, passHash, u.title, teamId, u.points, Math.floor(u.points/100)+1, 'D'],
      });
    }

    // 3. Mood Checkins (Correlated with wellbeing)
    console.log("- Adding mood checkins...");
    const moods = ['joy', 'calm', 'neutral', 'tired', 'stress'];
    const energies = ['low', 'mid', 'high'];
    
    for (const u of users) {
      // Add 5 days of history
      for (let i = 0; i < 5; i++) {
        const mood = u.id === "user_emp_3" ? "tired" : moods[Math.floor(Math.random() * 3)]; 
        await db.execute({
          sql: "INSERT INTO mood_checkins (user_id, mood_key, energy_key, tag, created_at) VALUES (?, ?, ?, ?, ?)",
          args: [u.id, mood, energies[Math.floor(Math.random() * 3)], "Work", new Date(Date.now() - i * 86400000).toISOString()],
        });
      }
    }

    // 4. Kudos (Correlated with feed)
    console.log("- Adding kudos...");
    const kudos = [
      { sender: "user_manager", receiver: "user_employee", msg: "Makasih banyak Sari — handoff kemarin super jelas!", tag: "Collaboration" },
      { sender: "user_employee", receiver: "user_emp_2", msg: "Ide prototype Rizky keren banget, user suka!", tag: "Innovation" },
      { sender: "user_hr", receiver: "user_manager", msg: "Budi handling team conflict dengan sangat profesional.", tag: "Leadership" },
    ];

    for (const k of kudos) {
      await db.execute({
        sql: "INSERT INTO kudos (sender_id, receiver_id, value_tag, message) VALUES (?, ?, ?, ?)",
        args: [k.sender, k.receiver, k.tag, k.msg],
      });
    }

    // 5. Goals & Sub-goals
    console.log("- Adding goals...");
    const userGoals = [
      { id: "goal_1", owner: "user_employee", title: "Launch Apps Redesign", progress: 68, tone: "sage", scope: "personal" },
      { id: "goal_2", owner: "user_employee", title: "DS Migration Q2", progress: 42, tone: "blue", scope: "team" },
    ];

    for (const g of userGoals) {
      await db.execute({
        sql: "INSERT INTO goals (id, owner_id, title, progress, tone, scope) VALUES (?, ?, ?, ?, ?, ?)",
        args: [g.id, g.owner, g.title, g.progress, g.tone, g.scope],
      });
      
      // Add sub-goals
      await db.execute({
        sql: "INSERT INTO sub_goals (goal_id, title, is_done) VALUES (?, ?, ?)",
        args: [g.id, "Audit current components", 1],
      });
    }

    // 6. Skills
    console.log("- Adding skills...");
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

    // 7. Rewards
    console.log("- Adding rewards...");
    const initialRewards = [
      { title: "Cuti Tambahan 1 Hari", points: 2000, cat: "Wellbeing", tone: "blue", stock: 10 },
      { title: "Lunch with CEO", points: 5000, cat: "Growth", tone: "yellow", stock: 2 },
      { title: "Voucher Kopi 50rb", points: 500, cat: "Daily", tone: "sage", stock: 50 },
    ];

    for (const r of initialRewards) {
      await db.execute({
        sql: `INSERT INTO rewards (title, points_cost, category, tone, glyph, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [r.title, r.points, r.cat, r.tone, "gift", "Reward spesial untuk tim.", r.stock]
      });
    }

    console.log("✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit();
  }
}

seed();
