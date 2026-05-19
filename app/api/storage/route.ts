import { NextResponse } from 'next/server';
import { db } from '@/lib/turso';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'UserId missing' }, { status: 400 });

    // Note: Tables are managed by scripts/migrate-mysql.ts. No runtime migration.

    // 1. Fetch User
    const userRes = await db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [userId]
    });
    const userRow = userRes.rows[0];
    if (!userRow) return NextResponse.json({ state: null, user: null });

    const user = {
      id: userRow.id,
      name: userRow.name,
      role: userRow.role,
      streak: userRow.streak,
      points: userRow.points,
      coins: userRow.coins,
      level: userRow.level,
      rank: userRow.rank,
      avatarImage: userRow.avatar_image,
      userRole: userRow.user_role_context || userRow.role,
      onboarded: !!userRow.is_onboarded
    };

    // 2. Fetch State components
    const prioritiesRes = await db.execute({
      sql: "SELECT * FROM daily_priorities WHERE user_id = ? AND (is_done = 0 OR COALESCE(DATE(target_date), DATE(created_at)) = CURDATE()) ORDER BY COALESCE(target_date, created_at) ASC",
      args: [userId]
    });
    const priorities = prioritiesRes.rows.map(r => ({
      id: r.id, title: r.title, description: r.description, targetDate: r.target_date, goal: r.goal_title, goal_id: r.goal_id, kpi_id: r.kpi_id || null, kpi_title: r.goal_title || null, energy: r.energy_level, est: r.est_time, done: !!r.is_done, verified: !!r.is_verified, tone: r.tone, time_tracked: Number(r.time_tracked) || 0, timer_started_at: r.timer_started_at || null
    }));


    const habitsRes = await db.execute({
      sql: "SELECT * FROM habits WHERE user_id = ?",
      args: [userId]
    });
    const habits = habitsRes.rows.map(r => ({
      name: r.name, streak: r.streak, target: r.target_days, done: !!r.is_done_today, glyph: r.glyph
    }));

    // Fetch Goals with Owner Names and Sub-goals
    const goalsRes = await db.execute({
      sql: `SELECT g.*, u.name as joined_owner_name 
            FROM goals g 
            LEFT JOIN users u ON g.owner_id = u.id 
            WHERE g.owner_id = ? 
               OR g.assigned_by_id = ? 
               OR g.scope IN ('company', 'team')
               OR g.owner_id IN (SELECT id FROM users WHERE manager_id = ?)`,
      args: [userId, userId, userId]
    });

    const goals = await Promise.all(goalsRes.rows.map(async (r) => {
      const subGoalsRes = await db.execute({
        sql: "SELECT * FROM sub_goals WHERE goal_id = ?",
        args: [String(r.id)]
      });

      // Roll-up progress from child goals (aligned to this goal)
      const childGoalsRes = await db.execute({
        sql: "SELECT progress FROM goals WHERE parent_id = ?",
        args: [String(r.id)]
      });
      let effectiveProgress = Number(r.progress) || 0;
      if (childGoalsRes.rows.length > 0) {
        effectiveProgress = Math.round(
          childGoalsRes.rows.reduce((sum: number, cr: any) => sum + (Number(cr.progress) || 0), 0) / childGoalsRes.rows.length
        );
      }

      // Parse due_date: detect ISO vs display format, return both
      const rawDue = (r.due_date as string) || '';
      let dueDisplay = rawDue;
      let dueISO = '';
      if (rawDue.includes('T')) {
        // Already ISO format
        dueISO = rawDue.slice(0, 16);
        try {
          const d = new Date(rawDue);
          if (!isNaN(d.getTime())) {
            dueDisplay = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          }
        } catch (e) {}
      }

      return {
        id: String(r.id), // Ensure ID is string for frontend consistency
        title: r.title,
        progress: effectiveProgress,
        alignment: r.alignment,
        due: dueDisplay,
        dueISO: dueISO,
        tone: r.tone,
        metric: childGoalsRes.rows.length > 0 ? `${childGoalsRes.rows.length} aligned OKR` : r.metric,
        scope: r.scope,
        owner: (r.joined_owner_name as string) || (r.owner_name as string) || 'Unknown',
        ownerId: String(r.owner_id),
        assignedById: r.assigned_by_id ? String(r.assigned_by_id) : null,
        parent_id: r.parent_id ? String(r.parent_id) : null,
        status: r.status || 'pending',
        is_kpi: !!r.is_kpi,
        subGoals: subGoalsRes.rows.map(sr => ({ id: String(sr.id), title: sr.title, done: !!sr.is_done }))
      };
    }));

    const surveysRes = await db.execute("SELECT * FROM surveys WHERE status = 'active'");
    const surveys = surveysRes.rows.map(r => ({
      id: r.id, title: r.title, url: r.url, publishedAt: r.published_at, status: r.status
    }));

    // Fetch Latest Mood Checkin
    const moodRes = await db.execute({
      sql: "SELECT mood_key, energy_key, tag FROM mood_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [userId]
    });
    const latestMood = moodRes.rows[0];

    // Fetch Kudos for Feed (Correlated)
    const kudosRes = await db.execute({
      sql: `SELECT k.*, s.name as sender_name, r.name as receiver_name 
            FROM kudos k 
            JOIN users s ON k.sender_id = s.id 
            JOIN users r ON k.receiver_id = r.id 
            ORDER BY k.created_at DESC LIMIT 10`,
    });
    const feed = kudosRes.rows.map(r => ({
      id: r.id, from: r.sender_name, to: r.receiver_name, value: r.value_tag, msg: r.message, likes: r.likes_count, time: 'Baru saja'
    }));

    // Fetch Skills
    const skillsRes = await db.execute({
      sql: "SELECT * FROM user_skills WHERE user_id = ?",
      args: [userId]
    });
    const skills = skillsRes.rows.map(r => ({
      name: r.name, current: r.current_level, target: r.target_level
    }));

    // Fetch Global Settings
    const settingsRes = await db.execute("SELECT * FROM global_settings");
    let contacts = [
      { id: '1', name: 'HR Helpdesk', role: 'Support & Admin', email: 'hr@company.com', phone: '021-1234567' },
      { id: '2', name: 'IT Support', role: 'Technical Issues', email: 'it@company.com', phone: '0812-3456-7890' },
      { id: '3', name: 'Security Office', role: 'Safety & Emergency', email: 'security@company.com', phone: '021-9876543' }
    ];
    let workSchedule = { start: "08:00", end: "17:00", breakStart: "12:00", breakEnd: "13:00" };
    let skillMapping: any[] | null = null;
    settingsRes.rows.forEach(r => {
      try {
        if (r.key === 'contacts' && r.value) contacts = JSON.parse(r.value as string);
        if (r.key === 'work_schedule' && r.value) workSchedule = JSON.parse(r.value as string);
        if (r.key === 'skill_mapping' && r.value) skillMapping = JSON.parse(r.value as string);
      } catch (e) { console.error(`Error parsing setting ${r.key}:`, e); }
    });

    // Fetch Today's Attendance
    const todayAttRes = await db.execute({
      sql: "SELECT check_in_at as created_at FROM attendance WHERE user_id = ? AND DATE(check_in_at) = CURDATE() ORDER BY check_in_at ASC LIMIT 1",
      args: [userId]
    });
    const checkIn = todayAttRes.rows[0]?.created_at as string;

    const todayReflectRes = await db.execute({
      sql: "SELECT created_at FROM logbook_entries WHERE user_id = ? AND type = 'daily_reflection' AND DATE(created_at) = CURDATE() ORDER BY created_at DESC LIMIT 1",
      args: [userId]
    });
    const checkOut = todayReflectRes.rows[0]?.created_at as string;

    let wellbeingRoutine = [];
    try {
      if (userRow.wellbeing_routine) {
        wellbeingRoutine = JSON.parse(userRow.wellbeing_routine as string);
      }
    } catch (e) { console.error("Failed to parse wellbeingRoutine:", e); }

    const formatTime = (iso: string | undefined) => {
      if (!iso) return undefined;
      try {
        const date = new Date(iso);
        if (isNaN(date.getTime())) return undefined;
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      } catch (e) { return undefined; }
    }

    const rewardsRes = await db.execute("SELECT * FROM rewards");
    const rewards = rewardsRes.rows.map(r => ({
      id: r.id,
      title: r.title,
      points: Number(r.points_cost),
      category: r.category,
      tone: r.tone,
      glyph: r.glyph,
      description: r.description,
      stock: Number(r.stock)
    }));

    const rewardHistoryRes = await db.execute({
      sql: "SELECT * FROM user_rewards WHERE user_id = ? ORDER BY date DESC",
      args: [userId]
    });
    const rewardHistory = rewardHistoryRes.rows.map(r => ({
      id: r.id, title: r.title, points: r.points, date: r.date, glyph: r.glyph
    }));

    // Fetch logbook entries (recent 20)
    let logbook: any[] = [];
    try {
      const logRes = await db.execute({
        sql: "SELECT * FROM logbook_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
        args: [userId]
      });
      logbook = logRes.rows.map(r => ({
        id: r.id,
        type: r.type,
        title: r.title,
        content: r.content,
        points: r.points,
        metadata_json: r.metadata_json,
        created_at: r.created_at,
      }));
    } catch (e) {
      console.warn("Failed to fetch logbook:", e);
    }

    // Fetch unread notification count
    let unreadNotifications = 0;
    try {
      const notifRes = await db.execute({
        sql: "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0",
        args: [userId]
      });
      unreadNotifications = Number(notifRes.rows[0]?.c) || 0;
    } catch (e) {
      console.warn("Failed to fetch notification count:", e);
    }

    // Fetch learning items for employee
    let learning: any[] = [];
    try {
      const learningRes = await db.execute("SELECT * FROM learning_items");
      learning = learningRes.rows.map(r => ({
        id: r.id, title: r.title, description: r.description,
        type: r.type, url: r.url, tone: r.tone || 'blue',
        estimatedMinutes: r.estimated_minutes || 30,
      }));
    } catch (e) { /* table may not exist yet */ }

    const state = {
      mood: latestMood?.mood_key || 'calm',
      energy: latestMood?.energy_key || 'mid',
      tag: latestMood?.tag || null,
      intention: "",
      priorities,
      weeklyPriorities: [],
      habits,
      goals,
      surveys,
      feed,
      skills,
      learning,
      wellbeing: { dims: [], programs: learning, dailyPrompt: "" },
      points: user.points,
      coins: user.coins,
      notifications: unreadNotifications,
      rewards,
      rewardHistory,
      logbook,
      lastActivityDate: userRow.last_activity_at,
      penaltyActive: false,
      penaltyThresholdDays: 3,
      workSchedule,
      todayAttendance: {
        checkIn: formatTime(checkIn),
        checkOut: formatTime(checkOut),
      },
      personalWellbeingGoal: (userRow.personal_wellbeing_goal as string) || "",
      wellbeingRoutine,
      contacts,
      onboarded: !!userRow.is_onboarded,
      _skillMapping: skillMapping,
    };

    return NextResponse.json({ state, user });
  } catch (error: any) {
    console.error("Turso Fetch Error:", error);
    return NextResponse.json({
      error: 'Failed to read data from Turso',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { state, user, userId } = await request.json();
    if (!user || !userId || !state) return NextResponse.json({ error: 'User data, state or ID missing' });

    // Update User
    try {
      await db.execute({
        sql: `UPDATE users SET name = ?, streak = ?, points = ?, coins = ?, level = ?, \`rank\` = ?, avatar_image = ?, user_role_context = ?, last_activity_at = ?, personal_wellbeing_goal = ?, wellbeing_routine = ?, is_onboarded = ? WHERE id = ?`,
        args: [
          user.name, user.streak, user.points, user.coins, user.level, user.rank,
          user.avatarImage || null,
          user.userRole || user.role || 'employee', 
          state.lastActivityDate ? new Date(state.lastActivityDate).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
          state.personalWellbeingGoal || "",
          JSON.stringify(state.wellbeingRoutine || []),
          state.onboarded ? 1 : 0,
          userId
        ]
      });
    } catch (e: any) {
      console.error("Failed to update user state:", e);
      // Fallback if column truly doesn't exist despite migration attempt
      if (e.message?.includes('is_onboarded')) {
        await db.execute({
          sql: `UPDATE users SET name = ?, streak = ?, points = ?, coins = ?, level = ?, \`rank\` = ?, avatar_image = ?, user_role_context = ?, last_activity_at = ?, personal_wellbeing_goal = ?, wellbeing_routine = ? WHERE id = ?`,
          args: [
            user.name, user.streak, user.points, user.coins, user.level, user.rank,
            user.avatarImage || null,
            user.userRole || user.role, 
            state.lastActivityDate ? new Date(state.lastActivityDate).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
            state.personalWellbeingGoal || "",
            JSON.stringify(state.wellbeingRoutine || []),
            userId
          ]
        });
      } else throw e;
    }

    // Sync Rewards (Only HR can manage global rewards)
    // Check role or userRole context
    const activeRole = user.userRole || user.role;
    if (activeRole === 'hr' && state.rewards) {
      try {
        // Use a more robust sync: Delete and re-insert
        await db.execute("DELETE FROM rewards");
        for (const r of state.rewards) {
          await db.execute({
            sql: `INSERT INTO rewards (id, title, points_cost, category, tone, glyph, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [String(r.id), r.title, r.points, r.category || 'General', r.tone || 'blue', r.glyph || 'gift', r.description || '', r.stock || 0]
          });
        }
      } catch (e) {
        console.error("Reward sync error:", e);
      }
    }

    // Sync Reward History
    if (state.rewardHistory) {
      await db.execute({ sql: "DELETE FROM user_rewards WHERE user_id = ?", args: [userId] });
      for (const rh of state.rewardHistory) {
        await db.execute({
          sql: `INSERT INTO user_rewards (id, user_id, title, points, date, glyph) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [String(rh.id), userId, rh.title, rh.points, rh.date, rh.glyph || 'gift']
        });
      }
    }

    // Sync Daily Priorities — Use UPSERT to avoid duplicates
    if (state.priorities) {
      try {
        // 1. Get IDs of tasks in current state for today
        const stateTaskIds = state.priorities.map((p: any) => String(p.id));
        
        // 2. Delete tasks from DB that are for today or active but NOT in current state
        if (stateTaskIds.length > 0) {
          await db.execute({ 
            sql: `DELETE FROM daily_priorities 
                  WHERE user_id = ? 
                  AND (is_done = 0 OR COALESCE(DATE(target_date), DATE(created_at)) = CURDATE())
                  AND id NOT IN (${stateTaskIds.map(() => '?').join(',')})`, 
            args: [userId, ...stateTaskIds] 
          });
        }

        // 3. Upsert current tasks
        for (const p of state.priorities) {
          await db.execute({
            sql: `INSERT INTO daily_priorities (id, user_id, title, description, target_date, goal_title, goal_id, kpi_id, energy_level, est_time, is_done, is_verified, tone, proof_link, proof_notes, metric_value, time_tracked, timer_started_at, created_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                  ON DUPLICATE KEY UPDATE 
                  title=VALUES(title), description=VALUES(description), target_date=VALUES(target_date), goal_title=VALUES(goal_title), goal_id=VALUES(goal_id), 
                  kpi_id=VALUES(kpi_id), 
                  energy_level=VALUES(energy_level), est_time=VALUES(est_time), 
                  is_done=VALUES(is_done), is_verified=VALUES(is_verified), tone=VALUES(tone),
                  proof_link=VALUES(proof_link), proof_notes=VALUES(proof_notes), metric_value=VALUES(metric_value),
                  time_tracked=VALUES(time_tracked), timer_started_at=VALUES(timer_started_at)`,
            args: [p.id, userId, p.title, p.description || null, p.targetDate || null, p.goal || null, p.goal_id || null, p.kpi_id || null, p.energy, p.est, p.done ? 1 : 0, p.verified ? 1 : 0, p.tone, p.proof_link || null, p.proof_notes || null, p.metric_value || null, p.time_tracked || 0, p.timer_started_at || null]
          });
        }
      } catch (e) {
        console.error("Task sync error:", e);
      }
    }


    // Sync Habits
    if (state.habits) {
      await db.execute({ sql: "DELETE FROM habits WHERE user_id = ?", args: [userId] });
      for (const h of state.habits) {
        await db.execute({
          sql: `INSERT INTO habits (user_id, name, streak, target_days, is_done_today, glyph) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [userId, h.name, h.streak, h.target, h.done ? 1 : 0, h.glyph]
        });
      }
    }

    // Sync Goals — only sync goals this user OWNS or ASSIGNED (never touch others')
    if (state.goals) {
      // Only goals strictly owned by this user are candidates for deletion
      // Goals from teammates, company-wide, or subordinates are READ-ONLY in this user's sync
      const myOwnedGoalIds = state.goals
        .filter((g: any) => String(g.ownerId || '') === String(userId))
        .map((g: any) => String(g.id));

      // Goals this user assigned (as manager) — also owned by them conceptually
      const myAssignedGoalIds = state.goals
        .filter((g: any) => String(g.assignedById || '') === String(userId) && String(g.ownerId || '') !== String(userId))
        .map((g: any) => String(g.id));

      // Safe delete: only remove goals owned by this user that are no longer in state
      // NEVER delete goals owned by other users, even if they appear in state
      if (myOwnedGoalIds.length > 0) {
        try {
          await db.execute({
            sql: `DELETE FROM goals 
                  WHERE owner_id = ? 
                  AND id NOT IN (${myOwnedGoalIds.map(() => '?').join(',')})`,
            args: [userId, ...myOwnedGoalIds]
          });
        } catch (e) {
          console.error("Goal deletion sync error (owned):", e);
        }
      } else {
        // If user has no goals in state, do NOT delete anything —
        // state may just be loading/incomplete; skip deletion to prevent data loss
        // (goals will still be upserted below when user adds new ones)
      }

      // Safe delete: only remove goals assigned BY this user that are no longer in state
      if (myAssignedGoalIds.length > 0) {
        try {
          await db.execute({
            sql: `DELETE FROM goals 
                  WHERE assigned_by_id = ? 
                  AND owner_id != ? 
                  AND id NOT IN (${myAssignedGoalIds.map(() => '?').join(',')})`,
            args: [userId, userId, ...myAssignedGoalIds]
          });
        } catch (e) {
          console.error("Goal deletion sync error (assigned):", e);
        }
      }

      for (const g of state.goals) {
        // Only UPSERT goals this user owns or assigned — don't overwrite other users' goals
        const goalOwnerId = String(g.ownerId || '');
        const goalAssignedById = String(g.assignedById || '');
        if (goalOwnerId !== String(userId) && goalAssignedById !== String(userId)) continue;

        await db.execute({
          sql: `INSERT INTO goals (id, owner_id, title, progress, alignment, due_date, tone, metric, scope, parent_id, assigned_by_id, status, is_kpi) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                owner_id=VALUES(owner_id), title=VALUES(title), progress=VALUES(progress), alignment=VALUES(alignment), 
                due_date=VALUES(due_date), tone=VALUES(tone), metric=VALUES(metric), 
                scope=VALUES(scope), parent_id=VALUES(parent_id), assigned_by_id=VALUES(assigned_by_id),
                status=VALUES(status), is_kpi=VALUES(is_kpi)`,
          args: [String(g.id), String(g.ownerId || userId), g.title, g.progress, g.alignment, g.dueISO || g.due, g.tone, g.metric, g.scope, g.parent_id || null, g.assignedById || null, g.status || 'pending', g.is_kpi ? 1 : 0]
        });

        // Sync Sub-goals
        if (g.subGoals) {
          await db.execute({ sql: "DELETE FROM sub_goals WHERE goal_id = ?", args: [String(g.id)] });
          for (const sg of g.subGoals) {
            await db.execute({
              sql: `INSERT INTO sub_goals (goal_id, title, is_done) VALUES (?, ?, ?)`,
              args: [String(g.id), sg.title, sg.done ? 1 : 0]
            });
          }
        }
      }
    }

    // Sync Skills
    if (state.skills) {
      await db.execute({ sql: "DELETE FROM user_skills WHERE user_id = ?", args: [userId] });
      for (const sk of state.skills) {
        await db.execute({
          sql: `INSERT INTO user_skills (user_id, name, current_level, target_level) VALUES (?, ?, ?, ?)`,
          args: [userId, sk.name, sk.current || 0, sk.target || 100]
        });
      }
    }

    // Sync Global Settings (Contacts, Work Schedule) - HR/Manager only
    if (user.role === 'hr') {
      if (state.contacts) {
        await db.execute({
          sql: `INSERT INTO global_settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
          args: ["contacts", JSON.stringify(state.contacts)]
        });
      }
      if (state.workSchedule) {
        await db.execute({
          sql: `INSERT INTO global_settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
          args: ["work_schedule", JSON.stringify(state.workSchedule)]
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Updated Turso successfully' });
  } catch (error: any) {
    console.error("Turso Sync Error:", error);
    return NextResponse.json({
      error: 'Failed to sync data to Turso',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
