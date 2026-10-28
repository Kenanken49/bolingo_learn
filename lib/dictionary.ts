/**
 * Offline dictionary — zero-network fallback for learners who prefer not to
 * use AI. Data is bundled from open sources (see assets/dict/sources.json):
 * - Swahili → English: FreeDict swh-eng v0.4.4 (GNU GPL v2+)
 * - English → English: English WordNet 2024 synset glosses (attributed)
 *
 * JSON is required lazily so the ~1.7MB payload only parses when the
 * Dictionary screen opens, never on app start.
 */

export interface SwEntry {
  word: string;
  pos: string;
  gloss: string;
}

export interface EnEntry {
  word: string;
  gloss: string;
}

export type DictHit =
  | { lang: 'sw'; entry: SwEntry }
  | { lang: 'en'; entry: EnEntry };

let swIndex: Map<string, SwEntry[]> | null = null;
let enIndex: Map<string, EnEntry[]> | null = null;
// Prefix-sorted word lists for autocomplete suggestions.
let swWords: string[] | null = null;
let enWords: string[] | null = null;

export function normalize(q: string): string {
  return q.trim().toLowerCase().replace(/^[^a-z\u00C0-\u024F]+|[^a-z\u00C0-\u024F]+$/g, '');
}

function loadSw(): Map<string, SwEntry[]> {
  if (!swIndex) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require('../assets/dict/sw.json') as [string, string, string][];
    swIndex = new Map();
    swWords = [];
    for (const [word, pos, gloss] of raw) {
      const key = word.toLowerCase();
      const list = swIndex.get(key) ?? [];
      list.push({ word, pos, gloss });
      if (list.length === 1) swWords!.push(key);
      swIndex.set(key, list);
    }
    swWords!.sort();
  }
  return swIndex;
}

function loadEn(): Map<string, EnEntry[]> {
  if (!enIndex) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require('../assets/dict/en.json') as [string, string][];
    enIndex = new Map();
    enWords = [];
    for (const [word, gloss] of raw) {
      const key = word.toLowerCase();
      const list = enIndex.get(key) ?? [];
      list.push({ word, gloss });
      if (list.length === 1) enWords!.push(key);
      enIndex.set(key, list);
    }
    enWords!.sort();
  }
  return enIndex;
}

/** Exact matches in the Swahili kamusi (all POS entries for the headword). */
export function lookupSwahili(q: string): SwEntry[] {
  const key = normalize(q);
  if (!key) return [];
  return loadSw().get(key) ?? [];
}

/** Exact matches in the English dictionary. */
export function lookupEnglish(q: string): EnEntry[] {
  const key = normalize(q);
  if (!key) return [];
  return loadEn().get(key) ?? [];
}

/** Prefix suggestions across both dictionaries, Swahili first. */
export function suggest(q: string, limit = 8): DictHit[] {
  const key = normalize(q);
  if (key.length < 2) return [];
  const out: DictHit[] = [];
  const sw = loadSw();
  const en = loadEn();
  for (const w of swWords ?? []) {
    if (w.startsWith(key)) {
      for (const entry of sw.get(w) ?? []) {
        out.push({ lang: 'sw', entry });
        if (out.length >= limit) return out;
      }
    }
    if (out.length >= limit) break;
  }
  for (const w of enWords ?? []) {
    if (w.startsWith(key)) {
      for (const entry of en.get(w) ?? []) {
        out.push({ lang: 'en', entry });
        if (out.length >= limit) return out;
      }
    }
    if (out.length >= limit) break;
  }
  return out;
}

export function dictSizes(): { swahili: number; english: number } {
  return { swahili: loadSw().size, english: loadEn().size };
}
