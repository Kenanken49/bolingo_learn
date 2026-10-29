import * as Speech from 'expo-speech';
import { VoiceQuality, type Voice } from 'expo-speech';

/**
 * Character pronunciation for language courses.
 *
 * Tuned the way Duolingo's characters sound: the *voice* is native to the
 * language being taught and the *character* only changes pacing. Pitch is
 * never shifted — a pitch-shifted TTS voice drags its formants with it, which
 * is exactly what makes robot voices sound foreign. Lily sounds like Lily
 * because of her slow, flat delivery, not because her vowels moved.
 *
 * Layers, in order of importance:
 *  1. Correct locale for every word (English scaffolding vs target phrase).
 *  2. The best installed voice (enhanced/neural preferred, novelty voices banned).
 *  3. Clean text: blanks filled, glosses and markup stripped, punctuation kept.
 *  4. Character pacing: Livia models slowly, Bingo narrates at conversational speed.
 *
 * On-device only: no API key, no per-play cost, still works offline.
 */

export type Mentor = 'livia' | 'bingo';

export interface LanguagePreset {
  base: 'es' | 'fr' | 'de' | 'sw' | 'en';
  label: string;
  /** Preference order, not a hard requirement. */
  locales: string[];
  /**
   * Voice bases that pronounce this language's spelling acceptably when no
   * native voice is installed. Swahili uses the same five pure vowels as
   * Italian and Spanish, so those voices land far closer than English does.
   */
  related: string[];
  /** Articles, used to complete "la" + "niña" into a speakable noun phrase. */
  determiners: string[];
}

const SPANISH: LanguagePreset = {
  base: 'es',
  label: 'Spanish',
  locales: ['es-MX', 'es-US', 'es-ES', 'es'],
  related: ['it'],
  determiners: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'],
};

const FRENCH: LanguagePreset = {
  base: 'fr',
  label: 'French',
  locales: ['fr-FR', 'fr-CA', 'fr-BE', 'fr'],
  related: [],
  determiners: ['le', 'la', 'les', 'un', 'une', 'des'],
};

const GERMAN: LanguagePreset = {
  base: 'de',
  label: 'German',
  locales: ['de-DE', 'de-AT', 'de-CH', 'de'],
  related: [],
  determiners: ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer'],
};

const SWAHILI: LanguagePreset = {
  base: 'sw',
  label: 'Swahili',
  locales: ['sw-KE', 'sw-TZ', 'sw-UG', 'sw'],
  related: ['it', 'es'],
  determiners: [],
};

const ENGLISH: LanguagePreset = {
  base: 'en',
  label: 'English',
  locales: ['en-US', 'en-GB', 'en-KE', 'en-AU', 'en'],
  related: [],
  determiners: ['a', 'an', 'the'],
};

const PRESETS: Record<string, LanguagePreset> = {
  spanish: SPANISH,
  french: FRENCH,
  german: GERMAN,
  swahili: SWAHILI,
  english: ENGLISH,
};

/** The app's own narration language: Bingo reads instructions in this voice. */
export const APP_SPEECH = ENGLISH;

export function languageForLesson(lessonId: string): LanguagePreset | null {
  const prefix = lessonId.toLowerCase().split('-')[0];
  return PRESETS[prefix] ?? null;
}

/**
 * Character identity lives in pacing only (1.0 pitch = the voice the OS
 * recorded). Livia is the patient model; Bingo is the lively narrator.
 */
const CHARACTER_VOICE: Record<Mentor, { pitch: number; rate: number; slowRate: number }> = {
  livia: { pitch: 1, rate: 0.86, slowRate: 0.62 },
  bingo: { pitch: 1, rate: 0.98, slowRate: 0.8 },
};

type PronounceQuestion = { prompt: string; correctChain: string[] };

