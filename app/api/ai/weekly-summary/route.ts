import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/apiAuth";
import { v4 as uuidv4 } from "uuid";

// POST: Generate AI weekly summary for a team
export async function POST(request: Request) {
  try {
    /*
     * Manajer diambil dari cookie, bukan dari body. Endpoint ini merangkum
     * pekerjaan seluruh anggota tim seorang manajer — menyebut id manajer lain
     * cukup untuk membaca ringkasan timnya. Ia juga memanggil model AI, jadi
     * lubang yang sama membuat siapa pun bisa membebankan biaya ke akun ini.
     */
    const actor = await requireActor(request);
    if ("response" in actor) return actor.response;
    const managerId = actor.userId;

    const deptRes = await db.execute({ sql: "SELECT department FROM users WHERE id = ?", args: [managerId] });
    const managerDept = (deptRes.rows[0] as any)?.department || "";

    // Get team members
    const membersRes = await db.execute({
      sql: "SELECT id, name, department, job_title FROM users WHERE department = ? AND id != ?",
      args: [managerDept, managerId]
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

      // CATATAN PRIVASI: mood/wellbeing per orang SENGAJA tidak diambil di sini.
      // Rangkuman ini dibaca manager, dan kondisi emosional seseorang bukan
      // konsumsi atasan. Sinyal wellbeing hanya disajikan sebagai agregat tim
      // di bawah (lihat buildTeamWellbeing), tanpa bisa ditarik ke individu.

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
      const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      // Generate AI summary text
      const prompt = buildWeeklyPrompt({
        name: String(member.name),
        department: String(member.department || ''),
        jobTitle: String(member.job_title || ''),
        totalTasks, doneTasks, withLinks, attendDays, completionRate,
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
                parts: [{ text: WEEKLY_SYSTEM_PROMPT }]
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
              model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: WEEKLY_SYSTEM_PROMPT },
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

      // Save summary. `ai_weekly_summaries` tidak punya unique key (user_id, week_start),
      // jadi ON DUPLICATE KEY tidak pernah aktif dan tiap generate ulang menumpuk baris
      // baru. Hapus-lalu-tulis membuat operasi ini idempoten tanpa perlu ubah indeks
      // pada tabel yang mungkin sudah berisi duplikat.
      const summaryId = "ws_" + uuidv4().substring(0, 8);
      try {
        await db.execute({
          sql: `DELETE FROM ai_weekly_summaries WHERE user_id = ? AND week_start = ?`,
          args: [memberId, weekStart.toISOString().slice(0, 10)]
        });
        await db.execute({
          sql: `INSERT INTO ai_weekly_summaries (id, user_id, week_start, week_end, summary_text, score)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [summaryId, memberId, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10), aiSummary, completionRate]
        });
      } catch (e) { console.warn("Save summary error:", e); }

      summaries.push({
        userId: memberId,
        name: member.name,
        department: member.department,
        jobTitle: member.job_title,
        totalTasks, doneTasks, withLinks, attendDays, completionRate,
        aiSummary,
        kpiInputs: kpiRes.rows.map(r => ({
          title: r.kpi_title, value: Number(r.total_value), unit: r.metric_unit
        }))
      });
    }

    const teamWellbeing = await buildTeamWellbeing(
      membersRes.rows.map(r => String(r.id)),
      weekStart.toISOString().slice(0, 10),
      weekEnd.toISOString().slice(0, 10) + ' 23:59:59',
    );

    return NextResponse.json({
      success: true,
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      memberCount: membersRes.rows.length,
      summaries,
      teamWellbeing,
    });
  } catch (error: any) {
    console.error("Weekly Summary Error:", error);
    return NextResponse.json({ error: "Failed to generate summary", details: error.message }, { status: 500 });
  }
}

const WEEKLY_SYSTEM_PROMPT = `Kamu adalah AI HR analyst. Buat rangkuman kinerja mingguan karyawan dalam bahasa Indonesia, singkat, 3-4 kalimat. Berikan penilaian objektif dan saran actionable.

BATAS TEGAS: kamu hanya menilai HASIL KERJA. Kamu tidak menerima dan tidak boleh menyimpulkan apapun tentang kondisi emosional, mood, kesehatan mental, atau motivasi pribadi orang ini. Jangan menebak penyebab personal di balik angka. Kalau angkanya rendah, bahas hambatan kerja dan dukungan yang bisa diberikan — bukan karakter atau perasaannya.`;

// Sinyal wellbeing hanya boleh keluar sebagai agregat. Di bawah ambang ini satu
// jawaban masih bisa ditelusuri balik ke orangnya, jadi tidak ditampilkan sama sekali.
const MIN_RESPONDENTS_FOR_AGGREGATE = 5;
const STRAIN_MOODS = ['tired', 'stress', 'burnout', 'sad'];
const POSITIVE_MOODS = ['joy', 'calm'];

/**
 * Kesimpulan wellbeing SATU TIM, bukan per orang.
 * Manager berhak tahu apakah timnya sedang tertekan; manager tidak berhak tahu siapa.
 */
async function buildTeamWellbeing(memberIds: string[], from: string, to: string) {
  if (!memberIds.length) return { available: false, reason: "Belum ada anggota tim." };
  try {
    const placeholders = memberIds.map(() => '?').join(',');
    const res = await db.execute({
      sql: `SELECT mood_key, COUNT(*) as cnt, COUNT(DISTINCT user_id) as people
            FROM mood_checkins
            WHERE user_id IN (${placeholders}) AND created_at >= ? AND created_at <= ?
            GROUP BY mood_key`,
      args: [...memberIds, from, to],
    });

    const totalCheckins = res.rows.reduce((s, r: any) => s + Number(r.cnt), 0);
    const respondentsRes = await db.execute({
      sql: `SELECT COUNT(DISTINCT user_id) as people FROM mood_checkins
            WHERE user_id IN (${placeholders}) AND created_at >= ? AND created_at <= ?`,
      args: [...memberIds, from, to],
    });
    const respondents = Number((respondentsRes.rows[0] as any)?.people) || 0;

    if (respondents < MIN_RESPONDENTS_FOR_AGGREGATE || totalCheckins === 0) {
      return {
        available: false,
        reason: `Butuh minimal ${MIN_RESPONDENTS_FOR_AGGREGATE} anggota yang check-in agar tetap anonim. Minggu ini baru ${respondents}.`,
      };
    }

    const sumOf = (keys: string[]) => res.rows
      .filter((r: any) => keys.includes(String(r.mood_key)))
      .reduce((s, r: any) => s + Number(r.cnt), 0);

    const strainShare = Math.round((sumOf(STRAIN_MOODS) / totalCheckins) * 100);
    const positiveShare = Math.round((sumOf(POSITIVE_MOODS) / totalCheckins) * 100);

    return {
      available: true,
      respondents,
      positiveShare,
      strainShare,
      status: strainShare >= 50 ? 'perlu perhatian' : strainShare >= 30 ? 'waspada' : 'sehat',
      note: 'Angka tim, tanpa rincian per orang. Kondisi masing-masing anggota bersifat pribadi.',
    };
  } catch (e) {
    console.warn("buildTeamWellbeing error:", e);
    return { available: false, reason: "Data wellbeing tim belum bisa dihitung." };
  }
}

function buildWeeklyPrompt(data: any): string {
  let prompt = `Analisa kinerja mingguan karyawan berikut:\n`;
  prompt += `Nama: ${data.name}\n`;
  prompt += `Jabatan: ${data.jobTitle} (${data.department})\n`;
  prompt += `Task: ${data.doneTasks}/${data.totalTasks} selesai (${data.completionRate}%)\n`;
  prompt += `Task dengan link bukti: ${data.withLinks}\n`;
  prompt += `Kehadiran: ${data.attendDays}/5 hari\n`;
  if (data.kpiInputs?.length > 0) {
    prompt += `KPI Inputs minggu ini:\n`;
    data.kpiInputs.forEach((k: any) => {
      prompt += `  - ${k.title}: ${k.value} ${k.unit}\n`;
    });
  }
  prompt += `\nBerikan rangkuman 3-4 kalimat, penilaian, dan 1 saran spesifik.`;
  return prompt;
}

