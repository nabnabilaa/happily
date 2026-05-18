import { NextResponse } from "next/server";
import { db } from "@/lib/turso";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const res = await db.execute("SELECT * FROM announcements ORDER BY created_at DESC");
    return NextResponse.json({ announcements: res.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { authorId, title, content, tone, glyph } = await req.json();
    
    if (!authorId || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = uuidv4();
    await db.execute({
      sql: "INSERT INTO announcements (id, author_id, title, content, tone, glyph) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, authorId, title, content, tone || 'blue', glyph || 'bullhorn']
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
