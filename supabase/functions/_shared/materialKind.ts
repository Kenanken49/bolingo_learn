/**
 * What did the learner just upload?
 *
 * The pipeline behaves very differently for a 300-page book and a page of
 * lecture notes, so it has to know which one it is holding before it spends
 * money on narration or curation. This module is pure (no Deno, no network) so
 * the quality gate can run it in Node against fixtures.
 *
 * Detection is deliberately conservative and explainable: every verdict carries
 * the signals that produced it, and the app shows them ("book · 84,120 words ·
 * 12 chapters"). A misread is then visible to the learner instead of silently
 * changing what they get.
 */

export type MaterialKind = 'book' | 'notes' | 'article' | 'transcript' | 'unknown';

export interface Chapter {
  title: string;
  /** Character offset of the chapter's first character in the source text. */
  start: number;
  /** Character offset just past the chapter's last character. */
  end: number;
}

export interface MaterialAnalysis {
  kind: MaterialKind;
  /** 0–1. Below ~0.5 the classifier is guessing and the pipeline says so. */
  confidence: number;
  title: string;
  words: number;
  characters: number;
  /** Plain-language evidence, ordered strongest first. */
  signals: string[];
  chapters: Chapter[];
  /** True when the upload looks like a complete long-form work. */
  fullBook: boolean;
  /** Narration is the primary product for a book, revision material for notes. */
  primaryOutput: 'audiobook' | 'revision';
}

const HEADING_LINE =
  /^(?:#{1,4}\s+\S|chapter\s+(?:\d+|[ivxlc]+)\b|part\s+(?:\d+|[ivxlc]+)\b|unit\s+\d+\b|module\s+\d+\b|section\s+\d+\b|lesson\s+\d+\b)/i;
const ALL_CAPS_HEADING = /^[A-Z0-9][A-Z0-9 ,:&'’\-().]{3,60}$/;
const LIST_LINE = /^\s*(?:[-*•‣◦]|\d+[.)]|[a-h][.)])\s+\S/;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function lines(text: string): string[] {
  return text.split(/\r?\n/);
}

/** Lines that read like section headings rather than prose. */
export function headingLines(text: string): Array<{ index: number; title: string; offset: number }> {
  const out: Array<{ index: number; title: string; offset: number }> = [];
  let offset = 0;
  const all = lines(text);
  for (let i = 0; i < all.length; i += 1) {
    const raw = all[i].trim();
    if (raw) {
      const isMarked = HEADING_LINE.test(raw);
      // A bullet is content, never a heading — otherwise every bullet in a set
      // of notes becomes a section and the cards read "- is made of …".
      const isBullet = LIST_LINE.test(raw);
      // A bare all-caps line only counts if it is short and stands alone —
      // otherwise every shouted sentence in a transcript becomes a chapter.
      const isCaps = !isBullet && ALL_CAPS_HEADING.test(raw) && raw.split(/\s+/).length <= 9 && !/[.!?]$/.test(raw);
      // Notes put a short title line directly above its bullets: "Cell membrane"
      // then "- controls what enters". Treat that pairing as a heading, or study
      // notes would arrive with no structure at all.
      const nextNonEmpty = all.slice(i + 1).find((l) => l.trim())?.trim() ?? '';
      const isBulletLead =
        nextNonEmpty.startsWith('-') ||
        nextNonEmpty.startsWith('*') ||
        nextNonEmpty.startsWith('•') ||
        nextNonEmpty.startsWith('–');
      const isTitleLine =
        isBulletLead && !isBullet && raw.length <= 70 && !/[.!?]$/.test(raw) && raw.split(/\s+/).length <= 10;
      if (raw.length <= 90 && (isMarked || isCaps || isTitleLine)) {
        out.push({ index: i, title: raw.replace(/^#{1,4}\s*/, '').replace(/\s+/g, ' '), offset });
      }
    }
    offset += all[i].length + 1;
  }
  return out;
}

/**
 * Split a document into chapters at its headings. Always returns at least one
 * chapter that covers the whole text, so narration can never lose a tail.
 */
export function splitChapters(text: string, headings = headingLines(text)): Chapter[] {
  if (!text.trim()) return [];
  if (headings.length === 0) {
    return [{ title: 'Full text', start: 0, end: text.length }];
  }
  const chapters: Chapter[] = [];
  // Text before the first heading (a preface, a title page) is its own chapter
  // rather than being dropped.
  if (headings[0].offset > 0) {
    const lead = text.slice(0, headings[0].offset).trim();
    // Anything before the first heading is kept — a title page is still part of
    // the book, and narration must start at the first character.
    if (lead.length > 0) chapters.push({ title: 'Opening', start: 0, end: headings[0].offset });
  }
  for (let i = 0; i < headings.length; i += 1) {
    const start = headings[i].offset;
    const end = i + 1 < headings.length ? headings[i + 1].offset : text.length;
    chapters.push({ title: headings[i].title.slice(0, 120), start, end });
  }
  return chapters.filter((c) => c.end > c.start);
}

function listDensity(text: string): number {
  const all = lines(text).filter((l) => l.trim());
  if (all.length === 0) return 0;
  const bullets = all.filter((l) => LIST_LINE.test(l)).length;
  return bullets / all.length;
}

function averageSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]+\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const total = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0);
  return total / sentences.length;
}

