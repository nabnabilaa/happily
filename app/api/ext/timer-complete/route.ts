import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { awardPoints } from "@/lib/points";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

// POST: Record a completed focus session from extension
export async function POST(request: Request) {
  try {
    const { userId, durationMinutes, label } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const mins = Number(durationMinutes) || 25;

    // Poin sesi fokus dari ekstensi.
    //
    // Dulu blok ini menulis poin langsung ke DB — melewati kuota harian, dan
    // memakai `coins = points + 20` yang menyamakan saldo koin dengan total poin
    // seumur hidup, sehingga tiap sesi fokus mengembalikan seluruh koin yang
    // sudah ditukar hadiah.
    //
    // Kuncinya waktu selesai dibulatkan ke menit: kiriman ganda dari ekstensi
    // (retry, dobel klik) dedupe sendiri, sementara sesi yang benar-benar
    // terpisah selalu berjarak lebih dari semenit.
    const minuteKey = new Date().toISOString().slice(0, 16);
    const result = await awardPoints({
      userId,
      action: "focus_session",
      refId: `focus:ext:${minuteKey}`,
      description: `Sesi fokus ${mins} menit — ${label || 'Deep Work'}`,
    });

    return NextResponse.json(
      { success: true, xpAwarded: result.awarded },
      { headers: getCorsHeaders(request) }
    );
  } catch (error: any) {
    console.error("Timer Complete Error:", error);
    return NextResponse.json(
      { error: "Failed", details: error.message },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

