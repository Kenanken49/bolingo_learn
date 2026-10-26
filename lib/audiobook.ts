import { supabase } from './supabase';

export interface AudioSegment {
  question_id: string;
  prompt: string;
  /** Storage path inside `user-materials` (unsigned). */
  audio_path: string;
  /** Time-limited playable URL. */
  url: string;
}

export interface Audiobook {
  lesson_id: number;
  title: string;
  full_audio_url: string | null;
  segments: AudioSegment[];
}

/** Sign one private-bucket path for playback (valid 1 hour). */
export async function signAudioPath(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('user-materials').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error ?? new Error(`Could not sign ${path}`);
  return data.signedUrl;
}

/**
 * Load the newest user-generated audiobook: latest lesson with segments,
 * each segment resolved to a signed streaming URL. Falls back to the
 * full-mix MP3 when per-question segments are missing.
 */
export async function loadLatestAudiobook(): Promise<Audiobook | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be signed in to listen.');

  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_user_generated', true)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const lesson = lessons?.[0] as
    | { id: number; title: string; content: Record<string, unknown> }
    | undefined;
  if (!lesson) return null;

  const content = (lesson.content ?? {}) as {
    audio_url?: string;
    segments?: Array<{ question_id: string; prompt: string; audio_url: string }>;
  };

  const segments: AudioSegment[] = [];
  for (const s of content.segments ?? []) {
    try {
      segments.push({
        question_id: s.question_id,
        prompt: s.prompt,
        audio_path: s.audio_url,
        url: await signAudioPath(s.audio_url),
      });
    } catch (e) {
      console.warn('Skipping unsigned segment:', e);
    }
  }

  const full_audio_url = content.audio_url ? await signAudioPath(content.audio_url) : null;
  if (segments.length === 0 && !full_audio_url) return null;

  return { lesson_id: lesson.id, title: lesson.title, full_audio_url, segments };
}
