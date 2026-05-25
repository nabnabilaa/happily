import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    await db.execute({
      sql: "INSERT INTO attendance_tokens (token, expires_at) VALUES (?, ?)",
      args: [token, expiresAt]
    });

    return NextResponse.json({ token, expiresAt });
  } catch (error) {
    console.error("Token Error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}

