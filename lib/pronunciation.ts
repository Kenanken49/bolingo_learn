import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { Platform } from 'react-native';
import {
  planVoiceCast,
  type CastAssignment,
  type MentorId,
} from './voiceCasting';

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
 *  2. The best installed voice (neural/network preferred, robotic and novelty
 *     voices pushed down) and a separate voice for each character.
 *  3. Clean text: blanks filled, glosses and markup stripped, punctuation kept.
 *  4. Human delivery: breath points inside long sentences and a rate that
 *     adapts to how much is being said — the two things a person does that a
 *     metronome-paced engine does not.
 *  5. Character pacing: Livia models slowly, Bingo narrates at conversational speed.
 *
 * On-device only: no API key, no per-play cost, still works offline.
 */

export type Mentor = MentorId;

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

/** The Swahili preset, exported so Settings can check a device's Swahili voice. */
export const SWAHILI_SPEECH = SWAHILI;

/** Target-language presets for Roleplay's Livia and Bingo tutors. */
export const SPANISH_SPEECH = SPANISH;
export const FRENCH_SPEECH = FRENCH;
export const GERMAN_SPEECH = GERMAN;

export function languageForLesson(lessonId: string): LanguagePreset | null {
  const prefix = lessonId.toLowerCase().split('-')[0];
  return PRESETS[prefix] ?? null;
}

/**
 * Character identity lives in pacing only (1.0 pitch = the voice the OS
 * recorded). Livia is the patient language model, Bingo the lively narrator,
 * Zora the brisk build coach.
 */
const CHARACTER_VOICE: Record<Mentor, { pitch: number; rate: number; slowRate: number }> = {
  livia: { pitch: 1, rate: 0.86, slowRate: 0.62 },
  bingo: { pitch: 1, rate: 0.98, slowRate: 0.8 },
  zora: { pitch: 1, rate: 0.93, slowRate: 0.7 },
};

type PronounceQuestion = { prompt: string; correctChain: string[]; kind?: string };

const TARGET_CLUES: Record<LanguagePreset['base'], RegExp> = {
  es: /\b(hola|gracias|adiós|por favor|sí|el|la|los|las|un|una|de|del|que|y|en|es|son|está|estás|soy|eres|tengo|tiene|puedo|quiero|me|mi|tu|su|como|cómo|muy|bien|mal|mañana|hoy|agua|comida|casa|libro|niña|niño|amigo|amiga|pollo|tren|hermana|hermano|hambre|hablo|hablé|hice|buenas|buenos|noches|días|tardes|dónde|cuánto|cuánta|usted|nosotros|ellos|comí|bebí|habites|habité|médico|farmacia|duele|duelen|cabeza|estómago|fiebre|tos|ambulancia|alérgico|alérgica|ayudarme|cuándo|quién|nada|nadie|tiempo|baño)\b/i,
  fr: /\b(bonjour|bonsoir|merci|au revoir|salut|coucou|s'il|vous|plaît|oui|non|le|la|les|un|une|des|du|de|et|en|est|sont|je|j'ai|tu|il|elle|nous|avez|ai|faim|fromage|bienvenue|huit|quatre|vingts|pain|eau|maison|livre|fille|garçon|ami|amie|aujourd'hui|demain|hier|où|comment|ça|va|addition|voudrais|médecin|pharmacie|mal|tête|ventre|fièvre|toux|ambulance|allergique|aider|quand|pourquoi|qui|combien|rien|jamais|pas|besoin|viande)\b/i,
  de: /\b(hallo|danke|bitte|tschüss|ja|nein|der|die|das|den|dem|des|ein|eine|und|in|ist|sind|ich|du|er|sie|wir|habe|hat|esse|trinke|hunger|wasser|brot|haus|buch|frau|mann|kind|guten|morgen|abend|wie|geht|ihnen|uhr|halb|groß|klein|glücklich|arzt|apotheke|kopfschmerzen|bauchschmerzen|fieber|hustet|krankenwagen|allergisch|helfen|wo|wann|warum|wer|was|nicht|kein|keine|brauche)\b/i,
  sw: /\b(habari|asante|karibu|tafadhali|ndiyo|hapana|na|ya|wa|kwa|ni|mimi|wewe|yeye|sisi|ninyi|wao|ninakula|maembe|yako|chakula|maji|nyumbani|kitabu|mtoto|watoto|mwanamke|mwanaume|rafiki|asubuhi|jioni|usiku|hujambo|sijambo|shikamoo|marahaba|nzuri|vipi|uko|je|wapi|nini|lini|nani|gani|sipendi|hatuna|sina|hakuna|pesa|mzuri|wazuri|kizuri|vizuri|vikubwa|kubwa|ndogo|mrefu|fupi|kuliko|daktari|hospitali|naumwa|nisaidie|nahitaji|dawa|homa|tumbo|kichwa|kikohozi|dharura|iko|samahani|kumradhi|pole|unaendeleaje|niko|salama|kwaheri|tuonane|jina|langu|nani|umetoka|nimetoka|unaishi|naishi|unaitwaje|ninaitwa|nimefurahi|kukutana|nawe|unazungumza|unaongea|kiingereza|kiarabu|kijerumani|kijapani|sielewi|naelewa|sema|polepole|kurudia|kidogo|bei|ngapi|ghali|rahisi|punguza|sina|pesa|shilingi|elfu|mia|zimetosha|hamna|shida|sawa)\b/i,
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

function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text);
}

