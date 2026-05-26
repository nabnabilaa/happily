import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Fetch KPIs (for manager or employee)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role'); // 'manager' or 'employee'
    const month = searchParams.get('month') || new Date().getMonth() + 1;
    const year = searchParams.get('year') || new Date().getFullYear();

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    let sql: string;
    let args: any[];

    if (['manager', 'hr', 'admin'].includes(role || '')) {
      // Manager/HR/Admin sees KPIs they assigned
      sql = `SELECT k.*, u.name as assignee_name 
             FROM monthly_kpis k 
             LEFT JOIN users u ON k.assigned_to = u.id
             WHERE k.assigned_by = ? AND k.month = ? AND k.year = ?
             ORDER BY k.created_at DESC`;
      args = [userId, Number(month), Number(year)];
    } else {
      // Employee sees KPIs assigned to them
      sql = `SELECT k.*, u.name as assigner_name 
             FROM monthly_kpis k 
             LEFT JOIN users u ON k.assigned_by = u.id
             WHERE k.assigned_to = ? AND k.month = ? AND k.year = ? AND k.status = 'active'
             ORDER BY k.weight DESC`;
      args = [userId, Number(month), Number(year)];
    }

    const res = await db.execute({ sql, args });
    const kpis = res.rows.map(r => ({
      id: r.id,
      title: r.title,
      targetDescription: r.target_description,
      weight: Number(r.weight),
      month: Number(r.month),
      year: Number(r.year),
      assignedTo: r.assigned_to,
      assignedBy: r.assigned_by,
      assigneeName: r.assignee_name || null,
      assignerName: r.assigner_name || null,
      status: r.status,
      finalScore: r.final_score,
      managerNotes: r.manager_notes,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ kpis });
  } catch (error: any) {
    console.error("KPI GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat KPI", details: error.message }, { status: 500 });
  }
}

// POST: Create new KPI
export async function POST(request: Request) {
  try {
    const { title, targetDescription, weight, month, year, assignedTo, assignedBy } = await request.json();

    if (!title || !assignedTo || !assignedBy) {
      return NextResponse.json({ error: "title, assignedTo, dan assignedBy wajib diisi" }, { status: 400 });
    }

    const id = "kpi_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    await db.execute({
      sql: `INSERT INTO monthly_kpis (id, title, target_description, weight, month, year, assigned_to, assigned_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, title, targetDescription || '', Number(weight) || 0, m, y, assignedTo, assignedBy]
    });

    // Create notification for employee
    const notifId = "n_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    try {
      const managerRes = await db.execute({ sql: "SELECT name FROM users WHERE id = ?", args: [assignedBy] });
      const managerName = managerRes.rows[0]?.name || 'Manager';
      
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [notifId, assignedTo, `🎯 KPI Baru dari ${managerName}`, `"${title}" — Bobot: ${weight}%`, 'action']
      });
    } catch (e) {
      console.warn("Failed to create KPI notification:", e);
    }

    return NextResponse.json({ success: true, kpiId: id });
  } catch (error: any) {
    console.error("KPI POST Error:", error);
    return NextResponse.json({ error: "Gagal membuat KPI", details: error.message }, { status: 500 });
  }
}

// PUT: Update KPI (finalize score, etc.)
export async function PUT(request: Request) {
  try {
    const { kpiId, finalScore, managerNotes, status } = await request.json();

    if (!kpiId) return NextResponse.json({ error: "kpiId required" }, { status: 400 });

    const updates: string[] = [];
    const args: any[] = [];

    if (finalScore !== undefined) { updates.push("final_score = ?"); args.push(finalScore); }
    if (managerNotes !== undefined) { updates.push("manager_notes = ?"); args.push(managerNotes); }
    if (status) { updates.push("status = ?"); args.push(status); }

    if (updates.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    args.push(kpiId);
    await db.execute({
      sql: `UPDATE monthly_kpis SET ${updates.join(', ')} WHERE id = ?`,
      args
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("KPI PUT Error:", error);
    return NextResponse.json({ error: "Gagal update KPI", details: error.message }, { status: 500 });
  }
}

// DELETE: Remove KPI
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kpiId = searchParams.get('id');
    if (!kpiId) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db.execute({ sql: "DELETE FROM monthly_kpis WHERE id = ?", args: [kpiId] });
    await db.execute({ sql: "DELETE FROM task_kpi_links WHERE kpi_id = ?", args: [kpiId] });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("KPI DELETE Error:", error);
    return NextResponse.json({ error: "Gagal hapus KPI", details: error.message }, { status: 500 });
  }
}

