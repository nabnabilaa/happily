import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { internalHeaders } from "@/lib/authSession";
import { db } from "@/lib/db";
import { wibDayOfWeek } from "@/lib/timeUtils";

// GET: Cron endpoint — Friday weekly review
// 1. Remind managers to do weekly review
// 2. Auto-trigger AI weekly summary generation for each manager's team
// Call this Friday at 09:00 via cron
export async function GET(request: Request) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only run on Friday (day 5) — Jumat menurut WIB. Dengan jam server UTC,
    // Jumat 00:00–07:00 WIB masih terbaca Kamis dan Sabtu dini hari WIB masih
    // terbaca Jumat, jadi penjaga ini meleset di kedua ujungnya.
    if (wibDayOfWeek() !== 5) {
      return NextResponse.json({ message: "Not Friday, skipping", sent: 0 });
    }

    // Get all managers
    const managersRes = await db.execute("SELECT id, name FROM users WHERE role = 'manager'");
    
    let sent = 0;
    let aiGenerated = 0;

    for (const m of managersRes.rows) {
      const managerId = String(m.id);
      
      // 1. Send reminder notification
      const notifId = "n_fri_" + Date.now().toString(36) + "_" + sent;
      await db.execute({
        sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
        args: [notifId, managerId, "📋 Weekly Review Hari Ini", "Saatnya review task & KPI tim kamu minggu ini. Rangkuman AI sudah tersedia.", "action"]
      });
      sent++;

      // 2. Auto-trigger AI weekly summary
      try {
        /*
         * Alamatnya diambil dari permintaan yang sedang berjalan, bukan dari
         * env. Baris sebelumnya berbunyi:
         *
         *   NEXT_PUBLIC_BASE_URL || VERCEL_URL ? `https://${VERCEL_URL}` : ...
         *
         * `||` mengikat lebih kuat daripada `?:`, jadi yang diuji adalah "salah
         * satu env terisi" sementara yang dipakai SELALU `VERCEL_URL`. Di
         * hosting non-Vercel variabel itu tidak pernah ada, dan alamatnya jadi
         * "https://undefined" — fetch-nya gagal, tapi kegagalannya ditelan
         * `catch` di bawah dan cron tetap melaporkan dirinya berhasil.
         *
         * Origin permintaan selalu benar karena panggilan ini kembali ke server
         * yang sama, di port yang sama, apa pun hostingnya.
         */
        const baseUrl = new URL(request.url).origin;

        const res = await fetch(`${baseUrl}/api/ai/weekly-summary`, {
          method: 'POST',
          // Panggilan antar-route tidak membawa cookie siapa pun. Tanpa penanda
          // internal, endpoint ringkasan menolaknya 401 sejak identitas tidak
          // lagi boleh datang dari body.
          headers: { 'Content-Type': 'application/json', ...internalHeaders() },
          body: JSON.stringify({ managerId })
        });
        if (!res.ok) throw new Error(`weekly-summary balas ${res.status}`);
        aiGenerated++;
      } catch (e) {
        console.warn(`AI summary generation failed for manager ${managerId}:`, e);
      }
    }

    // Also send summary to all employees about their weekly performance
    const employeesRes = await db.execute("SELECT id, name FROM users WHERE role = 'employee'");
    for (const emp of employeesRes.rows) {
      const empNotifId = "n_fri_emp_" + Date.now().toString(36) + "_" + sent;
      try {
        await db.execute({
          sql: "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
          args: [empNotifId, String(emp.id), "📊 Refleksi Mingguan", "Jumat! Saatnya review pencapaian minggu ini. Buka logbook untuk melihat ringkasan.", "info"]
        });
      } catch (e) { /* ignore */ }
    }

    return NextResponse.json({ 
      message: `Friday review complete. ${sent} manager notifs, ${aiGenerated} AI summaries generated.`,
      sent,
      aiGenerated
    });
  } catch (error: any) {
    console.error("Cron Friday Error:", error);
    return NextResponse.json({ error: "Cron failed", details: error.message }, { status: 500 });
  }
}

