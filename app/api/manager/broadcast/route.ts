import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/notificationService';
import { resolveManagerTeam } from '@/lib/managerTeam';
import { requireActor } from '@/lib/apiAuth';

export async function POST(request: Request) {
  try {
    const { title, message, type = 'announcement' } = await request.json();

    /*
     * Pengirim dari cookie, bukan dari body.
     *
     * Peran memang sudah dibaca ulang dari DB di bawah — tapi yang dibaca
     * adalah peran orang yang DISEBUT `senderId`. Menyebut id HR sudah cukup
     * untuk masuk ke cabang "kirim ke semua orang" dan menyiarkan apa pun ke
     * seluruh perusahaan atas nama HR.
     */
    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;
    const senderId = actor.userId;

    if (!title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userRes = await db.execute({
      sql: "SELECT role FROM users WHERE id = ?",
      args: [senderId]
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    const senderRole = userRes.rows[0].role;
    let targetIds: string[];

    if (senderRole === 'hr' || senderRole === 'admin') {
      const allRes = await db.execute({ sql: "SELECT id FROM users WHERE id != ?", args: [senderId] });
      targetIds = allRes.rows.map(u => String(u.id));
    } else {
      // Was `SELECT id FROM users WHERE team_id = ?`, but team_id is the legacy
      // column the schema migrated away from — so managers broadcast to nobody.
      const { memberIds } = await resolveManagerTeam(senderId);
      targetIds = memberIds;
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ success: true, broadcastCount: 0 });
    }

    const results = await Promise.allSettled(
      targetIds.map(id => dispatchNotification(id, type, { title, message }))
    );

    const delivered = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - delivered;
    if (failed > 0) console.warn(`Broadcast: ${failed}/${results.length} notifications failed`);

    return NextResponse.json({ success: true, broadcastCount: delivered, failed });
  } catch (error: any) {
    console.error('Broadcast Error:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}
