import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequesterAccess, canHrAdmin } from "@/lib/hrAuth";
import { resolveManagerTeam } from "@/lib/managerTeam";
import { getAuthUserId } from "@/lib/authSession";

/**
 * Pencocokan KPI ber-scope "tim" dengan orang yang sedang melihat.
 *
 * Sebelumnya `k.assigned_to = (SELECT team_id FROM users WHERE id = ?)`. Kolom
 * `team_id` adalah peninggalan skema lama yang sudah digantikan `department`
 * (lihat backfill di migrate-schema): dari 80 akun di basis data ini hanya 6
 * yang masih punya nilai, jadi bagi hampir semua orang sub-query itu
 * menghasilkan NULL — dan `assigned_to = NULL` tidak pernah benar. Akibatnya
 * KPI tim yang dibuat manajer tidak pernah muncul di layar seorang pun,
 * termasuk pembuatnya.
 *
 * Sekarang dicocokkan lewat nama departemen, satu-satunya penanda tim yang
 * benar-benar terisi. Pembandingnya tahan terhadap sisa data lama: sebuah baris
 * yang masih menyimpan `team_id` juga tetap cocok.
 */
const TEAM_SCOPE_MATCH = `(
    k.assigned_to = (SELECT department FROM users WHERE id = ?)
    OR k.assigned_to = (SELECT team_id FROM users WHERE id = ?)
  )`;

/**
 * Izin membuat KPI ber-scope tim, yang sasarannya sebuah departemen — bukan
 * seseorang. Manajer hanya boleh untuk departemennya sendiri; HR-Admin bebas.
 */
async function authorizeTeamKpiWrite(
  request: Request,
  requesterId: unknown,
  department: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const requester = requesterId ? String(requesterId) : "";
  if (!requester) return { ok: false, status: 400, error: "requesterId wajib diisi" };
  if (!department) return { ok: false, status: 400, error: "Departemen tujuan wajib diisi" };

  const sessionUserId = getAuthUserId(request);
  if (sessionUserId && String(sessionUserId) !== requester) {
    return { ok: false, status: 403, error: "Identitas tidak cocok dengan sesi." };
  }

  const { role, hrAccess, row } = await getRequesterAccess(requester);
  if (!role) return { ok: false, status: 403, error: "Pemohon tidak dikenal" };
  if (canHrAdmin(role, hrAccess)) return { ok: true };

  if (role === "manager") {
    const own = row?.department ? String(row.department) : "";
    if (own && own.toLowerCase() === department.toLowerCase()) return { ok: true };
    return { ok: false, status: 403, error: "KPI tim hanya bisa dibuat untuk departemenmu sendiri" };
  }

  return { ok: false, status: 403, error: "Kamu tidak berhak membuat KPI tim" };
}

/**
 * Siapa yang boleh MENULIS KPI orang lain.
 *
 * Ketiga jalur tulis di file ini — membuat, menilai, menghapus — dulu tidak
 * memeriksa apa pun. `assignedBy` diambil apa adanya dari body, dan `final_score`
 * bisa ditulis siapa saja untuk KPI siapa saja; nilai akhir seseorang, yang
 * ikut menentukan poin dan laporan bulanannya, terbuka bagi siapa pun yang tahu
 * alamat endpoint-nya.
 *
 * Aturannya disamakan dengan penjaga review (lihat lib/reviewAuth.ts) supaya
 * tidak ada dua definisi "berhak" yang bisa berbeda pelan-pelan:
 *  - HR-Admin bebas lintas divisi;
 *  - manajer hanya untuk anggota timnya, atau untuk KPI yang ia tugaskan sendiri;
 *  - peran lain ditolak.
 *
 * Peran SELALU dibaca ulang dari basis data. Kalau cookie sesi ada, identitas
 * pemanggil harus cocok dengannya — sebagian klien (ekstensi) belum mengirim
 * cookie, jadi ketidakhadirannya tidak dijadikan penolakan.
 */
