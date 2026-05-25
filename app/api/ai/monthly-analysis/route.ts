import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// POST: Generate AI monthly analysis comparing results vs KPIs
export async function POST(request: Request) {
  try {
    const { managerId, month, year } = await request.json();
    if (!managerId) return NextResponse.json({ error: "managerId required" }, { status: 400 });

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    // Get team members
    const membersRes = await db.execute({
      sql: "SELECT id, name, department, job_title FROM users WHERE manager_id = ?",
      args: [managerId]
    });

    if (membersRes.rows.length === 0) {
      return NextResponse.json({ error: "No team members found" }, { status: 404 });
    }

    const analyses: any[] = [];

    for (const member of membersRes.rows) {
      const memberId = String(member.id);

      // Tasks this month
      const tasksRes = await db.execute({
        sql: `SELECT COUNT(*) as total, 
              SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN proof_link IS NOT NULL AND proof_link != '' THEN 1 ELSE 0 END) as with_links,
              SUM(CASE WHEN is_project = 1 THEN 1 ELSE 0 END) as projects
              FROM daily_priorities 
              WHERE user_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?`,
        args: [memberId, targetMonth, targetYear]
      });

      // Attendance
      const attendRes = await db.execute({
        sql: `SELECT COUNT(*) as days FROM attendance 
              WHERE user_id = ? AND MONTH(check_in_at) = ? AND YEAR(check_in_at) = ?`,
        args: [memberId, targetMonth, targetYear]
      });

      // KPIs assigned
      const kpiRes = await db.execute({
        sql: `SELECT mk.*, 
              (SELECT SUM(kdi.value) FROM kpi_daily_inputs kdi WHERE kdi.kpi_id = mk.id AND MONTH(kdi.date) = ? AND YEAR(kdi.date) = ?) as actual_value,
              (SELECT COUNT(*) FROM task_kpi_links tkl WHERE tkl.kpi_id = mk.id AND tkl.status = 'approved') as approved_tasks
              FROM monthly_kpis mk 
              WHERE mk.assigned_to = ? AND mk.month = ? AND mk.year = ?`,
        args: [targetMonth, targetYear, memberId, targetMonth, targetYear]
      });

      // Weekly summaries this month
      const weekliesRes = await db.execute({
        sql: `SELECT summary_text, score FROM ai_weekly_summaries 
              WHERE user_id = ? AND MONTH(week_start) = ? AND YEAR(week_start) = ?
              ORDER BY week_start ASC`,
        args: [memberId, targetMonth, targetYear]
      });

      const totalTasks = Number(tasksRes.rows[0]?.total) || 0;
      const doneTasks = Number(tasksRes.rows[0]?.done) || 0;
      const withLinks = Number(tasksRes.rows[0]?.with_links) || 0;
      const projects = Number(tasksRes.rows[0]?.projects) || 0;
      const attendDays = Number(attendRes.rows[0]?.days) || 0;
      const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      const kpiAnalysis = kpiRes.rows.map(k => ({
        title: k.title,
        targetDescription: k.target_description,
        weight: Number(k.weight),
        kpiType: k.kpi_type,
        metricUnit: k.metric_unit,
        metricTarget: Number(k.metric_target) || 0,
        actualValue: Number(k.actual_value) || 0,
        approvedTasks: Number(k.approved_tasks) || 0,
        achievement: k.kpi_type === 'metric' && Number(k.metric_target) > 0
          ? Math.round((Number(k.actual_value) / Number(k.metric_target)) * 100)
          : completionRate,
      }));

      // Calculate weighted KPI score
      let totalWeight = 0;
      let weightedScore = 0;
      kpiAnalysis.forEach(k => {
        totalWeight += k.weight;
        weightedScore += (k.achievement * k.weight) / 100;
      });
      const kpiScore = totalWeight > 0 ? Math.round(weightedScore) : completionRate;

      // Generate AI analysis
      let aiAnalysis = '';
      try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        const openAiApiKey = process.env.OPENAI_API_KEY;
        const prompt = buildMonthlyPrompt({
          name: String(member.name),
          department: String(member.department || ''),
          jobTitle: String(member.job_title || ''),
          month: targetMonth, year: targetYear,
          totalTasks, doneTasks, withLinks, projects, attendDays, completionRate,
          kpiAnalysis,
          weeklyScores: weekliesRes.rows.map(r => Number(r.score)),
        });

        if (geminiApiKey) {
          const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: 'Kamu adalah AI HR analyst senior. Buat analisa kinerja bulanan karyawan vs KPI dalam bahasa Indonesia. Format: ringkasan umum, analisa per KPI, kekuatan, area improvement, dan rekomendasi. Maksimal 8 kalimat.' }]
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
          aiAnalysis = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else if (openAiApiKey) {
          const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: 'Kamu adalah AI HR analyst senior. Buat analisa kinerja bulanan karyawan vs KPI dalam bahasa Indonesia. Format: ringkasan umum, analisa per KPI, kekuatan, area improvement, dan rekomendasi. Maksimal 8 kalimat.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
            })
          });
          const aiData = await aiRes.json();
          aiAnalysis = aiData.choices?.[0]?.message?.content || '';
        }
      } catch (e) { /* AI call failed */ }

      if (!aiAnalysis) {
        aiAnalysis = `${member.name} menyelesaikan ${doneTasks}/${totalTasks} task (${completionRate}%) dengan skor KPI ${kpiScore}/100. Kehadiran ${attendDays} hari. ${kpiScore >= 80 ? 'Performa sangat baik!' : kpiScore >= 60 ? 'Performa cukup, perlu optimasi.' : 'Performa di bawah target, perlu evaluasi.'}`;
      }

      // Save analysis
      const analysisId = "ma_" + uuidv4().substring(0, 8);
      try {
        await db.execute({
          sql: `INSERT INTO ai_monthly_analyses (id, user_id, month, year, analysis_text)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE analysis_text = VALUES(analysis_text)`,
          args: [analysisId, memberId, targetMonth, targetYear, aiAnalysis]
        });
      } catch (e) { console.warn("Save analysis error:", e); }

      analyses.push({
        userId: memberId,
        name: member.name,
        department: member.department,
        jobTitle: member.job_title,
        totalTasks, doneTasks, withLinks, projects, attendDays, completionRate,
        kpiScore,
        kpiAnalysis,
        aiAnalysis,
      });
    }

    return NextResponse.json({
      success: true,
      month: targetMonth, year: targetYear,
      memberCount: membersRes.rows.length,
      analyses
    });
  } catch (error: any) {
    console.error("Monthly Analysis Error:", error);
    return NextResponse.json({ error: "Failed to generate analysis", details: error.message }, { status: 500 });
  }
}

