/**
 * Leveled certification courses for the Path.
 *
 * Each of the 7 certification tracks becomes one unit of 5 levels. Every
 * level is two bite-sized blocks: a lesson (2–5 min quiz bank) that teaches
 * the syllabus slice, then the certification project as its capstone.
 * Blocks complete strictly in order — finishing L1 unlocks L2 — via the
 * existing sequential lock in src/app/index.tsx. Capstone ids resolve through
 * getCertProject in the project runner; lesson ids resolve through
 * getCourseLesson in the quiz engine.
 */

import type { CurriculumBlock, CurriculumUnit } from './curriculum';

interface LevelDef {
  lessonId: string;
  lessonTitle: string;
  lessonBlurb: string;
  projectId: string;
  projectTitle: string;
  projectBlurb: string;
  xp: number;
}

const lesson = (unit: string, n: number, d: LevelDef): CurriculumBlock => ({
  id: `${unit}-l${n}-lesson`,
  kind: 'lesson',
  title: `L${n} · ${d.lessonTitle}`,
  blurb: d.lessonBlurb,
  minutes: 4,
  xp: 20,
  lessonId: d.lessonId,
  lessonTitle: d.lessonTitle,
});

const capstone = (unit: string, n: number, d: LevelDef): CurriculumBlock => ({
  id: `${unit}-l${n}-cap`,
  kind: 'project',
  title: `L${n} 🏁 ${d.projectTitle}`,
  blurb: d.projectBlurb,
  minutes: 10,
  xp: d.xp,
  lessonId: d.projectId,
  lessonTitle: d.projectTitle,
});

function unit(
  id: string,
  title: string,
  goal: string,
  color: string,
  icon: string,
  section: string,
  levels: LevelDef[],
): CurriculumUnit {
  const short = id.replace('track-', '');
  return {
    id,
    course: 'certs',
    section,
    title,
    goal,
    color,
    icon,
    blocks: levels.flatMap((d, i) => [lesson(short, i + 1, d), capstone(short, i + 1, d)]),
  };
}

