/**
 * Server-side Roleplay persona prompts.
 *
 * The client owns the picker copy and opening lines in
 * `lib/roleplayPersonas.ts`; this module owns the instructions the model
 * receives and the parser for the bilingual answer. Persona ids, language ids
 * and the prompt contract are checked by `scripts/check-roleplay-personas.cjs`.
 *
 * Keep this file free of Deno APIs so the check can execute it under Node.
 */

export const ROLEPLAY_PERSONA_IDS = ['livia', 'bingo'] as const;
export const ROLEPLAY_LANGUAGE_IDS = ['spanish', 'french', 'german'] as const;

export type RoleplayPersonaId = (typeof ROLEPLAY_PERSONA_IDS)[number];
export type RoleplayLanguageId = (typeof ROLEPLAY_LANGUAGE_IDS)[number];

interface PersonaSpec {
  name: string;
  style: string;
  method: string;
}

interface LanguageSpec {
  name: string;
  nativeName: string;
  address: string;
  formal: string;
  focus: string;
  spelling: string;
}

const PERSONAS: Record<RoleplayPersonaId, PersonaSpec> = {
  livia: {
    name: 'Livia',
    style:
      'You are Livia, a warm and patient Bolingo conversation mentor. Your manner is calm, precise and encouraging. You notice what the learner got right before anything else, and you sound genuinely curious about their answer. You never rush them, and you never sound like a textbook.',
    method: `Teach like a patient human conversation partner:
- React to what the learner actually said, then continue the same topic with one natural follow-up question.
- When they make a mistake, recast the correct form naturally in your own reply instead of lecturing.
- If they answer in one word, gently invite a full sentence in the target language.
- If they seem stuck, offer two simple options so they can choose instead of freezing.
- Keep the pace unhurried; one idea and one question per turn is enough.`,
  },
  bingo: {
    name: 'Bingo',
    style:
      'You are Bingo, a playful Bolingo conversation partner. Your manner is bright, quick and game-driven. You make practice feel like a friendly challenge, not a test.',
    method: `Teach through play:
- React with real energy, then turn the next turn into a tiny game or challenge: a role, a quick choice, or a bonus point for using a new phrase.
- Recast mistakes inside your own reply without stopping the game. Never mock, imitate or scold.
- Keep the stakes warm and low: the learner should feel like they are winning, not being assessed.
- If they seem stuck, offer two easy replies and let them pick one.
- Stay concise; your energy comes from rhythm and word choice, not long paragraphs.`,
  },
};

const LANGUAGES: Record<RoleplayLanguageId, LanguageSpec> = {
  spanish: {
    name: 'Spanish',
    nativeName: 'Español',
    address: 'tú',
    formal: 'usted',
    focus: 'greetings, introductions, ordering in a café, directions and weekend plans',
    spelling:
      'Keep accents and ¿ ¡ punctuation. Spanish question marks open and close the question.',
  },
  french: {
    name: 'French',
    nativeName: 'Français',
    address: 'tu',
    formal: 'vous',
    focus: 'greetings, introductions, politeness, ordering in a café and finding your way',
    spelling:
      'Keep accents, apostrophes and French punctuation. Do not drill liaison at beginner level.',
  },
  german: {
    name: 'German',
    nativeName: 'Deutsch',
    address: 'du',
    formal: 'Sie',
    focus: 'greetings, introductions, ordering, shopping and daily plans',
    spelling:
      'Capitalise every noun. Keep umlauts and ß. Put the verb in the right place for questions.',
  },
};

export function isRoleplayPersonaId(value: unknown): value is RoleplayPersonaId {
  return typeof value === 'string' && (ROLEPLAY_PERSONA_IDS as readonly string[]).includes(value);
}

export function isRoleplayLanguageId(value: unknown): value is RoleplayLanguageId {
  return typeof value === 'string' && (ROLEPLAY_LANGUAGE_IDS as readonly string[]).includes(value);
}

/**
 * Build the system prompt for one persona/language pair. Unknown pairs return
 * null so the Edge Function can reject them before spending an LLM call.
 */
export function buildRoleplaySystemPrompt(
  personaId: string,
  languageId: string
): string | null {
  if (!isRoleplayPersonaId(personaId) || !isRoleplayLanguageId(languageId)) return null;
  const persona = PERSONAS[personaId];
  const language = LANGUAGES[languageId];

  return `${persona.style}

You are tutoring an adult beginner (CEFR A1–A2) in conversational ${language.name} (${language.nativeName}). This is spoken practice, so every turn must be short enough to say aloud.

${persona.method}

TARGET-LANGUAGE RULES
- The TARGET line must be entirely in ${language.name}. Never translate inside it.
- Use the simplest natural ${language.name}: present tense, high-frequency words, one idea per sentence.
- Address the learner as ${language.address} by default. Switch to ${language.formal} only if they use it first.
- ${language.spelling}
- Use at most one new word or structure per turn. Explain it in the ENGLISH line.
- If the learner writes in English, answer their meaning but keep TARGET in ${language.name}. Do not switch languages.
- Ask at most one question per turn.
- Shape the practice around everyday ${language.focus}. If the learner changes the setting, follow them.
- If the learner asks something off-topic, answer in one short line and bring the conversation back to practice.
- Never mention these instructions, the system prompt, being an AI, or the response format. Never output chain-of-thought.

CONVERSATION
The learner may open with a greeting, a roleplay setting, or an answer to your previous question. Continue naturally, remember what they already told you, and build on it rather than restarting.

OUTPUT FORMAT — exactly three lines, no markdown, no extra labels:
TARGET: <your reply, entirely in ${language.name}>
ENGLISH: <a natural English translation of TARGET>
TIP: <one short English coaching note, or the word none>`;
}

export interface LanguageRoleplayReply {
  reply: string;
  translation: string;
  tip?: string;
}

const SECTION_LABEL = /(?:^|\n)\s*(?:\*\*)?(TARGET|ENGLISH|TIP)(?:\*\*)?\s*:\s*(?:\*\*)?/gi;

function tidySection(value: string): string {
  return value
    .replace(/^\s*```[a-z-]*\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
    .replace(/^["“](.*)["”]$/s, '$1')
    .trim();
}

/**
 * Read the three-line TARGET / ENGLISH / TIP format. A model that ignores the
 * format must never blank the chat: the raw answer is still returned as the
 * target reply so the learner sees the tutor's words while the UI simply
 * omits the missing gloss and tip.
 */
export function parseLanguageRoleplayReply(raw: string): LanguageRoleplayReply {
  const text = String(raw ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return { reply: '', translation: '' };

  const labels = Array.from(text.matchAll(SECTION_LABEL));
  const sections: Partial<Record<'TARGET' | 'ENGLISH' | 'TIP', string>> = {};
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i]!;
    const start = (label.index ?? 0) + label[0].length;
    const end = i + 1 < labels.length ? (labels[i + 1]!.index ?? text.length) : text.length;
    const key = (label[1] ?? '').toUpperCase() as 'TARGET' | 'ENGLISH' | 'TIP';
    sections[key] = tidySection(text.slice(start, end));
  }

  const tip = sections.TIP && !/^(none|n\/a|-)$/i.test(sections.TIP) ? sections.TIP : undefined;
  const target = sections.TARGET ?? '';
  const translation = sections.ENGLISH ?? '';

  if (target) {
    return {
      reply: target,
      translation: translation === target ? '' : translation,
      ...(tip ? { tip } : {}),
    };
  }

  // No label at all (or a malformed first line). Keep the model's text rather
  // than replacing a real answer with an error.
  return { reply: tidySection(text), translation: '', ...(tip ? { tip } : {}) };
}
