// Supabase Edge Function: grade-project (server-side certification grading).
//
// POST { projectId, code } with the user's JWT → grades the code against the
// STORED stories patterns and returns { results, passed, total, allPass }.
// The client treats this as the source of truth when reachable (same patterns
// as the bundle, but newer rows work without an app update); offline it falls
// back to local grading. No secrets required — reads the public catalog only.
//
// Deploy with: supabase functions deploy grade-project

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    if (req.method !== 'POST') return json({ error: 'POST only.' }, 405);
    const { projectId, code } = (await req.json()) as {
      projectId?: unknown;
      code?: unknown;
    };
    if (typeof projectId !== 'string' || !projectId) {
      return json({ error: 'projectId is required.' }, 400);
    }
    if (typeof code !== 'string' || !code.trim()) {
      return json({ error: 'code is required.' }, 400);
    }
    if (code.length > 50000) return json({ error: 'Code too large (50k max).' }, 413);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Sign in to submit.' }, 401);

    const { data: project, error } = await supabase
      .from('certification_projects')
      .select('id, title, stories')
      .eq('id', projectId)
      .maybeSingle();
    if (error || !project) return json({ error: 'Unknown project.' }, 404);
    const stories = (project as { stories?: unknown }).stories;
    if (!Array.isArray(stories) || stories.length === 0) {
      return json({ error: 'Project has no tests.' }, 500);
    }

    const results = stories.map((s: unknown) => {
      const story = s as { label?: unknown; hint?: unknown; pattern?: unknown };
      let pass = false;
      try {
        if (typeof story.pattern === 'string' && story.pattern) {
          pass = new RegExp(story.pattern, 'i').test(code);
        }
      } catch {
        pass = false;
      }
      return {
        label: typeof story.label === 'string' ? story.label : 'Story',
        hint: typeof story.hint === 'string' ? story.hint : '',
        pass,
      };
    });
    const passed = results.filter((r) => r.pass).length;
    return json({ results, passed, total: results.length, allPass: passed === results.length });
  } catch (e) {
    console.error('grade-project failed:', e);
    return json({ error: String(e) }, 500);
  }
});
