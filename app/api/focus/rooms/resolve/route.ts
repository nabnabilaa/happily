import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/authSession';
import { getRoomByJoinCode } from '@/lib/focusRoom';

/**
 * Menukar kode ruangan dengan id-nya.
 *
 * Ada supaya kode tidak perlu lagi sama dengan id ruangan. Dulu keduanya
 * identik, dan id itu dikirim ke setiap klien yang memuat lobby — jadi kode
 * "rahasia" sebenarnya sudah ada di tangan semua orang.
 *
 * Dibatasi lajunya karena endpoint ini satu-satunya cara menebak kode.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = attempts.get(userId);
  if (!entry || now > entry.resetAt) {
    attempts.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (attempts.size > 5000) attempts.clear(); // rem sederhana agar map tidak tumbuh liar
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Sesi tidak berlaku' }, { status: 401 });
    }
    if (rateLimited(userId)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan kode. Coba lagi sebentar lagi.' },
        { status: 429 },
      );
    }

    const { code } = await request.json().catch(() => ({ code: '' }));
    const room = await getRoomByJoinCode(String(code ?? ''));

    // Pesan yang sama untuk "tidak ada" dan "sudah selesai": membedakannya
    // memberi tahu penebak bahwa kodenya benar.
    if (!room) {
      return NextResponse.json({ error: 'Kode tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      roomId: room.id,
      name: room.name,
      mode: room.mode,
      status: room.status,
      requiresCode: room.visibility === 'code',
    });
  } catch (error: any) {
    console.error('Focus resolve error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
