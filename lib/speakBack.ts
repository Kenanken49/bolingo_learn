/**
 * Speak-back scoring: how close was the learner's attempt to the model phrase?
 *
 * The recognizer gives us words, not phonemes, so this measures *word
 * accuracy* — exactly what a learner can act on ("you said manzana, the phrase
 * is manzanas"). It is deliberately transparent:
 *
 *   - an exact word is worth 1;
 *   - a word that differs only by an accent (`esta` / `está`) is worth 1 and
 *     flagged "close" — the learner said the right word, the spelling differs;
 *   - a substituted word is worth 0.5 (the recognizer heard a different word,
 *     which is a real signal, but a near miss shouldn't read as zero);
 *   - a missing word is worth 0;
 *   - an extra word costs 0.25, because a harmless article shouldn't wipe out
 *     an otherwise correct attempt.
 *
 * Alignment is Levenshtein over normalized tokens, so word order and omissions
 * are handled the way a listener hears them. Pure and platform-free: the check
 * script executes it in Node, and the UI only renders the result.
 */

export type SpeakBackWordStatus = 'hit' | 'close' | 'miss' | 'extra';

export interface SpeakBackWord {
  /** The target word (for "extra" words, the word that was heard instead). */
  word: string;
  status: SpeakBackWordStatus;
  /** What was heard in this slot when it differed from the target. */
  heard?: string;
}

export interface SpeakBackScore {
  /** 0–100. */
  score: number;
  /** Weighted credit: exact words count 1, substitutions 0.5. */
  matched: number;
  targetCount: number;
  /** Words heard that are not in the target. */
  extras: number;
  /** The transcript this score came from. */
  heard: string;
  /** Target words in order, with any extra words appended. */
  words: SpeakBackWord[];
}

export type SpeakBackVerdict = 'great' | 'good' | 'almost' | 'again';

interface Token {
  /** As authored, for display. */
  display: string;
  /** Accent-folded, punctuation-free, lowercase — the comparison key. */
  key: string;
  /** Lowercase without folding, to spot accent-only differences. */
  exact: string;
}

function tokenize(text: string): Token[] {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}'\s-]/gu, ' ')
    .split(/\s+/)
    .map((raw) => raw.replace(/^['-]+|['-]+$/g, ''))
    .filter(Boolean)
    .map((word) => {
      const exact = word.toLowerCase();
      return {
        display: word,
        exact,
        key: exact.normalize('NFD').replace(/\p{M}+/gu, ''),
      };
    });
}

type Op =
  | { kind: 'match'; target: number; heard: number }
  | { kind: 'sub'; target: number; heard: number }
  | { kind: 'del'; target: number }
  | { kind: 'ins'; heard: number };

/** Levenshtein alignment with a preference for diagonal moves on ties. */
function align(target: Token[], heard: Token[]): Op[] {
  const rows = target.length + 1;
  const cols = heard.length + 1;
  const cost: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) cost[i]![0] = i;
  for (let j = 0; j < cols; j += 1) cost[0]![j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const same = target[i - 1]!.key === heard[j - 1]!.key;
      const diagonal = cost[i - 1]![j - 1]! + (same ? 0 : 1);
      const up = cost[i - 1]![j]! + 1;
      const left = cost[i]![j - 1]! + 1;
      cost[i]![j] = Math.min(diagonal, up, left);
    }
  }

  const ops: Op[] = [];
  let i = target.length;
  let j = heard.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = target[i - 1]!.key === heard[j - 1]!.key;
      if (cost[i]![j] === cost[i - 1]![j - 1]! + (same ? 0 : 1)) {
        ops.push(same ? { kind: 'match', target: i - 1, heard: j - 1 } : { kind: 'sub', target: i - 1, heard: j - 1 });
        i -= 1;
        j -= 1;
        continue;
      }
    }
    if (i > 0 && cost[i]![j] === cost[i - 1]![j]! + 1) {
      ops.push({ kind: 'del', target: i - 1 });
      i -= 1;
      continue;
    }
    ops.push({ kind: 'ins', heard: j - 1 });
    j -= 1;
  }
  return ops.reverse();
}

function uniqueTranscripts(transcripts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of transcripts) {
    const text = String(raw ?? '').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function scoreSpeakBack(target: string, transcript: string): SpeakBackScore {
  const targetTokens = tokenize(target);
  const heardTokens = tokenize(transcript);
  const heard = String(transcript ?? '').trim();
  if (targetTokens.length === 0) {
    return { score: 0, matched: 0, targetCount: 0, extras: 0, heard, words: [] };
  }

  const ops = align(targetTokens, heardTokens);
  // Target words keep their order so the chips read like the phrase; extra
  // words are appended, never interleaved before the word they followed.
  const words: (SpeakBackWord | null)[] = targetTokens.map(() => null);
  const extrasHeard: SpeakBackWord[] = [];
  let matched = 0;
  let extras = 0;

  for (const op of ops) {
    if (op.kind === 'match') {
      const targetWord = targetTokens[op.target]!;
      const heardWord = heardTokens[op.heard]!;
      matched += 1;
      // Same word after folding accents. `exact` catches "está" vs "esta".
      words[op.target] = {
        word: targetWord.display,
        status: targetWord.exact === heardWord.exact ? 'hit' : 'close',
      };
    } else if (op.kind === 'sub') {
      matched += 0.5;
      words[op.target] = {
        word: targetTokens[op.target]!.display,
        status: 'miss',
        heard: heardTokens[op.heard]!.display,
      };
    } else if (op.kind === 'del') {
      words[op.target] = { word: targetTokens[op.target]!.display, status: 'miss' };
    } else {
      extras += 1;
      extrasHeard.push({ word: heardTokens[op.heard]!.display, status: 'extra' });
    }
  }

  const credit = Math.max(0, matched - extras * 0.25);
  const score = Math.round(Math.min(1, credit / targetTokens.length) * 100);
  return {
    score,
    matched,
    targetCount: targetTokens.length,
    extras,
    heard,
    words: [...words.filter((word): word is SpeakBackWord => word !== null), ...extrasHeard],
  };
}

/**
 * Score every alternative the recognizer returned and keep the best. One
 * misheard word in the first guess shouldn't fail an otherwise correct answer.
 */
export function bestSpeakBack(target: string, transcripts: string[]): SpeakBackScore {
  const options = uniqueTranscripts(transcripts);
  if (options.length === 0) return scoreSpeakBack(target, '');
  return options.map((text) => scoreSpeakBack(target, text)).sort((a, b) => b.score - a.score)[0]!;
}

export function speakBackVerdict(score: number): SpeakBackVerdict {
  if (score >= 90) return 'great';
  if (score >= 75) return 'good';
  if (score >= 50) return 'almost';
  return 'again';
}
