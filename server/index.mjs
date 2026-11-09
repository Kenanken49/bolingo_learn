/**
 * Bolingo web server — the one container Coolify runs.
 *
 * It does the two jobs a static export cannot:
 *   1. Serve `dist/` (the Expo web export) with SPA fallback and cache headers.
 *   2. Answer `/api/*` — credential verification and the job marketplace.
 *
 * Plain Node HTTP, no framework and no serverless runtime. API requests are
 * turned into standard `Request` objects, so the handlers in `server/api` are
 * ordinary fetch handlers that would run unchanged on any modern runtime.
 */
import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import credentials from './api/credentials.mjs';
import feedback from './api/feedback.mjs';
import jobs from './api/jobs.mjs';
import { closePool, query } from './lib/db.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(process.env.BOLINGO_DIST || path.join(HERE, '..', 'dist'));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
/** API bodies are small JSON documents; anything bigger is not for us. */
const MAX_API_BODY = 256 * 1024;
/**
 * Where Android binaries live on the host. Coolify mounts a persistent volume
 * here: a release APK is ~166 MB, too big for git, too big for the image, and
 * bigger than the 50 MiB object cap on the storage plan we used before.
 */
const APK_DIR = path.resolve(process.env.BOLINGO_APK_DIR || '/var/data/app-downloads');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.apk': 'application/vnd.android.package-archive',
  '.sha256': 'text/plain; charset=utf-8',
};

/** API routes: path segment → handler plus the name of its single parameter. */
const ROUTES = {
  credentials: { handler: credentials, param: 'code' },
  jobs: { handler: jobs, param: 'id' },
  // Contact form: public for the same reason /privacy is — a learner who cannot
  // sign in must still be able to reach support.
  feedback: { handler: feedback, param: null },
};

/** Fingerprinted bundles cache for a year; HTML never caches, so a deploy is instant. */
function cacheFor(filePath) {
  const rel = `/${path.relative(DIST, filePath).split(path.sep).join('/')}`;
  if (rel.startsWith('/_expo/static/')) return 'public, max-age=31536000, immutable';
  if (rel.endsWith('.html')) return 'public, max-age=0, must-revalidate';
  if (rel === '/app-ads.txt') return 'public, max-age=86400';
  // The install page re-reads this on every visit: a newly published build must
  // never be hidden behind a cached "no build yet".
  if (rel === '/downloads/latest.json') return 'no-store';
  return 'public, max-age=3600';
}

/** Resolve a URL path inside `dist`, refusing anything that escapes it. */
function resolveInDist(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const rel = path.normalize(decoded).replace(/^([/\\]|\.\.[/\\])+/, '');
  const full = path.join(DIST, rel);
  return full === DIST || full.startsWith(DIST + path.sep) ? full : null;
}

async function fileAt(candidate) {
  if (!candidate) return null;
  try {
    const info = await stat(candidate);
    return info.isFile() ? candidate : null;
  } catch {
    return null;
  }
}

async function sendFile(res, filePath, method) {
  const info = await stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Content-Length', info.size);
  res.setHeader('Cache-Control', cacheFor(filePath));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // An APK is a download, never something the browser renders inline.
  if (ext === '.apk') res.setHeader('Content-Disposition', 'attachment');
  if (method === 'HEAD') {
    res.writeHead(200);
    res.end();
    return;
  }
  res.writeHead(200);
  await pipeline(createReadStream(filePath), res);
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_API_BODY) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

/** Node request → standard Request, so handlers stay runtime-agnostic. */
async function toRequest(req, url) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
  }
  const method = (req.method || 'GET').toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await readBody(req) : undefined;
  return new Request(`http://${req.headers.host || 'localhost'}${url.pathname}${url.search}`, {
    method,
    headers,
    body,
    ...(body ? { duplex: 'half' } : {}),
  });
}

async function sendResponse(res, response) {
  const buffer = Buffer.from(await response.arrayBuffer());
  const headers = {};
  for (const [key, value] of response.headers) headers[key] = value;
  headers['content-length'] = String(buffer.length);
  res.writeHead(response.status, headers);
  res.end(buffer);
}

