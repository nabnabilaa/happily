import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hpEventEmitter } from "@/lib/events";

// ══════════════════════════════════════════════════════════════
// User Status / Presence API — Spec v2
// Status types: working, meeting, break, away, sick, izin, cuti, offline
// ══════════════════════════════════════════════════════════════

export type UserStatusType = 'working' | 'meeting' | 'break' | 'away' | 'sick' | 'izin' | 'cuti' | 'offline';

const STATUS_META: Record<UserStatusType, { label: string; emoji: string; color: string }> = {
  working:  { label: 'Sedang Bekerja',   emoji: '💻', color: '#2D8A4E' },
  meeting:  { label: 'Dalam Meeting',    emoji: '📞', color: '#3B6FA0' },
  break:    { label: 'Istirahat',         emoji: '☕', color: '#D4A017' },
  away:     { label: 'Away',              emoji: '🚶', color: '#8A8A8A' },
  sick:     { label: 'Sakit',             emoji: '🤒', color: '#E03131' },
  izin:     { label: 'Izin',              emoji: '📋', color: '#7B6BB5' },
  cuti:     { label: 'Cuti',              emoji: '🏖️', color: '#2196F3' },
  offline:  { label: 'Offline',           emoji: '⚫', color: '#CCCCCC' },
};

// GET: Fetch all user statuses (for presence board)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const managerId = searchParams.get('managerId');

    let query = `
      SELECT 
        u.id, u.name, u.job_title, u.avatar_image, u.role, u.points, u.level,
        t.name as team_name,
        us.status, us.reason, us.attachment_url, us.updated_at as status_since,
        a.check_in_at as today_checkin, a.check_out_at as today_checkout, a.check_in_type
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN user_status us ON u.id = us.user_id
      LEFT JOIN attendance a ON u.id = a.user_id AND DATE(a.check_in_at) = CURDATE()
      WHERE u.role IN ('employee', 'manager')
    `;
    const args: any[] = [];

    // Filter by manager's team members
    if (managerId) {
      query += ` AND (u.manager_id = ? OR u.id = ?)`;
      args.push(managerId, managerId);
    }

    query += ` ORDER BY 
      CASE us.status 
        WHEN 'working' THEN 1
        WHEN 'meeting' THEN 2
        WHEN 'break' THEN 3
        WHEN 'sick' THEN 4
        WHEN 'izin' THEN 5
        WHEN 'cuti' THEN 6
        WHEN 'away' THEN 7
        ELSE 8
      END,
      u.name ASC
    `;

    const result = await db.execute({ sql: query, args });

    const users = result.rows.map(r => {
      // Derive effective status: if no explicit status set, derive from attendance
      let effectiveStatus: UserStatusType = 'offline';
      if (r.status) {
        effectiveStatus = r.status as UserStatusType;
      } else if (r.today_checkin && !r.today_checkout) {
        effectiveStatus = 'working';
      } else if (r.today_checkout) {
        effectiveStatus = 'offline'; // Already clocked out
      }

      const meta = STATUS_META[effectiveStatus] || STATUS_META.offline;

      return {
        id: r.id,
        name: r.name,
        jobTitle: r.job_title,
        avatarImage: r.avatar_image,
        role: r.role,
        points: r.points || 0,
        level: r.level || 1,
        team: r.team_name || 'Unassigned',
        status: effectiveStatus,
        statusLabel: meta.label,
        statusEmoji: meta.emoji,
        statusColor: meta.color,
        reason: r.reason || null,
        attachmentUrl: r.attachment_url || null,
        statusSince: r.status_since || null,
        checkInType: r.check_in_type || null,
        todayCheckin: r.today_checkin || null,
        todayCheckout: r.today_checkout || null,
      };
    });

    // Summary counts
    const summary = {
      total: users.length,
      working: users.filter(u => u.status === 'working').length,
      meeting: users.filter(u => u.status === 'meeting').length,
      break: users.filter(u => u.status === 'break').length,
      sick: users.filter(u => u.status === 'sick').length,
      izin: users.filter(u => u.status === 'izin').length,
      cuti: users.filter(u => u.status === 'cuti').length,
      offline: users.filter(u => u.status === 'offline' || u.status === 'away').length,
    };

    return NextResponse.json({ users, summary, statusMeta: STATUS_META });
  } catch (error: any) {
    console.error("Status API Error:", error);
    return NextResponse.json({ error: "Gagal memuat status", details: error.message }, { status: 500 });
  }
}

// POST: Update user status
export async function POST(request: Request) {
  try {
    const { userId, status, reason, attachmentUrl } = await request.json();

    if (!userId || !status) {
      return NextResponse.json({ error: "userId and status required" }, { status: 400 });
    }

    if (!STATUS_META[status as UserStatusType]) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    // Upsert user_status
    await db.execute({
      sql: `INSERT INTO user_status (user_id, status, reason, attachment_url, updated_at)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE status = VALUES(status), reason = VALUES(reason),
            attachment_url = VALUES(attachment_url), updated_at = NOW()`,
      args: [userId, status, reason || null, attachmentUrl || null]
    });

    // For excused absences (sick, izin, cuti), mark in attendance if not already
    if (['sick', 'izin', 'cuti'].includes(status)) {
      // Check if already has attendance today
      const existing = await db.execute({
        sql: "SELECT id FROM attendance WHERE user_id = ? AND DATE(check_in_at) = CURDATE()",
        args: [userId]
      });

      if (existing.rows.length === 0) {
        // Insert an excused attendance record
        await db.execute({
          sql: `INSERT INTO attendance (user_id, check_in_type, notes, check_in_at)
                VALUES (?, ?, ?, NOW())`,
          args: [userId, status.toUpperCase(), reason || `${STATUS_META[status as UserStatusType].label}`]
        });
      }
    }

    // Emit db_update to trigger real-time SSE refresh for all active clients
    try {
      hpEventEmitter.emit("db_update", { type: "refresh", timestamp: Date.now() });
    } catch (sseErr) {
      console.warn("Failed to emit status update SSE event:", sseErr);
    }

    return NextResponse.json({ 
      success: true, 
      status,
      label: STATUS_META[status as UserStatusType].label 
    });
  } catch (error: any) {
    console.error("Status Update Error:", error);
    return NextResponse.json({ error: "Gagal update status", details: error.message }, { status: 500 });
  }
}

