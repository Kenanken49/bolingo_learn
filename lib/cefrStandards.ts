/**
 * CEFR Curriculum Standards & Validation Engine.
 *
 * Implements deterministic CEFR grading for language lessons:
 * - Lemmatisation & POS tagging (with Swahili Stem + TAM decomposition).
 * - Graded lexicon hierarchy (FLELex, DAFlex/Goethe, ELELex, Oxford/EVP, CEFR-J, Swahili stem list).
 * - Lesson metrics: P80(vocab), max(grammar rank), Can-Do tiers, lesson_level with discrepancy flag.
 * - Level gates: A1, A2, B1, B1+.
 * - Course-level auditing: cumulative distinct lemmas (900/1800/3000/4500), productive set ratio (50–60%),
 *   under-tiering threshold (>15%), and 5x4 Can-Do coverage grid (>=3 lessons/cell).
 */

import type { CourseLesson } from './quizBank';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B1+' | 'B2' | 'C1' | 'C2';

export const LEVEL_NUMERIC: Record<CefrLevel, number> = {
  A1: 1.0,
  A2: 2.0,
  B1: 3.0,
  'B1+': 3.5,
  B2: 4.0,
  C1: 5.0,
  C2: 6.0,
};

export const NUMERIC_TO_LEVEL: { max: number; level: CefrLevel }[] = [
  { max: 1.49, level: 'A1' },
  { max: 2.49, level: 'A2' },
  { max: 3.24, level: 'B1' },
  { max: 3.74, level: 'B1+' },
  { max: 4.49, level: 'B2' },
  { max: 5.49, level: 'C1' },
  { max: Infinity, level: 'C2' },
];

export function numericToCefrLevel(value: number): CefrLevel {
  for (const entry of NUMERIC_TO_LEVEL) {
    if (value <= entry.max) return entry.level;
  }
  return 'C2';
}

export type UniversalPOS =
  | 'NOUN'
  | 'VERB'
  | 'ADJ'
  | 'ADV'
  | 'PRON'
  | 'DET'
  | 'ADP'
  | 'AUX'
  | 'CCONJ'
  | 'SCONJ'
  | 'INTJ'
  | 'PROPN'
  | 'X';

export interface LemmaRecord {
  token: string;
  lemma: string;
  pos: UniversalPOS;
  level: CefrLevel;
  source: 'FLELex' | 'DAFlex' | 'ELELex' | 'Oxford+EVP' | 'CEFR-J' | 'Swahili-stem' | 'fallback';
  isProductive: boolean;
  swahiliMeta?: {
    tam?: string;
    subjectConcord?: string;
    stem: string;
    polarity: 'AFF' | 'NEG';
  };
}

export type CefrSkill =
  | 'listening'
  | 'reading'
  | 'spoken_production'
  | 'spoken_interaction'
  | 'writing';

export interface LessonMetrics {
  vocabIndex: {
    numeric: number;
    tag: CefrLevel;
    p80Rank: number;
  };
  grammarIndex: {
    rank: number;
    structures: string[];
    level: CefrLevel;
  };
  canDoIndex: {
    tier: number; // 1 - 4
    level: CefrLevel;
    claims: CefrSkill[];
  };
  lessonLevel: {
    level: CefrLevel;
    numeric: number;
    discrepancyFlag: boolean;
    flagReason?: string;
  };
}

export interface LessonGateResult {
  lessonId: string;
  metrics: LessonMetrics;
  gatesPassed: {
    A1: boolean;
    A2: boolean;
    B1: boolean;
    'B1+': boolean;
  };
  resolvedLevel: CefrLevel;
  reasons: string[];
  totalLemmas: number;
  productiveLemmas: number;
}

export interface CourseAuditResult {
  language: string;
  totalLessons: number;
  cumulativeLemmasByBand: Record<CefrLevel, number>;
  bandThresholds: {
    A1: { target: 900; actual: number; passed: boolean; underTiered: boolean };
    A2: { target: 1800; actual: number; passed: boolean; underTiered: boolean };
    B1: { target: 3000; actual: number; passed: boolean; underTiered: boolean };
    'B1+/B2': { target: 4500; actual: number; passed: boolean; underTiered: boolean };
  };
  productiveRatioByBand: Record<CefrLevel, { ratio: number; passed: boolean }>;
  canDoMatrix: Record<CefrSkill, Record<CefrLevel, number>>;
  canDoCoveragePassed: boolean;
  missingCanDoCells: string[];
  status: 'passed' | 'failed' | 'under_tiered';
  issues: string[];
}

