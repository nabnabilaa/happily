import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, systemPrompt, history } = await request.json();
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (geminiApiKey) {
      const contents = [];
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          if (msg.role === 'system') continue;
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content || msg.text || '' }]
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const body: any = {
        contents,
        generationConfig: { temperature: 0.7 }
      };

      const systemText = systemPrompt || 'You are Flow, a friendly, empathetic AI coach for the platform "Flow Productivity". Users are employees. IMPORTANT: You MUST ALWAYS communicate in Indonesian (Bahasa Indonesia) regardless of the user\'s language. Your tone is humanist, Society 5.0 (well-being prioritized over corporate pressure), supportive, and clear. Help users achieve their state of flow. Avoid corporate jargon. Use emojis sparingly but effectively.';
      body.systemInstruction = {
        parts: [{ text: systemText }]
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 500 });
      }

      return NextResponse.json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' });
    }

    if (!openAiApiKey) {
      return NextResponse.json({ error: 'API Key not found' }, { status: 500 });
    }

      const messages = [
      { role: 'system', content: systemPrompt || 'You are Flow, a friendly, empathetic AI coach for the platform "Flow Productivity". Users are employees. IMPORTANT: You MUST ALWAYS communicate in Indonesian (Bahasa Indonesia) regardless of the user\'s language. Your tone is humanist, Society 5.0 (well-being prioritized over corporate pressure), supportive, and clear. Help users achieve their state of flow. Avoid corporate jargon. Use emojis sparingly but effectively.' },
      ...(history || []),
      { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    return NextResponse.json({ text: data.choices[0].message.content });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 });
  }
}
