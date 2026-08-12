import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hpEventEmitter } from '@/lib/events';
import { sqlWibDate, SQL_WIB_TODAY } from '@/lib/timeUtils';
import { normalizeTaskStatus, TASK_STATUS } from '@/lib/taskStatus';
import { getRequesterAccess, canHrAdmin } from '@/lib/hrAuth';
import { requireSelfOrHrAdmin } from "@/lib/apiAuth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'UserId missing' }, { status: 400 });

    /*
     * Blob ini berisi seluruh isi kepala seorang karyawan: mood, energi,
     * riwayat perasaan, goal, kebiasaan, catatan, jawaban survei — 34 kunci.
     * Sebelum pemeriksaan ini, `?userId=` dipercaya apa adanya, jadi karyawan
     * mana pun bisa membaca milik rekannya hanya dengan mengganti satu
     * parameter di URL. Data wellbeing adalah yang paling sensitif di produk
     * ini dan justru yang paling terbuka.
     *
     * HR-Admin tetap boleh membaca lintas orang — konsol HR memang berdiri di
     * atas endpoint yang sama.
     */
    const access = await requireSelfOrHrAdmin(request, userId);
    if ("response" in access) return access.response;

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
      onboarded: !!userRow.is_onboarded,
      department: userRow.department || null,
      department_status: userRow.department_status || null,
      hrAccess: Number(userRow.hr_access) === 1
    };

    // 2. Fetch State components
    // Dates are compared in WIB, not in the server's clock. `target_date` is
    // written by the client as a WIB calendar date, but CURDATE() here is UTC
    // (this MySQL runs with NOW() == UTC_TIMESTAMP()). Between 00:00 and 07:00
    // WIB the two disagree by a day, so today's tasks failed every branch of
    // this filter and dropped out of the payload — the client then synced that
    // shorter list straight back and the tasks were deleted for real.
    const prioritiesRes = await db.execute({
      sql: `SELECT * FROM daily_priorities
            WHERE user_id = ?
              AND (is_done = 0
                   OR COALESCE(DATE(target_date), DATE(CONVERT_TZ(created_at, '+00:00', '+07:00')))
                      = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))
                   OR DATE(CONVERT_TZ(completed_at, '+00:00', '+07:00'))
                      = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')))
            ORDER BY is_done ASC,
                     CASE energy_level WHEN 'high' THEN 1 WHEN 'mid' THEN 2 WHEN 'low' THEN 3 ELSE 2 END ASC,
                     COALESCE(target_date, created_at) ASC,
                     id ASC`,
      args: [userId]
    });
    const priorities = prioritiesRes.rows.map(r => {
      const parsedId = isNaN(Number(r.id)) ? r.id : Number(r.id);
      let tDate = '';
      if (r.target_date) {
        if (r.target_date instanceof Date) {
          const d = r.target_date;
          tDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else {
          const str = String(r.target_date);
          tDate = str.includes('T') ? str.split('T')[0] : (str.includes(' ') ? str.split(' ')[0] : str);
        }
      } else {
        const d = r.created_at ? (r.created_at instanceof Date ? r.created_at : new Date(r.created_at)) : new Date();
        tDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      return {
        id: parsedId,
        title: r.title,
        description: r.description,
        targetDate: tDate,
        goal: r.goal_title,
        goal_id: r.goal_id ? (isNaN(Number(r.goal_id)) ? r.goal_id : Number(r.goal_id)) : null,
        kpi_id: r.kpi_id ? (isNaN(Number(r.kpi_id)) ? r.kpi_id : Number(r.kpi_id)) : null,
        kpi_title: r.goal_title || null,
        energy: r.energy_level,
        est: r.est_time,
        done: !!r.is_done,
        verified: !!r.is_verified,
        // Dinormalkan, bukan mentah. Kolom ini menyimpan lima ejaan untuk tiga
        // keadaan nyata (done/accepted/verified/pending/reject) karena beberapa
        // jalur tulis lama menulis kosakatanya sendiri. /api/manager/tasks/pending
        // sudah menormalkan; endpoint ini tidak, jadi kartu karyawan mencocokkan
        // `status === 'pending_review'` terhadap nilai seperti 'done' dan tidak
        // pernah cocok: manager melihat task di antreannya, karyawan tidak
        // melihat banner "menunggu ACC" untuk task yang sama.
        status: normalizeTaskStatus(r.status) || TASK_STATUS.TODO,
        tone: r.tone,
        time_tracked: Number(r.time_tracked) || 0,
        timer_started_at: r.timer_started_at || null,
        proof_links: (() => { try { const v = JSON.parse(r.proof_link as string); return Array.isArray(v) ? v : [r.proof_link as string]; } catch { return r.proof_link ? [r.proof_link as string] : []; } })(),
        completion_notes: r.proof_notes || null,
        weekly_target_id: r.weekly_target_id || null,
        weekly_target_title: r.weekly_target_title || null,
        partial_progress: Number(r.partial_progress) || 0,
        metric_value: r.metric_value !== null && r.metric_value !== undefined ? Number(r.metric_value) : null,
        is_project: !!r.is_project,
        completed_at: r.completed_at || null,
        due_date: r.due_date || null,
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

    // Fetch Latest Mood Checkin.
    // `created_at` comes along because the UI needs to know *when* the feeling
    // was recorded, not just what it was: a mood with no timestamp reads as
    // today's even when it was logged last week.
    const moodRes = await db.execute({
      sql: "SELECT mood_key, energy_key, tag, created_at FROM mood_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [userId]
    });
    const latestMood = moodRes.rows[0];

    /*
     * Mood history, 7 days.
     *
     * The wellbeing engine's "two or more negative moods" rule reads this. It
     * used to be an in-memory array that only the mid-day and reflect modals
     * ever appended to, so it started empty on every page load and the rule
     * could effectively never fire. `mood_checkins` has been the real record
     * all along — this just hands it to the client.
     */
    let moodHistory: { time: string; mood: string }[] = [];
    try {
      const historyRes = await db.execute({
        sql: `SELECT mood_key, created_at FROM mood_checkins
              WHERE user_id = ? AND ${sqlWibDate('created_at')} > DATE_SUB(${SQL_WIB_TODAY}, INTERVAL 7 DAY)
              ORDER BY created_at ASC`,
        args: [userId]
      });
      moodHistory = historyRes.rows.map((r: any) => ({
        time: new Date(r.created_at).toISOString(),
        mood: String(r.mood_key),
      }));
    } catch (e) { console.error("Failed to load mood history", e); }

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
    let onboardingConfig: any[] | null = null;
    settingsRes.rows.forEach(r => {
      try {
        if (r.key === 'contacts' && r.value) contacts = JSON.parse(r.value as string);
        if (r.key === 'work_schedule' && r.value) workSchedule = JSON.parse(r.value as string);
        if (r.key === 'skill_mapping' && r.value) skillMapping = JSON.parse(r.value as string);
        if (r.key === 'onboardingConfig' && r.value) onboardingConfig = JSON.parse(r.value as string);
      } catch (e) { console.error(`Error parsing setting ${r.key}:`, e); }
    });

    // Fetch Today's Attendance — "hari ini" mengikuti kalender WIB. Dua query
    // ini yang menentukan isClockedIn/isClockedOut di klien, jadi kalau harinya
    // meleset, pengingat istirahat/pulang ikut salah sasaran.
    const todayAttRes = await db.execute({
      sql: `SELECT check_in_at as created_at FROM attendance
            WHERE user_id = ? AND ${sqlWibDate('check_in_at')} = ${SQL_WIB_TODAY}
            ORDER BY check_in_at ASC LIMIT 1`,
      args: [userId]
    });
    const checkIn = todayAttRes.rows[0]?.created_at as string;

    const todayReflectRes = await db.execute({
      sql: `SELECT created_at FROM logbook_entries
            WHERE user_id = ? AND type = 'daily_reflection'
              AND ${sqlWibDate('created_at')} = ${SQL_WIB_TODAY}
            ORDER BY created_at DESC LIMIT 1`,
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
      sql: `SELECT r.id, rew.title, r.points_spent as points, r.created_at as date, rew.glyph, r.status, r.proof_link, r.reviewer_notes 
            FROM reward_redemptions r 
            JOIN rewards rew ON r.reward_id = rew.id 
            WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 10`,
      args: [userId]
    });
    const rewardHistory = rewardHistoryRes.rows.map(r => ({
      id: r.id, title: r.title, points: r.points, date: r.date, glyph: r.glyph, status: r.status, proofLink: r.proof_link, reviewerNotes: r.reviewer_notes
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
      // No invented defaults. `|| 'calm'` meant a user who had never checked in
      // was reported as calm and energetic — the app asserting a feeling on
      // their behalf, and the reason `!state.mood` never once evaluated true
      // anywhere downstream. Absent is absent.
      mood: latestMood?.mood_key || null,
      energy: latestMood?.energy_key || null,
      tag: latestMood?.tag || null,
      lastMoodCheckIn: latestMood?.created_at ? new Date(latestMood.created_at as any).toISOString() : null,
      moodHistory,
      intention: userRow.focus_intention || "",
      focusTaskId: userRow.focus_task_id ? (isNaN(Number(userRow.focus_task_id)) ? userRow.focus_task_id : Number(userRow.focus_task_id)) : null,
      focusProgress: userRow.focus_progress || 0,
      priorities,
      /*
       * Cap waktu server saat state ini dibaca.
       *
       * Klien mengirimkannya kembali di POST supaya server bisa membedakan
       * "pemakai mengubah nilai ini" dari "tab ini memegang salinan lama".
       * Tanpa penanda itu, satu-satunya aturan adalah siapa-menulis-terakhir,
       * dan tab yang sudah lama terbuka memutar mundur data yang lebih baru.
       */
      stateLoadedAt: new Date().toISOString(),
      // Dikembalikan supaya bintang di layar Rewards dan jawaban prompt lembur
      // selamat dari refresh. Tanpa dua baris ini, keduanya ditulis UI lalu
      // hilang tanpa jejak — simpan tetap membalas `success`.
      wishlistId: userRow.wishlist_id || null,
      overtimeStatus: userRow.overtime_status || null,
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
      onboardingConfig,
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

    /*
     * `?includeStatic=0` membuang data milik seluruh perusahaan dari balasan.
     *
     * Klien yang mengirimnya mengambil bagian itu dari `/api/company-data`,
     * yang punya ETag dan karenanya biasanya dijawab 304 tanpa badan pesan.
     * Tanpa parameter ini balasannya utuh seperti sebelumnya — jalur lain yang
     * memanggil endpoint ini (cache offline, alat internal) tidak ikut berubah.
     */
    if (searchParams.get("includeStatic") === "0") {
      const trimmed: Record<string, unknown> = { ...state };
      for (const k of ["rewards", "learning", "contacts", "workSchedule", "onboardingConfig", "wellbeing"]) {
        delete trimmed[k];
      }
      return NextResponse.json({ state: trimmed, user });
    }

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
    const body = await request.json();
    const { state, user, userId } = body;

    /*
     * Kapan klien terakhir MELIHAT keadaan server.
     *
     * Dipakai untuk menolak opini yang sudah kedaluwarsa: baris yang berubah
     * setelah cap waktu ini belum pernah dilihat si klien, jadi nilai yang ia
     * bawa bukan hasil keputusan pemakai melainkan sisa salinan lama.
     *
     * Klien lama yang belum mengirimnya tetap dilayani seperti sebelumnya —
     * pengaman ini hanya menyala kalau penandanya ada, supaya tab yang belum
     * memuat ulang kode tidak tiba-tiba berhenti bisa menyimpan.
     */
    const stateLoadedAt: string | null = state?.stateLoadedAt ?? null;

    /**
     * Apakah baris ini sudah berubah SETELAH klien terakhir melihat server?
     *
     * Kalau ya, nilai yang dibawa blob bukan keputusan pemakai melainkan sisa
     * salinan lama, dan menulisnya berarti memutar mundur pekerjaan orang lain.
     *
     * Mengembalikan `false` saat penanda tidak ada, supaya klien lama yang
     * belum mengirim `stateLoadedAt` tetap bisa menyimpan seperti sebelumnya —
     * pengaman ini tidak boleh mematikan tab yang belum memuat ulang kodenya.
     */
    const isStale = (rowUpdatedAt: unknown): boolean => {
      if (!stateLoadedAt || !rowUpdatedAt) return false;
      return new Date(rowUpdatedAt as any).getTime() > new Date(stateLoadedAt).getTime();
    };
    // Status 400 wajib ada. Tanpanya balasan ini terkirim sebagai HTTP 200,
    // `res.ok` di klien bernilai true, dan simpan yang GAGAL terlihat berhasil.
    // Jalur `sendBeacon` saat menutup halaman (lib/HPContext.tsx) membuat ini
    // jadi cara paling senyap untuk kehilangan data.
    if (!user || !userId || !state) {
      return NextResponse.json({ error: 'User data, state or ID missing' }, { status: 400 });
    }

    /*
     * Sisi tulis lebih berbahaya daripada sisi baca: terbukti runtime, emp007
     * mengganti nama emp008 menjadi "PWNED BY emp007" dan menimpa seluruh
     * state-nya hanya dengan mengirim `userId` orang lain — HTTP 200,
     * `{"success":true}`.
     */
    const access = await requireSelfOrHrAdmin(request, userId);
    if ("response" in access) return access.response;

    /*
     * Izin dibaca dari DB, sekali, di awal.
     *
     * Body request datang dari klien, jadi `user.role`/`user.userRole` di
     * dalamnya adalah klaim, bukan fakta. Beberapa blok di bawah menulis ke
     * tabel milik seluruh perusahaan (`rewards`, `global_settings`) dan
     * sebelumnya hanya dijaga oleh klaim itu.
     */
    const { role: verifiedRole, hrAccess: verifiedHrAccess } = await getRequesterAccess(userId);
    const verifiedCanHrAdmin = canHrAdmin(verifiedRole, verifiedHrAccess);

    /*
     * Update User — HANYA kolom yang benar-benar dimiliki blob ini.
     *
     * Blob dikirim dari state React sebuah tab, dan tab bisa memegang salinan
     * basi berjam-jam. Selama kolom yang punya endpoint pemilik ikut ditulis di
     * sini, endpoint itu selalu kalah: HR menyetujui divisi, lalu tab karyawan
     * yang masih memegang 'pending' mengembalikannya — tanpa error, tanpa jejak.
     * Jalur `beforeunload` di HPContext membuat sekadar me-refresh halaman jadi
     * satu operasi tulis, jadi "selesai, refresh, balik lagi" adalah gejala yang
     * persis diharapkan dari daftar kolom yang terlalu panjang.
     *
     * Yang TIDAK boleh ada di sini, beserta pemiliknya:
     *   streak             -> /api/attendance/check-in (dihitung server)
     *   user_role_context  -> /api/hr/update-role
     *   is_onboarded       -> /api/onboarding/complete
     *   department,
     *   department_status  -> /api/hr/department-requests, /api/onboarding/complete
     *
     * `name` dan `avatar_image` tetap di sini karena memang diedit pemakainya
     * sendiri lewat ProfileEditorModal dan tidak punya jalur tulis lain.
     *
     * `last_activity_at` memakai jam server. Nilai sebelumnya berasal dari
     * `state.lastActivityDate` milik klien, sehingga jam browser yang meleset
     * bisa memundurkan cap waktu dan memicu alert "tidak aktif" di manager.
     */
    /*
     * Blok kolom ini juga bisa dimundurkan tab basi.
     *
     * `name`, avatar, niat fokus, wishlist, dan sisanya ditulis dari blob, jadi
     * mengganti nama profil di satu tab bisa dibatalkan oleh tab lain yang
     * sudah lama terbuka lalu menyimpan hal yang sama sekali berbeda.
     *
     * `state_updated_at` adalah kolom tersendiri yang HANYA ditulis di sini,
     * supaya penandanya tidak bergerak karena hal lain. Kalau nilainya lebih
     * baru dari salinan klien, seluruh blok dilewati — bukan sebagian, karena
     * kesembilan kolom itu berasal dari satu snapshot yang sama basinya.
     */
    const userRowNow = await db.execute({
      sql: "SELECT state_updated_at FROM users WHERE id = ?",
      args: [userId],
    });
    const userBlockStale = isStale(userRowNow.rows[0]?.state_updated_at);
    if (userBlockStale) {
      console.warn(
        `[storage] Melewati update kolom profil untuk ${userId}: ` +
        `baris lebih baru dari salinan klien (klien memuat ${stateLoadedAt})`
      );
    }

    try {
      if (!userBlockStale) await db.execute({
        sql: `UPDATE users SET name = ?, avatar_image = ?, last_activity_at = UTC_TIMESTAMP(), personal_wellbeing_goal = ?, wellbeing_routine = ?, focus_task_id = ?, focus_progress = ?, focus_intention = ?, wishlist_id = ?, overtime_status = ?, state_updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
        args: [
          user.name,
          user.avatarImage || null,
          state.personalWellbeingGoal || "",
          JSON.stringify(state.wellbeingRoutine || []),
          state.focusTaskId || null,
          state.focusProgress || 0,
          state.intention || "",
          // `?? null` dan bukan `|| null`: mencabut bintang mengirim null yang
          // memang harus tersimpan sebagai null, dan keduanya tidak punya
          // endpoint pemilik lain yang bisa kalah oleh tab basi.
          state.wishlistId ?? null,
          state.overtimeStatus ?? null,
          userId
        ]
      });
    } catch (e: any) {
      console.error("Failed to update user state:", e);
      throw e;
    }

    // Sync Rewards (Only HR can manage global rewards)
    //
    // Perannya WAJIB dibaca dari DB. Sebelumnya diambil dari `user.userRole`
    // di body request, padahal body dikirim klien: siapa pun cukup mengirim
    // `userRole: 'hr'` untuk masuk ke cabang di bawah, dan cabang ini
    // merekonsiliasi tabel `rewards` milik seluruh perusahaan terhadap payload
    // — termasuk MENGHAPUS baris yang tidak ada di sana.
    if (verifiedRole === 'hr' && state.rewards) {
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

        /*
         * TIDAK ada penghapusan di sini, dan ini bukan kelalaian.
         *
         * GET di atas membaca riwayat dengan `ORDER BY date DESC LIMIT 10`, jadi
         * klien tidak pernah memegang lebih dari sepuluh baris terbaru. Blok
         * lama membaca SEMUA baris milik user lalu menghapus yang id-nya tidak
         * ada di payload — artinya setiap sync menghapus permanen riwayat
         * penukaran ke-11 dan seterusnya, diam-diam, untuk setiap pemakai yang
         * cukup sering menukar hadiah.
         *
         * Riwayat penukaran itu catatan transaksi: hanya bertambah, dan yang
         * berhak menambahnya adalah /api/rewards/redemptions.
         */

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

    // Daily priorities are deliberately NOT synced here.
    //
    // This used to replay the client's whole task array: DELETE every row in
    // today's window whose id was absent from the payload, then re-upsert the
    // rest. That made every open tab an authority on the complete task list, so
    // any client holding a slightly stale array deleted rows it had simply
    // never heard of, and its `is_verified`/`status` values overwrote a
    // manager's ACC that had landed a moment earlier.
    //
    // Tasks now have owning endpoints that write immediately and touch only the
    // row in question: POST/DELETE /api/priorities, PATCH
    // /api/priorities/complete, and lib/taskReview.ts for the manager verdict.
    // Anything that mutates a task must go through those — a task that only
    // changes React state will not be persisted, and that is intentional.


    // Sync Habits (Programmatic Diffing)
    if (state.habits) {
      try {
        const dbHabitsRes = await db.execute({
          sql: "SELECT id, name, streak, target_days, is_done_today, glyph, completed_dates, updated_at FROM habits WHERE user_id = ?",
          args: [userId]
        });
        const dbHabitsMap = new Map<string, any>();
        for (const r of dbHabitsRes.rows) {
          const key = (r.name || '').toLowerCase().trim();
          if (key) dbHabitsMap.set(key, r);
        }

        const seenHabits = new Set<string>();

        for (const h of state.habits) {
          const habitNameLower = (h.name || '').toLowerCase().trim();
          if (!habitNameLower || seenHabits.has(habitNameLower)) continue;
          seenHabits.add(habitNameLower);

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

            /*
             * Baris yang LEBIH BARU dari salinan si klien tidak boleh ditimpa.
             *
             * Blob ini berisi seluruh state satu tab, dan tab bisa memegang
             * salinan berjam-jam. Tanpa perbandingan waktu, urutan berikut
             * memutar mundur data tanpa satu pun error:
             *
             *   1. Tab A memuat state
             *   2. Pihak lain menaikkan streak di server (tab kedua, cron,
             *      aksi manajer)
             *   3. Pemakai mengetik sesuatu yang LAIN di tab A — niat harian,
             *      misalnya — dan blob ikut membawa salinan basi kebiasaan
             *   4. Streak kembali ke nilai lama
             *
             * Terbukti runtime sebelum pengaman ini: streak 99 dimundurkan ke 1
             * oleh tab yang tidak pernah menyentuh kebiasaan itu (lihat
             * audit/probe-writeback.js).
             *
             * `stateLoadedAt` dikirim klien, berisi cap waktu server saat GET
             * mengembalikan state. Kalau baris berubah setelah itu, si klien
             * belum pernah melihat perubahannya — jadi opininya tentang baris
             * ini sudah kedaluwarsa dan diabaikan. Perubahan lain di blob yang
             * sama tetap diproses.
             */
            const clientIsStale = isStale(existing.updated_at);
            if (clientIsStale) {
              console.warn(
                `[storage] Melewati update habit "${existing.name}" untuk ${userId}: ` +
                `baris lebih baru dari salinan klien (klien memuat ${stateLoadedAt})`
              );
            }

            // Update only if anything changed
            if (
              !clientIsStale && (
              existingStreak !== h.streak ||
              existingTarget !== h.target ||
              existingIsDone !== isDoneTodayVal ||
              existing.glyph !== h.glyph ||
              existingCompletedDatesStr !== completedDatesStr ||
              existing.name !== h.name
            )) {
              await db.execute({
                sql: `UPDATE habits SET streak = ?, target_days = ?, is_done_today = ?, glyph = ?, completed_dates = ?, name = ? WHERE id = ? AND user_id = ?`,
                args: [h.streak, h.target, isDoneTodayVal, h.glyph, completedDatesStr, h.name, existing.id, userId]
              });
            }
          }
        }

        /*
         * Habit yang tidak ada di payload DIBIARKAN.
         *
         * GET membuang habit bernama kosong dan habit yang namanya bentrok
         * setelah di-lowercase (lihat blok dedupe di atas), jadi payload klien
         * memang bukan daftar lengkap. Menghapus selisihnya berarti menghapus
         * baris yang klien tidak pernah punya kesempatan untuk melihatnya.
         *
         * Penghapusan habit harus lewat jalurnya sendiri yang menyebut baris
         * yang dimaksud, bukan lewat selisih sebuah blob.
         */
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
          sql: "SELECT id, name, current_level, target_level, updated_at FROM user_skills WHERE user_id = ?",
          args: [userId]
        });
        const dbSkillsMap = new Map<string, any>();
        for (const r of dbSkillsRes.rows) {
          const key = (r.name || '').toLowerCase().trim();
          if (key) dbSkillsMap.set(key, r);
        }

        for (const sk of state.skills) {
          const skillKey = (sk.name || '').toLowerCase().trim();
          if (!skillKey) continue;

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

            // Penjaga yang sama seperti pada habits: baris yang berubah setelah
            // klien memuat state belum pernah dilihatnya, jadi nilainya bukan
            // keputusan pemakai melainkan sisa salinan lama.
            if (isStale(existing.updated_at)) {
              console.warn(`[storage] Melewati update skill "${existing.name}" untuk ${userId}: baris lebih baru dari salinan klien`);
            } else if (
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

        /*
         * Skill hanya bertambah dan naik level lewat `syncSkillProgress`; tidak
         * ada satu pun layar yang menghapusnya. Jadi selisih antara DB dan
         * payload tidak pernah berarti "user menghapus skill" — artinya cuma
         * tab ini belum sempat memuat baris tersebut. Menghapusnya membuat
         * progres skill hilang setiap kali dua tab tidak sinkron.
         */
      } catch (e) {
        console.error("Skill sync error:", e);
      }
    }

    // Sync Global Settings (Contacts, Work Schedule) — HR-Admin saja.
    // Sama seperti rewards: `global_settings` berlaku untuk seluruh perusahaan,
    // jadi syaratnya harus peran terverifikasi, bukan klaim dari body. Pemakai
    // ber-hrAccess ikut boleh, karena tab Contacts dan Work Hours memang ada di
    // konsol mereka.
    if (verifiedCanHrAdmin) {
      if (state.onboardingConfig) {
        try {
          await db.execute({
            sql: "INSERT INTO global_settings (`key`, value, updated_by) VALUES ('onboardingConfig', ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)",
            args: [JSON.stringify(state.onboardingConfig), userId]
          });
        } catch (e) { console.error("Failed to update onboardingConfig", e); }
      }
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

    /*
     * `originId` diteruskan apa adanya supaya tab PENGIRIM bisa mengenali
     * gemanya sendiri.
     *
     * Alurnya dulu: tab menyimpan → server memancarkan `refresh` ke
     * `user-{userId}` → tab yang SAMA menerimanya → ia menjalankan `fetchData`
     * lengkap atas data yang baru saja ia kirim sendiri. Satu GET penuh berisi
     * rewards, learning, dan feed kudos untuk setiap penyimpanan, hanya untuk
     * mengambil kembali keadaan yang sudah ada di memorinya.
     *
     * Tab LAIN milik user yang sama tetap menerima dan tetap menyegarkan —
     * yang dibuang hanya gema ke diri sendiri.
     */
    const { triggerRealtimeUpdate } = await import('@/lib/realtime');
    await triggerRealtimeUpdate(userId, {
      type: "refresh",
      originId: typeof body.originId === "string" ? body.originId : undefined,
    });

    /*
     * Cap waktu baru dikembalikan supaya klien bisa memajukan penandanya.
     *
     * Tanpa ini pengaman anti-mundur berbalik menyerang pemiliknya: tulisan
     * PERTAMA sebuah tab menaikkan `updated_at` melewati `stateLoadedAt` yang
     * ia pegang, sehingga tulisan KEDUA dari tab yang sama terbaca sebagai
     * "basi" dan diabaikan. Terbukti sebelum perbaikan ini: streak 1 → 5
     * berhasil, lalu 5 → 7 diam-diam tidak tersimpan.
     *
     * Diambil SETELAH semua penulisan selesai, jadi tulisan tab ini sendiri
     * selalu berada di bawah penanda barunya.
     */
    return NextResponse.json({
      success: true,
      message: 'Updated database successfully',
      stateLoadedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Database Sync Error:", error);
    return NextResponse.json({
      error: 'Failed to sync data to database',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

