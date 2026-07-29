import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewTask } from "@/lib/taskReview";
import { AWAITING_REVIEW_SQL, normalizeReviewAction } from "@/lib/taskStatus";
import { authorizeReview } from "@/lib/reviewAuth";
import { getRequesterAccess, canHrAdmin } from "@/lib/hrAuth";
import { resolveManagerTeam, placeholdersFor } from "@/lib/managerTeam";

export const dynamic = "force-dynamic";

/*
 * Hasil kerja yang tidak menempel ke KPI mana pun.
 *
 * Memilih weekly target saat membuat task itu opsional
 * (`ManagePrioritiesModal` hanya mewajibkan judul), jadi `kpi_id` dan `goal_id`
 * bisa dua-duanya kosong. Sejak ACC pindah ke tingkat KPI, task seperti itu
 * tidak punya apa pun untuk disetujui — dan tanpa endpoint ini pekerjaannya
 * akan menggantung "menunggu ACC" selamanya sekaligus hilang dari pandangan
 * manajer. Itu tetap hasil kerja orang, jadi diperlakukan sebagai satu grup
 * per karyawan: tampil sendiri di layar Review, dan diputus sekali untuk satu
 * grup — bukan kembali ke ACC per task.
 */

/*
 * "Tanpa KPI" diuji terhadap kenyataan, bukan terhadap kolom kosong.
 *
 * Syarat `kpi_id IS NULL AND goal_id IS NULL` melewatkan kasus yang justru
 * paling mudah terlewat: task yang menunjuk KPI yang sudah dihapus, atau
 * menunjuk baris `goals` era lama (storage GET sudah mengembalikan goals
 * sebagai array kosong). Task seperti itu tidak muncul di daftar KPI — tidak
 * ada barisnya — sekaligus tidak lolos uji "kolomnya kosong", jadi ia terdampar
 * di antara keduanya dan hasil kerjanya hilang dari pandangan siapa pun.
 *
 * Yang benar: apa pun yang tidak resolve ke satu baris monthly_kpis.
 */
const UNLINKED_SQL = `NOT EXISTS (
     SELECT 1 FROM monthly_kpis k WHERE k.id = dp.kpi_id OR k.id = dp.goal_id
   )`;

/** Karyawan yang boleh ditinjau oleh `reviewerId`, atau null kalau tidak berhak. */
async function reviewableMemberIds(reviewerId: string): Promise<string[] | null> {
  const { role, hrAccess } = await getRequesterAccess(reviewerId);
  if (!role) return null;

  if (canHrAdmin(role, hrAccess)) {
    // HR-Admin meninjau lintas divisi. Dirinya sendiri tetap dikecualikan —
    // aturan "tidak meninjau pekerjaan sendiri" berlaku untuk semua peran.
    const res = await db.execute({
      sql: "SELECT id FROM users WHERE id != ?",
      args: [reviewerId],
    });
    return res.rows.map((r) => String(r.id));
  }

  if (role === "manager") {
    const { memberIds } = await resolveManagerTeam(reviewerId);
    return memberIds.filter((id) => id !== reviewerId);
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewerId = searchParams.get("reviewerId");
    if (!reviewerId) {
      return NextResponse.json({ error: "reviewerId required" }, { status: 400 });
    }

    const memberIds = await reviewableMemberIds(reviewerId);
    if (memberIds === null) {
      return NextResponse.json({ error: "Tidak berhak meninjau" }, { status: 403 });
    }
    if (memberIds.length === 0) return NextResponse.json({ groups: [] });

    const placeholders = placeholdersFor(memberIds);
    const res = await db.execute({
      sql: `SELECT dp.id, dp.user_id, dp.title, dp.description, dp.completed_at,
                   dp.proof_link, dp.proof_notes, dp.metric_value, dp.created_at,
                   u.name AS owner_name
            FROM daily_priorities dp
            JOIN users u ON dp.user_id = u.id
            WHERE dp.user_id IN (${placeholders})
              AND ${UNLINKED_SQL}
              AND ${AWAITING_REVIEW_SQL}
            ORDER BY COALESCE(dp.completed_at, dp.created_at) DESC`,
      args: memberIds,
    });

    // Dikelompokkan per karyawan supaya satu keputusan menutup satu grup,
    // sejajar dengan cara KPI diputus.
    const byEmployee = new Map<string, any>();
    for (const r of res.rows) {
      const employeeId = String(r.user_id);
      if (!byEmployee.has(employeeId)) {
        byEmployee.set(employeeId, {
          employeeId,
          employeeName: r.owner_name || "Karyawan",
          tasks: [],
        });
      }
      byEmployee.get(employeeId).tasks.push({
        id: r.id,
        title: r.title,
        description: r.description,
        completedAt: r.completed_at || null,
        proofLinks: parseProofLinks(r.proof_link),
        proofNotes: r.proof_notes || null,
        metricValue:
          r.metric_value !== null && r.metric_value !== undefined ? Number(r.metric_value) : null,
      });
    }

    return NextResponse.json({ groups: Array.from(byEmployee.values()) });
  } catch (error: any) {
    console.error("Unlinked Review GET Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat hasil kerja tanpa KPI", details: error.message },
      { status: 500 }
    );
  }
}

// POST: satu keputusan untuk seluruh hasil kerja tanpa KPI milik satu karyawan.
// Body: { reviewerId, employeeId, action: 'approved'|'revision'|'rejected', note }
export async function POST(request: Request) {
  try {
    const { reviewerId, employeeId, action, note } = await request.json();

    if (!reviewerId || !employeeId || !action) {
      return NextResponse.json(
        { error: "reviewerId, employeeId dan action wajib diisi" },
        { status: 400 }
      );
    }

    const reviewAction = normalizeReviewAction(action);
    if (!reviewAction) {
      return NextResponse.json({ error: `Status tidak dikenal: ${action}` }, { status: 400 });
    }

    const auth = await authorizeReview(reviewerId, employeeId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const res = await db.execute({
      sql: `SELECT dp.id FROM daily_priorities dp
            WHERE dp.user_id = ? AND ${UNLINKED_SQL} AND ${AWAITING_REVIEW_SQL}`,
      args: [employeeId],
    });

    let processed = 0;
    const failedTasks: string[] = [];
    for (const row of res.rows) {
      const taskId = String(row.id);
      try {
        const result = await reviewTask({
          taskId,
          action: reviewAction,
          managerId: String(reviewerId),
          reviewNote: note || null,
        });
        if (result.ok) processed++;
        else failedTasks.push(taskId);
      } catch (e) {
        console.warn(`Review tanpa KPI: task ${taskId} gagal diproses:`, e);
        failedTasks.push(taskId);
      }
    }

    return NextResponse.json({ success: true, action: reviewAction, processed, failedTasks });
  } catch (error: any) {
    console.error("Unlinked Review POST Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses hasil kerja tanpa KPI", details: error.message },
      { status: 500 }
    );
  }
}

function parseProofLinks(raw: any): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw as string);
    return Array.isArray(v) ? v : [raw];
  } catch {
    return [raw];
  }
}
