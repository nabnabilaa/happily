import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function migrate() {
  console.log("🚚 Migrating data from storage.json to Turso...");
  
  try {
    const storagePath = path.join(process.cwd(), "data/storage.json");
    const { state, user } = JSON.parse(fs.readFileSync(storagePath, "utf8"));
    
    // 1. Migrate User
    console.log("- Migrating user...");
    await db.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, name, role, streak, points, level, rank, avatar_image, avatar_config_json, last_activity_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "user_1", // Default ID for single user prototype
        "user@example.com",
        user.name,
        user.role,
        user.streak,
        user.points,
        user.level,
        user.rank,
        user.avatarImage || null,
        JSON.stringify(user.avatarConfig || {}),
        state.lastActivityDate
      ]
    });

    // 2. Migrate Daily Priorities
    console.log("- Migrating daily priorities...");
    for (const p of state.priorities) {
      await db.execute({
        sql: `INSERT INTO daily_priorities (user_id, title, goal_title, energy_level, est_time, is_done, tone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: ["user_1", p.title, p.goal, p.energy, p.est, p.done ? 1 : 0, p.tone]
      });
    }


    // 4. Migrate Goals
    console.log("- Migrating goals...");
    for (const g of state.goals) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO goals (id, owner_id, title, progress, alignment, due_date, tone, metric, scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [String(g.id), "user_1", g.title, g.progress, g.alignment, g.due, g.tone, g.metric, g.scope]
      });
    }

    // 5. Migrate Habits
    console.log("- Migrating habits...");
    for (const h of state.habits) {
      await db.execute({
        sql: `INSERT INTO habits (user_id, name, streak, target_days, is_done_today, glyph) VALUES (?, ?, ?, ?, ?, ?)`,
        args: ["user_1", h.name, h.streak, h.target, h.done ? 1 : 0, h.glyph || h.emoji]
      });
    }

    // 6. Migrate Surveys
    console.log("- Migrating surveys...");
    for (const s of (state.surveys || [])) {
      await db.execute({
        sql: `INSERT INTO surveys (title, url, status, published_at) VALUES (?, ?, ?, ?)`,
        args: [s.title, s.url, s.status, s.publishedAt]
      });
    }

    console.log("✅ Migration complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    process.exit();
  }
}

migrate();
