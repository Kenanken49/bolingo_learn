/**
 * Project sandbox — grades a capstone by RUNNING the learner's page.
 *
 * The learner's html/css/js render inside a throwaway frame; each story that
 * carries a `check` expression is evaluated against the live DOM (computed
 * styles, real elements, real layout). Regex `pattern` stays as the offline
 * fallback for builds without a web runtime.
 *
 * Assertions are authored, never learner-supplied, so `new Function` here only
 * compiles trusted strings. The frame still runs user code with `allow-scripts`
 * and no same-origin access, so a project can't reach the app.
 */

import type { CodeDoc } from '../components/CodeEditor';

export interface ProjectStoryCheck {
  label: string;
  check?: string;
}

export interface ProjectOutcome {
  index: number;
  pass: boolean;
  error: string | null;
}

export interface ProjectSandboxResult {
  outcomes: ProjectOutcome[];
  ms: number;
  timedOut?: boolean;
}

export const PROJECT_TIMEOUT_MS = 6000;

export function buildProjectTestDoc(doc: CodeDoc, stories: ProjectStoryCheck[]): string {
  const checks = stories
    .map((s, i) => (s.check ? `    __run(${i}, ${JSON.stringify(s.check)});` : `    // story ${i} has no live check`))
    .join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${doc.css}</style></head><body>${doc.html}<script>${doc.js}</script><script>
(function () {
  function send(payload) {
    payload.source = 'bolingo-project';
    var json = JSON.stringify(payload);
    try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(json); } catch (e) {}
    try { if (window.parent && window.parent !== window) window.parent.postMessage(json, '*'); } catch (e) {}
  }
  function runTests() {
    var started = Date.now();
    var outcomes = [];
    var pending = [];
    function __run(index, expression) {
      try {
        var value = new Function('return (' + expression + ')')();
        if (value && typeof value.then === 'function') {
          // Interaction tests (type, click, wait) resolve asynchronously.
          pending.push(
            Promise.resolve(value).then(
              function (pass) { outcomes.push({ index: index, pass: !!pass, error: null }); },
              function (e) { outcomes.push({ index: index, pass: false, error: String((e && e.message) || e) }); }
            )
          );
          return;
        }
        outcomes.push({ index: index, pass: !!value, error: null });
      } catch (e) {
        outcomes.push({ index: index, pass: false, error: String((e && e.message) || e) });
      }
    }
${checks}
    function finish() {
      outcomes.sort(function (a, b) { return a.index - b.index; });
      send({ outcomes: outcomes, ms: Date.now() - started });
    }
    if (pending.length === 0) finish();
    else Promise.all(pending).then(finish, finish);
  }
  if (document.readyState === 'complete') setTimeout(runTests, 30);
  else window.addEventListener('load', function () { setTimeout(runTests, 30); });
})();
</script></body></html>`;
}

export function parseProjectMessage(data: unknown): ProjectSandboxResult | null {
  if (typeof data !== 'string') return null;
  try {
    const raw = JSON.parse(data) as Partial<ProjectSandboxResult> & { source?: string };
    if (!raw || raw.source !== 'bolingo-project' || !Array.isArray(raw.outcomes)) return null;
    const outcomes: ProjectOutcome[] = raw.outcomes
      .filter(
        (o): o is ProjectOutcome =>
          !!o && typeof o.index === 'number' && typeof o.pass === 'boolean'
      )
      .map((o) => ({
        index: o.index,
        pass: o.pass,
        error: typeof (o as { error?: unknown }).error === 'string' ? String((o as { error?: string }).error) : null,
      }));
    return {
      outcomes,
      ms: typeof raw.ms === 'number' ? raw.ms : 0,
    };
  } catch {
    return null;
  }
}
