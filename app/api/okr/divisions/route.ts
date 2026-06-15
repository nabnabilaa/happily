import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const res = await db.execute(
      `SELECT d.id, d.name, d.manager_id, u.name as manager_name,
              (SELECT COUNT(*) FROM users WHERE division_id = d.id) as member_count
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.id
       ORDER BY d.name`
    );
    return NextResponse.json({ divisions: res.rows });
  } catch (error: any) {
    console.error("Divisions Error:", error);
    return NextResponse.json({ error: "Failed to load divisions", details: error.message }, { status: 500 });
  }
}
