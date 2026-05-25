import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Group all users by their department
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get("requesterId");

    // Verify requester is HR
    if (requesterId) {
      const check = await db.execute({
        sql: "SELECT role FROM users WHERE id = ?",
        args: [requesterId]
      });
      if (check.rows.length === 0 || !['hr', 'manager'].includes(String((check.rows[0] as any).role))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Get all users grouped by department
    const usersRes = await db.execute(
      `SELECT id, name, email, role, job_title, department, manager_id, avatar_image, 
              points, level, streak, created_at
       FROM users ORDER BY department, name`
    );

    // Group by department
    const deptMap: Record<string, any[]> = {};
    for (const user of usersRes.rows as any[]) {
      const dept = user.department || 'Tidak Ada Departemen';
      if (!deptMap[dept]) deptMap[dept] = [];
      deptMap[dept].push(user);
    }

    // Convert to sorted array
    const departments = Object.entries(deptMap)
      .map(([name, users]) => ({
        name,
        headcount: users.length,
        users: users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          jobTitle: u.job_title,
          department: u.department,
          managerId: u.manager_id,
          avatarImage: u.avatar_image,
          points: u.points,
          level: u.level,
          streak: u.streak,
        }))
      }))
      .sort((a, b) => b.headcount - a.headcount);

    return NextResponse.json({ departments });
  } catch (error: any) {
    console.error("Users by Department Error:", error);
    return NextResponse.json({ error: "Failed", details: error.message }, { status: 500 });
  }
}