export const TRACK_UNITS: CurriculumUnit[] = [
  unit('track-rwd', 'Responsive Web Design', 'Markup → style → layout → responsive, one level at a time.', 'bg-rose-500', '📄', 'Course 5 · Certifications',
    [
      { lessonId: 'html-tags', lessonTitle: 'Basic HTML tags', lessonBlurb: 'Elements, headings, paragraphs — the markup alphabet.', projectId: 'rwd-cat-photo', projectTitle: 'Cat Photo App', projectBlurb: 'Capstone: headings, links, and an image with alt text.', xp: 50 },
      { lessonId: 'html-links', lessonTitle: 'Links and images', lessonBlurb: 'Anchors, attributes, and void elements.', projectId: 'rwd-survey-form', projectTitle: 'Survey Form', projectBlurb: 'Capstone: labels, inputs, and a submit button.', xp: 50 },
      { lessonId: 'css-selectors', lessonTitle: 'CSS selectors', lessonBlurb: 'Target elements and paint them with rules.', projectId: 'rwd-tech-doc', projectTitle: 'Technical Documentation Page', projectBlurb: 'Capstone: fixed nav, sections, and a media query.', xp: 50 },
      { lessonId: 'css-flexbox', lessonTitle: 'Flexbox essentials', lessonBlurb: 'One-dimensional layouts that flex.', projectId: 'rwd-portfolio', projectTitle: 'Personal Portfolio', projectBlurb: 'Capstone: hero, project grid, contact link.', xp: 50 },
      { lessonId: 'rwd-responsive', lessonTitle: 'Responsive grids and media queries', lessonBlurb: 'Grid tracks plus phone breakpoints.', projectId: 'rwd-product-landing', projectTitle: 'Product Landing Page', projectBlurb: 'Capstone: headline, features, signup, responsive.', xp: 50 },
    ]),
  unit('track-js', 'JavaScript Algorithms & Data Structures', 'From variables to DOM verdicts — the full problem-solving arc.', 'bg-yellow-500', '🟨', 'Course 5 · Certifications',
    [
      { lessonId: 'js-variables-loops', lessonTitle: 'Variables and loops', lessonBlurb: 'Store values, repeat work, compare characters.', projectId: 'js-palindrome', projectTitle: 'Palindrome Checker', projectBlurb: 'Capstone: normalize, reverse, compare.', xp: 50 },
      { lessonId: 'js-functions-objects', lessonTitle: 'Functions and lookup objects', lessonBlurb: 'Package logic; map symbols to values.', projectId: 'js-roman-numeral', projectTitle: 'Roman Numeral Converter', projectBlurb: 'Capstone: value map plus greedy loop.', xp: 50 },
      { lessonId: 'js-array-fp', lessonTitle: 'Array methods and functional thinking', lessonBlurb: 'map, filter, reduce instead of manual loops.', projectId: 'js-cash-register', projectTitle: 'Cash Register Game', projectBlurb: 'Capstone: change and status, all three cases.', xp: 50 },
      { lessonId: 'js-regex-strings', lessonTitle: 'Regex and string surgery', lessonBlurb: 'Patterns that test, match, and replace.', projectId: 'js-caesars-cipher', projectTitle: 'Caesars Cipher', projectBlurb: 'Capstone: ROT13 with symbols untouched.', xp: 50 },
      { lessonId: 'js-dom', lessonTitle: 'Showing verdicts on the page', lessonBlurb: 'Grab elements, write textContent.', projectId: 'js-telephone-validator', projectTitle: 'Telephone Validator', projectBlurb: 'Capstone: US formats accepted, the rest rejected.', xp: 50 },
    ]),
  unit('track-fed', 'Front End Development Libraries', 'Components, state, data flow, and timers.', 'bg-cyan-500', '⚛️', 'Course 5 · Certifications',
    [
      { lessonId: 'fed-react-components', lessonTitle: 'Components and JSX', lessonBlurb: 'Functions that return markup; exact contract ids.', projectId: 'fed-quote-machine', projectTitle: 'Random Quote Machine', projectBlurb: 'Capstone: quote, author, new-quote, tweet link.', xp: 60 },
      { lessonId: 'fed-state-props', lessonTitle: 'State and props', lessonBlurb: 'One shared value rendered by two panes.', projectId: 'fed-markdown-previewer', projectTitle: 'Markdown Previewer', projectBlurb: 'Capstone: editor textarea, live preview.', xp: 60 },
      { lessonId: 'fed-effects-forms', lessonTitle: 'Effects, input, and audio', lessonBlurb: 'Key listeners, pads, and instant display.', projectId: 'fed-drum-machine', projectTitle: 'Drum Machine', projectBlurb: 'Capstone: 9 pads, keyboard, display.', xp: 60 },
      { lessonId: 'fed-redux-data', lessonTitle: 'Data flow with Redux', lessonBlurb: 'Actions describe, reducers decide.', projectId: 'fed-calculator', projectTitle: 'JavaScript Calculator', projectBlurb: 'Capstone: chained ops, clear, decimal.', xp: 60 },
      { lessonId: 'fed-timers-lifecycle', lessonTitle: 'Timers and lifecycle', lessonBlurb: 'Intervals that start, tick, and clean up.', projectId: 'fed-pomodoro-clock', projectTitle: '25 + 5 Clock', projectBlurb: 'Capstone: session/break, countdown, beep.', xp: 60 },
    ]),
  unit('track-db', 'Relational Databases', 'Tables and keys before queries; scripts before safety.', 'bg-slate-600', '🗄️', 'Course 5 · Certifications',
    [
      { lessonId: 'db-tables-keys', lessonTitle: 'Tables and keys', lessonBlurb: 'Primary keys identify; foreign keys belong.', projectId: 'db-celestial-bodies', projectTitle: 'Celestial Body Database', projectBlurb: 'Capstone: galaxy → star → planet → moon.', xp: 60 },
      { lessonId: 'db-select-filter', lessonTitle: 'Reading data with SELECT', lessonBlurb: 'Columns, rows, then sorted order.', projectId: 'db-mario-database', projectTitle: 'Mario Database', projectBlurb: 'Capstone: joins, filters, ordering.', xp: 60 },
      { lessonId: 'db-joins', lessonTitle: 'Combining tables with JOIN', lessonBlurb: 'Pair rows across tables with ON.', projectId: 'db-bike-shop', projectTitle: 'Bike Rental Shop', projectBlurb: 'Capstone: rent, return, availability.', xp: 60 },
      { lessonId: 'db-bash-psql', lessonTitle: 'Scripting with Bash and psql', lessonBlurb: 'Variables hold connections; UPDATE records change.', projectId: 'db-salon-scheduler', projectTitle: 'Salon Appointment Scheduler', projectBlurb: 'Capstone: services, booking, phone lookup.', xp: 60 },
      { lessonId: 'db-inserts-safety', lessonTitle: 'Booking flow and injection safety', lessonBlurb: 'Identify first; never concatenate input.', projectId: 'db-number-guessing', projectTitle: 'Number Guessing Game', projectBlurb: 'Capstone: hints loop, persisted best score.', xp: 60 },
    ]),
  unit('track-be', 'Back End Development and APIs', 'Routes, then validation, models, filters, and headers.', 'bg-indigo-600', '🔌', 'Course 5 · Certifications',
    [
      { lessonId: 'be-node-express', lessonTitle: 'Routes with Node and Express', lessonBlurb: 'URLs map to JSON answers.', projectId: 'be-timestamp', projectTitle: 'Timestamp Microservice', projectBlurb: 'Capstone: { unix, utc } for any date.', xp: 60 },
      { lessonId: 'be-middleware-validation', lessonTitle: 'Validation and middleware', lessonBlurb: 'Check at the door; parse uploads first.', projectId: 'be-file-metadata', projectTitle: 'File Metadata Microservice', projectBlurb: 'Capstone: { name, type, size } for uploads.', xp: 60 },
      { lessonId: 'be-mongo-models', lessonTitle: 'Data models with MongoDB', lessonBlurb: 'Schemas shape every write.', projectId: 'be-url-shortener', projectTitle: 'URL Shortener Microservice', projectBlurb: 'Capstone: post a URL, redirect by id.', xp: 60 },
      { lessonId: 'be-crud-filters', lessonTitle: 'Filtered reads and full CRUD', lessonBlurb: 'Query params narrow; timestamps audit.', projectId: 'be-exercise-tracker', projectTitle: 'Exercise Tracker', projectBlurb: 'Capstone: users, dated logs, ?from&to&limit.', xp: 60 },
      { lessonId: 'be-headers-security', lessonTitle: 'Headers and API security', lessonBlurb: 'Read requests; constrain everything.', projectId: 'be-header-parser', projectTitle: 'Request Header Parser', projectBlurb: 'Capstone: { ipaddress, language, software }.', xp: 60 },
    ]),
  unit('track-py', 'Scientific Computing & Data Analysis', 'Syntax, then objects, frames, time, and formatting.', 'bg-emerald-600', '🐍', 'Course 5 · Certifications',
    [
      { lessonId: 'py-basics', lessonTitle: 'Python basics and ledgers', lessonBlurb: 'Lists, methods, and refusals that return False.', projectId: 'py-budget-app', projectTitle: 'Budget App', projectBlurb: 'Capstone: Category ledger plus spend chart.', xp: 60 },
      { lessonId: 'py-oop', lessonTitle: 'Classes and inheritance', lessonBlurb: 'Square IS-A Rectangle: reuse everything.', projectId: 'py-polygon-calculator', projectTitle: 'Polygon Area Calculator', projectBlurb: 'Capstone: area, picture, containment.', xp: 60 },
      { lessonId: 'py-numpy-pandas', lessonTitle: 'Data frames with Pandas', lessonBlurb: 'Load, split, summarize.', projectId: 'py-demographic-analyzer', projectTitle: 'Demographic Data Analyzer', projectBlurb: 'Capstone: race, income, occupations, countries.', xp: 60 },
      { lessonId: 'py-datetime-strings', lessonTitle: 'Time math and weekdays', lessonBlurb: 'AM/PM flips and day rollovers.', projectId: 'py-time-calculator', projectTitle: 'Time Calculator', projectBlurb: 'Capstone: add_time with weekday naming.', xp: 60 },
      { lessonId: 'py-format-validation', lessonTitle: 'Formatting and input validation', lessonBlurb: 'Validate first, align second.', projectId: 'py-arithmetic-formatter', projectTitle: 'Arithmetic Formatter', projectBlurb: 'Capstone: vertical problems, optional answers.', xp: 60 },
    ]),
  unit('track-secml', 'Information Security & Machine Learning', 'Harden first, then learn from data.', 'bg-red-600', '🛡️', 'Course 5 · Certifications',
    [
      { lessonId: 'sec-http-helmet', lessonTitle: 'Headers and Helmet', lessonBlurb: 'Secure defaults; one person, one vote.', projectId: 'sec-stock-checker', projectTitle: 'Stock Price Checker', projectBlurb: 'Capstone: Helmet-secured likes, relative counts.', xp: 70 },
      { lessonId: 'sec-auth-passwords', lessonTitle: 'Identity and password-gated actions', lessonBlurb: 'View freely, destroy with proof.', projectId: 'sec-anon-board', projectTitle: 'Anonymous Message Board', projectBlurb: 'Capstone: report, password deletes, bumped feed.', xp: 70 },
      { lessonId: 'sec-crud-safety', lessonTitle: 'Hardened CRUD and audit trails', lessonBlurb: 'Filter reads; timestamp writes.', projectId: 'sec-issue-tracker', projectTitle: 'Issue Tracker', projectBlurb: 'Capstone: full CRUD with filters.', xp: 70 },
      { lessonId: 'sec-ml-basics', lessonTitle: 'Learning from data with TensorFlow', lessonBlurb: 'Fit on train, believe validation.', projectId: 'ml-linear-regression', projectTitle: 'Linear Regression Model', projectBlurb: 'Capstone: trained model, reported MAE.', xp: 70 },
      { lessonId: 'sec-nlp-classification', lessonTitle: 'Text classification for spam', lessonBlurb: 'Tokens to vectors to verdict.', projectId: 'ml-spam-classifier', projectTitle: 'Spam Text Classifier', projectBlurb: 'Capstone: ham vs spam with held-out accuracy.', xp: 70 },
    ]),
];