const TARGET_CLUES: Record<LanguagePreset['base'], RegExp> = {
  es: /\b(hola|gracias|adiós|por favor|sí|el|la|los|las|un|una|de|del|que|y|en|es|son|está|estás|soy|eres|tengo|tiene|puedo|quiero|me|mi|tu|su|como|cómo|muy|bien|mal|mañana|hoy|agua|comida|casa|libro|niña|niño|amigo|amiga|pollo|tren|hermana|hermano|hambre|hablo|hablé|hice|buenas|buenos|noches|días|tardes|dónde|cuánto|cuánta|usted|nosotros|ellos|comí|bebí|habites|habité)\b/i,
  fr: /\b(bonjour|bonsoir|merci|au revoir|salut|coucou|s'il|vous|plaît|oui|non|le|la|les|un|une|des|du|de|et|en|est|sont|je|j'ai|tu|il|elle|nous|avez|ai|faim|fromage|bienvenue|huit|quatre|vingts|pain|eau|maison|livre|fille|garçon|ami|amie|aujourd'hui|demain|hier|où|comment|ça|va|addition|voudrais)\b/i,
  de: /\b(hallo|danke|bitte|tschüss|ja|nein|der|die|das|den|dem|des|ein|eine|und|in|ist|sind|ich|du|er|sie|wir|habe|hat|esse|trinke|hunger|wasser|brot|haus|buch|frau|mann|kind|guten|morgen|abend|wie|geht|ihnen|uhr|halb|groß|klein|glücklich)\b/i,
  sw: /\b(habari|asante|karibu|tafadhali|ndiyo|hapana|na|ya|wa|kwa|ni|mimi|wewe|yeye|sisi|ninyi|wao|ninakula|maembe|yako|chakula|maji|nyumbani|kitabu|mtoto|mwanamke|mwanaume|rafiki|asubuhi|jioni|usiku|hujambo|sijambo|shikamoo|marahaba|nzuri|vipi|uko)\b/i,
  en: /\b(the|hello|thanks|thank|please|welcome|sorry|good|morning|night|yes|no|you|your|i|am|is|are|where|what|when|how|this|that|these|those)\b/i,
};

const ENGLISH_CLUES = /\b(the|is|are|am|was|were|you|your|my|we|they|he|she|it|this|that|these|those|and|or|of|to|in|on|at|for|with|from|what|which|how|who|where|when|why|thank|thanks|hello|goodbye|please|welcome|sorry|yes|good|bad|morning|night|mean|means|word|sentence|translate|fill|gap|say|choose|pick|complete|answer)\b/i;

/** Helper words that make a short quoted span read as English scaffolding. */
const ANY_DETERMINER = new Set([
  ...SPANISH.determiners,
  ...FRENCH.determiners,
  ...GERMAN.determiners,
  ...ENGLISH.determiners,
]);

const NOVELTY_VOICE =
  /whisper|novelty|zarvox|albert|bad news|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|wobble|bahh|deranged|hysterical|pipe organ|grandma|grandpa|rocko|shelley|flo|sandy|eddy|reed|junior|ralph|fred/i;

function normalizeLocale(locale: string): string {
  return locale.toLowerCase().replace('_', '-');
}

function baseLocale(locale: string): string {
  return normalizeLocale(locale).split('-')[0];
}

function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text);
}

/* ------------------------------------------------------------------ *
 * Text preparation
 * ------------------------------------------------------------------ */

