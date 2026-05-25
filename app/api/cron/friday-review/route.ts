import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Cron endpoint — Friday weekly review
// 1. Remind managers to do weekly review
// 2. Auto-trigger AI weekly summary generation for each manager's team
// Call this Friday at 09:00 via cron
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only run on Friday (day 5)
    if (new Date().getDay() !== 5) {
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
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
        
        await fetch(`${baseUrl}/api/ai/weekly-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ managerId })
        });
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

