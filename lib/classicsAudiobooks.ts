import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { BUNDLED_AUDIO, BUNDLED_TEXTS } from '../assets/audiobooks/seed';
import catalog from '../assets/audiobooks/philosophy-catalog.json';
import { supabaseUrl } from './supabase';

/**
 * Premium Philosophy classics library, seeded from LoyalBooks
 * (public-domain LibriVox narration + Gutenberg/LoyalBooks ebook text).
 *
 * Offline model: the catalog ships in the bundle so it is browsable with no
 * network. A short starter shelf ships its text + audio in the bundle; every
 * other book downloads on demand into `documentDirectory/classics/<slug>/`
 * and then reads/plays fully offline. See docs/classics-audiobooks.md.
 */

export interface CatalogBook {
  slug: string;
  title: string;
  author: string;
  url: string;
  cover: string | null;
  /** LoyalBooks' own "Genres for this book" taxonomy, in page order. */
  genres: string[];
  archiveId: string | null;
  audioZip: string | null;
  audioM4b: string | null;
  textUrl: string | null;
  epubUrl: string | null;
  gutenbergUrl: string | null;
}

export interface ClassicBook extends CatalogBook {
  hasAudio: boolean;
  hasText: boolean;
  /** Text ships inside the app bundle (readable offline immediately). */
  bundledText: boolean;
  /** Number of audio parts shipped inside the app bundle. */
  bundledChapters: number;
}

export interface ClassicChapter {
  index: number;
  /** archive.org file name (for remote streaming / on-demand download). */
  name: string | null;
  title: string;
  /** Expected bytes (0 when unknown, e.g. bundled parts). */
  size: number;
  /** Remote playback URL (null for bundled-only parts before resolving). */
  url: string | null;
}

function bundledTextSlugs(): Set<string> {
  return new Set(Object.keys(BUNDLED_TEXTS).map((k) => (k.endsWith('.txt') ? k.slice(0, -4) : k)));
}

function bundledAudioSlugs(): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const [slug, mods] of Object.entries(BUNDLED_AUDIO)) map.set(slug, mods as number[]);
  return map;
}

const TEXT_SLUGS = bundledTextSlugs();
const AUDIO_MODS = bundledAudioSlugs();

function toClassic(raw: CatalogBook): ClassicBook {
  return {
    ...raw,
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    hasAudio: raw.archiveId != null,
    hasText: raw.textUrl != null || TEXT_SLUGS.has(raw.slug),
    bundledText: TEXT_SLUGS.has(raw.slug),
    bundledChapters: AUDIO_MODS.get(raw.slug)?.length ?? 0,
  };
}

/** The whole seeded catalog (bundled JSON — available offline). */
export const CLASSICS: ClassicBook[] = ((catalog as { books: CatalogBook[] }).books ?? []).map(toClassic);

const BY_SLUG = new Map(CLASSICS.map((b) => [b.slug, b]));

export function getClassic(slug: string): ClassicBook | null {
  return BY_SLUG.get(slug) ?? null;
}

/** Primary shelf: the first genre LoyalBooks lists for the book. */
export function primaryGenre(book: ClassicBook): string {
  return book.genres[0] ?? 'Philosophy';
}

