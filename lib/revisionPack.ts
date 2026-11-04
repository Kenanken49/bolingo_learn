import { supabase } from './supabase';
import { gradeCard } from './srs';

/**
 * Revision material built from an upload by the Edge Function
 * (`supabase/functions/_shared/revisionPack.ts` is the source of truth for the
 * shape; these types are the client's copy so the app never imports Deno code).
 *
 * A pack is deliberately data, not a rendered document: every technique is a
 * separate field so the screen can pace them (one technique at a time) instead
 * of handing the learner a wall of text — which is exactly the behaviour the
 * techniques are meant to replace.
 */

export interface PackFlashcard {
  front: string;
  back: string;
  source: string;
}

export interface PackRecall {
  prompt: string;
  answer: string;
  source: string;
}

export interface PackChunk {
  title: string;
  items: string[];
}

export interface PackMindMap {
  center: string;
  branches: Array<{ label: string; leaves: string[] }>;
}

export interface PackPalace {
  scene: string;
  stops: Array<{ place: string; fact: string }>;
}

export interface PackTeach {
  prompt: string;
  checklist: string[];
}

export type MaterialKind = 'book' | 'notes' | 'article' | 'transcript' | 'unknown';

export interface RevisionPack {
  version: 1;
  title: string;
  kind: MaterialKind;
  summary: string;
  detected?: {
    kind: MaterialKind;
    confidence: number;
    words: number;
    signals: string[];
    chapters: Array<{ title: string; start: number; end: number }>;
  };
  flashcards: PackFlashcard[];
  recall: PackRecall[];
  chunks: PackChunk[];
  mindMap: PackMindMap;
  palace: PackPalace;
  teachBack: PackTeach[];
  reviewPlan: Array<{ day: number; focus: string }>;
  srsSeeds: Array<{ key: string; prompt: string; answer: string[] }>;
  generated: boolean;
  generatedAt: string;
}

export interface PackRow {
  id: string;
  upload_id: string;
  lesson_id: number | null;
  kind: MaterialKind;
  title: string;
  pack: RevisionPack;
  generated_at: string;
}

/** True for rows that carry a readable pack (guards older/partial rows). */
export function isRevisionPack(value: unknown): value is RevisionPack {
  if (!value || typeof value !== 'object') return false;
  const pack = value as Partial<RevisionPack>;
  return (
    pack.version === 1 &&
    Array.isArray(pack.flashcards) &&
    Array.isArray(pack.recall) &&
    Array.isArray(pack.teachBack) &&
    Array.isArray(pack.reviewPlan) &&
    !!pack.mindMap &&
    Array.isArray(pack.mindMap.branches) &&
    !!pack.palace &&
    Array.isArray(pack.palace.stops)
  );
}

/** The pack for one upload, or null when the pipeline made none (e.g. a book). */
export async function loadRevisionPack(uploadId: string): Promise<PackRow | null> {
  const { data, error } = await supabase
    .from('revision_packs')
    .select('id,upload_id,lesson_id,kind,title,pack,generated_at')
    .eq('upload_id', uploadId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as PackRow;
  return isRevisionPack(row.pack) ? row : null;
}

/** Newest pack for this learner — powers the "Revision material" card on home. */
export async function loadLatestRevisionPack(): Promise<PackRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('revision_packs')
    .select('id,upload_id,lesson_id,kind,title,pack,generated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as PackRow;
  return isRevisionPack(row.pack) ? row : null;
}

/**
 * Put a pack's cards into the spaced-repetition engine (technique 2).
 *
 * The pack deliberately does not schedule itself: the app already has one SRS
 * brain (`lib/srs.ts`) that Daily Review reads, and a second scheduler would
 * mean two different answers to "what is due today". Cards are enrolled as
 * "not yet known" so they come back tomorrow, then follow SM-2 like every
 * other card. Idempotent — re-enrolling updates the same rows.
 */
export async function enrolPackInReview(
  pack: RevisionPack,
  userId: string,
  uploadId: string
): Promise<number> {
  const seeds = pack.srsSeeds.length > 0
    ? pack.srsSeeds
    : pack.flashcards.map((card, index) => ({ key: `pack:${index}`, prompt: card.front, answer: [card.back] }));
  let enrolled = 0;
  for (const [index, seed] of seeds.entries()) {
    const snapshot = {
      prompt: seed.prompt,
      correctChain: seed.answer.filter(Boolean),
      options: [] as string[],
      explain: pack.flashcards[index]?.source,
      lessonTitle: pack.title,
    };
    if (snapshot.correctChain.length === 0) continue;
    await gradeCard(userId, `${uploadId}:${seed.key}`, false, snapshot);
    enrolled += 1;
  }
  return enrolled;
}