/** Interrogatives that need question intonation even when the bank drops the mark. */
const QUESTION_START =
  /^(?:[¿¡]\s*)?(?:dónde|cómo|cuándo|quién|cuál|qué|por qué|où|comment|pourquoi|quand|quel|quelle|qu'est-ce|combien|wie|wo|was|warum|wer|wann|which|what|where|who|when|why|how|do|does|did|is|are|can|could|would|should|habari|wapi|nini|vipi)\b/i;

/**
 * Turn authored content into something a speech engine can actually say.
 * Keeps accents and ¿ ¡ — they carry stress and intonation — but drops the
 * scaffolding that gets read aloud literally ("underscore underscore").
 */
export function spokenPhrase(
  raw: string,
  options: { fill?: string; preset?: LanguagePreset; end?: boolean } = {}
): string {
  const end = options.end ?? true;
  let text = String(raw ?? '').normalize('NFC');

  // Markup and arrows.
  text = text.replace(/`+/g, ' ').replace(/\*+/g, ' ');
  text = text.replace(/\s*(?:->|→|=>|>)\s*/g, ', ');
  // Bracketed asides and parenthesised English glosses.
  text = text.replace(/\[[^\]]*\]/g, ' ');
  text = text.replace(/\([^)]*\)/g, ' ');

  // Fill gaps before stripping, so "___ hablo español" becomes a sentence.
  if (options.fill) text = text.replace(/_{2,}/g, options.fill);
  text = text.replace(/_{2,}/g, ' ');

  // Quotes around the phrase itself; inner quotes become pauses.
  text = text.replace(/["“”«»]/g, ' ');
  text = text.replace(/[‘’]/g, "'");

  // Ellipses read as a hang, not a pause, on several engines.
  text = text.replace(/\s*…+\s*/g, '. ').replace(/\s*\.{3,}\s*/g, '. ');
  text = text.replace(/\s*[·•|]+\s*/g, ', ');

  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/^[,;:.\s]+|[,;:\s]+$/g, '').trim();
  // Sentence case, including after a Spanish opening mark.
  if (text) {
    const offset = /^[¿¡]/.test(text) ? 1 : 0;
    text = text.slice(0, offset) + text.charAt(offset).toUpperCase() + text.slice(offset + 1);
  }

  // Intonation: a question without its mark falls into statement pitch, and a
  // phrase without any mark drifts upward as if unsure. Engines only need the
  // final mark, but Spanish reads best with both.
  if (end && text && !/[.!?…]$/.test(text)) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length > 1 && QUESTION_START.test(text)) {
      text = `${options.preset?.base === 'es' ? '¿' : ''}${text}?`;
    } else if (/[\p{L}\p{N}]$/u.test(text)) {
      text = `${text}.`;
    }
  }
  return text;
}

/** Kept for callers that only need the model's single phrase. */
function cleanPhrase(text: string, preset?: LanguagePreset): string {
  return spokenPhrase(text, preset ? { preset } : {}).replace(/[.。]$/, '');
}

function firstQuoted(text: string): string | null {
  const match = text.match(/["“«]([^"”»]{1,90})["”»]/);
  return match?.[1]?.trim() ?? null;
}

function quotedSpans(prompt: string): { text: string; start: number; end: number }[] {
  const spans: { text: string; start: number; end: number }[] = [];
  const re = /["“«]([^"”»]{1,120})["”»]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(prompt)) !== null) {
    spans.push({ text: match[1] ?? '', start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

function targetScore(text: string, preset: LanguagePreset): number {
  if (!text) return -99;
  let score = 0;
  const clean = cleanPhrase(text, preset);
  if (preset.base !== 'en' && /[áéíóúñüçœßàâêîôûëïöä]/.test(clean)) score += 3;
  if (TARGET_CLUES[preset.base].test(clean)) score += 2;
  if (preset.base !== 'en' && ENGLISH_CLUES.test(clean)) score -= 2;
  return score;
}

/** Is this quoted span written in the language being taught? */
function isTargetSpan(text: string, preset: LanguagePreset): boolean {
  if (!hasLetters(text)) return false;
  const score = targetScore(text, preset);
  if (score > 0) return true;
  if (score < 0) return false;
  // Neutral span: a short phrase with no English scaffolding is the target.
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 4 && !ENGLISH_CLUES.test(text);
}

function embeddedTarget(prompt: string): string | null {
  // "What does ¿Cómo estás? mean?" → the phrase before "mean".
  const whatDoes = prompt.match(/\bwhat does\s+(.+?)\s+(?:literally\s+)?mean\b/i);
  if (whatDoes) return whatDoes[1];

  // "¿Cómo estás? means…" / "Tengo hambre literally means…"
  const meansAt = prompt.search(/\b(?:literally\s+)?means?\b/i);
  if (meansAt > 0) {
    const lead = prompt.slice(0, meansAt).trim();
    if (lead && !/^(what|which|how|who|where|when|why|the word|this|that)\b/i.test(lead)) return lead;
  }
  return null;
}

const ARTICLE_QUESTION = /\b(article|determiner)\b|\bgoes with\b/i;

/**
 * "Which article goes with 'niña'?" is answered "la", but nobody says "la"
 * alone — learners need to hear the noun phrase: "la niña".
 */
function nounPhrase(prompt: string, chain: string, preset: LanguagePreset): string | null {
  if (!ARTICLE_QUESTION.test(prompt)) return null;
  const noun = firstQuoted(prompt);
  if (!noun) return null;
  const determiner = chain.trim().toLowerCase();
  if (!preset.determiners.includes(determiner)) return null;
  if (ANY_DETERMINER.has(noun.trim().toLowerCase())) return null;
  return spokenPhrase(`${chain.trim()} ${noun.trim()}`, { preset });
}

/**
 * Choose the phrase a learner should hear.
 *
 * BUILD questions already carry the target tokens. Multiple-choice questions
 * can put the target in either the prompt ("Gracias" means…) or the answer
 * (How do you say hello in Spanish?). Score both, fill any gap with the answer
 * so the engine never reads underscores, and let the question shape break ties.
 */
export function phraseForQuestion(question: PronounceQuestion, preset: LanguagePreset): string {
  const rawChain = question.correctChain.join(' ').replace(/\s+/g, ' ').trim();
  const chain = cleanPhrase(rawChain, preset);
  const prompt = question.prompt;

  const noun = nounPhrase(prompt, chain, preset);
  if (noun) return noun;

  if (question.correctChain.length > 1) return chain;

  const rawQuoted = firstQuoted(prompt);
  const hasGap = !!rawQuoted && /_{2,}/.test(rawQuoted);
  // A gap in the example is filled with the answer being taught, so the learner
  // hears the complete sentence instead of "blank hablo español".
  // The raw answer is lowercase, so it drops into the sentence naturally.
  const quoted = rawQuoted ? cleanPhrase(spokenPhrase(rawQuoted, { fill: rawChain, preset }), preset) : null;

  if (hasGap && quoted) return cleanPhrase(quoted, preset);

  if (preset.base === 'en') {
    const asksGrammar = /\b(plural|singular|form|article|preposition|tense|verb|pronoun|spell|spelling|opposite|synonym|antonym|correct|fill|complete)\b/i.test(
      prompt
    );
    if (quoted && !asksGrammar) return cleanPhrase(quoted, preset);
    return chain;
  }

  // "What is 'hola' in English?" asks for the meaning, so the quoted target
  // phrase is the one worth hearing — not the English translation.
  const asksEnglish = /\b(?:in|into|to)\s+english\b|\benglish\s+(?:word|translation|meaning|equivalent|for)\b/i.test(prompt);
  if (asksEnglish) return cleanPhrase(quoted ?? chain, preset) || chain;

  const asksForTargetForm = /\b(which|choose|pick|select|complete|fill|how do you say|word for|translation|plural|singular|conjugat|form of|feminine|masculine|article|tense|opposite|synonym|antonym)\b/i.test(
    prompt
  );
  if (asksForTargetForm) return chain || cleanPhrase(quoted ?? '', preset) || chain;

  if (quoted) {
    const quotedScore = targetScore(quoted, preset);
    const answerScore = targetScore(chain, preset);
    if (quotedScore > answerScore + 1) return cleanPhrase(quoted, preset);
    if (answerScore > quotedScore + 1) return chain;
    if (/\b(means?|meaning|translate|is .* for)\b/i.test(prompt)) return cleanPhrase(quoted, preset);
    return chain || cleanPhrase(quoted, preset);
  }

  return cleanPhrase(embeddedTarget(prompt) ?? chain, preset) || chain;
}

/* ------------------------------------------------------------------ *
 * Mixed-language prompts
 * ------------------------------------------------------------------ */

export interface SpeechSegment {
  text: string;
  preset: LanguagePreset;
}

function push(list: SpeechSegment[], text: string, preset: LanguagePreset): void {
  const clean = text.trim();
  if (!hasLetters(clean)) return;
  const last = list[list.length - 1];
  if (last && last.preset.base === preset.base) last.text = `${last.text} ${clean}`.replace(/\s+/g, ' ').trim();
  else list.push({ text: clean, preset });
}

/**
 * Split a prompt into runs of target language and runs of English so Bingo
 * reads "What does, ¿Cómo estás?, mean?" instead of mangling the Spanish.
 */
export function promptSegments(prompt: string, preset: LanguagePreset): SpeechSegment[] {
  if (preset.base === 'en') {
    const text = spokenPhrase(prompt);
    return text ? [{ text, preset }] : [];
  }

  const segments: SpeechSegment[] = [];
  let cursor = 0;
  for (const span of quotedSpans(prompt)) {
    push(segments, spokenPhrase(prompt.slice(cursor, span.start), { end: false }), APP_SPEECH);
    const target = isTargetSpan(span.text, preset);
    push(segments, spokenPhrase(span.text, target ? { preset, end: false } : { end: false }), target ? preset : APP_SPEECH);
    cursor = span.end;
  }
  push(segments, spokenPhrase(prompt.slice(cursor)), APP_SPEECH);
  return segments.slice(0, 5);
}

/* ------------------------------------------------------------------ *
 * Voice selection
 * ------------------------------------------------------------------ */

let voicesPromise: Promise<Voice[]> | null = null;
const voiceCache = new Map<string, Voice | null>();
const usedIdentifiers = new Set<string>();

/** Voices can arrive late on web; never block a tap for more than 1.2s. */
function loadVoices(): Promise<Voice[]> {
  if (!voicesPromise) {
    voicesPromise = Promise.race([
      Speech.getAvailableVoicesAsync().catch(() => [] as Voice[]),
      new Promise<Voice[]>((resolve) => setTimeout(() => resolve([]), 1200)),
    ]);
  }
  return voicesPromise;
}

function voiceScore(voice: Voice, preset: LanguagePreset): number {
  const locale = normalizeLocale(voice.language);
  const preferred = preset.locales.findIndex((candidate) => normalizeLocale(candidate) === locale);
  let score = preferred >= 0 ? 100 - preferred * 5 : 60;
  if (voice.quality === VoiceQuality.Enhanced) score += 30;
  // Android surfaces neural/enhanced quality in the name, not the enum.
  if (/(enhanced|premium|neural|natural)/i.test(voice.name)) score += 20;
  if (/(google|microsoft|siri|samantha|ava|eloquence)/i.test(voice.name)) score += 5;
  if (NOVELTY_VOICE.test(voice.name)) score -= 200;
  return score;
}

interface ResolvedVoice {
  voice: Voice | null;
  locale: string;
  hasVoiceList: boolean;
  matchedVoice: boolean;
  approximate: boolean;
}

function pickBest(voices: Voice[], base: string, preset: LanguagePreset, avoid: Set<string>): Voice | null {
  const candidates = voices.filter((v) => !NOVELTY_VOICE.test(v.name));
  const native = candidates.filter((v) => baseLocale(v.language) === base);
  if (native.length === 0) return null;
  const ranked = [...native].sort((a, b) => voiceScore(b, preset) - voiceScore(a, preset));
  // Distinct character voices: the narrator avoids the model's voice when a
  // second acceptable voice exists.
  return ranked.find((v) => !avoid.has(v.identifier)) ?? ranked[0] ?? null;
}

async function resolveVoice(preset: LanguagePreset, character: Mentor): Promise<ResolvedVoice> {
  // English is the one language both characters speak, so it gets two lanes:
  // Livia models with the best voice, Bingo narrates with a different one.
  const key = preset.base === 'en' ? `en:${character}` : preset.base;
  if (voiceCache.has(key)) {
    const cached = voiceCache.get(key) ?? null;
    return {
      voice: cached,
      locale: cached?.language ?? preset.locales[0] ?? preset.base,
      hasVoiceList: true,
      matchedVoice: !!cached,
      approximate: false,
    };
  }

  const voices = await loadVoices();
  if (voices.length === 0) {
    // No usable list (common on web before voices load): let the engine choose
    // by locale. Still far better than speaking Spanish with `en-US`.
    return {
      voice: null,
      locale: preset.locales[0] ?? preset.base,
      hasVoiceList: false,
      matchedVoice: false,
      approximate: false,
    };
  }

  const localeSlot = preset.base === 'en' ? new Set(usedIdentifiers) : new Set<string>();
  const native = pickBest(voices, preset.base, preset, localeSlot);
  if (native) {
    voiceCache.set(key, native);
    usedIdentifiers.add(native.identifier);
    return { voice: native, locale: native.language, hasVoiceList: true, matchedVoice: true, approximate: false };
  }

  for (const related of preset.related) {
    const fallback = pickBest(voices, related, preset, new Set<string>());
    if (fallback) {
      voiceCache.set(key, fallback);
      return { voice: fallback, locale: fallback.language, hasVoiceList: true, matchedVoice: false, approximate: true };
    }
  }

  voiceCache.set(key, null);
  return {
    voice: null,
    locale: preset.locales[0] ?? preset.base,
    hasVoiceList: true,
    matchedVoice: false,
    approximate: false,
  };
}

/* ------------------------------------------------------------------ *
 * Speaking
 * ------------------------------------------------------------------ */

export interface PronounceResult {
  spoken: boolean;
  /** Locale actually requested from the engine. */
  locale: string;
  /** What the engine was asked to say (blank filled, glosses stripped). */
  spokenText: string;
  /** True when the OS reported at least one voice at all. */
  hasVoiceList: boolean;
  /** True when that voice is in the target language (any region). */
  matchedVoice: boolean;
  /** True when a related-language voice stood in for a missing native one. */
  approximate: boolean;
  voiceName?: string;
}

let generation = 0;

export async function stopSpeaking(): Promise<void> {
  generation += 1;
  try {
    await Speech.stop();
  } catch {}
}

function estimatedMs(text: string, rate: number): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.min(20000, Math.max(1400, (words * 380 + 500) / Math.max(0.5, rate)));
}

/**
 * One utterance, resolved on completion. The timer is a safety net for engines
 * that never fire `onDone`; it keeps a mixed-language read from stalling.
 */
function speakChunk(
  text: string,
  options: { locale: string; rate: number; pitch: number; voiceId?: string; volume: number }
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(true), estimatedMs(text, options.rate) + 1200);
    try {
      Speech.speak(text, {
        language: options.locale,
        pitch: options.pitch,
        rate: options.rate,
        volume: options.volume,
        ...(options.voiceId ? { voice: options.voiceId } : {}),
        onDone: () => finish(true),
        onStopped: () => finish(false),
        onError: () => finish(false),
      });
    } catch {
      finish(false);
    }
  });
}

/**
 * Speak one phrase as a character. Always stops the previous utterance first so
 * rapid taps never queue a pile of voices.
 */
export async function speakAs({
  character,
  text,
  language,
  slow = false,
  fill,
}: {
  character: Mentor;
  text: string;
  language: LanguagePreset;
  slow?: boolean;
  fill?: string;
}): Promise<PronounceResult> {
  const phrase = spokenPhrase(text, { fill, preset: language });
  const fallbackLocale = language.locales[0] ?? language.base;
  if (!phrase) {
    return {
      spoken: false,
      locale: fallbackLocale,
      spokenText: '',
      hasVoiceList: false,
      matchedVoice: false,
      approximate: false,
    };
  }

  const token = generation + 1;
  await stopSpeaking();
  const resolved = await resolveVoice(language, character);
  if (token !== generation) {
    return {
      spoken: false,
      locale: resolved.locale,
      spokenText: phrase,
      hasVoiceList: resolved.hasVoiceList,
      matchedVoice: resolved.matchedVoice,
      approximate: resolved.approximate,
    };
  }

  const style = CHARACTER_VOICE[character];
  const ok = await speakChunk(phrase, {
    locale: resolved.locale,
    rate: slow ? style.slowRate : style.rate,
    pitch: style.pitch,
    volume: 1,
    ...(resolved.voice ? { voiceId: resolved.voice.identifier } : {}),
  });

  return {
    spoken: ok,
    locale: resolved.locale,
    spokenText: phrase,
    hasVoiceList: resolved.hasVoiceList,
    matchedVoice: resolved.matchedVoice,
    approximate: resolved.approximate,
    voiceName: resolved.voice?.name,
  };
}

/** Speak mixed-language segments in order, each in its own language. */
export async function speakSegments(
  segments: SpeechSegment[],
  { character, slow = false }: { character: Mentor; slow?: boolean }
): Promise<PronounceResult[]> {
  if (segments.length === 0) return [];
  const token = generation + 1;
  await stopSpeaking();
  const results: PronounceResult[] = [];
  for (const segment of segments) {
    if (token !== generation) break;
    const resolved = await resolveVoice(segment.preset, character);
    if (token !== generation) break;
    const style = CHARACTER_VOICE[character];
    const ok = await speakChunk(segment.text, {
      locale: resolved.locale,
      rate: slow ? style.slowRate : style.rate,
      pitch: style.pitch,
      volume: 1,
      ...(resolved.voice ? { voiceId: resolved.voice.identifier } : {}),
    });
    results.push({
      spoken: ok,
      locale: resolved.locale,
      spokenText: segment.text,
      hasVoiceList: resolved.hasVoiceList,
      matchedVoice: resolved.matchedVoice,
      approximate: resolved.approximate,
      voiceName: resolved.voice?.name,
    });
    if (!ok) break;
  }
  return results;
}
