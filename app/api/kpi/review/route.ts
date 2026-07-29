import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewTask } from "@/lib/taskReview";
import { AWAITING_REVIEW_SQL, TASK_STATUS } from "@/lib/taskStatus";
import { authorizeReview } from "@/lib/reviewAuth";

// POST: HR/Manager memutuskan sebuah KPI bulanan
// Body: { kpiId, action: 'approved'|'revision'|'rejected'|'clear', note, penaltyPct, reviewedBy }
export async function POST(request: Request) {
  try {
    const { kpiId, action, note, penaltyPct, reviewedBy } = await request.json();

    if (!kpiId || !action) {
      return NextResponse.json({ error: "kpiId dan action wajib diisi" }, { status: 400 });
    }
    if (!['approved', 'revision', 'rejected', 'clear'].includes(action)) {
      return NextResponse.json({ error: "action harus approved, revision, rejected, atau clear" }, { status: 400 });
    }

    const kpiRes = await db.execute({ sql: `SELECT * FROM monthly_kpis WHERE id = ?`, args: [kpiId] });
    if (!kpiRes.rows.length) return NextResponse.json({ error: "KPI tidak ditemukan" }, { status: 404 });
    const kpi = kpiRes.rows[0];

    /*
     * Izin diperiksa di sini, bukan diasumsikan dari layar pemanggil.
     *
     * `reviewedBy` datang dari body request; sebelumnya nilainya hanya ditulis
     * ke kolom dan tidak pernah diverifikasi. Selama endpoint ini cuma bisa
     * memberi revisi/tolak, itu sekadar gangguan. Sejak ACC di sini juga
     * MENCAIRKAN POIN seluruh task di bawah KPI, endpoint tanpa penjaga berarti
     * siapa pun bisa menyetujui KPI-nya sendiri dan membayar dirinya sendiri.
     *
     * Aturannya: HR-Admin boleh lintas divisi; manajer hanya untuk KPI yang ia
     * tugaskan atau milik anggota timnya; dan tidak seorang pun — termasuk
     * manajer dan HR — boleh memutuskan KPI miliknya sendiri.
     */
    const auth = await authorizeReview(reviewedBy, kpi.assigned_to, {
      assignedBy: kpi.assigned_by ? String(kpi.assigned_by) : null,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    /*
     * ACC di tingkat KPI — inilah satu-satunya tempat pekerjaan disetujui.
     *
     * Sebelumnya manajer meng-ACC satu per satu task harian, dan poin task
     * dibayar dua tahap: +20 saat karyawan menyelesaikan, +10 saat di-ACC
     * (lihat lib/taskReview.ts). Memindahkan keputusan ke tingkat KPI tanpa
     * menyentuh tahap kedua itu akan membuat +10 tidak pernah cair dan
     * menghapus rem kualitasnya. Jadi ACC KPI mencairkan seluruh task yang
     * masih menunggu sekaligus, lewat `reviewTask` yang sama persis —
     * poin, notifikasi, dan rollup-nya tidak digandakan di sini.
     *
     * Urutannya penting. Baris KPI ditulis LEBIH DULU supaya penalti sisa
     * review sebelumnya sudah bersih, baru task-nya disetujui; `reviewTask`
     * memanggil `recalcKpiProgress` di setiap task, jadi hitungan terakhir
     * yang mendarat adalah yang benar.
     */
    if (action === 'approved') {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const restored = kpi.original_metric_current !== null
        ? Number(kpi.original_metric_current)
        : Number(kpi.metric_current) || 0;

      await db.execute({
        sql: `UPDATE monthly_kpis
              SET review_status = 'approved', review_note = ?, penalty_pct = 0,
                  metric_current = ?, original_metric_current = NULL,
                  reviewed_by = ?, reviewed_at = ?
              WHERE id = ?`,
        args: [note || null, restored, reviewedBy || null, now, kpiId]
      });

      // Task yang menunggu review, baik yang menempel lewat kpi_id maupun lewat
      // kolom goal_id lama — alur pembuatan task menulis keduanya.
      const pendingRes = await db.execute({
        sql: `SELECT dp.id FROM daily_priorities dp
              WHERE (dp.kpi_id = ? OR dp.goal_id = ?) AND ${AWAITING_REVIEW_SQL}`,
        args: [kpiId, kpiId]
      });

      let approvedTasks = 0;
      const failedTasks: string[] = [];
      for (const row of pendingRes.rows) {
        const taskId = String(row.id);
        try {
          const result = await reviewTask({
            taskId,
            action: TASK_STATUS.APPROVED,
            managerId: reviewedBy || null,
            reviewNote: note || null,
          });
          if (result.ok) approvedTasks++;
          else failedTasks.push(taskId);
        } catch (e) {
          console.warn(`ACC KPI ${kpiId}: task ${taskId} gagal disetujui:`, e);
          failedTasks.push(taskId);
        }
      }

      try {
        const notifId = "n_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
        await db.execute({
          sql: `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`,
          args: [
            notifId, kpi.assigned_to,
            `✅ KPI Disetujui: ${kpi.title}`,
            note || `KPI kamu disetujui${approvedTasks > 0 ? ` beserta ${approvedTasks} task harian di dalamnya` : ''}.`,
            'success'
          ]
        });
      } catch (e) { console.warn('Notif failed:', e); }

      return NextResponse.json({
        success: true,
        action: 'approved',
        approvedTasks,
        // Dilaporkan, bukan ditelan. Kalau sebagian task gagal, KPI-nya sudah
        // terlanjur ber-status approved dan itu harus terlihat di layar.
        failedTasks,
      });
    }

    if (action === 'clear') {
      const restored = kpi.original_metric_current !== null ? Number(kpi.original_metric_current) : Number(kpi.metric_current);
      await db.execute({
        sql: `UPDATE monthly_kpis SET review_status = NULL, review_note = NULL, penalty_pct = 0, metric_current = ?, original_metric_current = NULL, reviewed_by = NULL, reviewed_at = NULL WHERE id = ?`,
        args: [restored, kpiId]
      });
      return NextResponse.json({ success: true, action: 'clear', restoredMetric: restored });
    }

    const pct = Math.max(0, Math.min(100, Number(penaltyPct) || 0));
    const currentMetric = Number(kpi.metric_current) || 0;
    const originalCurrent = kpi.original_metric_current !== null ? Number(kpi.original_metric_current) : currentMetric;
    const penaltyAmount = Math.round(originalCurrent * pct / 100);
    const newMetric = Math.max(0, originalCurrent - penaltyAmount);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.execute({
      sql: `UPDATE monthly_kpis SET review_status = ?, review_note = ?, penalty_pct = ?, metric_current = ?, original_metric_current = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
      args: [action, note || null, pct, newMetric, originalCurrent, reviewedBy || null, now, kpiId]
    });

    try {
      const notifId = "n_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      const isReject = action === 'rejected';
      await db.execute({
        sql: `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`,
        args: [
          notifId, kpi.assigned_to,
          isReject ? `❌ KPI Ditolak: ${kpi.title}` : `⚠️ KPI Perlu Revisi: ${kpi.title}`,
          note || (isReject ? 'KPI kamu ditolak oleh HR/Manager.' : 'KPI kamu diminta untuk direvisi.'),
          'warning'
        ]
      });
    } catch (e) { console.warn('Notif failed:', e); }

    return NextResponse.json({ success: true, action, penaltyAmount, newMetricCurrent: newMetric });
  } catch (error: any) {
    console.error("KPI Review POST Error:", error);
    return NextResponse.json({ error: "Gagal memproses review KPI", details: error.message }, { status: 500 });
  }
}

// GET: Fetch task-KPI links for review (Manager sees all pending links from team)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId');
    const month = searchParams.get('month') || new Date().getMonth() + 1;
    const year = searchParams.get('year') || new Date().getFullYear();

    if (!managerId) return NextResponse.json({ error: "managerId required" }, { status: 400 });

    // Get all KPIs assigned by this manager
    const kpisRes = await db.execute({
      sql: `SELECT k.id, k.title, k.weight, k.assigned_to, u.name as employee_name
            FROM monthly_kpis k
            JOIN users u ON k.assigned_to = u.id
            WHERE k.assigned_by = ? AND k.month = ? AND k.year = ? AND k.status = 'active'`,
      args: [managerId, Number(month), Number(year)]
    });

    // For each KPI, get linked tasks
    const reviewData = await Promise.all(kpisRes.rows.map(async (kpi) => {
      const linksRes = await db.execute({
        sql: `SELECT tkl.*, dp.title as task_title, dp.is_done as task_done, dp.created_at as task_date
              FROM task_kpi_links tkl
              JOIN daily_priorities dp ON tkl.task_id = dp.id
              WHERE tkl.kpi_id = ?
              ORDER BY tkl.created_at DESC`,
        args: [String(kpi.id)]
      });

      return {
        kpiId: kpi.id,
        kpiTitle: kpi.title,
        weight: Number(kpi.weight),
        employeeId: kpi.assigned_to,
        employeeName: kpi.employee_name,
        links: linksRes.rows.map(l => ({
          id: l.id,
          taskId: l.task_id,
          taskTitle: l.task_title,
          taskDone: !!l.task_done,
          taskDate: l.task_date,
          linkedBy: l.linked_by,
          status: l.status,
          reviewedAt: l.reviewed_at,
        }))
      };
    }));

    return NextResponse.json({ reviewData });
  } catch (error: any) {
    console.error("KPI Review GET Error:", error);
    return NextResponse.json({ error: "Gagal memuat review data", details: error.message }, { status: 500 });
  }
}

// PUT: Approve / Reject / Move a task-KPI link
export async function PUT(request: Request) {
  try {
    const { linkId, action, newKpiId, reviewedBy } = await request.json();
    // action: 'approve' | 'reject' | 'move'

    if (!linkId || !action) {
      return NextResponse.json({ error: "linkId dan action wajib diisi" }, { status: 400 });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (action === 'approve') {
      await db.execute({
        sql: "UPDATE task_kpi_links SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
        args: [reviewedBy, now, linkId]
      });
    } else if (action === 'reject') {
      await db.execute({
        sql: "UPDATE task_kpi_links SET status = 'rejected', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
        args: [reviewedBy, now, linkId]
      });
    } else if (action === 'move' && newKpiId) {
      await db.execute({
        sql: "UPDATE task_kpi_links SET kpi_id = ?, status = 'moved', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
        args: [newKpiId, reviewedBy, now, linkId]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("KPI Review PUT Error:", error);
    return NextResponse.json({ error: "Gagal update review", details: error.message }, { status: 500 });
  }
}

