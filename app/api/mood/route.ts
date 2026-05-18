import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

// GET: Mood history for a user (from mood_checkins + attendance mood)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    let dateFilter = "";
    const args: any[] = [userId];

    if (month && year) {
      dateFilter = " AND MONTH(created_at) = ? AND YEAR(created_at) = ?";
      args.push(Number(month), Number(year));
    }

    // Get mood check-ins
    const moodRes = await db.execute({
      sql: `SELECT id, mood_key, energy_key, tag, created_at 
            FROM mood_checkins 
            WHERE user_id = ?${dateFilter}
            ORDER BY created_at DESC`,
      args
    });

    // Also get attendance moods (end-of-day mood from clock-out)
    const attArgs: any[] = [userId];
    let attDateFilter = "";
    if (month && year) {
      attDateFilter = " AND MONTH(check_in_at) = ? AND YEAR(check_in_at) = ?";
      attArgs.push(Number(month), Number(year));
    }

    const attMoodRes = await db.execute({
      sql: `SELECT mood, check_in_at as date FROM attendance 
            WHERE user_id = ? AND mood IS NOT NULL${attDateFilter}
            ORDER BY check_in_at DESC`,
      args: attArgs
    });

    // Aggregate mood distribution
    const moodCounts: Record<string, number> = {};
    for (const m of moodRes.rows as any[]) {
      moodCounts[m.mood_key] = (moodCounts[m.mood_key] || 0) + 1;
    }
    for (const m of attMoodRes.rows as any[]) {
      if (m.mood) {
        moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
      }
    }

    // Weekly trend (last 4 weeks)
    const weeklyTrend: { week: string; avgScore: number; count: number }[] = [];
    const MOOD_SCORES: Record<string, number> = {
      joy: 5, calm: 4, neutral: 3, tired: 2, stress: 1
    };

    const allMoods = [
      ...(moodRes.rows as any[]).map(m => ({ mood: m.mood_key, date: m.created_at })),
      ...(attMoodRes.rows as any[]).filter(m => m.mood).map(m => ({ mood: m.mood, date: m.date }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Group by week
    const weekMap: Record<string, number[]> = {};
    for (const m of allMoods) {
      const d = new Date(m.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weekMap[key]) weekMap[key] = [];
      weekMap[key].push(MOOD_SCORES[m.mood] || 3);
    }

    for (const [week, scores] of Object.entries(weekMap).slice(0, 8)) {
      weeklyTrend.push({
        week,
        avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        count: scores.length
      });
    }

    return NextResponse.json({
      checkins: moodRes.rows,
      attendanceMoods: attMoodRes.rows,
      distribution: moodCounts,
      weeklyTrend,
      totalEntries: allMoods.length,
    });
  } catch (error: any) {
    console.error("Mood History Error:", error);
    return NextResponse.json({ error: "Failed", details: error.message }, { status: 500 });
  }
}
