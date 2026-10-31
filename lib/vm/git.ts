/**
 * A real (small) Git implementation over the in-memory filesystem.
 *
 * It exists so a Git lab can be a build, not a quiz: learners type actual
 * `git` commands, the repo state changes, and each task is graded against the
 * resulting refs, index, worktree and reflog. Subcommands cover what the labs
 * teach — clone/push against a simulated remote, branches, stash, merge,
 * rebase, cherry-pick, reset, restore, reflog, bisect — and nothing touches
 * the network.
 *
 * Repo state lives in `.git` as readable files (HEAD, refs, config, logs),
 * so `cat .git/HEAD` and `git config --list` behave like the real thing.
 */

import { VFS, basename, dirname, objectHash } from './fs';

export interface GitCommit {
  sha: string;
  tree: Record<string, string>;
  parents: string[];
  message: string;
  author: string;
  email: string;
  time: number;
}

interface StashEntry {
  sha: string;
  message: string;
  time: number;
}

export interface GitContext {
  remotes: Map<string, VFS>;
}

export interface GitResult {
  out: string;
  err: string;
  code: number;
}

const EMPTY: Record<string, string> = {};
const TZ = '+0000';
const DEFAULT_NAME = 'LabEx Learner';
const DEFAULT_EMAIL = 'learner@labex.io';
const MASTER = 'master';

const DAY = 24 * 60 * 60;
const fixed = Date.UTC(2023, 3, 27, 10, 0, 0) / 1000;

export class GitError extends Error {}

export function normalizeRemote(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\.git$/, '');
}

function configText(map: Map<string, string>): string {
  const groups = new Map<string, Map<string, string>>();
  for (const [key, value] of map) {
    const dot = key.indexOf('.');
    if (dot < 0) continue;
    const section = key.slice(0, dot);
    const rest = key.slice(dot + 1);
    const inner = rest.indexOf('.');
    let header = section;
    let name = rest;
    if (inner >= 0) {
      header = `${section} "${rest.slice(0, inner)}"`;
      name = rest.slice(inner + 1);
    }
    if (!groups.has(header)) groups.set(header, new Map());
    groups.get(header)!.set(name, value);
  }
  const lines: string[] = [];
  for (const [header, entries] of groups) {
    lines.push(`[${header}]`);
    for (const [name, value] of entries) lines.push(`\t${name} = ${value}`);
  }
  return `${lines.join('\n')}\n`;
}

function parseConfig(text: string): Map<string, string> {
  const map = new Map<string, string>();
  let section = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      const value = header[1];
      const quoted = value.match(/^([a-zA-Z0-9-]+)\s+"([^"]+)"$/);
      section = quoted ? `${quoted[1]}.${quoted[2]}` : value.trim();
      continue;
    }
    const entry = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (entry && section) map.set(`${section}.${entry[1].trim()}`, entry[2].trim());
  }
  return map;
}

function stamp(time: number): string {
  const date = new Date(time * 1000);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${days[date.getUTCDay()]} ${months[date.getUTCMonth()]} ${date.getUTCDate()} ${pad(
    date.getUTCHours()
  )}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${date.getUTCFullYear()} ${TZ}`;
}

function short(sha: string): string {
  return sha.slice(0, 7);
}

function emptyTree(): Record<string, string> {
  return {};
}

function cloneTree(tree: Record<string, string>): Record<string, string> {
  return { ...tree };
}

function diffLines(before: string, after: string): string[] {
  const a = before.length ? before.replace(/\n$/, '').split('\n') : [];
  const b = after.length ? after.replace(/\n$/, '').split('\n') : [];
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const lines: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      lines.push(` ${a[i]}`);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push(`-${a[i]}`);
      i += 1;
    } else {
      lines.push(`+${b[j]}`);
      j += 1;
    }
  }
  while (i < a.length) {
    lines.push(`-${a[i]}`);
    i += 1;
  }
  while (j < b.length) {
    lines.push(`+${b[j]}`);
    j += 1;
  }
  return lines;
}

function fileHunk(path: string, before: string, after: string): string {
  const a = before.length ? before.replace(/\n$/, '').split('\n') : [];
  const b = after.length ? after.replace(/\n$/, '').split('\n') : [];
  const body = diffLines(before, after);
  return [
    `diff --git a/${path} b/${path}`,
    `index ${objectHash(before).slice(0, 7)}..${objectHash(after).slice(0, 7)} 100644`,
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,${a.length} +1,${b.length} @@`,
    ...body,
    '',
  ].join('\n');
}

function diffTrees(a: Record<string, string>, b: Record<string, string>): string {
  const paths = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  let out = '';
  for (const path of paths) {
    const before = a[path] ?? '';
    const after = b[path] ?? '';
    if (before === after) continue;
    out += fileHunk(path, before, after);
  }
  return out;
}

function parseDurationDays(value: string): number | null {
  const match = value.match(/^(\d+)\s*(day|week|month|year)s?(?:\s+ago)?$/i);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'day') return n;
  if (unit === 'week') return n * 7;
  if (unit === 'month') return n * 30;
  return n * 365;
}

function parseDate(value: string): number | null {
  const cleaned = value.trim();
  const ago = parseDurationDays(cleaned);
  if (ago !== null) return fixed - ago * DAY;
  const parsed = Date.parse(cleaned);
  if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  const month = cleaned.match(/^([A-Za-z]{3})\s+(\d{1,2})(?:\s+(\d{4}))?$/);
  if (month) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const index = months.indexOf(month[1].toLowerCase());
    if (index >= 0) {
      return Date.UTC(Number(month[3] || 2023), index, Number(month[2]), 12) / 1000;
    }
  }
  return null;
}

export class GitRepo {
  readonly fs: VFS;
  readonly root: string;
  readonly dir: string;

  constructor(fs: VFS, root: string) {
    this.fs = fs;
    this.root = root;
    this.dir = `${root === '/' ? '' : root}/.git`;
  }

  static open(fs: VFS, start: string): GitRepo | null {
    let dir = start;
    for (;;) {
      if (fs.isDir(`${dir === '/' ? '' : dir}/.git`)) return new GitRepo(fs, dir);
      if (dir === '/') return null;
      dir = dirname(dir);
    }
  }

  static init(fs: VFS, root: string, branch = MASTER): GitRepo {
    const repo = new GitRepo(fs, root);
    fs.mkdirp(repo.dir);
    fs.mkdirp(`${repo.dir}/objects`);
    fs.mkdirp(`${repo.dir}/refs/heads`);
    fs.mkdirp(`${repo.dir}/refs/tags`);
    fs.mkdirp(`${repo.dir}/logs`);
    repo.writeHead(`ref: refs/heads/${branch}`);
    repo.setConfig('core.repositoryformatversion', '0');
    repo.setConfig('core.filemode', 'true');
    repo.setConfig('core.bare', 'false');
    return repo;
  }

  /* ---------- config ---------- */

  config(): Map<string, string> {
    const map = new Map<string, string>();
    const globalPath = '/home/labex/.gitconfig';
    if (this.fs.isFile(globalPath)) {
      for (const [key, value] of parseConfig(this.fs.readFile(globalPath))) map.set(key, value);
    }
    if (this.fs.isFile(`${this.dir}/config`)) {
      for (const [key, value] of parseConfig(this.fs.readFile(`${this.dir}/config`))) map.set(key, value);
    }
    return map;
  }

  getConfig(key: string): string | undefined {
    return this.config().get(key);
  }

  setConfig(key: string, value: string, scope: 'local' | 'global' = 'local'): void {
    const path = scope === 'global' ? '/home/labex/.gitconfig' : `${this.dir}/config`;
    const map = this.fs.isFile(path) ? parseConfig(this.fs.readFile(path)) : new Map<string, string>();
    map.set(key, value);
    this.fs.writeFile(path, configText(map));
  }

  unsetConfig(key: string, scope: 'local' | 'global' = 'local'): void {
    const path = scope === 'global' ? '/home/labex/.gitconfig' : `${this.dir}/config`;
    if (!this.fs.isFile(path)) return;
    const map = parseConfig(this.fs.readFile(path));
    map.delete(key);
    this.fs.writeFile(path, configText(map));
  }

  identity(): { name: string; email: string } {
    const config = this.config();
    return {
      name: config.get('user.name') || DEFAULT_NAME,
      email: config.get('user.email') || DEFAULT_EMAIL,
    };
  }

  /* ---------- refs ---------- */

  readHead(): string {
    return this.fs.readFile(`${this.dir}/HEAD`).trim();
  }

  writeHead(value: string): void {
    this.fs.writeFile(`${this.dir}/HEAD`, `${value}\n`);
  }

  headRef(): string | null {
    const head = this.readHead();
    return head.startsWith('ref: ') ? head.slice(5).trim() : null;
  }

  headSha(): string | null {
    const head = this.readHead();
    if (head.startsWith('ref: ')) return this.readRef(head.slice(5).trim());
    return head || null;
  }

  currentBranch(): string | null {
    const ref = this.headRef();
    return ref && ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : null;
  }

  readRef(ref: string): string | null {
    const path = `${this.dir}/${ref}`;
    if (this.fs.isFile(path)) return this.fs.readFile(path).trim();
    const packed = `${this.dir}/packed-refs`;
    if (this.fs.isFile(packed)) {
      for (const line of this.fs.readFile(packed).split('\n')) {
        const row = line.trim().split(/\s+/);
        if (row.length === 2 && row[1] === ref) return row[0];
      }
    }
    return null;
  }

  writeRef(ref: string, sha: string | null): void {
    const path = `${this.dir}/${ref}`;
    if (sha === null) {
      if (this.fs.isFile(path)) this.fs.remove(path);
      return;
    }
    this.fs.mkdirp(dirname(path));
    this.fs.writeFile(path, `${sha}\n`);
  }

  refs(prefix = ''): [string, string][] {
    const base = `${this.dir}/refs`;
    if (!this.fs.isDir(base)) return [];
    return this.fs
      .walk(base)
      .filter((path) => this.fs.isFile(path))
      .map((path) => [`refs/${path.slice(base.length + 1)}`, this.fs.readFile(path).trim()] as [string, string])
      .filter(([ref]) => ref.startsWith(prefix))
      .sort(([a], [b]) => a.localeCompare(b));
  }

