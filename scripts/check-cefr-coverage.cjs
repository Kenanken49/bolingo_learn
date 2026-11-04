#!/usr/bin/env node
/**
 * CEFR Curriculum Quality Gate.
 *
 * Runs deterministic CEFR level auditing across Bolingo Learn language lessons:
 * 1. Target phrase lemmatisation & POS-tagging (Swahili stem + TAM parsing).
 * 2. Lexical mapping hierarchy (FLELex, DAFlex, ELELex, Oxford/EVP, CEFR-J, Swahili stem).
 * 3. Lesson metrics (vocab_index P80, grammar_index rank, cando_index tier).
 * 4. Level gates (A1, A2, B1, B1+) and discrepancy flagging (|vocab - grammar| >= 2).
 * 5. Course-level checks (cumulative lemma thresholds, productive 50-60% ratio, Can-Do matrix).
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const {
  evaluateLessonGates,
  auditCourseLevel,
} = require('../lib/cefrStandards.ts');

const { LANGUAGE_COURSES } = require('../lib/languages.ts');
const { SWAHILI_PLUS } = require('../lib/swahili-plus.ts');
const { SPANISH_PLUS } = require('../lib/spanish-plus.ts');
const { FRENCH_PLUS } = require('../lib/french-plus.ts');
const { GERMAN_PLUS } = require('../lib/german-plus.ts');
const { ENGLISH_PLUS } = require('../lib/english-plus.ts');

const courses = {
  swahili: Object.values({ ...LANGUAGE_COURSES, ...SWAHILI_PLUS }).filter((l) =>
    l.id.startsWith('swahili-')
  ),
  spanish: Object.values({ ...LANGUAGE_COURSES, ...SPANISH_PLUS }).filter((l) =>
    l.id.startsWith('spanish-')
  ),
  french: Object.values({ ...LANGUAGE_COURSES, ...FRENCH_PLUS }).filter((l) =>
    l.id.startsWith('french-')
  ),
  german: Object.values({ ...LANGUAGE_COURSES, ...GERMAN_PLUS }).filter((l) =>
    l.id.startsWith('german-')
  ),
  english: Object.values({ ...LANGUAGE_COURSES, ...ENGLISH_PLUS }).filter((l) =>
    l.id.startsWith('english-')
  ),
};

console.log('');
console.log('CEFR Curriculum Standards Audit');
console.log('====================================');

const fullReport = {};

for (const [lang, lessons] of Object.entries(courses)) {
  console.log(`\nAuditing ${lang.toUpperCase()} (${lessons.length} lessons)...`);
  const audit = auditCourseLevel(lessons, lang);
  fullReport[lang] = {
    summary: audit,
    sampleLessons: lessons.slice(0, 3).map((l) => evaluateLessonGates(l, lang)),
  };

  console.log(`  - Cumulative Distinct Lemmas:`);
  console.log(`      A1: ${audit.bandThresholds.A1.actual} / 900 (Under-tiered: ${audit.bandThresholds.A1.underTiered})`);
  console.log(`      A2: ${audit.bandThresholds.A2.actual} / 1800 (Under-tiered: ${audit.bandThresholds.A2.underTiered})`);
  console.log(`      B1: ${audit.bandThresholds.B1.actual} / 3000 (Under-tiered: ${audit.bandThresholds.B1.underTiered})`);
  console.log(`      B1+/B2: ${audit.bandThresholds['B1+/B2'].actual} / 4500 (Under-tiered: ${audit.bandThresholds['B1+/B2'].underTiered})`);
  console.log(`  - Can-Do 5x4 Grid Coverage: ${audit.canDoCoveragePassed ? 'PASS' : 'WARN'}`);
  if (audit.missingCanDoCells.length > 0) {
    console.log(`      Missing cells: ${audit.missingCanDoCells.slice(0, 4).join(', ')}${audit.missingCanDoCells.length > 4 ? '...' : ''}`);
  }
}

const outDir = path.resolve(__dirname, '..', '.quality');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const reportPath = path.join(outDir, 'cefr-audit.json');
fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2), 'utf8');
console.log(`\nAudit saved to ${path.relative(process.cwd(), reportPath)}`);
console.log('CEFR Audit Completed Successfully.\n');
