/**
 * Multilingual Roleplay cast.
 *
 * Livia and Bingo are not skins on the same prompt: each mentor has a distinct
 * teaching method, and each language has its own opening line and starter
 * replies. The server keeps its own prompt copy in
 * `supabase/functions/_shared/roleplayPersonas.ts`; the persona/language ids
 * and the required pairings are checked by
 * `scripts/check-roleplay-personas.cjs`.
 */

export type RoleplayLanguageId = 'spanish' | 'french' | 'german';
export type RoleplayPersonaId = 'livia' | 'bingo';

export interface RoleplayOpening {
  /** Spoken by the mentor in the target language. */
  target: string;
  /** Natural English gloss shown under the target line. */
  english: string;
}

export interface RoleplayLanguage {
  id: RoleplayLanguageId;
  name: string;
  nativeName: string;
  /** Compact badge used by the picker (no flag emoji dependency). */
  code: string;
  placeholder: string;
  openings: Record<RoleplayPersonaId, RoleplayOpening>;
  starters: Record<RoleplayPersonaId, string[]>;
}

export interface RoleplayPersona {
  id: RoleplayPersonaId;
  name: string;
  role: string;
  blurb: string;
  /** Short label for the selection card. */
  approach: string;
}

export const ROLEPLAY_PERSONAS: RoleplayPersona[] = [
  {
    id: 'livia',
    name: 'Livia',
    role: 'Patient conversation mentor',
    blurb: 'Warm, precise and unhurried. She recasts one mistake at a time and waits while you find the sentence.',
    approach: 'Gentle correction · full sentences',
  },
  {
    id: 'bingo',
    name: 'Bingo',
    role: 'Playful conversation partner',
    blurb: 'Bright, quick and game-driven. He turns each reply into a tiny challenge and celebrates every attempt.',
    approach: 'Fast repartee · playful challenges',
  },
];

export const ROLEPLAY_LANGUAGES: RoleplayLanguage[] = [
  {
    id: 'spanish',
    name: 'Spanish',
    nativeName: 'Español',
    code: 'ES',
    placeholder: 'Escribe en español o inglés…',
    openings: {
      livia: {
        target:
          'Hola, soy Livia. Me alegra mucho hablar español contigo. ¿Cómo te llamas y de dónde eres?',
        english:
          "Hello, I'm Livia. I'm really glad to speak Spanish with you. What's your name, and where are you from?",
      },
      bingo: {
        target:
          '¡Hola! Soy Bingo, tu compañero de conversación. Hoy jugamos: cuéntame algo bueno que te pasó. ¿Qué tal tu día?',
        english:
          "Hey! I'm Bingo, your conversation partner. Today we're playing a game: tell me one good thing that happened to you. How's your day going?",
      },
    },
    starters: {
      livia: [
        'Hola, me llamo Ana. Soy de Kenia.',
        'Estoy aprendiendo español.',
        '¿Cómo estás?',
      ],
      bingo: [
        'Hoy fui al mercado.',
        'Me gusta la música.',
        '¿Y tú qué hiciste?',
      ],
    },
  },
  {
    id: 'french',
    name: 'French',
    nativeName: 'Français',
    code: 'FR',
    placeholder: 'Écris en français ou en anglais…',
    openings: {
      livia: {
        target:
          'Bonjour, je suis Livia. Je suis ravie de parler français avec toi. Comment tu t’appelles, et d’où viens-tu ?',
        english:
          "Hello, I'm Livia. I'm delighted to speak French with you. What's your name, and where are you from?",
      },
      bingo: {
        target:
          'Salut ! Moi, c’est Bingo, ton partenaire de conversation. On commence par un petit jeu : raconte-moi une bonne chose qui t’est arrivée aujourd’hui.',
        english:
          "Hi! I'm Bingo, your conversation partner. Let's start with a little game: tell me one good thing that happened to you today.",
      },
    },
    starters: {
      livia: [
        'Bonjour, je m’appelle Ana. Je viens du Kenya.',
        'J’apprends le français.',
        'Comment ça va ?',
      ],
      bingo: [
        'Aujourd’hui, j’ai visité le marché.',
        'J’aime la musique.',
        'Et toi, qu’est-ce que tu as fait ?',
      ],
    },
  },
  {
    id: 'german',
    name: 'German',
    nativeName: 'Deutsch',
    code: 'DE',
    placeholder: 'Schreib auf Deutsch oder Englisch…',
    openings: {
      livia: {
        target:
          'Hallo, ich bin Livia. Ich freue mich, mit dir Deutsch zu sprechen. Wie heißt du, und woher kommst du?',
        english:
          "Hello, I'm Livia. I'm glad to speak German with you. What's your name, and where are you from?",
      },
      bingo: {
        target:
          'Hallo! Ich bin Bingo, dein Gesprächspartner. Lass uns ein kleines Spiel machen: Erzähl mir etwas Schönes, das heute passiert ist.',
        english:
          "Hello! I'm Bingo, your conversation partner. Let's play a little game: tell me one nice thing that happened today.",
      },
    },
    starters: {
      livia: [
        'Hallo, ich heiße Ana. Ich komme aus Kenia.',
        'Ich lerne Deutsch.',
        'Wie geht es dir?',
      ],
      bingo: [
        'Heute war ich auf dem Markt.',
        'Ich mag Musik.',
        'Und du, was hast du heute gemacht?',
      ],
    },
  },
];

/** Unknown ids cannot reach the picker, but keep the helpers total. */
export function roleplayLanguage(id: RoleplayLanguageId): RoleplayLanguage {
  return ROLEPLAY_LANGUAGES.find((language) => language.id === id) ?? ROLEPLAY_LANGUAGES[0]!;
}

export function roleplayPersona(id: RoleplayPersonaId): RoleplayPersona {
  return ROLEPLAY_PERSONAS.find((persona) => persona.id === id) ?? ROLEPLAY_PERSONAS[0]!;
}

export function roleplayOpening(
  personaId: RoleplayPersonaId,
  languageId: RoleplayLanguageId
): RoleplayOpening {
  return roleplayLanguage(languageId).openings[personaId];
}

export function roleplayStarters(
  personaId: RoleplayPersonaId,
  languageId: RoleplayLanguageId
): string[] {
  return roleplayLanguage(languageId).starters[personaId];
}

/** Runtime guard for a route param or a future deep link. */
export function isRoleplayLanguageId(value: unknown): value is RoleplayLanguageId {
  return (
    typeof value === 'string' && ROLEPLAY_LANGUAGES.some((language) => language.id === value)
  );
}
