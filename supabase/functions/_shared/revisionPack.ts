/**
 * Revision and memorization material built from an upload.
 *
 * The seven techniques the product promises are not decoration on a summary —
 * each one is a separate artefact a learner can practise with:
 *
 *   1. active recall   → `recall`: closed-book prompts with the answer hidden
 *   2. spaced repetition → `reviewPlan` intervals + `srsSeeds` cards
 *   3. flashcards      → `flashcards`: front / back, drawn from the source
 *   4. chunking        → `chunks`: 4–5 items per group, never a wall
 *   5. mind map        → `mindMap`: centre → branches → leaves
 *   6. memory palace   → `palace`: facts pinned to places in an imagined route
 *   7. teach it        → `teachBack`: explain prompts with a must-mention checklist
 *
 * Everything here is extractive: every card, answer and leaf is a sentence or
 * term that exists in the learner's own text. Nothing is invented, which is why
 * the deterministic builder is safe to run when no LLM answers — a note that
 * says "the model is unavailable" is far better than a plausible fake fact.
 */

import type { Chapter, MaterialAnalysis, MaterialKind } from './materialKind.ts';

export interface Flashcard {
  front: string;
  back: string;
  /** The source sentence the card was built from (never fabricated). */
  source: string;
}

export interface RecallPrompt {
  prompt: string;
  answer: string;
  source: string;
}

export interface Chunk {
  title: string;
  items: string[];
}

export interface MindMapBranch {
  label: string;
  leaves: string[];
}

export interface PalaceStop {
  place: string;
  fact: string;
}

export interface TeachPrompt {
  prompt: string;
  checklist: string[];
}

export interface ReviewInterval {
  day: number;
  focus: string;
}

export interface SrsSeed {
  key: string;
  prompt: string;
  answer: string[];
}

export interface RevisionPack {
  version: 1;
  title: string;
  kind: MaterialKind;
  /** One paragraph: what this upload is and how the pack was built. */
  summary: string;
  detected: MaterialAnalysis;
  flashcards: Flashcard[];
  recall: RecallPrompt[];
  chunks: Chunk[];
  mindMap: { center: string; branches: MindMapBranch[] };
  palace: { scene: string; stops: PalaceStop[] };
  teachBack: TeachPrompt[];
  reviewPlan: ReviewInterval[];
  srsSeeds: SrsSeed[];
  /** True when an LLM wrote the wording; false when it was built from the text. */
  generated: boolean;
  generatedAt: string;
}

const STOPWORDS = new Set(
  `a an the and or but if then than that this these those of in on at to for from by with without as is are was were be been being it its their his her your our they we you he she i not no nor so such which who whom whose what when where why how can could should would may might must do does did done have has had more most other some any all each every both few many much own same very just also into over under about after before between during through above below up down out off again further once here there`.split(
    /\s+/,
  ),
);

/** Sentences, trimmed, with page-number noise and lone headings dropped. */
export function toSentences(text: string): string[] {
  return text
    // Line breaks are boundaries: notes are written as bullets, not prose, and
    // joining them into one blob loses every card that could be built from them.
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9"“'(])/))
    .map((s) => s.replace(/^\s*(?:[-*•‣◦–]|\d+[.)])\s*/, '').replace(/\s+/g, ' ').trim())
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 3 && s.length >= 12 && s.length <= 400);
}

