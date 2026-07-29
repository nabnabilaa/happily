import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    const res = await db.execute({
      sql: "SELECT * FROM logbook_entries WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId]
    });
    return NextResponse.json({ entries: res.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logbook" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, type, title, content, points, metadata, date } = await req.json();

    if (!userId || !type || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = uuidv4();

    // `date` (YYYY-MM-DD, WIB) lets the user backfill a note onto an earlier
    // day. Stamped at noon WIB so the row lands inside that day whichever way
    // the reader converts it. Without it the entry is simply "now".
    const backfill = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);

    await db.execute({
      sql: backfill
        ? `INSERT INTO logbook_entries (id, user_id, type, title, content, points, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CONVERT_TZ(CONCAT(?, ' 12:00:00'), '+07:00', '+00:00'))`
        : `INSERT INTO logbook_entries (id, user_id, type, title, content, points, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: backfill
        ? [id, userId, type, title, content || '', points || 0, JSON.stringify(metadata || {}), date]
        : [id, userId, type, title, content || '', points || 0, JSON.stringify(metadata || {})]
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create logbook entry" }, { status: 500 });
  }
}

