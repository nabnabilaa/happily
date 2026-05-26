import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ══════════════════════════════════════════════════════════════
// Chat API — Spec v2 Phase 7
// Supports: DM, Group, Team channels
// ══════════════════════════════════════════════════════════════

// GET: List channels for a user, or messages for a channel
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const channelId = searchParams.get('channelId');
    const before = searchParams.get('before'); // pagination cursor
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId && !channelId) {
      return NextResponse.json({ error: "userId or channelId required" }, { status: 400 });
    }

    // If channelId specified → return messages for that channel
    if (channelId) {
      let msgSql = `SELECT m.*, u.name as sender_name, u.avatar_image as sender_avatar
                     FROM messages m
                     JOIN users u ON m.sender_id = u.id
                     WHERE m.channel_id = ?`;
      const args: any[] = [channelId];

      if (before) {
        msgSql += ` AND m.created_at < ?`;
        args.push(before);
      }
      msgSql += ` ORDER BY m.created_at DESC LIMIT ${limit}`;

      const res = await db.execute({ sql: msgSql, args });

      // Update last_read_at for this user
      if (userId) {
        try {
          await db.execute({
            sql: `UPDATE message_channel_members SET last_read_at = CURRENT_TIMESTAMP 
                  WHERE channel_id = ? AND user_id = ?`,
            args: [channelId, userId]
          });
        } catch (e) { /* ignore */ }
      }

      return NextResponse.json({
        messages: res.rows.reverse(), // return oldest first
        hasMore: res.rows.length === limit,
      });
    }

    // List channels for a user
    const channelsRes = await db.execute({
      sql: `SELECT 
              mc.id, mc.name, mc.type, mc.avatar_emoji, mc.created_at,
              mcm.last_read_at,
              (SELECT COUNT(*) FROM messages m WHERE m.channel_id = mc.id 
               AND m.created_at > COALESCE(mcm.last_read_at, '2000-01-01')) as unread_count,
              (SELECT m2.content FROM messages m2 WHERE m2.channel_id = mc.id 
               ORDER BY m2.created_at DESC LIMIT 1) as last_message,
              (SELECT m3.created_at FROM messages m3 WHERE m3.channel_id = mc.id 
               ORDER BY m3.created_at DESC LIMIT 1) as last_message_at,
              (SELECT u2.name FROM messages m4 JOIN users u2 ON m4.sender_id = u2.id 
               WHERE m4.channel_id = mc.id ORDER BY m4.created_at DESC LIMIT 1) as last_sender_name
            FROM message_channel_members mcm
            JOIN message_channels mc ON mcm.channel_id = mc.id
            WHERE mcm.user_id = ?
            ORDER BY CASE WHEN last_message_at IS NULL THEN 1 ELSE 0 END, last_message_at DESC`,
      args: [userId!]
    });

    // For DM channels, resolve the other user's name
    const channels = await Promise.all(channelsRes.rows.map(async (ch) => {
      let displayName = ch.name;
      let displayEmoji = ch.avatar_emoji || '💬';

      if (ch.type === 'dm') {
        // Get the other member
        const otherRes = await db.execute({
          sql: `SELECT u.name, u.avatar_image FROM message_channel_members mcm 
                JOIN users u ON mcm.user_id = u.id
                WHERE mcm.channel_id = ? AND mcm.user_id != ?`,
          args: [String(ch.id), userId!]
        });
        if (otherRes.rows.length > 0) {
          displayName = String(otherRes.rows[0].name);
          displayEmoji = '👤';
        }
      }

      return {
        id: ch.id,
        name: displayName,
        type: ch.type,
        emoji: displayEmoji,
        unreadCount: Number(ch.unread_count) || 0,
        lastMessage: ch.last_message ? String(ch.last_message).substring(0, 80) : null,
        lastMessageAt: ch.last_message_at,
        lastSenderName: ch.last_sender_name,
      };
    }));

    return NextResponse.json({ channels });
  } catch (error: any) {
    console.error("Chat GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat chat", details: error.message }, { status: 500 });
  }
}

// POST: Send message or create channel
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_channel') {
      return await createChannel(body);
    }

    if (action === 'create_dm') {
      return await createOrGetDM(body);
    }

    if (action === 'broadcast') {
      return await sendBroadcast(body);
    }

    // Default: send message
    return await sendMessage(body);
  } catch (error: any) {
    console.error("Chat POST Error:", error);
    return NextResponse.json({ error: "Gagal mengirim", details: error.message }, { status: 500 });
  }
}

