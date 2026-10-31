// Supabase Edge Function: engineer-agent
//
// POST { trigger?: "manual" | "schedule" }
//
// Auth: either a signed-in owner JWT (profiles.is_admin) or the scoped
// x-engineer-cron-secret used by the scheduled GitHub workflow. The agent
// reads the platform snapshot with the service role, computes a deterministic
// health score, records a report, queues approvals, and emails the owner.
//
// Deploy: supabase functions deploy engineer-agent
// Secrets: LLM_* (same brain as Ask Bingo), optional fallback, and email
// delivery (NOTIFY_EMAIL_WEBHOOK_URL or RESEND_API_KEY), ENGINEER_CRON_SECRET.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { runEngineer } from '../_shared/engineerAgent.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-engineer-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function authenticateOwner(req: Request): Promise<{ userId: string } | { status: number; error: string }> {
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) {
    return { status: 401, error: 'Sign in to run an audit.' };
  }
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
  if (!url || !anonKey) return { status: 500, error: 'Supabase is not configured.' };
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { status: 401, error: 'Session expired. Sign in again.' };
  const { data: profile } = await client
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return {
      status: 403,
      error: 'Owner access required. Open Settings → Quality & Operations to claim ownership.',
    };
  }
  return { userId: user.id };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only.' }, 405);

  try {
    const cronSecret = Deno.env.get('ENGINEER_CRON_SECRET') ?? '';
    const presented = req.headers.get('x-engineer-cron-secret') ?? '';
    const cronAuthorized = Boolean(cronSecret) && safeEqual(cronSecret, presented);

    let userId: string | null = null;
    if (!cronAuthorized) {
      const owner = await authenticateOwner(req);
      if ('status' in owner) return json({ error: owner.error }, owner.status);
      userId = owner.userId;
    }

    let body: { trigger?: unknown } = {};
    try {
      body = (await req.json()) as { trigger?: unknown };
    } catch {}
    const trigger = body.trigger === 'schedule' ? 'schedule' : 'manual';

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? '';
    if (!url || !serviceKey) return json({ error: 'Server credentials are missing.' }, 500);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await runEngineer(admin, { trigger, userId });
    return json(result);
  } catch (error) {
    console.error('engineer-agent failed:', error instanceof Error ? error.message : String(error));
    return json({ error: 'The audit could not be completed. Check the function logs.' }, 500);
  }
});
