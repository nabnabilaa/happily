import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Fetch KPI daily inputs for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const kpiId = searchParams.get('kpiId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    let sql = '';
    let args: any[] = [];

    if (kpiId) {
      sql = `SELECT kdi.*, mk.title as kpi_title, mk.metric_unit, mk.metric_target
             FROM kpi_daily_inputs kdi
             JOIN monthly_kpis mk ON kdi.kpi_id = mk.id
             WHERE kdi.user_id = ? AND kdi.kpi_id = ?
             ORDER BY kdi.date DESC`;
      args = [userId, kpiId];
    } else {
      sql = `SELECT kdi.*, mk.title as kpi_title, mk.metric_unit, mk.metric_target, mk.kpi_type
             FROM kpi_daily_inputs kdi
             JOIN monthly_kpis mk ON kdi.kpi_id = mk.id
             WHERE kdi.user_id = ? AND MONTH(kdi.date) = ? AND YEAR(kdi.date) = ?
             ORDER BY kdi.date DESC`;
      args = [userId, month || new Date().getMonth() + 1, year || new Date().getFullYear()];
    }

    const res = await db.execute({ sql, args });

    return NextResponse.json({
      inputs: res.rows.map(r => ({
        id: r.id,
        kpiId: r.kpi_id,
        kpiTitle: r.kpi_title,
        metricUnit: r.metric_unit,
        metricTarget: r.metric_target,
        kpiType: r.kpi_type,
        date: r.date,
        value: Number(r.value),
        notes: r.notes,
        proofLink: r.proof_link,
      }))
    });
  } catch (error: any) {
    console.error("KPI Input GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch inputs", details: error.message }, { status: 500 });
  }
}

// POST: Submit a KPI daily input
export async function POST(request: Request) {
  try {
    const { userId, kpiId, date, value, notes, proofLink } = await request.json();
    if (!userId || !kpiId || !date || value === undefined) {
      return NextResponse.json({ error: "userId, kpiId, date, value required" }, { status: 400 });
    }

    // DELETE + INSERT agar tidak bisa double-submit (lebih aman dari ON DUPLICATE KEY jika constraint belum ada)
    await db.execute({
      sql: `DELETE FROM kpi_daily_inputs WHERE kpi_id = ? AND user_id = ? AND date = ?`,
      args: [kpiId, userId, date]
    });
    await db.execute({
      sql: `INSERT INTO kpi_daily_inputs (kpi_id, user_id, date, value, notes, proof_link) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [kpiId, userId, date, value, notes || null, proofLink || null]
    });

    // Update metric_current on monthly_kpis
    const sumRes = await db.execute({
      sql: `SELECT SUM(value) as total FROM kpi_daily_inputs WHERE kpi_id = ? AND user_id = ?`,
      args: [kpiId, userId]
    });
    const currentTotal = Number(sumRes.rows[0]?.total) || 0;

    await db.execute({
      sql: "UPDATE monthly_kpis SET metric_current = ? WHERE id = ?",
      args: [currentTotal, kpiId]
    });

    return NextResponse.json({ success: true, currentTotal });
  } catch (error: any) {
    console.error("KPI Input POST Error:", error);
    return NextResponse.json({ error: "Failed to submit input", details: error.message }, { status: 500 });
  }
}

