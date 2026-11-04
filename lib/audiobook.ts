import { supabase } from './supabase';

export interface AudioSegment {
  question_id: string;
  prompt: string;
  /** Storage path inside `user-materials` (unsigned). */
  audio_path: string;
  /** Time-limited playable URL. */
  url: string;
}

/** One ordered part of the full-length narration (a provider-sized chunk). */
export interface AudioChapter {
  index: number;
  /** Storage path inside `user-materials` (unsigned). */
  audio_path: string;
  /** Time-limited playable URL. */
  url: string;
  chars: number;
  /** Human chapter label for the in-app media player (falls back to Part N). */
  title?: string;
  /** True when this part plays from the device instead of streaming. */
  offline?: boolean;
}

export interface Audiobook {
  lesson_id: number;
  title: string;
  /** First narrated part (older players use only this). */
  full_audio_url: string | null;
  /** The complete narration, in order. Empty for books made before it. */
  chapters: AudioChapter[];
  segments: AudioSegment[];
  /** Voice id the Edge Function narrated this book with (null on older books). */
  narrator_voice: string | null;
}

/** Sign one private-bucket path for playback (valid 1 hour). */
export async function signAudioPath(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('user-materials').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error ?? new Error(`Could not sign ${path}`);
  return data.signedUrl;
}

type LessonRow = { id: number; title: string; content: Record<string, unknown> };

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
  return lessonToAudiobook(lessons?.[0] as LessonRow | undefined);
}

/** One specific upload's audiobook — what an audiobook-only node plays. */
export async function loadLessonAudiobook(lessonId: number): Promise<Audiobook | null> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .maybeSingle();
  if (error) throw error;
  return lessonToAudiobook(data as LessonRow | null);
}

/** Sign a lesson's narration and segments into a playable book. */
async function lessonToAudiobook(lesson: LessonRow | null | undefined): Promise<Audiobook | null> {
  if (!lesson) return null;

  const content = (lesson.content ?? {}) as {
    audio_url?: string;
    audio_chunks?: { index: number; path: string; chars?: number }[];
    segments?: { question_id: string; prompt: string; audio_url: string }[];
    audio_voice?: string;
  };

  // The whole book, part by part. Sign each one so the player can walk the
  // chapters in order; a part that fails to sign is skipped rather than
  // stalling playback.
  const chapters: AudioChapter[] = [];
  for (const chunk of (content.audio_chunks ?? []).slice().sort((a, b) => a.index - b.index)) {
    try {
      chapters.push({
        index: chunk.index,
        audio_path: chunk.path,
        url: await signAudioPath(chunk.path),
        chars: chunk.chars ?? 0,
      });
    } catch (e) {
      console.warn('Skipping unsigned chapter:', e);
    }
  }

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
  if (segments.length === 0 && chapters.length === 0 && !full_audio_url) return null;

  return {
    lesson_id: lesson.id,
    title: lesson.title,
    full_audio_url,
    chapters,
    segments,
    narrator_voice: content.audio_voice ?? null,
  };
}
