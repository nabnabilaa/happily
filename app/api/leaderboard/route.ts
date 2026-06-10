import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly'; // weekly, monthly, all_time

    let timeFilter = "AND MONTH(x.created_at) = MONTH(CURRENT_DATE()) AND YEAR(x.created_at) = YEAR(CURRENT_DATE())";
    if (period === 'weekly') {
      timeFilter = "AND YEARWEEK(x.created_at, 1) = YEARWEEK(CURRENT_DATE(), 1)";
    } else if (period === 'all_time') {
      timeFilter = "";
    }

    const res = await db.execute(`
      SELECT u.id, u.name, u.department as team_name,
             COALESCE(SUM(x.amount), 0) as points, 
             u.level, u.rank, u.avatar_image, u.avatar_config_json 
      FROM users u
      LEFT JOIN xp_transactions x 
        ON u.id = x.user_id 
        AND x.action_type != 'reward_redeem' 
        ${timeFilter}
      GROUP BY u.id, u.name, u.department, u.level, u.rank, u.avatar_image, u.avatar_config_json
      ORDER BY points DESC 
      LIMIT 10
    `);

    const leaderboard = res.rows.map((r, index) => ({
      rank: index + 1,
      id: r.id,
      name: r.name,
      team: r.team_name,
      points: r.points,
      level: r.level,
      tier: r.rank,
      avatarImage: r.avatar_image,
      avatarConfig: JSON.parse(r.avatar_config_json as string || '{}')
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard Error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

