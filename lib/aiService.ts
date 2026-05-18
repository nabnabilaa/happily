// Accept nullable params defensively — state values like mood/goals can be null on init
export async function generateCoachingTopic(goals: any[] | null | undefined, skills: any[] | null | undefined) {
  const safeGoals = goals ?? [];
  const safeSkills = skills ?? [];
  const prompt = `Based on these active goals: ${safeGoals.map((g: any) => g.title).join(', ')} 
  and these skill progressions: ${safeSkills.map((s: any) => `${s.name} (${s.current}/${s.target})`).join(', ')}, 
  suggest one specific, empathetic, and humanist 1-on-1 coaching topic for an employee and their manager. 
  Keep it short (max 2 sentences) and avoid corporate buzzwords.`;

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    return data.text || "Bahas progres goal kamu dan bagaimana tim bisa bantu hilangkan hambatan minggu ini.";
  } catch (error) {
    console.error("AI Topic Gen failed:", error);
    return "Bahas progres goal kamu dan bagaimana tim bisa bantu hilangkan hambatan minggu ini.";
  }
}


