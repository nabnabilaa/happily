import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/pushService";

export async function POST(request: Request) {
  try {
    const { userId, title, body, url } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    await sendPushNotification(
      userId,
      title || "🐝 Flowbee Test Push",
      body || "Halo! Ini adalah notifikasi push uji coba dari Bee Flow.",
      url || "/"
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
      url || "/"
    );
    return NextResponse.json({ success: true, message: "Push trigger requested" });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal mengirim push", details: error.message }, { status: 500 });
  }
}
