import { NextResponse } from "next/server";
import { db } from "@/lib/turso";

// ══════════════════════════════════════════════════════════════
// Personal KPI API — Spec v2: KPI Mandiri
// Employees can create their own development KPIs
// These are separate from manager-assigned monthly_kpis
// ══════════════════════════════════════════════════════════════

// GET: Fetch personal KPIs for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const res = await db.execute({
      sql: `SELECT * FROM personal_kpis 
            WHERE user_id = ? AND month = ? AND year = ? AND status = 'active'
            ORDER BY created_at DESC`,
      args: [userId, month, year]
    });

    const kpis = res.rows.map(r => ({
      id: r.id,
      title: r.title,
      targetDescription: r.target_description,
      targetValue: r.target_value,
      currentValue: Number(r.current_value) || 0,
      metricUnit: r.metric_unit,
      month: Number(r.month),
      year: Number(r.year),
      status: r.status,
      progress: r.target_value ? Math.round((Number(r.current_value) / Number(r.target_value)) * 100) : 0,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ kpis });
  } catch (error: any) {
    console.error("Personal KPI GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat KPI Mandiri", details: error.message }, { status: 500 });
  }
}

// POST: Create a new personal KPI
export async function POST(request: Request) {
  try {
    const { userId, title, targetDescription, targetValue, metricUnit, month, year } = await request.json();

    if (!userId || !title) {
      return NextResponse.json({ error: "userId dan title wajib diisi" }, { status: 400 });
    }

    // Limit: max 5 personal KPIs per month
    const countRes = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM personal_kpis 
            WHERE user_id = ? AND month = ? AND year = ? AND status = 'active'`,
      args: [userId, month || new Date().getMonth() + 1, year || new Date().getFullYear()]
    });
    
    if (Number(countRes.rows[0]?.cnt) >= 5) {
      return NextResponse.json({ error: "Maksimal 5 KPI Mandiri per bulan" }, { status: 400 });
    }

    const id = "pkpi_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    await db.execute({
      sql: `INSERT INTO personal_kpis (id, user_id, title, target_description, target_value, metric_unit, month, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, title, targetDescription || '', targetValue || null, metricUnit || null, m, y]
    });

    return NextResponse.json({ success: true, kpiId: id });
  } catch (error: any) {
    console.error("Personal KPI POST Error:", error);
    return NextResponse.json({ error: "Gagal membuat KPI Mandiri", details: error.message }, { status: 500 });
  }
}

// PUT: Update personal KPI progress
export async function PUT(request: Request) {
  try {
    const { kpiId, currentValue, status } = await request.json();
    if (!kpiId) return NextResponse.json({ error: "kpiId required" }, { status: 400 });

    const updates: string[] = [];
    const args: any[] = [];

    if (currentValue !== undefined) { updates.push("current_value = ?"); args.push(currentValue); }
    if (status) { updates.push("status = ?"); args.push(status); }

    if (updates.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    args.push(kpiId);
    await db.execute({
      sql: `UPDATE personal_kpis SET ${updates.join(', ')} WHERE id = ?`,
      args
    });

    // Award XP if KPI achieved (current >= target)
    if (currentValue !== undefined) {
      const kpi = await db.execute({ sql: "SELECT * FROM personal_kpis WHERE id = ?", args: [kpiId] });
      const row = kpi.rows[0];
      if (row && row.target_value && Number(currentValue) >= Number(row.target_value)) {
        try {
          // Check if already awarded for this KPI
          const existing = await db.execute({
            sql: `SELECT id FROM xp_transactions WHERE action_type = 'personal_kpi_achieved' AND description LIKE ?`,
            args: [`%${kpiId}%`]
          });
          if (existing.rows.length === 0) {
            const xpAmount = 20; // Personal KPI completion bonus
            await db.execute({
              sql: "INSERT INTO xp_transactions (id, user_id, amount, action_type, description) VALUES (?, ?, ?, ?, ?)",
              args: ["tx_pkpi_" + Date.now().toString(36), String(row.user_id), xpAmount, 'personal_kpi_achieved', `KPI Mandiri tercapai: ${row.title} [${kpiId}]`]
            });
            await db.execute({
              sql: "UPDATE users SET points = points + ? WHERE id = ?",
              args: [xpAmount, String(row.user_id)]
            });
          }
        } catch (e) { console.warn("Personal KPI XP error:", e); }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Personal KPI PUT Error:", error);
    return NextResponse.json({ error: "Gagal update KPI Mandiri", details: error.message }, { status: 500 });
  }
}

// DELETE: Remove personal KPI
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kpiId = searchParams.get('id');
    if (!kpiId) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db.execute({ sql: "DELETE FROM personal_kpis WHERE id = ?", args: [kpiId] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal hapus KPI", details: error.message }, { status: 500 });
  }
}
