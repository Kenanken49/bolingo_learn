#!/usr/bin/env node
/**
 * LabEx Open Labs importer.
 *
 * Source: a local clone of https://github.com/labex-labs/open-source-labs
 * (the archived community lab corpus). Every lab ships an index.json that
 * declares its title, difficulty, steps and — critically — the upstream
 * open-source license. The repository's own LICENSE delegates per-lab terms
 * to that file: "The index.json file shows the source and open-source license
 * of the corresponding challenge. The adapted challenge still uses the
 * original open-source license."
 *
 * Policy enforced here:
 *   - import only licenses that permit redistribution with attribution:
 *     CC-BY-4.0, CC-BY-3.0, MIT, BSD-3-Clause, Apache-2.0;
 *   - skip share-alike (CC-BY-SA-*) labs — our adapted lessons would inherit
 *     the SA term, which conflicts with the product license;
 *   - skip labs with no license, and Pro-gated labs (fee_type: pro);
 *   - skip titles that already exist in the app's own banks, or that repeat
 *     another lab in the corpus;
 *   - keep an attribution line in every lesson (repo · contributors ·
 *     license) plus a per-category source list.
 *
 * Content is distilled, not copied wholesale: the theory is a short plain-text
 * brief, and every question is original and provable from the lab's own text
 * or code. Markdown fences, HTML wrappers and VM-only instructions are
 * stripped because the app has no LabEx VM.
 *
 * Output layout (all generated):
 *   lib/labex/index.ts          categories + lean per-lab metadata (eager)
 *   lib/labex/lessons/<cat>.ts  full question banks (lazy per category)
 *   lib/labex/load.ts           async lesson resolver used by the quiz route
 *
 * Usage:
 *   node scripts/import-labex.cjs "C:/Users/ADMIN/open-source-labs"
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const SRC = process.argv[2] || path.join(process.env.USERPROFILE || '', 'open-source-labs');
const OUT = path.join(__dirname, '..', 'lib', 'labex');
const GUIDED_OUT = path.join(OUT, 'guided');

const ALLOWED = new Set(['CC-BY-4.0', 'CC-BY-3.0', 'MIT', 'BSD 3-Clause', 'Apache-2.0']);
const CATEGORY_META = {
  css: { title: 'CSS', blurb: 'Layout, animation and visual polish labs.' },
  django: { title: 'Django', blurb: 'Python web apps with Django.' },
  docker: { title: 'Docker', blurb: 'Containers, images and compose labs.' },
  flask: { title: 'Flask', blurb: 'Python web apps with Flask.' },
  git: { title: 'Git', blurb: 'Version control labs, one scenario at a time.' },
  go: { title: 'Go', blurb: 'Go syntax, packages and concurrency.' },
  javascript: { title: 'JavaScript', blurb: 'Snippets, DOM work and JS fundamentals.' },
  jquery: { title: 'jQuery', blurb: 'DOM scripting with jQuery.' },
  matplotlib: { title: 'Matplotlib', blurb: 'Official plotting examples and tutorials.' },
  numpy: { title: 'NumPy', blurb: 'Array computing foundations.' },
  pandas: { title: 'Pandas', blurb: 'Dataframes for real datasets.' },
  python: { title: 'Python', blurb: 'Python fundamentals and recipe-sized challenges.' },
  react: { title: 'React', blurb: 'Components, hooks and UI patterns.' },
  rust: { title: 'Rust', blurb: 'Ownership, types and Rust by example.' },
  sklearn: { title: 'scikit-learn', blurb: 'Classic machine-learning workflows.' },
};
const CATEGORIES = Object.keys(CATEGORY_META);

/* ---------------- app banks (for dedupe) ---------------- */

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

const normTitle = (s) =>
  String(s)
    .toLowerCase()
    .replace(/\s*[|·]\s*(challenge|guided lab|lab)\s*$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(challenge|guided lab|lab)\b/g, ' ')
    .trim();

const appTitles = new Set();
try {
  const { COURSES } = require(path.join(__dirname, '..', 'lib', 'courses.ts'));
  for (const lesson of Object.values(COURSES)) appTitles.add(normTitle(lesson.title));
} catch (error) {
  console.warn(`app-title dedupe unavailable: ${error.message}`);
}

/* ---------------- generic helpers ---------------- */

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 44) || 'lab';

const esc = (s) =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const collapse = (s) => s.replace(/\s+/g, ' ').trim();
const cleanInline = (s) =>
  collapse(String(s).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/`/g, '').trim());

function stripMd(text) {
  return cleanInline(
    text
      // HTML wrappers used by LabEx (guided-lab footer, images, badges).
      .replace(/<div[\s\S]*?<\/div>/gi, ' ')
      // Keep element names (`<span>`) so markup lessons stay readable.
      .replace(/<\/?([a-z][a-z0-9-]*)[^>]*>/gi, ' <$1> ')
      // Images and badges.
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      // Markdown links keep the label.
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Code fences vanish; their contents are handled separately.
      .replace(/```[\s\S]*?```/g, ' ')
      // Heading markers, emphasis and blockquote arrows. Underscores stay:
      // identifiers like add_days must survive into the theory.
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/[*>`]+/g, '')
      // Inline code keeps its text.
      .replace(/`([^`]+)`/g, '$1')
  );
}

/** Sentences that only make sense inside LabEx's VM. */
const VM_NOISE =
  /(go live|web 8080|\bvm\b|virtual machine|ssh|terminal|port 8080|refresh the|click|desktop|environment|jupyter|notebook tab|vm startup)/i;

const BOILERPLATE =
  /^(congratulations|welcome to|you have completed|this lab is a part of|in this lab, you learned|you have successfully)/i;

function cleanParagraphs(md) {
  if (!md) return [];
  return md
    .replace(/```[\s\S]*?```/g, '\n\n')
    .split(/\n\s*\n/)
    .map((p) => stripMd(p))
    .filter(
      (p) =>
        p.length >= 40 &&
        !VM_NOISE.test(p) &&
        !BOILERPLATE.test(p) &&
        !/^(introduction|summary|tasks?|problem|example|solution|setup|context)$/i.test(p)
    );
}

function codeBlocks(md) {
  const out = [];
  const re = /```([a-zA-Z0-9+#-]*)\r?\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md))) {
    const lang = (m[1] || '').toLowerCase();
    const body = m[2].replace(/\r/g, '').trim();
    if (body) out.push({ lang, body });
  }
  return out;
}

const KEYWORDS = new Set(
  ('const let var function return if else for while class import from export default new true false null ' +
    'undefined async await try catch this of in do switch case break continue typeof instanceof void yield ' +
    'super extends static public private readonly interface type enum struct impl fn pub mut use mod match ' +
    'loop range where self crate').split(/\s+/)
);

const SHELL =
  /^(git|docker|npm|npx|pip|python3?|node|cd|mkdir|touch|echo|ls|cat|curl|wget|go|rustc|cargo|flask|source|export|apt|sudo|chmod|chown|mv|cp|rm|grep|sed|awk|make|yarn|pnpm)\b/;

