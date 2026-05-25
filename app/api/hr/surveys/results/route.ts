import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get all responses for a survey (HR only)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get('surveyId');
    const requesterId = searchParams.get('requesterId');

    if (!surveyId) {
      return NextResponse.json({ error: 'surveyId diperlukan' }, { status: 400 });
    }

    // Verify requester is HR
    if (requesterId) {
      const userCheck = await db.execute({
        sql: "SELECT role FROM users WHERE id = ?",
        args: [requesterId]
      });
      if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'hr') {
        return NextResponse.json({ error: 'Hanya HR yang bisa melihat hasil survey' }, { status: 403 });
      }
    }

    // Get survey info
    const surveyRes = await db.execute({
      sql: "SELECT * FROM surveys WHERE id = ?",
      args: [surveyId]
    });

    if (surveyRes.rows.length === 0) {
      return NextResponse.json({ error: 'Survey tidak ditemukan' }, { status: 404 });
    }

    const survey = surveyRes.rows[0] as any;
    const questions = survey.questions ? JSON.parse(survey.questions) : [];

    // Get all responses with user info
    const responsesRes = await db.execute({
      sql: `SELECT sr.*, u.name as user_name, u.department as user_department
            FROM survey_responses sr
            JOIN users u ON sr.user_id = u.id
            WHERE sr.survey_id = ?
            ORDER BY sr.submitted_at DESC`,
      args: [surveyId]
    });

    const responses = (responsesRes.rows as any[]).map(r => ({
      ...r,
      answers: JSON.parse(r.answers),
    }));

    // Generate summary/aggregation per question
    const summary = questions.map((q: any) => {
      const questionAnswers = responses.map(r => {
        const ans = r.answers.find((a: any) => a.questionId === q.id);
        return ans?.answer;
      }).filter(Boolean);

      if (q.type === 'rating') {
        const nums = questionAnswers.map(Number).filter(n => !isNaN(n));
        const avg = nums.length > 0 ? nums.reduce((a: number, b: number) => a + b, 0) / nums.length : 0;
        return {
          questionId: q.id,
          question: q.question,
          type: q.type,
          totalAnswers: nums.length,
          average: Math.round(avg * 10) / 10,
          distribution: Array.from({ length: q.maxRating || 5 }, (_, i) => ({
            value: i + 1,
            count: nums.filter(n => n === i + 1).length
          }))
        };
      }

      if (q.type === 'yes_no' || q.type === 'multiple_choice') {
        const counts: Record<string, number> = {};
        questionAnswers.forEach((a: string) => { counts[a] = (counts[a] || 0) + 1; });
        return {
          questionId: q.id,
          question: q.question,
          type: q.type,
          totalAnswers: questionAnswers.length,
          distribution: Object.entries(counts).map(([value, count]) => ({ value, count }))
        };
      }

      // text / paragraph
      return {
        questionId: q.id,
        question: q.question,
        type: q.type,
        totalAnswers: questionAnswers.length,
        answers: questionAnswers.slice(0, 50) // limit to 50
      };
    });

    return NextResponse.json({
      survey: {
        ...survey,
        questions,
        target_departments: survey.target_departments ? JSON.parse(survey.target_departments) : [],
      },
      responses,
      summary,
      totalResponses: responses.length,
    });
  } catch (error) {
    console.error("Survey Results Error:", error);
    return NextResponse.json({ error: 'Gagal mengambil hasil survey' }, { status: 500 });
  }
}

