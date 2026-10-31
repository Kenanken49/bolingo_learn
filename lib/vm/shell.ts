/**
 * The lab shell — a small POSIX-ish interpreter that runs entirely on the
 * in-memory filesystem. It understands the constructs the LabEx reference
 * scripts and learners actually use: quoting, `&&`/`||`/`;`, pipelines,
 * subshells, redirection, `$(...)`, variables, `if/then/else/fi`, `[ ... ]`,
 * and history (`~/.zsh_history`, `history`, `!n`).
 *
 * It is deliberately not a full bash: no process spawning, no network, no
 * unspecified commands. Unknown commands fail loudly instead of pretending.
 */

import { VFS, dirname } from './fs';
import { Git, GitError, GitContext } from './git';

export interface ExecResult {
  out: string;
  err: string;
  code: number;
}

interface Segment {
  text: string;
  quote: "'" | '"' | '';
}

interface Word {
  segments: Segment[];
}

type Token =
  | { type: 'word'; word: Word }
  | { type: 'op'; value: string };

type Connector = ';' | '&&' | '||';

interface SimpleCommand {
  type: 'simple';
  words: Word[];
  redirects: { op: '>' | '>>' | '<'; target: Word }[];
  negate: boolean;
}

interface Subshell {
  type: 'subshell';
  list: ListItem[];
}

interface Conditional {
  type: 'if';
  branches: { cond: ListItem[]; body: ListItem[] }[];
  fallback?: ListItem[];
}

type CommandNode = SimpleCommand | Subshell | Conditional;

interface ListItem {
  connector: Connector;
  stages: CommandNode[];
}

const OPS = ['&&', '||', '>>', ';', '|', '>', '<', '(', ')', '&'];

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let segments: Segment[] = [];
  let current = '';
  let quote: "'" | '"' | '' = '';
  let pendingWord = false;

  const pushSegment = (text: string, kind: Segment['quote']) => {
    if (!text) return;
    segments.push({ text, quote: kind });
    pendingWord = true;
  };
  const flush = () => {
    if (!pendingWord) return;
    tokens.push({ type: 'word', word: { segments } });
    segments = [];
    current = '';
    pendingWord = false;
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote === "'") {
      if (ch === "'") quote = '';
      else current += ch;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') {
        pushSegment(current, '"');
        current = '';
        quote = '';
      } else if (ch === '\\' && '"\\$`'.includes(input[i + 1] ?? '')) {
        current += input[i + 1];
        i += 1;
      } else if (ch === '$') {
        if (current) {
          pushSegment(current, '"');
          current = '';
        }
        const [value, consumed] = readDollar(input, i);
        segments.push({ text: value, quote: '"' });
        pendingWord = true;
        i += consumed;
      } else current += ch;
      continue;
    }
    if (ch === '\\') {
      current += input[i + 1] ?? '';
      i += 1;
      pendingWord = true;
      continue;
    }
    if (ch === "'" || ch === '"') {
      if (current) {
        pushSegment(current, '');
        current = '';
      }
      quote = ch;
      continue;
    }
    if (ch === '#' && !pendingWord) {
      while (i < input.length && input[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '\n') {
      if (current) {
        pushSegment(current, '');
        current = '';
      }
      flush();
      tokens.push({ type: 'op', value: ';' });
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      if (current) {
        pushSegment(current, '');
        current = '';
      }
      flush();
      continue;
    }
    if (ch === '$') {
      if (current) {
        pushSegment(current, '');
        current = '';
      }
      const [value, consumed] = readDollar(input, i);
      segments.push({ text: value, quote: '' });
      pendingWord = true;
      i += consumed;
      continue;
    }
    const op = OPS.find((candidate) => input.startsWith(candidate, i));
    if (op) {
      if (current) {
        pushSegment(current, '');
        current = '';
      }
      flush();
      tokens.push({ type: 'op', value: op });
      i += op.length - 1;
      continue;
    }
    current += ch;
    pendingWord = true;
  }
  if (current) pushSegment(current, '');
  flush();
  return tokens;
}

