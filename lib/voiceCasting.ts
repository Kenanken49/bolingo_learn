/**
 * Deterministic character → installed-voice casting.
 *
 * The old allocator gave the best voice to whichever character happened to
 * speak first, so opening Settings and auditioning Bingo could permanently
 * change Livia's voice in the next lesson. This module plans the whole cast for
 * a language in one pass instead:
 *
 *  1. Fixed cast order: Livia, Bingo, Zora. Auditions and lessons both read the
 *     same plan, so the order in which characters are heard cannot matter.
 *  2. Fixed ranking with an explicit tie-break on locale/name/identifier, so the
 *     platform returning the same voices in a different order cannot remap them.
 *  3. Gender is a preference, not a hard filter: if the matching-gender pool is
 *     exhausted (or absent), the character still gets a usable native voice.
 *
 * Nothing here imports React Native or expo-speech, so the Node guard can run
 * the real planner against synthetic voice lists.
 */

export type MentorId = 'livia' | 'bingo' | 'zora';
export type VoiceGender = 'feminine' | 'masculine';

export interface CastVoice {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
}

/** Only the fields the planner needs from LanguagePreset. */
export interface CastLanguagePreset {
  base: string;
  locales: string[];
  related: string[];
}

export interface CastAssignment<T extends CastVoice> {
  voice: T | null;
  locale: string;
  hasVoiceList: boolean;
  matchedVoice: boolean;
  approximate: boolean;
}

/** Fixed order is the contract that makes casting independent of call order. */
export const VOICE_CAST_ORDER: MentorId[] = ['livia', 'bingo', 'zora'];

export const CHARACTER_GENDER: Record<MentorId, VoiceGender> = {
  livia: 'feminine',
  bingo: 'masculine',
  zora: 'feminine',
};

const FEMININE_VOICE =
  /\b(samantha|ava|allison|susan|karen|moira|tessa|serena|victoria|zira|aria|jenny|sonia|natasha|libby|michelle|paulina|monica|marisol|lucia|laura|carmen|elena|isabel|paula|sofia|valentina|camila|marta|amelie|audrey|celine|anna|petra|katja|yelda|milena|joana|amelia)\b/i;

const MASCULINE_VOICE =
  /\b(alex|aaron|arthur|daniel|david|diego|carlos|pablo|jorge|raul|enrique|javier|manuel|pedro|miguel|andres|fernando|fred|tom|guy|ryan|george|james|liam|thomas|mark|markus|stefan|hans|klaus|oliver|gordon|rishi|male|hombre)\b/i;

const NOVELTY_VOICE =
  /whisper|novelty|zarvox|albert|bad news|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|wobble|bahh|deranged|hysterical|pipe organ|grandma|grandpa|rocko|shelley|flo|sandy|eddy|reed|junior|ralph|fred/i;

export function normalizeLocale(locale: string): string {
  return locale.toLowerCase().replace('_', '-');
}

export function baseLocale(locale: string): string {
  return normalizeLocale(locale).split('-')[0] ?? '';
}

export function voiceGender(voice: CastVoice): VoiceGender | null {
  if (FEMININE_VOICE.test(voice.name)) return 'feminine';
  if (MASCULINE_VOICE.test(voice.name)) return 'masculine';
  return null;
}

/**
 * Quality score. The score is deliberately independent of the voices' array
 * position; ties are resolved separately by `voiceKey()`.
 */
export function voiceScore(voice: CastVoice, preset: CastLanguagePreset): number {
  const locale = normalizeLocale(voice.language);
  const preferred = preset.locales.findIndex(
    (candidate) => normalizeLocale(candidate) === locale
  );
  let score = preferred >= 0 ? 100 - preferred * 5 : 60;
  if (voice.quality === 'Enhanced') score += 30;
  // Android surfaces neural/enhanced quality in the name, not the enum.
  if (/(enhanced|premium|neural|natural|wavenet|studio)/i.test(voice.name)) score += 20;
  // Android names its cloud voices "-network" and its compact on-device ones
  // "-local"; the network voice is the one that sounds like a person.
  const id = `${voice.name} ${voice.identifier}`;
  if (/network|online/i.test(id)) score += 18;
  if (/compact|espeak|pico|sapi|eloquence/i.test(id)) score -= 22;
  if (
    /(google|microsoft|siri|samantha|ava|allison|karen|moira|tessa|serena|paulina|monica|marisol|jorge|diego|amelie|audrey|thomas|anna|petra|markus|aria|jenny|sonia|natasha|libby|ryan)/i.test(
      voice.name
    )
  ) {
    score += 6;
  }
  if (NOVELTY_VOICE.test(voice.name)) score -= 200;
  return score;
}

