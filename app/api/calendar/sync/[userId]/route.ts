import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

function formatDateForICS(date: Date | string) {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const userId = (await params).userId;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!userId || !token) {
      return new NextResponse("Missing userId or token", { status: 400 });
    }

    // Very basic security: Verify token matches a hash of the userId + a secret
    // In production, you would store a `calendar_sync_token` in the users table.
    const expectedToken = crypto.createHash('sha256').update(userId + process.env.CRON_SECRET).digest('hex').substring(0, 16);
    
    if (token !== expectedToken) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const eventsRes = await db.execute({
      sql: `SELECT e.* FROM calendar_events e 
            LEFT JOIN calendar_attendees a ON e.id = a.event_id 
            WHERE e.creator_id = ? OR a.user_id = ?`,
      args: [userId, userId]
    });

    // Generate ICS content
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Flow Productivity//Calendar Sync//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    for (const ev of eventsRes.rows) {
      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${ev.id}@flowproductivity.com`);
      icsContent.push(`DTSTAMP:${formatDateForICS(new Date())}`);
      if (ev.start_time) icsContent.push(`DTSTART:${formatDateForICS(ev.start_time as string)}`);
      if (ev.end_time) icsContent.push(`DTEND:${formatDateForICS(ev.end_time as string)}`);
      icsContent.push(`SUMMARY:${ev.title}`);
      if (ev.description) icsContent.push(`DESCRIPTION:${String(ev.description).replace(/\n/g, '\\n')}`);
      if (ev.location) icsContent.push(`LOCATION:${ev.location}`);
      icsContent.push('END:VEVENT');
    }

    icsContent.push('END:VCALENDAR');

    return new NextResponse(icsContent.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="flow-calendar-${userId}.ics"`
      }
    });

  } catch (error) {
    console.error("Calendar Sync Error:", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}