/** Read `$NAME`, `${NAME}`, or `$(...)` starting at the `$`. */
function readDollar(input: string, start: number): [string, number] {
  let i = start + 1;
  if (input[i] === '(') {
    let depth = 1;
    i += 1;
    const begin = i;
    while (i < input.length && depth > 0) {
      if (input[i] === '(') depth += 1;
      else if (input[i] === ')') depth -= 1;
      i += 1;
    }
    return [input.slice(start, i), i - start - 1];
  }
  if (input[i] === '{') {
    const end = input.indexOf('}', i);
    if (end >= 0) return [input.slice(start, end + 1), end - start];
  }
  let end = i;
  while (end < input.length && /[A-Za-z0-9_]/.test(input[end])) end += 1;
  if (end === i) return ['$', 0];
  return [input.slice(start, end), end - start - 1];
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): ListItem[] {
    return this.parseList(new Set());
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private word(): string | null {
    const token = this.peek();
    return token && token.type === 'word' ? token.word.segments.map((s) => s.text).join('') : null;
  }

  private isStop(stops: Set<string>): boolean {
    const token = this.peek();
    return !!token && token.type === 'word' && stops.has(token.word.segments.map((s) => s.text).join(''));
  }

  private parseList(stops: Set<string>): ListItem[] {
    const items: ListItem[] = [];
    let connector: Connector = ';';
    for (;;) {
      while (this.peek()?.type === 'op' && [';'].includes((this.peek() as { value: string }).value)) this.pos += 1;
      if (!this.peek() || (stops.size > 0 && this.isStop(stops))) break;
      if (this.peek()?.type === 'op') {
        const op = (this.peek() as { value: string }).value;
        if (op === '&&' || op === '||') {
          connector = op;
          this.pos += 1;
          continue;
        }
        break;
      }
      const stages = this.parsePipeline(stops);
      if (stages.length === 0) break;
      items.push({ connector, stages });
      connector = ';';
    }
    return items;
  }

  private parsePipeline(stops: Set<string>): CommandNode[] {
    const stages: CommandNode[] = [];
    for (;;) {
      const node = this.parseCommand(stops);
      if (!node) break;
      stages.push(node);
      if (this.peek()?.type === 'op' && (this.peek() as { value: string }).value === '|') {
        this.pos += 1;
        continue;
      }
      break;
    }
    return stages;
  }

  private parseCommand(stops: Set<string>): CommandNode | null {
    const token = this.peek();
    if (!token) return null;
    if (token.type === 'op') {
      if (token.value === '(') {
        this.pos += 1;
        const list = this.parseList(new Set([')']));
        if (this.peek()?.type === 'op' && (this.peek() as { value: string }).value === ')') this.pos += 1;
        return { type: 'subshell', list };
      }
      return null;
    }
    if (token.word.segments.length === 1 && token.word.segments[0].quote === '') {
      const text = token.word.segments[0].text;
      if (text === 'if') {
        return this.parseIf();
      }
      if (text === 'then' || text === 'else' || text === 'fi' || text === 'elif') return null;
    }
    return this.parseSimple(stops);
  }

  private parseIf(): Conditional {
    this.pos += 1;
    const branches: { cond: ListItem[]; body: ListItem[] }[] = [];
    let fallback: ListItem[] | undefined;
    for (;;) {
      const cond = this.parseList(new Set(['then']));
      if (this.isStop(new Set(['then']))) this.pos += 1;
      const body = this.parseList(new Set(['elif', 'else', 'fi']));
      branches.push({ cond, body });
      if (this.isStop(new Set(['elif']))) {
        this.pos += 1;
        continue;
      }
      if (this.isStop(new Set(['else']))) {
        this.pos += 1;
        fallback = this.parseList(new Set(['fi']));
      }
      if (this.isStop(new Set(['fi']))) this.pos += 1;
      break;
    }
    return { type: 'if', branches, fallback };
  }

  private parseSimple(stops: Set<string>): SimpleCommand | null {
    const words: Word[] = [];
    const redirects: SimpleCommand['redirects'] = [];
    let negate = false;
    while (this.peek()) {
      const token = this.peek()!;
      if (token.type === 'op') {
        if (token.value === '>' || token.value === '>>' || token.value === '<') {
          this.pos += 1;
          const target = this.peek();
          if (target && target.type === 'word') {
            redirects.push({ op: token.value, target: target.word });
            this.pos += 1;
          }
          continue;
        }
        break;
      }
      const text = token.word.segments.map((s) => s.text).join('');
      if (words.length === 0 && !negate && text === '!') {
        negate = true;
        this.pos += 1;
        continue;
      }
      if (stops.size > 0 && stops.has(text) && words.length === 0) break;
      words.push(token.word);
      this.pos += 1;
    }
    if (words.length === 0 && redirects.length === 0) return null;
    return { type: 'simple', words, redirects, negate };
  }
}