  allRefs(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [ref, sha] of this.refs()) map.set(ref, sha);
    return map;
  }

  /* ---------- objects ---------- */

  objectPath(sha: string): string {
    return `${this.dir}/objects/${sha.slice(0, 2)}/${sha.slice(2)}`;
  }

  readCommit(sha: string | null): GitCommit | null {
    if (!sha) return null;
    const path = this.objectPath(sha);
    if (!this.fs.isFile(path)) {
      // Allow abbreviated SHAs.
      const dir = `${this.dir}/objects/${sha.slice(0, 2)}`;
      if (sha.length < 40 && this.fs.isDir(dir)) {
        const match = this.fs.list(dir).find((name) => `${sha.slice(0, 2)}${name}`.startsWith(sha));
        if (match) return this.readCommit(`${sha.slice(0, 2)}${match}`);
      }
      return null;
    }
    try {
      return JSON.parse(this.fs.readFile(path)) as GitCommit;
    } catch {
      return null;
    }
  }

  writeCommit(commit: GitCommit): void {
    const path = this.objectPath(commit.sha);
    this.fs.mkdirp(dirname(path));
    this.fs.writeFile(path, JSON.stringify(commit));
  }

  allCommits(): GitCommit[] {
    if (!this.fs.isDir(`${this.dir}/objects`)) return [];
    const out: GitCommit[] = [];
    for (const dir of this.fs.list(`${this.dir}/objects`)) {
      const full = `${this.dir}/objects/${dir}`;
      if (!this.fs.isDir(full)) continue;
      for (const file of this.fs.list(full)) {
        const commit = this.readCommit(`${dir}${file}`);
        if (commit) out.push(commit);
      }
    }
    return out;
  }

  /* ---------- index + worktree ---------- */

  index(): Map<string, string> {
    const path = `${this.dir}/index`;
    if (!this.fs.isFile(path)) return new Map();
    try {
      return new Map(Object.entries(JSON.parse(this.fs.readFile(path)) as Record<string, string>));
    } catch {
      return new Map();
    }
  }

  writeIndex(index: Map<string, string>): void {
    this.fs.writeFile(`${this.dir}/index`, JSON.stringify(Object.fromEntries(index)));
  }

  worktree(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [path, content] of Object.entries(this.fs.snapshot())) {
      if (path.startsWith(`${this.dir}/`) || path === this.dir) continue;
      if (!path.startsWith(`${this.root}/`)) continue;
      map.set(path.slice(this.root.length + 1), content);
    }
    return map;
  }

  /** Write a tree to the worktree and index, leaving untracked files alone. */
  applyTree(tree: Record<string, string>, opts: { worktree?: boolean; index?: boolean } = { worktree: true, index: true }): void {
    if (opts.worktree) {
      const tracked = this.index();
      for (const path of tracked.keys()) {
        const full = `${this.root}/${path}`;
        if (!(path in tree) && this.fs.exists(full)) this.fs.remove(full);
      }
      for (const [path, content] of Object.entries(tree)) {
        this.fs.mkdirp(dirname(`${this.root}/${path}`));
        this.fs.writeFile(`${this.root}/${path}`, content);
      }
    }
    if (opts.index) this.writeIndex(new Map(Object.entries(tree)));
  }

  /* ---------- commits ---------- */

  headCommit(): GitCommit | null {
    return this.readCommit(this.headSha());
  }

  commitTree(rev?: string): Record<string, string> {
    if (!rev || rev === 'HEAD') return this.headCommit()?.tree ?? emptyTree();
    return this.resolveCommit(rev).tree;
  }

  nextTime(parents: string[]): number {
    let time = Math.floor(Date.now() / 1000);
    for (const parent of parents) {
      const commit = this.readCommit(parent);
      if (commit && commit.time >= time) time = commit.time + 60;
    }
    return time;
  }

  createCommit(tree: Record<string, string>, message: string, parents: string[], author?: { name: string; email: string }): GitCommit {
    const who = author ?? this.identity();
    const time = this.nextTime(parents);
    const sha = objectHash(
      JSON.stringify({ tree, parents, message, author: who.name, email: who.email, time })
    );
    const commit: GitCommit = { sha, tree, parents, message, author: who.name, email: who.email, time };
    this.writeCommit(commit);
    return commit;
  }

  updateRefAfterCommit(commit: GitCommit, kind: 'commit' | 'merge' | 'cherry-pick' = 'commit', detail?: string): void {
    const ref = this.headRef();
    const old = this.headSha() ?? '0000000';
    if (ref) this.writeRef(ref, commit.sha);
    else this.writeHead(`${commit.sha}\n`);
    const who = this.identity();
    const suffix = kind === 'merge' ? `merge${detail ? ` ${detail}` : ''}: ${commit.message}` : `${kind}: ${commit.message}`;
    this.appendReflog(old, commit.sha, who, suffix);
    if (ref) this.appendReflog(old, commit.sha, who, suffix, `${this.dir}/logs/${ref}`);
  }

  appendReflog(
    old: string,
    next: string,
    who: { name: string; email: string },
    action: string,
    path = `${this.dir}/logs/HEAD`
  ): void {
    const time = Math.floor(Date.now() / 1000);
    const line = `${old} ${next} ${who.name} <${who.email}> ${time} ${TZ}\t${action}\n`;
    const current = this.fs.isFile(path) ? this.fs.readFile(path) : '';
    this.fs.mkdirp(dirname(path));
    this.fs.writeFile(path, current + line);
  }

  reflog(): string[] {
    const path = `${this.dir}/logs/HEAD`;
    if (!this.fs.isFile(path)) return [];
    return this.fs.readFile(path).split('\n').filter(Boolean);
  }

  /* ---------- revisions ---------- */

  resolveCommit(rev: string): GitCommit {
    const clean = rev.trim();
    if (!clean) throw new GitError('ambiguous argument: unknown revision');
    if (clean.startsWith('stash@{')) {
      const entries = this.stashes();
      const index = Number(clean.slice(6, -1)) || 0;
      const entry = entries[index];
      if (!entry) throw new GitError(`log for '${clean}' is empty`);
      const commit = this.readCommit(entry.sha);
      if (!commit) throw new GitError(`unknown revision ${clean}`);
      return commit;
    }
    const chain = clean.match(/^(.+?)((?:(?:~|\^)\d*)+)$/);
    if (chain) {
      let commit = this.resolveCommit(chain[1]);
      const ops = chain[2].match(/[~^]\d*/g) ?? [];
      for (const op of ops) {
        const count = Number(op.slice(1) || (op[0] === '~' ? 1 : 1));
        for (let i = 0; i < count; i += 1) {
          const parent = this.readCommit(commit.parents[0] ?? null);
          if (!parent) throw new GitError(`unknown revision ${clean}`);
          commit = parent;
        }
      }
      return commit;
    }
    if (clean === 'HEAD') {
      const commit = this.headCommit();
      if (!commit) throw new GitError("HEAD does not point to a commit");
      return commit;
    }
    const refsToTry = [
      clean,
      `refs/heads/${clean}`,
      `refs/remotes/${clean}`,
      `refs/tags/${clean}`,
      `refs/remotes/${clean.includes('/') ? clean : `origin/${clean}`}`,
    ];
    for (const ref of refsToTry) {
      const sha = this.readRef(ref);
      if (sha) {
        const commit = this.readCommit(sha);
        if (commit) return commit;
      }
    }
    const commit = this.readCommit(clean);
    if (commit) return commit;
    throw new GitError(`unknown revision or path not in the working tree: ${rev}`);
  }

  resolveTree(rev: string): Record<string, string> {
    return rev ? this.resolveCommit(rev).tree : emptyTree();
  }

  revisionExists(rev: string): boolean {
    try {
      this.resolveCommit(rev);
      return true;
    } catch {
      return false;
    }
  }

  describeRef(sha: string): string {
    const parts: string[] = [];
    const headRef = this.headRef();
    if (headRef && this.readRef(headRef) === sha) parts.push(`HEAD -> ${this.currentBranch() ?? short(sha)}`);
    for (const [ref, value] of this.refs('refs/heads/')) {
      if (value === sha && ref !== headRef) parts.push(ref.replace('refs/heads/', ''));
    }
    for (const [ref, value] of this.refs('refs/tags/')) {
      if (value === sha) parts.push(`tag: ${ref.replace('refs/tags/', '')}`);
    }
    for (const [ref, value] of this.refs('refs/remotes/')) {
      if (value === sha) parts.push(ref.replace('refs/remotes/', ''));
    }
    return parts.length ? ` (${parts.join(', ')})` : '';
  }

  /* ---------- stash ---------- */

  stashes(): StashEntry[] {
    const path = `${this.dir}/stash.json`;
    if (!this.fs.isFile(path)) return [];
    try {
      return JSON.parse(this.fs.readFile(path)) as StashEntry[];
    } catch {
      return [];
    }
  }

  writeStashes(entries: StashEntry[]): void {
    this.fs.writeFile(`${this.dir}/stash.json`, JSON.stringify(entries));
  }

  /* ---------- history helpers ---------- */

  ancestors(sha: string): Set<string> {
    const seen = new Set<string>();
    const queue = [sha];
    while (queue.length) {
      const next = queue.pop()!;
      if (seen.has(next)) continue;
      seen.add(next);
      const commit = this.readCommit(next);
      if (commit) queue.push(...commit.parents);
    }
    return seen;
  }

  isAncestor(maybeAncestor: string, sha: string): boolean {
    return this.ancestors(sha).has(maybeAncestor);
  }

  mergeBase(a: string, b: string): string | null {
    const mine = this.ancestors(a);
    const queue = [b];
    const seen = new Set<string>();
    while (queue.length) {
      const next = queue.shift()!;
      if (seen.has(next)) continue;
      seen.add(next);
      if (mine.has(next)) return next;
      const commit = this.readCommit(next);
      if (commit) queue.push(...commit.parents);
    }
    return null;
  }

  commitsFrom(start: string | null, opts: { all?: boolean; remotes?: boolean; lookup?: string[] } = {}): GitCommit[] {
    const seen = new Set<string>();
    const list: GitCommit[] = [];
    const push = (sha: string | null) => {
      if (!sha || seen.has(sha)) return;
      const commit = this.readCommit(sha);
      if (!commit) return;
      seen.add(sha);
      list.push(commit);
      for (const parent of commit.parents) push(parent);
    };
    if (opts.lookup) {
      for (const rev of opts.lookup) push(this.resolveCommit(rev).sha);
    } else if (opts.all || opts.remotes) {
      const refs = opts.remotes ? this.refs('refs/remotes/') : [...this.refs()];
      for (const [, sha] of refs) push(sha);
      if (!opts.remotes) push(this.headSha());
    } else {
      push(this.headSha());
    }
    list.sort((a, b) => b.time - a.time);
    return list;
  }

  /* ---------- remote helpers ---------- */

  remoteUrl(name: string): string | null {
    return this.getConfig(`remote.${name}.url`) ?? null;
  }

  importObjects(source: VFS, sourceRoot: string): void {
    const sourceGit = `${sourceRoot === '/' ? '' : sourceRoot}/.git/objects`;
    if (!source.isDir(sourceGit)) return;
    for (const dir of source.list(sourceGit)) {
      const full = `${sourceGit}/${dir}`;
      if (!source.isDir(full)) continue;
      for (const file of source.list(full)) {
        const target = `${this.dir}/objects/${dir}/${file}`;
        this.fs.mkdirp(dirname(target));
        this.fs.writeFile(target, source.readFile(`${full}/${file}`));
      }
    }
  }

  importRemoteRefs(url: string, ctx: GitContext): void {
    const normalized = normalizeRemote(url);
    const remote = ctx.remotes.get(normalized);
    if (!remote) throw new GitError(`'${url}' does not appear to be a git repository`);
    this.importObjects(remote, remoteRoot(remote));
    const remoteRepo = new GitRepo(remote, remoteRoot(remote));
    for (const [ref, sha] of remoteRepo.refs('refs/heads/')) {
      const branch = ref.replace('refs/heads/', '');
      this.writeRef(`refs/remotes/origin/${branch}`, sha);
    }
  }

  pushRefToRemote(url: string, branch: string, sha: string, ctx: GitContext): VFS {
    const normalized = normalizeRemote(url);
    let remote = ctx.remotes.get(normalized);
    if (!remote) {
      remote = new VFS();
      remote.mkdirp('/remote');
      GitRepo.init(remote, '/remote');
      ctx.remotes.set(normalized, remote);
    }
    const remoteRepo = new GitRepo(remote, remoteRoot(remote));
    const local = remote as VFS;
    for (const commit of this.commitsFromAllForPush()) {
      const path = `${remoteRepo.dir}/objects/${commit.sha.slice(0, 2)}/${commit.sha.slice(2)}`;
      local.mkdirp(dirname(path));
      local.writeFile(path, JSON.stringify(commit));
    }
    remoteRepo.writeRef(`refs/heads/${branch}`, sha);
    return remote;
  }

  commitsFromAllForPush(): GitCommit[] {
    const all = this.allCommits();
    return all;
  }
}

function remoteRoot(fs: VFS): string {
  return fs.exists('/srv/remote/.git') ? '/srv/remote' : '/remote';
}

/* ---------------- command dispatcher ---------------- */

interface Parsed {
  flags: string[];
  args: string[];
}

function parseArgs(list: string[]): Parsed {
  const flags: string[] = [];
  const args: string[] = [];
  let paths = false;
  for (const item of list) {
    if (item === '--') {
      paths = true;
      continue;
    }
    if (!paths && item.startsWith('-') && item !== '-') flags.push(item);
    else args.push(item);
  }
  return { flags, args };
}

