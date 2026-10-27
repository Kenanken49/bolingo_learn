/**
 * Leveled certification courses for the Path.
 *
 * Each of the 7 certification tracks becomes one unit of 5 levels. Every
 * level is three bite-sized blocks — a lesson that teaches the syllabus
 * slice, a workshop that builds it guided, then the certification project as
 * its capstone — followed by one track checkpoint quiz after L5. Blocks
 * complete strictly in order (lesson → workshop → capstone → … → checkpoint)
 * via the existing sequential lock in src/app/index.tsx: finishing one node
 * unlocks the next. Lesson/workshop ids resolve through getCourseLesson in
 * the quiz engine; capstones resolve through getCertProject in the runner.
 */

import type { CurriculumBlock, CurriculumUnit } from './curriculum';

interface LevelDef {
  lessonId: string;
  lessonTitle: string;
  lessonBlurb: string;
  workshopId: string;
  workshopTitle: string;
  workshopBlurb: string;
  kind: 'workshop' | 'lab';
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

const workshop = (unit: string, n: number, d: LevelDef): CurriculumBlock => ({
  id: `${unit}-l${n}-workshop`,
  kind: d.kind,
  title: `L${n} · ${d.workshopTitle}`,
  blurb: d.workshopBlurb,
  minutes: 4,
  xp: 20,
  lessonId: d.workshopId,
  lessonTitle: d.workshopTitle,
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

const checkpoint = (
  unit: string,
  trackTitle: string,
  id: string,
  title: string,
  blurb: string,
): CurriculumBlock => ({
  id: `${unit}-checkpoint`,
  kind: 'quiz',
  title: `${trackTitle} checkpoint`,
  blurb,
  minutes: 5,
  xp: 40,
  lessonId: id,
  lessonTitle: title,
});

function unit(
  id: string,
  title: string,
  goal: string,
  color: string,
  icon: string,
  section: string,
  levels: LevelDef[],
  checkpointId: string,
  checkpointTitle: string,
  checkpointBlurb: string,
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
    blocks: [
      ...levels.flatMap((d, i) => [lesson(short, i + 1, d), workshop(short, i + 1, d), capstone(short, i + 1, d)]),
      checkpoint(short, title, checkpointId, checkpointTitle, checkpointBlurb),
    ],
  };
}

const W = (
  workshopId: string,
  workshopTitle: string,
  workshopBlurb: string,
  kind: 'workshop' | 'lab' = 'workshop',
) => ({ workshopId, workshopTitle, workshopBlurb, kind });

export const TRACK_UNITS: CurriculumUnit[] = [
  unit('track-rwd', 'Responsive Web Design', 'Markup → style → layout → responsive, one level at a time.', 'bg-rose-500', '📄', 'Course 5 · Certifications',
    [
      { lessonId: 'html-tags', lessonTitle: 'Basic HTML tags', lessonBlurb: 'Elements, headings, and paragraphs.', ...W('html-workshop-1', 'Build a paragraph step by step', 'Guided: assemble a real paragraph token by token.'), projectId: 'rwd-cat-photo', projectTitle: 'Cat Photo App', projectBlurb: 'Capstone: headings, links, and an image with alt text.', xp: 50 },
      { lessonId: 'html-links', lessonTitle: 'Links and images', lessonBlurb: 'Anchors, attributes, and void elements.', ...W('html-workshop-2', 'Attributes workshop', 'Guided: attributes, links, and lists.'), projectId: 'rwd-survey-form', projectTitle: 'Survey Form', projectBlurb: 'Capstone: labels, inputs, and a submit button.', xp: 50 },
      { lessonId: 'css-selectors', lessonTitle: 'CSS selectors', lessonBlurb: 'Target elements and paint them.', ...W('css-workshop-1', 'Box model workshop', 'Guided: rules, boxes, and spacing.'), projectId: 'rwd-tech-doc', projectTitle: 'Technical Documentation Page', projectBlurb: 'Capstone: fixed nav, sections, and a media query.', xp: 50 },
      { lessonId: 'css-flexbox', lessonTitle: 'Flexbox essentials', lessonBlurb: 'One-dimensional layouts that flex.', ...W('css-lab-1', 'Lab: style stories', 'Solo: satisfy the style checklist unguided.', 'lab'), projectId: 'rwd-portfolio', projectTitle: 'Personal Portfolio', projectBlurb: 'Capstone: hero, project grid, contact link.', xp: 50 },
      { lessonId: 'rwd-responsive', lessonTitle: 'Responsive grids and media queries', lessonBlurb: 'Grid tracks plus phone breakpoints.', ...W('rwd-responsive-workshop', 'Build a phone layout step by step', 'Guided: style block, grid, breakpoint.'), projectId: 'rwd-product-landing', projectTitle: 'Product Landing Page', projectBlurb: 'Capstone: headline, features, signup, responsive.', xp: 50 },
    ],
    'rwd-checkpoint', 'Responsive Web Design checkpoint', 'Prove it: markup, links, selectors, flexbox, responsive.'),
  unit('track-js', 'JavaScript Algorithms & Data Structures', 'From variables to DOM verdicts — the full problem-solving arc.', 'bg-yellow-500', '🟨', 'Course 5 · Certifications',
    [
      { lessonId: 'js-variables-loops', lessonTitle: 'Variables and loops', lessonBlurb: 'Store values, repeat work.', ...W('js-variables-workshop', 'Build a counter step by step', 'Guided: declare, loop, accumulate.'), projectId: 'js-palindrome', projectTitle: 'Palindrome Checker', projectBlurb: 'Capstone: normalize, reverse, compare.', xp: 50 },
      { lessonId: 'js-functions-objects', lessonTitle: 'Functions and lookup objects', lessonBlurb: 'Package logic; map symbols to values.', ...W('js-functions-workshop', 'Build a converter step by step', 'Guided: value map, function, result string.'), projectId: 'js-roman-numeral', projectTitle: 'Roman Numeral Converter', projectBlurb: 'Capstone: value map plus greedy loop.', xp: 50 },
      { lessonId: 'js-array-fp', lessonTitle: 'Array methods and functional thinking', lessonBlurb: 'map, filter, reduce.', ...W('js-array-workshop', 'Fold a drawer step by step', 'Guided: reduce, map, filter pipeline.'), projectId: 'js-cash-register', projectTitle: 'Cash Register Game', projectBlurb: 'Capstone: change and status, all three cases.', xp: 50 },
      { lessonId: 'js-regex-strings', lessonTitle: 'Regex and string surgery', lessonBlurb: 'Patterns that test, match, and replace.', ...W('js-regex-workshop', 'Clean and shift text step by step', 'Guided: normalize, guard, shift.'), projectId: 'js-caesars-cipher', projectTitle: 'Caesars Cipher', projectBlurb: 'Capstone: ROT13 with symbols untouched.', xp: 50 },
      { lessonId: 'js-dom', lessonTitle: 'Showing verdicts on the page', lessonBlurb: 'Grab elements, write textContent.', ...W('js-dom-workshop', 'Wire a verdict display step by step', 'Guided: grab, compute, show.'), projectId: 'js-telephone-validator', projectTitle: 'Telephone Validator', projectBlurb: 'Capstone: US formats accepted, the rest rejected.', xp: 50 },
    ],
    'js-checkpoint', 'JavaScript checkpoint', 'Prove it: loops, maps, methods, regex, DOM.'),
  unit('track-fed', 'Front End Development Libraries', 'Components, state, data flow, and timers.', 'bg-cyan-500', '⚛️', 'Course 5 · Certifications',
    [
      { lessonId: 'fed-react-components', lessonTitle: 'Components and JSX', lessonBlurb: 'Functions that return markup; exact ids.', ...W('fed-react-workshop', 'Assemble a quote card step by step', 'Guided: ids, JSX values, button.'), projectId: 'fed-quote-machine', projectTitle: 'Random Quote Machine', projectBlurb: 'Capstone: quote, author, new-quote, tweet link.', xp: 60 },
      { lessonId: 'fed-state-props', lessonTitle: 'State and props', lessonBlurb: 'One shared value, two panes.', ...W('fed-state-workshop', 'Wire editor to preview step by step', 'Guided: state, editor id, preview.'), projectId: 'fed-markdown-previewer', projectTitle: 'Markdown Previewer', projectBlurb: 'Capstone: editor textarea, live preview.', xp: 60 },
      { lessonId: 'fed-effects-forms', lessonTitle: 'Effects, input, and audio', lessonBlurb: 'Keys, pads, instant display.', ...W('fed-effects-workshop', 'Wire pads and keys step by step', 'Guided: clips, display, shared handler.'), projectId: 'fed-drum-machine', projectTitle: 'Drum Machine', projectBlurb: 'Capstone: 9 pads, keyboard, display.', xp: 60 },
      { lessonId: 'fed-redux-data', lessonTitle: 'Data flow with Redux', lessonBlurb: 'Actions describe, reducers decide.', ...W('fed-redux-workshop', 'Route a digit press step by step', 'Guided: action, evaluate, immutability.'), projectId: 'fed-calculator', projectTitle: 'JavaScript Calculator', projectBlurb: 'Capstone: chained ops, clear, decimal.', xp: 60 },
      { lessonId: 'fed-timers-lifecycle', lessonTitle: 'Timers and lifecycle', lessonBlurb: 'Intervals that start, tick, clean up.', ...W('fed-timers-workshop', 'Run a countdown step by step', 'Guided: schedule, clear, beep.'), projectId: 'fed-pomodoro-clock', projectTitle: '25 + 5 Clock', projectBlurb: 'Capstone: session/break, countdown, beep.', xp: 60 },
    ],
    'fed-checkpoint', 'Front End Libraries checkpoint', 'Prove it: JSX, state, effects, Redux, timers.'),
  unit('track-db', 'Relational Databases', 'Tables and keys before queries; scripts before safety.', 'bg-slate-600', '🗄️', 'Course 5 · Certifications',
    [
      { lessonId: 'db-tables-keys', lessonTitle: 'Tables and keys', lessonBlurb: 'Primary keys identify; foreign keys belong.', ...W('db-tables-workshop', 'Declare keys step by step', 'Guided: primary key, table, reference.'), projectId: 'db-celestial-bodies', projectTitle: 'Celestial Body Database', projectBlurb: 'Capstone: galaxy → star → planet → moon.', xp: 60 },
      { lessonId: 'db-select-filter', lessonTitle: 'Reading data with SELECT', lessonBlurb: 'Columns, rows, sorted order.', ...W('db-select-workshop', 'Filter and sort step by step', 'Guided: star, WHERE, ORDER BY.'), projectId: 'db-mario-database', projectTitle: 'Mario Database', projectBlurb: 'Capstone: joins, filters, ordering.', xp: 60 },
      { lessonId: 'db-joins', lessonTitle: 'Combining tables with JOIN', lessonBlurb: 'Pair rows across tables.', ...W('db-joins-workshop', 'Pair tables step by step', 'Guided: ON clause, survival rules.'), projectId: 'db-bike-shop', projectTitle: 'Bike Rental Shop', projectBlurb: 'Capstone: rent, return, availability.', xp: 60 },
      { lessonId: 'db-bash-psql', lessonTitle: 'Scripting with Bash and psql', lessonBlurb: 'Helpers hold connections; UPDATE changes state.', ...W('db-bash-workshop', 'Script a rental step by step', 'Guided: helper, UPDATE, flags.'), projectId: 'db-salon-scheduler', projectTitle: 'Salon Appointment Scheduler', projectBlurb: 'Capstone: services, booking, phone lookup.', xp: 60 },
      { lessonId: 'db-inserts-safety', lessonTitle: 'Booking flow and injection safety', lessonBlurb: 'Identify first; never concatenate.', ...W('db-inserts-workshop', 'Book safely step by step', 'Guided: INSERT, lookup, COUNT.'), projectId: 'db-number-guessing', projectTitle: 'Number Guessing Game', projectBlurb: 'Capstone: hints loop, persisted best score.', xp: 60 },
    ],
    'db-checkpoint', 'Relational Databases checkpoint', 'Prove it: keys, reads, joins, scripts, safety.'),
  unit('track-be', 'Back End Development and APIs', 'Routes, then validation, models, filters, and headers.', 'bg-indigo-600', '🔌', 'Course 5 · Certifications',
    [
      { lessonId: 'be-node-express', lessonTitle: 'Routes with Node and Express', lessonBlurb: 'URLs map to JSON answers.', ...W('be-routes-workshop', 'Answer dates step by step', 'Guided: route, res.json, both cases.'), projectId: 'be-timestamp', projectTitle: 'Timestamp Microservice', projectBlurb: 'Capstone: { unix, utc } for any date.', xp: 60 },
      { lessonId: 'be-middleware-validation', lessonTitle: 'Validation and middleware', lessonBlurb: 'Check at the door; parse uploads first.', ...W('be-validation-workshop', 'Guard inputs step by step', 'Guided: multer, redirect, reject junk.'), projectId: 'be-file-metadata', projectTitle: 'File Metadata Microservice', projectBlurb: 'Capstone: { name, type, size } for uploads.', xp: 60 },
      { lessonId: 'be-mongo-models', lessonTitle: 'Data models with MongoDB', lessonBlurb: 'Schemas shape every write.', ...W('be-models-workshop', 'Shape data step by step', 'Guided: schema field, create, defaults.'), projectId: 'be-url-shortener', projectTitle: 'URL Shortener Microservice', projectBlurb: 'Capstone: post a URL, redirect by id.', xp: 60 },
      { lessonId: 'be-crud-filters', lessonTitle: 'Filtered reads and full CRUD', lessonBlurb: 'Query params narrow; timestamps audit.', ...W('be-crud-workshop', 'Filter and stamp step by step', 'Guided: slice, spread, updated_on.'), projectId: 'be-exercise-tracker', projectTitle: 'Exercise Tracker', projectBlurb: 'Capstone: users, dated logs, ?from&to&limit.', xp: 60 },
      { lessonId: 'be-headers-security', lessonTitle: 'Headers and API security', lessonBlurb: 'Read requests; constrain everything.', ...W('be-headers-workshop', 'Read requests step by step', 'Guided: headers, payload, limits.'), projectId: 'be-header-parser', projectTitle: 'Request Header Parser', projectBlurb: 'Capstone: { ipaddress, language, software }.', xp: 60 },
    ],
    'be-checkpoint', 'Back End checkpoint', 'Prove it: routes, validation, models, filters, headers.'),
  unit('track-py', 'Scientific Computing & Data Analysis', 'Syntax, then objects, frames, time, and formatting.', 'bg-emerald-600', '🐍', 'Course 5 · Certifications',
    [
      { lessonId: 'py-basics', lessonTitle: 'Python basics and ledgers', lessonBlurb: 'Lists, methods, refusals that return False.', ...W('py-basics-workshop', 'Grow a ledger step by step', 'Guided: append, sum, guard.'), projectId: 'py-budget-app', projectTitle: 'Budget App', projectBlurb: 'Capstone: Category ledger plus spend chart.', xp: 60 },
      { lessonId: 'py-oop', lessonTitle: 'Classes and inheritance', lessonBlurb: 'Square IS-A Rectangle.', ...W('py-oop-workshop', 'Shape a square step by step', 'Guided: area, super(), refusal.'), projectId: 'py-polygon-calculator', projectTitle: 'Polygon Area Calculator', projectBlurb: 'Capstone: area, picture, containment.', xp: 60 },
      { lessonId: 'py-numpy-pandas', lessonTitle: 'Data frames with Pandas', lessonBlurb: 'Load, split, summarize.', ...W('py-pandas-workshop', 'Summarize people step by step', 'Guided: counts, groups, means.'), projectId: 'py-demographic-analyzer', projectTitle: 'Demographic Data Analyzer', projectBlurb: 'Capstone: race, income, occupations, countries.', xp: 60 },
      { lessonId: 'py-datetime-strings', lessonTitle: 'Time math and weekdays', lessonBlurb: 'AM/PM flips and day rollovers.', ...W('py-time-workshop', 'Roll time forward step by step', 'Guided: def, format, flip, weekday.'), projectId: 'py-time-calculator', projectTitle: 'Time Calculator', projectBlurb: 'Capstone: add_time with weekday naming.', xp: 60 },
      { lessonId: 'py-format-validation', lessonTitle: 'Formatting and input validation', lessonBlurb: 'Validate first, align second.', ...W('py-format-workshop', 'Stack problems step by step', 'Guided: rjust, join, refuse.'), projectId: 'py-arithmetic-formatter', projectTitle: 'Arithmetic Formatter', projectBlurb: 'Capstone: vertical problems, optional answers.', xp: 60 },
    ],
    'py-checkpoint', 'Python checkpoint', 'Prove it: ledgers, classes, frames, time, format.'),
  unit('track-secml', 'Information Security & Machine Learning', 'Harden first, then learn from data.', 'bg-red-600', '🛡️', 'Course 5 · Certifications',
    [
      { lessonId: 'sec-http-helmet', lessonTitle: 'Headers and Helmet', lessonBlurb: 'Secure defaults; one person, one vote.', ...W('sec-helmet-workshop', 'Lock headers step by step', 'Guided: defaults, fetch, relative likes.'), projectId: 'sec-stock-checker', projectTitle: 'Stock Price Checker', projectBlurb: 'Capstone: Helmet-secured likes, relative counts.', xp: 70 },
      { lessonId: 'sec-auth-passwords', lessonTitle: 'Identity and password-gated actions', lessonBlurb: 'View freely, destroy with proof.', ...W('sec-auth-workshop', 'Gate changes step by step', 'Guided: flag, match, float.'), projectId: 'sec-anon-board', projectTitle: 'Anonymous Message Board', projectBlurb: 'Capstone: report, password deletes, bumped feed.', xp: 70 },
      { lessonId: 'sec-crud-safety', lessonTitle: 'Hardened CRUD and audit trails', lessonBlurb: 'Filter reads; timestamp writes.', ...W('sec-crud-workshop', 'Audit writes step by step', 'Guided: finder, stamp, AND-filters.'), projectId: 'sec-issue-tracker', projectTitle: 'Issue Tracker', projectBlurb: 'Capstone: full CRUD with filters.', xp: 70 },
      { lessonId: 'sec-ml-basics', lessonTitle: 'Learning from data with TensorFlow', lessonBlurb: 'Fit on train, believe validation.', ...W('sec-ml-workshop', 'Fit honestly step by step', 'Guided: Dense, evaluate, MAE.'), projectId: 'ml-linear-regression', projectTitle: 'Linear Regression Model', projectBlurb: 'Capstone: trained model, reported MAE.', xp: 70 },
      { lessonId: 'sec-nlp-classification', lessonTitle: 'Text classification for spam', lessonBlurb: 'Tokens to vectors to verdict.', ...W('sec-nlp-workshop', 'Vectorize words step by step', 'Guided: pad, sigmoid, confusion.'), projectId: 'ml-spam-classifier', projectTitle: 'Spam Text Classifier', projectBlurb: 'Capstone: ham vs spam with held-out accuracy.', xp: 70 },
    ],
    'secml-checkpoint', 'Security & ML checkpoint', 'Prove it: headers, identity, CRUD, regression, spam.'),
];
