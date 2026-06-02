import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { hpEventEmitter } from "@/lib/events";

// GET: Fetch calendar events for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const res = await db.execute({
      sql: `SELECT e.*, a.status as attendee_status 
            FROM calendar_events e 
            LEFT JOIN calendar_attendees a ON e.id = a.event_id AND a.user_id = ?
            WHERE e.creator_id = ? OR a.user_id = ?
            ORDER BY e.start_time ASC`,
      args: [userId, userId, userId]
    });

    const events = res.rows.map(r => ({
      id: r.id,
      creatorId: r.creator_id,
      title: r.title,
      description: r.description,
      startTime: r.start_time,
      endTime: r.end_time,
      notificationOffsetMinutes: r.notification_offset_minutes,
      eventType: r.event_type,
      attendeeStatus: r.attendee_status || 'owner',
      recurrence: r.recurrence || null,
      recurrenceEnd: r.recurrence_end || null,
      location: r.location || null,
      color: r.color || '#3B6FA0',
      isAllDay: r.is_all_day || false,
    }));

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Calendar GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch calendar", details: error.message }, { status: 500 });
  }
}

// POST: Create a calendar event
export async function POST(request: Request) {
  try {
    const { userId, title, description, startTime, endTime, notificationOffsetMinutes, attendees, recurrence, location } = await request.json();
    if (!userId || !title || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const eventId = "cal_" + uuidv4().substring(0, 8);

    await db.execute({
      sql: `INSERT INTO calendar_events (id, creator_id, title, description, start_time, end_time, notification_offset_minutes, recurrence, location)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [eventId, userId, title, description || '', startTime, endTime, notificationOffsetMinutes || 15, recurrence || null, location || null]
    });

    // Add attendees + notifications
    if (attendees && Array.isArray(attendees)) {
      for (const attId of attendees) {
        if (attId !== userId) {
          await db.execute({
            sql: `INSERT INTO calendar_attendees (event_id, user_id, status) VALUES (?, ?, 'pending')`,
            args: [eventId, attId]
          });
          const notifId = "n_" + uuidv4().substring(0, 8);
          await db.execute({
            sql: `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`,
            args: [notifId, attId, `📅 Undangan: ${title}`, `Kamu diundang ke acara "${title}". Cek Kalender untuk detail.`, 'info']
          });
        }
      }
    }

    hpEventEmitter.emit("db_update", { type: "refresh", targetUserId: userId, timestamp: Date.now() });
    return NextResponse.json({ success: true, eventId });
  } catch (error: any) {
    console.error("Calendar POST Error:", error);
    return NextResponse.json({ error: "Failed to create event", details: error.message }, { status: 500 });
  }
}

// DELETE: Delete a calendar event
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId');

    if (!eventId || !userId) {
      return NextResponse.json({ error: "eventId and userId required" }, { status: 400 });
    }

    // Only creator can delete
    const check = await db.execute({
      sql: "SELECT id FROM calendar_events WHERE id = ? AND creator_id = ?",
      args: [eventId, userId]
    });
    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await db.execute({ sql: "DELETE FROM calendar_attendees WHERE event_id = ?", args: [eventId] });
    await db.execute({ sql: "DELETE FROM calendar_events WHERE id = ?", args: [eventId] });

    hpEventEmitter.emit("db_update", { type: "refresh", targetUserId: userId, timestamp: Date.now() });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Calendar DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete event", details: error.message }, { status: 500 });
  }
}

