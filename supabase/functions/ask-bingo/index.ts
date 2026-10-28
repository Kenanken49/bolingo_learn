// Supabase Edge Function: ask-bingo ("Super Intelligent" help button).
//
// A stuck learner taps "Ask Bingo" on any lesson path with a free-text
// question. The call carries lesson context (course, lesson, current
// question) so Bingo answers in context instead of generically.
// Slightly roomier than explain-answer (max 250 tokens, up to 4 short
// sentences) since the learner asked, not failed.
//
// Primary brain = self-hosted VPS model (free, unlimited). Optional
// LLM_FALLBACK_URL / LLM_FALLBACK_KEY / LLM_FALLBACK_MODEL secrets route
// one retry to a hosted API (e.g. Groq free tier) when primary fails,
// times out, or answers empty. Fallback unset = primary-only behavior.
// Deploy with: supabase functions deploy ask-bingo
// Requires: LLM_API_KEY. Honors LLM_BASE_URL / LLM_MODEL overrides.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const LLM_BASE_URL = Deno.env.get('LLM_BASE_URL') ?? 'https://api.deepseek.com/chat/completions';
const LLM_MODEL = Deno.env.get('LLM_MODEL') ?? 'deepseek-chat';
const FALLBACK_URL = Deno.env.get('LLM_FALLBACK_URL') ?? '';
const FALLBACK_KEY = Deno.env.get('LLM_FALLBACK_KEY') ?? '';
const FALLBACK_MODEL = Deno.env.get('LLM_FALLBACK_MODEL') ?? LLM_MODEL;

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
 * Learners must NEVER see chain-of-thought. Reasoning models (DeepSeek R1,
 * gpt-oss) expose thinking in `reasoning`/`reasoning_content` fields or
 * inline `<think>` blocks — all of it is discarded here. Only `content`
 * (the model's final answer) is surfaced; empty content counts as failure
 * so the caller falls through to the next backend, never to raw thinking.
 * (Proven Oct 28: gpt-oss-120b once returned empty content with full
 * reasoning — the old reasoning-fallback showed learners "We need to
 * respond as Bingo...". Never again.)
 */
function cleanModelText(data: {
  choices?: Array<{ message?: { content?: unknown } }>;
}): string {
  const msg = data.choices?.[0]?.message ?? {};
  const raw = typeof msg.content === 'string' ? msg.content : '';
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Primary-first completion with one fallback attempt. URLs never appear in
 * errors — the VPS path embeds its token, so failures stay generic.
 */
async function chatComplete(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<{ text: string; via: string }> {
  const apiKey = Deno.env.get('LLM_API_KEY') ?? '';
  if (!apiKey) throw new Error('Missing LLM_API_KEY secret.');
  const attempts = [{ url: LLM_BASE_URL, key: apiKey, model: LLM_MODEL, via: 'primary' }];
  if (FALLBACK_URL && FALLBACK_KEY) {
    attempts.push({ url: FALLBACK_URL, key: FALLBACK_KEY, model: FALLBACK_MODEL, via: 'fallback' });
  }
  let lastErr: unknown = new Error('No LLM backend configured.');
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${a.key}` },
        body: JSON.stringify({ model: a.model, messages, max_tokens: maxTokens, temperature }),
        // 30 s: VPS p99 is ~16-20 s (cold load + inference); beyond that the
        // learner is better served by the ~2 s fallback than by more waiting.
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`LLM request failed with status ${res.status}.`);
      const data = await res.json();
      const text = cleanModelText(data);
      if (!text) throw new Error('LLM returned an empty answer.');
      return { text, via: a.via };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { question, context } = (await req.json()) as {
      question?: string;
      context?: { lessonTitle?: string; prompt?: string };
    };
    if (!question || !question.trim()) return json({ error: 'Missing question.' }, 400);

    const where = [context?.lessonTitle, context?.prompt].filter(Boolean).join(' — ');
    const { text: answer, via } = await chatComplete(
      [
        {
          role: 'system',
          content:
            'You are Bingo, a warm, encouraging owl tutor inside the Bolingo learning app. The student is stuck on a lesson and asks for help. Answer their question directly in at most 4 short sentences: give a hint or the key idea, never just the bare answer — guide them to discover it. Plain language, no jargon, no condescension, one small encouragement at the end.',
        },
        {
          role: 'user',
          content: `Lesson context: ${where || 'general study'}\nStudent question: ${question.trim()}`,
        },
      ],
      600,
      0.6
    );
    return json({ answer, via });
  } catch (e) {
    console.error('ask-bingo failed:', e);
    return json({ error: String(e) }, 500);
  }
});
