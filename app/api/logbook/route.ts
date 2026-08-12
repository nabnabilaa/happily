import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSelfOrHrAdmin } from "@/lib/apiAuth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

    // Identitas dari cookie sesi. Logbook berisi rincian pekerjaan pribadi. HR-Admin boleh lintas orang.
    const access = await requireSelfOrHrAdmin(req, userId);
    if ("response" in access) return access.response;

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

    // `date` (YYYY-MM-DD, WIB) lets the user backfill a note onto an earlier
    // day. Stamped at noon WIB so the row lands inside that day whichever way
    // the reader converts it. Without it the entry is simply "now".
    const backfill = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);

    /*
     * `id` tidak dikirim: kolomnya `INT AUTO_INCREMENT`, dan `uuidv4()` yang
     * dulu ada di sini adalah string — MySQL menolak setiap INSERT dengan
     * ER_TRUNCATED_WRONG_VALUE_FOR_FIELD, jadi route ini selalu 500 dan tidak
     * ada satu pun catatan yang pernah tersimpan lewat sini.
     */
    await db.execute({
      sql: backfill
        ? `INSERT INTO logbook_entries (user_id, type, title, content, points, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, CONVERT_TZ(CONCAT(?, ' 12:00:00'), '+07:00', '+00:00'))`
        : `INSERT INTO logbook_entries (user_id, type, title, content, points, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
      args: backfill
        ? [userId, type, title, content || '', points || 0, JSON.stringify(metadata || {}), date]
        : [userId, type, title, content || '', points || 0, JSON.stringify(metadata || {})]
    });

    // Id-nya sekarang milik MySQL, jadi dibaca balik supaya bentuk respons tidak
    // berubah bagi pemanggil yang sudah ada.
    const idRes = await db.execute("SELECT LAST_INSERT_ID() AS id");
    const id = (idRes.rows[0] as any)?.id ?? null;

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create logbook entry" }, { status: 500 });
  }
}