/**
 * Words a speaker naturally breathes before when they join two clauses.
 * Written Spanish drops the comma before "y"; a speaker still takes a small
 * one when the halves are long ("…pollo, y beber agua"), which is what stops
 * a sentence from arriving as one unbroken run.
 *
 * Numbers are safe: "treinta y dos" has one word before the link, below the
 * three-word threshold.
 */
const CLAUSE_LINKS: Record<LanguagePreset['base'], Set<string>> = {
  es: new Set(['y', 'e', 'o', 'u', 'pero', 'sino', 'porque']),
  fr: new Set(['et', 'ou', 'mais', 'car', 'donc', 'puis']),
  de: new Set(['und', 'oder', 'aber', 'denn', 'weil']),
  sw: new Set(['na', 'au', 'lakini', 'kama']),
  en: new Set(['and', 'but', 'or', 'because', 'so', 'yet']),
};

/**
 * Turn written punctuation into the pauses a person actually takes: dashes
 * and semicolons become commas (engines otherwise read a long, robotic hold),
 * and a comma is added before a clause link when the first half is long
 * enough to deserve a breath. Comma insertion keeps the sentence inside one
 * utterance, so the engine's pitch contour still falls naturally across it.
 */
function breathe(text: string, base: LanguagePreset['base'] = 'en'): string {
  let out = text
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/\s*;\s*/g, ', ')
    // A colon before an explanation reads as the same beat; some engines say
    // "colon" instead. Times (10:30) have no space after the colon and are
    // left alone.
    .replace(/\s*:\s+/g, ', ');

  const links = CLAUSE_LINKS[base];
  const tokens = out.split(/\s+/).filter(Boolean);
  let sinceBreak = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i] ?? '';
    const bare = token.toLowerCase().replace(/^[¿¡"'«(\[]+|[)"'»,.;:!?\]]+$/g, '');
    const previous = tokens[i - 1] ?? '';
    if (i > 0 && i < tokens.length - 1 && links.has(bare)) {
      if (sinceBreak >= 3 && !/[,;:]$/.test(previous)) tokens[i - 1] = `${previous},`;
      // The link is the clause boundary itself; the next clause starts fresh.
      sinceBreak = 0;
      continue;
    }
    if (/[.!?,;:]$/.test(token)) sinceBreak = 0;
    else sinceBreak += 1;
  }

  return tokens
    .join(' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/,{2,}/g, ',')
    // Space after a mark only when a word follows it, never before another
    // mark ("news?, so…" must not become "news? , so…").
    .replace(/([,.;:!?])(?=[^\s\d,.;:!?])/g, '$1 ')
    // A pause mark belongs between words, never at the very end: "Hola;" and
    // "Hola —" must not reach the engine as "Hola,".
    .replace(/[,;:]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * How fast this particular phrase should be delivered. A person does not say a
 * seven-word sentence at the same metronomic clip as a one-word answer: longer
 * phrases get a little more room, and very short ones are eased so the last
 * syllable is not clipped. The shift stays under 8%, so Livia still sounds like
 * Livia and the pedagogy stays predictable.
 */
export function humanRate(base: number, text: string): number {
  const words = text.split(/\s+/).filter((word) => /\p{L}/u.test(word)).length;
  const breaks = (text.match(/[,;:]/g) ?? []).length;
  let rate = base;
  if (words >= 7 || words <= 2) rate *= 0.96;
  if (breaks >= 3) rate *= 0.97;
  return Math.max(0.55, Math.min(1.35, Math.round(rate * 100) / 100));
}

/* ------------------------------------------------------------------ *
 * Text preparation
 * ------------------------------------------------------------------ */

/** Interrogatives that need question intonation even when the bank drops the mark. */
const QUESTION_START =
  /^(?:[¿¡]\s*)?(?:dónde|cómo|cuándo|quién|cuál|qué|por qué|où|comment|pourquoi|quand|quel|quelle|qu'est-ce|combien|wie|wo|was|warum|wer|wann|which|what|where|who|when|why|how|do|does|did|is|are|can|could|would|should|habari|wapi|nini|vipi|je|lini|nani|gani|kwa\s+nini)\b/i;

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

  // Emoji and pictographs are decoration, and several engines read their
  // names aloud ("parrot", "sparkles"). Strip them before anything else.
  text = text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, ' ');

  // Markup and arrows. Zora reads build hints that contain real HTML, so the
  // tags go before the "greater than" arrow rule can turn them into pauses.
  text = text.replace(/<\/?[a-z][^>\n]{0,160}>/gi, ' ');
  text = text.replace(/`+/g, ' ').replace(/\*+/g, ' ').replace(/#/g, ' ');
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
  // "¿Dónde está…?" leaves a period in front of the question mark; the engine
  // then says the mark as a stop before a question. Keep only the stronger mark.
  text = text.replace(/\.\s*([?!,;:])/g, '$1').replace(/([?!])\s*\./g, '$1');
  text = text.replace(/\s*[·•|]+\s*/g, ', ');

  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/^[,;:.\s]+|[,;:\s]+$/g, '').trim();
  // Human breath points, before terminal punctuation decides the contour.
  text = breathe(text, options.preset?.base ?? 'en');

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
 *
 * A match board has no phrase to hear — its teaching is the pairing itself, and
 * its `correctChain` is a count, so it narrates nothing rather than "5 pairs".
 */
export function phraseForQuestion(question: PronounceQuestion, preset: LanguagePreset): string {
  if (question.kind === 'match') return '';
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
 * Prompts often trail off after the quoted phrase — `"Gracias" means…`,
 * `“How is it going?” is…`. Read aloud, that tail becomes a stranded "Means."
 * after the phrase. A prompt whose remainder is only one of these dangling
 * verbs is spoken up to the closing quote.
 */
const DANGLING_TAIL =
  /^[\s,;:—–-]*(?:is|are|was|were|means?|translates?|literally|refers?\s+to|in\s+\w+)\b[\s.…,;:—–-]*$/i;

function spokenPrompt(prompt: string): string {
  const spans = quotedSpans(prompt);
  const last = spans[spans.length - 1];
  if (!last) return prompt;
  const tail = prompt.slice(last.end);
  if (!tail.trim() || !DANGLING_TAIL.test(tail)) return prompt;
  return prompt.slice(0, last.end);
}

/**
 * Split a prompt into runs of target language and runs of English so Bingo
 * reads "What does, ¿Cómo estás?, mean?" instead of mangling the Spanish.
 */
export function promptSegments(prompt: string, preset: LanguagePreset): SpeechSegment[] {
  const source = spokenPrompt(prompt);
  if (preset.base === 'en') {
    const text = spokenPhrase(source);
    return text ? [{ text, preset }] : [];
  }

  const segments: SpeechSegment[] = [];
  let cursor = 0;
  for (const span of quotedSpans(source)) {
    push(segments, spokenPhrase(source.slice(cursor, span.start), { end: false }), APP_SPEECH);
    const target = isTargetSpan(span.text, preset);
    push(segments, spokenPhrase(span.text, target ? { preset, end: false } : { end: false }), target ? preset : APP_SPEECH);
    cursor = span.end;
  }
  push(segments, spokenPhrase(source.slice(cursor)), APP_SPEECH);
  return segments.slice(0, 5);
}

/* ------------------------------------------------------------------ *
 * Voice selection
 * ------------------------------------------------------------------ */

let voicesPromise: Promise<Voice[]> | null = null;
type CastPlan = Record<MentorId, CastAssignment<Voice>>;
// One settled plan per language. The plan contains every character, so an
// audition and a lesson read the exact same assignment regardless of who spoke
// first.
const castPlans = new Map<string, Promise<CastPlan>>();

/**
 * Voices can arrive late. Browsers need a short cap so a tap never hangs, but a
 * cold Android TTS engine can take several seconds to enumerate its voices.
 * Giving up at 1.2s made the first phrase of a session speak with the engine
 * default instead of the installed Swahili voice, so native gets more room.
 * Only the first call pays this cost; the resolved list is cached afterwards.
 */
const VOICE_LIST_TIMEOUT_MS = Platform.OS === 'web' ? 1200 : 4000;

function loadVoices(): Promise<Voice[]> {
  if (!voicesPromise) {
    const pending = Promise.race([
      Speech.getAvailableVoicesAsync().catch(() => [] as Voice[]),
      new Promise<Voice[]>((resolve) => setTimeout(() => resolve([]), VOICE_LIST_TIMEOUT_MS)),
    ]);
    voicesPromise = pending;
    // A timeout is not an answer. Browsers populate `speechSynthesis.getVoices()`
    // asynchronously, so caching the empty race result would make every later
    // call — including the Settings voice check — report that no voice exists.
    // Drop the cache on empty and let the next tap ask again.
    void pending.then((voices) => {
      if (voices.length === 0) voicesPromise = null;
    });
  }
  return voicesPromise;
}

function resolveCast(preset: LanguagePreset): Promise<CastPlan> {
  const key = preset.base;
  const cached = castPlans.get(key);
  if (cached) return cached;

  const pending = (async () => {
    const voices = await loadVoices();
    const plan = planVoiceCast(voices, preset);
    // An empty list is "voices have not arrived yet", not an answer. Do not
    // cache it; the next tap should ask the platform again.
    if (voices.length === 0) castPlans.delete(key);
    return plan;
  })();
  castPlans.set(key, pending);
  return pending;
}

async function resolveVoice(
  preset: LanguagePreset,
  character: Mentor
): Promise<CastAssignment<Voice>> {
  const plan = await resolveCast(preset);
  return plan[character];
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
  /** Effective rate after phrase-length shaping (exposed for QA). */
  rate?: number;
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
  const rate = humanRate(slow ? style.slowRate : style.rate, phrase);
  const ok = await speakChunk(phrase, {
    locale: resolved.locale,
    rate,
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
    rate,
  };
}

/** A person takes a breath when switching languages; clips butted together are
 *  the clearest "stitched by a machine" tell in a mixed prompt. */
const SEGMENT_BREATH_MS = 220;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]!;
    if (token !== generation) break;
    if (i > 0) {
      await wait(SEGMENT_BREATH_MS);
      if (token !== generation) break;
    }
    const resolved = await resolveVoice(segment.preset, character);
    if (token !== generation) break;
    const style = CHARACTER_VOICE[character];
    const rate = humanRate(slow ? style.slowRate : style.rate, segment.text);
    const ok = await speakChunk(segment.text, {
      locale: resolved.locale,
      rate,
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
      rate,
    });
    if (!ok) break;
  }
  return results;
}
