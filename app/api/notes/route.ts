import { NextResponse } from "next/server";
import { db } from "@/lib/turso";
import { v4 as uuidv4 } from "uuid";

// GET: Fetch notes for a user (own + shared)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // Get user's department
    const userRes = await db.execute({ sql: "SELECT department FROM users WHERE id = ?", args: [userId] });
    const userDept = userRes.rows[0]?.department || '';

    // Fetch: own notes + company-visible + division-visible (if same dept) + custom shared
    const res = await db.execute({
      sql: `SELECT n.*, u.name as author_name, u.department as author_department,
                   lu.name as locked_by_name
            FROM notes n 
            JOIN users u ON n.user_id = u.id
            LEFT JOIN users lu ON n.locked_by = lu.id
            WHERE n.user_id = ? 
               OR n.visibility = 'company'
               OR (n.visibility = 'division' AND u.department = ?)
               OR (n.visibility = 'custom' AND JSON_CONTAINS(n.shared_with_users, JSON_QUOTE(?)))
            ORDER BY n.updated_at DESC
            LIMIT 100`,
      args: [userId, userDept, userId]
    });

    const notes = res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      authorName: r.author_name,
      authorDepartment: r.author_department,
      title: r.title,
      content: r.content,
      visibility: r.visibility,
      sharedWithDivisions: r.shared_with_divisions ? JSON.parse(r.shared_with_divisions as string) : [],
      sharedWithUsers: r.shared_with_users ? JSON.parse(r.shared_with_users as string) : [],
      sharedPermission: r.shared_permission || 'view',
      source: r.source,
      relatedEventId: r.related_event_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lockedBy: r.locked_by,
      lockedAt: r.locked_at,
      lockedByName: r.locked_by_name,
      isOwn: String(r.user_id) === String(userId),
    }));

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error("Notes GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch notes", details: error.message }, { status: 500 });
  }
}

// POST: Create a note
export async function POST(request: Request) {
  try {
    const { userId, title, content, visibility, sharedWithDivisions, sharedWithUsers, sharedPermission, source, relatedEventId } = await request.json();
    if (!userId || !content) {
      return NextResponse.json({ error: "userId and content required" }, { status: 400 });
    }

    const noteId = "note_" + uuidv4().substring(0, 8);

    await db.execute({
      sql: `INSERT INTO notes (id, user_id, title, content, visibility, shared_with_divisions, shared_with_users, shared_permission, source, related_event_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        noteId, userId, title || null, content,
        visibility || 'private',
        sharedWithDivisions ? JSON.stringify(sharedWithDivisions) : null,
        sharedWithUsers ? JSON.stringify(sharedWithUsers) : null,
        sharedPermission || 'view',
        source || 'web',
        relatedEventId || null
      ]
    });

    // Notify shared users
    if (visibility === 'custom' && sharedWithUsers?.length > 0) {
      for (const uid of sharedWithUsers) {
        if (uid !== userId) {
          const nid = "n_" + uuidv4().substring(0, 8);
          await db.execute({
            sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
            args: [nid, uid, `📝 Catatan baru dibagikan`, `"${title || 'Catatan'}" — dibagikan kepadamu.`, 'info']
          });
        }
      }
    }

    return NextResponse.json({ success: true, noteId });
  } catch (error: any) {
    console.error("Notes POST Error:", error);
    return NextResponse.json({ error: "Failed to create note", details: error.message }, { status: 500 });
  }
}

// PATCH: Update or Lock/Unlock a note
export async function PATCH(request: Request) {
  try {
    const { noteId, userId, action, title, content, visibility, sharedWithDivisions, sharedWithUsers, sharedPermission } = await request.json();
    if (!noteId || !userId) return NextResponse.json({ error: "noteId and userId required" }, { status: 400 });

    if (action === 'lock') {
      await db.execute({
        sql: "UPDATE notes SET locked_by = ?, locked_at = ? WHERE id = ?",
        args: [userId, new Date().toISOString(), noteId]
      });
      return NextResponse.json({ success: true, action: 'locked' });
    }

    if (action === 'unlock') {
      await db.execute({
        sql: "UPDATE notes SET locked_by = NULL, locked_at = NULL WHERE id = ?",
        args: [noteId]
      });
      return NextResponse.json({ success: true, action: 'unlocked' });
    }

    await db.execute({
      sql: `UPDATE notes SET title = ?, content = ?, visibility = ?, shared_with_divisions = ?, shared_with_users = ?, shared_permission = ?, locked_by = NULL, locked_at = NULL
            WHERE id = ?`,
      args: [
        title || null, content || '',
        visibility || 'private',
        sharedWithDivisions ? JSON.stringify(sharedWithDivisions) : null,
        sharedWithUsers ? JSON.stringify(sharedWithUsers) : null,
        sharedPermission || 'view',
        noteId
      ]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notes PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update note", details: error.message }, { status: 500 });
  }
}

// DELETE: Delete a note
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');
    const userId = searchParams.get('userId');
    if (!noteId || !userId) return NextResponse.json({ error: "noteId and userId required" }, { status: 400 });

    await db.execute({ sql: "DELETE FROM notes WHERE id = ? AND user_id = ?", args: [noteId, userId] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notes DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete note", details: error.message }, { status: 500 });
  }
}
