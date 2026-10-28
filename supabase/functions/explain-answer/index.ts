// Supabase Edge Function: explain-answer (Duolingo Max "Explain My Answer").
//
// A wrong quiz answer calls this with { prompt, yourAnswer, correctAnswer }.
// A cost-effective LLM replies with a 2-sentence, beginner-kind explanation
// of the missed idea. Tiny completions (max 150 tokens) keep it near-free.
//
// Primary brain = self-hosted VPS model (free, unlimited). Optional
// LLM_FALLBACK_URL / LLM_FALLBACK_KEY / LLM_FALLBACK_MODEL secrets route
// one retry to a hosted API (e.g. Groq free tier) when primary fails,
// times out, or answers empty. Fallback unset = primary-only behavior.
// Deploy with: supabase functions deploy explain-answer
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
  temperature: number,
  strongFirst = false
): Promise<{ text: string; via: string }> {
  const apiKey = Deno.env.get('LLM_API_KEY') ?? '';
  if (!apiKey) throw new Error('Missing LLM_API_KEY secret.');
  const attempts = [{ url: LLM_BASE_URL, key: apiKey, model: LLM_MODEL, via: 'primary' }];
  if (FALLBACK_URL && FALLBACK_KEY) {
    attempts.push({ url: FALLBACK_URL, key: FALLBACK_KEY, model: FALLBACK_MODEL, via: 'fallback' });
  }
  // Language banks try the strong brain first; code lessons stay
  // primary-first. Order swap only — `via` records which brain answered.
  if (strongFirst && attempts.length === 2) attempts.reverse();
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
      if (!text) throw new Error('LLM returned an empty explanation.');
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
    const { prompt, yourAnswer, correctAnswer, theory, reference, strongFirst } = (await req.json()) as {
      prompt?: string;
      yourAnswer?: string;
      correctAnswer?: string;
      theory?: string;
      reference?: string;
      strongFirst?: boolean;
    };
    if (!prompt || !yourAnswer) return json({ error: 'Missing prompt or yourAnswer.' }, 400);
    // Grounding: the self-hosted 1.5B misnames concepts from memory
    // (measured: "present perfect"/"present continuous" for present simple).
    // Lesson theory + the bank's own teaching note ship with the request.
    const material = [(theory ?? '').slice(0, 1200), (reference ?? '').slice(0, 400)]
      .filter(Boolean)
      .join('\n');
    const grounding = material
      ? `Authoritative lesson material — hard constraint: when you name a rule, tense, or concept, copy the term VERBATIM from the material below. Never substitute a different term, even a similar-sounding one (e.g. if the material says "present simple", writing "present continuous" is wrong):\n${material}\n`
      : '';

    const { text: explanation, via } = await chatComplete(
      [
        {
          role: 'system',              content:
                'You are a kind, encouraging coding tutor for absolute beginners. The student just got a quiz question wrong. In at most 2 short sentences, explain the core idea they missed and nudge them toward the right mental model. When lesson material is provided, use its exact terminology. Plain language, no code dumps, no jargon, no condescension.',
          },
          {
            role: 'user',
            content: `${grounding}Question: ${prompt}\nStudent answered: ${yourAnswer}\nCorrect answer: ${correctAnswer ?? '(not provided)'}`,
          },
      ],
      400,
      0.5,
      strongFirst === true
    );
    return json({ explanation, via });
  } catch (e) {
    console.error('explain-answer failed:', e);
    return json({ error: String(e) }, 500);
  }
});
