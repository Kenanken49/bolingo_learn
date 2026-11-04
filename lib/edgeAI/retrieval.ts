/**
 * Local vector search — the "Local Vector DB" box of the offline-first AI.
 *
 * Every lesson paragraph becomes a fixed-size embedding built with feature
 * hashing (stemmed words + character trigrams, TF-IDF weighted,
 * L2-normalised) plus a BM25 term index. A question is ranked by BM25 (exact
 * word relevance, length-normalised) blended with cosine similarity of the
 * embeddings (fuzzy closeness), and a hit must share at least one real word
 * with the question. No native
 * module and no network: it runs identically on iOS, Android, web and Node,
 * which is what lets the offline tutor work today and lets the check script
 * exercise the real code.
 *
 * When a native SLM runtime is registered (see `edgeEngine.ts`), the top
 * passages from this index are injected into its prompt (on-device RAG).
 * Without one, the best passage is returned as the answer itself.
 */

/** 4096 slots keep hash collisions rare across ~2k lesson paragraphs. */
export const EMBEDDING_DIM = 4096;

export interface Passage {
  id: string;
  /** Where the paragraph came from (lesson title), shown as the citation. */
  source: string;
  text: string;
}

export interface IndexedPassage extends Passage {
  /** Sparse vector: dimension → weight. Sparse keeps the index small. */
  vector: Record<number, number>;
  /** Stemmed whole words, for the lexical gate (a hit must share a real word). */
  terms: string[];
  /** BM25: stemmed term frequency and paragraph length in terms. */
  tf: Record<string, number>;
  len: number;
}

export interface VectorIndex {
  version: 1;
  dim: number;
  /** Inverse document frequency per hashed dimension. */
  idf: Record<number, number>;
  /** BM25: how many paragraphs contain each stemmed term, and mean length. */
  df: Record<string, number>;
  avgLen: number;
  passages: IndexedPassage[];
}

export interface SearchHit {
  passage: Passage;
  score: number;
}

const STOPWORDS = new Set(
  'a an and are as at be but by do does for from how i if in is it its me my of on or so that the this to was what when where which who why with you your can should would'.split(' ')
);