/** Capitalised or repeated content words, most frequent first. */
export function keyTerms(text: string, limit = 30): string[] {
  const counts = new Map<string, number>();
  const words = text.match(/[A-Za-z][A-Za-z'-]{2,}/g) ?? [];
  for (const raw of words) {
    const word = raw.replace(/^'+|'+$/g, '');
    const lower = word.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    // Key terms are capitalised mid-sentence or long enough to be technical.
    const interesting = /^[A-Z]/.test(word) || word.length >= 7;
    if (!interesting) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    // A term has to appear twice (or be capitalised and long) to be worth a card.
    .filter(([word, n]) => n >= 2 || (/^[A-Z]/.test(word) && word.length >= 6))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

/** Sections to work with: real chapters when found, otherwise equal blocks. */
export function workingSections(
  text: string,
  chapters: Chapter[],
  maxSections = 8,
): Array<{ title: string; text: string }> {
  const slice = (c: Chapter) => text.slice(c.start, c.end).trim();
  if (chapters.length > 1) {
    return chapters
      .filter((c) => slice(c).length > 80)
      .slice(0, maxSections)
      .map((c) => ({ title: c.title, text: slice(c) }));
  }
  const sentences = toSentences(text);
  if (sentences.length === 0) return [{ title: 'Whole text', text: text.trim() }];
  const per = Math.max(1, Math.ceil(sentences.length / Math.min(maxSections, Math.max(1, Math.floor(sentences.length / 4)))));
  const out: Array<{ title: string; text: string }> = [];
  for (let i = 0; i < sentences.length; i += per) {
    const block = sentences.slice(i, i + per);
    if (block.length === 0) continue;
    out.push({ title: `Part ${out.length + 1}`, text: block.join(' ') });
    if (out.length >= maxSections) break;
  }
  return out;
}

/** Definitional sentences ("X is …", "X refers to …") make the best cards. */
function definableSentences(sentences: string[], limit: number): string[] {
  const pattern = /\b(is|are|means|refers to|describes|happens when|consists of|defined as)\b/i;
  const picked = sentences.filter((s) => pattern.test(s) && s.split(/\s+/).length <= 45);
  return picked.slice(0, limit);
}

function clip(sentence: string, max = 220): string {
  if (sentence.length <= max) return sentence;
  // Cut on a word boundary so a card never ends mid-word.
  const cut = sentence.slice(0, max);
  return `${cut.slice(0, Math.max(0, cut.lastIndexOf(' ')))}…`;
}

/**
 * Deterministic pack builder. Never calls a model and never invents text: every
 * field is derived from the learner's own upload.
 */
export function buildRevisionPack(input: {
  text: string;
  analysis: MaterialAnalysis;
  title?: string;
  now?: Date;
}): RevisionPack {
  const { text, analysis } = input;
  const title = input.title?.trim() || analysis.title;
  const sections = workingSections(text, analysis.chapters);
  const sentences = toSentences(text);
  const terms = keyTerms(text, 24);
  const sectionTitles = sections.map((s) => s.title.replace(/^#{1,4}\s*/, '').trim()).filter(Boolean);

  // --- 3. Flashcards ------------------------------------------------------
  const flashcards: Flashcard[] = [];
  const seen = new Set<string>();
  // Study notes are a heading plus its bullets, so that pairing is already a
  // card: front = the term, back = what the learner wrote under it.
  for (const section of sections) {
    if (flashcards.length >= 12) break;
    const title = section.title.replace(/^#{1,4}\s*/, '').trim();
    if (!title || title.length < 3 || title.length > 80) continue;
    const sectionLines = section.text
      .split(/\r?\n+/)
      .map((l) => l.replace(/^\s*(?:[-*•‣◦–]|\d+[.)])\s*/, '').trim())
      .filter((l) => l.length >= 12 && l.length <= 240);
    // Drop the heading itself if it repeats as the first line.
    const bullets = sectionLines.filter((l) => l.toLowerCase() !== title.toLowerCase());
    if (bullets.length === 0) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    flashcards.push({
      front: title,
      back: clip(bullets.slice(0, 2).join(' · ')),
      source: bullets[0],
    });
  }
  for (const sentence of definableSentences(sentences, 40)) {
    const subjectMatch = sentence.match(/^([A-Z][\w'’-]*(?:\s+[A-Za-z][\w'’-]*){0,4})\s+(?:is|are|means|refers to|describes|consists of)/);
    const term = subjectMatch?.[1]?.trim() ?? terms.find((t) => sentence.includes(t));
    if (!term || term.length < 2) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    flashcards.push({ front: term, back: clip(sentence), source: sentence });
    if (flashcards.length >= 12) break;
  }
  // Top up with real terms and the sentence that mentions them, so a text
  // without "is/are" still yields working cards.
  for (const term of terms) {
    if (flashcards.length >= 12) break;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    const sentence = sentences.find((s) => s.includes(term));
    if (!sentence) continue;
    seen.add(key);
    flashcards.push({ front: term, back: clip(sentence), source: sentence });
  }

  // --- 1. Active recall ---------------------------------------------------
  const recall: RecallPrompt[] = sections.slice(0, 6).map((section) => {
    const sectionSentences = toSentences(section.text);
    const answer = sectionSentences.slice(0, 2).join(' ') || section.text.slice(0, 240);
    return {
      prompt: `Closed book: write down everything you remember about “${section.title}”.`,
      answer: clip(answer, 320),
      source: section.title,
    };
  });
  // Terms are the highest-value recall target, so add the ones with cards.
  for (const card of flashcards.slice(0, 4)) {
    recall.push({
      prompt: `Without looking: what is “${card.front}”, and why does it matter here?`,
      answer: card.back,
      source: card.front,
    });
  }

  // --- 4. Chunking --------------------------------------------------------
  const chunks: Chunk[] = [];
  const chunkSource = flashcards.map((c) => c.front);
  const chunkSize = 5;
  for (let i = 0; i < chunkSource.length; i += chunkSize) {
    const items = chunkSource.slice(i, i + chunkSize);
    if (items.length === 0) continue;
    chunks.push({ title: `Chunk ${chunks.length + 1} · ${items.length} items`, items });
  }
  if (chunks.length === 0 && sectionTitles.length > 0) {
    chunks.push({ title: 'Chunk 1', items: sectionTitles.slice(0, 5) });
  }

  // --- 5. Mind map --------------------------------------------------------
  const branches: MindMapBranch[] = sections.slice(0, 6).map((section, index) => {
    const sectionTerms = terms.filter((t) => section.text.includes(t)).slice(0, 4);
    const fallback = toSentences(section.text)
      .slice(0, 2)
      .map((s) => clip(s, 90));
    return {
      label: sectionTitles[index] ?? `Part ${index + 1}`,
      leaves: sectionTerms.length > 0 ? sectionTerms : fallback,
    };
  });

  // --- 6. Memory palace ---------------------------------------------------
  // A fixed, familiar route is easier to reuse than a random one; the facts
  // come from the learner's text, only the places are invented.
  const PLACES = ['front door', 'kitchen table', 'hallway mirror', 'bedroom window', 'balcony', 'bus stop'];
  const stops: PalaceStop[] = flashcards.slice(0, 5).map((card, index) => ({
    place: PLACES[index] ?? `stop ${index + 1}`,
    fact: card.front,
  }));
  if (stops.length === 0) {
    for (const [index, title] of sectionTitles.slice(0, 4).entries()) {
      stops.push({ place: PLACES[index] ?? `stop ${index + 1}`, fact: title });
    }
  }

  // --- 7. Teach it --------------------------------------------------------
  const teachBack: TeachPrompt[] = sections.slice(0, 4).map((section, index) => {
    const mustMention = terms.filter((t) => section.text.includes(t)).slice(0, 3);
    return {
      prompt: `Teach “${sectionTitles[index] ?? section.title}” out loud, as if to someone who has never seen it.`,
      checklist:
        mustMention.length > 0
          ? mustMention.map((t) => `explain ${t} in your own words`)
          : ['state the main idea', 'give one example from the material', 'say what it connects to'],
    };
  });

  // --- 2. Spaced repetition ----------------------------------------------
  const focusPool = sectionTitles.length > 0 ? sectionTitles : [title];
  const reviewPlan: ReviewInterval[] = [
    { day: 1, focus: `first pass: ${focusPool[0]}` },
    { day: 4, focus: focusPool[1] ?? focusPool[0] },
    { day: 7, focus: focusPool[2] ?? focusPool[0] },
    { day: 14, focus: 'all flashcards, shuffled' },
    { day: 30, focus: 'teach it from memory, no notes' },
  ];

  const srsSeeds: SrsSeed[] = flashcards.slice(0, 10).map((card, index) => ({
    key: `pack:${index}`,
    prompt: card.front,
    answer: [card.back],
  }));

  const techniqueCount = [
    flashcards.length > 0,
    recall.length > 0,
    chunks.length > 0,
    branches.length > 0,
    stops.length > 0,
    teachBack.length > 0,
    reviewPlan.length > 0,
  ].filter(Boolean).length;

  return {
    version: 1,
    title,
    kind: analysis.kind,
    summary:
      `Built from your ${analysis.kind === 'book' ? 'book' : analysis.kind === 'transcript' ? 'transcript' : 'notes'} ` +
      `(${analysis.words.toLocaleString()} words). ${techniqueCount} of 7 memorization techniques are filled; ` +
      'every card and answer is quoted from your material, never generated from outside it.',
    detected: analysis,
    flashcards,
    recall,
    chunks,
    mindMap: { center: title, branches },
    palace: {
      scene:
        'Walk the same route every time — front door, kitchen table, hallway mirror, bedroom window, balcony. ' +
        'At each stop, picture the fact as something absurd, oversized, or moving. The route is the filing system; the image is the file.',
      stops,
    },
    teachBack,
    reviewPlan,
    srsSeeds,
    generated: false,
    generatedAt: (input.now ?? new Date()).toISOString(),
  };
}

/** Shape check for a model-written pack before it is stored or shown. */
export function validateRevisionPack(value: unknown): value is RevisionPack {
  if (!value || typeof value !== 'object') return false;
  const pack = value as Partial<RevisionPack>;
  if (pack.version !== 1) return false;
  if (!Array.isArray(pack.flashcards) || !Array.isArray(pack.recall)) return false;
  if (!Array.isArray(pack.chunks) || !Array.isArray(pack.teachBack)) return false;
  if (!Array.isArray(pack.reviewPlan) || !Array.isArray(pack.srsSeeds)) return false;
  if (!pack.mindMap || !Array.isArray(pack.mindMap.branches)) return false;
  if (!pack.palace || !Array.isArray(pack.palace.stops)) return false;
  if (typeof pack.summary !== 'string' || pack.summary.length < 20) return false;
  const nonEmpty = [
    pack.flashcards.length > 0,
    pack.recall.length > 0,
    pack.mindMap.branches.length > 0,
    pack.palace.stops.length > 0,
    pack.reviewPlan.length > 0,
  ].filter(Boolean).length;
  return nonEmpty >= 4;
}

/** Prompt for the curation model. Kept short: the pack is bounded by design. */
export function revisionPackPrompt(text: string, analysis: MaterialAnalysis): string {
  return [
    'You build revision material for a language-learning app.',
    `The learner uploaded ${analysis.kind} material (${analysis.words} words).`,
    'Return ONE JSON object with this shape:',
    '{"version":1,"summary":string,"flashcards":[{"front":string,"back":string,"source":string}],',
    '"recall":[{"prompt":string,"answer":string,"source":string}],',
    '"chunks":[{"title":string,"items":[string]}],',
    '"mindMap":{"center":string,"branches":[{"label":string,"leaves":[string]}]},',
    '"palace":{"scene":string,"stops":[{"place":string,"fact":string}]},',
    '"teachBack":[{"prompt":string,"checklist":[string]}],',
    '"reviewPlan":[{"day":number,"focus":string}],',
    '"srsSeeds":[{"key":string,"prompt":string,"answer":[string]}]}',
    'Rules: 8-12 flashcards, 4-6 recall prompts, 3-5 chunks of 4-5 items, 3-6 mind-map branches,',
    '4-6 palace stops, 3-4 teach-back prompts, 5 review intervals (day 1/4/7/14/30) and at most 10 SRS seeds.',
    'Quote the source text for every "source" field. Never invent facts that are not in the material.',
    '',
    'MATERIAL:',
    text.slice(0, 7000),
  ].join('\n');
}
