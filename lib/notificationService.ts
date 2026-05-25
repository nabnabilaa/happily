import { db } from "@/lib/db";

// Define the structure of a notification template
export interface NotificationTemplate {
  triggerKey: string;
  titleTemplate: string;
  messageTemplate: string;
  type: "info" | "success" | "warning" | "error" | "reminder";
  category: "checkin" | "task" | "reminder" | "system";
}

// Default Fallback Templates in Memory (Ensures 100% reliability and robust performance)
export const FALLBACK_TEMPLATES: Record<string, Omit<NotificationTemplate, "triggerKey">> = {
  // --- Check-in Wellbeing Events ---
  "checkin_burnout": {
    titleTemplate: "Tenang dulu sejenak, {name} 🍃",
    messageTemplate: "Kamu mencatat mood '{mood}' dengan energi '{energy}'. Ingat, performa terbaik lahir dari istirahat yang cukup. Ambil jeda 5-10 menit ya.",
    type: "warning",
    category: "checkin",
  },
  "checkin_stressed": {
    titleTemplate: "Tarik napas dalam-dalam... 🌬️",
    messageTemplate: "Hari ini terasa '{tag}' dengan mood '{mood}'. Tenang, kamu tidak sendirian. Hubungi rekan tim jika butuh bantuan.",
    type: "warning",
    category: "checkin",
  },
  "checkin_low_energy": {
    titleTemplate: "Energi redup? Slow down, {name} 🔋",
    messageTemplate: "Mood kamu '{mood}' tapi energi sedang '{energy}'. Coba cicil task yang ringan dulu atau minum air putih.",
    type: "info",
    category: "checkin",
  },
  "checkin_high_performance": {
    titleTemplate: "Luar biasa! Semangat membara 🔥",
    messageTemplate: "Mood '{mood}' dan energi '{energy}'! Waktunya taklukkan target OKR hari ini. You got this!",
    type: "success",
    category: "checkin",
  },
  "checkin_normal": {
    titleTemplate: "Hari baru, lembaran baru! 🌟",
    messageTemplate: "Mari jalani hari ini dengan tenang dan konsisten. Fokus pada prioritas utamamu.",
    type: "info",
    category: "checkin",
  },

  // --- Task Events ---
  "task_approved": {
    titleTemplate: "Tugas Disetujui! 🎉",
    messageTemplate: "Tugas '{task_title}' kamu telah disetujui oleh {manager_name}. XP bertambah!",
    type: "success",
    category: "task",
  },
  "task_revision": {
    titleTemplate: "Perlu Revisi Tugas 📝",
    messageTemplate: "Manager ({manager_name}) meminta revisi untuk tugas '{task_title}'. Yuk cek bagian mana yang perlu diperbaiki.",
    type: "warning",
    category: "task",
  },
  "task_rejected": {
    titleTemplate: "Tugas Belum Sesuai ⚠️",
    messageTemplate: "Tugas '{task_title}' ditolak oleh {manager_name}. Hubungi manager-mu untuk feedback lebih lanjut.",
    type: "error",
    category: "task",
  },
  "task_overload": {
    titleTemplate: "Prioritas Terlalu Banyak? 🐝",
    messageTemplate: "Kamu membuat {count} tugas hari ini. Coba fokus pada 3 prioritas utama dulu agar tidak overwhelm.",
    type: "warning",
    category: "task",
  },

  // --- Time-based Reminders ---
  "reminder_midday": {
    titleTemplate: "Break Siang! 🍽️",
    messageTemplate: "Sudah jam {time}. Yuk istirahat dulu, regangkan otot, dan makan siang untuk isi energi kembali.",
    type: "reminder",
    category: "reminder",
  },
  "reminder_checkout": {
    titleTemplate: "Jam Pulang! Evaluasi Harimu 🌅",
    messageTemplate: "Hari kerja hampir selesai. Jangan lupa lakukan checkout dan isi refleksi harian di logbook!",
    type: "reminder",
    category: "reminder",
  },
};

/**
 * 1. Weighting Algorithm for Daily Check-In
 * Calculates the winning "trigger_key" category based on Mood, Energy, and Keyword Tag
 */
