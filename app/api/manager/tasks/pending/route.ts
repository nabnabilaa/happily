import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveManagerTeam, placeholdersFor } from '@/lib/managerTeam';
import { reviewTask } from '@/lib/taskReview';
import { AWAITING_REVIEW_SQL, normalizeReviewAction, normalizeTaskStatus } from '@/lib/taskStatus';
import { requireActor } from "@/lib/apiAuth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Identitas dari cookie sesi. Antrean review berisi pekerjaan anggota tim orang lain.
    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;
    const userId = actor.userId;

    if (!userId) return NextResponse.json({ error: 'ManagerId missing' }, { status: 400 });

    const { memberIds } = await resolveManagerTeam(userId);
    if (memberIds.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const placeholders = placeholdersFor(memberIds);

    // Previously this filtered on `status = 'pending_review'`, a value no write
    // path ever produced — the queue was permanently empty and the "Review Task
    // Tim" widget never rendered. Match on the real submitted-but-unverified
    // shape instead, which also covers rows with a NULL status.
    const tasksRes = await db.execute({
      sql: `SELECT dp.*, u.name as user_name FROM daily_priorities dp
            JOIN users u ON dp.user_id = u.id
            WHERE dp.user_id IN (${placeholders}) AND ${AWAITING_REVIEW_SQL}
            ORDER BY COALESCE(dp.submitted_at, dp.completed_at, dp.created_at) DESC`,
      args: memberIds,
    });

    const tasks = tasksRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      title: r.title,
      description: r.description,
      kpiId: r.kpi_id,
      goalId: r.goal_id || r.kpi_id,
      goalTitle: r.goal_title,
      proofLink: r.proof_link,
      proofLinks: parseProofLinks(r.proof_link),
      proofNotes: r.proof_notes,
      metricValue: r.metric_value !== null && r.metric_value !== undefined ? Number(r.metric_value) : null,
      partialProgress: Number(r.partial_progress) || 0,
      status: normalizeTaskStatus(r.status),
      submittedAt: r.submitted_at || r.completed_at || r.created_at,
    }));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Pending Tasks Error:", error);
    return NextResponse.json({ error: 'Failed to fetch pending tasks' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { taskId, status, notes, managerId } = await request.json();

    if (!taskId || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    /*
     * `managerId` di sini SENGAJA masih dibaca dari body, berbeda dari GET di
     * atas yang sudah memakai cookie sesi.
     *
     * Pemanggilnya adalah ekstensi Chrome (flowbuddy/js/views/approval.js:163),
     * dan `fetch`-nya tidak menyertakan `credentials`, jadi tidak ada cookie
     * yang ikut terkirim. Memaksa sesi di sini akan mematikan tombol ACC di
     * ekstensi tanpa memperbaiki apa pun yang bisa dipakai dari browser biasa —
     * layar web memakai /api/manager/verify-task, yang SUDAH dimigrasi.
     *
     * Menutupnya butuh ekstensinya lebih dulu punya cara mengautentikasi
     * (cookie lintas-origin dengan host permission, atau token sendiri). Itu
     * perubahan pada ekstensi, bukan pada route ini.
     *
     * Wajib diisi supaya kegagalan terbaca jelas, bukan berupa 403 tanpa
     * penjelasan.
     */
    if (!managerId) {
      return NextResponse.json(
        { error: 'managerId wajib diisi — perbarui ekstensi FlowBuddy ke versi terbaru.' },
        { status: 400 }
      );
    }

    const action = normalizeReviewAction(status);
    if (!action) {
      return NextResponse.json({ error: `Status tidak dikenal: ${status}` }, { status: 400 });
    }

    // Routed through the shared flow so this path also rolls progress up the
    // goal tree, notifies the employee and awards XP — none of which it used to
    // do. `notes` lands in review_note rather than clobbering the proof notes.
    const result = await reviewTask({
      taskId,
      action,
      managerId,
      reviewNote: notes,
      origin: new URL(request.url).origin,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }

    return NextResponse.json({ success: true, status: action });
  } catch (error) {
    console.error("Update Task Status Error:", error);
    return NextResponse.json({ error: 'Failed to update task status' }, { status: 500 });
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
