// Shared LLM helper. Uses Gemini (GEMINI_API_KEY) with OpenAI (OPENAI_API_KEY) fallback.
// Returns '' when no key is configured or the call fails — callers should provide a fallback.

export function hasAIKey(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

export async function generateAI(systemPrompt: string, userPrompt: string, opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
  const temperature = opts?.temperature ?? 0.7;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  try {
    if (geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature, ...(opts?.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}) },
        }),
      });
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }
    if (openAiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiKey}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    }
  } catch (e) {
    console.warn('generateAI error:', e);
  }
  return '';
}