/** `git commit -am "msg"` — split combined short flags into `-a -m`. */
function expandShortFlags(argv: string[]): string[] {
  const out: string[] = [];
  for (const item of argv) {
    if (/^-[A-Za-z]{2,}$/.test(item)) {
      for (const ch of item.slice(1)) out.push(`-${ch}`);
    } else out.push(item);
  }
  return out;
}

function flagValue(argv: string[], names: string[]): string | null {
  for (let i = 0; i < argv.length; i += 1) {
    for (const name of names) {
      if (argv[i] === name && argv[i + 1] !== undefined) return argv[i + 1];
      if (argv[i].startsWith(`${name}=`)) return argv[i].slice(name.length + 1);
    }
  }
  return null;
}

/** Positional arguments, skipping the value of the flags in `withValue`. */
function positionals(argv: string[], withValue: string[] = []): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--') {
      out.push(...argv.slice(i + 1));
      break;
    }
    if (withValue.includes(item)) {
      i += 1;
      continue;
    }
    if (withValue.some((name) => item.startsWith(`${name}=`))) continue;
    if (item.startsWith('-') && item !== '-') continue;
    out.push(item);
  }
  return out;
}

function hasFlag(flags: string[], ...names: string[]): boolean {
  return names.some((name) => flags.includes(name) || flags.some((flag) => flag.startsWith(`${name}=`)));
}

function sortByName(names: string[]): string[] {
  return names.sort((a, b) => a.localeCompare(b));
}

function mergeTrees(
  base: Record<string, string>,
  ours: Record<string, string>,
  theirs: Record<string, string>
): { tree: Record<string, string>; conflicts: string[] } {
  const tree: Record<string, string> = {};
  const conflicts: string[] = [];
  const paths = new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)]);
  for (const path of paths) {
    const b = base[path];
    const o = ours[path];
    const t = theirs[path];
    if (o === t) {
      if (o !== undefined) tree[path] = o;
    } else if (o === b) {
      if (t !== undefined) tree[path] = t;
    } else if (t === b) {
      if (o !== undefined) tree[path] = o;
    } else {
      conflicts.push(path);
      tree[path] = `<<<<<<< HEAD\n${o ?? ''}=======\n${t ?? ''}>>>>>>> theirs\n`;
    }
  }
  return { tree, conflicts };
}

export class Git {
  readonly fs: VFS;
  readonly cwd: string;
  readonly ctx: GitContext;

  constructor(fs: VFS, cwd: string, ctx: GitContext) {
    this.fs = fs;
    this.cwd = cwd;
    this.ctx = ctx;
  }

  repo(required = true): GitRepo | null {
    const repo = GitRepo.open(this.fs, this.cwd);
    if (!repo && required) throw new GitError('not a git repository (or any of the parent directories): .git');
    return repo;
  }

  path(value: string): string {
    return VFS.normalize(value, this.cwd);
  }

  relative(path: string, repo: GitRepo): string {
    return path.slice(repo.root.length + (repo.root === '/' ? 0 : 1));
  }

  run(rawArgv: string[]): GitResult {
    const argv = expandShortFlags(rawArgv);
    const [sub, ...rest] = argv;
    try {
      switch (sub) {
        case undefined:
        case '--version':
          return { out: 'git version 2.43.0\n', err: '', code: 0 };
        case 'init':
          return this.init(rest);
        case 'clone':
          return this.clone(rest);
        case 'add':
          return this.add(rest);
        case 'rm':
          return this.rm(rest);
        case 'status':
          return this.status(rest);
        case 'commit':
          return this.commit(rest);
        case 'log':
          return this.log(rest);
        case 'shortlog':
          return this.shortlog(rest);
        case 'show':
          return this.show(rest);
        case 'diff':
          return this.diff(rest);
        case 'branch':
          return this.branch(rest);
        case 'checkout':
          return this.checkout(rest);
        case 'switch':
          return this.checkout(rest, true);
        case 'merge':
          return this.merge(rest);
        case 'rebase':
          return this.rebase(rest);
        case 'cherry-pick':
          return this.cherryPick(rest);
        case 'revert':
          return this.revert(rest);
        case 'reset':
          return this.reset(rest);
        case 'restore':
          return this.restore(rest);
        case 'clean':
          return this.clean(rest);
        case 'stash':
          return this.stash(rest);
        case 'remote':
          return this.remote(rest);
        case 'fetch':
          return this.fetch(rest);
        case 'pull':
          return this.pull(rest);
        case 'push':
          return this.push(rest);
        case 'ls-remote':
          return this.lsRemote(rest);
        case 'config':
          return this.configCommand(rest);
        case 'tag':
          return this.tag(rest);
        case 'reflog':
          return this.reflogCommand(rest);
        case 'rev-parse':
          return this.revParse(rest);
        case 'rev-list':
          return this.revList(rest);
        case 'submodule':
          return this.submodule(rest);
        case 'fsck':
          return this.fsck(rest);
        case 'bisect':
          return this.bisect(rest);
        case 'cherry':
          return this.cherry(rest);
        case 'ls-files':
          return this.lsFiles(rest);
        case 'help':
          return { out: 'usage: git <command> [<args>]\n', err: '', code: 0 };
        default:
          return { out: '', err: `git: '${sub}' is not a git command. See 'git --help'.\n`, code: 1 };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { out: '', err: `fatal: ${message}\n`, code: 128 };
    }
  }

  /* ---------- plumbing commands ---------- */

  private init(args: string[]): GitResult {
    const { args: rest } = parseArgs(args);
    const target = rest[0] ?? '.';
    const abs = this.path(target);
    this.fs.mkdirp(abs);
    const branch = flagValue(args, ['-b']) ?? MASTER;
    GitRepo.init(this.fs, abs, branch);
    return { out: `Initialized empty Git repository in ${abs}/.git/\n`, err: '', code: 0 };
  }

  private clone(args: string[]): GitResult {
    const { args: rest } = parseArgs(args);
    const url = rest[0];
    if (!url) throw new GitError('You must specify a repository to clone.');
    const normalized = normalizeRemote(url);
    const remote = this.ctx.remotes.get(normalized);
    if (!remote) {
      throw new GitError(`repository '${url}' is not available in this offline workspace`);
    }
    const remoteRepo = new GitRepo(remote, remoteRoot(remote));
    const name = rest[1] ?? basename(normalized);
    const dest = this.path(name);
    if (this.fs.exists(dest) && this.fs.list(dest).length > 0) {
      throw new GitError(`destination path '${name}' already exists and is not an empty directory.`);
    }
    this.fs.mkdirp(dest);
    const repo = GitRepo.init(this.fs, dest);
    repo.setConfig('remote.origin.url', url);
    repo.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');
    repo.importObjects(remote, remoteRoot(remote));
    const branches = remoteRepo.refs('refs/heads/');
    if (branches.length === 0) {
      return {
        out: `Cloning into '${name}'...\nwarning: You appear to have cloned an empty repository.\n`,
        err: '',
        code: 0,
      };
    }
    let headBranch = remoteRepo.currentBranch() ?? basename(branches[0][0].replace('refs/heads/', ''));
    const headSha = remoteRepo.headSha();
    for (const [ref, sha] of branches) {
      const branch = ref.replace('refs/heads/', '');
      repo.writeRef(`refs/remotes/origin/${branch}`, sha);
      if (sha === headSha) headBranch = branch;
    }
    const head = repo.readCommit(headSha);
    if (head) {
      repo.writeHead(`ref: refs/heads/${headBranch}`);
      repo.writeRef(`refs/heads/${headBranch}`, head.sha);
      repo.setConfig(`branch.${headBranch}.remote`, 'origin');
      repo.setConfig(`branch.${headBranch}.merge`, `refs/heads/${headBranch}`);
      repo.applyTree(head.tree);
      repo.appendReflog('0000000', head.sha, repo.identity(), `clone: from ${url}`);
    }
    this.ctx.remotes.set(normalized, remote);
    return { out: `Cloning into '${name}'...\ndone.\n`, err: '', code: 0 };
  }

  private add(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags, args: paths } = parseArgs(args);
    const index = repo.index();
    const worktree = repo.worktree();
    const all = hasFlag(flags, '-A', '--all');
    const trackedOnly = hasFlag(flags, '-u', '--update');
    const targets = new Set<string>();
    if (all) {
      for (const path of worktree.keys()) targets.add(path);
    } else if (paths.length === 0) {
      throw new GitError('Nothing specified, nothing added.');
    }
    for (const raw of paths) {
      const abs = this.path(raw);
      if (raw === '.' || raw === './' || this.fs.isDir(abs)) {
        const prefix = this.relative(VFS.normalize(abs), repo);
        for (const path of worktree.keys()) {
          if (!prefix || path === prefix || path.startsWith(`${prefix}/`)) targets.add(path);
        }
        if (!prefix) for (const path of [...index.keys()]) if (!worktree.has(path)) targets.add(path);
      } else {
        targets.add(this.relative(abs, repo));
      }
    }
    for (const path of targets) {
      const content = worktree.get(path);
      if (content === undefined) {
        if (all || trackedOnly) index.delete(path);
        continue;
      }
      if (trackedOnly && !index.has(path)) continue;
      index.set(path, content);
    }
    repo.writeIndex(index);
    return { out: '', err: '', code: 0 };
  }