/** Every genre in the catalog, most books first (for the filter chips). */
export function genreCounts(): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const b of CLASSICS) {
    const seen = new Set<string>();
    for (const g of b.genres) {
      if (seen.has(g)) continue;
      seen.add(g);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const classicsDir = () => `${FileSystem.documentDirectory}classics/`;
const bookDir = (slug: string) => `${classicsDir()}${slug}/`;
const manifestPath = (slug: string) => `${bookDir(slug)}manifest.json`;
const coverPath = (slug: string) => `${bookDir(slug)}cover.jpg`;
const textPath = (slug: string) => `${bookDir(slug)}book.txt`;
const chapterPath = (slug: string, index: number) => `${bookDir(slug)}part-${String(index).padStart(2, '0')}.mp3`;

interface CachedManifest {
  chapters: { name: string; title: string; size: number }[];
  fetchedAt: string;
}

async function readManifest(slug: string): Promise<CachedManifest | null> {
  try {
    const info = await FileSystem.getInfoAsync(manifestPath(slug));
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(manifestPath(slug));
    const parsed = JSON.parse(raw) as CachedManifest;
    if (!Array.isArray(parsed.chapters)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Chapter list for a book: bundled parts first (always offline), otherwise
 * the archive.org file list (fetched once, then cached beside the downloads).
 */
export async function fetchChapters(book: ClassicBook): Promise<ClassicChapter[]> {
  const bundled = AUDIO_MODS.get(book.slug) ?? [];
  if (bundled.length > 0) {
    return bundled.map((_, i) => ({
      index: i,
      name: null,
      title: `Part ${i + 1} of ${bundled.length}`,
      size: 0,
      url: null,
    }));
  }
  if (!book.archiveId) return [];
  const cached = await readManifest(book.slug);
  if (cached) {
    return cached.chapters.map((c, i) => ({
      index: i,
      name: c.name,
      title: c.title || `Part ${i + 1} of ${cached.chapters.length}`,
      size: c.size,
      url: `https://archive.org/download/${book.archiveId}/${encodeURIComponent(c.name)}`,
    }));
  }
  const res = await fetch(`https://archive.org/metadata/${book.archiveId}`);
  if (!res.ok) throw new Error(`Chapter list failed (HTTP ${res.status}).`);
  const meta = (await res.json()) as { files?: { name?: string; size?: string | number; title?: string }[] };
  const files = (meta.files ?? [])
    .filter((f) => /_64kb\.mp3$/i.test(f.name ?? ''))
    .map((f) => ({ name: String(f.name), title: String(f.title ?? f.name), size: Number(f.size ?? 0) }));
  files.sort((a, b) => a.name.localeCompare(b.name));
  if (files.length === 0) return [];
  await FileSystem.makeDirectoryAsync(bookDir(book.slug), { intermediates: true }).catch(() => {});
  await FileSystem.writeAsStringAsync(
    manifestPath(book.slug),
    JSON.stringify({ chapters: files, fetchedAt: new Date().toISOString() })
  ).catch(() => {});
  return files.map((c, i) => ({
    index: i,
    name: c.name,
    title: c.title || `Part ${i + 1} of ${files.length}`,
    size: c.size,
    url: `https://archive.org/download/${book.archiveId}/${encodeURIComponent(c.name)}`,
  }));
}

/**
 * Copy a bundled asset into app storage and return its file:// URI.
 * On web expo-file-system is a stub, so the Metro-served asset URL is
 * returned directly (same-origin fetchable, streamable by expo-audio).
 */
async function bundledToFile(moduleId: number, destName: string): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const src = asset.localUri ?? asset.uri;
  if (Platform.OS === 'web') return src;
  const dest = `${FileSystem.documentDirectory}classics-bundled/${destName}`;
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}classics-bundled/`, {
    intermediates: true,
  }).catch(() => {});
  const existing = await FileSystem.getInfoAsync(dest).catch(() => null);
  if (!existing?.exists) {
    await FileSystem.copyAsync({ from: src, to: dest });
  }
  return dest;
}

export type OfflineState = 'none' | 'partial' | 'complete';

export interface OfflineStatus {
  state: OfflineState;
  /** Bytes already on device (text + audio). */
  bytes: number;
  /** Expected total when known (bundled parts count as known). */
  total: number | null;
}

/** How much of this book is on the device (bundled counts as on-device). */
export async function getOfflineStatus(book: ClassicBook): Promise<OfflineStatus> {
  return getOfflineStatusInner(book);
}

async function getOfflineStatusInner(book: ClassicBook): Promise<OfflineStatus> {
  let bytes = 0;
  let total = 0;
  let missing = 0;
  const bundled = AUDIO_MODS.get(book.slug) ?? [];
  // Bundled parts ship inside the app: always available, never missing.
  for (const mod of bundled) {
    try {
      const asset = Asset.fromModule(mod);
      const local = asset.localUri;
      if (local) {
        const info = await FileSystem.getInfoAsync(local).catch(() => null);
        if (info?.exists && typeof info.size === 'number') {
          bytes += info.size;
          total += info.size;
        }
      }
    } catch {
      // Size unknown until first load; still counts as available.
    }
  }
  // Text: downloaded, bundled, or still missing.
  if (book.hasText) {
    const t = await FileSystem.getInfoAsync(textPath(book.slug)).catch(() => null);
    if (t?.exists) {
      if (typeof t.size === 'number') {
        bytes += t.size;
        total += t.size;
      }
    } else if (!book.bundledText) {
      missing += 1;
    }
  }
  // Remote chapters (non-bundled books).
  if (bundled.length === 0 && book.archiveId) {
    const manifest = await readManifest(book.slug);
    const chapters = manifest?.chapters ?? [];
    for (let i = 0; i < chapters.length; i += 1) {
      const c = chapters[i];
      total += c.size || 0;
      const info = await FileSystem.getInfoAsync(chapterPath(book.slug, i)).catch(() => null);
      if (info?.exists) {
        if (typeof info.size === 'number') bytes += info.size;
      } else {
        missing += 1;
      }
    }
    if (chapters.length === 0) missing += 1;
  }
  if (!book.hasText && !book.hasAudio) return { state: 'none', bytes, total: null };
  const state: OfflineState = missing === 0 ? 'complete' : bytes > 0 ? 'partial' : 'none';
  return { state, bytes, total: total > 0 ? total : null };
}

/**
 * Download a book for offline use (text + every chapter). Progress is
 * reported as bytes written / expected bytes; when the chapter list is not
 * known yet the text downloads first so the callback still moves.
 */
export async function downloadBook(
  book: ClassicBook,
  onProgress?: (written: number, total: number) => void
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Offline downloads need the mobile app — streaming and bundled books work here in the preview.');
  }
  await FileSystem.makeDirectoryAsync(bookDir(book.slug), { intermediates: true }).catch(() => {});
  const chapters = await fetchChapters(book);
  const textNeeded = book.hasText;
  const textInfo = textNeeded ? await FileSystem.getInfoAsync(textPath(book.slug)).catch(() => null) : null;
  const textMissing = textNeeded && !textInfo?.exists && !book.bundledText;
  const audioTotal = chapters.reduce((n, c) => n + (c.size || 0), 0);
  let total = audioTotal;
  let written = 0;
  const report = () => onProgress?.(written, total > 0 ? total : 1);

  // Cover first (tiny jpg, the exact LoyalBooks art, cached for offline).
  try {
    const coverInfo = await FileSystem.getInfoAsync(coverPath(book.slug)).catch(() => null);
    if (!coverInfo?.exists && book.cover) {
      const dl = FileSystem.createDownloadResumable(book.cover, coverPath(book.slug));
      await dl.downloadAsync().catch(() => null);
    }
  } catch {
    // Cover is an enhancement; text + audio must still download.
  }

  // Text first (small, fast win, and it makes the total concrete).
  if (textMissing && book.textUrl) {
    const dl = FileSystem.createDownloadResumable(book.textUrl, textPath(book.slug), {}, () => report());
    const res = await dl.downloadAsync();
    if (!res?.uri) throw new Error('Text download failed.');
    const info = await FileSystem.getInfoAsync(textPath(book.slug)).catch(() => null);
    const size = info?.exists && typeof info.size === 'number' ? info.size : 0;
    written += size;
    total += size;
    report();
  }

  // Bundled audio needs no download; remote chapters download in order.
  const bundled = AUDIO_MODS.get(book.slug) ?? [];
  if (bundled.length === 0) {
    for (const ch of chapters) {
      if (!ch.url) continue;
      const dest = chapterPath(book.slug, ch.index);
      const info = await FileSystem.getInfoAsync(dest).catch(() => null);
      if (info?.exists) {
        written += typeof info.size === 'number' ? info.size : ch.size;
        report();
        continue;
      }
      const dl = FileSystem.createDownloadResumable(ch.url, dest, {}, (p) => {
        onProgress?.(written + p.totalBytesWritten, total > 0 ? total : p.totalBytesExpectedToWrite);
      });
      const res = await dl.downloadAsync();
      if (!res?.uri) throw new Error(`Download failed: ${ch.title}`);
      written += ch.size || 0;
      if (total === 0) total = 1;
      report();
    }
  }
  onProgress?.(Math.max(written, total), Math.max(total, 1));
}

/** Delete every downloaded file for a book (bundled parts stay in the app). */
export async function removeOfflineBook(book: ClassicBook): Promise<void> {
  await FileSystem.deleteAsync(bookDir(book.slug), { idempotent: true }).catch(() => {});
}

/**
 * Cover image for a book: the on-device copy when downloaded, otherwise the
 * LoyalBooks cover URL itself (the exact image from the book's LoyalBooks
 * page, streamed over https).
 */
export async function localCoverUri(book: ClassicBook): Promise<string | null> {
  if (!book.cover) return null;
  try {
    const info = await FileSystem.getInfoAsync(coverPath(book.slug)).catch(() => null);
    if (info?.exists) return coverPath(book.slug);
  } catch {
    // No on-device storage (web preview): fall through to the remote cover.
  }
  return book.cover;
}

/** file:// URI of the book text (bundled, downloaded, or freshly fetched). */
export async function localTextUri(book: ClassicBook): Promise<string | null> {
  if (!book.hasText) return null;
  const cached = await FileSystem.getInfoAsync(textPath(book.slug)).catch(() => null);
  if (cached?.exists) return textPath(book.slug);
  if (book.bundledText) {
    const key = `${book.slug}.txt`;
    const alt = BUNDLED_TEXTS[key] ?? BUNDLED_TEXTS[book.slug];
    if (alt == null) return null;
    return bundledToFile(alt as number, `${book.slug}.txt`);
  }
  if (book.textUrl) {
    // Web has no on-device file writes: read the hosted text straight over https.
    if (Platform.OS === 'web') return book.textUrl;
    await FileSystem.makeDirectoryAsync(bookDir(book.slug), { intermediates: true }).catch(() => {});
    const dl = await FileSystem.downloadAsync(book.textUrl, textPath(book.slug));
    return dl.uri;
  }
  return null;
}

/** Playable sources: local file when downloaded, remote stream otherwise. */
export async function playableChapters(
  book: ClassicBook
): Promise<{ title: string; url: string; offline: boolean }[]> {
  const chapters = await fetchChapters(book);
  const bundled = AUDIO_MODS.get(book.slug) ?? [];
  const out: { title: string; url: string; offline: boolean }[] = [];
  for (let i = 0; i < chapters.length; i += 1) {
    const ch = chapters[i];
    if (bundled[i] != null) {
      const uri = await bundledToFile(bundled[i] as number, `${book.slug}-part-${i}.mp3`);
      out.push({ title: ch.title, url: uri, offline: true });
      continue;
    }
    const dest = chapterPath(book.slug, ch.index);
    const info = await FileSystem.getInfoAsync(dest).catch(() => null);
    if (info?.exists) out.push({ title: ch.title, url: dest, offline: true });
    else if (ch.url) out.push({ title: ch.title, url: ch.url, offline: false });
  }
  return out;
}

export async function readTextFile(uri: string): Promise<string> {
  // Anything that is not an on-device file (web asset URLs, hosted .txt
  // links) reads over fetch; only file:// goes through expo-file-system.
  if (!uri.startsWith('file://')) {
    // LoyalBooks/Gutenberg/archive.org send no CORS headers, so a browser
    // fetch to them dies with "Failed to fetch" while native works fine.
    // On web, route cross-origin text reads through our fetch-text edge
    // function (host-allowlisted, plain-text only, CORS-enabled).
    let url = uri;
    if (Platform.OS === 'web' && /^https?:\/\//i.test(uri)) {
      try {
        if (new URL(uri).origin !== window.location.origin && supabaseUrl) {
          url = `${supabaseUrl}/functions/v1/fetch-text?url=${encodeURIComponent(uri)}`;
        }
      } catch {
        // Malformed URL: fall through to the direct fetch and its error.
      }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Text fetch failed (HTTP ${res.status}).`);
    return res.text();
  }
  return FileSystem.readAsStringAsync(uri);
}

/** Human-readable MB label for badges and buttons. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 MB';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