function shellLines(md) {
  const lines = [];
  for (const block of codeBlocks(md)) {
    if (!['sh', 'bash', 'shell', 'console', 'terminal', 'zsh', ''].includes(block.lang)) continue;
    for (const raw of block.body.split('\n')) {
      const line = raw.replace(/^\s*[$#>]\s*/, '').trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;
      if (!SHELL.test(line)) continue;
      const tokens = line.split(/\s+/);
      if (tokens.length >= 2 && tokens.length <= 7 && line.length <= 70) lines.push(line);
    }
  }
  return [...new Set(lines)];
}

function uniqueBy(list, key) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function examples(md) {
  const out = [];
  for (const block of codeBlocks(md)) {
    const lines = block.body.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      const explicit = line.match(
        /^(.{4,90}?)\s*(?:#|\/\/)\s*(?:returns?|prints?|outputs?|produces?|→|->)\s*:?\s*(.{1,70})$/i
      );
      if (explicit) {
        out.push({ call: explicit[1].trim(), expected: cleanInline(explicit[2]) });
        continue;
      }
      const standalone = line.match(/^(?:#|\/\/)\s*(\S.{0,50})$/);
      if (standalone && i > 0) {
        const prev = lines[i - 1].trim();
        const value = standalone[1].trim();
        const valueish =
          /^[\[\]{}'"(-]/.test(value) ||
          /^(None|True|False|true|false|null|undefined)\b/.test(value) ||
          /\d/.test(value);
        if (prev && /[)\]]\s*;?$/.test(prev) && valueish && value.length <= 50) {
          out.push({ call: prev, expected: cleanInline(value) });
        }
      }
    }
  }
  return uniqueBy(
    out.filter(
      (e) =>
        e.call.length >= 4 &&
        e.expected.length >= 1 &&
        e.expected.length <= 60 &&
        !/^(output|example|returns?|prints?)$/i.test(e.expected) &&
        !VM_NOISE.test(e.call)
    ),
    (e) => `${e.call}→${e.expected}`
  );
}

function defs(md) {
  const names = [];
  for (const block of codeBlocks(md)) {
    const re = /(?:^|\n)\s*(?:def|function|fn|func|class)\s+([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = re.exec(block.body))) {
      const name = m[1];
      if (name.length >= 3 && !KEYWORDS.has(name) && name !== 'main') names.push(name);
    }
  }
  return [...new Set(names)];
}

const BUILTIN_MODULES =
  /^(os|sys|re|json|math|random|time|datetime|collections|itertools|functools|pathlib|typing|subprocess|io|shutil|glob|unittest|string|copy|uuid|base64|hashlib|logging|argparse)$/;

function imports(md) {
  const found = [];
  for (const block of codeBlocks(md)) {
    for (const raw of block.body.split('\n')) {
      const line = raw.trim();
      let m;
      if ((m = line.match(/^from\s+([A-Za-z_][\w.]*)\s+import\s+/))) found.push(m[1]);
      else if ((m = line.match(/^import\s+([A-Za-z_][\w.]*)/))) found.push(m[1]);
      else if ((m = line.match(/^import\s+[\w{},*\s]+\s+from\s+['"]([^'"]+)['"]/))) found.push(m[1]);
      else if ((m = line.match(/require\(\s*['"]([^'"]+)['"]\s*\)/))) found.push(m[1]);
      else if ((m = line.match(/^use\s+([A-Za-z_][\w:]*)/))) found.push(m[1].replace(/::/g, '.'));
    }
  }
  return [...new Set(found.map((s) => s.trim()).filter((s) => s && !s.startsWith('.')))].sort(
    (a, b) => Number(BUILTIN_MODULES.test(a)) - Number(BUILTIN_MODULES.test(b))
  );
}

function events(md) {
  const out = [];
  const re = /addEventListener\(\s*['"]([a-z][a-z-]{2,24})['"]/gi;
  let m;
  while ((m = re.exec(md))) out.push(m[1]);
  return [...new Set(out)];
}

const CSS_PROP =
  /^(display|position|top|right|bottom|left|float|clear|overflow|clip|visibility|opacity|z-index|width|height|min-|max-|margin|padding|border|border-radius|background|color|font|text-|line-height|letter-spacing|word-spacing|white-space|vertical-align|content|quotes|counter|cursor|direction|list-style|table-layout|border-collapse|border-spacing|empty-cells|caption-side|outline|box-shadow|box-sizing|flex|flex-|grid|grid-|gap|align-|justify-|place-|order|transform|transform-origin|perspective|backface-visibility|transition|animation|animation-|filter|object-fit|object-position|clip-path|columns|column-|break-|resize|user-select|pointer-events|fill|stroke|stop-color|mix-blend-mode|aspect-ratio)[a-z-]*$/;

function cssProps(md) {
  const out = [];
  for (const block of codeBlocks(md)) {
    if (block.lang && block.lang !== 'css' && block.lang !== 'scss' && block.lang !== 'html') continue;
    for (const raw of block.body.split('\n')) {
      const m = raw.match(/^\s*([a-z][a-z-]{2,30})\s*:\s*[^;{}]+;/);
      if (m && CSS_PROP.test(m[1])) out.push(m[1]);
    }
  }
  return uniqueBy(out, (p) => p);
}

function htmlTags(md) {
  const out = [];
  for (const block of codeBlocks(md)) {
    if (block.lang && block.lang !== 'html' && block.lang !== 'jsx' && block.lang !== 'tsx' && block.lang !== 'vue') {
      continue;
    }
    const re = /<([a-z][a-z0-9-]*)\b/gi;
    let m;
    while ((m = re.exec(block.body))) {
      const tag = m[1].toLowerCase();
      if (['html', 'head', 'body', 'meta', 'link', 'script', 'title', 'style'].includes(tag)) continue;
      out.push(tag);
    }
  }
  return uniqueBy(out, (t) => t);
}

function apis(md) {
  const out = [];
  for (const block of codeBlocks(md)) {
    let m;
    const call = /\b([A-Za-z_$][\w$]{2,})\.([A-Za-z_$][\w$]{2,})\s*\(/g;
    while ((m = call.exec(block.body))) {
      const method = m[2];
      if (KEYWORDS.has(method)) continue;
      out.push(method);
    }
    const ctor = /\bnew\s+([A-Z][A-Za-z0-9_]{2,})\s*\(/g;
    while ((m = ctor.exec(block.body))) out.push(m[1]);
  }
  return [...new Set(out)].sort((a, b) => b.length - a.length);
}

function bullets(md) {
  const out = [];
  for (const line of md.replace(/```[\s\S]*?```/g, '\n').split('\n')) {
    const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/);
    if (!m) continue;
    const text = stripMd(m[1]);
    if (text.length >= 30 && text.length <= 90 && !VM_NOISE.test(text) && !BOILERPLATE.test(text)) {
      out.push(text);
    }
  }
  return [...new Set(out)];
}

/** Backticked terms from the prose: the APIs and concepts the brief teaches. */
function mentions(md) {
  const out = [];
  const re = /`([^`\n]{3,40})`/g;
  let m;
  while ((m = re.exec(md))) {
    const token = cleanInline(m[1]);
    if (token.length < 3 || token.length > 40) continue;
    if (VM_NOISE.test(token)) continue;
    if (/^(index|style|readme|package)\.(html|css|md|json|js)$/i.test(token)) continue;
    if (/^https?:/i.test(token)) continue;
    // Bare kebab-case tokens are directory/branch names, not concepts.
    if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(token)) continue;
    // A term starts with a word/code character and stays short.
    if (!/^[\w.<#>(-]/.test(token)) continue;
    if (token.split(/\s+/).length > 4) continue;
    out.push(token);
  }
  return uniqueBy(
    out.filter((t) => /[().\-_:=/\[\]$]/.test(t) || /[A-Z]/.test(t) || /^[a-z]{3,}$/.test(t)),
    (t) => t.toLowerCase()
  ).sort((a, b) => Number(!/[()]/.test(a)) - Number(!/[()]/.test(b)));
}

function keywordsOf(meta) {
  const raw = meta.meta && typeof meta.meta.keywords === 'string' ? meta.meta.keywords : '';
  return uniqueBy(
    raw
      .split(',')
      .map((s) => cleanInline(s))
      .filter((s) => s.length >= 3 && s.length <= 30),
    (s) => s.toLowerCase()
  );
}

/* ---------------- theory ---------------- */

function buildTheory(lab) {
  const kept = [];
  const seen = new Set();
  const push = (text) => {
    const p = cleanInline(text);
    if (p.length < 40) return;
    const key = p.toLowerCase().slice(0, 60);
    if (seen.has(key)) return;
    seen.add(key);
    kept.push(p);
  };
  push(lab.description);
  for (const p of cleanParagraphs(lab.introMd).slice(0, 2)) push(p);
  for (const p of cleanParagraphs(lab.finishMd).slice(0, 1)) push(p);
  for (const step of lab.stepMds.slice(0, 3)) {
    const p = cleanParagraphs(step)[0];
    if (p) push(p);
    if (kept.join(' ').length >= 760) break;
  }
  if (lab.commands.length > 0) {
    push(`Try the command${lab.commands.length > 1 ? 's' : ''}: ${lab.commands.slice(0, 2).map((c) => `\`${c}\``).join(' then ')}.`);
  }
  let theory = kept.join(' ');
  if (!theory) theory = `${lab.title} — a hands-on lab distilled into a short brief.`;
  if (theory.length > 900) theory = theory.slice(0, 899).replace(/\s+\S*$/, '') + '…';
  return theory;
}

/* ---------------- offline JS / CSS sandbox exercises ---------------- */

const escapeRe = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sandboxStats = { js: {}, css: {} };
const dropSandbox = (kind, reason) => {
  sandboxStats[kind][reason] = (sandboxStats[kind][reason] || 0) + 1;
  return null;
};

function blocksOf(lab) {
  const out = [];
  for (const step of lab.stepDefs || []) {
    for (const block of codeBlocks(step.md)) {
      const lang = (block.lang || '').toLowerCase();
      const body = block.body;
      if (body) out.push({ lang, body });
    }
  }
  return out;
}

/** A comment value is safe to replay only when it is a pure literal. */
function parseExpected(raw) {
  let text = cleanInline(String(raw || ''));
  text = text
    .replace(/^(?:returns?|prints?|outputs?|produces?|results? in|=>|->)\s*:?\s*/i, '')
    .replace(/;\s*$/, '')
    .trim();
  if (!text || text.length > 200) return null;

  // Validate structurally rather than with a text heuristic so object and
  // nested-array expectations (`{ a: 'a' }`) survive while calls, variables
  // and computed keys stay out.
  const sf = ts.createSourceFile('expected.js', `(${text})`, ts.ScriptTarget.ES2022, true);
  const statement = sf.statements[0];
  if (!statement || !ts.isExpressionStatement(statement)) return null;
  const isLiteral = (node) => {
    if (!node) return false;
    if (ts.isParenthesizedExpression(node)) return isLiteral(node.expression);
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true;
    if (ts.isIdentifier(node)) return ['undefined', 'NaN', 'Infinity'].includes(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return true;
    if (node.kind === ts.SyntaxKind.NullKeyword) return true;
    if (ts.isPrefixUnaryExpression(node)) {
      return (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken) && isLiteral(node.operand);
    }
    if (ts.isArrayLiteralExpression(node)) return node.elements.every((element) => !ts.isSpreadElement(element) && isLiteral(element));
    if (ts.isObjectLiteralExpression(node)) {
      return node.properties.every((property) => {
        if (!ts.isPropertyAssignment(property)) return false;
        const name = property.name;
        const staticName = ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name);
        return staticName && isLiteral(property.initializer);
      });
    }
    return false;
  };
  if (!isLiteral(statement.expression)) return null;

  try {
    const value = vm.runInNewContext(`(${text})`, Object.create(null), { timeout: 200 });
    if (typeof value === 'function') return null;
    if (typeof value === 'object' && value !== null) {
      if (Object.prototype.toString.call(value) !== '[object Array]' && Object.prototype.toString.call(value) !== '[object Object]') {
        return null;
      }
      JSON.stringify(value);
    }
    return { text, value };
  } catch {
    return null;
  }
}

function runJs(code, expressions) {
  const context = vm.createContext({ console: { log() {}, warn() {}, error() {} } });
  vm.runInContext(code, context, { timeout: 1200 });
  return expressions.map((expression) =>
    vm.runInContext(`(${expression})`, context, { timeout: 1200 })
  );
}

function jsTestExpression(call, expected) {
  if (expected.value === undefined) return `typeof (${call}) === 'undefined'`;
  if (typeof expected.value === 'number' && Number.isNaN(expected.value)) return `Number.isNaN(${call})`;
  return `JSON.stringify(${call}) === ${JSON.stringify(JSON.stringify(expected.value))}`;
}

/** A same-shaped call with one literal argument changed, for labs that print a single example. */
function literalVariant(node, sf) {
  if (ts.isNumericLiteral(node)) {
    const n = Number(node.getText(sf));
    return Number.isFinite(n) ? String(n === 0 ? 7 : n + 1) : null;
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (!/^[\x20-\x7e]*$/.test(node.text) || node.text.length > 40) return null;
    return JSON.stringify(node.text.length ? `${node.text}x` : 'sample');
  }
  if (ts.isArrayLiteralExpression(node)) {
    const elements = node.elements;
    if (elements.length === 0) return '[1, 2, 3]';
    if (elements.every((e) => ts.isNumericLiteral(e))) {
      const nums = elements.map((e) => Number(e.getText(sf)));
      return `[${nums.join(', ')}, ${Math.max(...nums) + 1}]`;
    }
    if (elements.every((e) => ts.isStringLiteral(e))) {
      return `[${elements.map((e) => e.getText(sf)).join(', ')}, "extra"]`;
    }
    return null;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return 'false';
  if (node.kind === ts.SyntaxKind.FalseKeyword) return 'true';
  return null;
}

function variantCalls(call, name) {
  const sf = ts.createSourceFile('variant.js', `(${call})`, ts.ScriptTarget.ES2022, true);
  let target = null;
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      target = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!target || !target.arguments.length) return [];
  const variants = [];
  for (let i = 0; i < target.arguments.length && variants.length < 2; i += 1) {
    const arg = target.arguments[i];
    const alt = literalVariant(arg, sf);
    if (!alt) continue;
    const start = arg.getStart(sf) - 1;
    const end = arg.getEnd() - 1;
    variants.push(call.slice(0, start) + alt + call.slice(end));
  }
  return variants;
}

function buildJsExercise(lab) {
  const blocks = blocksOf(lab).filter(
    (block) => !block.lang || ['js', 'javascript', 'mjs', 'node'].includes(block.lang)
  );
  if (blocks.length === 0) return dropSandbox('js', 'no-javascript');
  const normalized = blocks.map((block) => ({
    ...block,
    body: block.body.replace(/^export\s+(?=(?:const|let|var|function|class)\b)/gm, ''),
  }));
  let def = null;
  for (const block of normalized) {
    const patterns = [
      /(?:^|\n)\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/,
      /(?:^|\n)\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?([A-Za-z_$][\w$]*)\s*=>/,
      /(?:^|\n)\s*function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/,
    ];
    for (const pattern of patterns) {
      const match = block.body.match(pattern);
      if (match) {
        def = { name: match[1], params: match[2] || '', reference: block.body };
        break;
      }
    }
    if (def) break;
  }
  if (!def) return dropSandbox('js', 'no-function');
  if (/\b(import|require|document|window|localStorage|sessionStorage|navigator)\b/.test(def.reference)) {
    return dropSandbox('js', 'needs-browser-or-modules');
  }

  const calls = [];
  const seen = new Set();
  const consider = (call, expectedRaw) => {
    const cleanCall = String(call || '').replace(/;\s*$/, '').trim();
    if (!cleanCall.startsWith(`${def.name}(`)) return;
    if (/\b(document|window|localStorage|sessionStorage|navigator)\b/.test(cleanCall)) return;
    if (seen.has(cleanCall)) return;
    const expected = parseExpected(expectedRaw);
    if (!expected) return;
    seen.add(cleanCall);
    calls.push({ call: cleanCall, expected });
  };

  for (const block of normalized) {
    // Parse the block so multi-line calls (long argument lists, nested
    // `console.log(fn(...))`) still become runnable tests.
    const sf = ts.createSourceFile('example.js', block.body, ts.ScriptTarget.ES2022, true);
    const findCall = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === def.name) return node;
      let found = null;
      ts.forEachChild(node, (child) => {
        if (!found) found = findCall(child);
      });
      return found;
    };
    const visit = (node) => {
      if (ts.isExpressionStatement(node)) {
        const call = findCall(node.expression);
        if (call && call.getText(sf).startsWith(`${def.name}(`)) {
          const rest = block.body.slice(call.getEnd());
          let expectedRaw = '';
          const inline = rest.split('\n')[0].match(/\/\/\s*(.*)$/);
          if (inline) {
            expectedRaw = inline[1];
          } else {
            const next = rest.split('\n').slice(1).find((line) => line.trim());
            if (next && /^\s*\/\//.test(next)) expectedRaw = next.replace(/^\s*\/\/\s*/, '');
          }
          consider(call.getText(sf), expectedRaw);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  for (const example of lab.examples || []) {
    const at = String(example.call).indexOf(`${def.name}(`);
    if (at === -1) continue;
    const call = String(example.call).slice(at).replace(/;\s*$/, '');
    consider(call, example.expected);
  }

  if (calls.length < 2) {
    // Many corpus labs print a single worked example. Keep the exercise
    // runnable by varying one literal argument of that example and deriving
    // the expectation from the documented implementation — twice, so a
    // nondeterministic reference never becomes a test.
    if (calls.length === 0) {
      if (process.env.LABEX_SANDBOX_STATS) {
        (global.__jsNoExample ||= []).push(lab.folder);
        if (global.__jsNoExample.length <= 5) console.log('no-example lab:', lab.folder, lab.title);
      }
      return dropSandbox('js', 'no-example');
    }
    for (const variant of variantCalls(calls[0].call, def.name)) {
      if (calls.length >= 3) break;
      if (/\b(document|window|localStorage|sessionStorage|navigator)\b/.test(variant)) continue;
      let first;
      let second;
      try {
        [first, second] = runJs(def.reference, [`(${variant})`, `(${variant})`]);
      } catch {
        continue;
      }
      if (first === undefined || typeof first === 'function') continue;
      if (JSON.stringify(first) !== JSON.stringify(second)) continue;
      if (typeof first === 'number' && Number.isNaN(first)) {
        calls.push({ call: variant, expected: { text: 'NaN', value: NaN }, synthesized: true });
        continue;
      }
      let value;
      try {
        value = JSON.parse(JSON.stringify(first));
      } catch {
        continue;
      }
      calls.push({ call: variant, expected: { text: JSON.stringify(value), value }, synthesized: true });
    }
  }
  if (calls.length < 2) return dropSandbox('js', 'one-example');
  const tests = calls.slice(0, 4).map((item, index) => ({
    id: `t${index + 1}`,
    label: `Example ${index + 1}: ${item.call.length > 52 ? `${item.call.slice(0, 49)}…` : item.call}`,
    run: jsTestExpression(item.call, item.expected),
  }));

  let outcomes = null;
  try {
    outcomes = runJs(def.reference, tests.map((test) => test.run));
  } catch {
    return dropSandbox('js', 'reference-throws');
  }
  if (!outcomes.every(Boolean)) return dropSandbox('js', 'reference-fails');

  const hint = (lab.stepDefs || [])
    .flatMap((step) => guidedParagraphs(step.md, 2))
    .join(' ')
    .replace(/\s+/g, ' ')
    .slice(0, 700)
    .replace(/\*\//g, '* /');
  const starter = `/**\n * ${hint}\n * Implement ${def.name}(), then run the tests.\n */\nfunction ${def.name}(${def.params}) {\n  // TODO: implement ${def.name}\n}\n`;
  try {
    const starterOutcomes = runJs(starter, tests.map((test) => test.run));
    if (starterOutcomes.every(Boolean)) return dropSandbox('js', 'starter-passes');
  } catch {
    return dropSandbox('js', 'starter-throws');
  }

  const synthesized = calls.some((item) => item.synthesized);
  return {
    prompt: `Implement ${def.name}() so the lab’s own examples pass`,
    explain: synthesized
      ? 'The tests replay the lab’s worked example plus extra inputs checked against the documented implementation, inside an offline sandbox — no network, no hidden string matching.'
      : 'The tests replay the examples printed in the licensed lab, inside an offline sandbox — no network, no hidden string matching.',
    exercise: { language: 'js', starter, tests },
    solution: truncateBlock(def.reference, 5000),
  };
}

function fixtureHtmlOf(html) {
  const cleaned = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\ssrcset\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(
      /\ssrc\s*=\s*(?:"[^"]*"|'[^']*')/gi,
      ' src="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22120%22%20height=%2280%22%3E%3C/svg%3E"'
    )
    .replace(/\shref\s*=\s*(?:"[^"]*"|'[^']*')/gi, ' href="#"')
    .trim();
  return truncateBlock(cleaned, 3200) || '<div class="demo">Demo</div>';
}

function buildCssExercise(lab) {
  const blocks = blocksOf(lab);
  const cssBlocks = blocks.filter((block) => block.lang === 'css' || block.lang === 'scss' || block.lang === 'sass');
  if (cssBlocks.length === 0) return dropSandbox('css', 'no-css');
  const reference = truncateBlock(cssBlocks.map((block) => block.body).join('\n\n'), 6000);
  const htmlBlock = blocks.find((block) => block.lang === 'html' || (block.lang === '' && /<[a-z][\s\S]*>/i.test(block.body)));
  const fixture = fixtureHtmlOf(htmlBlock ? htmlBlock.body : '');

  const props = [];
  const seenProps = new Set();
  for (const match of reference.matchAll(/(?:^|[;{]\s*)([a-z][a-z-]{2,30})\s*:/gm)) {
    const prop = match[1].toLowerCase();
    if (seenProps.has(prop)) continue;
    seenProps.add(prop);
    props.push(prop);
  }
  const picked = props.slice(0, 5);
  if (picked.length < 2) return dropSandbox('css', 'too-few-properties');

  const tests = picked.map((prop, index) => {
    const quoted = JSON.stringify(prop);
    return {
      id: `c${index + 1}`,
      label: `Uses the ${prop} property`,
      pattern: `${escapeRe(prop)}\\s*:`,
      run:
        `(function(){function ok(rule){try{if(rule.style&&rule.style.getPropertyValue(${quoted})!=='')return true;` +
        `if(rule.cssRules)return Array.prototype.some.call(rule.cssRules,ok);}catch(e){}return false;}` +
        `return Array.prototype.some.call(document.styleSheets,function(sheet){try{return Array.prototype.some.call(sheet.cssRules,ok);}catch(e){return false;}});})()`,
    };
  });

  const starter = `/* Reproduce the “${cleanInline(lab.title)}” styling.\n * The lab's HTML fixture is already on the page.\n * The tests verify each required CSS property is applied.\n */\n`;
  for (const test of tests) {
    if (new RegExp(test.pattern, 'i').test(starter)) return dropSandbox('css', 'starter-matches');
  }

  return {
    prompt: `Style the page for “${cleanInline(lab.title)}”`,
    explain:
      'Each test reads the rendered stylesheet the way a browser does — a property only counts if the CSS actually parses and applies.',
    exercise: { language: 'css', starter, fixture: { html: fixture }, tests },
    solution: reference,
  };
}


const CODE_FILE = /\.(py|js|mjs|html|css|rs|go|sql|java|c|h|cpp|ts|tsx|jsx|rb|php|sh)$/i;

function truncateBlock(text, maxChars) {
  const clean = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars - 1).replace(/\s+\S*$/, '')}…`;
}

function guidedParagraphs(md, limit = 4) {
  if (!md) return [];
  const prose = md
    .replace(/```[\s\S]*?```/g, '\n\n')
    .replace(/<div[\s\S]*?<\/div>/gi, ' ');
  return prose
    .split(/\n\s*\n/)
    .map((block) =>
      cleanInline(
        block
          .split('\n')
          .map((line) => {
            const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/);
            if (bullet) return `• ${bullet[1]}`;
            return line.replace(/^#{1,6}\s*/, '');
          })
          .join(' ')
      )
    )
    .filter((p) => p.length >= 30 && !VM_NOISE.test(p) && !BOILERPLATE.test(p))
    .slice(0, limit)
    .map((p) => (p.length > 640 ? `${p.slice(0, 637).replace(/\s+\S*$/, '')}…` : p));
}

function guidedCode(md) {
  return codeBlocks(md)
    .filter((block) => block.body.length >= 8 && !/^\s*<div/i.test(block.body))
    .map((block) => ({
      lang: block.lang || 'text',
      text: truncateBlock(block.body.split('\n').slice(0, 48).join('\n'), 2400),
    }))
    .slice(0, 3);
}

const LANG_EXT = {
  python: 'py',
  py: 'py',
  javascript: 'js',
  js: 'js',
  typescript: 'ts',
  ts: 'ts',
  rust: 'rs',
  rs: 'rs',
  go: 'go',
  golang: 'go',
  html: 'html',
  css: 'css',
  bash: 'sh',
  sh: 'sh',
  shell: 'sh',
  sql: 'sql',
};

function buildGuided(lab, credit) {
  const stepList = Array.isArray(lab.stepDefs) && lab.stepDefs.length > 0 ? lab.stepDefs : [];
  const steps = stepList
    .map((step, index) => ({
      title: cleanInline(step.title || '') || `Step ${index + 1}`,
      body: guidedParagraphs(step.md),
      code: guidedCode(step.md),
    }))
    .filter((step) => step.body.length > 0 || (step.code && step.code.length > 0));
  if (steps.length === 0) {
    const fallback = guidedParagraphs(lab.introMd || lab.text, 5);
    if (fallback.length === 0) return null;
    steps.push({ title: 'Walkthrough', body: fallback, code: guidedCode(lab.text) });
  }

  const reference = [];
  const seenPaths = new Set();
  const addReference = (file) => {
    if (!file || !file.text || file.text.trim().length < 12) return;
    const name = String(file.path || 'reference.txt').split('/').pop();
    if (seenPaths.has(name)) return;
    seenPaths.add(name);
    reference.push({ path: name, text: truncateBlock(file.text, 4200) });
  };
  for (const step of stepList) {
    for (const file of step.solutions || []) addReference(file);
  }
  if (reference.length === 0) {
    for (const file of lab.assetFiles || []) addReference(file);
  }
  if (reference.length === 0) {
    const last = steps[steps.length - 1];
    const snippet = last && last.code && last.code[last.code.length - 1];
    if (snippet) {
      addReference({ path: `reference.${LANG_EXT[snippet.lang] || 'txt'}`, text: snippet.text });
    }
  }

  return {
    intro: cleanInline(lab.description || lab.opening || lab.title),
    steps: steps.slice(0, 8),
    commands: [...new Set(lab.commands || [])].slice(0, 12),
    reference: reference.slice(0, 3),
    source: credit,
  };
}

/* ---------------- question synthesis ---------------- */

const normOption = (s) =>
  cleanInline(s)
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, '');

function mcq(prompt, answer, distractors, explain) {
  const options = [];
  const seen = new Set([normOption(answer)]);
  for (const raw of distractors) {
    const d = cleanInline(raw);
    if (!d) continue;
    const key = normOption(d);
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(d);
    if (options.length === 3) break;
  }
  if (options.length < 3) return null;
  return { type: 'MCQ', prompt, answer, options: [answer, ...options], explain };
}

function valueDistractors(expected) {
  const out = [];
  const numbers = [...expected.matchAll(/-?\d+(?:\.\d+)?/g)].slice(0, 3);
  for (const match of numbers) {
    const digits = match[0];
    const start = match.index;
    for (const delta of [1, -1, 2]) {
      if (out.length >= 3) break;
      const next = String(Number(digits) + delta);
      if (next === digits) continue;
      const candidate = expected.slice(0, start) + next + expected.slice(start + digits.length);
      if (candidate !== expected && !out.includes(candidate)) out.push(candidate);
    }
  }
  return out;
}

function buildQuestions(lab, sib, global) {
  const text = lab.text;
  const lower = text.toLowerCase();
  const title = lab.title;
  const questions = [];
  const prompts = new Set();
  const add = (q) => {
    if (!q || prompts.has(q.prompt)) return;
    prompts.add(q.prompt);
    questions.push(q);
    return q;
  };
  const notInText = (values) =>
    uniqueBy(
      values.filter((v) => v && v.length >= 2 && v.length <= 45 && !lower.includes(String(v).toLowerCase())),
      (v) => normOption(v)
    );
  const pools = (key) => [
    ...sib.flatMap((p) => p[key] || []),
    ...(global[key] || []),
  ];

  // 1. Predict an example's result — the strongest, fully provable item.
  for (const example of lab.examples.slice(0, 2)) {
    if (questions.length >= 5) break;
    const answer = example.expected;
    const distract = [
      ...valueDistractors(answer),
      ...notInText(lab.examples.map((e) => e.expected).filter((e) => e !== answer)),
      ...notInText(pools('outputs').filter((e) => e !== answer)),
    ];
    add(
      mcq(
        `The lab shows \`${example.call}\` — what is the result?`,
        answer,
        distract,
        `\`${example.call}\` produces ${answer}, exactly as the lab's example shows.`
      )
    );
  }

  // 2. The function the lab defines — provable from its code.
  const fn = lab.defs[0];
  if (fn) {
    add(
      mcq(
        `Which function is defined in the “${title}” lab?`,
        fn,
        notInText(pools('defs')),
        `The lab's code defines \`${fn}\`.`
      )
    );
  }

  // 3. The module the lab imports — language-specific and provable.
  const moduleName = lab.imports[0];
  if (moduleName) {
    const label = moduleName.includes('.') ? moduleName.split('.')[0] : moduleName;
    add(
      mcq(
        `Which module does the “${title}” lab import?`,
        label,
        notInText(pools('imports').map((m) => (m.includes('.') ? m.split('.')[0] : m))),
        `The lab imports \`${moduleName}\`, so the brief depends on it.`
      )
    );
  }

  // 4. One technology item: event, CSS property, API method, or HTML tag.
  const tech = [
    {
      values: lab.events,
      prompt: `Which event does the “${title}” lab listen for?`,
      key: 'events',
      explain: (a) => `The lab registers a listener for \`${a}\`.`,
    },
    {
      values: lab.cssProps.filter((p) => p !== 'display' && p !== 'color'),
      prompt: `Which CSS property styles the “${title}” lab?`,
      key: 'cssProps',
      explain: (a) => `The lab's stylesheet sets \`${a}\`.`,
    },
    {
      values: lab.apis,
      prompt: `Which API does the “${title}” lab use?`,
      key: 'apis',
      explain: (a) => `The lab's code uses \`${a}\`.`,
    },
    {
      values: lab.htmlTags.filter((t) => t !== 'div' && t !== 'span' && t !== 'p'),
      prompt: `Which HTML element does the “${title}” lab create?`,
      key: 'tags',
      explain: (a) => `The lab's markup uses \`<${a}>\`.`,
    },
  ].find((t) => t.values.length > 0);
  if (tech) {
    const answer = tech.values[0];
    add(mcq(tech.prompt, answer, notInText(pools(tech.key)), tech.explain(answer)));
  }

  // 5. A shell command to assemble, or a step/brief recall.
  const command = lab.commands[0];
  if (command) {
    const chain = command.split(/\s+/);
    const bank = [...chain];
    for (const token of notInText(pools('commandTokens').map((t) => String(t)))) {
      if (bank.length >= chain.length + 3) break;
      if (!bank.includes(token)) bank.push(token);
    }
    for (const token of ['--help', '-v', 'status', 'config']) {
      if (bank.length >= chain.length + 3) break;
      if (!bank.includes(token)) bank.push(token);
    }
    if (new Set(bank).size === bank.length) {
      add({
        type: 'BUILD',
        prompt: `Assemble the command used in “${title}”`,
        chain,
        bank,
        explain: `The lab runs \`${command}\`. Word order matters on the command line.`,
      });
    }
  }

  if (questions.length < 5 && lab.bullets.length > 0) {
    const answer = lab.bullets[0];
    const distract = notInText(pools('bullets').filter((b) => b !== answer));
    add(mcq(`Which step belongs to the “${title}” lab?`, answer, distract, `“${answer}” is one of this lab's steps.`));
  }

  if (questions.length < 5 && lab.mentions.length > 0) {
    const answer = lab.mentions[0];
    add(
      mcq(
        `Which term does the “${title}” brief introduce?`,
        answer,
        notInText(pools('mentions')),
        `The brief works with \`${answer}\` — it is part of this lab's approach.`
      )
    );
  }

  const genericOpening = /^(in this lab|in this tutorial|this lab|welcome to|introduction)/i;
  if (questions.length < 5 && lab.opening && !genericOpening.test(lab.opening)) {
    const snippet = lab.opening.length > 150 ? lab.opening.slice(0, 149).trimEnd() + '…' : lab.opening;
    add(
      mcq(
        `The lab says: “${snippet}” — which lab is this?`,
        title,
        [...sib.map((s) => s.title), ...(global.titles || [])].filter((t) => normTitle(t) !== normTitle(title)),
        `Those lines introduce “${title}”.`
      )
    );
  }

  // Top up with a second provable item when the first pass came up short.
  if (questions.length < 3) {
    const extra = lab.cssProps.find((p) => p !== tech?.values[0]) || lab.imports[1] || lab.defs[1];
    if (extra) {
      const poolKey = lab.cssProps.includes(extra) ? 'cssProps' : lab.imports.includes(extra) ? 'imports' : 'defs';
      add(
        mcq(
          `Which of these also appears in the “${title}” lab?`,
          extra,
          notInText(pools(poolKey)),
          `\`${extra}\` is used in the lab as well.`
        )
      );
    }
  }

  // 6. A runnable sandbox when the lab's own examples survive transcription.
  if (lab.cat === 'javascript') {
    const sandbox = buildJsExercise(lab);
    if (sandbox) {
      add({
        type: 'CODE',
        prompt: sandbox.prompt,
        exercise: sandbox.exercise,
        solution: sandbox.solution,
        explain: sandbox.explain,
      });
    }
  }
  if (lab.cat === 'css') {
    const sandbox = buildCssExercise(lab);
    if (sandbox) {
      add({
        type: 'CODE',
        prompt: sandbox.prompt,
        exercise: sandbox.exercise,
        solution: sandbox.solution,
        explain: sandbox.explain,
      });
    }
  }

  const interactive = questions.find((q) => q.type === 'CODE');
  if (interactive) {
    const recall = questions.filter((q) => q.type !== 'CODE').slice(0, 4);
    return [...recall, interactive];
  }
  return questions.slice(0, 5);
}

/* ---------------- main ---------------- */

function loadLabs() {
  const labs = [];
  const skipped = { license: 0, pro: 0, noContent: 0, tooThin: 0 };

  const addLab = (cat, project, folder, labDir) => {
    const indexPath = path.join(labDir, 'index.json');
    if (!fs.existsSync(indexPath)) return;
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch {
      return;
    }
    const license = meta.license && meta.license.name ? meta.license.name : null;
    if (!license || !ALLOWED.has(license)) {
      skipped.license += 1;
      return;
    }
    if (meta.fee_type === 'pro') {
      skipped.pro += 1;
      return;
    }
    const read = (relative) => {
      if (!relative) return '';
      try {
        return fs
          .readFileSync(path.join(labDir, relative), 'utf8')
          .replace(/\r\n?/g, '\n')
          .replace(/^\uFEFF/, '');
      } catch {
        return '';
      }
    };
    const details = meta.details || {};
    const introMd = read((details.intro && details.intro.text) || 'en/intro.md');
    const finishMd = read((details.finish && details.finish.text) || 'en/finish.md');
    const steps = Array.isArray(details.steps) ? details.steps : [];
    const stepMds = [];
    const stepDefs = [];
    for (const step of steps) {
      const md = read(step && step.text);
      if (md) stepMds.push(md);
      const solutions = [];
      const seenSolutions = new Set();
      for (const rel of Array.isArray(step && step.solutions) ? step.solutions : []) {
        const candidates = [rel, `solutions/${rel}`, `assets/${rel}`];
        for (const candidate of candidates) {
          const text = read(candidate);
          if (!text || !text.trim()) continue;
          const name = String(rel).split('/').pop();
          if (seenSolutions.has(name)) break;
          seenSolutions.add(name);
          solutions.push({ path: name, text });
          break;
        }
      }
      stepDefs.push({ title: step && step.title ? step.title : '', md, solutions });
    }
    const assetFiles = [];
    const hostAssets = details.assets && Array.isArray(details.assets.host01) ? details.assets.host01 : [];
    for (const asset of hostAssets) {
      const file = asset && asset.file;
      if (!file || !CODE_FILE.test(file)) continue;
      const text = read(file) || read(`assets/${file}`);
      if (text && text.trim()) assetFiles.push({ path: path.basename(file), text });
    }
    if (!introMd && stepMds.length === 0) {
      skipped.noContent += 1;
      return;
    }
    const text = [introMd, ...stepMds, finishMd].join('\n\n');
    if (stripMd(text).length < 200) {
      skipped.tooThin += 1;
      return;
    }
    const rawTitle = cleanInline(meta.title || folder);
    const title =
      collapse(rawTitle.replace(/\s*[|·]\s*(challenge|guided lab|lab)\s*$/i, '')) || folder;
    labs.push({
      cat,
      project,
      folder,
      title,
      license,
      licenseUrl: (meta.license && meta.license.url) || '',
      repo: (meta.license && meta.license.repo) || '',
      contributors: Array.isArray(meta.contributors)
        ? meta.contributors.filter((c) => typeof c === 'string').slice(0, 3)
        : [],
      difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(meta.difficulty)
        ? meta.difficulty
        : 'Beginner',
      minutes: Math.max(3, Math.min(30, Number(meta.time) || 5 + steps.length * 2)),
      description: cleanInline(meta.description || ''),
      opening:
        cleanInline(meta.description || '') ||
        cleanParagraphs(introMd)[0] ||
        cleanParagraphs(stepMds[0] || '')[0] ||
        '',
      introMd,
      finishMd,
      stepMds,
      stepDefs,
      assetFiles,
      text,
      keywords: keywordsOf(meta),
      examples: examples(text),
      defs: defs(text),
      imports: imports(text),
      events: events(text),
      cssProps: cssProps(text),
      htmlTags: htmlTags(text),
      apis: apis(text),
      bullets: bullets(text),
      mentions: mentions(text),
      commands: shellLines(text),
    });
  };

  // Layouts differ by category: python/<project>/<lab>/index.json but
  // jquery/<lab>/index.json. Detect per entry instead of assuming a depth.
  for (const cat of CATEGORIES) {
    const catDir = path.join(SRC, cat);
    if (!fs.existsSync(catDir)) continue;
    for (const entry of fs.readdirSync(catDir)) {
      const entryDir = path.join(catDir, entry);
      if (!fs.statSync(entryDir).isDirectory()) continue;
      if (fs.existsSync(path.join(entryDir, 'index.json'))) {
        addLab(cat, entry, entry, entryDir);
        continue;
      }
      for (const folder of fs.readdirSync(entryDir)) {
        const labDir = path.join(entryDir, folder);
        if (!fs.statSync(labDir).isDirectory()) continue;
        addLab(cat, entry, folder, labDir);
      }
    }
  }
  return { labs, skipped };
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Source not found: ${SRC}`);
    process.exit(1);
  }
  fs.mkdirSync(path.join(OUT, 'lessons'), { recursive: true });
  const { labs, skipped } = loadLabs();

  const seenTitles = new Map();
  const dupes = [];
  let appDupes = 0;
  const kept = [];
  for (const lab of labs) {
    const key = normTitle(lab.title);
    if (!key) continue;
    if (appTitles.has(key)) {
      appDupes += 1;
      dupes.push(`${lab.title} (already taught in the app)`);
      continue;
    }
    if (seenTitles.has(key)) {
      dupes.push(`${lab.title} (${lab.cat}) repeats ${seenTitles.get(key)}`);
      continue;
    }
    seenTitles.set(key, lab.cat);
    kept.push(lab);
  }

  const byCat = new Map();
  for (const lab of kept) {
    if (!byCat.has(lab.cat)) byCat.set(lab.cat, []);
    byCat.get(lab.cat).push(lab);
  }

  const pools = (lab) => ({
    title: lab.title,
    defs: lab.defs,
    imports: lab.imports,
    events: lab.events,
    cssProps: lab.cssProps,
    apis: lab.apis,
    tags: lab.htmlTags,
    bullets: lab.bullets,
    keywords: lab.keywords,
    mentions: lab.mentions,
    outputs: lab.examples.map((e) => e.expected),
    commandTokens: lab.commands.flatMap((c) => c.split(/\s+/)),
  });
  const global = {
    defs: [], imports: [], events: [], cssProps: [], apis: [], tags: [],
    bullets: [], keywords: [], mentions: [], outputs: [], commandTokens: [], titles: [],
  };
  for (const lab of kept) {
    const p = pools(lab);
    for (const key of Object.keys(global)) {
      if (key === 'titles') continue;
      global[key].push(...(p[key] || []));
    }
    global.titles.push(lab.title);
  }
  for (const key of Object.keys(global)) {
    global[key] = uniqueBy(global[key], (v) => normOption(v)).slice(0, 400);
  }

  const usedIds = new Set();
  const thin = [];
  const emittedByCat = new Map();
  let totalQuestions = 0;

  for (const cat of CATEGORIES) {
    const list = byCat.get(cat);
    if (!list || list.length === 0) continue;
    const categoryPool = list.slice(0, 40).map(pools);
    const emitted = [];
    for (const lab of list) {
      const sibs = categoryPool.filter((p) => normTitle(p.title) !== normTitle(lab.title)).slice(0, 12);
      const questions = buildQuestions(lab, sibs, global);
      if (questions.length < 3) {
        thin.push(`${lab.title} (${cat}, ${questions.length}q)`);
        continue;
      }
      let id = `labex-${cat}-${slug(lab.title)}`;
      if (usedIds.has(id)) id = `${id}-${slug(lab.project).slice(0, 16)}`;
      if (usedIds.has(id)) id = `${id}-${slug(lab.folder).slice(0, 10)}`;
      if (usedIds.has(id)) id = `${id}-${emitted.length + 1}`;
      usedIds.add(id);

      const creditParts = [];
      const repoShort = lab.repo.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\.git$/, '');
      if (repoShort) creditParts.push(repoShort);
      if (lab.contributors.length) creditParts.push(`by ${lab.contributors.join(', ')}`);
      creditParts.push(lab.license);
      const theory = `${buildTheory(lab)} Source: ${creditParts.join(' · ')}.`;
      emitted.push({ id, lab, questions, theory });
      totalQuestions += questions.length;
    }
    if (emitted.length === 0) continue;
    emittedByCat.set(cat, emitted);

    const varName = `LABEX_${cat.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    const qsrc = emitted.map(({ id, lab, questions, theory }) => {
      const qs = questions
        .map((q) => {
          if (q.type === 'CODE') {
            return `      CODE(\n        ${JSON.stringify(q.prompt)},\n        ${JSON.stringify(q.exercise)},\n        ${JSON.stringify(q.solution)},\n        ${JSON.stringify(q.explain)}\n      ),`;
          }
          if (q.type === 'MCQ') {
            return `      MCQ(\n        '${esc(q.prompt)}',\n        '${esc(q.answer)}',\n        [${q.options
              .map((o) => `'${esc(o)}'`)
              .join(', ')}],\n        '${esc(q.explain)}'\n      ),`;
          }
          return `      BUILD(\n        '${esc(q.prompt)}',\n        [${q.chain
            .map((o) => `'${esc(o)}'`)
            .join(', ')}],\n        [${q.bank.map((o) => `'${esc(o)}'`).join(', ')}],\n        '${esc(q.explain)}'\n      ),`;
        })
        .join('\n');
      return `  '${id}': {\n    id: '${id}',\n    title: '${esc(lab.title)}',\n    theory: ['${esc(theory)}'],\n    questions: [\n${qs}\n    ],\n  },`;
    });
    const sources = [...new Set(emitted.map((l) => l.lab.repo).filter(Boolean))].map((s) =>
      s.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\.git$/, '')
    );
    const licenses = [...new Set(emitted.map((l) => l.lab.license))].sort();
    const needsCode = emitted.some(({ questions }) => questions.some((q) => q.type === 'CODE'));
    const src = `/**
 * LabEx Open Labs · ${CATEGORY_META[cat].title} — ${emitted.length} labs.
 *
 * Adapted from the LabEx open-source lab corpus
 * (https://github.com/labex-labs/open-source-labs), which delegates each
 * lab's terms to its index.json. Included licenses: ${licenses.join(', ')}.
 * Sources: ${sources.join(', ') || 'labex-labs/open-source-labs'}.
 * Every lesson credits its source in the theory; questions are original,
 * derived from each lab's own text and code.
 *
 * Generated by scripts/import-labex.cjs — do not edit by hand.
 */

import { MCQ, BUILD,${needsCode ? ' CODE,' : ''} type CourseLesson } from '../../quizBank';

export const ${varName}: Record<string, CourseLesson> = {
${qsrc.join('\n')}
};
`;
    fs.writeFileSync(path.join(OUT, 'lessons', `${cat}.ts`), src);
    console.log(`wrote lessons/${cat}.ts — ${emitted.length} labs, ${emitted.reduce((a, l) => a + l.questions.length, 0)} questions`);
  }

  // Drop banks from categories that no longer survive the quality bar, so a
  // stale file can never be opened through an old link.
  const writtenBanks = new Set([...emittedByCat.keys()].map((cat) => `${cat}.ts`));
  for (const file of fs.readdirSync(path.join(OUT, 'lessons'))) {
    if (file.endsWith('.ts') && !writtenBanks.has(file)) {
      fs.unlinkSync(path.join(OUT, 'lessons', file));
      console.log(`removed stale lessons/${file}`);
    }
  }

  /* ---- guided walkthroughs, chunked so one lab never loads a whole category ---- */

  fs.mkdirSync(GUIDED_OUT, { recursive: true });
  const GUIDED_CHUNK = 40;
  let guidedTotal = 0;
  const creditOf = (lab) => {
    const parts = [];
    const repoShort = lab.repo.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\.git$/, '');
    if (repoShort) parts.push(repoShort);
    if (lab.contributors.length) parts.push(`by ${lab.contributors.join(', ')}`);
    parts.push(lab.license);
    return parts.join(' · ');
  };
  const guidedCats = new Set();
  for (const [cat, list] of emittedByCat.entries()) {
    const catDir = path.join(GUIDED_OUT, cat);
    fs.rmSync(catDir, { recursive: true, force: true });
    fs.mkdirSync(catDir, { recursive: true });
    const loaders = [];
    let chunkNo = 0;
    for (let start = 0; start < list.length; start += GUIDED_CHUNK) {
      const slice = list.slice(start, start + GUIDED_CHUNK);
      const entries = {};
      const ids = [];
      for (const { id, lab } of slice) {
        const guided = buildGuided(lab, creditOf(lab));
        if (!guided) continue;
        entries[id] = guided;
        ids.push(id);
        guidedTotal += 1;
      }
      if (ids.length === 0) continue;
      chunkNo += 1;
      for (const id of ids) loaders.push(`  '${id}': ${chunkNo},`);
      const chunkName = `chunk-${String(chunkNo).padStart(2, '0')}`;
      fs.writeFileSync(
        path.join(catDir, `${chunkName}.ts`),
        `/**
 * Guided walkthroughs · ${CATEGORY_META[cat].title} · chunk ${chunkNo}.
 * Generated by scripts/import-labex.cjs from the licensed LabEx corpus.
 * Read-only: these labs need a runtime this build does not ship.
 */

import type { GuidedLab } from '../../../quizBank';

export const GUIDED: Record<string, GuidedLab> = ${JSON.stringify(entries, null, 0)};
`
      );
    }
    if (loaders.length === 0) {
      fs.rmSync(catDir, { recursive: true, force: true });
      continue;
    }
    guidedCats.add(cat);
    const chunks = Array.from({ length: chunkNo }, (_, i) => i + 1).map(
      (n) =>
        `  ${n}: () => import('./chunk-${String(n).padStart(2, '0')}').then((m) => m.GUIDED),`
    );
    fs.writeFileSync(
      path.join(catDir, 'index.ts'),
      `/**
 * Guided walkthrough resolver · ${CATEGORY_META[cat].title}.
 * Generated by scripts/import-labex.cjs — do not edit by hand.
 */

import type { GuidedLab } from '../../../quizBank';

type Chunk = Record<string, GuidedLab>;

const CHUNKS: Record<number, () => Promise<Chunk>> = {
${chunks.join('\n')}
};

const WHERE: Record<string, number> = {
${loaders.join('\n')}
};

export async function loadGuidedLab(id: string): Promise<GuidedLab | undefined> {
  const chunk = WHERE[id];
  if (!chunk) return undefined;
  return (await CHUNKS[chunk]())[id];
}
`
    );
  }
  for (const entry of fs.readdirSync(GUIDED_OUT)) {
    if (!guidedCats.has(entry) && fs.statSync(path.join(GUIDED_OUT, entry)).isDirectory()) {
      fs.rmSync(path.join(GUIDED_OUT, entry), { recursive: true, force: true });
    }
  }
  fs.writeFileSync(
    path.join(GUIDED_OUT, 'index.ts'),
    `/**
 * Guided walkthroughs for labs that need a runtime this build does not ship.
 * Content is derived from each licensed lab's own steps and reference files.
 * Generated by scripts/import-labex.cjs — do not edit by hand.
 */

import type { GuidedLab } from '../../quizBank';
import { LABEX_META, type LabexCategoryId } from '../index';

type Loader = (id: string) => Promise<GuidedLab | undefined>;

const CATEGORY_LOADERS: Record<string, () => Promise<{ loadGuidedLab: Loader }>> = {
${[...guidedCats].map((cat) => `  ${cat}: () => import('./${cat}'),`).join('\n')}
};

export const GUIDED_CATEGORIES = [${[...guidedCats].map((c) => `'${c}'`).join(', ')}] as const;

export async function getGuidedLab(id: string): Promise<GuidedLab | undefined> {
  const meta = LABEX_META[id];
  if (!meta) return undefined;
  const load = CATEGORY_LOADERS[meta.category as LabexCategoryId];
  if (!load) return undefined;
  return (await load()).loadGuidedLab(id);
}
`
  );
  console.log(`wrote guided/ — ${guidedTotal} walkthroughs in ${guidedCats.size} categories`);

  const categories = [...emittedByCat.entries()].map(([cat, list]) => ({
    id: cat,
    title: CATEGORY_META[cat].title,
    blurb: CATEGORY_META[cat].blurb,
    count: list.length,
    sources: [...new Set(list.map((l) => l.lab.repo).filter(Boolean))]
      .map((s) => s.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\.git$/, ''))
      .slice(0, 4),
  }));

  const indexSrc = `/**
 * LabEx Open Labs — generated registry. Do not edit by hand; re-run
 * scripts/import-labex.cjs against the labex-labs/open-source-labs clone.
 *
 * Lesson banks are split per category under ./lessons and resolved lazily by
 * ./load, so browsing 2k+ labs never inflates startup parse time.
 */

export const LABEX_CATEGORIES = ${JSON.stringify(categories, null, 2)} as const;

export type LabexCategoryId = (typeof LABEX_CATEGORIES)[number]['id'];

export interface LabexMeta {
  id: string;
  title: string;
  category: LabexCategoryId;
  difficulty: string;
  minutes: number;
}

type MetaTuple = [title: string, category: LabexCategoryId, difficulty: string, minutes: number];

const LABEX_RAW: Record<string, MetaTuple> = {
${[...emittedByCat.entries()]
  .flatMap(([, list]) =>
    list.map(
      ({ id, lab }) =>
        `  '${id}': ['${esc(lab.title)}', '${lab.cat}', '${lab.difficulty}', ${lab.minutes}],`
    )
  )
  .join('\n')}
};

export const LABEX_META: Record<string, LabexMeta> = Object.fromEntries(
  Object.entries(LABEX_RAW).map(([id, [title, category, difficulty, minutes]]) => [
    id,
    { id, title, category, difficulty, minutes },
  ])
) as Record<string, LabexMeta>;

export const LABEX_COUNT = Object.keys(LABEX_META).length;
`;
  fs.writeFileSync(path.join(OUT, 'index.ts'), indexSrc);

  const loadSrc = `/**
 * LabEx lesson resolver. Category banks load on demand — the library screen
 * and the quiz route only pay for the category a learner actually opens.
 * Generated by scripts/import-labex.cjs.
 */

import type { CourseLesson } from '../quizBank';
import { LABEX_META, type LabexCategoryId } from './index';

type Bank = Record<string, CourseLesson>;

const LOADERS: Record<LabexCategoryId, () => Promise<Bank>> = {
${[...emittedByCat.keys()]
  .map((cat) => {
    const varName = `LABEX_${cat.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    return `  ${cat}: () => import('./lessons/${cat}').then((m) => m.${varName}),`;
  })
  .join('\n')}
};

