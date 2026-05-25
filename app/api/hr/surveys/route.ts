import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all surveys — with optional targeting filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const dept = searchParams.get('dept');

    let surveys: any[];

    if (userId && dept) {
      // Employee/Manager view — filter by target audience
      const res = await db.execute(
        `SELECT * FROM surveys WHERE status = 'active' ORDER BY published_at DESC`
      );
      // Filter in JS for targeting logic
      surveys = (res.rows as any[]).filter(s => {
        if (s.target_audience === 'company' || !s.target_audience) return true;
        if (s.target_audience === 'department' && s.target_departments) {
          try {
            const depts: string[] = JSON.parse(s.target_departments);
            return depts.includes(dept);
          } catch { return true; }
        }
        return true;
      });
    } else {
      // HR view — show all
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
        created_by || null,
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
    const { id, title, description, deadline, target_audience, target_departments, questions, status } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

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

    // Also delete responses
    await db.execute({ sql: "DELETE FROM survey_responses WHERE survey_id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM surveys WHERE id = ?", args: [id] });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Survey Error:", error);
    return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 });
  }
}

