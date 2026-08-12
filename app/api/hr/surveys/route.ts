import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequesterAccess, canHrAdmin } from '@/lib/hrAuth';
import { requireActor } from '@/lib/apiAuth';

/**
 * Penjaga untuk seluruh jalur tulis survei.
 *
 * Membuat, menyunting, dan MENGHAPUS survei sebelumnya tidak memeriksa apa pun.
 * Menghapus survei ikut menghapus seluruh jawabannya, jadi lubang ini bukan
 * cuma soal orang iseng menerbitkan pertanyaan — satu permintaan DELETE
 * memusnahkan hasil survei yang sudah diisi banyak orang, tanpa jejak siapa.
 */
async function assertSurveyAdmin(requesterId: unknown) {
  const requester = await getRequesterAccess(requesterId ? String(requesterId) : '');
  if (!canHrAdmin(requester.role, requester.hrAccess)) {
    return NextResponse.json({ error: 'Hanya HR yang bisa mengelola survei' }, { status: 403 });
  }
  return null;
}

// GET all surveys — with optional targeting filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dept = searchParams.get('dept');

    /*
     * Dua hal yang dulu tercampur dan sekarang dipisah tegas:
     *
     *  • CABANG MANA yang dijalankan — ditentukan ada-tidaknya `requesterId`,
     *    parameter yang memang hanya dikirim konsol HR. Dulu penentunya adalah
     *    ada-tidaknya `userId`, sehingga menghapus satu parameter dari URL
     *    cukup untuk masuk ke pandangan HR.
     *
     *  • SIAPA yang bertanya — selalu dari cookie, tidak pernah dari URL.
     *    `assertSurveyAdmin` di bawah dulu memeriksa peran dari id yang
     *    DISEBUT pemanggil: menyebut id HR sudah cukup untuk lolos.
     *
     * Nilai `requesterId` sendiri sekarang tidak dipakai untuk apa pun selain
     * menandai maksud. Ia sengaja tidak dihapus dari klien supaya versi lama
     * yang masih mengirimnya tetap mendapat pandangan yang benar.
     */
    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;
    const userId = actor.userId;
    const wantsAdminView = searchParams.has('requesterId');

    let surveys: any[];

    /*
     * Pandangan karyawan: hanya survei aktif, dan hanya yang menyasar dirinya.
     *
     * Cabang ini adalah DEFAULT — semua orang jatuh ke sini kecuali yang
     * meminta pandangan admin secara eksplisit. Dulu penentunya berlapis
     * (`userId && dept`), dan orang yang departemennya kosong justru lolos ke
     * cabang HR lalu melihat seluruh survei termasuk draf. Di basis data ini 54
     * dari 74 karyawan persis dalam kondisi itu.
     *
     * Tanpa departemen, seseorang hanya berhak melihat survei se-perusahaan;
     * survei yang menyasar departemen tertentu jelas bukan untuknya.
     */
    if (!wantsAdminView) {
      const res = await db.execute(
        `SELECT * FROM surveys WHERE status = 'active' ORDER BY published_at DESC`
      );
      surveys = (res.rows as any[]).filter(s => {
        if (s.target_audience === 'company' || !s.target_audience) return true;
        if (s.target_audience === 'department') {
          if (!dept || !s.target_departments) return false;
          try {
            const depts: string[] = JSON.parse(s.target_departments);
            return depts.includes(dept);
          } catch { return false; }
        }
        return true;
      });
    } else {
      // Pandangan konsol HR: seluruh survei, termasuk yang non-aktif. Karena
      // isinya termasuk survei yang belum/sudah tidak terbit, izinnya diperiksa
      // — sebelumnya cukup memanggil tanpa parameter apa pun untuk melihat
      // semuanya.
      const denied = await assertSurveyAdmin(userId);
      if (denied) return denied;

      const res = await db.execute("SELECT * FROM surveys ORDER BY published_at DESC");
      surveys = res.rows as any[];
    }

    // Always check if user already responded (if userId is provided)
    let respondedIds = new Set();
    if (userId) {
      const responseCheck = await db.execute({
        sql: `SELECT survey_id FROM survey_responses WHERE user_id = ?`,
        args: [userId]
      });
      respondedIds = new Set((responseCheck.rows as any[]).map(r => String(r.survey_id)));
    }

    // Parse JSON and map output
    surveys = surveys.map(s => ({
      ...s,
      hasResponded: respondedIds.has(String(s.id)),
      publishedAt: s.published_at,
      questions: s.questions ? JSON.parse(s.questions) : [],
      target_departments: s.target_departments ? JSON.parse(s.target_departments) : [],
    }));

    return NextResponse.json({ surveys });
  } catch (error) {
    console.error("Fetch Surveys Error:", error);
    return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 });
  }
}

// POST create survey (internal builder)
export async function POST(request: Request) {
  try {
    const { title, description, deadline, target_audience, target_departments, questions, created_by } = await request.json();
    
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Judul dan minimal 1 pertanyaan diperlukan' }, { status: 400 });
    }

    /*
     * Pembuat survei diambil dari cookie, bukan dari `created_by` di body.
     * Field itu sekaligus menjadi subjek pemeriksaan izin, jadi mengirim id HR
     * di sana cukup untuk menerbitkan survei atas nama HR.
     */
    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;
    const denied = await assertSurveyAdmin(actor.userId);
    if (denied) return denied;

    await db.execute({
      sql: `INSERT INTO surveys (title, description, deadline, target_audience, target_departments, questions, created_by, published_at, status, url, response_count) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 'active', '', 0)`,
      args: [
        title,
        description || null,
        deadline || null,
        target_audience || 'company',
        target_departments ? JSON.stringify(target_departments) : null,
        JSON.stringify(questions),
        actor.userId,
      ]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Create Survey Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to create survey' }, { status: 500 });
  }
}

// PUT update survey
export async function PUT(request: Request) {
  try {
    const { id, title, description, deadline, target_audience, target_departments, questions, status, requesterId } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;
    void requesterId; // dipertahankan di destructuring supaya klien lama tidak error
    const denied = await assertSurveyAdmin(actor.userId);
    if (denied) return denied;

    await db.execute({
      sql: `UPDATE surveys SET title = ?, description = ?, deadline = ?, target_audience = ?, target_departments = ?, questions = ?, status = ? WHERE id = ?`,
      args: [
        title,
        description || null,
        deadline || null,
        target_audience || 'company',
        target_departments ? JSON.stringify(target_departments) : null,
        questions ? JSON.stringify(questions) : null,
        status || 'active',
        id
      ]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update Survey Error:", error);
    return NextResponse.json({ error: 'Failed to update survey' }, { status: 500 });
  }
}

// DELETE survey
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;
    const denied = await assertSurveyAdmin(actor.userId);
    if (denied) return denied;

    // Also delete responses
    await db.execute({ sql: "DELETE FROM survey_responses WHERE survey_id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM surveys WHERE id = ?", args: [id] });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Survey Error:", error);
    return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 });
  }
}

