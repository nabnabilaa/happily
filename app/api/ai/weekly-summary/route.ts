import { NextResponse } from "next/server";
import { db } from "@/lib/turso";
import { v4 as uuidv4 } from "uuid";

// POST: Generate AI weekly summary for a team
export async function POST(request: Request) {
  try {
    const { managerId } = await request.json();
    if (!managerId) return NextResponse.json({ error: "managerId required" }, { status: 400 });

    // Get team members
    const membersRes = await db.execute({
      sql: "SELECT id, name, department, job_title FROM users WHERE manager_id = ?",
      args: [managerId]
    });

    if (membersRes.rows.length === 0) {
      return NextResponse.json({ error: "No team members found" }, { status: 404 });
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday

    const summaries: any[] = [];

    for (const member of membersRes.rows) {
      const memberId = String(member.id);

      // Tasks this week
      const tasksRes = await db.execute({
        sql: `SELECT COUNT(*) as total, 
              SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN proof_link IS NOT NULL AND proof_link != '' THEN 1 ELSE 0 END) as with_links
              FROM daily_priorities 
              WHERE user_id = ? AND created_at >= ? AND created_at <= ?`,
        args: [memberId, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10) + ' 23:59:59']
      });

      // Attendance this week
      const attendRes = await db.execute({
        sql: `SELECT COUNT(*) as days FROM attendance 
              WHERE user_id = ? AND check_in_at >= ? AND check_in_at <= ?`,
        args: [memberId, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10) + ' 23:59:59']
      });

      // Mood this week
      const moodRes = await db.execute({
        sql: `SELECT mood_key, COUNT(*) as cnt FROM mood_checkins 
              WHERE user_id = ? AND created_at >= ? AND created_at <= ?
              GROUP BY mood_key ORDER BY cnt DESC LIMIT 1`,
        args: [memberId, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10) + ' 23:59:59']
      });

      // KPI daily inputs this week
      const kpiRes = await db.execute({
        sql: `SELECT SUM(kdi.value) as total_value, mk.title as kpi_title, mk.metric_unit
              FROM kpi_daily_inputs kdi
              JOIN monthly_kpis mk ON kdi.kpi_id = mk.id
              WHERE kdi.user_id = ? AND kdi.date >= ? AND kdi.date <= ?
              GROUP BY kdi.kpi_id`,
        args: [memberId, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10)]
      });

      const totalTasks = Number(tasksRes.rows[0]?.total) || 0;
      const doneTasks = Number(tasksRes.rows[0]?.done) || 0;
      const withLinks = Number(tasksRes.rows[0]?.with_links) || 0;
      const attendDays = Number(attendRes.rows[0]?.days) || 0;
      const dominantMood = moodRes.rows[0]?.mood_key || 'unknown';
      const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      // Generate AI summary text
      const prompt = buildWeeklyPrompt({
        name: String(member.name),
        department: String(member.department || ''),
        jobTitle: String(member.job_title || ''),
        totalTasks, doneTasks, withLinks, attendDays, dominantMood, completionRate,
        kpiInputs: kpiRes.rows.map(r => ({
          title: String(r.kpi_title),
          value: Number(r.total_value),
          unit: String(r.metric_unit || '')
        }))
      });

      let aiSummary = '';
      try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        const openAiApiKey = process.env.OPENAI_API_KEY;
        if (geminiApiKey) {
          const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: 'Kamu adalah AI HR analyst. Buat rangkuman kinerja mingguan karyawan dalam bahasa Indonesia, singkat, 3-4 kalimat. Berikan penilaian objektif dan saran actionable.' }]
              },
              contents: [{
                role: 'user',
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                temperature: 0.7,
              }
            })
          });
          const aiData = await aiRes.json();
          aiSummary = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else if (openAiApiKey) {
          const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: 'Kamu adalah AI HR analyst. Buat rangkuman kinerja mingguan karyawan dalam bahasa Indonesia, singkat, 3-4 kalimat. Berikan penilaian objektif dan saran actionable.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
            })
          });
          const aiData = await aiRes.json();
          aiSummary = aiData.choices?.[0]?.message?.content || '';
        }
      } catch (e) { /* AI call failed — continue without summary */ }

      // Fallback if no AI
      if (!aiSummary) {
        aiSummary = `${member.name}: ${doneTasks}/${totalTasks} task selesai (${completionRate}%), hadir ${attendDays}/5 hari. ${completionRate >= 80 ? 'Performa sangat baik!' : completionRate >= 50 ? 'Perlu sedikit dorongan.' : 'Perlu perhatian khusus.'}`;
      }

      // Save summary
      const summaryId = "ws_" + uuidv4().substring(0, 8);
      try {
        await db.execute({
          sql: `INSERT INTO ai_weekly_summaries (id, user_id, week_start, week_end, summary_text, score)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE summary_text = VALUES(summary_text), score = VALUES(score)`,
          args: [summaryId, memberId, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10), aiSummary, completionRate]
        });
      } catch (e) { console.warn("Save summary error:", e); }

      summaries.push({
        userId: memberId,
        name: member.name,
        department: member.department,
        jobTitle: member.job_title,
        totalTasks, doneTasks, withLinks, attendDays, dominantMood, completionRate,
        aiSummary,
        kpiInputs: kpiRes.rows.map(r => ({
          title: r.kpi_title, value: Number(r.total_value), unit: r.metric_unit
        }))
      });
    }

    return NextResponse.json({
      success: true,
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      memberCount: membersRes.rows.length,
      summaries
    });
  } catch (error: any) {
    console.error("Weekly Summary Error:", error);
    return NextResponse.json({ error: "Failed to generate summary", details: error.message }, { status: 500 });
  }
}

function buildWeeklyPrompt(data: any): string {
  let prompt = `Analisa kinerja mingguan karyawan berikut:\n`;
  prompt += `Nama: ${data.name}\n`;
  prompt += `Jabatan: ${data.jobTitle} (${data.department})\n`;
  prompt += `Task: ${data.doneTasks}/${data.totalTasks} selesai (${data.completionRate}%)\n`;
  prompt += `Task dengan link bukti: ${data.withLinks}\n`;
  prompt += `Kehadiran: ${data.attendDays}/5 hari\n`;
  prompt += `Mood dominan: ${data.dominantMood}\n`;
  if (data.kpiInputs?.length > 0) {
    prompt += `KPI Inputs minggu ini:\n`;
    data.kpiInputs.forEach((k: any) => {
      prompt += `  - ${k.title}: ${k.value} ${k.unit}\n`;
    });
  }
  prompt += `\nBerikan rangkuman 3-4 kalimat, penilaian, dan 1 saran spesifik.`;
  return prompt;
}
