import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/authSession";
import {
  exchangeCodeForTokens,
  decodeIdToken,
  saveIntegration,
  getIntegration,
  disconnectIntegration,
  googleOAuthConfigured,
} from "@/lib/googleCalendar";

/**
 * Status, penyambungan, dan pemutusan integrasi Google Calendar.
 *
 * Identitas diambil dari cookie sesi, bukan dari body. Refresh token Google
 * adalah kredensial jangka panjang ke kalender pribadi seseorang; membiarkan
 * `userId` di body menentukan pemiliknya berarti siapa pun bisa menempelkan
 * kalendernya ke akun orang lain — atau memutus milik orang lain.
 */

// GET: apakah kalender user ini sudah tersambung?
export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!googleOAuthConfigured()) {
      return NextResponse.json({
        connected: false,
        available: false,
        reason: "GOOGLE_CLIENT_SECRET belum diatur di server.",
      });
    }

    const integration = await getIntegration(userId);
    if (!integration) {
      return NextResponse.json({ connected: false, available: true });
    }

    const row = await db.execute({
      sql: `SELECT last_synced_at, error_message FROM google_integrations WHERE user_id = ?`,
      args: [userId],
    });

    return NextResponse.json({
      connected: true,
      available: true,
      // 'needs_reconsent' berarti token ditolak Google (izin dicabut, atau
      // consent screen masih berstatus Testing sehingga refresh token mati
      // tiap 7 hari). UI memakainya untuk meminta izin ulang, bukan diam.
      needsReconsent: integration.status === "needs_reconsent",
      googleEmail: integration.googleEmail,
      lastSyncedAt: row.rows[0]?.last_synced_at || null,
      errorMessage: row.rows[0]?.error_message || null,
    });
  } catch (error: any) {
    console.error("Google Calendar status error:", error);
    return NextResponse.json({ error: "Gagal membaca status integrasi" }, { status: 500 });
  }
}

// POST: tukar authorization code jadi izin permanen.
// Dipakai user yang login sebelum fitur ini ada, atau yang masuk lewat One Tap.
export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: "Authorization code wajib diisi" }, { status: 400 });

    const tokens = await exchangeCodeForTokens(code);

    // Google hanya mengirim refresh token pada otorisasi pertama sebuah akun
    // untuk client ini. Kalau ia tidak datang DAN kita juga belum menyimpannya,
    // yang tersisa cuma access token berumur satu jam — persis masalah yang
    // fitur ini dibuat untuk menghapus. Menyimpannya diam-diam akan membuat
    // integrasi tampak sehat hari ini lalu mati besok tanpa penjelasan.
    const existing = await getIntegration(userId);
    if (!tokens.refresh_token && !existing) {
      return NextResponse.json(
        {
          error:
            "Google tidak memberikan izin permanen karena akun ini sudah pernah menyetujui Flowbee. " +
            "Buka myaccount.google.com/permissions, hapus akses Flowbee, lalu sambungkan lagi.",
        },
        { status: 400 }
      );
    }

    const googleEmail = tokens.id_token ? decodeIdToken(tokens.id_token)?.email ?? null : null;
    await saveIntegration(userId, tokens, googleEmail);

    return NextResponse.json({ success: true, googleEmail });
  } catch (error: any) {
    console.error("Google Calendar connect error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal menghubungkan Google Calendar" },
      { status: 500 }
    );
  }
}

// DELETE: putuskan integrasi dan cabut izin di sisi Google.
export async function DELETE(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await disconnectIntegration(userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Google Calendar disconnect error:", error);
    return NextResponse.json({ error: "Gagal memutuskan Google Calendar" }, { status: 500 });
  }
}
