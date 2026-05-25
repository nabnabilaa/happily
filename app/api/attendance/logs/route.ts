import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const targetUserId = searchParams.get("targetUserId"); // For HR viewing a specific employee
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!userId) {
      return NextResponse.json({ error: "UserId required" }, { status: 400 });
    }

    // Check role
    const userCheck = await db.execute({
      sql: "SELECT role FROM users WHERE id = ?",
      args: [userId]
    });
    const role = userCheck.rows[0]?.role;

    let query = "";
    let args: any[] = [];

    // Build date filter
    let dateFilter = "";
    if (month && year) {
      dateFilter = ` AND MONTH(a.check_in_at) = ? AND YEAR(a.check_in_at) = ?`;
    }

    if (role === 'hr' || role === 'manager') {
      if (targetUserId) {
        // HR/Manager viewing specific employee
        query = `
          SELECT a.*, u.name as user_name, u.email as user_email, u.department as user_department
          FROM attendance a 
          JOIN users u ON a.user_id = u.id 
          WHERE a.user_id = ?${dateFilter}
          ORDER BY a.check_in_at DESC
        `;
        args = [targetUserId];
        if (month && year) args.push(Number(month), Number(year));
      } else {
        // HR/Manager see all — only within 1 year retention
        query = `
          SELECT a.*, u.name as user_name, u.email as user_email, u.department as user_department
          FROM attendance a 
          JOIN users u ON a.user_id = u.id 
          WHERE a.check_in_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)${dateFilter}
          ORDER BY a.check_in_at DESC
        `;
        args = [];
        if (month && year) args.push(Number(month), Number(year));
      }
    } else {
      // Regular employees see only own logs (1 year retention)
      query = `
        SELECT a.*, u.name as user_name, u.email as user_email
        FROM attendance a 
        JOIN users u ON a.user_id = u.id 
        WHERE a.user_id = ? AND a.check_in_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)${dateFilter}
        ORDER BY a.check_in_at DESC
      `;
      args = [userId];
      if (month && year) args.push(Number(month), Number(year));
    }

    const res = await db.execute({ sql: query, args });
    return NextResponse.json(
      { logs: res.rows },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error("Attendance Logs Error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