export function calculateTriggerKey(
  mood: string | null,
  energy: string | null,
  tag: string | null
): string {
  // Initialize category scores
  const scores = {
    burnout: 0,
    stressed: 0,
    low_energy: 0,
    high_performance: 0,
    normal: 0,
  };

  // Safe lowercasing for matchings
  const mMood = (mood || "").toLowerCase();
  const mEnergy = (energy || "").toLowerCase();
  const mTag = (tag || "").toLowerCase();

  // A. Weighting for Mood Input
  if (mMood === "joy") {
    scores.high_performance += 3;
    scores.normal += 1;
  } else if (mMood === "calm") {
    scores.normal += 3;
    scores.high_performance += 1;
  } else if (mMood === "tired" || mMood === "fatigued") {
    scores.low_energy += 3;
    scores.burnout += 1;
  } else if (mMood === "stressed" || mMood === "anxious") {
    scores.stressed += 3;
    scores.burnout += 2;
  } else if (mMood === "sad" || mMood === "down") {
    scores.stressed += 2;
    scores.burnout += 2;
    scores.low_energy += 1;
  }

  // B. Weighting for Energy Input
  if (mEnergy === "high") {
    scores.high_performance += 3;
    scores.normal += 1;
  } else if (mEnergy === "mid") {
    scores.normal += 3;
    scores.low_energy += 1;
  } else if (mEnergy === "low") {
    scores.low_energy += 3;
    scores.burnout += 2;
  }

  // C. Weighting for Tag Input (Keyword matching)
  const burnoutKeywords = ["burnout", "lelah", "capek", "jenuh", "mager"];
  const stressKeywords = ["stres", "pusing", "overwhelm", "panik", "cemas"];
  const highKeywords = ["semangat", "fokus", "produktif", "hebat", "ambis"];
  const normalKeywords = ["tenang", "biasa", "santai", "oke", "aman"];

  if (burnoutKeywords.some(kw => mTag.includes(kw))) {
    scores.burnout += 3;
    scores.low_energy += 2;
  } else if (stressKeywords.some(kw => mTag.includes(kw))) {
    scores.stressed += 3;
    scores.burnout += 1;
  } else if (highKeywords.some(kw => mTag.includes(kw))) {
    scores.high_performance += 3;
  } else if (normalKeywords.some(kw => mTag.includes(kw))) {
    scores.normal += 3;
  } else if (mTag.trim().length > 0) {
    // If user writes something else, treat as minor general signal
    scores.normal += 1;
  }

  // Find the winning category based on highest score
  let winningCategory: keyof typeof scores = "normal";
  let maxScore = -1;

  // Priority tie-breaker: burnout > stressed > low_energy > high_performance > normal
  const categories: Array<keyof typeof scores> = [
    "burnout",
    "stressed",
    "low_energy",
    "high_performance",
    "normal",
  ];

  for (const cat of categories) {
    if (scores[cat] > maxScore) {
      maxScore = scores[cat];
      winningCategory = cat;
    }
  }

  return `checkin_${winningCategory}`;
}

/**
 * Helper: Compiles a template string by replacing placeholders like {name}
 */
export function compileTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

/**
 * 2. Notification Dispatch Service
 * Fetches template from database (or fallbacks) and inserts a rendered notification
 */
export async function dispatchNotification(
  userId: string,
  triggerKey: string,
  variables: Record<string, string> = {}
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // A. Attempt to retrieve user details to autofill {name} if not provided
    if (!variables.name) {
      const userRes = await db.execute({
        sql: "SELECT name FROM users WHERE id = ?",
        args: [userId]
      });
      if (userRes.rows.length > 0) {
        variables.name = userRes.rows[0].name || "Rekan";
      } else {
        variables.name = "Rekan";
      }
    }

    // B. Fetch Template from Database
    let template: NotificationTemplate | null = null;
    try {
      const templateRes = await db.execute({
        sql: "SELECT * FROM notification_templates WHERE trigger_key = ?",
        args: [triggerKey]
      });

      if (templateRes.rows.length > 0) {
        const row = templateRes.rows[0];
        template = {
          triggerKey: row.trigger_key,
          titleTemplate: row.title_template,
          messageTemplate: row.message_template,
          type: row.type as any,
          category: row.category as any
        };
      }
    } catch (dbError) {
      console.warn(`[NotificationService] Database template fetch failed, using memory fallback:`, dbError);
    }

    // C. Fallback to Memory if not in DB
    if (!template) {
      const fallback = FALLBACK_TEMPLATES[triggerKey];
      if (!fallback) {
        return { success: false, error: `Template with key '${triggerKey}' not found.` };
      }
      template = {
        triggerKey,
        ...fallback
      };
    }

    // D. Render final Title and Message
    const title = compileTemplate(template.titleTemplate, variables);
    const message = compileTemplate(template.messageTemplate, variables);

    // E. Save Compiled Notification to database
    const notifId = "n_" + template.category + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 5);
    await db.execute({
      sql: "INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, 0)",
      args: [notifId, userId, title, message, template.type]
    });

    // F. Attempt Push Notification if subscription exists
    try {
      const subsRes = await db.execute({
        sql: "SELECT * FROM push_subscriptions WHERE user_id = ?",
        args: [userId]
      });

      if (subsRes.rows.length > 0) {
        // Here, you would trigger Web Push logic. Since we already have `/api/notifications/send` defined,
        // we can simply log it or call our push delivery method.
        console.log(`[NotificationService] Push delivery ready for ${subsRes.rows.length} subscriptions.`);
      }
    } catch (pushErr) {
      console.warn("[NotificationService] Web push check skipped/failed:", pushErr);
    }

    // Emit database update event to trigger live UI refresh via SSE
    try {
      const { hpEventEmitter } = await import("@/lib/events");
      hpEventEmitter.emit("db_update", { type: "refresh", timestamp: Date.now() });
    } catch (e) {
      console.warn("SSE trigger failed:", e);
    }

    return { success: true, id: notifId };
  } catch (error: any) {
    console.error(`[NotificationService] Failed to dispatch notification:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 3. Seed Database Templates
 * Utility to populate the DB with default templates if empty
 */
export async function seedNotificationTemplates(): Promise<number> {
  let seededCount = 0;
  for (const [key, t] of Object.entries(FALLBACK_TEMPLATES)) {
    try {
      await db.execute({
        sql: `INSERT INTO notification_templates (trigger_key, title_template, message_template, type, category) 
              VALUES (?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE 
              title_template = VALUES(title_template), 
              message_template = VALUES(message_template), 
              type = VALUES(type), 
              category = VALUES(category)`,
        args: [key, t.titleTemplate, t.messageTemplate, t.type, t.category]
      });
      seededCount++;
    } catch (e) {
      console.error(`Failed to seed template '${key}':`, e);
    }
  }
  return seededCount;
}

