import { NextResponse } from 'next/server';

declare global {
  var focusSessions: Record<string, {
    status: 'idle' | 'running' | 'failed' | 'completed';
    lastUpdated: number;
    taskId?: string;
    duration?: number;
    startedAt?: number;
  }>;
}

if (!global.focusSessions) {
  global.focusSessions = {};
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const session = global.focusSessions[userId] || { status: 'idle', lastUpdated: Date.now() };
  return NextResponse.json(session);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, status, taskId, duration, startedAt } = body;

    if (!userId || !status) {
      return NextResponse.json({ error: 'Missing userId or status' }, { status: 400 });
    }

    global.focusSessions[userId] = {
      status,
      taskId: taskId || global.focusSessions[userId]?.taskId,
      duration: duration || global.focusSessions[userId]?.duration,
      startedAt: startedAt || global.focusSessions[userId]?.startedAt,
      lastUpdated: Date.now()
    };

    return NextResponse.json({ success: true, session: global.focusSessions[userId] });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
