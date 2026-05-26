import { NextResponse } from "next/server";
import { calculateWellbeingScore } from "@/lib/wellbeingEngine";

export async function POST(req: Request) {
  try {
    const { users } = await req.json(); // array of users with their state { id, name, department, role, state, userStats }
    
    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: "Missing or invalid users array" }, { status: 400 });
    }

    const burnoutAlerts = [];

    for (const u of users) {
      if (!u.state || !u.userStats) continue;
      
      const { score, status, metrics } = calculateWellbeingScore(u.state, u.userStats);
      
      if (status === 'critical' || status === 'warning') {
        const triggers = [];
        if (metrics.moodPenalty >= 10) triggers.push("Mood menurun terus-menerus");
        if (metrics.taskPenalty >= 10) triggers.push("Banyak task tertunda");
        if (metrics.streakPenalty >= 10) triggers.push("Sering telat check-in");
        if (metrics.focusPenalty >= 10) triggers.push("Fokus kerja minim");
        
        burnoutAlerts.push({
          userId: u.id,
          name: u.name,
          department: u.department,
          score,
          riskLevel: status === 'critical' ? 'Tinggi' : 'Sedang',
          triggers
        });
      }
    }

    // Sort by risk level (critical first) then score
    burnoutAlerts.sort((a, b) => {
      if (a.riskLevel === 'Tinggi' && b.riskLevel !== 'Tinggi') return -1;
      if (a.riskLevel !== 'Tinggi' && b.riskLevel === 'Tinggi') return 1;
      return a.score - b.score;
    });

    return NextResponse.json({ alerts: burnoutAlerts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
