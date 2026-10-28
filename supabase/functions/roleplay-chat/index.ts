// Supabase Edge Function: roleplay-chat (Duolingo Max "Roleplay").
//
// Conversational AI wrappers around the curriculum: pick a scenario, chat
// turn-by-turn. Stateless — the client sends the recent history each turn.
//
// Primary brain = self-hosted VPS model (free, unlimited). Optional
// LLM_FALLBACK_URL / LLM_FALLBACK_KEY / LLM_FALLBACK_MODEL secrets route
// one retry to a hosted API (e.g. Groq free tier) when primary fails,
// times out, or answers empty. Fallback unset = primary-only behavior.
// Deploy with: supabase functions deploy roleplay-chat
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

const SCENARIOS: Record<string, string> = {
  'senior-dev':
    'You are a friendly senior web developer doing a code review with a junior learner who is studying HTML, CSS, and JavaScript basics. They will paste code or describe what they built. Give warm, specific feedback: one thing done well, one concrete fix with a tiny example, and one follow-up question. Keep replies under 120 words. Never be condescending.',
  'debug-duck':
    'You are a rubber duck on the learner\'s desk — they debug by explaining their HTML/CSS/JS problem to you. Never give the answer directly: ask short guiding questions that lead them to spot the bug themselves, one question at a time. Celebrate when they get it. Keep replies under 100 words.',
  interview:
    'You are a kind tech interviewer screening for junior HTML/CSS/JavaScript basics. Ask exactly one interview question per reply, starting easy and getting slightly harder. When they answer, give one-line feedback (correct / almost / not quite + the key idea) then ask the next question. Keep replies under 120 words.',
};

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
      if (!text) throw new Error('LLM returned an empty reply.');
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
    const { scenarioId, history } = (await req.json()) as {
      scenarioId?: string;
      history?: Array<{ role?: string; content?: string }>;
    };
    const system = scenarioId ? SCENARIOS[scenarioId] : undefined;
    if (!system) return json({ error: 'Unknown scenario. Pick senior-dev, debug-duck, or interview.' }, 400);
    const turns = (history ?? [])
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-20)
      .map((m) => ({ role: m.role as string, content: (m.content as string).slice(0, 2000) }));
    if (turns.length === 0 || turns[turns.length - 1].role !== 'user') {
      return json({ error: 'History must end with a user message.' }, 400);
    }

    const { text: reply, via } = await chatComplete(
      [{ role: 'system', content: system }, ...turns],
      600,
      0.7
    );
    return json({ reply, via });
  } catch (e) {
    console.error('roleplay-chat failed:', e);
    return json({ error: String(e) }, 500);
  }
});
