import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

export async function POST(request: Request) {
  try {
    // Migrate all admin users to hr
    const before = await db.execute("SELECT id, name, email, role FROM users WHERE role = 'admin'");
    
    if (before.rows.length === 0) {
      return NextResponse.json({ message: "No admin users found. Nothing to migrate.", migrated: 0 });
    }

    await db.execute("UPDATE users SET role = 'hr' WHERE role = 'admin'");

    const after = await db.execute("SELECT id, name, email, role FROM users WHERE role = 'admin'");

    return NextResponse.json({
      message: `Migrated ${before.rows.length} admin user(s) to HR`,
      migrated: before.rows.length,
      remainingAdmins: after.rows.length,
      users: before.rows.map(r => ({ id: r.id, name: r.name, email: r.email })),
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
