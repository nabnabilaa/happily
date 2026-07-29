import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/authSession";

/**
 * Dipakai klien untuk membedakan "login masih sah" dari "hanya ada sisa
 * localStorage". User yang login sebelum lapisan sesi ini ada tidak punya
 * cookie, jadi fitur yang butuh otorisasi akan menolaknya — dan UI perlu tahu
 * itu supaya bisa meminta login ulang alih-alih menampilkan error misterius.
 */
export async function GET(request: Request) {
  const userId = getAuthUserId(request);
  return NextResponse.json({ userId, authenticated: Boolean(userId) });
}
