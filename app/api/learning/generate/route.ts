import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API Key is missing" }, { status: 500 });
    }

    const body = await req.json();
    const { department = "Umum", mood = "neutral", lastActivity = "" } = body;

    // Determine context for AI
    let context = `Karyawan dari departemen ${department}.`;
    if (mood === 'stress' || mood === 'burnout' || mood === 'tired') {
      context += ` Saat ini ia sedang merasa kelelahan/stress. Fokus berikan materi tentang wellbeing, stress management, atau efisiensi kerja.`;
    } else {
      context += ` Berikan materi soft-skill atau hard-skill singkat yang berguna untuk departemennya.`;
    }

    const prompt = `Buatkan 1 modul micro-learning singkat (sekitar 3-4 slide) untuk karyawan dengan konteks: ${context}.
    
Kamu HARUS mengembalikan response HANYA DALAM FORMAT JSON yang valid tanpa markdown, tanpa teks sebelum/sesudahnya.
Format JSON:
{
  "title": "Judul Menarik Modul (Max 6 kata)",
  "topic": "Kategori Topik (Misal: Leadership, Wellbeing, dll)",
  "slides": [
    {
      "heading": "Judul Slide 1",
      "content": "Isi materi slide 1 (2-3 kalimat ringkas)",
      "emoji": "💡"
    },
    ... (buat 3-4 slide)
  ],
  "quiz": {
    "question": "Pertanyaan kuis pilihan ganda berdasarkan materi di atas",
    "options": ["Opsi 1", "Opsi 2", "Opsi 3", "Opsi 4"],
    "correctIndex": 0, // index dari jawaban yang benar (0-3)
    "explanation": "Penjelasan singkat kenapa jawaban itu benar"
  }
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    // Clean up potential markdown formatting from AI output
    if (text.startsWith("```json")) {
      text = text.substring(7);
    } else if (text.startsWith("```")) {
      text = text.substring(3);
    }
    if (text.endsWith("```")) {
      text = text.substring(0, text.length - 3);
    }

    const data = JSON.parse(text.trim());

    return NextResponse.json({ success: true, module: data });
  } catch (error: any) {
    console.error("Learning Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
