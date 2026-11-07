# Bolingo Learn website — Coolify deployment image.
#
# One container serves both halves of the site: the Expo web export from
# `dist/` and the public API (/api/credentials, /api/jobs). Coolify builds this
# Dockerfile on push and injects the environment at runtime.
#
# Build-time values that end up inside the bundle (EXPO_PUBLIC_*) must be set
# as *build* variables in Coolify — they are compiled in, not read at runtime.

# ---- dependencies ----------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# llama.rn's postinstall downloads native binaries the web build never uses;
# skipping install scripts keeps the image buildable and reproducible.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps

# ---- web export ------------------------------------------------------------
FROM deps AS build
WORKDIR /app
# This box is a ~2 GB VPS with no swap. Metro's bundler plus terser peak above
# that and the host's OOM killer ends the build — Coolify then logs
# "Command execution failed (exit code 137)" even though the export itself had
# already printed `Exported: dist`. So: cap the V8 heap so it collects instead
# of growing, and skip minification, which is the peak-memory step and runs
# after the bundle already exists.
ENV CI=1 \
    EXPO_NO_TELEMETRY=1 \
    NODE_OPTIONS=--max-old-space-size=1536
# Expo bakes EXPO_PUBLIC_* into the bundle, so they arrive as build args (a
# Coolify "build variable", or `--build-arg` from the deploy script). They are
# public values by design; the secrets never enter the image.
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_SITE_URL
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY \
    EXPO_PUBLIC_SITE_URL=$EXPO_PUBLIC_SITE_URL
COPY . .
# Same steps as `npm run build:web`, plus the install metadata. --max-workers 1
# and --no-minify keep the peak below the box's RAM (see the ENV block above).
RUN npx expo export --platform web --no-minify --max-workers 1 \
 && node scripts/publish-wireframes.cjs \
 && node scripts/publish-web-extras.cjs

# ---- runtime ---------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server ./server
COPY db/migrations ./db/migrations
COPY package.json ./

# Drop root: nothing in this container writes to disk.
USER node

EXPOSE 3000

# Coolify shows this as healthy only once the server answers; /api/health also
# reports whether Postgres is reachable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
