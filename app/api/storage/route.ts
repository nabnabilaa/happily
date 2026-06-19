import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hpEventEmitter } from '@/lib/events';

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
      sql: `SELECT * FROM daily_priorities 
            WHERE user_id = ? 
              AND (is_done = 0 OR COALESCE(DATE(target_date), DATE(created_at)) = CURDATE()) 
            ORDER BY is_done ASC, 
                     CASE energy_level WHEN 'high' THEN 1 WHEN 'mid' THEN 2 WHEN 'low' THEN 3 ELSE 2 END ASC, 
                     COALESCE(target_date, created_at) ASC, 
                     id ASC`,
      args: [userId]
    });
    const priorities = prioritiesRes.rows.map(r => {
      const parsedId = isNaN(Number(r.id)) ? r.id : Number(r.id);
      return {
        id: parsedId,
        title: r.title,
        description: r.description,
        targetDate: r.target_date,
        goal: r.goal_title,
        goal_id: r.goal_id ? (isNaN(Number(r.goal_id)) ? r.goal_id : Number(r.goal_id)) : null,
        kpi_id: r.kpi_id ? (isNaN(Number(r.kpi_id)) ? r.kpi_id : Number(r.kpi_id)) : null,
        kpi_title: r.goal_title || null,
        energy: r.energy_level,
        est: r.est_time,
        done: !!r.is_done,
        verified: !!r.is_verified,
        status: r.status || 'todo',
        tone: r.tone,
        time_tracked: Number(r.time_tracked) || 0,
        timer_started_at: r.timer_started_at || null,
        proof_links: r.proof_link ? [r.proof_link] : [],
        completion_notes: r.proof_notes || null,
        created_at: r.created_at
      };
    });


    const habitsRes = await db.execute({
      sql: "SELECT * FROM habits WHERE user_id = ?",
      args: [userId]
    });
    const habitsUnique: any[] = [];
    const seenHabits = new Set<string>();
    for (const r of habitsRes.rows) {
      const habitNameLower = (r.name || '').toLowerCase().trim();
      if (!habitNameLower || seenHabits.has(habitNameLower)) continue;
      seenHabits.add(habitNameLower);
      let completedDates = null;
      try {
        if (r.completed_dates) {
          completedDates = typeof r.completed_dates === 'string' ? JSON.parse(r.completed_dates) : r.completed_dates;
        }
      } catch (e) { console.error("Failed to parse habit completed_dates", e); }
      
      const todayReal = new Date();
      const todayStr = `${todayReal.getFullYear()}-${String(todayReal.getMonth() + 1).padStart(2, '0')}-${String(todayReal.getDate()).padStart(2, '0')}`;
      const isDoneToday = completedDates ? completedDates.includes(todayStr) : !!r.is_done_today;

      habitsUnique.push({
        name: r.name, streak: r.streak, target: r.target_days, done: isDoneToday, glyph: r.glyph, completedDates
      });
    }

    // Legacy goals are replaced by KPIs. Returning empty array for backward compatibility
    const goals: any[] = [];

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
      sql: "SELECT * FROM user_rewards WHERE user_id = ? ORDER BY date DESC LIMIT 10",
      args: [userId]
    });
    const rewardHistory = rewardHistoryRes.rows.map(r => ({
      id: r.id, title: r.title, points: r.points, date: r.date, glyph: r.glyph
    }));

    // Fetch logbook entries (recent 10)
    let logbook: any[] = [];
    try {
      const logRes = await db.execute({
        sql: "SELECT * FROM logbook_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
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
      intention: userRow.focus_intention || "",
      focusTaskId: userRow.focus_task_id ? (isNaN(Number(userRow.focus_task_id)) ? userRow.focus_task_id : Number(userRow.focus_task_id)) : null,
      focusProgress: userRow.focus_progress || 0,
      priorities,
      weeklyPriorities: [],
      habits: habitsUnique,
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
    console.error("Database Fetch Error:", error);
    return NextResponse.json({
      error: 'Failed to read data from database',
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
        sql: `UPDATE users SET name = ?, streak = ?, avatar_image = ?, user_role_context = ?, last_activity_at = ?, personal_wellbeing_goal = ?, wellbeing_routine = ?, is_onboarded = ?, focus_task_id = ?, focus_progress = ?, focus_intention = ? WHERE id = ?`,
        args: [
          user.name, user.streak,
          user.avatarImage || null,
          user.userRole || user.role || 'employee', 
          state.lastActivityDate ? new Date(state.lastActivityDate).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
          state.personalWellbeingGoal || "",
          JSON.stringify(state.wellbeingRoutine || []),
          state.onboarded ? 1 : 0,
          state.focusTaskId || null,
          state.focusProgress || 0,
          state.intention || "",
          userId
        ]
      });
    } catch (e: any) {
      console.error("Failed to update user state:", e);
      // Fallback if column truly doesn't exist despite migration attempt
      if (e.message?.includes('is_onboarded')) {
        await db.execute({
          sql: `UPDATE users SET name = ?, streak = ?, avatar_image = ?, user_role_context = ?, last_activity_at = ?, personal_wellbeing_goal = ?, wellbeing_routine = ? WHERE id = ?`,
          args: [
            user.name, user.streak,
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
    if ((activeRole === 'hr') && state.rewards) {
      try {
        // Programmatic Diffing for Rewards instead of deleting all
        const dbRewardsRes = await db.execute("SELECT id, title, points_cost, category, tone, glyph, description, stock FROM rewards");
        const dbRewardsMap = new Map(dbRewardsRes.rows.map(r => [String(r.id), r]));
        const payloadRewardIds = new Set(state.rewards.map((r: any) => String(r.id)));

        // 1. Delete rewards that are not in the payload
        const deleteIds = Array.from(dbRewardsMap.keys()).filter(id => !payloadRewardIds.has(id));
        if (deleteIds.length > 0) {
          await db.execute({
            sql: `DELETE FROM rewards WHERE id IN (${deleteIds.map(() => '?').join(',')})`,
            args: deleteIds
          });
        }

        // 2. Insert or update rewards in payload
        for (const r of state.rewards) {
          const idStr = String(r.id);
          const existing = dbRewardsMap.get(idStr);
          if (!existing) {
            await db.execute({
              sql: `INSERT INTO rewards (id, title, points_cost, category, tone, glyph, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [idStr, r.title, r.points, r.category || 'General', r.tone || 'blue', r.glyph || 'gift', r.description || '', r.stock || 0]
            });
          } else {
            // Only update if something changed
            const pointsCost = Number(existing.points_cost);
            const stockVal = Number(existing.stock);
            if (
              existing.title !== r.title ||
              pointsCost !== r.points ||
              existing.category !== (r.category || 'General') ||
              existing.tone !== (r.tone || 'blue') ||
              existing.glyph !== (r.glyph || 'gift') ||
              existing.description !== (r.description || '') ||
              stockVal !== (r.stock || 0)
            ) {
              await db.execute({
                sql: `UPDATE rewards SET title = ?, points_cost = ?, category = ?, tone = ?, glyph = ?, description = ?, stock = ? WHERE id = ?`,
                args: [r.title, r.points, r.category || 'General', r.tone || 'blue', r.glyph || 'gift', r.description || '', r.stock || 0, idStr]
              });
            }
          }
        }
      } catch (e) {
        console.error("Reward sync error:", e);
      }
    }

    // Sync Reward History (Programmatic Diffing)
    if (state.rewardHistory) {
      try {
        const dbHistoryRes = await db.execute({
          sql: "SELECT id, title, points, date, glyph FROM user_rewards WHERE user_id = ?",
          args: [userId]
        });
        const dbHistoryMap = new Map(dbHistoryRes.rows.map(r => [String(r.id), r]));
        const payloadHistoryIds = new Set(state.rewardHistory.map((rh: any) => String(rh.id)));

        // Delete history entries that are not in the payload
        const deleteHistoryIds = Array.from(dbHistoryMap.keys()).filter(id => !payloadHistoryIds.has(id));
        if (deleteHistoryIds.length > 0) {
          await db.execute({
            sql: `DELETE FROM user_rewards WHERE user_id = ? AND id IN (${deleteHistoryIds.map(() => '?').join(',')})`,
            args: [userId, ...deleteHistoryIds]
          });
        }

        // Insert or update entries in payload
        for (const rh of state.rewardHistory) {
          const idStr = String(rh.id);
          const existing = dbHistoryMap.get(idStr);
          if (!existing) {
            await db.execute({
              sql: `INSERT INTO user_rewards (id, user_id, title, points, date, glyph) VALUES (?, ?, ?, ?, ?, ?)`,
              args: [idStr, userId, rh.title, rh.points, rh.date, rh.glyph || 'gift']
            });
          } else {
            // Update if changed
            const pointsVal = Number(existing.points);
            if (
              existing.title !== rh.title ||
              pointsVal !== rh.points ||
              existing.date !== rh.date ||
              existing.glyph !== (rh.glyph || 'gift')
            ) {
              await db.execute({
                sql: `UPDATE user_rewards SET title = ?, points = ?, date = ?, glyph = ? WHERE user_id = ? AND id = ?`,
                args: [rh.title, rh.points, rh.date, rh.glyph || 'gift', userId, idStr]
              });
            }
          }
        }
      } catch (e) {
        console.error("Reward history sync error:", e);
      }
    }

    // Sync Daily Priorities — Use UPSERT to avoid duplicates
    if (state.priorities) {
      try {
        // Filter out junk/invalid entries before syncing
        const BLOCKED_TITLES = ['hai ndbdlijd n debuj', 'jecn wejencj qndjkdn'];
        const cleanPriorities = state.priorities.filter((p: any) => {
          if (!p.title || p.title.trim().length < 2) return false;
          if (BLOCKED_TITLES.includes(p.title.toLowerCase().trim())) return false;
          return true;
        });

        // 1. Get IDs of tasks in current state for today
        const stateTaskIds = cleanPriorities.map((p: any) => String(p.id));
        
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

        // Also always purge blocked titles regardless
        await db.execute({
          sql: `DELETE FROM daily_priorities WHERE user_id = ? AND LOWER(TRIM(title)) IN (${BLOCKED_TITLES.map(() => '?').join(',')})`,
          args: [userId, ...BLOCKED_TITLES]
        });

        // 3. Upsert current tasks
        for (const p of cleanPriorities) {
          await db.execute({
            sql: `INSERT INTO daily_priorities (id, user_id, title, description, target_date, goal_title, goal_id, kpi_id, energy_level, est_time, is_done, is_verified, status, tone, proof_link, proof_notes, metric_value, time_tracked, timer_started_at, created_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                  ON DUPLICATE KEY UPDATE 
                  title=VALUES(title), description=VALUES(description), target_date=VALUES(target_date), goal_title=VALUES(goal_title), goal_id=VALUES(goal_id), 
                  kpi_id=VALUES(kpi_id), 
                  energy_level=VALUES(energy_level), est_time=VALUES(est_time), 
                  is_done=VALUES(is_done), is_verified=VALUES(is_verified), status=VALUES(status), tone=VALUES(tone),
                  proof_link=VALUES(proof_link), proof_notes=VALUES(proof_notes), metric_value=VALUES(metric_value),
                  time_tracked=VALUES(time_tracked), timer_started_at=VALUES(timer_started_at)`,
            args: [p.id, userId, p.title, p.description || null, p.targetDate || null, p.goal || null, p.goal_id || null, p.kpi_id || null, p.energy, p.est, p.done ? 1 : 0, p.verified ? 1 : 0, p.status || 'todo', p.tone, p.proof_links?.[0] || p.proof_link || null, p.completion_notes || p.proof_notes || null, p.metric_value || null, p.time_tracked || 0, p.timer_started_at || null]
          });
        }
      } catch (e) {
        console.error("Task sync error:", e);
      }
    }


    // Sync Habits (Programmatic Diffing)
    if (state.habits) {
      try {
        const dbHabitsRes = await db.execute({
          sql: "SELECT id, name, streak, target_days, is_done_today, glyph, completed_dates FROM habits WHERE user_id = ?",
          args: [userId]
        });
        const dbHabitsMap = new Map<string, any>();
        for (const r of dbHabitsRes.rows) {
          const key = (r.name || '').toLowerCase().trim();
          if (key) dbHabitsMap.set(key, r);
        }

        const payloadHabitsSet = new Set<string>();
        const seenHabits = new Set<string>();

        for (const h of state.habits) {
          const habitNameLower = (h.name || '').toLowerCase().trim();
          if (!habitNameLower || seenHabits.has(habitNameLower)) continue;
          seenHabits.add(habitNameLower);
          payloadHabitsSet.add(habitNameLower);

          const existing = dbHabitsMap.get(habitNameLower);
          const isDoneTodayVal = h.done ? 1 : 0;
          const completedDatesStr = h.completedDates ? JSON.stringify(h.completedDates) : null;

          if (!existing) {
            // Insert new habit
            await db.execute({
              sql: `INSERT INTO habits (user_id, name, streak, target_days, is_done_today, glyph, completed_dates) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [userId, h.name, h.streak, h.target, isDoneTodayVal, h.glyph, completedDatesStr]
            });
          } else {
            // Parse existing completed dates to compare safely
            let existingCompletedDatesStr = null;
            if (existing.completed_dates) {
              existingCompletedDatesStr = typeof existing.completed_dates === 'string' 
                ? existing.completed_dates 
                : JSON.stringify(existing.completed_dates);
            }
            const existingIsDone = Number(existing.is_done_today);
            const existingStreak = Number(existing.streak);
            const existingTarget = Number(existing.target_days);

            // Update only if anything changed
            if (
              existingStreak !== h.streak ||
              existingTarget !== h.target ||
              existingIsDone !== isDoneTodayVal ||
              existing.glyph !== h.glyph ||
              existingCompletedDatesStr !== completedDatesStr ||
              existing.name !== h.name
            ) {
              await db.execute({
                sql: `UPDATE habits SET streak = ?, target_days = ?, is_done_today = ?, glyph = ?, completed_dates = ?, name = ? WHERE id = ? AND user_id = ?`,
                args: [h.streak, h.target, isDoneTodayVal, h.glyph, completedDatesStr, h.name, existing.id, userId]
              });
            }
          }
        }

        // Delete habits in DB that are not in the payload
        const deleteHabitIds = Array.from(dbHabitsMap.entries())
          .filter(([key]) => !payloadHabitsSet.has(key))
          .map(([, r]) => r.id);

        if (deleteHabitIds.length > 0) {
          await db.execute({
            sql: `DELETE FROM habits WHERE user_id = ? AND id IN (${deleteHabitIds.map(() => '?').join(',')})`,
            args: [userId, ...deleteHabitIds]
          });
        }
      } catch (e) {
        console.error("Habit sync error:", e);
      }
    }

    // Sync Goals — Legacy goals are now handled by KPI endpoints
    if (state.goals) {
      // Do nothing, KPIs are handled by /api/kpi routes.
    }

    // Sync Skills (Programmatic Diffing)
    if (state.skills) {
      try {
        const dbSkillsRes = await db.execute({
          sql: "SELECT id, name, current_level, target_level FROM user_skills WHERE user_id = ?",
          args: [userId]
        });
        const dbSkillsMap = new Map<string, any>();
        for (const r of dbSkillsRes.rows) {
          const key = (r.name || '').toLowerCase().trim();
          if (key) dbSkillsMap.set(key, r);
        }

        const payloadSkillsSet = new Set<string>();

        for (const sk of state.skills) {
          const skillKey = (sk.name || '').toLowerCase().trim();
          if (!skillKey) continue;
          payloadSkillsSet.add(skillKey);

          const existing = dbSkillsMap.get(skillKey);
          const currentLevel = sk.current || 0;
          const targetLevel = sk.target || 100;

          if (!existing) {
            await db.execute({
              sql: `INSERT INTO user_skills (user_id, name, current_level, target_level) VALUES (?, ?, ?, ?)`,
              args: [userId, sk.name, currentLevel, targetLevel]
            });
          } else {
            const existingCurrent = Number(existing.current_level);
            const existingTarget = Number(existing.target_level);
            if (
              existingCurrent !== currentLevel ||
              existingTarget !== targetLevel ||
              existing.name !== sk.name
            ) {
              await db.execute({
                sql: `UPDATE user_skills SET current_level = ?, target_level = ?, name = ? WHERE id = ? AND user_id = ?`,
                args: [currentLevel, targetLevel, sk.name, existing.id, userId]
              });
            }
          }
        }

        // Delete skills in DB that are not in the payload
        const deleteSkillIds = Array.from(dbSkillsMap.entries())
          .filter(([key]) => !payloadSkillsSet.has(key))
          .map(([, r]) => r.id);

        if (deleteSkillIds.length > 0) {
          await db.execute({
            sql: `DELETE FROM user_skills WHERE user_id = ? AND id IN (${deleteSkillIds.map(() => '?').join(',')})`,
            args: [userId, ...deleteSkillIds]
          });
        }
      } catch (e) {
        console.error("Skill sync error:", e);
      }
    }

    // Sync Global Settings (Contacts, Work Schedule) - HR/Manager only
    if (user.role === 'hr' || user.userRole === 'hr') {
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

    // Trigger serverless-compatible real-time update using Pusher with local fallback
    const { triggerRealtimeUpdate } = await import('@/lib/realtime');
    await triggerRealtimeUpdate(userId, { type: "refresh" });

    return NextResponse.json({ success: true, message: 'Updated database successfully' });
  } catch (error: any) {
    console.error("Database Sync Error:", error);
    return NextResponse.json({
      error: 'Failed to sync data to database',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