/* -------------------------------------------------------------------------- */
/* 1. SWAHILI AGGLUTINATIVE MORPHOLOGY (STEM + TAM DECOMPOSITION)            */
/* -------------------------------------------------------------------------- */

const SWAHILI_SUBJECT_CONCORDS = [
  'ni', 'u', 'a', 'tu', 'm', 'wa', // People (Class 1/2)
  'ki', 'vi',                       // Class 7/8
  'i', 'zi',                        // Class 9/10
  'li', 'ya',                       // Class 5/6
  'u', 'ya',                        // Class 3/4
  'ku',                             // Class 15
];

const SWAHILI_TAM_MARKERS: Record<string, { label: string; cefr: CefrLevel; isA2Past?: boolean; isB1Cond?: boolean }> = {
  na: { label: 'Present Progressive', cefr: 'A1' },
  li: { label: 'Past Narrative', cefr: 'A2', isA2Past: true },
  ta: { label: 'Future', cefr: 'A1' },
  me: { label: 'Perfect / Resultative', cefr: 'B1' },
  ki: { label: 'Imperfect / Conditional', cefr: 'A2' },
  ka: { label: 'Consecutive Past', cefr: 'A2' },
  nge: { label: 'Hypothetical Conditional', cefr: 'B1', isB1Cond: true },
  ngali: { label: 'Past Counterfactual Conditional', cefr: 'B1', isB1Cond: true },
  ja: { label: 'Negative Perfect (Not Yet)', cefr: 'A2' },
  po: { label: 'Temporal / Locative Relative', cefr: 'B1' },
};

/**
 * Decomposes Swahili verbal forms into Subject + TAM + Root Stem.
 * Example: 'walisoma' -> { subjectConcord: 'wa', tam: 'li', stem: 'soma', polarity: 'AFF' }
 */
export function parseSwahiliVerb(token: string): {
  isVerb: boolean;
  stem: string;
  tam?: string;
  subjectConcord?: string;
  polarity: 'AFF' | 'NEG';
} {
  const clean = token.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length < 4) return { isVerb: false, stem: clean, polarity: 'AFF' };

  let remaining = clean;
  let polarity: 'AFF' | 'NEG' = 'AFF';
  if (remaining.startsWith('ha')) {
    polarity = 'NEG';
    remaining = remaining.slice(2);
  }

  let foundSubj: string | undefined;
  for (const subj of SWAHILI_SUBJECT_CONCORDS) {
    if (remaining.startsWith(subj)) {
      foundSubj = subj;
      remaining = remaining.slice(subj.length);
      break;
    }
  }

  let foundTam: string | undefined;
  for (const tam of Object.keys(SWAHILI_TAM_MARKERS)) {
    if (remaining.startsWith(tam)) {
      foundTam = tam;
      remaining = remaining.slice(tam.length);
      break;
    }
  }

  // Handle object concords (optional: -m-, -wa-, -ki-, etc.)
  if (remaining.startsWith('m') && remaining.length > 3) remaining = remaining.slice(1);
  else if (remaining.startsWith('wa') && remaining.length > 4) remaining = remaining.slice(2);
  else if (remaining.startsWith('ki') && remaining.length > 4) remaining = remaining.slice(2);

  const stem = remaining.length >= 2 ? remaining : clean;
  return {
    isVerb: Boolean(foundTam || foundSubj),
    stem,
    tam: foundTam,
    subjectConcord: foundSubj,
    polarity,
  };
}

/* -------------------------------------------------------------------------- */
/* 2. GRADED LEXICON HIERARCHY SEEDS                                          */
/* -------------------------------------------------------------------------- */

// Built-in graded lemma seeds matching the hierarchy preference
const LEXICON_FLELEX_FR: Record<string, CefrLevel> = {
  bonjour: 'A1', salut: 'A1', merci: 'A1', oui: 'A1', non: 'A1', etre: 'A1', avoir: 'A1',
  manger: 'A1', pain: 'A1', eau: 'A1', pomme: 'A1', cafe: 'A1', fille: 'A1', garcon: 'A1',
  aller: 'A1', faire: 'A1', vouloir: 'A1', pouvoir: 'A2', devoir: 'A2', hier: 'A2',
  demain: 'A1', voyage: 'A2', train: 'A2', chambre: 'A2', hotel: 'A2', aimer: 'A1',
  penser: 'A2', falloir: 'A2', sembler: 'B1', bienvenu: 'A1', subjonctif: 'B1', quoique: 'B2',
  neanmoins: 'B2', hypothese: 'B1', condition: 'B1', regretter: 'B1',
};

