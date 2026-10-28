// Supabase Edge Function: roleplay-chat (Duolingo Max "Roleplay").
//
// Conversational AI wrappers around the curriculum: pick a scenario, chat
// turn-by-turn. Stateless — the client sends the recent history each turn.
// Deploy with: supabase functions deploy roleplay-chat
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

const SCENARIOS: Record<string, string> = {
  'senior-dev':
    'You are a friendly senior web developer doing a code review with a junior learner who is studying HTML, CSS, and JavaScript basics. They will paste code or describe what they built. Give warm, specific feedback: one thing done well, one concrete fix with a tiny example, and one follow-up question. Keep replies under 120 words. Never be condescending.',
  'debug-duck':
    'You are a rubber duck on the learner\'s desk — they debug by explaining their HTML/CSS/JS problem to you. Never give the answer directly: ask short guiding questions that lead them to spot the bug themselves, one question at a time. Celebrate when they get it. Keep replies under 100 words.',
  interview:
    'You are a kind tech interviewer screening for junior HTML/CSS/JavaScript basics. Ask exactly one interview question per reply, starting easy and getting slightly harder. When they answer, give one-line feedback (correct / almost / not quite + the key idea) then ask the next question. Keep replies under 120 words.',
};

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

    const apiKey = Deno.env.get('LLM_API_KEY') ?? '';
    if (!apiKey) throw new Error('Missing LLM_API_KEY secret.');

    const res = await fetch(LLM_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'system', content: system }, ...turns],
        max_tokens: 250,
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const reply: string = cleanModelText(data);
    if (!reply) throw new Error('LLM returned an empty reply.');
    return json({ reply });
  } catch (e) {
    console.error('roleplay-chat failed:', e);
    return json({ error: String(e) }, 500);
  }
});
