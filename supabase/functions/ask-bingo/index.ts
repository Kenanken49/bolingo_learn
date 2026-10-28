// Supabase Edge Function: ask-bingo ("Super Intelligent" help button).
//
// A stuck learner taps "Ask Bingo" on any lesson path with a free-text
// question. The call carries lesson context (course, lesson, current
// question) so Bingo answers in context instead of generically.
// Slightly roomier than explain-answer (max 250 tokens, up to 4 short
// sentences) since the learner asked, not failed.
// Deploy with: supabase functions deploy ask-bingo
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { question, context } = (await req.json()) as {
      question?: string;
      context?: { lessonTitle?: string; prompt?: string };
    };
    if (!question || !question.trim()) return json({ error: 'Missing question.' }, 400);

    const apiKey = Deno.env.get('LLM_API_KEY') ?? '';
    if (!apiKey) throw new Error('Missing LLM_API_KEY secret.');

    const where = [context?.lessonTitle, context?.prompt].filter(Boolean).join(' — ');
    const res = await fetch(LLM_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
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
        max_tokens: 250,
        temperature: 0.6,
      }),
    });
    if (!res.ok) throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const answer: string = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!answer) throw new Error('LLM returned an empty answer.');
    return json({ answer });
  } catch (e) {
    console.error('ask-bingo failed:', e);
    return json({ error: String(e) }, 500);
  }
});
