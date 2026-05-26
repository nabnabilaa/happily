import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const res = await db.execute(`
      SELECT u.id, u.name, 
             COALESCE(SUM(x.amount), 0) as points, 
             u.level, u.rank, u.avatar_image, u.avatar_config_json 
      FROM users u
      LEFT JOIN xp_transactions x 
        ON u.id = x.user_id 
        AND x.action_type != 'reward_redeem' 
        AND MONTH(x.created_at) = MONTH(CURRENT_DATE())
        AND YEAR(x.created_at) = YEAR(CURRENT_DATE())
      GROUP BY u.id, u.name, u.level, u.rank, u.avatar_image, u.avatar_config_json
      ORDER BY points DESC 
      LIMIT 10
    `);

    const leaderboard = res.rows.map((r, index) => ({
      rank: index + 1,
      id: r.id,
      name: r.name,
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

