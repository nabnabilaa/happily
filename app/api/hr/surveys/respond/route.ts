import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Submit survey response
export async function POST(request: Request) {
  try {
    const { surveyId, userId, answers } = await request.json();

    if (!surveyId || !userId || !answers) {
      return NextResponse.json({ error: 'surveyId, userId, dan answers diperlukan' }, { status: 400 });
    }

    // Check if already responded
    const existing = await db.execute({
      sql: "SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ?",
      args: [surveyId, userId]
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Kamu sudah mengisi survey ini' }, { status: 409 });
    }

    // Insert response
    await db.execute({
      sql: "INSERT INTO survey_responses (survey_id, user_id, answers) VALUES (?, ?, ?)",
      args: [surveyId, userId, JSON.stringify(answers)]
    });

    // Increment response count
    await db.execute({
      sql: "UPDATE surveys SET response_count = COALESCE(response_count, 0) + 1 WHERE id = ?",
      args: [surveyId]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Submit Survey Response Error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Kamu sudah mengisi survey ini' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan jawaban' }, { status: 500 });
  }
}

