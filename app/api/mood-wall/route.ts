import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// The mood_wall_posts table is now initialized centrally in app/api/migrate-schema/route.ts

export async function GET() {
  try {
    const result = await db.execute(`SELECT * FROM mood_wall_posts WHERE DATE(created_at) = CURDATE() ORDER BY created_at DESC LIMIT 50`);
    return NextResponse.json({ posts: result.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { mood, content, department } = await req.json();

    if (!mood || !content || !department) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. FAST LOCAL REGEX FILTER (0 Tokens)
    const badWords = ["babi", "anjing", "bangsat", "tolol", "goblok", "kontol", "memek", "bgst", "ngentot", "idiot"];
    const lowerContent = content.toLowerCase();
    const hasBadWord = badWords.some(word => {
      // Regex untuk mendeteksi kata yang persis, atau ada di dalam string
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerContent);
    });

    if (hasBadWord) {
      return NextResponse.json({ error: "Pesan diblokir karena mengandung kata-kata tidak pantas (Sistem)." }, { status: 403 });
    }

    // 2. LENGTH CHECK BYPASS (0 Tokens)
    // Jika pesan kurang dari 15 karakter dan lolos badword, anggap aman untuk hemat token
    if (content.length < 15) {
      await db.execute(
        `INSERT INTO mood_wall_posts (mood, content, department) VALUES (?, ?, ?)`,
        [mood, content, department]
      );
      return NextResponse.json({ success: true, method: "bypass" });
    }

    // 3. AI CONTEXTUAL CHECK (using flash-8b for cost efficiency)
    if (apiKey) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
        const prompt = `Analyze the following text for a public anonymous company mood wall. 
Is this text toxic, abusive, containing hate speech, or severely bullying a specific individual?
Respond with ONLY "TOXIC" or "SAFE".

Text: "${content}"`;
        const result = await model.generateContent(prompt);
        const response = result.response.text().trim();
        if (response.includes('TOXIC')) {
          return NextResponse.json({ error: "Pesan diblokir karena berpotensi menyakiti orang lain atau melanggar aturan." }, { status: 403 });
        }
      } catch (e) {
        console.error("AI Moderation failed, bypassing...", e);
      }
    }

    await db.execute(
      `INSERT INTO mood_wall_posts (mood, content, department) VALUES (?, ?, ?)`,
      [mood, content, department]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
