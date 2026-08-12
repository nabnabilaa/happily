import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sqlWibDate, SQL_WIB_TODAY } from "@/lib/timeUtils";
import { awardPoints, refFor } from "@/lib/points";
import { requireSelfOrHrAdmin } from "@/lib/apiAuth";

/**
 * Bonus "Andalan Tim": +50 kalau bulan ini kamu menerima apresiasi pada 10 hari
 * berbeda.
 *
 * Dasarnya sengaja KONSISTENSI, bukan keluasan. Versi sebelumnya memakai
 * "≥5 orang berbeda dalam seminggu", dan itu mustahil dicapai orang di tim 4
 * orang — plafonnya lagi-lagi ditentukan besar tim. Jumlah hari bisa dicapai
 * siapa pun lewat waktu, berapa pun ukuran timnya.
 *
 * Kuncinya per bulan, jadi bonusnya berulang tiap bulan tapi tidak bisa dobel.
 */
async function checkAndalanTim(receiverId: string) {
  const res = await db.execute({
    sql: `SELECT COUNT(DISTINCT ${sqlWibDate('created_at')}) AS hari
            FROM kudos
           WHERE receiver_id = ?
             AND YEAR(CONVERT_TZ(created_at, '+00:00', '+07:00')) = YEAR(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))
             AND MONTH(CONVERT_TZ(created_at, '+00:00', '+07:00')) = MONTH(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))`,
    args: [receiverId],
  });

  if ((Number(res.rows[0]?.hari) || 0) < 10) return;

  const period = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7);
  const result = await awardPoints({
    userId: receiverId,
    action: 'andalan_tim',
    refId: refFor.monthly(period),
    description: '🤝 Andalan Tim bulan ini!',
  });

  if (result.status === 'awarded') {
    await db.execute({
      sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
      args: [
        "n_andalan_" + Date.now().toString(36),
        receiverId,
        '🤝 Andalan Tim!',
        `Bulan ini kamu diapresiasi di 10 hari berbeda. Bonus +${result.awarded} Poin!`,
        'success',
      ],
    });
  }
}

