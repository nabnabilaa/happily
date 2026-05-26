import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dispatchNotification } from '@/lib/notificationService';

export async function POST(request: Request) {
  try {
    const { userId, userName, rewardId, rewardTitle, rewardPoints, rewardType } = await request.json();

    if (!userId || !rewardId || !rewardPoints) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // 1. Verify user points/coins
    const userRes = await db.execute({
      sql: "SELECT points, coins FROM users WHERE id = ?",
      args: [userId]
    });
    
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }
    
    // Check current coins (not points)
    const currentCoins = Number(userRes.rows[0].coins || userRes.rows[0].points); // Fallback to points if coins is null
    if (currentCoins < rewardPoints) {
      return NextResponse.json({ error: 'Koin tidak cukup' }, { status: 400 });
    }

    // 2. Deduct only coins (currency)
    await db.execute({
      sql: "UPDATE users SET coins = coins - ? WHERE id = ?",
      args: [rewardPoints, userId]
    });

    // 3. Log XP transaction for reward redemption (negative)
    const txId = "tx_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    await db.execute({
      sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
      args: [txId, userId, -rewardPoints, 'reward_redeem', `Tukar reward: ${rewardTitle}`]
    });

    // 4. Notify HR so they can fulfill the reward
    // Broadcast to HR
    const hrRes = await db.execute({ sql: "SELECT id FROM users WHERE role = 'hr'" });
    for (const hr of hrRes.rows) {
      await dispatchNotification(hr.id as string, 'hr_alert', {
        title: '🌟 Reward Claim',
        message: `${userName} baru saja menukar ${rewardPoints} poin dengan "${rewardTitle}". Mohon segera diproses!`,
        employee_name: userName,
        reward: rewardTitle
      });
    }

    // 5. Notify the user of successful claim
    await dispatchNotification(userId, 'success', {
      title: '🎁 Klaim Berhasil',
      message: `Kamu berhasil menukar "${rewardTitle}". Tim HR akan segera memprosesnya.`
    });

    return NextResponse.json({ success: true, pointsRemaining: currentCoins - rewardPoints });
  } catch (error: any) {
    console.error('Reward Redeem Error:', error);
    return NextResponse.json({ error: 'Gagal menukar reward' }, { status: 500 });
  }
}
