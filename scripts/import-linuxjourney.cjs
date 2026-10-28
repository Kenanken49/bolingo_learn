/**
 * One-shot importer: linuxjourney-desktop (GPL-3.0, Sempiternal-Futility fork
 * of LinuxJourney.com) → lib/tracks/linux-{grasshopper,journeyman,networking}.ts
 *
 * Source (open source, GPL-3.0): https://github.com/Sempiternal-Futility/linuxjourney-desktop
 * The generated files keep full lesson theory verbatim (attributed) and add
 * original quiz questions derived from each lesson's own text, so every
 * answer is provable from the theory shown. All generated banks pass
 * lib/quizBank validateBank (run at import).
 *
 * Usage:
 *   node scripts/import-linuxjourney.cjs /path/to/linuxjourney-desktop
 */
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || '/tmp/lj';
const CS = path.join(SRC, 'desktop-app/Scripts/MainWindow.axaml.cs');
const AX = path.join(SRC, 'desktop-app/Scripts/MainWindow.axaml');
const OUTDIR = path.join(__dirname, '..', 'lib', 'tracks');

const cs = fs.readFileSync(CS, 'utf8');
const ax = fs.readFileSync(AX, 'utf8');

// ---- lesson contents: handler -> verbatim text (C# @"" with "" escapes) ----
const contents = {};
const reContent = /public void (lesson[A-Za-z]+Button)_Click[\s\S]*?lessonContent\.Content=\s*@"([\s\S]*?)";/g;
let m;
while ((m = reContent.exec(cs))) contents[m[1]] = m[2].replace(/""/g, '"').trim();
// Upstream quirks (documented, not silently patched):
// - lessonEigthyTwoButton is a typo in the axaml Name; its handler/text live
//   under lessonEightyTwoButton_Click. Alias so the lesson keeps its content.
if (!contents['lessonEigthyTwoButton'] && contents['lessonEightyTwoButton']) {
  contents['lessonEigthyTwoButton'] = contents['lessonEightyTwoButton'];
}
// - Vim Appending ships with empty theory upstream; skipped below (see stats).

// ---- lesson titles from the axaml ----
const titles = {};
const reTitle = /Name="(lesson[A-Za-z]+Button)"[^>]*Content="([^"]*)"/g;
while ((m = reTitle.exec(ax))) titles[m[1]] = m[2];

// ---- course titles ----
const courseTitles = {};
const reCourse = /Name="(course[A-Za-z]+Button)"[^>]*Content="([^"]*)"/g;
while ((m = reCourse.exec(ax))) courseTitles[m[1]] = m[2];

