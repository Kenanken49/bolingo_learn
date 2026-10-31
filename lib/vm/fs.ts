/**
 * In-memory POSIX-ish filesystem for the offline lab terminal.
 *
 * Everything is plain JS so the same engine runs in the app (Hermes), in the
 * Node test suite, and inside the importer. Paths are absolute and normalised
 * on the way in; the tree is a flat map, which keeps snapshots and clones for
 * read-only checks cheap.
 */

export type VEntry =
  | { kind: 'file'; content: string }
  | { kind: 'dir' };

export interface VFSInit {
  files?: Record<string, string>;
  dirs?: string[];
}

export class VFS {
  private entries = new Map<string, VEntry>();

  constructor(init: VFSInit = {}) {
    this.entries.set('/', { kind: 'dir' });
    for (const dir of init.dirs ?? []) this.mkdirp(dir);
    for (const [path, content] of Object.entries(init.files ?? {})) this.writeFile(path, content);
  }

  static normalize(path: string, cwd = '/'): string {
    let raw = path.trim();
    if (raw === '~') raw = '/home/labex';
    else if (raw.startsWith('~/')) raw = `/home/labex/${raw.slice(2)}`;
    if (!raw.startsWith('/')) raw = `${cwd}/${raw}`;
    const parts: string[] = [];
    for (const part of raw.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    return `/${parts.join('/')}`;
  }

  exists(path: string): boolean {
    return this.entries.has(path);
  }

  isDir(path: string): boolean {
    return this.entries.get(path)?.kind === 'dir';
  }

  isFile(path: string): boolean {
    return this.entries.get(path)?.kind === 'file';
  }

  mkdir(path: string, opts: { recursive?: boolean } = {}): void {
    if (this.exists(path)) {
      if (this.isDir(path)) return;
      throw new Error(`mkdir: ${path}: File exists`);
    }
    const parent = path.slice(0, path.lastIndexOf('/')) || '/';
    if (!this.exists(parent)) {
      if (!opts.recursive) throw new Error(`mkdir: ${path}: No such file or directory`);
      this.mkdirp(parent);
    }
    this.entries.set(path, { kind: 'dir' });
  }

  mkdirp(path: string): void {
    const abs = VFS.normalize(path);
    if (this.isDir(abs)) return;
    if (abs === '/') return;
    const parent = abs.slice(0, abs.lastIndexOf('/')) || '/';
    this.mkdirp(parent);
    if (this.exists(abs)) throw new Error(`mkdir: ${path}: File exists`);
    this.entries.set(abs, { kind: 'dir' });
  }

  writeFile(path: string, content: string, opts: { append?: boolean } = {}): void {
    const abs = VFS.normalize(path);
    if (this.isDir(abs)) throw new Error(`${path}: Is a directory`);
    const parent = abs.slice(0, abs.lastIndexOf('/')) || '/';
    if (!this.isDir(parent)) throw new Error(`${path}: No such file or directory`);
    if (opts.append && this.isFile(abs)) {
      this.entries.set(abs, { kind: 'file', content: (this.entries.get(abs) as { content: string }).content + content });
      return;
    }
    this.entries.set(abs, { kind: 'file', content });
  }

  readFile(path: string): string {
    const entry = this.entries.get(path);
    if (!entry) throw new Error(`${path}: No such file or directory`);
    if (entry.kind === 'dir') throw new Error(`${path}: Is a directory`);
    return entry.content;
  }

  list(path: string): string[] {
    if (!this.exists(path)) throw new Error(`${path}: No such file or directory`);
    if (!this.isDir(path)) return [path.slice(path.lastIndexOf('/') + 1)];
    const prefix = path === '/' ? '/' : `${path}/`;
    const names = new Set<string>();
    for (const key of this.entries.keys()) {
      if (!key.startsWith(prefix) || key === path) continue;
      const rest = key.slice(prefix.length);
      if (!rest) continue;
      names.add(rest.split('/')[0]);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  walk(path: string): string[] {
    if (!this.isDir(path)) return this.exists(path) ? [path] : [];
    const prefix = path === '/' ? '/' : `${path}/`;
    const out: string[] = [];
    for (const key of this.entries.keys()) {
      if (key !== path && key.startsWith(prefix)) out.push(key);
    }
    return out.sort();
  }

  remove(path: string, opts: { recursive?: boolean } = {}): void {
    if (!this.exists(path)) throw new Error(`${path}: No such file or directory`);
    if (this.isDir(path)) {
      const children = this.walk(path);
      if (children.length > 0 && !opts.recursive) throw new Error(`${path}: Directory not empty`);
      for (const child of children) this.entries.delete(child);
    }
    if (path === '/') throw new Error('rm: refusing to remove /');
    this.entries.delete(path);
  }

  rename(from: string, to: string): void {
    if (!this.exists(from)) throw new Error(`${from}: No such file or directory`);
    const target = this.isDir(to) ? `${to}/${from.slice(from.lastIndexOf('/') + 1)}` : to;
    const parent = target.slice(0, target.lastIndexOf('/')) || '/';
    if (!this.isDir(parent)) throw new Error(`${to}: No such file or directory`);
    const moved = [{ path: from, entry: this.entries.get(from)! }, ...this.walk(from).map((child) => ({ path: child, entry: this.entries.get(child)! }))];
    for (const item of moved) this.entries.delete(item.path);
    for (const item of moved) this.entries.set(target + item.path.slice(from.length), item.entry);
  }

  copy(from: string, to: string): void {
    if (!this.exists(from)) throw new Error(`${from}: No such file or directory`);
    const target = this.isDir(to) ? `${to}/${from.slice(from.lastIndexOf('/') + 1)}` : to;
    const parent = target.slice(0, target.lastIndexOf('/')) || '/';
    if (!this.isDir(parent)) throw new Error(`${to}: No such file or directory`);
    const entry = this.entries.get(from)!;
    if (entry.kind === 'file') {
      this.entries.set(target, { kind: 'file', content: entry.content });
      return;
    }
    this.mkdirp(target);
    for (const child of this.walk(from)) {
      const childEntry = this.entries.get(child)!;
      const dest = target + child.slice(from.length);
      if (childEntry.kind === 'dir') this.mkdirp(dest);
      else this.entries.set(dest, { kind: 'file', content: childEntry.content });
    }
  }

  /** Flatten files for assertions and state comparison. */
  snapshot(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [path, entry] of this.entries) {
      if (entry.kind === 'file') out[path] = entry.content;
    }
    return out;
  }

  clone(): VFS {
    const next = new VFS();
    for (const [path, entry] of this.entries) {
      next.entries.set(path, entry.kind === 'dir' ? { kind: 'dir' } : { kind: 'file', content: entry.content });
    }
    return next;
  }

  dirs(): string[] {
    return [...this.entries.entries()].filter(([, e]) => e.kind === 'dir').map(([p]) => p);
  }
}

export function basename(path: string): string {
  return path === '/' ? '/' : path.slice(path.lastIndexOf('/') + 1);
}

export function dirname(path: string): string {
  return path === '/' ? '/' : path.slice(0, path.lastIndexOf('/')) || '/';
}

/** Stable short hash for commit object names (no crypto in Hermes). */
export function objectHash(parts: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  let h3 = 0x9e3779b9;
  let h4 = 0x85ebca6b;
  for (let i = 0; i < parts.length; i += 1) {
    const c = parts.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
    h3 = Math.imul(h3 ^ (c << 3), 3266489917) >>> 0;
    h4 = Math.imul(h4 + (c << 1), 668265263) >>> 0;
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return (hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h1 ^ h4)).slice(0, 40);
}
