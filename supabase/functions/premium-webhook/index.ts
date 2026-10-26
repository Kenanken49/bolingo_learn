// Supabase Edge Function: premium-webhook
// Deploy with: supabase functions deploy premium-webhook
// Point your payment provider (e.g. Stripe) at this endpoint to toggle premium.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceKey) {
    return new Response('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const payload = await req.json();
    const userId: string | undefined = payload.user_id ?? payload.userId;
    const isPremium: boolean = payload.is_premium ?? payload.isPremium ?? false;

    if (!userId) {
      return new Response('Missing user_id', { status: 400 });
    }

    const { error } = await supabase.from('profiles').update({ is_premium: isPremium }).eq('id', userId);

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