export async function POST(request: Request) {
  try {
    const { senderId, receiverId, senderName, receiverName, valueTag, message } = await request.json();

    // Pengirim apresiasi dipastikan dari cookie: `senderId` dari body berarti
    // siapa pun bisa memuji atas nama orang lain sekaligus menghabiskan
    // kuota harian (5 penerima unik) milik orang itu.
    const access = await requireSelfOrHrAdmin(request, senderId);
    if ("response" in access) return access.response;

    if (!senderId || !receiverId || !message) {
      return NextResponse.json({ error: "senderId, receiverId, dan message wajib diisi" }, { status: 400 });
    }

    // Anti-abuse 1: Tidak bisa kirim ke diri sendiri
    if (senderId === receiverId) {
      return NextResponse.json({ error: "Tidak bisa mengirim apresiasi ke diri sendiri" }, { status: 400 });
    }

    // Anti-abuse 2: Max 3 apresiasi per hari.
    // Kuotanya reset tengah malam WIB. Dulu batasnya dihitung dari tanggal UTC,
    // jadi di server Vercel kuota baru reset jam 07:00 WIB.
    const countRes = await db.execute({
      sql: `SELECT COUNT(*) as c FROM kudos
            WHERE sender_id = ? AND ${sqlWibDate('created_at')} = ${SQL_WIB_TODAY}`,
      args: [senderId]
    });
    const countToday = Number(countRes.rows[0]?.c) || 0;
    if (countToday >= 3) {
      return NextResponse.json({ error: "Maksimal 3 apresiasi per hari. Coba lagi besok!" }, { status: 429 });
    }

    // Anti-abuse 3: Cooldown 24 jam per penerima.
    //
    // Dulu 7 hari, dan itu diam-diam menghukum tim kecil: kalau timmu 5 orang,
    // plafon apresiasi yang bisa kamu terima cuma 4 per minggu selamanya —
    // sementara orang di divisi 50 orang bisa dapat berkali lipat untuk
    // perilaku yang sama persis. Plafonnya jadi ditentukan headcount, bukan
    // seberapa membantu orangnya.
    //
    // Sekarang remnya dipindah: cooldown cukup 24 jam supaya tim kecil bisa
    // saling mengapresiasi lagi keesokan harinya, dan plafon penerima dijaga
    // di lib/points.ts (5 pengirim unik/hari). Nilainya kecil (8 poin), jadi
    // yang membuat totalnya besar adalah banyaknya orang berbeda yang terbantu.
    const recentRes = await db.execute({
      sql: "SELECT id FROM kudos WHERE sender_id = ? AND receiver_id = ? AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)",
      args: [senderId, receiverId]
    });
    if (recentRes.rows.length > 0) {
      return NextResponse.json({ error: "Kamu sudah kirim apresiasi ke orang ini hari ini" }, { status: 429 });
    }

    // Insert kudos
    const kudosId = "kd_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    await db.execute({
      sql: "INSERT INTO kudos (id, sender_id, receiver_id, value_tag, message) VALUES (?, ?, ?, ?, ?)",
      args: [kudosId, senderId, receiverId, valueTag || null, message]
    });

    /*
     * Catatan aktivitas untuk PENGIRIM.
     *
     * Dulu baris ini menulis ke tabel `logbook` dengan kolom `target_id`/`note`
     * — tabel itu tidak pernah ada di basis data ini, jadi INSERT-nya selalu
     * gagal dan `catch` di bawah menelannya. Nama tabel yang benar
     * `logbook_entries`, dan bentuk kolomnya berbeda.
     *
     * Komentar lama menyebut tulisan ini dipakai misi "Tebar Kebaikan". Itu
     * sudah tidak benar: `lib/nudges.ts:108` memverifikasi langsung dari tabel
     * `kudos`. Jadi yang tersisa di sini murni jejak aktivitas si pengirim, dan
     * itulah alasannya tetap ditulis — bukan syarat misi.
     *
     * `id` dilepas ke AUTO_INCREMENT, sama seperti penulis logbook lainnya.
     */
    try {
      await db.execute({
        sql: `INSERT INTO logbook_entries (user_id, type, title, content, metadata_json)
              VALUES (?, 'kudos_sent', ?, ?, ?)`,
        args: [
          senderId,
          `🌟 Apresiasi untuk ${receiverName || 'rekan'}`,
          message,
          JSON.stringify({ receiverId, valueTag: valueTag || null, kudosId }),
        ]
      });
    } catch(e) {
      console.warn("Failed to create logbook for kudos_sent:", e);
    }

    // ── Poin untuk PENERIMA ──────────────────────────────────────────
    // Dipanggil langsung, bukan lewat fetch ke /api/xp/award. Versi lama
    // mengirim field bernama `action` sementara endpoint membaca `actionType`,
    // jadi permintaannya selalu dijawab 400 — dan karena kegagalannya tertelan
    // `catch`, apresiasi tidak pernah memberi poin sama sekali tanpa ada yang
    // menyadarinya. Panggilan langsung membuat salah nama seperti itu ketahuan
    // saat type-check, bukan diam-diam di produksi.
    //
    // Pengirim sengaja tidak dapat poin: kalau mengirim apresiasi dibayar,
    // orang akan menembak nama acak demi poin dan penerima berhenti percaya
    // apresiasinya tulus. Dorongan untuk mengirim ada di nudge harian.
    try {
      await awardPoints({
        userId: receiverId,
        action: 'apresiasi_received',
        refId: refFor.kudos(kudosId),
        description: `Apresiasi dari ${senderName || 'rekan'}`,
      });
      await checkAndalanTim(receiverId);
    } catch (e) {
      console.warn("Gagal memberi poin apresiasi:", e);
    }

    // Create notification for receiver
    const notifId = "n_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    try {
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [notifId, receiverId, `🌱 ${senderName || 'Seseorang'} mengirim apresiasi`, message, 'success']
      });
    } catch (e) {
      console.warn("Failed to create notification:", e);
    }

    return NextResponse.json({ 
      success: true, 
      kudosId,
      message: "Apresiasi terkirim!",
      remaining: 3 - countToday - 1
    });
  } catch (error: any) {
    console.error("Kudos Error:", error);
    return NextResponse.json({ error: "Gagal mengirim apresiasi", details: error.message }, { status: 500 });
  }
}

// GET: Fetch kudos feed
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit') || '20';

    let sql = `SELECT k.*, 
               s.name as sender_name, s.avatar_image as sender_avatar,
               r.name as receiver_name, r.avatar_image as receiver_avatar
               FROM kudos k 
               JOIN users s ON k.sender_id = s.id 
               JOIN users r ON k.receiver_id = r.id 
               ORDER BY k.created_at DESC LIMIT ?`;
    let args: any[] = [Number(limit)];

    // If userId specified, get kudos involving that user
    if (userId) {
      sql = `SELECT k.*, 
             s.name as sender_name, s.avatar_image as sender_avatar,
             r.name as receiver_name, r.avatar_image as receiver_avatar
             FROM kudos k 
             JOIN users s ON k.sender_id = s.id 
             JOIN users r ON k.receiver_id = r.id 
             WHERE k.sender_id = ? OR k.receiver_id = ?
             ORDER BY k.created_at DESC LIMIT ?`;
      args = [userId, userId, Number(limit)];
    }

    const res = await db.execute({ sql, args });
    const feed = res.rows.map(r => ({
      id: r.id,
      from: r.sender_name,
      to: r.receiver_name,
      value: r.value_tag,
      msg: r.message,
      time: r.created_at,
      senderAvatar: r.sender_avatar,
      receiverAvatar: r.receiver_avatar,
    }));

    return NextResponse.json({ feed });
  } catch (error: any) {
    console.error("Kudos GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat feed", details: error.message }, { status: 500 });
  }
}

