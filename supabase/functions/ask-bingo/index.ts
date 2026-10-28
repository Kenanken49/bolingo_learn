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
  temperature: number,
  strongFirst = false
): Promise<{ text: string; via: string }> {
  const apiKey = Deno.env.get('LLM_API_KEY') ?? '';
  if (!apiKey) throw new Error('Missing LLM_API_KEY secret.');
  const attempts = [{ url: LLM_BASE_URL, key: apiKey, model: LLM_MODEL, via: 'primary' }];
  if (FALLBACK_URL && FALLBACK_KEY) {
    attempts.push({ url: FALLBACK_URL, key: FALLBACK_KEY, model: FALLBACK_MODEL, via: 'fallback' });
  }
  // Language banks try the strong brain first (1.5B misnames terms even
  // grounded); code lessons stay primary-first. Order swap only — coverage
  // is identical either way, and `via` records which brain answered.
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
    const { question, context, history } = (await req.json()) as {
      question?: string;
      context?: { lessonTitle?: string; prompt?: string; theory?: string; strongFirst?: boolean };
      history?: Array<{ role?: string; text?: string }>;
    };
    if (!question || !question.trim()) return json({ error: 'Missing question.' }, 400);

    const where = [context?.lessonTitle, context?.prompt].filter(Boolean).join(' — ');
    // Grounding: the self-hosted 1.5B recalls facts poorly but reads well.
    // Lesson theory ships with the request so the model copies facts instead
    // of inventing them (measured fix: "Sama" -> "Asante").
    const theory = (context?.theory ?? '').slice(0, 1500);
    const material = theory
      ? `Authoritative lesson material — base every factual claim on this, never contradict it:\n${theory}`
      : '';
    // Multi-turn thread: the sheet sends the conversation so far (latest
    // last), letting greetings and follow-ups behave like a real chat.
    // Falls back to the single question when the client sends no history.
    const thread = (Array.isArray(history) ? history : [])
      .filter((m) => m && typeof m.text === 'string' && m.text.trim())
      .slice(-10)
      .map((m) => ({
        role: m.role === 'bingo' ? 'assistant' : 'user',
        content: (m.text as string).slice(0, 1000),
      }));
    const convo =
      thread.length > 0 && thread[thread.length - 1].role === 'user'
        ? thread
        : [
            ...thread,
            {
              role: 'user',
              content: `Lesson context: ${where || 'general study'}\n${material}${material ? '\n' : ''}Student question: ${question.trim()}`,
            },
          ];
    // Grounding rides along in both modes: the single question carries it
    // inline, and a thread gets it prepended to its opening turn so the
    // small model reads facts instead of recalling them on every follow-up.
    const grounding = `Lesson context: ${where || 'general study'}\n${material}${material ? '\n' : ''}`;
    if (thread.length === 0) {
      convo[convo.length - 1].content = `${grounding}${convo[convo.length - 1].content}`;
    } else if (convo[0].role === 'user') {
      convo[0].content = `${grounding}${convo[0].content}`;
    }
    const { text: answer, via } = await chatComplete(
      [
        {
          role: 'system',              content:
                'You are Bingo, a warm, encouraging owl tutor inside the Bolingo learning app. You are having a continuous conversation — remember what the student already said. If the latest message is a greeting, thanks, goodbye, or small talk with no lesson question in it, just respond warmly in one or two sentences and invite their question. Never answer chit-chat with a quiz question or a guiding exercise question. When they do ask for help, answer directly in at most 4 short sentences: give a hint or the key idea, never just the bare answer — guide them to discover it. When lesson material is provided, treat it as authoritative: quote its facts and terms exactly. Plain language, no jargon, no condescension, one small encouragement at the end.',
          },
          ...convo,
      ],
      600,
      0.6,
      context?.strongFirst === true
    );
    return json({ answer, via });
  } catch (e) {
    console.error('ask-bingo failed:', e);
    return json({ error: String(e) }, 500);
  }
});