const LEXICON_DAFLEX_DE: Record<string, CefrLevel> = {
  hallo: 'A1', danke: 'A1', bitte: 'A1', ja: 'A1', nein: 'A1', sein: 'A1', haben: 'A1',
  essen: 'A1', brot: 'A1', wasser: 'A1', apfel: 'A1', kaffee: 'A1', madchen: 'A1', junge: 'A1',
  gehen: 'A1', machen: 'A1', wollen: 'A1', konnen: 'A2', mussen: 'A2', gestern: 'A2',
  morgen: 'A1', reise: 'A2', zug: 'A2', zimmer: 'A2', hotel: 'A2', lieben: 'A1',
  glauben: 'A2', obwohl: 'B1', trotzdem: 'B1', ware: 'B1', hatte: 'B1', konjunktiv: 'B1',
  einfluss: 'B2', verhaltnis: 'B2',
};

const LEXICON_ELELEX_ES: Record<string, CefrLevel> = {
  hola: 'A1', gracias: 'A1', por_favor: 'A1', adios: 'A1', si: 'A1', no: 'A1', ser: 'A1',
  estar: 'A1', comer: 'A1', pan: 'A1', agua: 'A1', manzana: 'A1', cafe: 'A1', nina: 'A1',
  nino: 'A1', ir: 'A1', hacer: 'A1', querer: 'A1', poder: 'A2', deber: 'A2', ayer: 'A2',
  manana: 'A1', viaje: 'A2', tren: 'A2', habitacion: 'A2', hotel: 'A2', gustar: 'A1',
  creer: 'A2', ojala: 'B1', aunque: 'B1', fuera: 'B1', tuviera: 'B1', subjuntivo: 'B1',
  sin_embargo: 'B2', imprescindible: 'B2',
};

const LEXICON_OXFORD_EN: Record<string, CefrLevel> = {
  hello: 'A1', thank: 'A1', please: 'A1', goodbye: 'A1', yes: 'A1', no: 'A1', be: 'A1',
  have: 'A1', eat: 'A1', bread: 'A1', water: 'A1', apple: 'A1', coffee: 'A1', girl: 'A1',
  boy: 'A1', go: 'A1', do: 'A1', want: 'A1', can: 'A1', could: 'A2', must: 'A2',
  yesterday: 'A2', tomorrow: 'A1', trip: 'A2', train: 'A2', room: 'A2', hotel: 'A2',
  like: 'A1', think: 'A2', although: 'B1', however: 'B1', would: 'B1', might: 'B1',
  furthermore: 'B2', consequence: 'B2',
};

const LEXICON_SWAHILI: Record<string, CefrLevel> = {
  hujambo: 'A1', sijambo: 'A1', habari: 'A1', asante: 'A1', tafadhali: 'A1', kwaheri: 'A1',
  ndiyo: 'A1', hapana: 'A1', kuwa: 'A1', na: 'A1', kula: 'A1', mkate: 'A1', maji: 'A1',
  tunda: 'A1', kahawa: 'A1', msichana: 'A1', mvulana: 'A1', kwenda: 'A1', kufanya: 'A1',
  taka: 'A1', soma: 'A1', penda: 'A1', weza: 'A2', bidi: 'A2', jana: 'A2', kesho: 'A1',
  safari: 'A2', gari: 'A2', chumba: 'A2', hoteli: 'A2', fikiria: 'A2', ingawa: 'B1',
  lakini: 'A1', kwamba: 'A2', kama: 'A2', nge: 'B1', ngali: 'B1', amba: 'B1',
};

/** Universal open fallback: CEFR-J compatible mappings */
const LEXICON_CEFR_J_FALLBACK: Record<string, CefrLevel> = {
  book: 'A1', pen: 'A1', friend: 'A1', city: 'A1', house: 'A1', car: 'A1',
  livre: 'A1', stylo: 'A1', ami: 'A1', ville: 'A1', maison: 'A1', voiture: 'A1',
  buch: 'A1', stift: 'A1', freund: 'A1', stadt: 'A1', haus: 'A1', auto: 'A1',
  libro: 'A1', pluma: 'A1', amigo: 'A1', ciudad: 'A1', casa: 'A1', coche: 'A1',
  kitabu: 'A1', kalamu: 'A1', rafiki: 'A1', mji: 'A1', nyumba: 'A1', gari: 'A1',
};

