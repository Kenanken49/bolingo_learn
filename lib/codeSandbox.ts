/**
 * JS exercise sandbox — real execution, zero trust in string matching.
 *
 * The learner's code and the question's assertions are compiled into ONE
 * function body (so declarations are visible to the tests) and executed
 * inside a throwaway iframe / WebView, never in the app's own JS context.
 * Results come back as JSON over postMessage. The host owns the timeout and
 * kills a runaway loop by remounting the frame, so `while (true)` can't hang
 * the UI.
 *
 * The harness captures console.log for the test console. Assertions are
 * expressions, not strings: "double(2) === 4".
 */

import type { CodeDoc } from '../components/CodeEditor';
import type { CodeExercise } from './quizBank';

export interface TestOutcome {
  id: string;
  pass: boolean;
  error?: string | null;
}

export interface SandboxResult {
  outcomes: TestOutcome[];
  error: string | null;
  logs: string[];
  ms: number;
  timedOut?: boolean;
}

export const SANDBOX_TIMEOUT_MS = 5000;

export function buildSandboxDoc(exercise: CodeExercise, code: string): string {
  const assertions = exercise.tests
    .map((t) => `__record(${JSON.stringify(t.id)}, function () { return (${t.run}); });`)
    .join('\n');
  const tail = [
    'var __results = [];',
    'var __record = function (id, thunk) {',
    '  try { __results.push({ id: id, pass: !!thunk(), error: null }); }',
    '  catch (e) { __results.push({ id: id, pass: false, error: String((e && e.message) || e) }); }',
    '};',
    assertions,
    'return { outcomes: __results, error: null };',
  ].join('\n');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;background:transparent}</style></head><body><script>
(function () {
  var logs = [];
  function fmt(v) {
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  function send(payload) {
    payload.source = 'bolingo-sandbox';
    var json = JSON.stringify(payload);
    try { if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(json); } } catch (e) {}
    try { if (window.parent && window.parent !== window) { window.parent.postMessage(json, '*'); } } catch (e) {}
  }
  var passThrough = console.log;
  console.log = function () {
    try {
      logs.push(Array.prototype.map.call(arguments, fmt).join(' '));
      if (logs.length > 40) logs.shift();
      passThrough.apply(console, arguments);
    } catch (e) {}
  };
  var started = Date.now();
  var source = ${JSON.stringify(code)};
  var body = '"use strict";\\ntry {\\n' + source + '\\n' + ${JSON.stringify(tail)} + '\\n} catch (e) { return { outcomes: [], error: String((e && e.message) || e) }; }';
  var run;
  try {
    run = new Function(body);
  } catch (e) {
    send({ outcomes: [], error: 'SyntaxError: ' + ((e && e.message) || e), logs: logs, ms: Date.now() - started });
    return;
  }
  var out;
  try {
    out = run();
  } catch (e) {
    send({ outcomes: [], error: 'RuntimeError: ' + ((e && e.message) || e), logs: logs, ms: Date.now() - started });
    return;
  }
  if (!out || !Array.isArray(out.outcomes)) {
    send({ outcomes: [], error: 'Your code returned before the tests ran — remove the early return.', logs: logs, ms: Date.now() - started });
    return;
  }
  send({ outcomes: out.outcomes, error: out.error || null, logs: logs, ms: Date.now() - started });
})();
</script></body></html>`;
}

/**
 * HTML/CSS exercises run in the same throwaway frame as projects: the learner's
 * markup and styles render, then each test evaluates a real DOM/CSSOM
 * expression. This is what makes a markup lab a build, not a token quiz.
 */
export function buildWebSandboxDoc(exercise: CodeExercise, doc: CodeDoc): string {
  const safe = (code: string) => code.replace(/<\/script/gi, '<\\/script');
  const assertions = exercise.tests
    .map((t) => `    __record(${JSON.stringify(t.id)}, ${JSON.stringify(t.run)});`)
    .join('\n');
  const fixtureHtml = exercise.fixture?.html ?? '';
  const fixtureCss = exercise.fixture?.css ?? '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${safe(fixtureCss)}\n${safe(doc.css)}</style></head><body>${safe(fixtureHtml)}${safe(doc.html)}<script>
try { ${safe(doc.js)} } catch (e) { window.__bolingoUserJsError = String((e && e.message) || e); }
</script><script>
(function () {
  function send(payload) {
    payload.source = 'bolingo-sandbox';
    var json = JSON.stringify(payload);
    try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(json); } catch (e) {}
    try { if (window.parent && window.parent !== window) window.parent.postMessage(json, '*'); } catch (e) {}
  }
  function runTests() {
    var started = Date.now();
    var outcomes = [];
    function __record(id, expression) {
      try {
        var fn = new Function('return (' + expression + ')');
        outcomes.push({ id: id, pass: !!fn(), error: null });
      } catch (e) {
        outcomes.push({ id: id, pass: false, error: String((e && e.message) || e) });
      }
    }
${assertions}
    send({ outcomes: outcomes, error: window.__bolingoUserJsError || null, logs: [], ms: Date.now() - started });
  }
  if (document.readyState === 'complete') setTimeout(runTests, 30);
  else window.addEventListener('load', function () { setTimeout(runTests, 30); });
})();
</script></body></html>`;
}

/** Accept only well-formed harness payloads arriving from the frame. */
export function parseSandboxMessage(data: unknown): SandboxResult | null {
  if (typeof data !== 'string') return null;
  try {
    const raw = JSON.parse(data) as Partial<SandboxResult> & { source?: string };
    if (!raw || raw.source !== 'bolingo-sandbox' || !Array.isArray(raw.outcomes)) return null;
    const outcomes: TestOutcome[] = raw.outcomes
      .filter((o): o is TestOutcome => !!o && typeof o.id === 'string' && typeof o.pass === 'boolean')
      .map((o) => ({ id: o.id, pass: o.pass, error: typeof o.error === 'string' ? o.error : null }));
    return {
      outcomes,
      error: typeof raw.error === 'string' ? raw.error : null,
      logs: Array.isArray(raw.logs) ? raw.logs.filter((l): l is string => typeof l === 'string').slice(0, 40) : [],
      ms: typeof raw.ms === 'number' ? raw.ms : 0,
    };
  } catch {
    return null;
  }
}

/** Whitespace/comment-insensitive comparison used only where no runtime exists. */
export function normalizeCodeSource(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/;+$/, '');
}
