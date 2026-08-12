import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import { dispatchNotification } from '@/lib/notificationService';
import { getRequesterAccess, canHrAdmin } from '@/lib/hrAuth';
import { resolveManagerTeam } from '@/lib/managerTeam';
import { requireActor, requireSelfOrHrAdmin } from "@/lib/apiAuth";

/**
 * Perpindahan status yang sah untuk satu penukaran reward.
 *
 * Ditulis sebagai tabel, bukan rangkaian `if`, karena yang menentukan aman atau
 * tidaknya bukan status tujuan melainkan PASANGAN asal→tujuan. `rejected` dan
 * `fulfilled` sengaja tidak punya lanjutan: keduanya akhir. Itulah yang menutup
 * penolakan berulang — dan bersamanya, pengembalian koin berulang.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_manager: ['pending_hr', 'rejected'],
  pending_hr: ['fulfilled', 'rejected'],
  // Ejaan lama dari baris-baris awal; diperlakukan seperti antrean HR.
  pending: ['fulfilled', 'rejected'],
  fulfilled: [],
  rejected: [],
};

/**
 * Siapa yang boleh memutuskan penukaran, tergantung ia sedang di antrean siapa.
 *
 * Tahap manajer diputuskan atasan si karyawan (HR-Admin boleh menyalip, karena
 * karyawan tanpa atasan tidak boleh terjebak selamanya). Tahap HR hanya HR.
 * Tidak seorang pun boleh memutuskan penukarannya sendiri — termasuk manajer
 * dan HR, dengan alasan yang sama seperti pada review pekerjaan.
 */
