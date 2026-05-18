import { HP_TOKENS } from "./constants";

export interface AIInsight {
  tone: string;
  title: string;
  body: string;
}

export function generateAIInsights(state: any, user: any): AIInsight[] {
  const insights: AIInsight[] = [];

  // 1. Streak Insight
  if (user?.streak > 0) {
    insights.push({
      tone: 'yellow',
      title: `Streak ${user.streak} hari 🎉`,
      body: `Kamu rutin menyapa diri sendiri — ini kebiasaan kecil yang dampaknya besar bagi produktivitasmu.`
    });
  }

  // 2. Mood & Energy Insight
  if (state?.mood === 'tired' || state?.mood === 'stress') {
    insights.push({
      tone: 'coral',
      title: 'Energi kamu butuh perhatian',
      body: `Mood kamu sedang ${state.mood}. Mau coba 5-menit reset di modul Wellbeing? Istirahat sejenak bisa ningkatin fokus kamu lagi.`
    });
  } else if (state?.mood === 'joy') {
    insights.push({
      tone: 'sage',
      title: 'Vibe kamu positif hari ini!',
      body: 'Gunakan energi positif ini untuk menyelesaikan tugas-tugas "Deep Work" atau bantu tim yang sedang butuh support.'
    });
  }

  // 3. Task Progress Insight
  const doneTasks = (state?.priorities || []).filter((t: any) => t.done).length;
  const totalTasks = (state?.priorities || []).length;
  
  if (doneTasks > 0 && doneTasks === totalTasks) {
    insights.push({
      tone: 'blue',
      title: 'Semua prioritas selesai! 🚀',
      body: 'Luar biasa, kamu menyelesaikan semua target hari ini. Jangan lupa istirahat yang cukup ya.'
    });
  } else if (doneTasks > 0) {
    insights.push({
      tone: 'blue',
      title: `${doneTasks} dari ${totalTasks} tugas selesai`,
      body: 'Kamu sudah di jalur yang benar. Fokus selesaikan sisa tugas dengan perlahan tapi pasti.'
    });
  } else if (totalTasks > 0) {
     insights.push({
      tone: 'lavender',
      title: 'Ayo mulai hari kamu',
      body: `Ada ${totalTasks} tugas menunggu. Coba mulai dari yang paling ringan untuk memicu momentum.`
    });
  }

  // 4. Wellbeing Goal Insight
  if (state?.personalWellbeingGoal) {
    const doneRoutine = (state?.wellbeingRoutine || []).filter((r: any) => r.done).length;
    const totalRoutine = (state?.wellbeingRoutine || []).length;
    if (totalRoutine > 0) {
      insights.push({
        tone: 'sage',
        title: 'Fokus Wellbeing Personal',
        body: `Kamu sudah menyelesaikan ${doneRoutine}/${totalRoutine} rutinitas untuk goal "${state.personalWellbeingGoal}".`
      });
    }
  }

  // Fallback if no insights generated
  if (insights.length === 0) {
    insights.push({
      tone: 'sage',
      title: 'Siap untuk hari ini?',
      body: 'Tentukan prioritasmu dan biarkan aku membantumu tetap fokus dan sehat.'
    });
  }

  return insights.slice(0, 3); // Limit to 3 insights
}
