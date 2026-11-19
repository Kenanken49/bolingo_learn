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
      { lessonId: 'html-tags', lessonTitle: 'Basic HTML tags', lessonBlurb: 'Elements, headings, and paragraphs.', ...W('html-workshop-1', 'Paper workshop: build a paragraph', 'Paper exercise, nothing runs here: assemble a real paragraph element token by token; nothing executes — your text is matched.'), projectId: 'rwd-cat-photo', projectTitle: 'Cat Photo App', projectBlurb: 'Capstone: headings, links, and an image with alt text.', xp: 50 },
      { lessonId: 'html-links', lessonTitle: 'Links and images', lessonBlurb: 'Anchors, attributes, and void elements.', ...W('html-workshop-2', 'Paper workshop: attributes and links', 'Paper exercise, nothing runs here: write the src attributes, the ids and the labels; nothing executes — your text is matched.'), projectId: 'rwd-survey-form', projectTitle: 'Survey Form', projectBlurb: 'Capstone: labels, inputs, and a submit button.', xp: 50 },
      { lessonId: 'css-selectors', lessonTitle: 'CSS selectors', lessonBlurb: 'Target elements and paint them.', ...W('css-workshop-1', 'Paper workshop: the box model', 'Paper exercise, nothing runs here: write the rules, the boxes and the spacing; nothing executes — your text is matched.'), projectId: 'rwd-tech-doc', projectTitle: 'Technical Documentation Page', projectBlurb: 'Capstone: fixed nav, sections, and a media query.', xp: 50 },
      { lessonId: 'css-flexbox', lessonTitle: 'Flexbox essentials', lessonBlurb: 'One-dimensional layouts that flex.', ...W('css-lab-1', 'Lab: style stories', 'Solo: satisfy the style checklist unguided.', 'lab'), projectId: 'rwd-portfolio', projectTitle: 'Personal Portfolio', projectBlurb: 'Capstone: hero, project grid, contact link.', xp: 50 },
      { lessonId: 'rwd-responsive', lessonTitle: 'Responsive grids and media queries', lessonBlurb: 'Grid tracks plus phone breakpoints.', ...W('rwd-responsive-workshop', 'Paper workshop: build a phone layout', 'Paper exercise, nothing runs here: write the style block, the grid and the breakpoint; nothing executes — your text is matched.'), projectId: 'rwd-product-landing', projectTitle: 'Product Landing Page', projectBlurb: 'Capstone: headline, features, signup, responsive.', xp: 50 },
    ],
    'rwd-checkpoint', 'Responsive Web Design checkpoint', 'Prove it: markup, links, selectors, flexbox, responsive.'),
  unit('track-js', 'JavaScript Algorithms & Data Structures', 'From variables to DOM verdicts — the full problem-solving arc.', 'bg-yellow-500', '🟨', 'Course 5 · Certifications',
    [
      { lessonId: 'js-variables-loops', lessonTitle: 'Variables and loops', lessonBlurb: 'Store values, repeat work.', ...W('js-variables-workshop', 'Build a counter step by step', 'Guided: declare, loop, accumulate.'), projectId: 'js-palindrome', projectTitle: 'Palindrome Checker', projectBlurb: 'Capstone: normalize, reverse, compare.', xp: 50 },
      { lessonId: 'js-functions-objects', lessonTitle: 'Functions and lookup objects', lessonBlurb: 'Package logic; map symbols to values.', ...W('js-functions-workshop', 'Paper workshop: build a converter', 'Paper exercise, nothing runs here: write the value map, the function and the result string; nothing executes — your text is matched.'), projectId: 'js-roman-numeral', projectTitle: 'Roman Numeral Converter', projectBlurb: 'Capstone: value map plus greedy loop.', xp: 50 },
      { lessonId: 'js-array-fp', lessonTitle: 'Array methods and functional thinking', lessonBlurb: 'map, filter, reduce.', ...W('js-array-workshop', 'Fold a drawer step by step', 'Guided: reduce, map, filter pipeline.'), projectId: 'js-cash-register', projectTitle: 'Cash Register Game', projectBlurb: 'Capstone: change and status, all three cases.', xp: 50 },
      { lessonId: 'js-regex-strings', lessonTitle: 'Regex and string surgery', lessonBlurb: 'Patterns that test, match, and replace.', ...W('js-regex-workshop', 'Clean and shift text step by step', 'Guided: normalize, guard, shift.'), projectId: 'js-caesars-cipher', projectTitle: 'Caesars Cipher', projectBlurb: 'Capstone: ROT13 with symbols untouched.', xp: 50 },
      { lessonId: 'js-dom', lessonTitle: 'Showing verdicts on the page', lessonBlurb: 'Grab elements, write textContent.', ...W('js-dom-workshop', 'Wire a verdict display step by step', 'Guided: grab, compute, show.'), projectId: 'js-telephone-validator', projectTitle: 'Telephone Validator', projectBlurb: 'Capstone: US formats accepted, the rest rejected.', xp: 50 },
    ],
    'js-checkpoint', 'JavaScript checkpoint', 'Prove it: loops, maps, methods, regex, DOM.'),
  unit('track-fed', 'Front End Development Libraries', 'Components, state, data flow, and timers.', 'bg-cyan-500', '⚛️', 'Course 5 · Certifications',
    [
      { lessonId: 'fed-react-components', lessonTitle: 'Components and JSX', lessonBlurb: 'Functions that return markup; exact ids.', ...W('fed-react-workshop', 'Paper workshop: assemble a quote card', 'Paper exercise, nothing runs here: write the ids, the JSX values and the button; nothing executes — your text is matched.'), projectId: 'fed-quote-machine', projectTitle: 'Random Quote Machine', projectBlurb: 'Capstone: quote, author, new-quote, tweet link.', xp: 60 },
      { lessonId: 'fed-state-props', lessonTitle: 'State and props', lessonBlurb: 'One shared value, two panes.', ...W('fed-state-workshop', 'Paper workshop: wire editor to preview', 'Paper exercise, nothing runs here: write the state, the editor id and the preview; nothing executes — your text is matched.'), projectId: 'fed-markdown-previewer', projectTitle: 'Markdown Previewer', projectBlurb: 'Capstone: editor textarea, live preview.', xp: 60 },
      { lessonId: 'fed-effects-forms', lessonTitle: 'Effects, input, and audio', lessonBlurb: 'Keys, pads, instant display.', ...W('fed-effects-workshop', 'Paper workshop: wire pads and keys', 'Paper exercise, nothing runs here: write the clips, the display and the shared handler; nothing executes — your text is matched.'), projectId: 'fed-drum-machine', projectTitle: 'Drum Machine', projectBlurb: 'Capstone: 9 pads, keyboard, display.', xp: 60 },
      { lessonId: 'fed-redux-data', lessonTitle: 'Data flow with Redux', lessonBlurb: 'Actions describe, reducers decide.', ...W('fed-redux-workshop', 'Paper workshop: route a digit press', 'Paper exercise, nothing runs here: write the action, the evaluate call and the guard; nothing executes — your text is matched.'), projectId: 'fed-calculator', projectTitle: 'JavaScript Calculator', projectBlurb: 'Capstone: chained ops, clear, decimal.', xp: 60 },
      { lessonId: 'fed-timers-lifecycle', lessonTitle: 'Timers and lifecycle', lessonBlurb: 'Intervals that start, tick, clean up.', ...W('fed-timers-workshop', 'Run a countdown step by step', 'Guided: schedule, clear, beep.'), projectId: 'fed-pomodoro-clock', projectTitle: '25 + 5 Clock', projectBlurb: 'Capstone: session/break, countdown, beep.', xp: 60 },
    ],
    'fed-checkpoint', 'Front End Libraries checkpoint', 'Prove it: JSX, state, effects, Redux, timers.'),
  unit('track-db', 'Relational Databases', 'Tables and keys before queries; scripts before safety.', 'bg-slate-600', '🗄️', 'Course 5 · Certifications',
    [
      { lessonId: 'db-tables-keys', lessonTitle: 'Tables and keys', lessonBlurb: 'Primary keys identify; foreign keys belong.', ...W('db-tables-workshop', 'Paper workshop: declare keys', 'Paper exercise, nothing runs here: write the primary key, the table and the reference; nothing executes — your text is matched.'), projectId: 'db-celestial-bodies', projectTitle: 'On paper: Celestial Body Database', projectBlurb: 'Paper exercise, nothing runs here: write the SQL for a galaxy, star, planet and moon schema; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'db-select-filter', lessonTitle: 'Reading data with SELECT', lessonBlurb: 'Columns, rows, sorted order.', ...W('db-select-workshop', 'Paper workshop: filter and sort', 'Paper exercise, nothing runs here: write the star table, the WHERE and the ORDER BY; nothing executes — your text is matched.'), projectId: 'db-mario-database', projectTitle: 'On paper: Mario Database', projectBlurb: 'Paper exercise, nothing runs here: write the joins, filters and ordering over the Mario tables; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'db-joins', lessonTitle: 'Combining tables with JOIN', lessonBlurb: 'Pair rows across tables.', ...W('db-joins-workshop', 'Paper workshop: pair tables', 'Paper exercise, nothing runs here: write the ON clause and the survival rules; nothing executes — your text is matched.'), projectId: 'db-bike-shop', projectTitle: 'On paper: Bike Rental Shop', projectBlurb: 'Paper exercise, nothing runs here: write the rent, return and availability queries; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'db-bash-psql', lessonTitle: 'Scripting with Bash and psql', lessonBlurb: 'Helpers hold connections; UPDATE changes state.', ...W('db-bash-workshop', 'Paper workshop: script a rental', 'Paper exercise, nothing runs here: write the helper, the UPDATE and the flags; nothing executes — your text is matched.'), projectId: 'db-salon-scheduler', projectTitle: 'On paper: Salon Appointment Scheduler', projectBlurb: 'Paper exercise, nothing runs here: write the services, booking and phone-lookup queries; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'db-inserts-safety', lessonTitle: 'Booking flow and injection safety', lessonBlurb: 'Identify first; never concatenate.', ...W('db-inserts-workshop', 'Paper workshop: book safely', 'Paper exercise, nothing runs here: write the INSERT, the lookup and the COUNT; nothing executes — your text is matched.'), projectId: 'db-number-guessing', projectTitle: 'On paper: Number Guessing Game', projectBlurb: 'Paper exercise, nothing runs here: write the hint loop and the persisted best score; nothing executes — your text is matched.', xp: 60 },
    ],
    'db-checkpoint', 'Relational Databases checkpoint', 'Prove it: keys, reads, joins, scripts, safety.'),
  unit('track-be', 'Back End Development and APIs', 'Routes, then validation, models, filters, and headers.', 'bg-indigo-600', '🔌', 'Course 5 · Certifications',
    [
      { lessonId: 'be-node-express', lessonTitle: 'Routes with Node and Express', lessonBlurb: 'URLs map to JSON answers.', ...W('be-routes-workshop', 'Answer dates step by step', 'Guided: route, res.json, both cases.'), projectId: 'be-timestamp', projectTitle: 'On paper: Timestamp Microservice', projectBlurb: 'Paper exercise, nothing runs here: write the route that answers { unix, utc } for any date; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'be-middleware-validation', lessonTitle: 'Validation and middleware', lessonBlurb: 'Check at the door; parse uploads first.', ...W('be-validation-workshop', 'Paper workshop: guard inputs', 'Paper exercise, nothing runs here: write the multer guard, the redirect and the rejection; nothing executes — your text is matched.'), projectId: 'be-file-metadata', projectTitle: 'On paper: File Metadata Microservice', projectBlurb: 'Paper exercise, nothing runs here: write the upload route that answers { name, type, size }; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'be-mongo-models', lessonTitle: 'Data models with MongoDB', lessonBlurb: 'Schemas shape every write.', ...W('be-models-workshop', 'Paper workshop: shape data', 'Paper exercise, nothing runs here: write the schema field, the create call and the defaults; nothing executes — your text is matched.'), projectId: 'be-url-shortener', projectTitle: 'On paper: URL Shortener Microservice', projectBlurb: 'Paper exercise, nothing runs here: write the post handler and the redirect by id; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'be-crud-filters', lessonTitle: 'Filtered reads and full CRUD', lessonBlurb: 'Query params narrow; timestamps audit.', ...W('be-crud-workshop', 'Paper workshop: filter and stamp', 'Paper exercise, nothing runs here: write the slice, the spread and updated_on; nothing executes — your text is matched.'), projectId: 'be-exercise-tracker', projectTitle: 'On paper: Exercise Tracker', projectBlurb: 'Paper exercise, nothing runs here: write the users route, the dated logs and the from/to/limit filter; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'be-headers-security', lessonTitle: 'Headers and API security', lessonBlurb: 'Read requests; constrain everything.', ...W('be-headers-workshop', 'Paper workshop: read requests', 'Paper exercise, nothing runs here: write the headers, the payload and the limits; nothing executes — your text is matched.'), projectId: 'be-header-parser', projectTitle: 'On paper: Request Header Parser', projectBlurb: 'Paper exercise, nothing runs here: write the route that answers { ipaddress, language, software }; nothing executes — your text is matched.', xp: 60 },
    ],
    'be-checkpoint', 'Back End checkpoint', 'Prove it: routes, validation, models, filters, headers.'),
  unit('track-py', 'Scientific Computing & Data Analysis', 'Syntax, then objects, frames, time, and formatting.', 'bg-emerald-600', '🐍', 'Course 5 · Certifications',
    [
      { lessonId: 'py-basics', lessonTitle: 'Python basics and ledgers', lessonBlurb: 'Lists, methods, refusals that return False.', ...W('py-basics-workshop', 'Paper workshop: grow a ledger', 'Paper exercise, nothing runs here: write the append, the sum and the guard; nothing executes — your text is matched.'), projectId: 'py-budget-app', projectTitle: 'On paper: Budget App', projectBlurb: 'Paper exercise, nothing runs here: write the category ledger and the spend chart; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'py-oop', lessonTitle: 'Classes and inheritance', lessonBlurb: 'Square IS-A Rectangle.', ...W('py-oop-workshop', 'Paper workshop: shape a square', 'Paper exercise, nothing runs here: write the area, the super call and the refusal; nothing executes — your text is matched.'), projectId: 'py-polygon-calculator', projectTitle: 'On paper: Polygon Area Calculator', projectBlurb: 'Paper exercise, nothing runs here: write the area, picture and containment methods; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'py-numpy-pandas', lessonTitle: 'Data frames with Pandas', lessonBlurb: 'Load, split, summarize.', ...W('py-pandas-workshop', 'Paper workshop: summarize people', 'Paper exercise, nothing runs here: write the counts, the groups and the means; nothing executes — your text is matched.'), projectId: 'py-demographic-analyzer', projectTitle: 'On paper: Demographic Data Analyzer', projectBlurb: 'Paper exercise, nothing runs here: write the race, income, occupation and country tallies; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'py-datetime-strings', lessonTitle: 'Time math and weekdays', lessonBlurb: 'AM/PM flips and day rollovers.', ...W('py-time-workshop', 'Paper workshop: roll time forward', 'Paper exercise, nothing runs here: write the definition, the format, the flip and the weekday; nothing executes — your text is matched.'), projectId: 'py-time-calculator', projectTitle: 'On paper: Time Calculator', projectBlurb: 'Paper exercise, nothing runs here: write add_time with its weekday naming; nothing executes — your text is matched.', xp: 60 },
      { lessonId: 'py-format-validation', lessonTitle: 'Formatting and input validation', lessonBlurb: 'Validate first, align second.', ...W('py-format-workshop', 'Paper workshop: stack problems', 'Paper exercise, nothing runs here: write the rjust, the join and the refusal; nothing executes — your text is matched.'), projectId: 'py-arithmetic-formatter', projectTitle: 'On paper: Arithmetic Formatter', projectBlurb: 'Paper exercise, nothing runs here: write the vertical problems and the optional answers; nothing executes — your text is matched.', xp: 60 },
    ],
    'py-checkpoint', 'Python checkpoint', 'Prove it: ledgers, classes, frames, time, format.'),
  unit('track-secml', 'Information Security & Machine Learning', 'Harden first, then learn from data.', 'bg-red-600', '🛡️', 'Course 5 · Certifications',
    [
      { lessonId: 'sec-http-helmet', lessonTitle: 'Headers and Helmet', lessonBlurb: 'Secure defaults; one person, one vote.', ...W('sec-helmet-workshop', 'Paper workshop: lock headers', 'Paper exercise, nothing runs here: write the defaults, the fetch and the relative likes; nothing executes — your text is matched.'), projectId: 'sec-stock-checker', projectTitle: 'On paper: Stock Price Checker', projectBlurb: 'Paper exercise, nothing runs here: write the Helmet-secured likes and the relative counts; nothing executes — your text is matched.', xp: 70 },
      { lessonId: 'sec-auth-passwords', lessonTitle: 'Identity and password-gated actions', lessonBlurb: 'View freely, destroy with proof.', ...W('sec-auth-workshop', 'Gate changes step by step', 'Guided: flag, match, float.'), projectId: 'sec-anon-board', projectTitle: 'On paper: Anonymous Message Board', projectBlurb: 'Paper exercise, nothing runs here: write the report flow, the password delete and the bumped feed; nothing executes — your text is matched.', xp: 70 },
      { lessonId: 'sec-crud-safety', lessonTitle: 'Hardened CRUD and audit trails', lessonBlurb: 'Filter reads; timestamp writes.', ...W('sec-crud-workshop', 'Paper workshop: audit writes', 'Paper exercise, nothing runs here: write the finder, the stamp and the AND-filters; nothing executes — your text is matched.'), projectId: 'sec-issue-tracker', projectTitle: 'On paper: Issue Tracker', projectBlurb: 'Paper exercise, nothing runs here: write the full CRUD with its filters; nothing executes — your text is matched.', xp: 70 },
      { lessonId: 'sec-ml-basics', lessonTitle: 'Learning from data with TensorFlow', lessonBlurb: 'Fit on train, believe validation.', ...W('sec-ml-workshop', 'Fit honestly step by step', 'Guided: Dense, evaluate, MAE.'), projectId: 'ml-linear-regression', projectTitle: 'On paper: Linear Regression Model', projectBlurb: 'Paper exercise, nothing runs here: write the training script and report the MAE; nothing executes — your text is matched.', xp: 70 },
      { lessonId: 'sec-nlp-classification', lessonTitle: 'Text classification for spam', lessonBlurb: 'Tokens to vectors to verdict.', ...W('sec-nlp-workshop', 'Paper workshop: vectorize words', 'Paper exercise, nothing runs here: write the padding, the sigmoid and the confusion matrix; nothing executes — your text is matched.'), projectId: 'ml-spam-classifier', projectTitle: 'On paper: Spam Text Classifier', projectBlurb: 'Paper exercise, nothing runs here: write the classifier and its held-out accuracy; nothing executes — your text is matched.', xp: 70 },
    ],
    'secml-checkpoint', 'Security & ML checkpoint', 'Prove it: headers, identity, CRUD, regression, spam.'),
];
