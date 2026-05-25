import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ══════════════════════════════════════════════════════════════
// Manager Weekly Notes API — Spec v2
// Manager writes brief weekly assessment notes per employee
// ══════════════════════════════════════════════════════════════

// GET: Fetch weekly notes for employees
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId');
    const employeeId = searchParams.get('employeeId');
    const weekStart = searchParams.get('weekStart');

    if (!managerId && !employeeId) {
      return NextResponse.json({ error: "managerId or employeeId required" }, { status: 400 });
    }

    let sql: string;
    let args: any[];

    if (managerId) {
      // Manager fetches all notes they wrote
      sql = `SELECT n.*, u.name as employee_name 
             FROM manager_weekly_notes n 
             JOIN users u ON n.employee_id = u.id
             WHERE n.manager_id = ?`;
      args = [managerId];
      if (weekStart) {
        sql += ` AND n.week_start = ?`;
        args.push(weekStart);
      }
      sql += ` ORDER BY n.created_at DESC LIMIT 50`;
    } else {
      // Employee fetches notes about them
      sql = `SELECT n.*, u.name as manager_name 
             FROM manager_weekly_notes n 
             JOIN users u ON n.manager_id = u.id
             WHERE n.employee_id = ?
             ORDER BY n.created_at DESC LIMIT 20`;
      args = [employeeId!];
    }

    const res = await db.execute({ sql, args });
    return NextResponse.json({ notes: res.rows });
  } catch (error: any) {
    console.error("Weekly Notes GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat catatan", details: error.message }, { status: 500 });
  }
}

// POST: Save weekly note for an employee
export async function POST(request: Request) {
  try {
    const { managerId, employeeId, weekStart, note, rating } = await request.json();

    if (!managerId || !employeeId || !note) {
      return NextResponse.json({ error: "managerId, employeeId, dan note wajib diisi" }, { status: 400 });
    }

    const id = "wn_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const ws = weekStart || (() => {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      return monday.toISOString().slice(0, 10);
    })();

    await db.execute({
      sql: `INSERT INTO manager_weekly_notes (id, manager_id, employee_id, week_start, note, rating)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, managerId, employeeId, ws, note, rating || null]
    });

    // Notify employee
    try {
      const managerRes = await db.execute({ sql: "SELECT name FROM users WHERE id = ?", args: [managerId] });
      const managerName = managerRes.rows[0]?.name || 'Manager';
      const notifId = "n_wn_" + Date.now().toString(36);
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [notifId, employeeId, `📝 Catatan Mingguan dari ${managerName}`, note.substring(0, 100) + (note.length > 100 ? '...' : ''), 'info']
      });
    } catch (e) { /* ignore */ }

    return NextResponse.json({ success: true, noteId: id });
  } catch (error: any) {
    console.error("Weekly Notes POST Error:", error);
    return NextResponse.json({ error: "Gagal menyimpan catatan", details: error.message }, { status: 500 });
  }
}

