import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const res = await db.execute(`
      SELECT id, name, points, level, rank, avatar_image, avatar_config_json 
      FROM users 
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