// ── Send a message ──────────────────────────────────────────────────────────
async function sendMessage(body: any) {
  const { channelId, senderId, content, messageType, replyTo } = body;

  if (!channelId || !senderId || !content?.trim()) {
    return NextResponse.json({ error: "channelId, senderId, content required" }, { status: 400 });
  }

  const id = "msg_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  await db.execute({
    sql: `INSERT INTO messages (id, channel_id, sender_id, content, message_type, reply_to) 
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, channelId, senderId, content.trim(), messageType || 'text', replyTo || null]
  });

  // Get sender name for the response
  const senderRes = await db.execute({ sql: "SELECT name FROM users WHERE id = ?", args: [senderId] });

  return NextResponse.json({
    success: true,
    message: {
      id,
      channel_id: channelId,
      sender_id: senderId,
      sender_name: senderRes.rows[0]?.name || 'Unknown',
      content: content.trim(),
      message_type: messageType || 'text',
      reply_to: replyTo || null,
      created_at: new Date().toISOString(),
    }
  });
}

// ── Create group/team channel ───────────────────────────────────────────────
async function createChannel(body: any) {
  const { name, type, createdBy, memberIds, avatarEmoji } = body;

  if (!name || !createdBy || !memberIds?.length) {
    return NextResponse.json({ error: "name, createdBy, memberIds required" }, { status: 400 });
  }

  const channelId = "ch_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  await db.execute({
    sql: `INSERT INTO message_channels (id, name, type, created_by, avatar_emoji) VALUES (?, ?, ?, ?, ?)`,
    args: [channelId, name, type || 'group', createdBy, avatarEmoji || '👥']
  });

  // Add creator + members
  const allMembers = [...new Set([createdBy, ...memberIds])];
  for (const memberId of allMembers) {
    try {
      await db.execute({
        sql: "INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?)",
        args: [channelId, memberId]
      });
    } catch (e) { /* duplicate, ignore */ }
  }

  return NextResponse.json({ success: true, channelId });
}

// ── Create or get existing DM channel ───────────────────────────────────────
async function createOrGetDM(body: any) {
  const { userId, targetUserId } = body;

  if (!userId || !targetUserId) {
    return NextResponse.json({ error: "userId and targetUserId required" }, { status: 400 });
  }

  // Check if DM already exists between these two users
  const existingRes = await db.execute({
    sql: `SELECT mc.id FROM message_channels mc
          WHERE mc.type = 'dm'
            AND mc.id IN (SELECT channel_id FROM message_channel_members WHERE user_id = ?)
            AND mc.id IN (SELECT channel_id FROM message_channel_members WHERE user_id = ?)`,
    args: [userId, targetUserId]
  });

  if (existingRes.rows.length > 0) {
    return NextResponse.json({ channelId: existingRes.rows[0].id, existing: true });
  }

  // Create new DM channel
  const channelId = "dm_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  await db.execute({
    sql: "INSERT INTO message_channels (id, type, created_by) VALUES (?, 'dm', ?)",
    args: [channelId, userId]
  });

  await db.execute({
    sql: "INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?)",
    args: [channelId, userId]
  });
  await db.execute({
    sql: "INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?)",
    args: [channelId, targetUserId]
  });

  return NextResponse.json({ channelId, existing: false });
}

// ── Send Broadcast Message (HR/Manager only) ───────────────────────────────
async function sendBroadcast(body: any) {
  const { senderId, content, title, targetDepartments } = body;
  // targetDepartments: string[] — list of dept names, or empty/null = all

  if (!senderId || !content?.trim()) {
    return NextResponse.json({ error: "senderId and content required" }, { status: 400 });
  }

  // Verify sender is HR or Manager
  const senderRes = await db.execute({ sql: "SELECT id, name, role FROM users WHERE id = ?", args: [senderId] });
  if (!senderRes.rows.length) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const senderRole = String(senderRes.rows[0].role);
  if (!['hr', 'manager'].includes(senderRole)) {
    return NextResponse.json({ error: "Hanya HR dan Manager yang bisa mengirim siaran" }, { status: 403 });
  }

  // Get target users based on departments
  let targetUsers: any[] = [];
  if (targetDepartments && targetDepartments.length > 0) {
    const placeholders = targetDepartments.map(() => '?').join(',');
    const res = await db.execute({
      sql: `SELECT id FROM users WHERE department IN (${placeholders})`,
      args: targetDepartments
    });
    targetUsers = res.rows;
  } else {
    // All users
    const res = await db.execute({ sql: "SELECT id FROM users", args: [] });
    targetUsers = res.rows;
  }

  if (targetUsers.length === 0) {
    return NextResponse.json({ error: "Tidak ada user di departemen target" }, { status: 400 });
  }

  // Create broadcast channel
  const deptLabel = targetDepartments?.length
    ? targetDepartments.join(', ')
    : 'Semua Divisi';
  const channelName = title?.trim() || `📢 Siaran — ${deptLabel}`;
  const channelId = "bc_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  await db.execute({
    sql: `INSERT INTO message_channels (id, name, type, created_by, avatar_emoji) VALUES (?, ?, 'broadcast', ?, '📢')`,
    args: [channelId, channelName, senderId]
  });

  // Add all target users + sender as members
  const allMemberIds = [...new Set([senderId, ...targetUsers.map((u: any) => String(u.id))])];
  for (const uid of allMemberIds) {
    try {
      await db.execute({
        sql: "INSERT INTO message_channel_members (channel_id, user_id) VALUES (?, ?)",
        args: [channelId, uid]
      });
    } catch (e) { /* ignore dupes */ }
  }

  // Send the broadcast message
  const msgId = "msg_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  await db.execute({
    sql: `INSERT INTO messages (id, channel_id, sender_id, content, message_type) VALUES (?, ?, ?, ?, 'broadcast')`,
    args: [msgId, channelId, senderId, content.trim()]
  });

  return NextResponse.json({
    success: true,
    channelId,
    recipientCount: allMemberIds.length,
    message: {
      id: msgId,
      channel_id: channelId,
      sender_id: senderId,
      sender_name: senderRes.rows[0].name,
      content: content.trim(),
      message_type: 'broadcast',
      created_at: new Date().toISOString(),
    }
  });
}