/**
 * Classify the material. `fileName` only breaks ties: a `.txt` export of a whole
 * book is still a book.
 */
export function classifyMaterial(input: { text: string; fileName?: string }): MaterialAnalysis {
  const text = input.text ?? '';
  const words = countWords(text);
  const characters = text.length;
  const headings = headingLines(text);
  const chapters = splitChapters(text, headings);
  const bullets = listDensity(text);
  const avgSentence = averageSentenceLength(text);
  const signals: string[] = [];
  const file = (input.fileName ?? '').toLowerCase();
  const stem = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();

  const title =
    headings.length > 0 && headings[0].title.length >= 3
      ? headings[0].title.slice(0, 80)
      : stem
        ? stem.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80)
        : 'Your upload';

  if (words === 0) {
    return {
      kind: 'unknown',
      confidence: 0,
      title,
      words: 0,
      characters,
      signals: ['no readable text'],
      chapters: [],
      fullBook: false,
      primaryOutput: 'revision',
    };
  }

  signals.push(`${words.toLocaleString()} words`);
  if (chapters.length > 1) signals.push(`${chapters.length} ${chapters.length === 1 ? 'section' : 'sections'} detected`);
  if (bullets > 0.15) signals.push(`${Math.round(bullets * 100)}% list lines`);
  if (avgSentence > 0) signals.push(`${Math.round(avgSentence)} words per sentence on average`);

  // A transcript is a conversation, not an authored document: many short turns.
  const spokenTurns = (text.match(/^\s*[A-Z][\w .'-]{1,24}:\s/gm) ?? []).length;
  if (spokenTurns >= 5 && words >= 40) {
    signals.unshift('speaker turns — looks like a transcript');
    return {
      kind: 'transcript',
      confidence: 0.8,
      title,
      words,
      characters,
      signals,
      chapters,
      fullBook: false,
      primaryOutput: 'revision',
    };
  }

  // Book: long-form, and either genuinely long or chaptered prose.
  const longForm = avgSentence >= 12 && bullets < 0.15;
  // A short reader (a 5k-word graded book) is still a book: chaptered, prose,
  // no bullet lists. Requiring 12k words made those uploads look like articles
  // and silently swapped their audiobook for a revision pack.
  const fullBook =
    (words >= 5_000 && chapters.length >= 4 && longForm) ||
    (words >= 12_000 && chapters.length >= 3 && longForm) ||
    words >= 25_000;
  if (fullBook) {
    signals.unshift(
      words >= 25_000
        ? 'long-form prose at book length'
        : 'chaptered long-form prose',
    );
    return {
      kind: 'book',
      confidence: chapters.length >= 3 ? 0.9 : 0.6,
      title,
      words,
      characters,
      signals,
      chapters,
      fullBook: true,
      primaryOutput: 'audiobook',
    };
  }

  // Notes: bullet-heavy, terse, or sectioned but short. This is the case where
  // revision material is worth more than another reading of the same text.
  if (bullets >= 0.3 || (chapters.length >= 2 && avgSentence > 0 && avgSentence < 14 && words < 8_000)) {
    signals.unshift(bullets >= 0.3 ? 'bullet-heavy structure' : 'short sectioned lines');
    return {
      kind: 'notes',
      confidence: bullets >= 0.45 ? 0.85 : 0.7,
      title,
      words,
      characters,
      signals,
      chapters,
      fullBook: false,
      primaryOutput: 'revision',
    };
  }

  signals.unshift(words < 400 ? 'short document' : 'continuous prose');
  return {
    kind: 'article',
    confidence: 0.6,
    title,
    words,
    characters,
    signals,
    chapters,
    fullBook: false,
    primaryOutput: 'revision',
  };
}

/** One-line description for the app: "Book · 84,120 words · 12 sections". */
export function describeAnalysis(analysis: MaterialAnalysis): string {
  const kind =
    analysis.kind === 'book'
      ? 'Book'
      : analysis.kind === 'notes'
        ? 'Notes'
        : analysis.kind === 'transcript'
          ? 'Transcript'
          : analysis.kind === 'article'
            ? 'Article'
            : 'Unreadable';
  const parts = [kind, `${analysis.words.toLocaleString()} words`];
  if (analysis.chapters.length > 1) parts.push(`${analysis.chapters.length} sections`);
  return parts.join(' · ');
}