async function authorizeRedemptionReview(
  reviewerId: unknown,
  ownerId: string,
  fromStatus: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const reviewer = reviewerId ? String(reviewerId) : '';
  if (!reviewer) return { ok: false, status: 400, error: 'reviewerId wajib diisi' };

  if (reviewer === ownerId) {
    return { ok: false, status: 403, error: 'Kamu tidak bisa memproses penukaranmu sendiri' };
  }

  const { role, hrAccess } = await getRequesterAccess(reviewer);
  if (!role) return { ok: false, status: 403, error: 'Pemroses tidak dikenal' };

  if (canHrAdmin(role, hrAccess)) return { ok: true };

  if (fromStatus === 'pending_manager' && role === 'manager') {
    const { memberIds } = await resolveManagerTeam(reviewer);
    if (memberIds.includes(ownerId)) return { ok: true };
    return { ok: false, status: 403, error: 'Karyawan ini bukan anggota timmu' };
  }

  return { ok: false, status: 403, error: 'Tahap ini hanya bisa diproses HR' };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const claimedUserId = searchParams.get('userId');
    if (!claimedUserId) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    /*
     * `?role=` dulu menentukan cakupan kueri — dan datang dari URL.
     *
     * Karyawan biasa cukup menulis `role=hr` untuk menarik SELURUH penukaran
     * beserta nama pemiliknya. Terbukti runtime: emp001 melihat penukaran
     * emp002 lengkap dengan namanya. Peran kini dibaca dari database milik
     * pemegang cookie, dan parameter lama diabaikan.
     */
    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;
    const userId = actor.userId;

    const { role: verifiedRole, hrAccess } = await getRequesterAccess(userId);
    const role = canHrAdmin(verifiedRole, hrAccess) ? 'hr' : verifiedRole;

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

    // Terbukti runtime sebelum perbaikan: emp001 membelanjakan koin emp002
    // hanya dengan mengirim `userId` orang lain (8000 → 7500).
    const access = await requireSelfOrHrAdmin(request, userId);
    if ("response" in access) return access.response;

    /*
     * Periksa-lalu-potong harus jadi satu langkah yang tak terpisahkan.
     *
     * Versi lama membaca saldo, memeriksanya, lalu memotong lewat tiga
     * pernyataan terpisah tanpa kunci apa pun. Dua permintaan yang tiba
     * bersamaan — satu tombol yang diklik dua kali sudah cukup — sama-sama
     * membaca saldo LAMA, sama-sama lolos pemeriksaan, lalu sama-sama memotong.
     * Saldo bisa berakhir minus dan stok reward ikut tertarik dua kali untuk
     * barang yang cuma ada satu.
     *
     * Bukan kekhawatiran teoretis: di basis data ini ada tiga penukaran reward
     * yang sama dari orang yang sama dalam enam menit. Kali ini saldonya cukup
     * dan tidak ada yang minus, tapi yang menyelamatkan hanyalah kebetulan
     * urutan — bukan kodenya.
     *
     * `FOR UPDATE` mengunci baris user dan baris reward sampai transaksi
     * selesai, jadi permintaan kedua menunggu dan membaca saldo yang SUDAH
     * terpotong. Urutan penguncian dijaga tetap: user dulu, baru reward.
     */
    const outcome = await db.transaction(async (conn) => {
      const [userRows] = await conn.execute('SELECT coins FROM users WHERE id = ? FOR UPDATE', [userId]);
      const [rewardRows] = await conn.execute(
        'SELECT points_cost, stock, category FROM rewards WHERE id = ? FOR UPDATE',
        [rewardId]
      );

      const userRow = (userRows as any[])[0];
      const reward = (rewardRows as any[])[0];
      if (!userRow || !reward) {
        return { error: 'User or reward not found', code: 404 as const };
      }

      const userCoins = Number(userRow.coins || 0);
      const cost = Number(reward.points_cost);

      if (userCoins < cost) return { error: 'Koin tidak cukup', code: 400 as const };
      if (Number(reward.stock) <= 0) return { error: 'Reward out of stock', code: 400 as const };

      /*
       * Reward yang memotong waktu kerja butuh restu atasan dulu, bukan HR.
       *
       * Perbandingan sebelumnya memakai kategori `'Cuti'` — dan tidak ada satu
       * pun reward dengan kategori itu. Reward cuti yang sebenarnya
       * ("Cuti Tambahan 1 Hari") berkategori `'Benefit'`, jadi cabang ini tidak
       * pernah sekali pun dieksekusi: semua penukaran langsung ke antrean HR,
       * dan layar reward manajer — yang menyaring `status === 'pending_manager'`
       * — selamanya kosong. Seluruh alur dua tahap yang sudah dibangun di
       * ALLOWED_TRANSITIONS ikut jadi kode mati.
       *
       * Dicocokkan ke daftar, bukan satu string, supaya menambah kategori yang
       * butuh persetujuan atasan tidak perlu menyentuh logika ini lagi.
       */
      const MANAGER_APPROVED_CATEGORIES = ['Benefit', 'Cuti'];
      const initialStatus = MANAGER_APPROVED_CATEGORIES.includes(String(reward.category))
        ? 'pending_manager'
        : 'pending_hr';

      await conn.execute('UPDATE users SET coins = coins - ? WHERE id = ?', [cost, userId]);
      await conn.execute('UPDATE rewards SET stock = stock - 1 WHERE id = ?', [rewardId]);

      const id = randomUUID();
      await conn.execute(
        `INSERT INTO reward_redemptions (id, reward_id, user_id, points_spent, status, user_notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, rewardId, userId, cost, initialStatus, userNotes || '']
      );

      const txId = "tx_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      await conn.execute(
        "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
        [txId, userId, -cost, 'reward_redeem', `Tukar reward: ${rewardTitle || rewardId}`]
      );

      return { id, cost, initialStatus, userCoins };
    });

    if ('error' in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.code });
    }

    const { id, cost, initialStatus, userCoins } = outcome;

    // 5. Notify HR about the new redemption request
    //
    // Penerimanya bukan cuma role 'hr'. Employee/manager yang dititipi
    // `hr_access` membuka konsol HR yang sama dan memproses antrean yang sama
    // (lihat `canHrAdmin` di lib/hrAuth.ts); kalau mereka tidak diberi tahu,
    // klaim menumpuk di layar yang tidak ada yang tahu harus dibuka.
    //
    // `dedupeWindowMinutes: 0` mematikan penyaring anti-spam untuk peristiwa
    // ini. Penyaring itu membandingkan judul + isi, dan dua klaim reward yang
    // sama dalam satu jam menghasilkan kalimat yang identik — klaim kedua akan
    // hilang diam-diam padahal koinnya benar-benar terpotong dua kali.
    const hrRes = await db.execute({
      sql: "SELECT id FROM users WHERE role = 'hr' OR hr_access = 1"
    });
    for (const hr of hrRes.rows) {
      await dispatchNotification(hr.id as string, 'hr_alert', {
        title: '🎁 Permintaan Reward Baru',
        message: `${userName || 'Karyawan'} menukar ${cost} poin untuk "${rewardTitle || rewardId}". Mohon segera diproses.`,
        employee_name: userName,
        reward: rewardTitle || rewardId
      }, { dedupeWindowMinutes: 0 });
    }

    // 6. Confirm to the employee
    await dispatchNotification(userId, 'success', {
      title: '🎁 Permintaan Reward Terkirim',
      message: `Permintaan "${rewardTitle || rewardId}" sedang diproses. Kamu akan mendapat notifikasi saat selesai.`
    }, { dedupeWindowMinutes: 0 });

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

    if (!redemptionId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    /*
     * Peninjau ditentukan cookie, bukan body.
     *
     * `authorizeRedemptionReview` di bawah sudah menolak orang yang memproses
     * penukarannya sendiri — logikanya benar. Yang membatalkannya adalah asal
     * `reviewerId`: karena datang dari body, emp001 cukup menulis id HR untuk
     * meng-ACC penukarannya sendiri. Terbukti: HTTP 200, baris berubah jadi
     * `status=fulfilled, reviewed_by=u_audit_hr1` atas persetujuan HR yang
     * tidak pernah menyentuhnya.
     */
    const actor = await requireActor(request, reviewerId);
    if ("response" in actor) return actor.response;
    const verifiedReviewerId = actor.userId;

    // Require reviewer notes when rejecting
    if (status === 'rejected' && !reviewerNotes) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 });
    }

    if (!Object.values(ALLOWED_TRANSITIONS).some((next) => next.includes(status))) {
      return NextResponse.json({ error: `Status tujuan tidak dikenal: ${status}` }, { status: 400 });
    }

    /*
     * Seluruh keputusan dijalankan dalam satu transaksi dengan baris terkunci.
     *
     * Dua hal yang dulu tidak ada di sini, dan keduanya menyangkut koin sungguhan:
     *
     * 1. Tidak ada pemeriksaan status asal. Menolak permintaan yang SUDAH
     *    ditolak akan menjalankan `coins = coins + points_spent` sekali lagi —
     *    satu tombol yang diklik dua kali mencetak koin dari udara.
     * 2. Tidak ada pemeriksaan izin. `reviewerId` hanya ditulis ke kolom, tidak
     *    pernah diperiksa, jadi karyawan bisa menyetujui penukarannya sendiri.
     *
     * `FOR UPDATE` menahan baris sampai transaksi selesai, sehingga dua
     * permintaan yang datang bersamaan berbaris — bukan sama-sama membaca
     * status lama lalu sama-sama mengembalikan koin.
     */
    const outcome = await db.transaction(async (conn) => {
      const [lockedRows] = await conn.execute(
        `SELECT r.user_id, r.points_spent, r.reward_id, r.status, rew.title AS reward_title
           FROM reward_redemptions r
           JOIN rewards rew ON r.reward_id = rew.id
          WHERE r.id = ? FOR UPDATE`,
        [redemptionId]
      );

      const redemption = (lockedRows as any[])[0];
      if (!redemption) {
        return { error: 'Redemption not found', code: 404 as const };
      }

      const from = String(redemption.status || 'pending_hr');
      const allowed = ALLOWED_TRANSITIONS[from] || [];

      if (!allowed.includes(status)) {
        return {
          error: allowed.length === 0
            ? `Permintaan ini sudah selesai (${from}) dan tidak bisa diubah lagi.`
            : `Tidak bisa mengubah dari ${from} ke ${status}.`,
          code: 409 as const,
        };
      }

      const auth = await authorizeRedemptionReview(verifiedReviewerId, String(redemption.user_id), from);
      if (!auth.ok) {
        return { error: auth.error, code: (auth.status || 403) as 403 };
      }

      // Penolakan mengembalikan koin dan stok. Aman diulang karena transisi di
      // atas hanya mengizinkannya sekali: `rejected` tidak punya lanjutan.
      if (status === 'rejected') {
        await conn.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [
          redemption.points_spent,
          redemption.user_id,
        ]);
        await conn.execute('UPDATE rewards SET stock = stock + 1 WHERE id = ?', [
          redemption.reward_id,
        ]);
      }

      await conn.execute(
        `UPDATE reward_redemptions
            SET status = ?, proof_link = ?, reviewer_notes = ?, reviewed_by = ?
          WHERE id = ?`,
        [status, proofLink || null, reviewerNotes || null, verifiedReviewerId, redemptionId]
      );

      return { redemption };
    });

    if ('error' in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.code });
    }

    const redemption = outcome.redemption;

    // Kabari karyawan setiap kali statusnya berpindah. Dedupe dimatikan dengan
    // alasan yang sama seperti di POST: dua penukaran reward yang sama
    // menghasilkan kalimat yang identik, dan yang kedua tidak boleh hilang.
    if (status === 'fulfilled') {
      await dispatchNotification(redemption.user_id, 'success', {
        title: '🎉 Reward Sudah Dikirim!',
        message: `Reward "${redemption.reward_title}" sudah diproses. ${proofLink ? 'Cek bukti di riwayat penukaran kamu.' : ''}`
      }, { dedupeWindowMinutes: 0 });
    } else if (status === 'rejected') {
      await dispatchNotification(redemption.user_id, 'warning', {
        title: '⚠️ Permintaan Reward Ditolak',
        message: `Permintaan "${redemption.reward_title}" ditolak. Alasan: ${reviewerNotes}. Poin ${redemption.points_spent} sudah dikembalikan.`
      }, { dedupeWindowMinutes: 0 });
    } else if (status === 'pending_hr') {
      // Manajer meneruskan ke HR: karyawan diberi tahu, dan HR ikut diberi tahu
      // — tanpa ini permintaan berpindah ke antrean HR tanpa seorang pun sadar.
      await dispatchNotification(redemption.user_id, 'info', {
        title: '✅ Disetujui Manager',
        message: `Permintaan "${redemption.reward_title}" disetujui manager. Menunggu proses HR.`
      }, { dedupeWindowMinutes: 0 });

      const hrRes = await db.execute({
        sql: "SELECT id FROM users WHERE role = 'hr' OR hr_access = 1"
      });
      for (const hr of hrRes.rows) {
        await dispatchNotification(hr.id as string, 'hr_alert', {
          title: '🎁 Reward Diteruskan Manager',
          message: `Permintaan "${redemption.reward_title}" sudah disetujui manager dan menunggu proses HR.`
        }, { dedupeWindowMinutes: 0 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Redemption PATCH error:", error);
    return NextResponse.json({ error: 'Failed to update redemption' }, { status: 500 });
  }
}
