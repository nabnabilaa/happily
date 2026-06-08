import { COACH_WORD_BANK, CoachPhrase } from "./coachWordBank";

export interface AIInsight {
  tone: string;
  title: string;
  body: string;
}

function getRandomPhrase(phrases: CoachPhrase[], vars: Record<string, string> = {}): AIInsight {
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  let body = phrase.body;
  
  // Replace variables in body
  for (const [key, value] of Object.entries(vars)) {
    body = body.replace(new RegExp(`{${key}}`, 'g'), value);
  }

  return {
    tone: phrase.tone,
    title: phrase.title.replace(/{streak}/g, vars.streak || ''),
    body: body
  };
}

export function generateAIInsights(state: any, user: any): AIInsight[] {
  const insights: AIInsight[] = [];
  const role = user?.userRole || user?.role || 'employee';

  const addInsight = (categoryName: string, roleGroup: string = 'general', vars: Record<string, string> = {}) => {
    const categoryPhrases = COACH_WORD_BANK[roleGroup]?.[categoryName];
    if (categoryPhrases && categoryPhrases.length > 0) {
      insights.push(getRandomPhrase(categoryPhrases, vars));
    }
  };

  // --- 1. GENERAL INSIGHTS (Applies to all roles) ---

  // Streak Insight
  if (user?.streak > 0) {
    addInsight('streak_high', 'general', { streak: String(user.streak) });
  }

  // Mood & Energy Insight
  if (state?.mood === 'tired' || state?.mood === 'stress' || state?.mood === 'burnout') {
    addInsight('mood_low', 'general', { mood: state.mood });
  } else if (state?.mood === 'joy') {
    addInsight('mood_high', 'general');
  }

  // Task Progress Insight
  const priorities = state?.priorities || [];
  const totalTasks = priorities.length;
  const doneTasks = priorities.filter((t: any) => t.done).length;
  // Simulate checking for rejected tasks (for now just checking if a task is marked as "rejected" or needs revision)
  const rejectedTasks = priorities.filter((t: any) => t.status === 'rejected' || t.status === 'revision').length;

  if (totalTasks > 0) {
    if (rejectedTasks > 0) {
      addInsight('task_rejected', 'general', { count: String(rejectedTasks) });
    } else if (doneTasks === totalTasks) {
      addInsight('task_approved', 'general');
    } else if (totalTasks - doneTasks > 5) {
      addInsight('task_overload', 'general', { count: String(totalTasks - doneTasks) });
    } else if (doneTasks === 0) {
      addInsight('task_empty', 'general'); // Or 'task_overload' if we want to encourage them
    }
  } else {
    addInsight('task_empty', 'general');
  }

  // Wellbeing Goal Insight
  if (state?.personalWellbeingGoal) {
    const doneRoutine = (state?.wellbeingRoutine || []).filter((r: any) => r.done).length;
    const totalRoutine = (state?.wellbeingRoutine || []).length;
    if (totalRoutine > 0 && doneRoutine === totalRoutine) {
      addInsight('wellbeing_goal', 'general', { goal: state.personalWellbeingGoal });
    }
  }

  // --- 2. MANAGER SPECIFIC INSIGHTS ---
  if (role === 'manager') {
    // Example: Check if there are approvals pending (mock logic, adjust based on actual state structure)
    const pendingApprovals = state?.pendingApprovals || 0;
    if (pendingApprovals > 0) {
      addInsight('approval_pending', 'manager');
    }
    
    // Example: Check team mood (mock logic)
    const teamMoodAvg = state?.teamMoodAvg || 3; // 1-5 scale
    if (teamMoodAvg <= 2) {
      addInsight('team_mood_low', 'manager');
    }
  }

  // --- 3. HR SPECIFIC INSIGHTS ---
  if (role === 'hr') {
    // Example: Check company mood (mock logic)
    const companyMoodAvg = state?.companyMoodAvg || 3;
    if (companyMoodAvg <= 2) {
      addInsight('company_mood_low', 'hr');
    }
  }

  // Fallback if no insights generated
  if (insights.length === 0) {
    addInsight('task_empty', 'general');
  }

  return insights.slice(0, 3); // Limit to 3 insights
}