async function health(res) {
  const state = { ok: true, service: 'bolingo-web', db: 'unconfigured' };
  if (process.env.DATABASE_URL) {
    try {
      await query('SELECT 1');
      state.db = 'up';
    } catch (error) {
      state.ok = false;
      state.db = 'down';
      console.error('[health] database:', error.message);
    }
  }
  sendJson(res, state.ok ? 200 : 503, state);
}

async function handleApi(req, res, url) {
  const pathname = url.pathname.replace(/\/+$/, '') || '/api';
  if (pathname === '/api/health') return health(res);

  // ['', 'api', 'jobs', '<id>'] — the leading empty segment is the split of "/".
  const [, , name, param] = pathname.split('/');
  const route = ROUTES[name];
  if (!route) return sendJson(res, 404, { error: 'Unknown endpoint.' });
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    });
    return res.end();
  }

  try {
    const request = await toRequest(req, url);
    const params = param ? { [route.param]: decodeURIComponent(param) } : {};
    await sendResponse(res, await route.handler(request, params));
  } catch (error) {
    if (error?.statusCode === 413) return sendJson(res, 413, { error: error.message });
    console.error(`[api] ${req.method} ${url.pathname}:`, error);
    sendJson(res, 500, { error: 'Something went wrong on our side. Please try again in a moment.' });
  }
}

/** Download headers: attachment, honest type, and a promise that ranges work. */
function apkHeaders(fileName) {
  return {
    'Content-Type': MIME['.apk'],
    'Content-Disposition': `attachment; filename="${String(fileName).replace(/[^A-Za-z0-9._-]/g, '')}"`,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
  };
}

/**
 * `Range: bytes=a-b` / `bytes=a-` / `bytes=-n`. Returns null when the header is
 * absent or in a form we do not speak (then serve the whole file), and
 * `{ unsatisfiable }` when it is a real range the file cannot cover.
 */
function parseRange(header, total) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header || '').trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;
  let start;
  let end;
  if (match[1] === '') {
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? total - 1 : Number(match[2]);
  }
  if (!Number.isFinite(start) || start >= total || start > end) return { unsatisfiable: true };
  return { start, end: Math.min(end, total - 1) };
}

/**
 * The published build record. The release volume wins over the copy baked into
 * `dist`: dropping `latest.json` next to the APK republishes a build without
 * rebuilding the container, while the committed copy still answers on a host
 * whose volume is not mounted yet.
 */
async function readBuildRecord() {
  for (const dir of [APK_DIR, path.join(DIST, 'downloads')]) {
    try {
      return JSON.parse(await readFile(path.join(dir, 'latest.json'), 'utf8'));
    } catch {
      // Absent here — look in the next place.
    }
  }
  return null;
}