async function authorizeKpiWrite(
  request: Request,
  requesterId: unknown,
  opts: { targetUserId?: unknown; assignedBy?: unknown } = {}
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const requester = requesterId ? String(requesterId) : "";
  if (!requester) {
    return { ok: false, status: 400, error: "requesterId wajib diisi" };
  }

  const sessionUserId = getAuthUserId(request);
  if (sessionUserId && String(sessionUserId) !== requester) {
    return { ok: false, status: 403, error: "Identitas tidak cocok dengan sesi." };
  }

  const { role, hrAccess } = await getRequesterAccess(requester);
  if (!role) return { ok: false, status: 403, error: "Pemohon tidak dikenal" };
  if (canHrAdmin(role, hrAccess)) return { ok: true };

  if (role === "manager") {
    if (opts.assignedBy && String(opts.assignedBy) === requester) return { ok: true };

    const target = opts.targetUserId ? String(opts.targetUserId) : "";
    if (target) {
      const { memberIds } = await resolveManagerTeam(requester);
      if (memberIds.includes(target)) return { ok: true };
    }
  }

  return { ok: false, status: 403, error: "Kamu tidak berhak mengubah KPI ini" };
}

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

    /*
     * Cakupan HR dibaca dari DB, bukan dari query string.
     *
     * `role` di URL adalah klaim milik klien. Selama cabang HR hanya melihat
     * KPI yang ia tugaskan sendiri, klaim itu tidak berbahaya — tapi layar
     * Review KPI memang perlu HR melihat KPI seluruh perusahaan, dan begitu
     * cabang itu ada, `?role=hr` dari siapa pun akan membuka semuanya.
     */
    const { role: verifiedRole, hrAccess } = await getRequesterAccess(userId);
    const isHrAdmin = canHrAdmin(verifiedRole, hrAccess);

    if (isHrAdmin) {
      // HR-Admin meninjau lintas divisi, jadi tidak disaring per penugas.
      // `archived` disaring: itu KPI milik akun yang sudah dihapus, tidak akan
      // pernah bisa diselesaikan siapa pun dan hanya mengotori antrean review.
      sql = `SELECT k.*, u.name as assignee_name
             FROM monthly_kpis k
             LEFT JOIN users u ON k.assigned_to = u.id
             WHERE k.month = ? AND k.year = ? AND k.status <> 'archived'
             ORDER BY k.created_at DESC`;
      args = [Number(month), Number(year)];
    } else if (['manager', 'hr', 'admin'].includes(role || '')) {
      // Manager sees KPIs they assigned or team KPIs for their department
      sql = `SELECT k.*, u.name as assignee_name
             FROM monthly_kpis k
             LEFT JOIN users u ON k.assigned_to = u.id
             WHERE (k.assigned_by = ? OR (k.scope = 'team' AND ${TEAM_SCOPE_MATCH}))
               AND k.month = ? AND k.year = ?
             ORDER BY k.created_at DESC`;
      args = [userId, userId, userId, Number(month), Number(year)];
    } else {
      // Employee sees KPIs assigned to them AND Team KPIs
      sql = `SELECT k.*, u.name as assigner_name
             FROM monthly_kpis k
             LEFT JOIN users u ON k.assigned_by = u.id
             WHERE (k.assigned_to = ? OR (k.scope = 'team' AND ${TEAM_SCOPE_MATCH}))
               AND k.month = ? AND k.year = ? AND k.status = 'active'
             ORDER BY k.weight DESC`;
      args = [userId, userId, userId, Number(month), Number(year)];
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
      metricTarget: r.metric_target,
      metricCurrent: r.metric_current,
      kpiType: r.kpi_type || 'completion',
      metricUnit: r.metric_unit || null,
      metricPeriod: r.metric_period || null,
      scope: r.scope || 'assigned',
      managerNotes: r.manager_notes,
      reviewStatus: r.review_status || null,
      reviewNote: r.review_note || null,
      penaltyPct: r.penalty_pct ? Number(r.penalty_pct) : 0,
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
    const { title, targetDescription, weight, month, year, assignedTo, assignedBy, scope, metricTarget, kpiType, metricUnit, metricPeriod } = await request.json();

    if (!title || !assignedTo || !assignedBy) {
      return NextResponse.json({ error: "title, assignedTo, dan assignedBy wajib diisi" }, { status: 400 });
    }

    // KPI ber-scope tim tidak menunjuk seseorang: `assigned_to` diisi nama
    // departemen. Jadi pemeriksaannya beda — bukan "apakah orang ini anggotamu"
    // melainkan "apakah ini memang departemenmu".
    const isTeamScope = (scope || 'assigned') === 'team';
    const auth = isTeamScope
      ? await authorizeTeamKpiWrite(request, assignedBy, String(assignedTo))
      : await authorizeKpiWrite(request, assignedBy, { targetUserId: assignedTo });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const id = "kpi_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    await db.execute({
      sql: `INSERT INTO monthly_kpis (id, title, target_description, weight, month, year, assigned_to, assigned_by, scope, metric_target, kpi_type, metric_unit, metric_period)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, title, targetDescription || '', Number(weight) || 0, m, y, assignedTo, assignedBy, scope || 'assigned', metricTarget ?? 100, kpiType || 'completion', metricUnit || null, metricPeriod || null]
    });

    // Kabari yang dititipi KPI.
    //
    // Untuk KPI tim, `assigned_to` berisi NAMA DEPARTEMEN, bukan id orang.
    // Mengirim notifikasi ke sana berarti menulis `user_id` yang tidak ada di
    // tabel users — foreign key menolaknya, `catch` menelannya, dan satu tim
    // penuh tidak pernah tahu ada target baru untuk mereka. Jadi sasarannya
    // dijabarkan dulu menjadi orang-orangnya.
    try {
      const managerRes = await db.execute({ sql: "SELECT name FROM users WHERE id = ?", args: [assignedBy] });
      const managerName = managerRes.rows[0]?.name || 'Manager';

      let recipients: string[] = [String(assignedTo)];
      if (isTeamScope) {
        const memberRes = await db.execute({
          sql: "SELECT id FROM users WHERE department = ? AND id != ?",
          args: [String(assignedTo), String(assignedBy)],
        });
        recipients = memberRes.rows.map((r) => String(r.id));
      }

      for (const recipient of recipients) {
        const notifId = "n_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
        await db.execute({
          sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
          args: [
            notifId,
            recipient,
            isTeamScope ? `🎯 KPI Tim Baru dari ${managerName}` : `🎯 KPI Baru dari ${managerName}`,
            `"${title}" — Bobot: ${weight}%`,
            'action',
          ],
        });
      }
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
    const { kpiId, finalScore, metricCurrent, managerNotes, status, requesterId } = await request.json();

    if (!kpiId) return NextResponse.json({ error: "kpiId required" }, { status: 400 });

    // Nilai akhir dan catatan manajer ditulis di sini. Pemiliknya sendiri tidak
    // boleh menilai dirinya — pembatasnya sama seperti di jalur review.
    const ownerRes = await db.execute({
      sql: "SELECT assigned_to, assigned_by FROM monthly_kpis WHERE id = ?",
      args: [kpiId],
    });
    const owner = ownerRes.rows[0] as any;
    if (!owner) return NextResponse.json({ error: "KPI tidak ditemukan" }, { status: 404 });

    const auth = await authorizeKpiWrite(request, requesterId, {
      targetUserId: owner.assigned_to,
      assignedBy: owner.assigned_by,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const updates: string[] = [];
    const args: any[] = [];

    if (finalScore !== undefined) { updates.push("final_score = ?"); args.push(finalScore); }
    if (metricCurrent !== undefined) { updates.push("metric_current = ?"); args.push(metricCurrent); }
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

    const ownerRes = await db.execute({
      sql: "SELECT assigned_to, assigned_by FROM monthly_kpis WHERE id = ?",
      args: [kpiId],
    });
    const owner = ownerRes.rows[0] as any;
    if (!owner) return NextResponse.json({ success: true, alreadyGone: true });

    const auth = await authorizeKpiWrite(request, searchParams.get('requesterId'), {
      targetUserId: owner.assigned_to,
      assignedBy: owner.assigned_by,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    await db.execute({ sql: "DELETE FROM monthly_kpis WHERE id = ?", args: [kpiId] });
    await db.execute({ sql: "DELETE FROM task_kpi_links WHERE kpi_id = ?", args: [kpiId] });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("KPI DELETE Error:", error);
    return NextResponse.json({ error: "Gagal hapus KPI", details: error.message }, { status: 500 });
  }
}

