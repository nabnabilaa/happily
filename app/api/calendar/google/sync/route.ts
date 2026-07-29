import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/authSession";
import { syncUserCalendar, googleOAuthConfigured } from "@/lib/googleCalendar";
import { hpEventEmitter } from "@/lib/events";

// POST: jalankan sinkronisasi dua arah untuk user yang sedang login.
// Dipanggil otomatis saat layar Kalender dibuka — bukan lewat tombol.
export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!googleOAuthConfigured()) {
      return NextResponse.json({ status: "not_connected", pulled: 0, pushed: 0, updated: 0, deleted: 0 });
    }

    const result = await syncUserCalendar(userId);

    // Beri tahu layar lain hanya kalau ada yang benar-benar berubah; sinkronisasi
    // kosong terjadi tiap kali tab dibuka dan tidak perlu memicu refetch.
    if (result.pulled || result.updated || result.deleted) {
      hpEventEmitter.emit("db_update", { type: "refresh", targetUserId: userId, timestamp: Date.now() });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Google Calendar sync error:", error);
    return NextResponse.json(
      { status: "error", message: error?.message || "Sinkronisasi gagal" },
      { status: 500 }
    );
  }
}