/** Which build is published, exactly as the install page will be told. */
async function serveBuildMetadata(req, res, url) {
  try {
    const body = await readFile(path.join(APK_DIR, 'latest.json'));
    res.writeHead(200, {
      'Content-Type': MIME['.json'],
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if ((req.method || 'GET').toUpperCase() === 'HEAD') return res.end();
    return res.end(body);
  } catch {
    return handleStatic(req, res, url);
  }
}

/**
 * The one link people share: /download/android.
 *
 * `scripts/publish-android-apk.cjs` writes the record; the binary itself lives
 * on the host volume in APK_DIR, so it survives redeploys without entering git
 * or the image. Downloads are streamed and answer Range requests — a 166 MB
 * file over mobile data needs to resume, not restart.
 *
 * A record that names an outside https object still redirects, so either
 * hosting works. No metadata, or metadata whose file never landed, answers
 * honestly instead of sending a learner to a dead or stale APK. Never redirect
 * back to this route: that would loop.
 */
async function serveApk(req, res) {
  const record = await readBuildRecord();
  if (!record) return sendJson(res, 404, { error: 'No signed Android build is published yet.' });

  const fileName = path.basename(String(record?.fileName || ''));
  if (fileName.endsWith('.apk')) {
    const filePath = path.join(APK_DIR, fileName);
    let info = null;
    try {
      info = await stat(filePath);
    } catch {
      info = null;
    }
    if (info && info.isFile()) {
      const range = parseRange(req.headers.range, info.size);
      if (range && range.unsatisfiable) {
        res.writeHead(416, { ...apkHeaders(fileName), 'Content-Range': `bytes */${info.size}` });
        return res.end();
      }
      const start = range ? range.start : 0;
      const end = range ? range.end : info.size - 1;
      const partial = start > 0 || end < info.size - 1;
      res.writeHead(partial ? 206 : 200, {
        ...apkHeaders(fileName),
        'Content-Length': end - start + 1,
        ...(partial ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}),
      });
      if ((req.method || 'GET').toUpperCase() === 'HEAD') return res.end();
      return pipeline(createReadStream(filePath, { start, end }), res);
    }
  }

  let target = null;
  try {
    target = new URL(String(record?.url || ''));
  } catch {
    target = null;
  }
  if (target && target.protocol === 'https:' && target.pathname !== '/download/android') {
    res.writeHead(302, { Location: target.toString(), 'Cache-Control': 'no-store' });
    return res.end();
  }

  console.error(
    `[download] nothing to serve: no file at ${path.join(APK_DIR, fileName)} and the published record has no external url.` +
      ' Mount the release volume and copy the APK there (docs/install-from-web.md).',
  );
  return sendJson(res, 503, { error: 'The published Android download is temporarily unavailable.' });
}

// ---------------------------------------------------------------------------
// Release integrity — read the whole volume file before a learner does
// ---------------------------------------------------------------------------

/**
 * The published record is an assertion about a file on a volume. Volumes are
 * re-created by deploys, restore commands and human hands, so the only check
 * that means anything is to hash what the volume actually holds right now.
 *
 * Doing it here rather than in CI is not a shortcut: the file is on this
 * container's disk, so this is the byte-for-byte work, without shipping a
 * ~172 MB download across the internet to compute it. Streaming the whole file
 * is the point — a sampled hash cannot see corruption or truncation anywhere
 * else, which is exactly the drift that turns a green CI into a broken install.
 */

/** Cache keyed by the file's identity. Repeated hits cost one read, not N. */
const INTEGRITY_TTL_MS = 60_000;
const INTEGRITY_HEADER = 'x-bolingo-integrity-token';
let integrityCache = { key: '', expiresAt: 0, pending: null, result: null };

function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** sha256 and byte count of everything the server can read at `filePath`. */
function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    let sizeBytes = 0;
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => {
      hash.update(chunk);
      sizeBytes += chunk.length;
    });
    stream.on('end', () => resolve({ sha256: hash.digest('hex'), sizeBytes }));
  });
}

