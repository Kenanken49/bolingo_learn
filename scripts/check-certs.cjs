const fs = require('fs');
const lib = fs.readFileSync('lib/certifications.ts', 'utf8');
// Match P('label', 'pattern', 'hint') with escaped quotes handled.
const re = /P\('((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'\)/g;
const calls = [...lib.matchAll(re)];
console.log('P() calls:', calls.length);
let bad = 0;
for (const [, label, pat] of calls) {
  const js = pat.replace(/\\\\/g, '\\');
  try {
    new RegExp(js, 'i');
  } catch (e) {
    bad++;
    console.log('BAD REGEX:', label.slice(0, 60), '::', e.message.slice(0, 90));
  }
}
console.log('uncompilable:', bad);
const starters = [...lib.matchAll(/starterCode: '(.*?)',\n/sg)].map((m) => m[1]);
console.log('starters:', starters.length, 'empty:', starters.filter((s) => !s.trim()).length);
const briefs = [...lib.matchAll(/brief: \[(.*?)\],\n/sg)].map((m) => (m[1].match(/'(?:[^'\\]|\\.)*'/g) || []).length);
console.log('brief lens:', JSON.stringify(briefs));
const stories = [...lib.matchAll(/stories: \[([\s\S]*?)\n  \],/g)];
console.log('projects with stories block:', stories.length);
