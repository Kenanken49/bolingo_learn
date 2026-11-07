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
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import credentials from './api/credentials.mjs';
import jobs from './api/jobs.mjs';
import { closePool, query } from './lib/db.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', 'dist');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
/** API bodies are small JSON documents; anything bigger is not for us. */
const MAX_API_BODY = 256 * 1024;

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

/**
 * The one link people share: /download/android.
 *
 * The APK itself lives in object storage (it is a build artifact, not source),
 * so this reads the published metadata and redirects. No metadata means no
 * signed build — answer 404 rather than sending anyone to a dead or stale file.
 * Only https targets are allowed, so the last hop stays encrypted too.
 */
async function redirectToApk(res) {
  let record;
  try {
    record = JSON.parse(await readFile(path.join(DIST, 'downloads', 'latest.json'), 'utf8'));
  } catch {
    return sendJson(res, 404, { error: 'No signed Android build is published yet.' });
  }
  let target = null;
  try {
    target = new URL(String(record?.url || ''));
  } catch {
    target = null;
  }
  if (!target || target.protocol !== 'https:') {
    console.error('[download] published metadata has no usable https url');
    return sendJson(res, 503, { error: 'The published Android download is temporarily unavailable.' });
  }
  res.writeHead(302, { Location: target.toString(), 'Cache-Control': 'no-store' });
  res.end();
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
        ? redirectToApk(res)
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