export interface TerminalSnapshot {
  files: Record<string, string>;
  dirs: string[];
  cwd: string;
  remotes: Map<string, VFS>;
}

export class Terminal {
  fs: VFS;
  cwd: string;
  env: Record<string, string>;
  remotes: Map<string, VFS>;
  history: string[] = [];
  private previousCwd: string | null = null;
  private readonly base: TerminalSnapshot;
  private readonly seed?: string;

  constructor(options: { files?: Record<string, string>; dirs?: string[]; cwd?: string; remotes?: Map<string, VFS>; seed?: string } = {}) {
    const files = options.files ?? defaultFiles();
    const dirs = options.dirs ?? ['/home/labex', '/home/labex/project'];
    this.fs = new VFS({ files, dirs });
    this.cwd = options.cwd ?? '/home/labex/project';
    this.env = {
      HOME: '/home/labex',
      USER: 'labex',
      PATH: '/usr/local/bin:/usr/bin:/bin',
      SHELL: '/bin/zsh',
      PWD: this.cwd,
    };
    this.remotes = options.remotes ?? new Map();
    this.seed = options.seed;
    this.base = {
      files: { ...files },
      dirs: [...dirs],
      cwd: this.cwd,
      remotes: new Map([...this.remotes].map(([url, remote]) => [url, remote.clone()])),
    };
    if (this.seed) this.runScript(this.seed);
    this.writeHistoryFile();
  }

  reset(): void {
    this.fs = new VFS({ files: { ...this.base.files }, dirs: [...this.base.dirs] });
    this.cwd = this.base.cwd;
    this.previousCwd = null;
    this.remotes = new Map([...this.base.remotes].map(([url, remote]) => [url, remote.clone()]));
    this.history = [];
    this.env.PWD = this.cwd;
    this.writeHistoryFile();
    if (this.seed) this.runScript(this.seed);
    this.writeHistoryFile();
  }

  private gitContext(): GitContext {
    return { remotes: this.remotes };
  }

  private writeHistoryFile(): void {
    const home = '/home/labex';
    if (!this.fs.isDir(home)) this.fs.mkdirp(home);
    this.fs.writeFile(`${home}/.zsh_history`, this.history.map((line, i) => `: 170000000${i}:0;${line}`).join('\n') + (this.history.length ? '\n' : ''));
  }

  private record(line: string): void {
    this.history.push(line);
    this.writeHistoryFile();
  }

  /** Execute one interactive line, recording it in shell history. */
  run(input: string): ExecResult {
    const line = this.expandHistoryRecall(input.trim());
    if (!line) return { out: '', err: '', code: 0 };
    if (line.startsWith('!') && !line.startsWith('! ')) return { out: '', err: 'event not found\n', code: 1 };
    this.record(line);
    return this.exec(line);
  }

  private expandHistoryRecall(line: string): string {
    if (!line.startsWith('!')) return line;
    if (line === '!!') return this.history[this.history.length - 1] ?? line;
    const numeric = line.match(/^!(\d+)$/);
    if (numeric) return this.history[Number(numeric[1]) - 1] ?? line;
    const prefix = line.slice(1);
    const found = [...this.history].reverse().find((entry) => entry.startsWith(prefix));
    return found ?? line;
  }

  /** Execute a seeded script without touching the learner's history. */
  runScript(script: string): ExecResult {
    return this.exec(script);
  }

  /** Run a read-only check on a copy so a check can never mutate the lab. */
  check(command: string): { pass: boolean; out: string; err: string } {
    const clone = new Terminal({
      files: {},
      dirs: ['/'],
      cwd: this.cwd,
    });
    clone.fs = this.fs.clone();
    clone.cwd = this.cwd;
    clone.env = { ...this.env };
    clone.remotes = new Map([...this.remotes].map(([url, remote]) => [url, remote.clone()]));
    const result = clone.exec(command);
    return { pass: result.code === 0, out: result.out, err: result.err };
  }

