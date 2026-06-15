import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const period = request.nextUrl.searchParams.get("period") || "2026-Q3";

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Get user info
    const userRes = await db.execute("SELECT id, role, division_id FROM users WHERE id = ?", [userId]);
    const user = userRes.rows[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let okrs: any[] = [];

    if (user.role === "hr") {
      // HR sees ALL OKRs
      const res = await db.execute(
        `SELECT o.*, u.name as owner_name, c.name as creator_name, d.name as division_name
         FROM okrs o
         LEFT JOIN users u ON o.owner_id = u.id
         LEFT JOIN users c ON o.created_by = c.id
         LEFT JOIN departments d ON o.division_id = d.id
         WHERE o.period = ?
         ORDER BY FIELD(o.type, 'company', 'team', 'individual'), o.created_at DESC`,
        [period]
      );
      okrs = res.rows;
    } else if (user.role === "manager") {
      // Manager sees: Company OKRs + Team OKRs for own division + Individual OKRs (own + employees in division)
      const res = await db.execute(
        `SELECT o.*, u.name as owner_name, c.name as creator_name, d.name as division_name
         FROM okrs o
         LEFT JOIN users u ON o.owner_id = u.id
         LEFT JOIN users c ON o.created_by = c.id
         LEFT JOIN departments d ON o.division_id = d.id
         WHERE o.period = ? AND (
           o.type = 'company'
           OR (o.type = 'team' AND o.division_id = ?)
           OR (o.type = 'individual' AND o.owner_id = ?)
           OR (o.type = 'individual' AND o.owner_id IN (SELECT id FROM users WHERE division_id = ? AND role = 'employee'))
         )
         ORDER BY FIELD(o.type, 'company', 'team', 'individual'), o.created_at DESC`,
        [period, user.division_id, userId, user.division_id]
      );
      okrs = res.rows;
    } else {
      // Employee sees: Company OKRs + Team OKR for own division + own Individual OKR
      const res = await db.execute(
        `SELECT o.*, u.name as owner_name, c.name as creator_name, d.name as division_name
         FROM okrs o
         LEFT JOIN users u ON o.owner_id = u.id
         LEFT JOIN users c ON o.created_by = c.id
         LEFT JOIN departments d ON o.division_id = d.id
         WHERE o.period = ? AND (
           o.type = 'company'
           OR (o.type = 'team' AND o.division_id = ?)
           OR (o.type = 'individual' AND o.owner_id = ?)
         )
         ORDER BY FIELD(o.type, 'company', 'team', 'individual'), o.created_at DESC`,
        [period, user.division_id, userId]
      );
      okrs = res.rows;
    }

    // Fetch key results + tasks for each OKR
    for (const okr of okrs) {
      const krRes = await db.execute(
        "SELECT * FROM key_results WHERE okr_id = ? ORDER BY created_at",
        [okr.id]
      );
      okr.key_results = krRes.rows;

      // Fetch tasks for each KR
      for (const kr of okr.key_results) {
        const taskRes = await db.execute(
          `SELECT t.*, a.name as assignee_name, c.name as creator_name
           FROM okr_tasks t
           LEFT JOIN users a ON t.assignee_id = a.id
           LEFT JOIN users c ON t.created_by = c.id
           WHERE t.key_result_id = ?
           ORDER BY t.created_at`,
          [kr.id]
        );
        kr.tasks = taskRes.rows;
      }

      // Calculate overall OKR progress
      if (okr.key_results.length > 0) {
        const totalProgress = okr.key_results.reduce((sum: number, kr: any) => {
          const progress = kr.target_value > 0 ? Math.min(100, (kr.current_value / kr.target_value) * 100) : 0;
          return sum + progress;
        }, 0);
        okr.progress = Math.round(totalProgress / okr.key_results.length);
      } else {
        okr.progress = 0;
      }
    }

    return NextResponse.json({ okrs, period });
  } catch (error: any) {
    console.error("OKR List Error:", error);
    return NextResponse.json({ error: "Failed to load OKRs", details: error.message }, { status: 500 });
  }
}
