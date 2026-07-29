import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/authSession";
import { awardPoints } from "@/lib/points";
import { claimedToday, missionsFor, nudgeRefId, NUDGE_MISSIONS } from "@/lib/nudges";
import { wibDateString } from "@/lib/timeUtils";

/**
 * Nudge harian: daftar misi hari ini beserta statusnya.
 *
 * Pemilihan misi, pemeriksaan selesai, dan daftar klaim semuanya di server.
 * Sebelumnya ketiganya di browser — sehingga membersihkan localStorage cukup
 * untuk mengklaim ulang seluruh misi hari itu.
 */
export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak berlaku.", needsReauth: true }, { status: 401 });
    }

    const today = wibDateString();
    const missions = missionsFor(userId, today);
    const claimed = await claimedToday(userId, today);

    const out = await Promise.all(
      missions.map(async (m) => ({
        id: m.id,
        title: m.title,
        desc: m.desc,
        glyph: m.glyph,
        actionLabel: m.actionLabel,
        target: m.target,
        done: await m.verify(userId),
        claimed: claimed.has(m.id),
      })),
    );

    return NextResponse.json({ missions: out, date: today });
  } catch (error) {
    console.error("[nudges] Gagal memuat misi:", error);
    return NextResponse.json({ error: "Gagal memuat misi" }, { status: 500 });
  }
}

/**
 * Klaim satu misi.
 *
 * Tiga hal diperiksa sebelum membayar, dan ketiganya wajib: misinya memang
 * ditugaskan ke orang ini hari ini, misinya benar-benar sudah dikerjakan, dan
 * belum pernah diklaim. Nilai poinnya dari registry, tidak pernah dari klien.
 */
export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak berlaku.", needsReauth: true }, { status: 401 });
    }

    const { missionId } = await request.json();
    if (!missionId) {
      return NextResponse.json({ error: "missionId wajib diisi" }, { status: 400 });
    }

    const today = wibDateString();

    // Harus salah satu misi yang benar-benar ditugaskan hari ini — bukan misi
    // termudah yang dipilih sendiri oleh klien.
    const assigned = missionsFor(userId, today).some((m) => m.id === missionId);
    if (!assigned) {
      return NextResponse.json({ error: "Misi ini tidak sedang ditugaskan hari ini." }, { status: 400 });
    }

    const mission = NUDGE_MISSIONS.find((m) => m.id === missionId);
    if (!mission) {
      return NextResponse.json({ error: "Misi tidak dikenal." }, { status: 400 });
    }

    if (!(await mission.verify(userId))) {
      return NextResponse.json(
        { error: "Misi ini belum selesai.", done: false },
        { status: 409 },
      );
    }

    // Kunci `nudge:<misi>:<tanggal>` menutup klaim ganda, termasuk dari
    // perangkat lain atau setelah localStorage dibersihkan.
    const result = await awardPoints({
      userId,
      action: "nudge_daily",
      refId: nudgeRefId(missionId, today),
      description: `Misi: ${mission.title}`,
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      awarded: result.awarded,
      newTotal: result.newTotal,
      newCoins: result.newCoins,
      message: result.message,
    });
  } catch (error) {
    console.error("[nudges] Gagal klaim misi:", error);
    return NextResponse.json({ error: "Gagal klaim misi" }, { status: 500 });
  }
}