export function isLabexLessonId(id: string | undefined): id is string {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(LABEX_META, id);
}

export function labexMeta(id: string) {
  return LABEX_META[id];
}

export async function loadLabexCategory(category: LabexCategoryId): Promise<Bank> {
  return LOADERS[category]();
}

export async function getLabexLesson(id: string): Promise<CourseLesson | undefined> {
  const meta = LABEX_META[id];
  if (!meta) return undefined;
  const bank = await LOADERS[meta.category]();
  return bank[id];
}
`;
  fs.writeFileSync(path.join(OUT, 'load.ts'), loadSrc);

  // Stale files from earlier iterations must not linger in the bundle.
  for (const stale of ['provenance.ts']) {
    const file = path.join(OUT, stale);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  console.log(
    `\nTOTAL: ${[...emittedByCat.values()].reduce((a, l) => a + l.length, 0)} lessons, ` +
      `${totalQuestions} questions, ${categories.length} categories\n` +
      `skipped: license ${skipped.license}, pro ${skipped.pro}, empty ${skipped.noContent}, ` +
      `thin ${skipped.tooThin + thin.length}, duplicates ${dupes.length} (${appDupes} already taught)`
  );
  if (dupes.length) console.log(`duplicates: ${dupes.slice(0, 12).join(' | ')}${dupes.length > 12 ? ' …' : ''}`);
  if (thin.length) console.log(`thin: ${thin.slice(0, 8).join(' | ')}${thin.length > 8 ? ' …' : ''}`);
  if (process.env.LABEX_SANDBOX_STATS) {
    console.log(`sandbox drops: ${JSON.stringify(sandboxStats)}`);
    if (global.__jsNoExample) console.log(`js no-example sample: ${global.__jsNoExample.slice(0, 24).join(', ')}`);
  }
}

main();
