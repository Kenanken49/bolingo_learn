// Supabase Edge Function: explain-answer (Duolingo Max "Explain My Answer").
//
// A wrong quiz answer calls this with { prompt, yourAnswer, correctAnswer }.
// A cost-effective LLM replies with a 2-sentence, beginner-kind explanation
// of the missed idea. Tiny completions (max 150 tokens) keep it near-free.
// Deploy with: supabase functions deploy explain-answer
// Requires secret: LLM_API_KEY. Honors LLM_BASE_URL / LLM_MODEL overrides.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const LLM_BASE_URL = Deno.env.get('LLM_BASE_URL') ?? 'https://api.deepseek.com/chat/completions';
const LLM_MODEL = Deno.env.get('LLM_MODEL') ?? 'deepseek-chat';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Reasoning-model safe: some local/self-hosted models (DeepSeek R1 family
 * via Ollama) put chain-of-thought in `reasoning`/`reasoning_content` or
 * inline `<think>` tags instead of `content`. Prefer real content, fall back
 * to the reasoning fields, and always strip leaked thought blocks so
 * learners never see the model's inner monologue.
 */
function cleanModelText(data: {
  choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown } }>;
}): string {
  const msg = data.choices?.[0]?.message ?? {};
  const pick = (v: unknown) => (typeof v === 'string' ? v : '');
  const raw = pick(msg.content) || pick(msg.reasoning_content) || pick(msg.reasoning);
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { prompt, yourAnswer, correctAnswer } = (await req.json()) as {
      prompt?: string;
      yourAnswer?: string;
      correctAnswer?: string;
    };
    if (!prompt || !yourAnswer) return json({ error: 'Missing prompt or yourAnswer.' }, 400);

    const apiKey = Deno.env.get('LLM_API_KEY') ?? '';
    if (!apiKey) throw new Error('Missing LLM_API_KEY secret.');

    const res = await fetch(LLM_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a kind, encouraging coding tutor for absolute beginners. The student just got a quiz question wrong. In at most 2 short sentences, explain the core idea they missed and nudge them toward the right mental model. Plain language, no code dumps, no jargon, no condescension.',
          },
          {
            role: 'user',
            content: `Question: ${prompt}\nStudent answered: ${yourAnswer}\nCorrect answer: ${correctAnswer ?? '(not provided)'}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.5,
      }),
    });
    if (!res.ok) throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const explanation: string = cleanModelText(data);
    if (!explanation) throw new Error('LLM returned an empty explanation.');
    return json({ explanation });
  } catch (e) {
    console.error('explain-answer failed:', e);
    return json({ error: String(e) }, 500);
  }
});