function voiceKey(voice: CastVoice): string {
  return [
    normalizeLocale(voice.language),
    voice.name.toLowerCase(),
    voice.identifier.toLowerCase(),
  ].join('|');
}

/** Stable highest-first sort; equal scores fall back to a platform-independent key. */
function ranked<T extends CastVoice>(pool: readonly T[], preset: CastLanguagePreset): T[] {
  return [...pool].sort((a, b) => {
    const delta = voiceScore(b, preset) - voiceScore(a, preset);
    if (delta !== 0) return delta;
    const aKey = voiceKey(a);
    const bKey = voiceKey(b);
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });
}

function takeForCharacter<T extends CastVoice>(
  native: T[],
  unused: T[],
  character: MentorId,
  preset: CastLanguagePreset
): T | null {
  const wanted = CHARACTER_GENDER[character];
  const castPool = unused.filter((voice) => voiceGender(voice) === wanted);
  // Prefer an unused voice of the character's cast gender. If that pool is
  // empty, any unused native voice is better than silence. If every voice is
  // already assigned, reuse the best native voice so one-voice devices still
  // let all three characters speak.
  const pool = castPool.length > 0 ? castPool : unused;
  const chosen = ranked(pool, preset)[0] ?? ranked(native, preset)[0] ?? null;
  if (chosen) {
    const index = unused.indexOf(chosen);
    if (index >= 0) unused.splice(index, 1);
  }
  return chosen;
}

function emptyAssignment<T extends CastVoice>(
  preset: CastLanguagePreset,
  hasVoiceList: boolean
): CastAssignment<T> {
  return {
    voice: null,
    locale: preset.locales[0] ?? preset.base,
    hasVoiceList,
    matchedVoice: false,
    approximate: false,
  };
}

/**
 * Plan every character for one language. This is the only allocator; there is
 * no mutable "already used" set shared with auditions.
 */
export function planVoiceCast<T extends CastVoice>(
  voices: readonly T[],
  preset: CastLanguagePreset
): Record<MentorId, CastAssignment<T>> {
  const empty = emptyAssignment<T>(preset, voices.length > 0);
  const plan = {
    livia: { ...empty },
    bingo: { ...empty },
    zora: { ...empty },
  } as Record<MentorId, CastAssignment<T>>;

  const candidates = voices.filter((voice) => !NOVELTY_VOICE.test(voice.name));
  const native = candidates.filter((voice) => baseLocale(voice.language) === preset.base);

  if (native.length > 0) {
    const unused = [...native];
    for (const character of VOICE_CAST_ORDER) {
      const voice = takeForCharacter(native, unused, character, preset);
      plan[character] = {
        voice,
        locale: voice?.language ?? (preset.locales[0] ?? preset.base),
        hasVoiceList: true,
        matchedVoice: voice !== null,
        approximate: false,
      };
    }
    return plan;
  }

  // Swahili can use an Italian/Spanish voice when no native one is installed.
  // This fallback is shared across characters, as before, but computed from a
  // deterministic ranking rather than whichever character asked first.
  for (const related of preset.related) {
    const fallback = ranked(
      candidates.filter((voice) => baseLocale(voice.language) === related),
      preset
    )[0];
    if (fallback) {
      for (const character of VOICE_CAST_ORDER) {
        plan[character] = {
          voice: fallback,
          locale: fallback.language,
          hasVoiceList: true,
          matchedVoice: false,
          approximate: true,
        };
      }
      return plan;
    }
  }

  return plan;
}
