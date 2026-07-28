import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import { dispatchNotification } from '@/lib/notificationService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role'); // employee, manager, hr

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    let sql = '';
    let args: any[] = [];

    if (role === 'hr') {
      sql = `SELECT r.*, rew.title as reward_title, rew.category, u.name as user_name 
             FROM reward_redemptions r
             JOIN rewards rew ON r.reward_id = rew.id
             JOIN users u ON r.user_id = u.id
             ORDER BY r.created_at DESC`;
    } else if (role === 'manager') {
      const deptRes = await db.execute({ sql: 'SELECT department FROM users WHERE id = ?', args: [userId] });
      const dept = (deptRes.rows[0] as any)?.department || '';
      sql = `SELECT r.*, rew.title as reward_title, rew.category, u.name as user_name 
             FROM reward_redemptions r
             JOIN rewards rew ON r.reward_id = rew.id
             JOIN users u ON r.user_id = u.id
             WHERE u.manager_id = ? OR (u.department = ? AND u.id != ?)
             ORDER BY r.created_at DESC`;
      args = [userId, dept, userId];
    } else {
      sql = `SELECT r.*, rew.title as reward_title, rew.category 
             FROM reward_redemptions r
             JOIN rewards rew ON r.reward_id = rew.id
             WHERE r.user_id = ?
             ORDER BY r.created_at DESC`;
      args = [userId];
    }

    const res = await db.execute({ sql, args });
    return NextResponse.json({ redemptions: res.rows });
  } catch (error) {
    console.error("Redemption GET error:", error);
    return NextResponse.json({ error: 'Failed to fetch redemptions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userName, rewardId, rewardTitle, rewardPoints, rewardType, userNotes } = body;

    if (!userId || !rewardId) {
      return NextResponse.json({ error: 'Missing userId or rewardId' }, { status: 400 });
    }

    // 1. Get user points and reward cost
    const userRes = await db.execute({ sql: 'SELECT coins FROM users WHERE id = ?', args: [userId] });
    const rewardRes = await db.execute({ sql: 'SELECT points_cost, stock, category FROM rewards WHERE id = ?', args: [rewardId] });

    if (userRes.rows.length === 0 || rewardRes.rows.length === 0) {
      return NextResponse.json({ error: 'User or reward not found' }, { status: 404 });
    }

    const userCoins = Number((userRes.rows[0] as any).coins || 0);
    const reward = rewardRes.rows[0] as any;
    const cost = Number(reward.points_cost);

    if (userCoins < cost) {
      return NextResponse.json({ error: 'Koin tidak cukup' }, { status: 400 });
    }

    if (Number(reward.stock) <= 0) {
      return NextResponse.json({ error: 'Reward out of stock' }, { status: 400 });
    }

    const initialStatus = reward.category === 'Cuti' ? 'pending_manager' : 'pending_hr';

    // 2. Deduct points and reduce stock
    await db.execute({
      sql: 'UPDATE users SET coins = coins - ? WHERE id = ?',
      args: [cost, userId]
    });
    
    await db.execute({
      sql: 'UPDATE rewards SET stock = stock - 1 WHERE id = ?',
      args: [rewardId]
    });

    // 3. Create redemption record
    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO reward_redemptions (id, reward_id, user_id, points_spent, status, user_notes)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, rewardId, userId, cost, initialStatus, userNotes || '']
    });

    // 4. Log XP transaction
    const txId = "tx_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    await db.execute({
      sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
      args: [txId, userId, -cost, 'reward_redeem', `Tukar reward: ${rewardTitle || rewardId}`]
    });

    // 5. Notify HR about the new redemption request
    const hrRes = await db.execute({ sql: "SELECT id FROM users WHERE role = 'hr'" });
    for (const hr of hrRes.rows) {
      await dispatchNotification(hr.id as string, 'hr_alert', {
        title: '🎁 Permintaan Reward Baru',
        message: `${userName || 'Karyawan'} menukar ${cost} poin untuk "${rewardTitle || rewardId}". Mohon segera diproses.`,
        employee_name: userName,
        reward: rewardTitle || rewardId
      });
    }

    // 6. Confirm to the employee
    await dispatchNotification(userId, 'success', {
      title: '🎁 Permintaan Reward Terkirim',
      message: `Permintaan "${rewardTitle || rewardId}" sedang diproses. Kamu akan mendapat notifikasi saat selesai.`
    });

    return NextResponse.json({ success: true, id, status: initialStatus, pointsRemaining: userCoins - cost });
  } catch (error) {
    console.error("Redemption POST error:", error);
    return NextResponse.json({ error: 'Failed to create redemption' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { redemptionId, status, proofLink, reviewerNotes, reviewerId } = body;

    if (!redemptionId || !status || !reviewerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Require reviewer notes when rejecting
    if (status === 'rejected' && !reviewerNotes) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 });
    }

    // Always fetch redemption data (needed for refund on reject + notifications)
    const redRes = await db.execute({
      sql: `SELECT r.user_id, r.points_spent, r.reward_id, rew.title as reward_title
            FROM reward_redemptions r
            JOIN rewards rew ON r.reward_id = rew.id
            WHERE r.id = ?`,
      args: [redemptionId]
    });

    if (redRes.rows.length === 0) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    const redemption = redRes.rows[0] as any;

    // If rejecting, refund points and restore stock
    if (status === 'rejected') {
      await db.execute({
        sql: 'UPDATE users SET coins = coins + ? WHERE id = ?',
        args: [redemption.points_spent, redemption.user_id]
      });
      await db.execute({
        sql: 'UPDATE rewards SET stock = stock + 1 WHERE id = ?',
        args: [redemption.reward_id]
      });
    }

    // Update the redemption record
    await db.execute({
      sql: `UPDATE reward_redemptions 
            SET status = ?, proof_link = ?, reviewer_notes = ?, reviewed_by = ? 
            WHERE id = ?`,
      args: [status, proofLink || null, reviewerNotes || null, reviewerId, redemptionId]
    });

    // Notify the employee about the status change
    if (status === 'fulfilled') {
      await dispatchNotification(redemption.user_id, 'success', {
        title: '🎉 Reward Sudah Dikirim!',
        message: `Reward "${redemption.reward_title}" sudah diproses. ${proofLink ? 'Cek bukti di riwayat penukaran kamu.' : ''}`
      });
    } else if (status === 'rejected') {
      await dispatchNotification(redemption.user_id, 'warning', {
        title: '⚠️ Permintaan Reward Ditolak',
        message: `Permintaan "${redemption.reward_title}" ditolak. Alasan: ${reviewerNotes}. Poin ${redemption.points_spent} sudah dikembalikan.`
      });
    } else if (status === 'pending_hr') {
      // Manager approved, forwarded to HR
      await dispatchNotification(redemption.user_id, 'info', {
        title: '✅ Disetujui Manager',
        message: `Permintaan "${redemption.reward_title}" disetujui manager. Menunggu proses HR.`
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Redemption PATCH error:", error);
    return NextResponse.json({ error: 'Failed to update redemption' }, { status: 500 });
  }
}