  exec(input: string): ExecResult {
    let tokens: Token[];
    try {
      tokens = tokenize(input);
    } catch (error) {
      return { out: '', err: `syntax error: ${(error as Error).message}\n`, code: 2 };
    }
    const list = new Parser(tokens).parse();
    return this.runList(list);
  }

  private runList(list: ListItem[]): ExecResult {
    let out = '';
    let err = '';
    let code = 0;
    for (const item of list) {
      if (item.connector === '&&' && code !== 0) continue;
      if (item.connector === '||' && code === 0) continue;
      const result = this.runPipeline(item.stages);
      out += result.out;
      err += result.err;
      code = result.code;
    }
    return { out, err, code };
  }

  private runPipeline(stages: CommandNode[]): ExecResult {
    // Bash's `!` negates the whole pipeline, not just its first command.
    const negate = stages[0]?.type === 'simple' && stages[0].negate;
    if (negate) stages = [{ ...(stages[0] as SimpleCommand), negate: false }, ...stages.slice(1)];
    let stdin = '';
    let out = '';
    let err = '';
    let code = 0;
    for (let i = 0; i < stages.length; i += 1) {
      const result = this.runNode(stages[i], stdin);
      stdin = result.out;
      err += result.err;
      code = result.code;
      if (i === stages.length - 1) out = result.out;
    }
    if (negate) code = code === 0 ? 1 : 0;
    return { out, err, code };
  }

  private runNode(node: CommandNode, stdin: string): ExecResult {
    if (node.type === 'subshell') {
      const child = new Terminal({ files: {}, dirs: ['/'], cwd: this.cwd });
      child.fs = this.fs.clone();
      child.cwd = this.cwd;
      child.env = { ...this.env };
      child.history = [...this.history];
      child.remotes = new Map([...this.remotes].map(([url, remote]) => [url, remote.clone()]));
      const result = child.runList(node.list);
      return result;
    }
    if (node.type === 'if') {
      for (const branch of node.branches) {
        const cond = this.runList(branch.cond);
        if (cond.code === 0) return this.runList(branch.body);
      }
      return node.fallback ? this.runList(node.fallback) : { out: '', err: '', code: 0 };
    }
    return this.runSimple(node, stdin);
  }

  private expand(word: Word): string {
    let out = '';
    for (const segment of word.segments) {
      if (segment.quote === "'") {
        out += segment.text;
        continue;
      }
      out += this.expandText(segment.text);
    }
    return out;
  }

