// Supabase Edge Function: streak-reset
// Deploy with: supabase functions deploy streak-reset
// Schedule daily via Supabase Cron / pg_cron to reset stale streaks.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceKey) {
    return new Response('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Example: reset streaks where last activity was > 48h ago.
  // Adjust table/column names to your schema.
  const { error } = await supabase
    .from('profiles')
    .update({ streak_count: 0 })
    .lt('last_activity_at', new Date(Date.now() - 48 * 3600 * 1000).toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