  private rm(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags, args: paths } = parseArgs(args);
    const index = repo.index();
    const cached = hasFlag(flags, '--cached');
    let out = '';
    for (const raw of paths) {
      const rel = this.relative(this.path(raw), repo);
      if (!index.has(rel)) throw new GitError(`pathspec '${raw}' did not match any files`);
      index.delete(rel);
      if (!cached) this.fs.remove(`${repo.root}/${rel}`);
      out += `rm '${rel}'\n`;
    }
    repo.writeIndex(index);
    return { out, err: '', code: 0 };
  }

  private status(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags } = parseArgs(args);
    const shortFormat = hasFlag(flags, '-s', '--short');
    const branch = repo.currentBranch();
    const head = repo.headCommit();
    const index = repo.index();
    const worktree = repo.worktree();
    const headTree = head?.tree ?? {};
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];
    for (const path of new Set([...Object.keys(headTree), ...index.keys()])) {
      const h = headTree[path];
      const i = index.get(path);
      if (h !== i) staged.push(path);
    }
    for (const path of index.keys()) {
      const i = index.get(path);
      const w = worktree.get(path);
      if (w === undefined || w !== i) unstaged.push(path);
    }
    for (const path of worktree.keys()) {
      if (!index.has(path)) untracked.push(path);
    }
    if (shortFormat) {
      const lines: string[] = [];
      const all = new Set([...staged, ...unstaged, ...untracked]);
      for (const path of sortByName([...all])) {
        const s = untracked.includes(path)
          ? '?'
          : headTree[path] === undefined
            ? 'A'
            : index.get(path) === undefined
              ? 'D'
              : staged.includes(path)
                ? 'M'
                : ' ';
        const u = untracked.includes(path)
          ? '?'
          : unstaged.includes(path)
            ? worktree.get(path) === undefined
              ? 'D'
              : 'M'
            : ' ';
        lines.push(`${s}${u} ${path}`);
      }
      return { out: lines.length ? `${lines.join('\n')}\n` : '', err: '', code: 0 };
    }
    let out = branch ? `On branch ${branch}\n` : `HEAD detached at ${short(repo.headSha() ?? '')}\n`;
    if (!head) out += '\nNo commits yet\n';
    if (staged.length) {
      out += '\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)\n';
      for (const path of sortByName(staged)) {
        const label = headTree[path] === undefined ? 'new file' : index.get(path) === undefined ? 'deleted' : 'modified';
        out += `\t${label}:   ${path}\n`;
      }
    }
    if (unstaged.length) {
      out += '\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n  (use "git restore <file>..." to discard changes in working directory)\n';
      for (const path of sortByName(unstaged)) {
        out += `\tmodified:   ${path}\n`;
      }
    }
    if (untracked.length) {
      out += '\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)\n';
      for (const path of sortByName(untracked)) out += `\t${path}\n`;
      out += '\n';
    }
    if (!staged.length && !unstaged.length && !untracked.length) {
      out += 'nothing to commit, working tree clean\n';
    }
    return { out, err: '', code: 0 };
  }

  private commit(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags } = parseArgs(args);
    const all = hasFlag(flags, '-a', '--all');
    const allowEmpty = hasFlag(flags, '--allow-empty');
    const amend = hasFlag(flags, '--amend');
    let message: string | null = flagValue(args, ['-m', '--message']);
    if (!message) {
      const candidates = positionals(args, ['-m', '--message', '--author', '--date']);
      message = candidates.join(' ').trim() || (amend ? repo.headCommit()?.message ?? null : null);
    }
    if (!message) throw new GitError('Aborting commit due to empty commit message.');
    if (all) {
      const index = repo.index();
      const worktree = repo.worktree();
      for (const [path, content] of worktree) {
        if (index.has(path)) index.set(path, content);
      }
      for (const path of [...index.keys()]) if (!worktree.has(path)) index.delete(path);
      repo.writeIndex(index);
    }
    const authorName = flagValue(args, ['--author']);
    let author: { name: string; email: string } | undefined;
    if (authorName) {
      const match = authorName.match(/^(.*?)\s*<([^>]+)>$/);
      author = match ? { name: match[1], email: match[2] } : { name: authorName, email: '' };
    }
    const indexMap = repo.index();
    const tree = Object.fromEntries(indexMap);
    const head = repo.headCommit();
    if (amend) {
      if (!head) throw new GitError('You have nothing to amend.');
      const kept = author ?? { name: head.author, email: head.email };
      const commit = repo.createCommit(tree, message, head.parents, kept);
      commit.time = head.time;
      repo.writeCommit(commit);
      const ref = repo.headRef();
      if (ref) repo.writeRef(ref, commit.sha);
      else repo.writeHead(`${commit.sha}\n`);
      repo.appendReflog(head.sha, commit.sha, repo.identity(), `commit (amend): ${message}`);
      return { out: `[${repo.currentBranch() ?? 'detached HEAD'} ${short(commit.sha)}] ${message}\n`, err: '', code: 0 };
    }
    if (!allowEmpty && head && Object.keys(tree).length === Object.keys(head.tree).length) {
      const same = Object.entries(tree).every(([path, content]) => head.tree[path] === content);
      if (same) {
        return {
          out: `On branch ${repo.currentBranch() ?? 'HEAD'}\nnothing to commit, working tree clean\n`,
          err: '',
          code: 1,
        };
      }
    }
    const commit = repo.createCommit(tree, message, head ? [head.sha] : [], author);
    repo.updateRefAfterCommit(commit);
    const previous = head?.tree ?? {};
    const files = new Set([
      ...Object.keys(tree).filter((path) => previous[path] !== tree[path]),
      ...Object.keys(previous).filter((path) => !(path in tree)),
    ]).size;
    return {
      out: `[${repo.currentBranch() ?? 'detached HEAD'}${head ? '' : ' (root-commit)'} ${short(commit.sha)}] ${message}\n ${
        files ? `${files} file${files === 1 ? '' : 's'} changed` : '0 files changed'
      }\n`,
      err: '',
      code: 0,
    };
  }

  private log(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags } = parseArgs(args);
    const oneline =
      hasFlag(flags, '--oneline') ||
      args.some((item) => item === '--format=oneline' || item === '--pretty=oneline') ||
      flagValue(args, ['--pretty', '--format']) === 'oneline';
    const graph = hasFlag(flags, '--graph');
    const all = hasFlag(flags, '--all');
    const remotes = hasFlag(flags, '--remotes');
    const noMerges = hasFlag(flags, '--no-merges');
    const nameStatus = hasFlag(flags, '--name-status');
    const stat = hasFlag(flags, '--stat');
    const shortStat = hasFlag(flags, '--shortstat');
    const numeric = args.find((item) => /^-\d+$/.test(item));
    const max = Number(flagValue(args, ['-n', '--max-count']) ?? (numeric ? numeric.slice(1) : 0));
    const grep = flagValue(args, ['--grep']);
    const since = flagValue(args, ['--since', '--after']);
    const until = flagValue(args, ['--until', '--before']);
    const searchFlag = args.find((item) => item.startsWith('-S'));
    const search = searchFlag ? (searchFlag.length > 2 ? searchFlag.slice(2) : flagValue(args, ['-S'])) ?? '' : null;
    const explicit = positionals(args, ['-n', '--max-count', '--grep', '--since', '--until', '--after', '--before', '--format', '--pretty', '-S']);
    const paths = explicit
      .filter((item) => !item.includes('..') && this.fs.exists(this.path(item)) && !repo.revisionExists(item))
      .map((item) => this.relative(VFS.normalize(this.path(item)), repo));
    const revisions = explicit.filter((item) => !paths.includes(this.relative(VFS.normalize(this.path(item)), repo)));
    let commits: GitCommit[];
    const range = revisions.find((item) => item.includes('..'));
    if (range) {
      const [left, right] = range.split('..');
      const rightSha = repo.resolveCommit(right || 'HEAD').sha;
      const leftSha = left ? repo.resolveCommit(left).sha : null;
      const exclude = leftSha ? repo.ancestors(leftSha) : new Set<string>();
      commits = repo.commitsFrom(null, { lookup: [rightSha] }).filter((commit) => !exclude.has(commit.sha));
    } else {
      const lookups = revisions.filter((item) => !this.fs.isDir(this.path(item)));
      commits = repo.commitsFrom(null, {
        all: all || remotes,
        remotes,
        lookup: lookups.length ? lookups : undefined,
      });
    }
    if (search !== null) {
      const needle = search.replace(/^['"]|['"]$/g, '');
      commits = commits.filter((commit) => {
        const parent = repo.readCommit(commit.parents[0] ?? null)?.tree ?? {};
        const scope = paths.length ? paths : Object.keys({ ...parent, ...commit.tree });
        return scope.some((path) => {
          const before = parent[path] ?? '';
          const after = commit.tree[path] ?? '';
          return before.includes(needle) !== after.includes(needle);
        });
      });
    }
    if (paths.length) {
      commits = commits.filter((commit) => {
        const parent = repo.readCommit(commit.parents[0] ?? null)?.tree ?? {};
        return paths.some((path) => parent[path] !== commit.tree[path]);
      });
    }
    if (noMerges) commits = commits.filter((commit) => commit.parents.length < 2);
    if (grep) {
      const needle = grep.replace(/^['"]|['"]$/g, '');
      commits = commits.filter((commit) => commit.message.toLowerCase().includes(needle.toLowerCase()));
    }
    if (since) {
      const at = parseDate(since);
      if (at !== null) commits = commits.filter((commit) => commit.time >= at);
    }
    if (until) {
      const at = parseDate(until);
      if (at !== null) commits = commits.filter((commit) => commit.time <= at);
    }
    if (max > 0) commits = commits.slice(0, max);
    if (!commits.length) return { out: '', err: '', code: 0 };
    const lines: string[] = [];
    for (const commit of commits) {
      if (oneline) {
        lines.push(`${graph ? '* ' : ''}${short(commit.sha)}${repo.describeRef(commit.sha)} ${commit.message.split('\n')[0]}`);
      } else {
        lines.push(`commit ${commit.sha}${repo.describeRef(commit.sha)}`);
        lines.push(`Author: ${commit.author} <${commit.email}>`);
        lines.push(`Date:   ${stamp(commit.time)}`);
        lines.push('');
        for (const line of commit.message.split('\n')) lines.push(`    ${line}`);
        lines.push('');
      }
      if (nameStatus) {
        const parent = repo.readCommit(commit.parents[0] ?? null)?.tree ?? {};
        for (const [path, content] of Object.entries(commit.tree)) {
          if (!(path in parent)) lines.push(`A\t${path}`);
          else if (parent[path] !== content) lines.push(`M\t${path}`);
        }
        for (const path of Object.keys(parent)) if (!(path in commit.tree)) lines.push(`D\t${path}`);
      }
      if (stat || shortStat) {
        const parent = repo.readCommit(commit.parents[0] ?? null)?.tree ?? {};
        const changed = new Set([
          ...Object.keys(commit.tree).filter((path) => commit.tree[path] !== parent[path]),
          ...Object.keys(parent).filter((path) => !(path in commit.tree)),
        ]);
        if (changed.size) {
          lines.push(` ${changed.size} file${changed.size === 1 ? '' : 's'} changed`);
          if (stat) lines.push('');
        }
      }
    }
    return { out: `${lines.join('\n').replace(/\n+$/, '')}\n`, err: '', code: 0 };
  }

  private shortlog(args: string[]): GitResult {
    const repo = this.repo()!;
    const explicit = positionals(args, ['-n', '--numbered', '--format']);
    const range = explicit.find((item) => item.includes('..'));
    let commits: GitCommit[];
    if (range) {
      const [left, right] = range.split('..');
      const rightSha = repo.resolveCommit(right || 'HEAD').sha;
      const exclude = left ? repo.ancestors(repo.resolveCommit(left).sha) : new Set<string>();
      commits = repo.commitsFrom(null, { lookup: [rightSha] }).filter((commit) => !exclude.has(commit.sha));
    } else {
      const rev = explicit.find((item) => repo.revisionExists(item));
      commits = repo.commitsFrom(null, { lookup: rev ? [rev] : undefined });
    }
    const groups = new Map<string, string[]>();
    for (const commit of commits) {
      const list = groups.get(commit.author) ?? [];
      list.push(commit.message.split('\n')[0]);
      groups.set(commit.author, list);
    }
    const entries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    return {
      out: entries.map(([author, messages]) => `${author} (${messages.length}):\n${messages.map((m) => `      ${m}`).join('\n')}`).join('\n\n') + (entries.length ? '\n' : ''),
      err: '',
      code: 0,
    };
  }

  private show(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags } = parseArgs(args);
    const rev = positionals(args, ['--format', '--pretty'])[0] ?? 'HEAD';
    const commit = repo.resolveCommit(rev);
    const stat = hasFlag(flags, '--stat');
    const parent = repo.readCommit(commit.parents[0] ?? null)?.tree ?? {};
    const lines = [
      `commit ${commit.sha}${repo.describeRef(commit.sha)}`,
      `Author: ${commit.author} <${commit.email}>`,
      `Date:   ${stamp(commit.time)}`,
      '',
      ...commit.message.split('\n').map((line) => `    ${line}`),
      '',
    ];
    if (stat) {
      const changed = Object.keys(commit.tree).filter((path) => commit.tree[path] !== parent[path]);
      lines.push(` ${changed.length} file${changed.length === 1 ? '' : 's'} changed`);
      lines.push('');
    } else {
      lines.push(diffTrees(parent, commit.tree).replace(/\n$/, ''));
    }
    return { out: `${lines.join('\n').replace(/\n+$/, '')}\n`, err: '', code: 0 };
  }

  private diff(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags, args: rest } = parseArgs(args);
    const cached = hasFlag(flags, '--staged', '--cached');
    const explicit = rest.filter((item) => !item.startsWith('-'));
    const index = Object.fromEntries(repo.index());
    const worktree = Object.fromEntries(repo.worktree());
    let before: Record<string, string>;
    let after: Record<string, string>;
    if (explicit.length === 1 && explicit[0].includes('..')) {
      const [left, right] = explicit[0].split('..');
      before = repo.resolveTree(left || 'HEAD');
      after = right ? repo.resolveTree(right) : worktree;
    } else if (explicit.length >= 2) {
      before = repo.resolveTree(explicit[0]);
      after = repo.resolveTree(explicit[1]);
    } else if (explicit.length === 1) {
      before = repo.resolveTree(explicit[0]);
      after = cached ? index : worktree;
    } else if (cached) {
      before = repo.headCommit()?.tree ?? {};
      after = index;
    } else {
      before = index;
      after = worktree;
    }
    return { out: diffTrees(before, after), err: '', code: 0 };
  }

  private branch(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags } = parseArgs(args);
    const all = hasFlag(flags, '-a', '--all');
    const remotes = hasFlag(flags, '-r', '--remotes');
    const verbose = hasFlag(flags, '-v', '--verbose');
    const contains = flagValue(args, ['--contains']);
    const noContains = flagValue(args, ['--no-contains']);
    const merged = hasFlag(flags, '--merged');
    const noMerged = hasFlag(flags, '--no-merged');
    const sort = flagValue(args, ['--sort']);
    const del = hasFlag(flags, '-d', '-D', '--delete');
    const move = hasFlag(flags, '-m', '-M', '--move');
    const current = repo.currentBranch();
    const names = positionals(args, ['--contains', '--no-contains', '--sort', '--merged', '--no-merged']);

    if (hasFlag(flags, '--show-current')) {
      return { out: `${current ?? ''}\n`, err: '', code: 0 };
    }

    if (del) {
      if (!names.length) throw new GitError('branch name required');
      let out = '';
      for (const name of names) {
        if (name === current) throw new GitError(`Cannot delete branch '${name}' checked out at '${repo.root}'`);
        const sha = repo.readRef(`refs/heads/${name}`);
        if (!sha) throw new GitError(`branch '${name}' not found`);
        if (!hasFlag(flags, '-D') && !repo.isAncestor(sha, repo.headSha() ?? '')) {
          throw new GitError(`The branch '${name}' is not fully merged.`);
        }
        repo.writeRef(`refs/heads/${name}`, null);
        out += `Deleted branch ${name} (was ${short(sha)}).\n`;
      }
      return { out, err: '', code: 0 };
    }
    if (move) {
      const [from, to] = names;
      if (!from || !to) throw new GitError('branch name required');
      const sha = repo.readRef(`refs/heads/${from}`);
      if (!sha) throw new GitError(`branch '${from}' not found`);
      repo.writeRef(`refs/heads/${to}`, sha);
      repo.writeRef(`refs/heads/${from}`, null);
      if (current === from) repo.writeHead(`ref: refs/heads/${to}`);
      return { out: '', err: '', code: 0 };
    }
    const filtering = !!(contains || merged || noMerged || sort);
    if (!filtering && names.length > 0) {
      const name = names[0];
      if (repo.readRef(`refs/heads/${name}`)) throw new GitError(`a branch named '${name}' already exists`);
      const start = names[1] ?? 'HEAD';
      const sha = start === 'HEAD' ? repo.headSha() : repo.resolveCommit(start).sha;
      if (!sha) throw new GitError('Not a valid object name: HEAD');
      repo.writeRef(`refs/heads/${name}`, sha);
      return { out: '', err: '', code: 0 };
    }
    const rows: { name: string; sha: string; remote: boolean }[] = [];
    if (!remotes) {
      for (const [ref, sha] of repo.refs('refs/heads/')) {
        rows.push({ name: ref.replace('refs/heads/', ''), sha, remote: false });
      }
    }
    if (all || remotes) {
      for (const [ref, sha] of repo.refs('refs/remotes/')) {
        const name = ref.replace('refs/remotes/', '');
        if (name.endsWith('/HEAD')) continue;
        rows.push({ name, sha, remote: true });
      }
    }
    let filtered = rows;
    if (contains) {
      const tip = repo.resolveCommit(contains).sha;
      filtered = filtered.filter((row) => repo.ancestors(row.sha).has(tip));
    }
    if (noContains) {
      const tip = repo.resolveCommit(noContains).sha;
      filtered = filtered.filter((row) => !repo.ancestors(row.sha).has(tip));
    }
    if (merged) {
      const base = repo.headSha() ?? '';
      filtered = filtered.filter((row) => repo.isAncestor(row.sha, base));
    }
    if (noMerged) {
      const base = repo.headSha() ?? '';
      filtered = filtered.filter((row) => !repo.isAncestor(row.sha, base));
    }
    if (sort && sort.includes('committerdate')) {
      filtered = [...filtered].sort((a, b) => (repo.readCommit(b.sha)?.time ?? 0) - (repo.readCommit(a.sha)?.time ?? 0));
    }
    const lines = filtered.map((row) => {
      const label = row.remote ? (all ? `remotes/${row.name}` : row.name) : row.name;
      const isCurrent = !row.remote && row.name === current;
      const marker = isCurrent ? '* ' : '  ';
      if (!verbose) return `${marker}${label}`;
      const commit = repo.readCommit(row.sha);
      let tracking = '';
      if (!row.remote) {
        const remote = repo.getConfig(`branch.${row.name}.remote`);
        const merge = repo.getConfig(`branch.${row.name}.merge`);
        if (remote) {
          const upstream = `${remote}/${(merge ?? `refs/heads/${row.name}`).replace('refs/heads/', '')}`;
          tracking = repo.readRef(`refs/remotes/${upstream}`) ? ` [${upstream}]` : ` [${upstream}: gone]`;
        }
      }
      return `${marker}${label} ${commit ? short(commit.sha) : short(row.sha)}${tracking} ${commit?.message.split('\n')[0] ?? ''}`;
    });
    return { out: lines.length ? `${lines.join('\n')}\n` : '', err: '', code: 0 };
  }

  private checkout(args: string[], asSwitch = false): GitResult {
    const repo = this.repo()!;
    const { flags, args: rest } = parseArgs(args);
    const create = hasFlag(flags, '-b', '-B') || (asSwitch && hasFlag(flags, '-c'));
    const force = hasFlag(flags, '-f', '--force');
    const paths = args.includes('--') ? args.slice(args.indexOf('--') + 1) : [];

    if (paths.length > 0) {
      const source = rest.find((item) => repo.revisionExists(item));
      const tree = source ? repo.resolveTree(source) : {};
      const index = repo.index();
      for (const raw of paths) {
        const rel = this.relative(this.path(raw), repo);
        const content = source ? tree[rel] : index.get(rel);
        if (content === undefined) throw new GitError(`pathspec '${raw}' did not match any file(s) known to git`);
        index.set(rel, content);
        this.fs.mkdirp(dirname(`${repo.root}/${rel}`));
        this.fs.writeFile(`${repo.root}/${rel}`, content);
      }
      repo.writeIndex(index);
      return { out: '', err: '', code: 0 };
    }

    const named = rest.filter((item) => !item.startsWith('-'));
    if (!create && paths.length === 0 && named.length >= 2 && repo.revisionExists(named[0])) {
      const tree = repo.resolveTree(named[0]);
      const index = repo.index();
      for (const raw of named.slice(1)) {
        const rel = this.relative(this.path(raw), repo);
        const content = tree[rel];
        if (content === undefined) throw new GitError(`pathspec '${raw}' did not match any file(s) known to git`);
        index.set(rel, content);
        this.fs.mkdirp(dirname(`${repo.root}/${rel}`));
        this.fs.writeFile(`${repo.root}/${rel}`, content);
      }
      repo.writeIndex(index);
      return { out: '', err: '', code: 0 };
    }

    let target = rest.includes('-') ? '-' : rest.find((item) => !item.startsWith('-')) ?? null;
    if (target === '-') target = this.previousBranch(repo);
    if (target && !create && !repo.readRef(`refs/heads/${target}`) && !repo.readRef(`refs/remotes/origin/${target}`)) {
      const abs = this.path(target);
      const index = repo.index();
      const rel = this.relative(VFS.normalize(abs), repo);
      if (index.has(rel)) {
        const content = index.get(rel)!;
        this.fs.mkdirp(dirname(`${repo.root}/${rel}`));
        this.fs.writeFile(`${repo.root}/${rel}`, content);
        return { out: '', err: '', code: 0 };
      }
    }

    if (create) {
      const name = target;
      if (!name) throw new GitError('branch name required');
      if (repo.readRef(`refs/heads/${name}`)) throw new GitError(`a branch named '${name}' already exists`);
      const start = rest.filter((item) => item !== name && !item.startsWith('-'))[0] ?? 'HEAD';
      const sha = start === 'HEAD' ? repo.headSha() : repo.resolveCommit(start).sha;
      if (!sha) throw new GitError('cannot create branch before the first commit');
      repo.writeRef(`refs/heads/${name}`, sha);
      const tree = repo.resolveTree(sha);
      repo.writeHead(`ref: refs/heads/${name}`);
      repo.applyTree(tree);
      repo.appendReflog(sha, sha, repo.identity(), `checkout: moving from ${repo.currentBranch() ?? short(sha)} to ${name}`);
      return { out: `Switched to a new branch '${name}'\n`, err: '', code: 0 };
    }

    if (!target) {
      throw new GitError('you must specify a branch to check out');
    }

    const branchSha = repo.readRef(`refs/heads/${target}`);
    const remoteSha = repo.readRef(`refs/remotes/origin/${target}`);
    const sha = branchSha ?? remoteSha ?? (repo.revisionExists(target) ? repo.resolveCommit(target).sha : null);
    if (!sha) {
      throw new GitError(`pathspec '${target}' did not match any file(s) known to git`);
    }
    const previous = repo.currentBranch();
    const index = repo.index();
    const worktree = repo.worktree();
    const dirty = [...index.entries()].some(([path, content]) => worktree.get(path) !== content);
    const tree = repo.resolveTree(sha);
    if (!force && dirty) {
      for (const [path, content] of Object.entries(tree)) {
        const current = worktree.get(path);
        const staged = index.get(path);
        if (current !== undefined && current !== staged && content !== current && content !== staged) {
          throw new GitError(`Your local changes to the following files would be overwritten by checkout: ${path}`);
        }
      }
    }
    if (branchSha) {
      repo.writeHead(`ref: refs/heads/${target}`);
      repo.applyTree(tree);
      repo.appendReflog(sha, sha, repo.identity(), `checkout: moving from ${previous ?? 'HEAD'} to ${target}`);
      return {
        out: `Switched to branch '${target}'\n${repo.getConfig(`branch.${target}.remote`) ? '' : ''}`,
        err: '',
        code: 0,
      };
    }
    if (remoteSha) {
      repo.writeRef(`refs/heads/${target}`, remoteSha);
      repo.setConfig(`branch.${target}.remote`, 'origin');
      repo.setConfig(`branch.${target}.merge`, `refs/heads/${target}`);
      repo.writeHead(`ref: refs/heads/${target}`);
      repo.applyTree(tree);
      repo.appendReflog(sha, sha, repo.identity(), `checkout: moving from ${previous ?? 'HEAD'} to ${target}`);
      return {
        out: `branch '${target}' set up to track 'origin/${target}'.\nSwitched to a new branch '${target}'\n`,
        err: '',
        code: 0,
      };
    }
    repo.writeHead(`${sha}\n`);
    repo.applyTree(tree);
    repo.appendReflog(sha, sha, repo.identity(), `checkout: moving from ${previous ?? 'HEAD'} to ${short(sha)}`);
    return {
      out: `Note: switching to '${target}'.\n\nYou are in 'detached HEAD' state.\nHEAD is now at ${short(sha)} ${
        repo.readCommit(sha)?.message.split('\n')[0] ?? ''
      }\n`,
      err: '',
      code: 0,
    };
  }

  private previousBranch(repo: GitRepo): string {
    const entries = repo.reflog().filter((line) => line.includes('checkout: moving from'));
    for (let i = entries.length - 2; i >= 0; i -= 1) {
      const match = entries[i].match(/checkout: moving from (\S+) to (\S+)/);
      if (match) return match[1];
    }
    return MASTER;
  }

  private merge(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags, args: rest } = parseArgs(args);
    const messageFlag = flagValue(args, ['-m', '--message']);
    const targetName = rest.find((item) => !item.startsWith('-') && item !== messageFlag);
    if (!targetName) throw new GitError('No commit specified and merge.defaultToUpstream not set.');
    const ours = repo.headCommit();
    if (!ours) throw new GitError('cannot merge before the first commit');
    const theirs = repo.resolveCommit(targetName);
    if (repo.isAncestor(theirs.sha, ours.sha)) {
      return { out: 'Already up to date.\n', err: '', code: 0 };
    }
    if (repo.isAncestor(ours.sha, theirs.sha)) {
      const noFf = hasFlag(flags, '--no-ff') || repo.getConfig('merge.ff') === 'false';
      if (!noFf) {
        repo.applyTree(theirs.tree);
        if (repo.headRef()) repo.writeRef(repo.headRef()!, theirs.sha);
        else repo.writeHead(`${theirs.sha}
`);
        repo.appendReflog(ours.sha, theirs.sha, repo.identity(), `merge ${targetName}: Fast-forward`);
        return {
          out: `Updating ${short(ours.sha)}..${short(theirs.sha)}\nFast-forward\n`,
          err: '',
          code: 0,
        };
      }
    }
    const base = repo.mergeBase(ours.sha, theirs.sha);
    const baseTree = base ? repo.readCommit(base)?.tree ?? {} : {};
    const { tree, conflicts } = mergeTrees(baseTree, ours.tree, theirs.tree);
    const message = messageFlag ?? `Merge branch '${targetName}'`;
    if (conflicts.length) {
      repo.writeIndex(new Map(Object.entries(tree)));
      for (const [path, content] of Object.entries(tree)) {
        this.fs.mkdirp(dirname(`${repo.root}/${path}`));
        this.fs.writeFile(`${repo.root}/${path}`, content);
      }
      return {
        out: '',
        err: `Auto-merging ${conflicts.join(', ')}\nCONFLICT (content): Merge conflict in ${conflicts.join(', ')}\nAutomatic merge failed; fix conflicts and then commit the result.\n`,
        code: 1,
      };
    }
    const commit = repo.createCommit(tree, message, [ours.sha, theirs.sha]);
    repo.applyTree(tree);
    repo.updateRefAfterCommit(commit, 'merge', targetName);
    const changed = new Set([
      ...Object.keys(tree).filter((path) => tree[path] !== ours.tree[path]),
      ...Object.keys(ours.tree).filter((path) => !(path in tree)),
    ]).size;
    return {
      out: `Merge made by the 'ort' strategy.\n ${changed} file${changed === 1 ? '' : 's'} changed.\n`,
      err: '',
      code: 0,
    };
  }

  private rebase(args: string[]): GitResult {
    const repo = this.repo()!;
    const { args: rest } = parseArgs(args);
    const targetName = rest[0];
    if (!targetName) throw new GitError('no upstream specified');
    const target = repo.resolveCommit(targetName);
    const head = repo.headCommit();
    if (!head) throw new GitError('cannot rebase before the first commit');
    if (repo.isAncestor(target.sha, head.sha)) {
      return { out: `Current branch ${repo.currentBranch() ?? 'HEAD'} is up to date.\n`, err: '', code: 0 };
    }
    const base = repo.mergeBase(head.sha, target.sha);
    const replay: GitCommit[] = [];
    const queue = [head.sha];
    while (queue.length) {
      const sha = queue.shift()!;
      if (sha === base || sha === target.sha) continue;
      const commit = repo.readCommit(sha);
      if (!commit) continue;
      replay.push(commit);
      queue.push(...commit.parents);
    }
    replay.reverse();
    let tree = cloneTree(target.tree);
    let parent = target.sha;
    for (const commit of replay) {
      const commitParent = repo.readCommit(commit.parents[0] ?? null)?.tree ?? {};
      const { tree: merged, conflicts } = mergeTrees(commitParent, tree, commit.tree);
      if (conflicts.length) {
        return {
          out: '',
          err: `CONFLICT (content): Merge conflict in ${conflicts.join(', ')}\nerror: could not apply ${short(commit.sha)}... ${commit.message}\n`,
          code: 1,
        };
      }
      const next = repo.createCommit(merged, commit.message, [parent]);
      parent = next.sha;
      tree = merged;
    }
    if (repo.headRef()) repo.writeRef(repo.headRef()!, parent);
    else repo.writeHead(`${parent}
`);
    repo.applyTree(tree);
    return {
      out: `Successfully rebased and updated refs/heads/${repo.currentBranch() ?? 'HEAD'}.\n`,
      err: '',
      code: 0,
    };
  }

  private cherryPick(args: string[]): GitResult {
    const repo = this.repo()!;
    const { args: rest } = parseArgs(args);
    const shas = rest.filter((item) => !item.startsWith('-'));
    if (!shas.length) throw new GitError('no commit specified');
    let head = repo.headCommit();
    if (!head) throw new GitError('cannot cherry-pick before the first commit');
    let tree = cloneTree(head.tree);
    let parentSha = head.sha;
    let out = '';
    for (const rev of shas) {
      const commit = repo.resolveCommit(rev);
      const parent = repo.readCommit(commit.parents[0] ?? null)?.tree ?? {};
      const { tree: merged, conflicts } = mergeTrees(parent, tree, commit.tree);
      if (conflicts.length) {
        return { out, err: `error: could not apply ${short(commit.sha)}... ${commit.message}\n`, code: 1 };
      }
      const next = repo.createCommit(merged, commit.message, [parentSha]);
      parentSha = next.sha;
      tree = merged;
      out += `[${repo.currentBranch() ?? 'detached HEAD'} ${short(next.sha)}] ${commit.message}\n`;
    }
    if (repo.headRef()) repo.writeRef(repo.headRef()!, parentSha);
    else repo.writeHead(`${parentSha}
`);
    repo.applyTree(tree);
    return { out, err: '', code: 0 };
  }

  private revert(args: string[]): GitResult {
    const repo = this.repo()!;
    const { args: rest } = parseArgs(args);
    const rev = rest[0];
    if (!rev) throw new GitError('no commit specified');
    const commit = repo.resolveCommit(rev);
    const head = repo.headCommit();
    if (!head) throw new GitError('cannot revert before the first commit');
    const parentTree = repo.readCommit(commit.parents[0] ?? null)?.tree ?? {};
    const tree = cloneTree(head.tree);
    for (const path of new Set([...Object.keys(commit.tree), ...Object.keys(parentTree)])) {
      if (commit.tree[path] === parentTree[path]) continue;
      if (parentTree[path] === undefined) delete tree[path];
      else tree[path] = parentTree[path];
    }
    const message = `Revert "${commit.message.split('\n')[0]}"\n\nThis reverts commit ${commit.sha}.`;
    const next = repo.createCommit(tree, message, [head.sha]);
    if (repo.headRef()) repo.writeRef(repo.headRef()!, next.sha);
    else repo.writeHead(`${next.sha}
`);
    repo.applyTree(tree);
    return { out: `[${repo.currentBranch() ?? 'detached HEAD'} ${short(next.sha)}] ${message.split('\n')[0]}\n`, err: '', code: 0 };
  }

  private reset(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags, args: rest } = parseArgs(args);
    const hard = hasFlag(flags, '--hard');
    const soft = hasFlag(flags, '--soft');
    const target = rest.find((item) => !item.startsWith('-')) ?? 'HEAD';
    const commit = repo.resolveCommit(target);
    const ref = repo.headRef();
    if (ref) repo.writeRef(ref, commit.sha);
    else repo.writeHead(`${commit.sha}\n`);
    if (hard) {
      repo.applyTree(commit.tree, { worktree: true, index: true });
    } else if (!soft) {
      repo.writeIndex(new Map(Object.entries(commit.tree)));
    }
    repo.appendReflog(repo.headSha() ?? '0000000', commit.sha, repo.identity(), `reset: moving to ${target}`);
    return {
      out: hard ? `HEAD is now at ${short(commit.sha)} ${commit.message.split('\n')[0]}\n` : '',
      err: '',
      code: 0,
    };
  }

  private restore(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags } = parseArgs(args);
    const staged = hasFlag(flags, '--staged');
    const source = flagValue(args, ['--source']);
    const paths = positionals(args, ['--source']);
    const origin = source ?? 'HEAD';
    const tree = repo.revisionExists(origin) ? repo.resolveTree(origin) : repo.headCommit()?.tree ?? {};
    const index = repo.index();
    for (const raw of paths) {
      const rel = this.relative(this.path(raw), repo);
      if (staged) {
        if (rel in tree) index.set(rel, tree[rel]);
        else index.delete(rel);
      } else {
        const content = source ? tree[rel] : index.get(rel) ?? tree[rel];
        if (content === undefined) throw new GitError(`pathspec '${raw}' did not match any file(s) known to git`);
        this.fs.writeFile(`${repo.root}/${rel}`, content);
      }
    }
    if (staged) repo.writeIndex(index);
    return { out: '', err: '', code: 0 };
  }

  private clean(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags } = parseArgs(args);
    const dirs = hasFlag(flags, '-d');
    const force = hasFlag(flags, '-f', '--force');
    if (!force) return { out: '', err: 'fatal: clean.requireForce defaults to true and neither -i, -n, nor -f given; refusing to clean\n', code: 128 };
    const index = repo.index();
    const removed: string[] = [];
    for (const path of repo.worktree().keys()) {
      if (index.has(path)) continue;
      if (!dirs && path.includes('/')) continue;
      this.fs.remove(`${repo.root}/${path}`);
      removed.push(path);
    }
    return { out: removed.map((path) => `Removing ${path}\n`).join(''), err: '', code: 0 };
  }

  private stash(args: string[]): GitResult {
    const repo = this.repo()!;
    const position = positionals(args, ['-m', '--message']);
    const action = position[0] ?? 'push';
    const explicitMessage =
      flagValue(args, ['-m', '--message']) ?? (action === 'save' ? position[1] : undefined);
    if (action === 'list') {
      const entries = repo.stashes();
      if (!entries.length) return { out: '', err: '', code: 0 };
      return {
        out: entries
          .map((entry, i) => {
            const branch = repo.readCommit(entry.sha)?.message.split('\n')[0] ?? '';
            return `stash@{${i}}: On ${branch}: ${entry.message}`;
          })
          .join('\n') + '\n',
        err: '',
        code: 0,
      };
    }
    if (action === 'show') {
      const entries = repo.stashes();
      const index = Number((position[1] ?? 'stash@{0}').replace(/stash@\{(\d+)\}/, '$1')) || 0;
      const entry = entries[index];
      if (!entry) return { out: '', err: '', code: 0 };
      const commit = repo.readCommit(entry.sha);
      const base = repo.readCommit(commit?.parents[0] ?? null)?.tree ?? {};
      return { out: diffTrees(base, commit?.tree ?? {}), err: '', code: 0 };
    }
    if (action === 'clear') {
      repo.writeStashes([]);
      return { out: '', err: '', code: 0 };
    }
    if (action === 'drop') {
      const entries = repo.stashes();
      const index = Number((position[1] ?? 'stash@{0}').replace(/stash@\{(\d+)\}/, '$1')) || 0;
      const [entry] = entries.splice(index, 1);
      if (!entry) throw new GitError(`stash@\{${index}\} is not a valid reference`);
      repo.writeStashes(entries);
      return { out: `Dropped refs/stash@{${index}} (${entry.sha})\n`, err: '', code: 0 };
    }
    if (action === 'pop' || action === 'apply') {
      const entries = repo.stashes();
      const index = Number((position[1] ?? 'stash@{0}').replace(/stash@\{(\d+)\}/, '$1')) || 0;
      const entry = entries[index];
      if (!entry) throw new GitError('No stash entries found.');
      const commit = repo.readCommit(entry.sha);
      if (!commit) throw new GitError('stash is corrupt');
      const base = repo.readCommit(commit.parents[0] ?? null)?.tree ?? {};
      for (const [path, content] of Object.entries(commit.tree)) {
        if (base[path] === content) continue;
        this.fs.mkdirp(dirname(`${repo.root}/${path}`));
        this.fs.writeFile(`${repo.root}/${path}`, content);
      }
      if (action === 'pop') {
        entries.splice(index, 1);
        repo.writeStashes(entries);
      }
      const current = repo.currentBranch() ?? 'HEAD';
      const changed = Object.entries(commit.tree).filter(([path, content]) => base[path] !== content);
      return {
        out: `On branch ${current}\nChanges not staged for commit:\n${
          changed.length
            ? changed.map(([path]) => `\tmodified:   ${path}`).join('\n') + '\n'
            : '\tnothing to show\n'
        }${action === 'pop' ? `Dropped refs/stash@{${index}}\n` : ''}`,
        err: '',
        code: 0,
      };
    }
    if (action === 'save' || action === 'push') {
      const indexMap = repo.index();
      const worktree = repo.worktree();
      const head = repo.headCommit();
      const headTree = head?.tree ?? {};
      const changes = new Map(indexMap);
      for (const [path, content] of worktree) changes.set(path, content);
      const tree = Object.fromEntries(changes);
      if (head && Object.entries(headTree).every(([path, content]) => tree[path] === content) && Object.keys(headTree).length === Object.keys(tree).length) {
        return { out: 'No local changes to save\n', err: '', code: 0 };
      }
      const branch = repo.currentBranch() ?? 'HEAD';
      const message = explicitMessage ?? `WIP on ${branch}`;
      const commit = repo.createCommit(tree, `${branch}\n${message}`, head ? [head.sha] : []);
      const entries = repo.stashes();
      entries.unshift({ sha: commit.sha, message, time: Math.floor(Date.now() / 1000) });
      repo.writeStashes(entries);
      if (head) repo.applyTree(head.tree);
      else repo.applyTree({});
      return { out: `Saved working directory and index state ${message}\n`, err: '', code: 0 };
    }
    return { out: '', err: '', code: 0 };
  }

  private remote(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags, args: rest } = parseArgs(args);
    const verbose = hasFlag(flags, '-v', '--verbose');
    const action = rest[0];
    const names = new Set<string>();
    for (const key of repo.config().keys()) {
      const match = key.match(/^remote\.([^.]+)\.url$/);
      if (match) names.add(match[1]);
    }
    if (verbose) {
      const lines = [...names]
        .sort()
        .map(
          (name) =>
            `${name}\t${repo.getConfig(`remote.${name}.url`) ?? ''} (fetch)\n${name}\t${
              repo.getConfig(`remote.${name}.url`) ?? ''
            } (push)`
        );
      return { out: lines.length ? `${lines.join('\n')}\n` : '', err: '', code: 0 };
    }
    if (!action) {
      const list = [...names].sort();
      return { out: list.length ? `${list.join('\n')}\n` : '', err: '', code: 0 };
    }
    if (action === 'add' && rest[1] && rest[2]) {
      repo.setConfig(`remote.${rest[1]}.url`, rest[2]);
      repo.setConfig(`remote.${rest[1]}.fetch`, `+refs/heads/*:refs/remotes/${rest[1]}/*`);
      return { out: '', err: '', code: 0 };
    }
    if (action === 'set-url' && rest[1] && rest[2]) {
      repo.setConfig(`remote.${rest[1]}.url`, rest[2]);
      return { out: '', err: '', code: 0 };
    }
    if ((action === 'remove' || action === 'rm') && rest[1]) {
      repo.unsetConfig(`remote.${rest[1]}.url`);
      repo.unsetConfig(`remote.${rest[1]}.fetch`);
      for (const [ref] of repo.refs(`refs/remotes/${rest[1]}/`)) repo.writeRef(ref, null);
      return { out: '', err: '', code: 0 };
    }
    if (action === 'rename' && rest[1] && rest[2]) {
      const url = repo.getConfig(`remote.${rest[1]}.url`);
      if (url) repo.setConfig(`remote.${rest[2]}.url`, url);
      repo.unsetConfig(`remote.${rest[1]}.url`);
      return { out: '', err: '', code: 0 };
    }
    const url = repo.getConfig(`remote.${action}.url`);
    if (!url) throw new GitError(`No such remote '${action}'`);
    return { out: `${url}\n`, err: '', code: 0 };
  }

  private fetch(args: string[]): GitResult {
    const repo = this.repo()!;
    const { args: rest } = parseArgs(args);
    const name = rest[0] ?? 'origin';
    const url = repo.remoteUrl(name);
    if (!url) throw new GitError(`'${name}' does not appear to be a git repository`);
    const before = repo.refs(`refs/remotes/${name}/`).length;
    repo.importRemoteRefs(url, this.ctx);
    const after = repo.refs(`refs/remotes/${name}/`).length;
    return {
      out: `From ${url}\n * [new refs] ${Math.max(0, after - before)} updated\n`,
      err: '',
      code: 0,
    };
  }

  private pull(args: string[]): GitResult {
    const repo = this.repo()!;
    const { args: rest } = parseArgs(args);
    const name = rest[0] ?? 'origin';
    const branch = rest[1] ?? repo.currentBranch() ?? MASTER;
    const url = repo.remoteUrl(name);
    if (!url) throw new GitError(`'${name}' does not appear to be a git repository`);
    repo.importRemoteRefs(url, this.ctx);
    const remoteSha = repo.readRef(`refs/remotes/${name}/${branch}`);
    if (!remoteSha) throw new GitError(`couldn't find remote ref ${branch}`);
    const head = repo.headCommit();
    if (!head) {
      const commit = repo.readCommit(remoteSha);
      if (commit) {
        repo.writeRef(`refs/heads/${branch}`, commit.sha);
        repo.writeHead(`ref: refs/heads/${branch}`);
        repo.applyTree(commit.tree);
      }
      return { out: 'Fast-forward\n', err: '', code: 0 };
    }
    if (repo.isAncestor(remoteSha, head.sha)) return { out: 'Already up to date.\n', err: '', code: 0 };
    if (repo.isAncestor(head.sha, remoteSha)) {
      const commit = repo.resolveCommit(remoteSha);
      repo.applyTree(commit.tree);
      if (repo.headRef()) repo.writeRef(repo.headRef()!, commit.sha);
      else repo.writeHead(`${commit.sha}
`);
      repo.appendReflog(head.sha, commit.sha, repo.identity(), `pull ${name} ${branch}: Fast-forward`);
      return { out: `Updating ${short(head.sha)}..${short(commit.sha)}\nFast-forward\n`, err: '', code: 0 };
    }
    const base = repo.mergeBase(head.sha, remoteSha);
    const baseTree = base ? repo.readCommit(base)?.tree ?? {} : {};
    const theirs = repo.resolveCommit(remoteSha);
    const { tree, conflicts } = mergeTrees(baseTree, head.tree, theirs.tree);
    if (conflicts.length) {
      return { out: '', err: `CONFLICT (content): Merge conflict in ${conflicts.join(', ')}\n`, code: 1 };
    }
    const commit = repo.createCommit(tree, `Merge branch '${branch}' of ${url}`, [head.sha, theirs.sha]);
    repo.applyTree(tree);
    repo.updateRefAfterCommit(commit, 'merge', branch);
    return { out: `Merge made by the 'ort' strategy.\n`, err: '', code: 0 };
  }

  private push(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags, args: rest } = parseArgs(args);
    const force = hasFlag(flags, '-f', '--force');
    const setUpstream = hasFlag(flags, '-u', '--set-upstream');
    const del = hasFlag(flags, '--delete', '-d');
    const deleteIndex = args.indexOf('--delete');
    const positional = rest.filter((item) => !item.startsWith('-'));
    const name = positional[0] && !positional[0].startsWith('refs/') ? positional[0] : 'origin';
    const branchArg = positional[1] ?? repo.currentBranch() ?? MASTER;
    const url = repo.remoteUrl(name);
    if (!url) throw new GitError(`'${name}' does not appear to be a git repository`);
    if (del) {
      const branch = deleteIndex >= 0 ? args[deleteIndex + 2] ?? branchArg : branchArg;
      const remote = this.ctx.remotes.get(normalizeRemote(url));
      if (remote) {
        const remoteRepo = new GitRepo(remote, remoteRoot(remote));
        remoteRepo.writeRef(`refs/heads/${branch}`, null);
      }
      repo.writeRef(`refs/remotes/${name}/${branch}`, null);
      return { out: `To ${url}\n - [deleted]         ${branch}\n`, err: '', code: 0 };
    }
    const localSha = repo.readRef(`refs/heads/${branchArg}`) ?? repo.headSha();
    if (!localSha) throw new GitError('src refspec does not match any');
    const remote = this.ctx.remotes.get(normalizeRemote(url));
    const previousSha = remote ? new GitRepo(remote, remoteRoot(remote)).readRef(`refs/heads/${branchArg}`) : null;
    if (remote && !force) {
      const remoteRepo = new GitRepo(remote, remoteRoot(remote));
      const remoteSha = remoteRepo.readRef(`refs/heads/${branchArg}`);
      if (remoteSha && !repo.isAncestor(remoteSha, localSha)) {
        return {
          out: '',
          err: ` ! [rejected]        ${branchArg} -> ${branchArg} (non-fast-forward)\nerror: failed to push some refs\n`,
          code: 1,
        };
      }
    }
    repo.pushRefToRemote(url, branchArg, localSha, this.ctx);
    repo.writeRef(`refs/remotes/${name}/${branchArg}`, localSha);
    if (setUpstream) {
      repo.setConfig(`branch.${branchArg}.remote`, name);
      repo.setConfig(`branch.${branchArg}.merge`, `refs/heads/${branchArg}`);
    }
    const update = previousSha
      ? `${short(previousSha)}..${short(localSha)}  ${branchArg} -> ${branchArg}`
      : `* [new branch]      ${branchArg} -> ${branchArg}`;
    return {
      out: `To ${url}\n   ${update}\n${
        setUpstream ? `branch '${branchArg}' set up to track '${name}/${branchArg}'.\n` : ''
      }`,
      err: '',
      code: 0,
    };
  }

  private lsRemote(args: string[]): GitResult {
    const url = positionals(args)[0] ?? 'origin';
    const repo = this.repo(false);
    const resolved = repo?.remoteUrl(url) ?? url;
    const remote = this.ctx.remotes.get(normalizeRemote(resolved));
    if (!remote) throw new GitError(`repository '${url}' not found`);
    const remoteRepo = new GitRepo(remote, remoteRoot(remote));
    const heads = args.includes('--heads');
    const lines: string[] = [];
    for (const [ref, sha] of remoteRepo.refs()) {
      if (heads && !ref.startsWith('refs/heads/')) continue;
      lines.push(`${sha}\t${ref}`);
    }
    return { out: lines.length ? `${lines.join('\n')}\n` : '', err: '', code: 0 };
  }

  private configCommand(args: string[]): GitResult {
    const local = this.repo(false);
    const global = args.includes('--global');
    const list = args.includes('--list') || args.includes('-l');
    const unset = args.includes('--unset');
    const positional = args.filter((item) => !item.startsWith('-') && item !== 'config');
    const globalPath = '/home/labex/.gitconfig';
    const globalMap = parseConfig(this.fs.isFile(globalPath) ? this.fs.readFile(globalPath) : '');
    const map = local ? new Map([...globalMap, ...local.config()]) : globalMap;
    if (list) {
      return { out: [...map.entries()].map(([key, value]) => `${key}=${value}`).join('\n') + '\n', err: '', code: 0 };
    }
    if (unset) {
      const key = positional[0];
      if (!key) throw new GitError('key required for --unset');
      if (global) {
        const path = '/home/labex/.gitconfig';
        const file = parseConfig(this.fs.isFile(path) ? this.fs.readFile(path) : '');
        file.delete(key);
        this.fs.writeFile(path, configText(file));
      } else if (local) {
        local.unsetConfig(key);
      }
      return { out: '', err: '', code: 0 };
    }
    if (positional.length === 1) {
      const key = positional[0];
      return { out: map.has(key) ? `${map.get(key)}\n` : '', err: '', code: map.has(key) ? 0 : 1 };
    }
    const [key, value] = positional;
    if (!key || value === undefined) throw new GitError('wrong number of arguments');
    if (global) {
      const path = '/home/labex/.gitconfig';
      const file = parseConfig(this.fs.isFile(path) ? this.fs.readFile(path) : '');
      file.set(key, value);
      this.fs.writeFile(path, configText(file));
    } else if (local) {
      local.setConfig(key, value);
    } else {
      const path = '/home/labex/.gitconfig';
      const file = parseConfig(this.fs.isFile(path) ? this.fs.readFile(path) : '');
      file.set(key, value);
      this.fs.writeFile(path, configText(file));
    }
    return { out: '', err: '', code: 0 };
  }

  private tag(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags, args: rest } = parseArgs(args);
    const del = hasFlag(flags, '-d', '--delete');
    if (del) {
      const name = rest[0];
      if (!name || !repo.readRef(`refs/tags/${name}`)) throw new GitError(`tag '${name}' not found`);
      repo.writeRef(`refs/tags/${name}`, null);
      return { out: `Deleted tag '${name}'\n`, err: '', code: 0 };
    }
    if (rest[0] && !rest[0].startsWith('-')) {
      const name = rest[0];
      const rev = rest[1] ?? 'HEAD';
      repo.writeRef(`refs/tags/${name}`, repo.resolveCommit(rev).sha);
      return { out: '', err: '', code: 0 };
    }
    return { out: repo.refs('refs/tags/').map(([ref]) => ref.replace('refs/tags/', '')).join('\n') + '\n', err: '', code: 0 };
  }

  private reflogCommand(args: string[]): GitResult {
    const repo = this.repo()!;
    const { args: rest } = parseArgs(args);
    const show = rest[0] === 'show';
    const lines = repo.reflog();
    if (show) {
      const rev = rest[1] ?? 'HEAD';
      const commit = repo.resolveCommit(rev);
      return { out: `commit ${commit.sha}\nAuthor: ${commit.author} <${commit.email}>\n\n    ${commit.message}\n`, err: '', code: 0 };
    }
    const output = lines
      .slice()
      .reverse()
      .map((line, i) => {
        const sha = line.split(' ')[1];
        const action = line.split('\t')[1] ?? '';
        return `${short(sha ?? '')} HEAD@{${i}}: ${action}`;
      });
    return { out: output.length ? `${output.join('\n')}\n` : '', err: '', code: 0 };
  }

  private revParse(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags, args: rest } = parseArgs(args);
    if (hasFlag(flags, '--abbrev-ref')) {
      const rev = rest[0] ?? 'HEAD';
      if (rev === 'HEAD') return { out: repo.currentBranch() ?? 'HEAD\n', err: '', code: 0 };
    }
    if (hasFlag(flags, '--show-toplevel')) return { out: `${repo.root}\n`, err: '', code: 0 };
    if (hasFlag(flags, '--is-inside-work-tree')) return { out: 'true\n', err: '', code: 0 };
    if (hasFlag(flags, '--verify') || hasFlag(flags, '--short')) {
      const rev = rest[0] ?? 'HEAD';
      const commit = repo.resolveCommit(rev);
      return { out: `${hasFlag(flags, '--short') ? short(commit.sha) : commit.sha}\n`, err: '', code: 0 };
    }
    const rev = rest[0] ?? 'HEAD';
    if (rev === 'HEAD' && !repo.headCommit()) return { out: '', err: 'fatal: ambiguous argument HEAD\n', code: 128 };
    if (repo.revisionExists(rev)) return { out: `${repo.resolveCommit(rev).sha}\n`, err: '', code: 0 };
    if (rev === '--abbrev-ref') return { out: `${repo.currentBranch() ?? 'HEAD'}\n`, err: '', code: 0 };
    return { out: `${this.path(rev)}\n`, err: '', code: 0 };
  }

  private revList(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags, args: rest } = parseArgs(args);
    const count = hasFlag(flags, '--count');
    const commits = repo.commitsFrom(null, { lookup: rest.filter((item) => !item.startsWith('-')) });
    if (count) return { out: `${commits.length}\n`, err: '', code: 0 };
    return { out: commits.map((commit) => commit.sha).join('\n') + '\n', err: '', code: 0 };
  }

  private submodule(args: string[]): GitResult {
    const repo = this.repo()!;
    const { args: rest } = parseArgs(args);
    const action = rest[0] ?? 'status';
    if (action === 'status') {
      const gitmodules = `${repo.root}/.gitmodules`;
      if (!this.fs.isFile(gitmodules)) return { out: '', err: '', code: 0 };
      const lines: string[] = [];
      for (const block of this.fs.readFile(gitmodules).split('[submodule')) {
        const path = block.match(/path\s*=\s*(\S+)/)?.[1];
        const url = block.match(/url\s*=\s*(\S+)/)?.[1];
        if (path) lines.push(`-${objectHash(path + url).slice(0, 7)} ${path}${url ? ` (${url})` : ''}`);
      }
      return { out: lines.join('\n') + (lines.length ? '\n' : ''), err: '', code: 0 };
    }
    if (action === 'add' && rest[1] && rest[2]) {
      const gitmodules = `${repo.root}/.gitmodules`;
      const current = this.fs.isFile(gitmodules) ? this.fs.readFile(gitmodules) : '';
      this.fs.writeFile(gitmodules, `${current}[submodule "${rest[2]}"]\n\tpath = ${rest[2]}\n\turl = ${rest[1]}\n`);
      this.fs.mkdirp(`${repo.root}/${rest[2]}`);
      const index = repo.index();
      index.set('.gitmodules', this.fs.readFile(gitmodules));
      repo.writeIndex(index);
      return { out: `Cloning into '${rest[2]}'...\ndone.\n`, err: '', code: 0 };
    }
    if (action === 'foreach') {
      return { out: '', err: '', code: 0 };
    }
    return { out: '', err: '', code: 0 };
  }

  private fsck(args: string[]): GitResult {
    const repo = this.repo()!;
    const { flags } = parseArgs(args);
    if (!hasFlag(flags, '--lost-found')) return { out: '', err: '', code: 0 };
    const reachable = new Set<string>();
    for (const [, sha] of repo.refs()) {
      for (const item of repo.ancestors(sha)) reachable.add(item);
    }
    const lost = `${repo.dir}/lost-found/commit`;
    repo.fs.mkdirp(lost);
    let out = '';
    for (const commit of repo.allCommits()) {
      if (reachable.has(commit.sha)) continue;
      this.fs.writeFile(`${lost}/${commit.sha}`, JSON.stringify(commit));
      out += `dangling commit ${commit.sha}\n`;
    }
    return { out, err: '', code: 0 };
  }

  private bisect(args: string[]): GitResult {
    const repo = this.repo()!;
    const { args: rest } = parseArgs(args);
    const action = rest[0];
    const statePath = `${repo.dir}/BISECT_STATE`;
    const readState = (): { original: string; bad: string; good: string | null } | null => {
      if (!this.fs.isFile(statePath)) return null;
      try {
        return JSON.parse(this.fs.readFile(statePath));
      } catch {
        return null;
      }
    };
    const writeState = (state: { original: string; bad: string; good: string | null }) =>
      this.fs.writeFile(statePath, JSON.stringify(state));
    const detach = (sha: string) => {
      const commit = repo.readCommit(sha);
      if (!commit) throw new GitError(`bad revision '${sha}'`);
      const oldSha = repo.headSha() ?? sha;
      const before = repo.currentBranch() ?? short(oldSha);
      repo.writeHead(`${sha}\n`);
      repo.applyTree(commit.tree);
      repo.appendReflog(oldSha, sha, repo.identity(), `checkout: moving from ${before} to ${sha}`);
    };
    const step = (state: { original: string; bad: string; good: string | null }, mark?: 'good' | 'bad'): GitResult => {
      if (mark === 'good') state.good = repo.headSha();
      if (mark === 'bad') state.bad = repo.headSha() ?? state.bad;
      writeState(state);
      if (!state.good) return { out: '', err: '', code: 0 };
      const goodSet = repo.ancestors(state.good);
      const candidates = repo
        .commitsFrom(null, { lookup: [state.bad] })
        .filter((commit) => !goodSet.has(commit.sha) && commit.sha !== state.good)
        .sort((a, b) => a.time - b.time);
      if (!candidates.length) return { out: 'No revisions left to test.\n', err: '', code: 0 };
      if (candidates.length === 1) {
        const first = candidates[0];
        detach(first.sha);
        writeState({ ...state, bad: first.sha });
        const change = Object.keys(first.tree).find(
          (path) => (repo.readCommit(first.parents[0] ?? null)?.tree ?? {})[path] !== first.tree[path]
        );
        return {
          out: `${first.sha} is the first bad commit\ncommit ${first.sha}\n    ${first.message.split('\n')[0]}\n${
            change ? ` ${change} | 1 +\n` : ''
          }`,
          err: '',
          code: 0,
        };
      }
      const middle = candidates[Math.floor((candidates.length - 1) / 2)];
      detach(middle.sha);
      return { out: `Bisecting: ${candidates.length - 1} revisions left to test after this\n`, err: '', code: 0 };
    };

    if (action === 'start') {
      const head = repo.headSha();
      if (!head) throw new GitError('cannot bisect before the first commit');
      const original = repo.headRef() ?? head;
      const bad = rest[1] ? repo.resolveCommit(rest[1]).sha : head;
      const good = rest[2] ? repo.resolveCommit(rest[2]).sha : null;
      const state = { original, bad, good };
      writeState(state);
      return good ? step(state) : { out: '', err: '', code: 0 };
    }
    const state = readState();
    if (action === 'reset') {
      if (!state) return { out: '', err: '', code: 0 };
      const target = state.original.startsWith('refs/') ? repo.readRef(state.original) : state.original;
      this.fs.remove(statePath);
      if (target) {
        const commit = repo.readCommit(target);
        if (state.original.startsWith('refs/')) repo.writeHead(`ref: ${state.original}\n`);
        else repo.writeHead(`${target}\n`);
        if (commit) repo.applyTree(commit.tree);
      }
      return { out: '', err: '', code: 0 };
    }
    if ((action === 'good' || action === 'bad') && state) return step(state, action);
    return { out: '', err: '', code: 0 };
  }

  private cherry(args: string[]): GitResult {
    const repo = this.repo()!;
    const { args: rest } = parseArgs(args);
    const upstream = rest[0] ?? 'HEAD';
    const head = rest[1] ?? 'HEAD';
    const commits = repo.commitsFrom(null, { lookup: [head] });
    const base = repo.ancestors(repo.resolveCommit(upstream).sha);
    const out = commits.filter((commit) => !base.has(commit.sha)).map((commit) => `+ ${commit.sha} ${commit.message}`);
    return { out: out.length ? `${out.join('\n')}\n` : '', err: '', code: 0 };
  }

  private lsFiles(args: string[]): GitResult {
    const repo = this.repo()!;
    const { args: rest } = parseArgs(args);
    const index = repo.index();
    const paths = [...index.keys()].sort();
    const filtered = rest.length ? paths.filter((path) => rest.some((item) => path.startsWith(item))) : paths;
    return { out: filtered.join('\n') + (filtered.length ? '\n' : ''), err: '', code: 0 };
  }
}


export function isGitError(error: unknown): error is GitError {
  return error instanceof GitError;
}
