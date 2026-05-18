import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, systemPrompt, history } = await request.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not found' }, { status: 500 });
    }

    const messages = [
      { role: 'system', content: systemPrompt || 'You are Flow, a friendly, empathetic AI coach for the platform "Flow Productivity". Users are employees. Your tone is humanist, Society 5.0 (well-being prioritized over corporate pressure), supportive, and clear. Help users achieve their state of flow. Avoid corporate jargon. Use emojis sparingly but effectively.' },
      ...(history || []),
      { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // or gpt-4-turbo
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
