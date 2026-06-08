import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const res = await db.execute("SELECT id, name, email, role, job_title, department, team_id, avatar_image FROM users ORDER BY name");
    return NextResponse.json({ users: res.rows });
  } catch (error: any) {
    console.error("Users API Error:", error);
    return NextResponse.json({ error: "Gagal memuat users", details: error.message }, { status: 500 });
  }
}

