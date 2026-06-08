/**
 * Wellbeing Engine
 * 
 * Calculates a dynamic wellbeing score (0-100) based on an employee's behavior,
 * mood history, task completion rate, and streak.
 */

export interface WellbeingAction {
  icon: string;
  label: string;
  description: string;
  modalTarget?: string;
  modalProps?: any;
  actionType?: string;        // 'scroll_to_tasks' for special scroll behavior
  priority: number;
}

export function calculateWellbeingScore(state: any, user: any): {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  metrics: any;
  message: string;
  actions: WellbeingAction[];
} {
  if (!state || !user) {
    return { score: 100, status: 'healthy', metrics: {}, message: 'Data belum cukup.', actions: [] };
  }

  const now = new Date();
  let score = 100;
  const metrics: any = {};
  const actions: WellbeingAction[] = [];

  // 1. Mood History (20%)
  const moodHistory = state.moods || [];
  let moodPenalty = 0;
  if (state.mood === 'tired' || state.mood === 'stress' || state.mood === 'burnout') {
    moodPenalty += 10;
  }
  const negativeMoods = moodHistory.filter((m: any) => m.mood === 'tired' || m.mood === 'stress' || m.mood === 'burnout');
  if (negativeMoods.length >= 2) moodPenalty += 10;
  
  score -= Math.min(20, moodPenalty);
  metrics.moodPenalty = moodPenalty;

  if (moodPenalty > 0) {
    actions.push({
      icon: '🧘‍♂️',
      label: 'Lakukan Box Breathing',
      description: 'Latihan napas 1 menit untuk menurunkan stress dan menenangkan pikiran.',
      modalTarget: 'pause',
      priority: 1,
    });
    // Show "Update Mood" if user hasn't checked in today, or if it's been > 4 hours
    let hoursSinceMood = 999;
    if (state.lastMoodCheckIn) {
      hoursSinceMood = (now.getTime() - new Date(state.lastMoodCheckIn).getTime()) / (1000 * 60 * 60);
    }

    if (!state.mood || hoursSinceMood >= 4) {
      actions.push({
        icon: '💬',
        label: !state.mood ? 'Update Mood Hari Ini' : 'Update Kondisimu',
        description: !state.mood 
          ? 'Cek-in perasaanmu sekarang — ceritakan ke Buddy agar dia bisa bantu.' 
          : 'Sudah beberapa jam berlalu. Gimana perasaanmu sekarang?',
        modalTarget: 'checkin',
        priority: 2,
      });
    }
  }

  // 2. Task Completion Rate (20%)
  const priorities = state.priorities || [];
  let taskPenalty = 0;
  if (priorities.length > 0) {
    const done = priorities.filter((p: any) => p.done).length;
    const completionRate = done / priorities.length;
    if (completionRate < 0.3) taskPenalty += 15;
    else if (completionRate < 0.6) taskPenalty += 5;
  }
  
  score -= Math.min(20, taskPenalty);
  metrics.taskPenalty = taskPenalty;

  if (taskPenalty > 0) {
    // Check if there are uncompleted tasks to show
    const unfinished = priorities.filter((p: any) => !p.done);
    if (unfinished.length > 0) {
      actions.push({
        icon: '✅',
        label: 'Selesaikan 1 Task Kecil',
        description: `Kamu punya ${unfinished.length} task belum selesai. Mulai dari yang paling mudah!`,
        actionType: 'scroll_to_tasks',
        priority: 3,
      });
    }
  }

  // 3. Streak / Consistency (15%)
  let streakPenalty = 0;
  if ((user.streak || 0) === 0) streakPenalty += 15;
  else if ((user.streak || 0) < 3) streakPenalty += 5;
  
  score -= Math.min(15, streakPenalty);
  metrics.streakPenalty = streakPenalty;

  // Only show streak action if user hasn't checked in today (no mood set)
  if (streakPenalty > 0 && !state.mood) {
    actions.push({
      icon: '🔥',
      label: 'Jaga Streak Harian',
      description: 'Check-in setiap hari walau sebentar agar streak-mu tidak terputus.',
      modalTarget: 'checkin',
      priority: 5,
    });
  }

  // 4. Focus Session & Inactivity (15%)
  let focusPenalty = 0;
  const lastAct = state.lastActivityDate ? new Date(state.lastActivityDate) : now;
  const hoursInactive = (now.getTime() - lastAct.getTime()) / (1000 * 60 * 60);
  
  if (hoursInactive > 24) focusPenalty += 15;
  else if (hoursInactive > 5) focusPenalty += 5;
  
  score -= Math.min(15, focusPenalty);
  metrics.focusPenalty = focusPenalty;

  if (focusPenalty > 0) {
    actions.push({
      icon: '🎯',
      label: 'Mulai Focus Session',
      description: 'Blok 25 menit tanpa gangguan — situs distraksi akan diblokir otomatis!',
      modalTarget: 'focus',
      priority: 4,
    });
  }

  // 5. Workload & Overtime (15%)
  let workloadPenalty = 0;
  if (priorities.length >= 10) workloadPenalty += 10;
  else if (priorities.length >= 6) workloadPenalty += 5;

  if (state.workSchedule && state.workSchedule.end) {
    const [endH, endM] = state.workSchedule.end.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);
    const msPastEnd = now.getTime() - endTime.getTime();
    
    if (msPastEnd > 0) {
      const hoursPastEnd = msPastEnd / (1000 * 60 * 60);
      const hoursSinceActive = (now.getTime() - lastAct.getTime()) / (1000 * 60 * 60);

      if (hoursSinceActive > 2) {
        workloadPenalty += 0; 
      } else if (hoursPastEnd > 2) {
        workloadPenalty += 10;
      } else if (hoursPastEnd > 1) {
        workloadPenalty += 5;
      }
    }
  }
  
  score -= Math.min(15, workloadPenalty);
  metrics.workloadPenalty = workloadPenalty;

  if (workloadPenalty > 0) {
    if (priorities.length >= 6) {
      actions.push({
        icon: '📋',
        label: 'Pecah & Prioritaskan Task',
        description: 'Kamu punya banyak task. Yuk atur ulang prioritasnya biar lebih ringan.',
        modalTarget: 'manage_priorities',
        priority: 2,
      });
    }
  }

  // "Tutup Hari" — only show within 30 mins of work end or past it
  if (state.workSchedule && state.workSchedule.end) {
    const [endH, endM] = state.workSchedule.end.split(':').map(Number);
    const endTimeMins = endH * 60 + endM;
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    if (currentMins >= endTimeMins - 30) {
      actions.push({
        icon: '🌙',
        label: 'Tutup Hari & Istirahat',
        description: 'Sudah waktunya pulang. Refleksi sebentar lalu istirahat ya!',
        modalTarget: 'reflect',
        priority: 6,
      });
    }
  }

  // AI Coach — always available for non-healthy scores
  if (score < 70) {
    actions.push({
      icon: '🤖',
      label: 'Bicara dengan AI Coach',
      description: 'Curhat atau minta saran — Coach Buddy siap mendengarkan 24/7.',
      modalTarget: 'coach',
      priority: 10,
    });
  }

  // Sort by priority
  actions.sort((a, b) => a.priority - b.priority);

  // Normalize score
  score = Math.max(0, Math.min(100, score));

  // Determine status and message
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  let message = "Kondisimu sangat prima! Pertahankan ritme yang sehat ini. 💪";

  if (score < 40) {
    status = 'critical';
    message = "Skor Wellbeing kamu rendah. Sangat wajar untuk merasa lelah. Istirahatlah sejenak, kesehatanmu prioritas utama. 🛑";
  } else if (score < 70) {
    status = 'warning';
    message = "Sepertinya kamu mulai lelah atau ada beban tugas yang menumpuk. Butuh bantuan memecah task? 🌿";
  }

  return { score, status, metrics, message, actions };
}