async function serveIntegrity(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed.' });
  const configured = String(process.env.BOLINGO_INTEGRITY_TOKEN || '');
  if (!configured) {
    // No token means no endpoint: never hand out a free 172 MB read to anyone.
    return sendJson(res, 503, { error: 'Set BOLINGO_INTEGRITY_TOKEN to enable release integrity checks.' });
  }
  if (!constantTimeEqual(req.headers[INTEGRITY_HEADER] || '', configured)) {
    return sendJson(res, 401, { error: 'Unauthorized' });
  }

  const record = await readBuildRecord();
  if (!record) {
    return sendJson(res, 404, { error: 'No signed Android build is published yet.' });
  }

  const fileName = path.basename(String(record.fileName || ''));
  const filePath = path.join(APK_DIR, fileName);
  let info = null;
  try {
    info = await stat(filePath);
  } catch {
    info = null;
  }

  const recordView = {
    version: record.version ?? null,
    buildNumber: record.buildNumber ?? null,
    packageName: record.packageName ?? null,
    fileName: record.fileName ?? null,
    sizeBytes: record.sizeBytes ?? null,
    sha256: record.sha256 ?? null,
    url: record.url ?? null,
    publishedAt: record.publishedAt ?? null,
    minAndroid: record.minAndroid ?? null,
  };

  if (!fileName.endsWith('.apk') || !info || !info.isFile()) {
    return sendJson(res, 200, {
      checkedAt: new Date().toISOString(),
      volume: { present: false, path: filePath },
      record: recordView,
      match: false,
      mismatch: ['the file the record names is not on the volume'],
    });
  }

  const key = `${filePath}:${info.mtimeMs}:${info.size}`;
  const now = Date.now();
  if (integrityCache.key === key && integrityCache.expiresAt > now && integrityCache.result) {
    return sendJson(res, 200, { ...integrityCache.result, cached: true });
  }
  if (integrityCache.key === key && integrityCache.pending) {
    return sendJson(res, 200, await integrityCache.pending);
  }

  const pending = (async () => {
    const startedAt = Date.now();
    const digest = await hashFile(filePath);
    const result = {
      checkedAt: new Date().toISOString(),
      volume: {
        present: true,
        path: filePath,
        sizeBytes: digest.sizeBytes,
        statSizeBytes: info.size,
        sha256: digest.sha256,
        hashedInMs: Date.now() - startedAt,
        mtime: new Date(info.mtimeMs).toISOString(),
      },
      record: recordView,
      match:
        digest.sizeBytes === Number(record.sizeBytes) &&
        digest.sha256 === String(record.sha256).toLowerCase(),
    };
    const mismatches = [];
    if (digest.sizeBytes !== Number(record.sizeBytes)) mismatches.push(`size: volume ${digest.sizeBytes} vs record ${record.sizeBytes}`);
    if (digest.sha256 !== String(record.sha256).toLowerCase()) {
      mismatches.push(`sha256: volume ${digest.sha256.slice(0, 12)}… vs record ${String(record.sha256).slice(0, 12)}…`);
    }
    if (digest.sizeBytes !== info.size) mismatches.push(`stream: read ${digest.sizeBytes} of ${info.size} bytes on disk`);
    result.mismatch = mismatches;
    integrityCache = { key, expiresAt: Date.now() + INTEGRITY_TTL_MS, pending: null, result };
    return result;
  })();
  integrityCache = { key, expiresAt: 0, pending, result: integrityCache.result };

  try {
    return sendJson(res, 200, await pending);
  } catch (error) {
    integrityCache = { key: '', expiresAt: 0, pending: null, result: null };
    console.error('[integrity]', error);
    return sendJson(res, 500, { error: `Integrity check failed: ${error.message}` });
  }
}

async function handleStatic(req, res, url) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method not allowed');
  }

  const target = resolveInDist(url.pathname);
  if (target) {
    const direct = await fileAt(target);
    if (direct) return sendFile(res, direct, method);
    // /wireframes and other directory routes serve their own index.
    const nested = await fileAt(path.join(target, 'index.html'));
    if (nested) return sendFile(res, nested, method);
  }

  // A missing asset is a real 404; every other path is an Expo Router deep
  // link that index.html boots client-side.
  if (path.extname(url.pathname) && !url.pathname.endsWith('.html')) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end('Not found');
  }

  const index = await fileAt(path.join(DIST, 'index.html'));
  if (!index) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end('The web build is missing. Run `npm run build:web`.');
  }
  return sendFile(res, index, method);
}

export function createBolingoServer() {
  return createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const task =
      url.pathname === '/download/android'
        ? serveApk(req, res)
        : url.pathname === '/downloads/latest.json'
          ? serveBuildMetadata(req, res, url)
          : url.pathname === '/api/release-integrity'
            ? serveIntegrity(req, res)
            : url.pathname === '/api' || url.pathname.startsWith('/api/')
              ? handleApi(req, res, url)
              : handleStatic(req, res, url);
    task.catch((error) => {
      console.error(`[web] ${req.method} ${url.pathname}:`, error);
      if (!res.headersSent) sendJson(res, 500, { error: 'Something went wrong on our side.' });
      else res.end();
    });
  });
}

/** Boot: optional migrations, then listen. Exported so tests can reuse it. */
export async function start() {
  if (process.env.MIGRATE_ON_START === '1') {
    const { runMigrations } = await import('./migrate.mjs');
    await runMigrations();
  }
  const server = createBolingoServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, resolve);
  });
  console.log(`Bolingo web listening on http://${HOST}:${PORT} (serving ${DIST})`);

  const shutdown = (signal) => {
    console.log(`${signal} received — closing.`);
    server.close(() => {
      void closePool().finally(() => process.exit(0));
    });
    // A hung keep-alive connection must never block a redeploy.
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  return server;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  start().catch((error) => {
    console.error('Bolingo web failed to start:', error);
    process.exit(1);
  });
}
