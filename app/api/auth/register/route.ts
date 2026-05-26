import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Generate N recent dates (e.g. last N days including today)
function recentDates(count: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function seedDemoData(userId: string, userName: string) {
  const uid = () => "seed_" + Math.random().toString(36).substring(2, 10);

  // ── 1. Points, Level, Rank ──────────────────────────────────────────────
  await db.execute({
    sql: "UPDATE users SET points = 1500, coins = 1500, level = 6, `rank` = 'C', streak = 12, is_onboarded = 1 WHERE id = ?",
    args: [userId]
  });

  // ── 2. Daily Priorities (3 tasks) ───────────────────────────────────────
  const priorities = [
    { id: uid(), title: "Finalisasi Dokumen Kebutuhan Sistem", energy: "high", est: "2 jam", tone: "blue" },
    { id: uid(), title: "Review Code PR #142", energy: "medium", est: "1 jam", tone: "green" },
    { id: uid(), title: "Testing API dengan Postman", energy: "low", est: "30 menit", tone: "yellow" },
  ];
  for (const p of priorities) {
    await db.execute({
      sql: `INSERT INTO daily_priorities (id, user_id, title, energy_level, est_time, is_done, tone, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)`,
      args: [p.id, userId, p.title, p.energy, p.est, p.tone]
    });
  }

  // ── 3. Habits (3 habits with streaks) ──────────────────────────────────
  const habits = [
    { name: "Belajar AI", streak: 12, target: 30, glyph: "star", dates: recentDates(12) },
    { name: "Olahraga Pagi", streak: 5, target: 21, glyph: "heart", dates: recentDates(5) },
    { name: "Baca Buku 15 Menit", streak: 8, target: 14, glyph: "book", dates: recentDates(8) },
  ];
  for (const h of habits) {
    await db.execute({
      sql: `INSERT INTO habits (user_id, name, streak, target_days, is_done_today, glyph, completed_dates) VALUES (?, ?, ?, ?, 0, ?, ?)`,
      args: [userId, h.name, h.streak, h.target, h.glyph, JSON.stringify(h.dates)]
    });
  }

  // ── 4. Goals (3 goals with sub-goals) ──────────────────────────────────
  const goals = [
    {
      id: uid(), title: "Meningkatkan Kualitas Code Review", progress: 65, alignment: "Tim Engineering",
      tone: "blue", metric: "8 PR reviewed/minggu", scope: "personal",
      subGoals: [
        { title: "Review minimal 2 PR per hari", done: true },
        { title: "Dokumentasi feedback pattern", done: false },
        { title: "Pair programming 1x/minggu", done: true },
      ]
    },
    {
      id: uid(), title: "Sertifikasi Cloud Computing", progress: 40, alignment: "Pengembangan Diri",
      tone: "green", metric: "1 sertifikasi Q2", scope: "personal",
      subGoals: [
        { title: "Selesaikan modul Networking", done: true },
        { title: "Latihan soal ujian", done: false },
        { title: "Jadwalkan ujian sertifikasi", done: false },
      ]
    },
    {
      id: uid(), title: "Optimasi Performa Aplikasi", progress: 30, alignment: "OKR Perusahaan",
      tone: "yellow", metric: "Load time < 2 detik", scope: "team",
      subGoals: [
        { title: "Audit query database", done: true },
        { title: "Implementasi caching layer", done: false },
      ]
    }
  ];
  for (const g of goals) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 2);
    await db.execute({
      sql: `INSERT INTO goals (id, owner_id, title, progress, alignment, due_date, tone, metric, scope, status, is_kpi)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'on_track', 0)`,
      args: [g.id, userId, g.title, g.progress, g.alignment, dueDate.toISOString().slice(0, 10), g.tone, g.metric, g.scope]
    });
    for (const sg of g.subGoals) {
      await db.execute({
        sql: `INSERT INTO sub_goals (goal_id, title, is_done) VALUES (?, ?, ?)`,
        args: [g.id, sg.title, sg.done ? 1 : 0]
      });
    }
  }

  // ── 5. Skills (4 skills) ──────────────────────────────────────────────
  const skills = [
    { name: "Development", current: 75, target: 100 },
    { name: "Design", current: 45, target: 100 },
    { name: "Communication", current: 60, target: 100 },
    { name: "Leadership", current: 30, target: 100 },
  ];
  for (const sk of skills) {
    await db.execute({
      sql: `INSERT INTO user_skills (user_id, name, current_level, target_level) VALUES (?, ?, ?, ?)`,
      args: [userId, sk.name, sk.current, sk.target]
    });
  }

  // ── 6. Check-in mood (so Home shows a filled check-in) ────────────────
  await db.execute({
    sql: `INSERT INTO mood_checkins (user_id, mood_key, energy_key, tag, created_at)
          VALUES (?, 'joy', 'high', 'Produktif', CURRENT_TIMESTAMP)`,
    args: [userId]
  });

  // ── 7. Notes (3 catatan) ─────────────────────────────────────────────
  const notes = [
    {
      id: uid(),
      title: "Catatan Rapat Sprint Planning",
      content: "**Sprint Goal:** Menyelesaikan fitur dashboard analytics.\n\n### Action Items:\n- [ ] Integrasi API chart library\n- [x] Design wireframe halaman laporan\n- [ ] Review endpoint data aggregation\n\n**Deadline:** Jumat minggu ini.\n\n> \"Fokus ke user experience, data harus mudah dibaca.\" — PM",
      visibility: "private",
    },
    {
      id: uid(),
      title: "Ide Improvement: Sistem Notifikasi",
      content: "### Masalah saat ini:\nNotifikasi terlalu banyak → user kewalahan.\n\n### Solusi yang diusulkan:\n1. **Smart Grouping** — Gabungkan notifikasi sejenis\n2. **Priority Levels** — Urgent / Normal / Low\n3. **Quiet Hours** — Jangan kirim di luar jam kerja\n\nSudah diskusi dengan tim, akan dimasukkan ke backlog Q3.",
      visibility: "private",
    },
    {
      id: uid(),
      title: "Rangkuman Workshop Design System",
      content: "### Key Takeaways:\n- Konsistensi warna & tipografi sangat penting\n- Token system memudahkan scaling\n- Component library harus well-documented\n\n### Tools yang direkomendasikan:\n- Figma untuk design\n- Storybook untuk dokumentasi komponen\n- Style Dictionary untuk token management\n\n*Next step: Buat proposal adopsi design token ke tim.*",
      visibility: "private",
    }
  ];
  for (const n of notes) {
    await db.execute({
      sql: `INSERT INTO notes (id, user_id, title, content, visibility, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [n.id, userId, n.title, n.content, n.visibility]
    });
  }

  // ── 8. Calendar Events (4 events this week) ──────────────────────────
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const calEvents = [
    {
      id: uid(), title: "Daily Standup", desc: "Sync harian tim engineering",
      offsetDays: 0, startH: 9, startM: 0, endH: 9, endM: 30,
      type: "meeting", color: "#3B6FA0"
    },
    {
      id: uid(), title: "Sprint Review Demo", desc: "Presentasi hasil sprint ke stakeholder",
      offsetDays: 1, startH: 14, startM: 0, endH: 15, endM: 0,
      type: "meeting", color: "#E8A838"
    },
    {
      id: uid(), title: "1-on-1 dengan Manager", desc: "Weekly catch-up personal development",
      offsetDays: 2, startH: 10, startM: 0, endH: 10, endM: 45,
      type: "meeting", color: "#6BBF6A"
    },
    {
      id: uid(), title: "Workshop Design System", desc: "Hands-on session tentang design tokens & component library",
      offsetDays: 3, startH: 13, startM: 0, endH: 15, endM: 0,
      type: "event", color: "#9B59B6"
    },
  ];
  for (const ev of calEvents) {
    const start = new Date(today);
    start.setDate(start.getDate() + ev.offsetDays);
    start.setHours(ev.startH, ev.startM, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + ev.offsetDays);
    end.setHours(ev.endH, ev.endM, 0, 0);
    try {
      await db.execute({
        sql: `INSERT INTO calendar_events (id, creator_id, title, description, start_time, end_time, event_type, color)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [ev.id, userId, ev.title, ev.desc, start.toISOString(), end.toISOString(), ev.type, ev.color]
      });
    } catch (e) { console.error("Calendar seed error:", e); }
  }

  // ── 9. Chat — Team channel + DM with manager ────────────────────────
  const teamChannelId = "ch_" + uid();
  const dmChannelId = "ch_" + uid();
  const managerId = "user_manager"; // Budi Santoso

  try {
    // Team channel
    await db.execute({
      sql: `INSERT INTO message_channels (id, name, type, created_by, avatar_emoji) VALUES (?, ?, 'group', ?, '🐝')`,
      args: [teamChannelId, "Tim Engineering", userId]
    });
    await db.execute({
      sql: `INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?)`,
      args: [teamChannelId, userId]
    });
    // Add manager to channel too
    try {
      await db.execute({
        sql: `INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?)`,
        args: [teamChannelId, managerId]
      });
    } catch (e) { /* manager might not exist */ }

    // Team channel messages
    const teamMsgs = [
      { sender: managerId, content: "Selamat pagi tim! 🌞 Jangan lupa daily standup jam 9 ya.", mins: 120 },
      { sender: userId, content: "Siap pak! Saya sudah update progress di Jira.", mins: 90 },
      { sender: managerId, content: "Bagus! Ada blocker yang perlu dibantu?", mins: 60 },
      { sender: userId, content: "Untuk sekarang lancar pak. Nanti saya update lagi di standup. 👍", mins: 30 },
    ];
    for (const msg of teamMsgs) {
      const msgTime = new Date(now.getTime() - msg.mins * 60000);
      try {
        await db.execute({
          sql: `INSERT INTO messages (id, channel_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)`,
          args: [uid(), teamChannelId, msg.sender, msg.content, msgTime.toISOString()]
        });
      } catch (e) { /* sender might not exist */ }
    }

    // DM channel with manager
    await db.execute({
      sql: `INSERT INTO message_channels (id, name, type, created_by, avatar_emoji) VALUES (?, ?, 'dm', ?, '👤')`,
      args: [dmChannelId, "DM", userId]
    });
    await db.execute({
      sql: `INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?)`,
      args: [dmChannelId, userId]
    });
    try {
      await db.execute({
        sql: `INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?)`,
        args: [dmChannelId, managerId]
      });
    } catch (e) { /* manager might not exist */ }

    // DM messages
    const dmMsgs = [
      { sender: managerId, content: "Hai! Gimana progress sertifikasi cloud-nya?", mins: 180 },
      { sender: userId, content: "Sudah selesai modul networking pak. Tinggal latihan soal ujian.", mins: 150 },
      { sender: managerId, content: "Mantap! Kalau butuh akses lab practice, bilang ya. Perusahaan bisa cover.", mins: 120 },
      { sender: userId, content: "Wah terima kasih pak! 🙏 Akan saya manfaatkan.", mins: 60 },
    ];
    for (const msg of dmMsgs) {
      const msgTime = new Date(now.getTime() - msg.mins * 60000);
      try {
        await db.execute({
          sql: `INSERT INTO messages (id, channel_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)`,
          args: [uid(), dmChannelId, msg.sender, msg.content, msgTime.toISOString()]
        });
      } catch (e) { /* sender might not exist */ }
    }
  } catch (e) {
    console.error("Chat seed error:", e);
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Semua field harus diisi" }, { status: 400 });
    }

    // Check if user exists
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email]
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = "u_" + Math.random().toString(36).substring(2, 9);
    
    // Default role is 'employee'
    const role = "employee";

    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, password_hash, points, coins, level, \`rank\`, streak) 
            VALUES (?, ?, ?, ?, ?, 0, 0, 1, 'E', 0)`,
      args: [userId, email, name, role, password_hash]
    });

    // Seed demo data so new users see a fully populated interface
    try {
      await seedDemoData(userId, name);
    } catch (seedErr) {
      console.error("Demo seed warning (non-fatal):", seedErr);
    }

    const user = {
      id: userId,
      email,
      name,
      role,
      points: 1500,
      coins: 1500,
      level: 6,
      rank: 'C',
      streak: 12,
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Gagal mendaftar" }, { status: 500 });
  }
}


