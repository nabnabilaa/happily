import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/pushService";
import { requireSelfOrHrAdmin } from "@/lib/apiAuth";

export async function POST(request: Request) {
  try {
    const { userId, title, body, url } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    // Tes menembus sesi fokus. Kalau tidak, orang yang sedang fokus akan
    // menekan "tes notifikasi", tidak melihat apa pun, dan menyimpulkan
    // push-nya rusak.
    await sendPushNotification(
      userId,
      title || "🐝 Flowbee Test Push",
      body || "Halo! Ini adalah notifikasi push uji coba dari Bee Flow.",
      url || "/",
      { bypassFocus: true }
    );

    return NextResponse.json({ success: true, message: "Push trigger requested" });
  } catch (error: any) {
    console.error("Test Push Error:", error);
    return NextResponse.json({ error: "Gagal mengirim notifikasi push uji coba", details: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

    // Identitas dari cookie sesi. Kirim uji push hanya ke perangkat sendiri.
    const access = await requireSelfOrHrAdmin(request, userId);
    if ("response" in access) return access.response;
  const title = searchParams.get("title");
  const body = searchParams.get("body");
  const url = searchParams.get("url");

  if (!userId) {
    return NextResponse.json({ error: "Parameter userId wajib diisi" }, { status: 400 });
  }

  try {
    await sendPushNotification(
      userId,
      title || "🐝 Flowbee Test Push (GET)",
      body || "Notifikasi push uji coba dari URL parameter.",
      url || "/",
      { bypassFocus: true }
    );
    return NextResponse.json({ success: true, message: "Push trigger requested" });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal mengirim push", details: error.message }, { status: 500 });
  }
}
