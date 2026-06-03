import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/emailService";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

// GET: Fetch notifications (unread only or all history)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const all = searchParams.get('all') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    let sql = `SELECT id, title, message, type, is_read, reference_id, reference_type, created_at 
               FROM notifications WHERE user_id = ? AND is_read = 0 
               ORDER BY created_at DESC LIMIT 30`;
    if (all) {
      sql = `SELECT id, title, message, type, is_read, reference_id, reference_type, created_at 
             FROM notifications WHERE user_id = ? 
             ORDER BY created_at DESC LIMIT 50`;
    }

    const res = await db.execute({
      sql,
      args: [userId]
    });

    return NextResponse.json({
      notifications: res.rows.map(r => ({
        id: r.id,
        title: r.title,
        message: r.message,
        type: r.type,
        isRead: r.is_read === 1,
        referenceId: r.reference_id,
        referenceType: r.reference_type,
        createdAt: r.created_at,
      })),
      unreadCount: res.rows.filter(r => r.is_read === 0).length
    }, {
      headers: getCorsHeaders(request)
    });
  } catch (error: any) {
    console.error("Ext Notifications Error:", error);
    return NextResponse.json(
      { error: "Failed", details: error.message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

// POST: Mark notifications as read
export async function POST(request: Request) {
  try {
    const { userId, notificationIds } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      const placeholders = notificationIds.map(() => '?').join(',');
      await db.execute({
        sql: `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
        args: [userId, ...notificationIds]
      });
    } else {
      // Mark all as read
      await db.execute({
        sql: "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
        args: [userId]
      });
    }

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(request) });
  } catch (error: any) {
    console.error("Mark Read Error:", error);
    return NextResponse.json(
      { error: "Failed", details: error.message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

// DELETE: Delete single or all notifications for a user
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    if (all) {
      await db.execute({
        sql: "DELETE FROM notifications WHERE user_id = ?",
        args: [userId]
      });
    } else if (id) {
      await db.execute({
        sql: "DELETE FROM notifications WHERE user_id = ? AND id = ?",
        args: [userId, id]
      });
    } else {
      return NextResponse.json(
        { error: "Parameter id atau all wajib diisi" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(request) });
  } catch (error: any) {
    console.error("Delete Notification Error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification", details: error.message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

// PUT: Create a new notification
export async function PUT(request: Request) {
  try {
    const { userId, title, message, type, referenceId, referenceType } = await request.json();
    if (!userId || !title) {
      return NextResponse.json(
        { error: "userId and title required" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    await db.execute({
      sql: `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type, is_read, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      args: [
        userId,
        title,
        message || null,
        type || 'info',
        referenceId || null,
        referenceType || null,
        new Date().toISOString()
      ]
    });

    // ── TRIGGER MOCK EMAIL ──
    try {
      // Get user email
      const userRes = await db.execute({
        sql: "SELECT email, name FROM users WHERE id = ?",
        args: [userId]
      });
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        sendEmail({
          to: user.email as string,
          subject: title,
          html: `<p>Halo ${user.name},</p><p>Kamu mendapat notifikasi baru di Flowbee:</p><h3>${title}</h3><p>${message || ''}</p>`
        });
      }
    } catch (e) {
      console.warn("Mock email failed to trigger:", e);
    }

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(request) });
  } catch (error: any) {
    console.error("Create Notification Error:", error);
    return NextResponse.json(
      { error: "Failed", details: error.message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
