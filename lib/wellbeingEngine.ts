/**
 * Wellbeing Engine
 * 
 * Calculates a dynamic wellbeing score (0-100) based on an employee's behavior,
 * mood history, task completion rate, and streak.
 */

export function calculateWellbeingScore(state: any, user: any): {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  metrics: any;
  message: string;
} {
  if (!state || !user) {
    return { score: 100, status: 'healthy', metrics: {}, message: 'Data belum cukup.' };
  }

  let score = 100;
  const metrics: any = {};

  // 1. Mood History (20%)
  // Penalize consecutive negative moods
  const moodHistory = state.moods || [];
  let moodPenalty = 0;
  if (state.mood === 'tired' || state.mood === 'stress' || state.mood === 'burnout') {
    moodPenalty += 10;
  }
  // Simplified check: if last few days were bad
  const negativeMoods = moodHistory.filter((m: any) => m.mood === 'tired' || m.mood === 'stress' || m.mood === 'burnout');
  if (negativeMoods.length >= 2) moodPenalty += 10;
  
  score -= Math.min(20, moodPenalty);
  metrics.moodPenalty = moodPenalty;

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

  // 3. Streak / Consistency (15%)
  let streakPenalty = 0;
  if ((user.streak || 0) === 0) streakPenalty += 15;
  else if ((user.streak || 0) < 3) streakPenalty += 5;
  
  score -= Math.min(15, streakPenalty);
  metrics.streakPenalty = streakPenalty;

  // 4. Focus Session & Inactivity (15%)
  let focusPenalty = 0;
  const lastAct = state.lastActivityDate ? new Date(state.lastActivityDate) : new Date();
  const hoursInactive = (new Date().getTime() - lastAct.getTime()) / (1000 * 60 * 60);
  
  if (hoursInactive > 24) focusPenalty += 15;
  else if (hoursInactive > 5) focusPenalty += 5;
  
  score -= Math.min(15, focusPenalty);
  metrics.focusPenalty = focusPenalty;

  // 5. Workload & Overtime (15%)
  let workloadPenalty = 0;
  if (priorities.length >= 10) workloadPenalty += 10;
  else if (priorities.length >= 6) workloadPenalty += 5;

  // Real Overtime Detection
  if (state.workSchedule && state.workSchedule.end) {
    const now = new Date();
    const [endH, endM] = state.workSchedule.end.split(':').map(Number);
    
    // Create Date object for today's end time
    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);

    const msPastEnd = now.getTime() - endTime.getTime();
    
    // If it's currently past the work end time
    if (msPastEnd > 0) {
      const hoursPastEnd = msPastEnd / (1000 * 60 * 60);
      
      // Calculate how long since the user actually clicked/typed something
      const hoursSinceActive = (now.getTime() - lastAct.getTime()) / (1000 * 60 * 60);

      // If past work hours, but user has been inactive for > 2 hours, they probably just forgot to close the tab / clock out.
      if (hoursSinceActive > 2) {
        // No burnout penalty, they are likely resting. 
        // Note: You could add a separate 'discipline' penalty elsewhere if needed.
        workloadPenalty += 0; 
      } 
      // True Overtime: It's past work hours AND they are actively using the app
      else if (hoursPastEnd > 2) {
        workloadPenalty += 10; // Severe overtime
      } else if (hoursPastEnd > 1) {
        workloadPenalty += 5;  // Moderate overtime
      }
    }
  }
  
  score -= Math.min(15, workloadPenalty);
  metrics.workloadPenalty = workloadPenalty;

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

  return { score, status, metrics, message };
}