  /** Expand a simple `*`/`?` glob against the current directory. */
  private glob(pattern: string): string[] {
    const absolute = VFS.normalize(pattern, this.cwd);
    const slash = absolute.lastIndexOf('/');
    const dir = slash <= 0 ? '/' : absolute.slice(0, slash);
    const name = absolute.slice(slash + 1);
    if (!/[*?]/.test(name) || !this.fs.isDir(dir)) return [pattern];
    let source = '^';
    for (const ch of name) {
      if (ch === '*') source += '.*';
      else if (ch === '?') source += '.';
      else source += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    source += '$';
    const rx = new RegExp(source);
    let matches: string[] = [];
    try {
      matches = this.fs.list(dir).filter((entry) => rx.test(entry)).sort();
    } catch {
      return [pattern];
    }
    if (!matches.length) return [pattern];
    const prefix = pattern.includes('/') ? `${pattern.slice(0, pattern.lastIndexOf('/'))}/` : '';
    return matches.map((entry) => `${prefix}${entry}`);
  }

  private expandText(text: string): string {
    let out = '';
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '~' && (i === 0 || text[i - 1] === '=' || text[i - 1] === ':')) {
        out += this.env.HOME ?? '/home/labex';
        continue;
      }
      if (ch === '$') {
        if (text[i + 1] === '(') {
          let depth = 1;
          let j = i + 2;
          while (j < text.length && depth > 0) {
            if (text[j] === '(') depth += 1;
            else if (text[j] === ')') depth -= 1;
            j += 1;
          }
          const inner = text.slice(i + 2, j - 1);
          const result = this.exec(inner);
          out += result.out.replace(/\n+$/, '');
          i = j - 1;
          continue;
        }
        const braced = text.slice(i).match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}/);
        if (braced) {
          out += this.env[braced[1]] ?? '';
          i += braced[0].length - 1;
          continue;
        }
        const plain = text.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)/);
        if (plain) {
          out += this.env[plain[1]] ?? '';
          i += plain[0].length - 1;
          continue;
        }
      }
      out += ch;
    }
    return out;
  }

  private runSimple(node: SimpleCommand, stdin: string): ExecResult {
    const redirectsIn = node.redirects.filter((redirect) => redirect.op === '<');
    let input = stdin;
    for (const redirect of redirectsIn) {
      const path = VFS.normalize(this.expand(redirect.target), this.cwd);
      try {
        input = this.fs.readFile(path);
      } catch {
        return { out: '', err: `${this.expand(redirect.target)}: No such file or directory\n`, code: 1 };
      }
    }
    const words = node.words.flatMap((word) => {
      const value = this.expand(word);
      if (/[*?]/.test(value) && !word.segments.some((segment) => segment.quote)) return this.glob(value);
      return [value];
    });
    let result: ExecResult;
    if (words.length === 0) {
      result = { out: '', err: '', code: 0 };
    } else {
      const assignment = words[0].match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (assignment) {
        this.env[assignment[1]] = assignment[2];
        result = { out: '', err: '', code: 0 };
      } else {
        result = this.command(words[0], words.slice(1), input);
      }
    }
    const redirectsOut = node.redirects.filter((redirect) => redirect.op !== '<');
    if (redirectsOut.length > 0) {
      for (const redirect of redirectsOut) {
        const path = VFS.normalize(this.expand(redirect.target), this.cwd);
        try {
          this.fs.mkdirp(dirname(path));
          this.fs.writeFile(path, result.out, { append: redirect.op === '>>' });
        } catch (error) {
          return { out: '', err: `${(error as Error).message}\n`, code: 1 };
        }
      }
      result = { out: '', err: result.err, code: result.code };
    }
    if (node.negate) result = { ...result, code: result.code === 0 ? 1 : 0 };
    return result;
  }

  private command(name: string, args: string[], stdin: string): ExecResult {
    switch (name) {
      case 'echo':
        return this.echo(args);
      case 'cd':
        return this.cd(args);
      case 'pwd':
        return { out: `${this.cwd}\n`, err: '', code: 0 };
      case 'ls':
        return this.ls(args);
      case 'cat':
        return this.cat(args, stdin);
      case 'touch':
        return this.touch(args);
      case 'mkdir':
        return this.mkdir(args);
      case 'rm':
        return this.rm(args);
      case 'mv':
        return this.mv(args);
      case 'cp':
        return this.cp(args);
      case 'grep':
        return this.grep(args, stdin);
      case 'head':
      case 'tail':
        return this.headTail(name, args, stdin);
      case 'wc':
        return this.wc(args, stdin);
      case 'less':
        return this.cat(args, stdin);
      case 'history':
        return this.historyCommand();
      case 'export':
        for (const item of args) {
          const [key, ...rest] = item.split('=');
          if (rest.length) this.env[key] = rest.join('=');
        }
        return { out: '', err: '', code: 0 };
      case 'env':
        return { out: Object.entries(this.env).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', err: '', code: 0 };
      case 'true':
        return { out: '', err: '', code: 0 };
      case 'false':
        return { out: '', err: '', code: 1 };
      case '[':
      case 'test':
        return this.test(name === '[' ? args.filter((arg) => arg !== ']') : args);
      case 'clear':
        return { out: '', err: '', code: 0 };
      case 'help':
        return { out: HELP, err: '', code: 0 };
      case 'git':
        return this.git(args);
      case 'which':
        return { out: args.map((arg) => (COMMANDS.has(arg) ? `/usr/bin/${arg}` : `${arg} not found`)).join('\n') + '\n', err: '', code: 0 };
      default:
        return { out: '', err: `${name}: command not found\n`, code: 127 };
    }
  }

  private git(args: string[]): ExecResult {
    const result = new Git(this.fs, this.cwd, this.gitContext()).run(args);
    return { out: result.out, err: result.err, code: result.code };
  }

  private echo(args: string[]): ExecResult {
    let newline = true;
    let interpret = false;
    let start = 0;
    for (; start < args.length; start += 1) {
      if (args[start] === '-n') newline = false;
      else if (args[start] === '-e') interpret = true;
      else if (args[start] === '-E') interpret = false;
      else break;
    }
    let text = args.slice(start).join(' ');
    if (interpret) {
      text = text
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }
    return { out: `${text}${newline ? '\n' : ''}`, err: '', code: 0 };
  }

  private cd(args: string[]): ExecResult {
    const target = args[0] ?? this.env.HOME ?? '/home/labex';
    if (target === '-') {
      const next = this.previousCwd ?? this.cwd;
      this.previousCwd = this.cwd;
      this.cwd = next;
      return { out: `${next}\n`, err: '', code: 0 };
    }
    const path = VFS.normalize(target, this.cwd);
    if (!this.fs.isDir(path)) {
      return { out: '', err: `cd: no such file or directory: ${target}\n`, code: 1 };
    }
    this.previousCwd = this.cwd;
    this.cwd = path;
    this.env.PWD = path;
    return { out: '', err: '', code: 0 };
  }

  private ls(args: string[]): ExecResult {
    let showAll = false;
    let long = false;
    let recursive = false;
    const paths: string[] = [];
    for (const arg of args) {
      if (arg === '-a' || arg === '-la' || arg === '-al') showAll = true;
      if (arg === '-l' || arg === '-la' || arg === '-al') long = true;
      if (arg === '-R') recursive = true;
      if (!arg.startsWith('-')) paths.push(arg);
    }
    const targets = paths.length ? paths : ['.'];
    const lines: string[] = [];
    let code = 0;
    const render = (path: string, prefix: string) => {
      try {
        const names = this.fs.list(path);
        const visible = showAll ? ['.', '..', ...names] : names;
        for (const entry of visible) {
          const full = path === '/' ? `/${entry}` : `${path}/${entry}`;
          if (long) {
            const isDir = this.fs.isDir(full);
            lines.push(`${isDir ? 'drwxr-xr-x' : '-rw-r--r--'} 1 labex labex ${isDir ? 4096 : (this.fs.isFile(full) ? this.fs.readFile(full).length : 0)} ${entry}`);
          } else {
            lines.push(`${prefix}${entry}`);
          }
        }
        if (recursive) {
          for (const name of names) {
            const full = path === '/' ? `/${name}` : `${path}/${name}`;
            if (this.fs.isDir(full)) {
              lines.push('');
              lines.push(`${full}:`);
              render(full, prefix);
            }
          }
        }
      } catch {
        code = 1;
      }
    };
    for (const target of targets) {
      const path = VFS.normalize(target, this.cwd);
      if (!this.fs.exists(path)) {
        return { out: '', err: `ls: ${target}: No such file or directory\n`, code: 1 };
      }
      if (this.fs.isFile(path)) {
        lines.push(target);
      } else {
        if (targets.length > 1) lines.push(`${target}:`);
        render(path, '');
      }
    }
    return { out: lines.length ? `${lines.join('\n')}\n` : '', err: '', code };
  }

  private cat(args: string[], stdin: string): ExecResult {
    if (args.length === 0) return { out: stdin, err: '', code: 0 };
    let out = '';
    for (const arg of args) {
      if (arg === '-') {
        out += stdin;
        continue;
      }
      const path = VFS.normalize(arg, this.cwd);
      if (!this.fs.exists(path)) return { out, err: `cat: ${arg}: No such file or directory\n`, code: 1 };
      if (this.fs.isDir(path)) return { out, err: `cat: ${arg}: Is a directory\n`, code: 1 };
      out += this.fs.readFile(path);
    }
    return { out, err: '', code: 0 };
  }

  private touch(args: string[]): ExecResult {
    for (const arg of args) {
      const path = VFS.normalize(arg, this.cwd);
      if (!this.fs.exists(path)) {
        try {
          this.fs.writeFile(path, '');
        } catch (error) {
          return { out: '', err: `touch: ${(error as Error).message}\n`, code: 1 };
        }
      }
    }
    return { out: '', err: '', code: 0 };
  }

  private mkdir(args: string[]): ExecResult {
    const recursive = args.includes('-p');
    for (const arg of args.filter((item) => !item.startsWith('-'))) {
      const path = VFS.normalize(arg, this.cwd);
      try {
        if (recursive) this.fs.mkdirp(path);
        else this.fs.mkdir(path);
      } catch (error) {
        return { out: '', err: `mkdir: ${(error as Error).message}\n`, code: 1 };
      }
    }
    return { out: '', err: '', code: 0 };
  }

  private rm(args: string[]): ExecResult {
    const recursive = args.some((arg) => arg.startsWith('-') && arg.includes('r'));
    const force = args.some((arg) => arg.startsWith('-') && arg.includes('f'));
    let err = '';
    for (const arg of args.filter((item) => !item.startsWith('-'))) {
      const path = VFS.normalize(arg, this.cwd);
      if (!this.fs.exists(path)) {
        if (!force) err += `rm: ${arg}: No such file or directory\n`;
        continue;
      }
      try {
        this.fs.remove(path, { recursive });
      } catch (error) {
        err += `rm: ${(error as Error).message}\n`;
      }
    }
    return { out: '', err, code: err ? 1 : 0 };
  }

  private mv(args: string[]): ExecResult {
    if (args.length < 2) return { out: '', err: 'mv: missing destination file operand\n', code: 1 };
    const from = VFS.normalize(args[0], this.cwd);
    const to = VFS.normalize(args[1], this.cwd);
    try {
      this.fs.rename(from, to);
      return { out: '', err: '', code: 0 };
    } catch (error) {
      return { out: '', err: `mv: ${(error as Error).message}\n`, code: 1 };
    }
  }

  private cp(args: string[]): ExecResult {
    const items = args.filter((item) => !item.startsWith('-'));
    if (items.length < 2) return { out: '', err: 'cp: missing destination file operand\n', code: 1 };
    try {
      this.fs.copy(VFS.normalize(items[0], this.cwd), VFS.normalize(items[1], this.cwd));
      return { out: '', err: '', code: 0 };
    } catch (error) {
      return { out: '', err: `cp: ${(error as Error).message}\n`, code: 1 };
    }
  }

  private grep(args: string[], stdin: string): ExecResult {
    let quiet = false;
    let invert = false;
    let ignoreCase = false;
    let lineNumbers = false;
    let recursive = false;
    const rest: string[] = [];
    for (const arg of args) {
      if (arg.startsWith('-') && arg.length > 1 && !arg.startsWith('--')) {
        if (arg.includes('q')) quiet = true;
        if (arg.includes('v')) invert = true;
        if (arg.includes('i')) ignoreCase = true;
        if (arg.includes('n')) lineNumbers = true;
        if (arg.includes('r') || arg.includes('R')) recursive = true;
      } else rest.push(arg);
    }
    const pattern = rest.shift();
    if (pattern === undefined) return { out: '', err: 'grep: no pattern\n', code: 2 };
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, ignoreCase ? 'i' : '');
    } catch {
      if (!quiet) return { out: '', err: 'grep: invalid pattern\n', code: 2 };
      return { out: '', err: '', code: 2 };
    }
    const files = rest.length ? rest : [];
    const evaluate = (text: string, label: string): { out: string; found: boolean } => {
      const lines = text.split('\n');
      const matched: string[] = [];
      lines.forEach((line, index) => {
        if (regex.test(line) !== invert) {
          matched.push(`${files.length > 1 || recursive ? `${label}:` : ''}${lineNumbers ? `${index + 1}:` : ''}${line}`);
        }
      });
      return { out: matched.join('\n') + (matched.length ? '\n' : ''), found: matched.length > 0 };
    };
    let out = '';
    let found = false;
    if (files.length === 0) {
      const result = evaluate(stdin, '(standard input)');
      return quiet ? { out: '', err: '', code: result.found ? 0 : 1 } : { out: result.out, err: '', code: result.found ? 0 : 1 };
    }
    for (const arg of files) {
      const path = VFS.normalize(arg, this.cwd);
      try {
        if (this.fs.isDir(path)) {
          if (!recursive) continue;
          for (const child of this.fs.walk(path)) {
            if (!this.fs.isFile(child)) continue;
            const result = evaluate(this.fs.readFile(child), arg === '.' ? child.replace(`${this.cwd}/`, '') : child);
            out += result.out;
            found = found || result.found;
          }
        } else {
          const result = evaluate(this.fs.readFile(path), arg);
          out += result.out;
          found = found || result.found;
        }
      } catch {
        return { out, err: `grep: ${arg}: No such file or directory\n`, code: 2 };
      }
    }
    return quiet ? { out: '', err: '', code: found ? 0 : 1 } : { out, err: '', code: found ? 0 : 1 };
  }

  private headTail(name: 'head' | 'tail', args: string[], stdin: string): ExecResult {
    let count = 10;
    const rest: string[] = [];
    for (let i = 0; i < args.length; i += 1) {
      if (args[i] === '-n' && args[i + 1]) {
        count = Number(args[i + 1]) || 10;
        i += 1;
      } else if (/^-\d+$/.test(args[i])) {
        count = Number(args[i].slice(1));
      } else if (!args[i].startsWith('-')) rest.push(args[i]);
    }
    let text = stdin;
    if (rest.length) {
      try {
        text = this.fs.readFile(VFS.normalize(rest[0], this.cwd));
      } catch {
        return { out: '', err: `${name}: ${rest[0]}: No such file or directory\n`, code: 1 };
      }
    }
    const lines = text.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    const selected = name === 'head' ? lines.slice(0, count) : lines.slice(-count);
    return { out: selected.length ? `${selected.join('\n')}\n` : '', err: '', code: 0 };
  }

  private wc(args: string[], stdin: string): ExecResult {
    const linesOnly = args.includes('-l');
    const rest = args.filter((arg) => !arg.startsWith('-'));
    let text = stdin;
    if (rest.length) {
      try {
        text = this.fs.readFile(VFS.normalize(rest[0], this.cwd));
      } catch {
        return { out: '', err: `wc: ${rest[0]}: No such file or directory\n`, code: 1 };
      }
    }
    if (text && !text.endsWith('\n')) text += '\n';
    const count = text ? text.split('\n').length - 1 : 0;
    if (linesOnly) return { out: `${count}${rest.length ? ` ${rest[0]}` : ''}\n`, err: '', code: 0 };
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { out: `${count} ${words} ${text.length}${rest.length ? ` ${rest[0]}` : ''}\n`, err: '', code: 0 };
  }

  private historyCommand(): ExecResult {
    return {
      out: this.history.map((line, i) => `${String(i + 1).padStart(4, ' ')}  ${line}`).join('\n') + (this.history.length ? '\n' : ''),
      err: '',
      code: 0,
    };
  }

  private test(args: string[]): ExecResult {
    const negate = args[0] === '!';
    if (negate) args = args.slice(1);
    let pass = false;
    if (args.length === 1) pass = args[0].length > 0;
    else if (args.length === 2) {
      const [op, value] = args;
      if (op === '-z') pass = value.length === 0;
      else if (op === '-n') pass = value.length > 0;
      else if (op === '-e') pass = this.fs.exists(VFS.normalize(value, this.cwd));
      else if (op === '-f') pass = this.fs.isFile(VFS.normalize(value, this.cwd));
      else if (op === '-d') pass = this.fs.isDir(VFS.normalize(value, this.cwd));
      else if (op === '!') pass = !this.fs.exists(VFS.normalize(value, this.cwd));
    } else if (args.length >= 3) {
      const [left, op, right] = args;
      if (op === '=' || op === '==') pass = left === right;
      else if (op === '!=') pass = left !== right;
      else if (op === '-eq') pass = Number(left) === Number(right);
      else if (op === '-ne') pass = Number(left) !== Number(right);
      else if (op === '-gt') pass = Number(left) > Number(right);
      else if (op === '-ge') pass = Number(left) >= Number(right);
      else if (op === '-lt') pass = Number(left) < Number(right);
      else if (op === '-le') pass = Number(left) <= Number(right);
    }
    if (negate) pass = !pass;
    return { out: '', err: '', code: pass ? 0 : 1 };
  }
}

const COMMANDS = new Set([
  'echo', 'cd', 'pwd', 'ls', 'cat', 'touch', 'mkdir', 'rm', 'mv', 'cp', 'grep', 'head', 'tail',
  'wc', 'less', 'history', 'export', 'env', 'true', 'false', '[', 'test', 'clear', 'help', 'git', 'which',
]);

function defaultFiles(): Record<string, string> {
  return {
    '/home/labex/.zshrc': '# LabEx shell\n',
    '/home/labex/README.txt': 'Welcome to the offline lab terminal. Type `help` for commands.\n',
  };
}

const HELP = `Offline lab terminal — supported commands:
  ls, cd, pwd, cat, echo, touch, mkdir, rm, mv, cp, grep, head, tail, wc, less
  history, export, env, true, false, test, [ ... ], git
Shell syntax: && || ; | > >> < $(...) if/then/else/fi
`;

export function isGitUnavailable(error: unknown): boolean {
  return error instanceof GitError;
}
