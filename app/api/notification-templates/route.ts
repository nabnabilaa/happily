import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Fetch all notification templates from the database
export async function GET() {
  try {
    const res = await db.execute("SELECT * FROM notification_templates ORDER BY category, trigger_key ASC");
    return NextResponse.json({ templates: res.rows });
  } catch (error: any) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates", details: error.message }, { status: 500 });
  }
}

// POST: Add or update a notification template
export async function POST(request: Request) {
  try {
    const { triggerKey, titleTemplate, messageTemplate, type, category } = await request.json();

    if (!triggerKey || !titleTemplate || !messageTemplate) {
      return NextResponse.json({ error: "triggerKey, titleTemplate, and messageTemplate are required" }, { status: 400 });
    }

    await db.execute({
      sql: `INSERT INTO notification_templates (trigger_key, title_template, message_template, type, category)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            title_template = VALUES(title_template),
            message_template = VALUES(message_template),
            type = VALUES(type),
            category = VALUES(category)`,
      args: [triggerKey, titleTemplate, messageTemplate, type || "info", category || "general"]
    });

    return NextResponse.json({ success: true, message: `Template '${triggerKey}' successfully upserted.` });
  } catch (error: any) {
    console.error("Failed to upsert template:", error);
    return NextResponse.json({ error: "Failed to upsert template", details: error.message }, { status: 500 });
  }
}