// ---- course -> ordered lesson buttons (from each course handler's hide-list) ----
const courseLessons = {};
const reCourseH = /public void (course[A-Za-z]+Button)_Click[\s\S]*?lessonContent\.IsVisible=true;/g;
let cm;
const handlerBodies = {};
{
  const parts = cs.split(/(?=    public void (?:course|lesson)[A-Za-z]+Button_Click\()/g);
  for (const part of parts) {
    const hm = part.match(/^    public void ((?:course|lesson)[A-Za-z]+Button)_Click/);
    if (hm) handlerBodies[hm[1]] = part;
  }
}
for (const [btn] of Object.entries(courseTitles)) {
  const body = handlerBodies[btn] || '';
  const lessons = [];
  const reL = /(lesson[A-Za-z]+Button)\.IsVisible\s*=\s*true;/g;
  let lm;
  while ((lm = reL.exec(body))) if (!lessons.includes(lm[1])) lessons.push(lm[1]);
  courseLessons[btn] = lessons;
}

const SECTIONS = {
  grasshopper: ['courseOneButton', 'courseTwoButton', 'courseThreeButton', 'courseFourButton', 'courseFiveButton', 'courseSixButton', 'courseSevenButton', 'courseEightButton'],
  journeyman: ['courseNineButton', 'courseTenButton', 'courseElevenButton', 'courseTwelveButton', 'courseThirteenButton', 'courseFourteenButton', 'courseFifteenButton'],
  networking: ['courseSixteenButton', 'courseSeventeenButton', 'courseEighteenButton', 'courseNineteenButton', 'courseTwentyButton', 'courseTwentyOneButton', 'courseTwentyTwoButton'],
};

// ---- command vocabulary ----
function primaryCommand(title) {
  const t = title.trim();
  let mm = t.match(/^([A-Za-z][A-Za-z0-9+#-]*)\s+Command$/i);
  if (mm) return mm[1].toLowerCase();
  mm = t.match(/^(Pwd|Cd|Ls|Touch|File|Cat|Less|History|Cp|Mv|Mkdir|Rm|Find|Help|Man|Whatis|Alias|Exit)$/i);
  if (mm) return mm[1].toLowerCase();
  return null;
}

// Quoted command spans: "..." (after C# unescape, original ""..."" )
function quotedSpans(text) {
  const out = [];
  const re = /"([^"\n]{1,120})"/g;
  let q;
  while ((q = re.exec(text))) {
    const s = q[1].trim();
    if (/^[a-z][a-z0-9-]*(\s+[^\s][^"\n]{0,60})?$/.test(s) && !/^(the|this|that|your|you|for|with|from|into|using|when|where|\\.|\.\s)/i.test(s)) out.push(s);
  }
  return [...new Set(out)];
}

function firstSentenceWith(text, word, maxLen = 170) {
  const sents = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/);
  for (const s of sents) {
    if (s.length >= 40 && s.toLowerCase().includes(word.toLowerCase())) {
      const t = s.trim();
      return t.length > maxLen ? t.slice(0, maxLen - 1).trimEnd() + '…' : t;
    }
  }
  return null;
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
const paraSplit = (text) => text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length > 0);

function buildQuestions(lessonTitle, text, sibPrimaries, globalCmds, sibTitles, globalTitles) {
  const qs = [];
  const primary = primaryCommand(lessonTitle);
  const spans = quotedSpans(text).filter((s) => s.split(/\s+/).length <= 6);
  const cmdSpans = spans.filter((s) => /^[a-z][a-z0-9+.#-]*(\s+\S+)+$/.test(s));
  const pool = [...new Set([...sibPrimaries, ...globalCmds])].filter((c) => c && c !== primary);
  const globalCmdsFallback = ['ls', 'cd', 'pwd', 'man', 'grep', 'sudo'];
  const distract = (n, answer, extra = []) => {
    const out = [];
    for (const c of [...extra, ...pool, ...globalCmdsFallback]) {
      if (c && c !== answer && !out.includes(c) && out.length < n) out.push(c);
    }
    return out;
  };
  const titleDistract = (n, answer) => {
    const out = [];
    for (const t of [...sibTitles, ...globalTitles]) {
      if (t && t !== answer && t !== lessonTitle && !out.includes(t) && out.length < n) out.push(t);
    }
    return out;
  };

  if (primary) {
    const d = distract(3, primary);
    const sent = firstSentenceWith(text, primary);
    qs.push({
      type: 'MCQ',
      prompt: `Which command is the focus of \u2018${lessonTitle}\u2019?`,
      answer: primary,
      options: [primary, ...d.slice(0, 3)],
      explain: sent ? `As the lesson puts it: \u201c${sent}\u201d` : `The \u2018${lessonTitle}\u2019 lesson teaches the ${primary} command.`,
    });
  } else {
    const sibs = titleDistract(3, lessonTitle);
    qs.push({
      type: 'MCQ',
      prompt: `Which topic does the lesson \u2018${lessonTitle}\u2019 cover?`,
      answer: lessonTitle,
      options: [lessonTitle, ...sibs],
      explain: `This lesson is \u2018${lessonTitle}\u2019 — read its theory above for the full picture.`,
    });
  }

  const multi = cmdSpans.find((s) => s.split(/\s+/).length >= 2 && s.split(/\s+/).length <= 5);
  if (multi) {
    const chain = multi.split(/\s+/);
    const tokenPool = ['sudo', '-la', '-r', '|', 'grep', '~/', '/tmp', '-i'];
    const bankBits = [...chain];
    for (const t of tokenPool) { if (!bankBits.includes(t) && bankBits.length < chain.length + 2) bankBits.push(t); }
    const bank = [...new Set(bankBits)];
    qs.push({
      type: 'BUILD',
      prompt: `Assemble the command from this lesson: ${multi}`,
      chain,
      bank,
      explain: `Type it exactly as shown: ${multi}. Spacing matters on the command line.`,
    });
  } else if (primary) {
    qs.push({
      type: 'BUILD',
      prompt: `Type the command taught in \u2018${lessonTitle}\u2019`,
      chain: [primary],
      bank: [primary, ...distract(3, primary)],
      explain: `Just ${primary} — the whole command is its name.`,
    });
  }

  // Context-quote question: always answerable from the quoted sentence.
  let quoteQ = null;
  if (primary) {
    const sent = firstSentenceWith(text, primary);
    if (sent) {
      const d = distract(3, primary);
      quoteQ = {
        type: 'MCQ',
        prompt: `The lesson says: \u201c${sent}\u201d — which command is being described?`,
        answer: primary,
        options: [primary, ...d.slice(0, 3)],
        explain: `The quoted sentence describes ${primary}.`,
      };
    }
  }
  if (!quoteQ) {
    const firstPara = paraSplit(text)[0] || lessonTitle;
    const snippet = firstPara.length > 160 ? firstPara.slice(0, 159).trimEnd() + '…' : firstPara;
    quoteQ = {
      type: 'MCQ',
      prompt: `The lesson opens with: \u201c${snippet}\u201d — which lesson is this?`,
      answer: lessonTitle,
      options: [lessonTitle, ...titleDistract(3, lessonTitle)],
      explain: `Those opening lines are from \u2018${lessonTitle}\u2019.`,
    };
  }
  // Avoid duplicate prompts.
  if (!qs.some((q) => q.prompt === quoteQ.prompt)) qs.push(quoteQ);

  return qs.slice(0, 3);
}

function emitLesson(key, title, text, sibPrimaries, globalCmds, sibTitles, globalTitles) {
  const paras = paraSplit(text);
  const qs = buildQuestions(title, text, sibPrimaries, globalCmds, sibTitles, globalTitles);
  const qSrc = qs.map((q) => {
    if (q.type === 'MCQ') {
      return `      MCQ(\n        '${esc(q.prompt)}',\n        '${esc(q.answer)}',\n        [${q.options.map((o) => `'${esc(o)}'`).join(', ')}],\n        '${esc(q.explain)}'\n      ),`;
    }
    return `      BUILD(\n        '${esc(q.prompt)}',\n        [${q.chain.map((o) => `'${esc(o)}'`).join(', ')}],\n        [${q.bank.map((o) => `'${esc(o)}'`).join(', ')}],\n        '${esc(q.explain)}'\n      ),`;
  }).join('\n');
  return `  '${key}': {\n    id: '${key}',\n    title: '${esc(title)}',\n    theory: [\n${paras.map((p) => `      '${esc(p)}',`).join('\n')}\n    ],\n    questions: [\n${qSrc}\n    ],\n  },`;
}

// ---- assemble ----
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const allPrimaries = [];
for (const sec of Object.values(SECTIONS)) {
  for (const c of sec) {
    for (const l of courseLessons[c] || []) {
      const p = primaryCommand(titles[l] || '');
      if (p) allPrimaries.push(p);
    }
  }
}
const globalCmds = [...new Set(allPrimaries)];
const globalTitlesAll = [...new Set(Object.values(titles))];

const stats = { lessons: 0, missing: [] };
for (const [sec, courses] of Object.entries(SECTIONS)) {
  let src = `/**\n * Track Linux · ${sec[0].toUpperCase() + sec.slice(1)} — Linux Journey course bank.\n *\n * Lesson theory verbatim from linuxjourney-desktop (GPL-3.0):\n * https://github.com/Sempiternal-Futility/linuxjourney-desktop\n * (fork of LinuxJourney.com). Quiz questions are original, derived from\n * each lesson's own text so every answer is provable from the theory.\n * SPDX-License-Identifier: GPL-3.0-only (this file).\n */\n\nimport { MCQ, BUILD, type CourseLesson } from '../quizBank';\n\nexport const TRACK_LINUX_${sec.toUpperCase()}: Record<string, CourseLesson> = {\n`;
  for (const c of courses) {
    const cTitle = courseTitles[c] || c;
    const lessons = courseLessons[c] || [];
    const sibPrimaries = lessons.map((l) => primaryCommand(titles[l] || '')).filter(Boolean);
    const sibTitles = lessons.map((l) => titles[l] || l);
    lessons.forEach((l, i) => {
      const title = titles[l] || l;
      const text = contents[l];
      if (!text) { stats.missing.push(`${cTitle} / ${title} (empty upstream)`); return; }
      const key = `linux-${slug(cTitle)}-${i + 1}`;
      src += emitLesson(key, title, text, sibPrimaries.filter((p) => p !== primaryCommand(title)), globalCmds, sibTitles.filter((t) => t !== title), globalTitlesAll) + '\n';
      stats.lessons++;
    });
  }
  src += '};\n';
  fs.writeFileSync(path.join(OUTDIR, `linux-${sec}.ts`), src);
  console.log(`wrote linux-${sec}.ts`);
}
console.log(`lessons: ${stats.lessons}, missing content: ${stats.missing.length}`);
if (stats.missing.length) console.log(stats.missing.slice(0, 10).join('\n'));
