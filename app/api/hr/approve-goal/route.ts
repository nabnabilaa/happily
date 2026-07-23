import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequesterAccess, canManageTeam } from "@/lib/hrAuth";

export async function POST(req: Request) {
  try {
    const { goalId, status, requesterId } = await req.json();

    if (!goalId || !status || !requesterId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if requester can manage team (manager, hr, atau hr_access)
    const requester = await getRequesterAccess(requesterId);
    if (!canManageTeam(requester.role, requester.hrAccess)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update goal status
    await db.execute({
      sql: "UPDATE goals SET status = ? WHERE id = ?",
      args: [status, goalId]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve Goal Error:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}
