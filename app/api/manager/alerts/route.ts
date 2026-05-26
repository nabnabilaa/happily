import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId');
    const teamId = searchParams.get('teamId');

    if (!managerId && !teamId) {
      return NextResponse.json({ error: 'ManagerId or TeamId required' }, { status: 400 });
    }

    // Identify team
    let finalTeamId = teamId;
    if (!finalTeamId) {
      const userRes = await db.execute({
        sql: "SELECT team_id FROM users WHERE id = ?",
        args: [managerId!]
      });
      finalTeamId = userRes.rows[0]?.team_id;
    }

    if (!finalTeamId) {
      return NextResponse.json({ alerts: [] });
    }

    // Get team members' mood and inactivity (using latest attendance or logbook)
    const membersRes = await db.execute({
      sql: `SELECT id, name, mood, energy, last_activity 
            FROM users 
            WHERE team_id = ? AND role = 'employee'`,
      args: [finalTeamId]
    });

    const alerts = [];
    const now = new Date();

    for (const member of membersRes.rows) {
      // Mood alert
      if (member.mood === 'burnout' || member.mood === 'stress' || member.mood === 'sad') {
        alerts.push({
          type: 'mood',
          userId: member.id,
          userName: member.name,
          message: `${member.name} melaporkan mood: ${member.mood}`,
          priority: member.mood === 'burnout' ? 'high' : 'medium'
        });
      }

      // Inactivity alert (if last activity > 48h and it's a weekday)
      if (member.last_activity) {
        const lastAct = new Date(member.last_activity);
        const diffHours = (now.getTime() - lastAct.getTime()) / (1000 * 60 * 60);
        
        if (diffHours > 48) {
          alerts.push({
            type: 'inactivity',
            userId: member.id,
            userName: member.name,
            message: `${member.name} belum aktif selama lebih dari 2 hari.`,
            priority: 'medium'
          });
        }
      }
    }

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error('Manager alerts fetch error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
