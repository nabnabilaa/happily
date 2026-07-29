// Shared LLM helper. Uses Gemini (GEMINI_API_KEY) with OpenAI (OPENAI_API_KEY) fallback.
// Returns '' when no key is configured or the call fails — callers should provide a fallback.

// Satu tempat untuk memilih model. Jangan sebar nama model ke route/lib lain —
// kalau mau ganti generasi, ganti di sini saja.
export const AI_MODELS = {
  /** Penalaran: narasi laporan, coaching, ekstraksi memori. */
  reasoning: 'gemini-2.5-flash',
  /** Klasifikasi/moderasi volume tinggi, jawaban pendek. */
  fast: 'gemini-1.5-flash-8b',
} as const;

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  /** Nama model Gemini. Default `AI_MODELS.reasoning`. */
  model?: string;
  /** Minta model membalas JSON murni — hilangkan kebutuhan strip ```json manual. */
  json?: boolean;
  /**
   * Jatah token berpikir Gemini 2.5. PENTING: `maxOutputTokens` mencakup token
   * berpikir, jadi tugas mekanis dengan maxTokens ketat akan terpotong di tengah
   * kalau thinking dibiarkan menyala. Set 0 untuk mematikannya (ekstraksi,
   * klasifikasi, moderasi). Biarkan kosong untuk tugas yang butuh penalaran.
   */
  thinkingBudget?: number;
}

export function hasAIKey(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

export async function generateAI(systemPrompt: string, userPrompt: string, opts?: GenerateOptions): Promise<string> {
  const temperature = opts?.temperature ?? 0.7;
  const model = opts?.model || AI_MODELS.reasoning;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  try {
    if (geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        // Key lewat header, bukan query string — query string ikut tercatat di access log/proxy.
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature,
            ...(opts?.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
            ...(opts?.json ? { responseMimeType: 'application/json' } : {}),
            ...(opts?.thinkingBudget != null ? { thinkingConfig: { thinkingBudget: opts.thinkingBudget } } : {}),
          },
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
          ...(opts?.json ? { response_format: { type: 'json_object' } } : {}),
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

/**
 * Sama seperti generateAI tapi memaksa hasilnya JSON dan mem-parse-nya.
 * Mengembalikan null (bukan throw) kalau model gagal / balasannya bukan JSON valid —
 * pemanggil wajib punya jalur fallback.
 */
export async function generateJSON<T>(systemPrompt: string, userPrompt: string, opts?: GenerateOptions): Promise<T | null> {
  const raw = await generateAI(systemPrompt, userPrompt, { ...opts, json: true });
  if (!raw) return null;
  // Sabuk pengaman: sebagian model tetap membungkus JSON dalam pagar markdown.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.warn('generateJSON: balasan model bukan JSON valid:', cleaned.slice(0, 200));
    return null;
  }
}