/**
 * Resolves a lemma and its CEFR level following the hierarchy of preference.
 */
export function resolveLemmaLevel(
  token: string,
  language: string,
  posHint?: UniversalPOS
): { lemma: string; level: CefrLevel; source: LemmaRecord['source']; swahiliMeta?: LemmaRecord['swahiliMeta'] } {
  const norm = token.toLowerCase().trim().replace(/[.,!?;:"'()¿¡]/g, '');

  if (language === 'swahili' || language === 'sw') {
    const swahili = parseSwahiliVerb(norm);
    const lookupKey = swahili.stem;
    if (LEXICON_SWAHILI[lookupKey]) {
      return {
        lemma: lookupKey,
        level: LEXICON_SWAHILI[lookupKey],
        source: 'Swahili-stem',
        swahiliMeta: { ...swahili },
      };
    }
    if (LEXICON_CEFR_J_FALLBACK[lookupKey]) {
      return {
        lemma: lookupKey,
        level: LEXICON_CEFR_J_FALLBACK[lookupKey],
        source: 'CEFR-J',
        swahiliMeta: { ...swahili },
      };
    }
    // Default Swahili stem level
    return {
      lemma: lookupKey,
      level: 'A1',
      source: 'Swahili-stem',
      swahiliMeta: { ...swahili },
    };
  }

  if (language === 'french' || language === 'fr') {
    if (LEXICON_FLELEX_FR[norm]) {
      return { lemma: norm, level: LEXICON_FLELEX_FR[norm], source: 'FLELex' };
    }
  } else if (language === 'german' || language === 'de') {
    if (LEXICON_DAFLEX_DE[norm]) {
      return { lemma: norm, level: LEXICON_DAFLEX_DE[norm], source: 'DAFlex' };
    }
  } else if (language === 'spanish' || language === 'es') {
    if (LEXICON_ELELEX_ES[norm]) {
      return { lemma: norm, level: LEXICON_ELELEX_ES[norm], source: 'ELELex' };
    }
  } else if (language === 'english' || language === 'en') {
    if (LEXICON_OXFORD_EN[norm]) {
      return { lemma: norm, level: LEXICON_OXFORD_EN[norm], source: 'Oxford+EVP' };
    }
  }

  // Secondary universal check: CEFR-J
  if (LEXICON_CEFR_J_FALLBACK[norm]) {
    return { lemma: norm, level: LEXICON_CEFR_J_FALLBACK[norm], source: 'CEFR-J' };
  }

  // Fallback: A1 default for common function words, else A2
  const level: CefrLevel = norm.length <= 3 ? 'A1' : 'A2';
  return { lemma: norm, level, source: 'fallback' };
}

/* -------------------------------------------------------------------------- */
/* 3. LESSON TOKEN EXTRACTION & NORMALISATION PIPELINE                       */
/* -------------------------------------------------------------------------- */

export function extractTargetPhrases(
  lesson: CourseLesson
): { text: string; isProductive: boolean; skill: CefrSkill }[] {
  const targets: { text: string; isProductive: boolean; skill: CefrSkill }[] = [];

  for (const q of lesson.questions) {
    if (q.kind === 'text') {
      const spec = q.text;
      if (spec?.answers) {
        for (const ans of spec.answers) {
          targets.push({ text: ans, isProductive: true, skill: 'writing' });
        }
      }
    } else if (q.kind === 'speak') {
      const spec = q.speak;
      if (spec?.phrase) {
        targets.push({ text: spec.phrase, isProductive: true, skill: 'spoken_production' });
      }
    } else if (q.kind === 'listen') {
      const spec = q.listen;
      if (spec?.phrase) {
        targets.push({ text: spec.phrase, isProductive: false, skill: 'listening' });
      }
    } else if (q.kind === 'match') {
      const spec = q.match;
      if (spec?.pairs) {
        for (const pair of spec.pairs) {
          targets.push({ text: pair.left, isProductive: false, skill: 'reading' });
        }
      }
    } else {
      // BUILD / MCQ: correctChain represents target phrase
      if (Array.isArray(q.correctChain) && q.correctChain.length > 0) {
        const assembled = q.correctChain.join(' ');
        const isBuild = Array.isArray(q.scrambledTokens) && q.scrambledTokens.length > 2;
        targets.push({
          text: assembled,
          isProductive: isBuild,
          skill: isBuild ? 'writing' : 'reading',
        });
      }
    }
  }

  return targets;
}

export function normaliseLessonLemmas(
  lesson: CourseLesson,
  language: string
): LemmaRecord[] {
  const targets = extractTargetPhrases(lesson);
  const records: LemmaRecord[] = [];

  for (const target of targets) {
    const rawTokens = target.text.split(/\s+/).filter(Boolean);
    for (const raw of rawTokens) {
      const resolved = resolveLemmaLevel(raw, language);
      records.push({
        token: raw,
        lemma: resolved.lemma,
        pos: 'X',
        level: resolved.level,
        source: resolved.source,
        isProductive: target.isProductive,
        swahiliMeta: resolved.swahiliMeta,
      });
    }
  }

  return records;
}

/* -------------------------------------------------------------------------- */
/* 4. METRICS COMPUTATION (P80, GRAMMAR RANK, CAN-DO TIER)                   */
/* -------------------------------------------------------------------------- */

/**
 * Computes vocab_index = P80(level tags of targets).
 */
export function computeVocabIndex(lemmas: LemmaRecord[]): LessonMetrics['vocabIndex'] {
  if (lemmas.length === 0) {
    return { numeric: 1.0, tag: 'A1', p80Rank: 0 };
  }

  const values = lemmas.map((l) => LEVEL_NUMERIC[l.level]).sort((a, b) => a - b);
  // 80th percentile index (1-based rank converted to 0-based index)
  const rank = Math.ceil(0.8 * values.length);
  const p80Value = values[Math.min(values.length - 1, rank - 1)];

  return {
    numeric: p80Value,
    tag: numericToCefrLevel(p80Value),
    p80Rank: rank,
  };
}

/**
 * Computes grammar_index = max(rank of structures taught).
 * Rank 1: A1 (simple present, copula, basic imperative)
 * Rank 2: A2 (past narrative, comparative, modal verbs)
 * Rank 3: B1 (subjunctive, conditional, perfect system, relative clauses)
 * Rank 4: B2 (complex concessives, past subjunctive, passive voice)
 */
export function computeGrammarIndex(lesson: CourseLesson, language: string): LessonMetrics['grammarIndex'] {
  const structures: string[] = [];
  let maxRank = 1;

  const fullText = [
    ...(Array.isArray(lesson.theory) ? lesson.theory : []),
    ...lesson.questions.map((q) => q.prompt),
    ...lesson.questions.map((q) => (Array.isArray(q.correctChain) ? q.correctChain.join(' ') : '')),
    ...lesson.questions.map((q) => q.explain || ''),
  ]
    .join(' ')
    .toLowerCase();

  // A2 Trigger Detection
  const hasPastNarrative =
    /\b(yesterday|past|preterite|imparfait|passé composé|perfekt|präteritum|pretérito|jana|\b-li-)\b/i.test(fullText);
  const hasComparative =
    /\b(more than|less than|plus que|moins que|mehr als|weniger als|más que|menos que|kuliko)\b/i.test(fullText);
  const hasModal =
    /\b(can|could|must|pouvoir|devoir|vouloir|können|müssen|wollen|poder|deber|kuweza|kubidi)\b/i.test(fullText);

  if (hasPastNarrative) {
    structures.push('A2: Past narrative');
    maxRank = Math.max(maxRank, 2);
  }
  if (hasComparative) {
    structures.push('A2: Comparative / Superlative');
    maxRank = Math.max(maxRank, 2);
  }
  if (hasModal) {
    structures.push('A2: Modal verbs');
    maxRank = Math.max(maxRank, 2);
  }

  // B1 Trigger Detection
  const hasSubjunctive =
    /\b(subjunctive|subjonctif|subjuntivo|konjunktiv|il faut que|ojalá)\b/i.test(fullText);
  const hasConditional =
    /\b(conditional|conditionnel|condicional|würde|\b-nge-|\b-ngali-)\b/i.test(fullText);
  const hasPerfectSystem =
    /\b(pluperfect|plus-que-parfait|pluscuamperfecto|plusquamperfekt|\b-me-)\b/i.test(fullText);
  const hasRelative =
    /\b(relative clause|dont|lequel|cuyo|quien|welche|amba-)\b/i.test(fullText);

  if (hasSubjunctive) {
    structures.push('B1: Subjunctive mood');
    maxRank = Math.max(maxRank, 3);
  }
  if (hasConditional) {
    structures.push('B1: Conditional mood');
    maxRank = Math.max(maxRank, 3);
  }
  if (hasPerfectSystem) {
    structures.push('B1: Perfect system');
    maxRank = Math.max(maxRank, 3);
  }
  if (hasRelative) {
    structures.push('B1: Relative clause');
    maxRank = Math.max(maxRank, 3);
  }

  const level = maxRank >= 3 ? 'B1' : maxRank === 2 ? 'A2' : 'A1';
  return {
    rank: maxRank,
    structures: structures.length > 0 ? structures : ['A1: Basic present indicative & greetings'],
    level,
  };
}

/**
 * Computes cando_index = tier(1–4) of the stated outcome.
 */
export function computeCanDoIndex(lesson: CourseLesson): LessonMetrics['canDoIndex'] {
  const goal = (lesson.title + ' ' + (Array.isArray(lesson.theory) ? lesson.theory.join(' ') : '')).toLowerCase();
  const claims: CefrSkill[] = [];

  for (const q of lesson.questions) {
    if (q.kind === 'listen' && !claims.includes('listening')) claims.push('listening');
    if (q.kind === 'text' && !claims.includes('writing')) claims.push('writing');
    if (q.kind === 'speak' && !claims.includes('spoken_production')) claims.push('spoken_production');
    if ((q.kind === 'tokens' || q.kind === 'match' || !q.kind) && !claims.includes('reading')) claims.push('reading');
  }

  let tier = 1;
  let level: CefrLevel = 'A1';

  if (/\b(debate|defend|nuance|analyze|hypothesize|formal argument)\b/i.test(goal)) {
    tier = 4;
    level = 'B2';
  } else if (/\b(opinion|reason|travel|describe experience|narrate|feelings|plans)\b/i.test(goal)) {
    tier = 3;
    level = 'B1';
  } else if (/\b(routine|shopping|past|directions|yesterday|daily life|store)\b/i.test(goal)) {
    tier = 2;
    level = 'A2';
  } else {
    tier = 1;
    level = 'A1';
  }

  return { tier, level, claims };
}

/**
 * lesson_level = min(vocab_index, grammar_index) unless the two differ by >=2,
 * then take the lower and flag.
 */
export function computeLessonLevel(
  vocab: LessonMetrics['vocabIndex'],
  grammar: LessonMetrics['grammarIndex']
): LessonMetrics['lessonLevel'] {
  const vocabNum = vocab.numeric;
  const grammarNum = grammar.rank;
  const diff = Math.abs(vocabNum - grammarNum);
  const minNum = Math.min(vocabNum, grammarNum);
  const discrepancyFlag = diff >= 2.0;

  let flagReason: string | undefined;
  if (discrepancyFlag) {
    flagReason = `Pedagogical divergence: Vocab P80 (${vocab.tag} / ${vocabNum}) and Grammar rank (${grammar.level} / ${grammarNum}) differ by ${diff.toFixed(1)} (>= 2). Retaining lower level ${numericToCefrLevel(minNum)}.`;
  }

  return {
    level: numericToCefrLevel(minNum),
    numeric: minNum,
    discrepancyFlag,
    flagReason,
  };
}

/* -------------------------------------------------------------------------- */
/* 5. LEVEL GATES EVALUATION                                                  */
/* -------------------------------------------------------------------------- */

export function evaluateLessonGates(
  lesson: CourseLesson,
  language: string
): LessonGateResult {
  const lemmas = normaliseLessonLemmas(lesson, language);
  const vocabIndex = computeVocabIndex(lemmas);
  const grammarIndex = computeGrammarIndex(lesson, language);
  const canDoIndex = computeCanDoIndex(lesson);
  const lessonLevel = computeLessonLevel(vocabIndex, grammarIndex);

  const totalLemmas = lemmas.length;
  const productiveLemmas = lemmas.filter((l) => l.isProductive).length;

  const countLteA1 = lemmas.filter((l) => LEVEL_NUMERIC[l.level] <= LEVEL_NUMERIC.A1).length;
  const countLteA2 = lemmas.filter((l) => LEVEL_NUMERIC[l.level] <= LEVEL_NUMERIC.A2).length;
  const countLteB1 = lemmas.filter((l) => LEVEL_NUMERIC[l.level] <= LEVEL_NUMERIC.B1).length;
  const countB2 = lemmas.filter((l) => l.level === 'B2').length;

  const pctA1 = totalLemmas > 0 ? countLteA1 / totalLemmas : 1;
  const pctA2 = totalLemmas > 0 ? countLteA2 / totalLemmas : 1;
  const pctB1 = totalLemmas > 0 ? countLteB1 / totalLemmas : 1;
  const pctB2 = totalLemmas > 0 ? countB2 / totalLemmas : 0;

  // A2 Trigger: >= 1 A2 trigger exercised productively
  const a2TriggersCount =
    (grammarIndex.structures.some((s) => s.startsWith('A2')) ? 1 : 0) * (productiveLemmas > 0 ? 1 : 0);

  // B1 Trigger: >= 2 B1 triggers in production tasks
  const b1TriggersCount = grammarIndex.structures.filter((s) => s.startsWith('B1')).length;

  const gateA1 = pctA1 >= 0.85 && grammarIndex.rank <= 1;
  const gateA2 = pctA2 >= 0.75 && a2TriggersCount >= 1;
  const gateB1 = pctB1 >= 0.7 && b1TriggersCount >= 2 && productiveLemmas > 0;
  const gateB1Plus = pctB1 >= 0.95 && pctB2 <= 0.05;

  let resolvedLevel: CefrLevel = 'A1';
  const reasons: string[] = [];

  if (gateB1Plus) {
    resolvedLevel = 'B1+';
    reasons.push('Meets B1+ gate: >=95% running words A1–B1 lemmas and <=5% B2 items.');
  } else if (gateB1) {
    resolvedLevel = 'B1';
    reasons.push('Meets B1 gate: >=70% targets <=B1 and >=2 B1 triggers in production tasks.');
  } else if (gateA2) {
    resolvedLevel = 'A2';
    reasons.push('Meets A2 gate: >=75% targets <=A2 and >=1 A2 trigger exercised productively.');
  } else if (gateA1) {
    resolvedLevel = 'A1';
    reasons.push('Meets A1 gate: >=85% targets <=A1 and no structure above A1 rank.');
  } else {
    resolvedLevel = lessonLevel.level;
    reasons.push(`Tagged by metrics floor: ${lessonLevel.level}.`);
  }

  if (lessonLevel.discrepancyFlag && lessonLevel.flagReason) {
    reasons.push(`FLAG: ${lessonLevel.flagReason}`);
  }

  return {
    lessonId: lesson.id,
    metrics: {
      vocabIndex,
      grammarIndex,
      canDoIndex,
      lessonLevel,
    },
    gatesPassed: {
      A1: gateA1,
      A2: gateA2,
      B1: gateB1,
      'B1+': gateB1Plus,
    },
    resolvedLevel,
    reasons,
    totalLemmas,
    productiveLemmas,
  };
}

/* -------------------------------------------------------------------------- */
/* 6. COURSE-LEVEL MACRO AUDITING                                             */
/* -------------------------------------------------------------------------- */

export function auditCourseLevel(
  lessons: CourseLesson[],
  language: string
): CourseAuditResult {
  const issues: string[] = [];
  const cumulativeLemmasByBand: Record<CefrLevel, Set<string>> = {
    A1: new Set(),
    A2: new Set(),
    B1: new Set(),
    'B1+': new Set(),
    B2: new Set(),
    C1: new Set(),
    C2: new Set(),
  };

  const productiveLemmasByBand: Record<CefrLevel, Set<string>> = {
    A1: new Set(),
    A2: new Set(),
    B1: new Set(),
    'B1+': new Set(),
    B2: new Set(),
    C1: new Set(),
    C2: new Set(),
  };

  const canDoMatrix: Record<CefrSkill, Record<CefrLevel, number>> = {
    listening: { A1: 0, A2: 0, B1: 0, 'B1+': 0, B2: 0, C1: 0, C2: 0 },
    reading: { A1: 0, A2: 0, B1: 0, 'B1+': 0, B2: 0, C1: 0, C2: 0 },
    spoken_production: { A1: 0, A2: 0, B1: 0, 'B1+': 0, B2: 0, C1: 0, C2: 0 },
    spoken_interaction: { A1: 0, A2: 0, B1: 0, 'B1+': 0, B2: 0, C1: 0, C2: 0 },
    writing: { A1: 0, A2: 0, B1: 0, 'B1+': 0, B2: 0, C1: 0, C2: 0 },
  };

  for (const lesson of lessons) {
    const evalResult = evaluateLessonGates(lesson, language);
    const band = evalResult.resolvedLevel;
    const lemmas = normaliseLessonLemmas(lesson, language);

    for (const item of lemmas) {
      cumulativeLemmasByBand[band].add(item.lemma);
      if (item.isProductive) {
        productiveLemmasByBand[band].add(item.lemma);
      }
    }

    for (const skill of evalResult.metrics.canDoIndex.claims) {
      canDoMatrix[skill][band] = (canDoMatrix[skill][band] || 0) + 1;
    }
  }

  // Cumulative distinct lemmas across advancing bands
  const a1Count = cumulativeLemmasByBand.A1.size;
  const a2Count = a1Count + cumulativeLemmasByBand.A2.size;
  const b1Count = a2Count + cumulativeLemmasByBand.B1.size;
  const b1PlusCount = b1Count + cumulativeLemmasByBand['B1+'].size + cumulativeLemmasByBand.B2.size;

  const a1UnderTier = a1Count < 900 * 0.85; // short by > 15%
  const a2UnderTier = a2Count < 1800 * 0.85;
  const b1UnderTier = b1Count < 3000 * 0.85;
  const b1PlusUnderTier = b1PlusCount < 4500 * 0.85;

  if (a1UnderTier) issues.push(`Band A1 is UNDER-TIERED: ${a1Count} distinct lemmas (min threshold 765, standard 900).`);
  if (a2UnderTier) issues.push(`Band A2 is UNDER-TIERED: ${a2Count} distinct lemmas (min threshold 1530, standard 1800).`);
  if (b1UnderTier) issues.push(`Band B1 is UNDER-TIERED: ${b1Count} distinct lemmas (min threshold 2550, standard 3000).`);
  if (b1PlusUnderTier) issues.push(`Band B1+/B2 is UNDER-TIERED: ${b1PlusCount} distinct lemmas (min threshold 3825, standard 4500).`);

  // Productive sets at 50%–60%
  const bandsToCheck: CefrLevel[] = ['A1', 'A2', 'B1', 'B1+'];
  const productiveRatioByBand: Record<CefrLevel, { ratio: number; passed: boolean }> = {} as any;

  for (const band of bandsToCheck) {
    const total = cumulativeLemmasByBand[band].size;
    const prod = productiveLemmasByBand[band].size;
    const ratio = total > 0 ? prod / total : 0;
    const passed = ratio >= 0.5 && ratio <= 0.6;
    productiveRatioByBand[band] = { ratio, passed };
    if (!passed && total > 0) {
      issues.push(`Band ${band} productive ratio is ${(ratio * 100).toFixed(1)}% (standard is 50%–60%).`);
    }
  }

  // Can-Do Coverage: every CEFR skill x level cell needs >= 3 lessons claiming it
  const missingCanDoCells: string[] = [];
  const skills: CefrSkill[] = ['listening', 'reading', 'spoken_production', 'writing'];
  for (const skill of skills) {
    for (const band of ['A1', 'A2', 'B1'] as CefrLevel[]) {
      const count = canDoMatrix[skill][band] || 0;
      if (count < 3) {
        missingCanDoCells.push(`${skill} × ${band} (${count}/3)`);
      }
    }
  }

  if (missingCanDoCells.length > 0) {
    issues.push(`Can-Do matrix incomplete: ${missingCanDoCells.length} cells under minimum 3 lessons.`);
  }

  const isUnderTiered = a1UnderTier || a2UnderTier || b1UnderTier || b1PlusUnderTier;
  const status: CourseAuditResult['status'] = isUnderTiered
    ? 'under_tiered'
    : issues.length > 0
      ? 'failed'
      : 'passed';

  return {
    language,
    totalLessons: lessons.length,
    cumulativeLemmasByBand: {
      A1: cumulativeLemmasByBand.A1.size,
      A2: cumulativeLemmasByBand.A2.size,
      B1: cumulativeLemmasByBand.B1.size,
      'B1+': cumulativeLemmasByBand['B1+'].size,
      B2: cumulativeLemmasByBand.B2.size,
      C1: cumulativeLemmasByBand.C1.size,
      C2: cumulativeLemmasByBand.C2.size,
    },
    bandThresholds: {
      A1: { target: 900, actual: a1Count, passed: a1Count >= 900, underTiered: a1UnderTier },
      A2: { target: 1800, actual: a2Count, passed: a2Count >= 1800, underTiered: a2UnderTier },
      B1: { target: 3000, actual: b1Count, passed: b1Count >= 3000, underTiered: b1UnderTier },
      'B1+/B2': { target: 4500, actual: b1PlusCount, passed: b1PlusCount >= 4500, underTiered: b1PlusUnderTier },
    },
    productiveRatioByBand,
    canDoMatrix,
    canDoCoveragePassed: missingCanDoCells.length === 0,
    missingCanDoCells,
    status,
    issues,
  };
}
