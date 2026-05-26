import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/notificationService';

export async function GET(request: Request) {
  try {
    // 1. Get all HR users
    const hrRes = await db.execute({
      sql: "SELECT id FROM users WHERE role = 'hr'"
    });
    const hrUsers = hrRes.rows;

    if (hrUsers.length === 0) {
      return NextResponse.json({ success: true, message: 'No HR users found to notify' });
    }

    // 2. Find employees with concerning moods
    const concerningRes = await db.execute({
      sql: "SELECT id, name, mood, team_id FROM users WHERE role = 'employee' AND mood IN ('burnout', 'stress')"
    });
    const concerningUsers = concerningRes.rows;

    if (concerningUsers.length === 0) {
      return NextResponse.json({ success: true, message: 'No concerning well-being states found' });
    }

    // 3. Notify HR for each concerning user
    for (const employee of concerningUsers) {
      for (const hr of hrUsers) {
        await dispatchNotification(hr.id as string, 'hr_alert', {
          employee_name: employee.name,
          issue_type: employee.mood,
          details: `${employee.name} melaporkan state: ${employee.mood}. Mohon cek kondisinya.`
        });
      }
    }

    return NextResponse.json({ success: true, alertsGenerated: concerningUsers.length });
  } catch (error: any) {
    console.error('HR Alerts Cron Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