function buildMonthlyPrompt(data: any): string {
  let prompt = `Analisa kinerja BULANAN karyawan berikut:\n`;
  prompt += `Nama: ${data.name} | ${data.jobTitle} (${data.department})\n`;
  prompt += `Bulan: ${data.month}/${data.year}\n\n`;
  prompt += `DATA TASK:\n`;
  prompt += `- Total: ${data.totalTasks}, Selesai: ${data.doneTasks} (${data.completionRate}%)\n`;
  prompt += `- Dengan bukti link: ${data.withLinks}\n`;
  prompt += `- Project: ${data.projects}\n`;
  prompt += `- Kehadiran: ${data.attendDays} hari\n\n`;

  if (data.kpiAnalysis.length > 0) {
    prompt += `DATA KPI:\n`;
    data.kpiAnalysis.forEach((k: any) => {
      prompt += `- ${k.title} (bobot ${k.weight}%): `;
      if (k.kpiType === 'metric') {
        prompt += `Target: ${k.metricTarget} ${k.metricUnit}, Actual: ${k.actualValue} ${k.metricUnit} (${k.achievement}%)\n`;
      } else if (k.kpiType === 'content') {
        prompt += `Output: ${k.actualValue} konten, Achievement: ${k.achievement}%\n`;
      } else {
        prompt += `Task approved: ${k.approvedTasks}, Achievement: ${k.achievement}%\n`;
      }
    });
  }

  if (data.weeklyScores.length > 0) {
    prompt += `\nSKOR MINGGUAN: ${data.weeklyScores.join(', ')}\n`;
  }

  prompt += `\nBerikan analisa komprehensif: ringkasan, per-KPI review, kekuatan, area improvement, rekomendasi.`;
  return prompt;
}

