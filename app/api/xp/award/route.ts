import { NextResponse } from "next/server";
import { getAuthUserId, isInternalRequest } from "@/lib/authSession";
import { awardPoints, reversePoints, resolveAction, quotaStatus } from "@/lib/points";

/**
 * Pintu HTTP untuk pemberian poin dari klien.
 *
 * Seluruh aturan ekonominya ada di `lib/points.ts` — file ini hanya
 * menerjemahkan permintaan HTTP ke sana, lalu memastikan pemanggilnya berhak.
 *
 * Kode yang jalan di server (route lain, cron) harus memanggil `awardPoints()`
 * LANGSUNG, bukan lewat fetch ke endpoint ini. Pemanggilan lewat HTTP internal
 * pernah membuat apresiasi tidak pernah berjalan sama sekali karena salah nama
 * field, dan kegagalannya diam-diam tertelan `catch`.
 */

/**
 * Aksi yang TIDAK BOLEH diberikan dari klien.
 *
 * Poin sesi fokus dan coworking dihitung server dari menit yang benar-benar
 * terbukti (lihat lib/focusRoom.ts) lalu dibayar sekali lewat lib/points.ts
 * dengan kunci idempoten `focus:<roomId>`. Membiarkan endpoint ini menerimanya
 * berarti membuka kembali jalur "panggil /api/xp/award langsung dan dapat poin
 * gratis" yang persis ingin ditutup.
 */
const SERVER_SETTLED_ACTIONS = new Set(["focus_session", "coworking_session"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      actionType,
      action: actionAlias,
      refId,
      description,
      targetUserId,
      reverse,
    } = body;

    const action = actionType || actionAlias;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId dan actionType wajib diisi" },
        { status: 400 },
      );
    }

    // ── Siapa yang sebenarnya memanggil ──────────────────────────────
    // Panggilan dari browser WAJIB membawa cookie sesi, dan `userId` di body
    // harus cocok dengannya. Tanpa pemeriksaan ini, `userId` hanyalah usulan:
    // siapa pun bisa memberi poin ke akun siapa pun dari console browser.
    //
    // Panggilan internal antar-route (kudos, review task, update goal) tidak
    // membawa cookie, jadi dikenali lewat token internal.
    const internal = isInternalRequest(request);
    if (!internal) {
      const sessionUserId = getAuthUserId(request);
      if (!sessionUserId) {
        return NextResponse.json(
          { error: "Sesi kamu sudah tidak berlaku. Silakan login ulang.", needsReauth: true },
          { status: 401 }
        );
      }
      if (String(sessionUserId) !== String(userId)) {
        return NextResponse.json({ error: "Identitas tidak cocok dengan sesi." }, { status: 403 });
      }
    }

    // Poin sesi fokus dihitung server dari menit yang terbukti, lalu dibayar
    // lewat lib/points.ts saat sesi diselesaikan. Klien tidak punya urusan di
    // sini sama sekali.
    if (SERVER_SETTLED_ACTIONS.has(action)) {
      return NextResponse.json(
        {
          error:
            "Poin sesi fokus dihitung otomatis oleh server saat sesi selesai, bukan dari aplikasi.",
        },
        { status: 400 }
      );
    }

    // Hanya panggilan internal yang boleh memberi poin ke orang lain. Dari
    // browser, penerima selalu diri sendiri — apresiasi dibayarkan oleh
    // app/api/kudos, bukan oleh klien penerimanya.
    const recipientId = internal ? (targetUserId || userId) : userId;

    // ── Pembatalan ──
    // Nilai pembalikan diambil dari baris ledger aslinya, bukan dari klien, dan
    // ditulis sebagai baris negatif baru. Baris `earn` tetap ada, jadi aksi yang
    // sama tidak akan pernah dibayar lagi setelah diulang.
    if (reverse) {
      if (!refId) {
        return NextResponse.json(
          { error: "refId wajib diisi untuk pembatalan" },
          { status: 400 },
        );
      }
      const result = await reversePoints({
        userId: recipientId,
        action,
        refId,
        reason: description,
      });
      return NextResponse.json({
        success: result.success,
        status: "reversed",
        awarded: -result.reversed,
        reversed: result.reversed,
        newTotal: result.newTotal,
        newCoins: result.newCoins,
        recipientId,
      });
    }

    // Nilai poin TIDAK PERNAH diambil dari klien. Sebelumnya `customAmount`
    // dipakai apa adanya untuk daily_challenge — dan daily_challenge kebetulan
    // dikecualikan dari cap, sehingga siapa pun bisa mengirim angka berapa pun
    // lewat console browser dan menambah poin tanpa batas.
    if (!resolveAction(action)) {
      return NextResponse.json(
        { error: `Aksi tidak dikenal: ${action}` },
        { status: 400 },
      );
    }

    const result = await awardPoints({
      userId: recipientId,
      action,
      refId,
      description,
    });

    return NextResponse.json({ ...result, recipientId });
  } catch (error) {
    console.error("[xp/award] Gagal memberi poin:", error);
    return NextResponse.json({ error: "Gagal memproses poin" }, { status: 500 });
  }
}

/**
 * Status kuota hari ini — untuk penghitung hidup di widget ("Task hari ini 3/5").
 *
 * Sengaja per-aksi dan tanpa total. Plafon harian tidak pernah dikirim ke klien:
 * kuota ditampilkan di tempat aksinya dikerjakan sebagai dorongan, bukan sebagai
 * tabel spesifikasi yang mengundang orang menghitung cara memerahnya.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const actions = (searchParams.get("actions") || "").split(",").filter(Boolean);

    if (!userId || actions.length === 0) {
      return NextResponse.json({ error: "userId dan actions wajib diisi" }, { status: 400 });
    }

    const sessionUserId = getAuthUserId(request);
    if (!sessionUserId || String(sessionUserId) !== String(userId)) {
      return NextResponse.json({ error: "Identitas tidak cocok dengan sesi." }, { status: 403 });
    }

    return NextResponse.json({ quota: await quotaStatus(userId, actions) });
  } catch (error) {
    console.error("[xp/award] Gagal membaca kuota:", error);
    return NextResponse.json({ error: "Gagal membaca kuota" }, { status: 500 });
  }
}