/** Lower-case words, accents kept (Swahili/Spanish/French lessons). */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}<>/#.-]+/gu) ?? [])
    .map((w) => w.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Light English stemmer: enough that move/moving, file/files, class/classes,
 * heading/headings and run/running meet, without touching short words or
 * non-English (accented) words.
 */
export function stem(word: string): string {
  if (word.length <= 3 || /[^a-z]/.test(word)) return word;
  let w = word;
  // 1. Plurals.
  if (w.endsWith('ies') && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (/(sses|xes|ches|shes|zes)$/.test(w)) w = w.slice(0, -2);
  else if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  // 2. Verb endings (after plurals, so "headings" and "heading" meet).
  if (w.endsWith('ing') && w.length - 3 >= 3) w = w.slice(0, -3);
  else if (w.endsWith('ed') && w.length - 2 >= 3) w = w.slice(0, -2);
  // 3. running → runn → run; stopped → stopp → stop
  if (/([bdfgmnprt])\1$/.test(w)) w = w.slice(0, -1);
  // 4. move/moving, file/files, delete/deleting all lose the final e
  if (w.length >= 4 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

/**
 * Learner words → lesson words. Learners say "folder" and "delete"; the
 * lessons say "directory", "remove" and "rm". Applied to the question only.
 */
const SYNONYMS: Record<string, string[]> = {
  folder: ['directory', 'dir'],
  delete: ['remove', 'rm'],
  erase: ['remove', 'rm'],
  move: ['mv'],
  rename: ['mv'],
  copy: ['cp'],
  list: ['ls'],
  another: ['different'],
  make: ['create'],
  link: ['href', 'anchor'],
  picture: ['image', 'img'],
  photo: ['image', 'img'],
  website: ['page', 'site'],
  colour: ['color'],
};

/** Stemmed question terms plus their lesson-vocabulary synonyms. */
export function queryTerms(text: string): string[] {
  const out = new Set<string>();
  for (const raw of tokenize(text)) {
    out.add(stem(raw));
    for (const alt of SYNONYMS[raw] ?? SYNONYMS[stem(raw)] ?? []) out.add(stem(alt));
  }
  return Array.from(out);
}

export function terms(text: string): string[] {
  return Array.from(new Set(tokenize(text).map(stem)));
}

/** FNV-1a 32-bit — deterministic across platforms. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Hashed features: stemmed whole words carry the meaning (weight 1);
 * character trigrams (weight 0.15) only nudge near-misses like typos.
 */
const TRIGRAM_WEIGHT = 0.15;
function features(text: string, dim: number): Map<number, number> {
  const out = new Map<number, number>();
  const add = (key: string, w: number) => {
    const d = hash32(key) % dim;
    out.set(d, (out.get(d) ?? 0) + w);
  };
  for (const raw of tokenize(text)) {
    const word = stem(raw);
    add(`w:${word}`, 1);
    const padded = `^${word}$`;
    for (let i = 0; i + 3 <= padded.length; i++) add(`t:${padded.slice(i, i + 3)}`, TRIGRAM_WEIGHT);
  }
  return out;
}

function normalize(vec: Map<number, number>): Record<number, number> {
  let norm = 0;
  vec.forEach((w) => (norm += w * w));
  norm = Math.sqrt(norm) || 1;
  const out: Record<number, number> = {};
  vec.forEach((w, d) => {
    if (w !== 0) out[d] = w / norm;
  });
  return out;
}

function weighted(text: string, idf: Record<number, number>, dim: number): Record<number, number> {
  const raw = features(text, dim);
  const tfidf = new Map<number, number>();
  raw.forEach((tf, d) => tfidf.set(d, (1 + Math.log(tf)) * (idf[d] ?? 0)));
  return normalize(tfidf);
}

export function buildIndex(passages: Passage[], dim: number = EMBEDDING_DIM): VectorIndex {
  const clean = passages.filter((p) => p && typeof p.text === 'string' && p.text.trim().length > 0);
  const df = new Map<number, number>();
  const feats = clean.map((p) => features(p.text, dim));
  for (const f of feats) f.forEach((_w, d) => df.set(d, (df.get(d) ?? 0) + 1));
  const n = clean.length;
  const idf: Record<number, number> = {};
  df.forEach((count, d) => (idf[d] = Math.log(1 + n / count)));
  const termDf: Record<string, number> = {};
  const indexed = clean.map((p) => {
    const words = tokenize(p.text).map(stem);
    const tf: Record<string, number> = {};
    for (const w of words) tf[w] = (tf[w] ?? 0) + 1;
    for (const w of Object.keys(tf)) termDf[w] = (termDf[w] ?? 0) + 1;
    return { ...p, vector: weighted(p.text, idf, dim), terms: Object.keys(tf), tf, len: words.length };
  });
  const avgLen = indexed.reduce((sum, p) => sum + p.len, 0) / Math.max(1, indexed.length);
  return { version: 1, dim, idf, df: termDf, avgLen, passages: indexed };
}

export function cosine(a: Record<number, number>, b: Record<number, number>): number {
  let dot = 0;
  const [small, large] = Object.keys(a).length <= Object.keys(b).length ? [a, b] : [b, a];
  for (const k in small) {
    const other = large[k as unknown as number];
    if (other !== undefined) dot += small[k as unknown as number] * other;
  }
  return dot;
}

const BM25_K1 = 1.2;
const BM25_B = 0.75;

/**
 * Top-k passages above `minScore`, best first. Score = 0.75 × BM25 (as the
 * share of the question's term weight a paragraph matches) + 0.25 × cosine.
 * A passage must share at least one real (stemmed) word with the question,
 * so look-alikes and gibberish never surface as a confident "answer".
 */
export function search(index: VectorIndex, query: string, k = 3, minScore = 0.2): SearchHit[] {
  if (!index || !Array.isArray(index.passages) || !query.trim()) return [];
  const qTerms = queryTerms(query);
  if (qTerms.length === 0) return [];
  const n = index.passages.length;
  const idfOf = (t: string) => {
    const df = index.df?.[t] ?? 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  };
  const qWeight = qTerms.reduce((sum, t) => sum + idfOf(t), 0) || 1;
  const qVec = weighted(query, index.idf, index.dim);
  const avg = index.avgLen || 1;
  const hits: SearchHit[] = [];
  for (const p of index.passages) {
    let bm25 = 0;
    for (const t of qTerms) {
      const tf = p.tf?.[t];
      if (!tf) continue;
      bm25 += (idfOf(t) * tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + (BM25_B * p.len) / avg));
    }
    if (bm25 === 0) continue; // lexical gate
    const score = 0.75 * Math.min(1, bm25 / qWeight) + 0.25 * cosine(qVec, p.vector);
    if (score >= minScore) hits.push({ passage: { id: p.id, source: p.source, text: p.text }, score });
  }
  return hits.sort((x, y) => y.score - x.score).slice(0, Math.max(1, k));
}

/** The retrieval-augmented prompt an on-device SLM receives. */
export function ragPrompt(question: string, hits: SearchHit[]): string {
  const context = hits.map((h, i) => `[${i + 1}] (${h.passage.source}) ${h.passage.text}`).join('\n');
  return [
    'You are Bingo, a patient tutor. Answer only from the lesson extracts below.',
    'If they do not contain the answer, say so and suggest which lesson to revisit.',
    '',
    'Lesson extracts:',
    context || '(none found)',
    '',
    `Learner question: ${question.trim()}`,
  ].join('\n');
}
