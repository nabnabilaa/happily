import { NextResponse } from "next/server";
import { clearedSessionCookieOptions } from "@/lib/authSession";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({ ...clearedSessionCookieOptions(), value: "" });
  return response;
}
