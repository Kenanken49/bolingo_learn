# Bolingo

**Bolingo** is an AI-powered Duolingo-style learning platform. Upload learning
materials (PDF, text, or audio), and Bolingo chunks them into structured,
interactive lessons — validated as strict JSON, delivered through a FastAPI
backend with XP, streaks, hearts, and WebSocket progress streaming.

The repository contains the **FastAPI backend** (`app/`) and the **React web
dashboard** (`web/`). A Flutter mobile client is planned.

## Quickstart

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # use `python`/`pip` on macOS/Linux
cp .env.example .env                                     # optional: defaults work
.venv/Scripts/python -m uvicorn app.main:app --reload --env-file .env
```

Open <http://127.0.0.1:8000/docs> for interactive Swagger docs. Zero
configuration needed: SQLite database, local upload directory, and a
deterministic offline lesson generator all work by default.

The React dashboard lives in `web/` and proxies `/api` and `/ws` to the
backend on port 8000:

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # DOM tests (Vitest + Testing Library)
npm run build      # typecheck + production bundle
```

## How it works

```
upload material ──> extract text ──> chunk ──> AI generates JSON lesson
   (pdf/text/audio)  (Whisper for     (one        (Pydantic-validated,
                      audio)        chunk =        served via REST)
                                    1 lesson)
```

1. `POST /api/auth/signup` → bearer token
2. `POST /api/materials` (multipart file) → stores the material
3. `POST /api/materials/{id}/lessons` → schedules generation (HTTP 202)
   - follow live progress on `WS /ws/generations/{id}?token=...`
4. `GET /api/lessons/{id}` → items **with correct answers stripped**
5. `POST /api/lessons/{id}/attempt` → server-side scoring reveals answers,
   awards XP, updates streaks, and spends hearts

## Lesson JSON contract

Every provider (offline or LLM) must produce JSON matching
`app/schemas.py` — `extra="forbid"`, a discriminated `question_type`, and
semantic checks (correct answer must appear in the options):

```json
{
  "title": "Photosynthesis basics",
  "language": "en",
  "items": [
    {
      "question_type": "multiple_choice",
      "prompt": "Chlorophyll absorbs light in the ____ range.",
      "options": ["blue and red", "green and yellow", "infrared", "ultraviolet"],
      "correct_answer": "blue and red",
      "explanation": "Chlorophyll reflects green, absorbing blue and red light."
    }
  ]
}
```

Question types: `multiple_choice`, `fill_in_blank`, `translate`, `listening`,
`speak`.

## Providers & keys (all optional)

| Capability            | Default (no keys)        | With keys                                    |
| --------------------- | ------------------------ | -------------------------------------------- |
| Lesson generation     | Deterministic offline    | `OPENAI_API_KEY` → GPT-4o strict JSON + retry |
| Audio transcription   | Upload a transcript      | `OPENAI_API_KEY` → Whisper                   |
| Text-to-speech        | 503 with setup guidance  | `ELEVENLABS_API_KEY` or `DEEPGRAM_API_KEY`   |
| Database              | SQLite                   | `BOLINGO_DATABASE_URL` → Postgres            |
| File storage          | `./var/uploads`          | `SUPABASE_*` → generated audio in Storage    |

See `.env.example` for every setting.

## API surface

| Method | Path                                      | Purpose                          |
| ------ | ----------------------------------------- | -------------------------------- |
| POST   | `/api/auth/signup` · `/api/auth/login`    | Accounts → bearer token          |
| POST   | `/api/auth/logout`                        | Revoke every token for the caller |
| GET    | `/api/me`                                 | XP, streak, hearts, quest, league, activity |
| POST   | `/api/materials`                          | Upload PDF/text/audio (+ `transcript`) |
| POST   | `/api/materials/{id}/lessons`             | Generate (idempotent, 202)       |
| GET    | `/api/courses`                            | Your courses + lesson counts      |
| GET    | `/api/courses/catalog`                   | Built-in curriculum tracks        |
| GET    | `/api/courses/{id}/lessons`               | Lesson path + best/passed status |
| GET    | `/api/lessons/{id}`                       | Playable items (answers hidden)  |
| POST   | `/api/lessons/{id}/attempt`               | Score, XP, streak, hearts        |
| POST   | `/api/lessons/{id}/speech-attempt`        | Whisper-scored speaking → XP/quest |
| POST   | `/api/tts`                                | Listening exercise audio         |
| GET    | `/api/leaderboard`                        | Weekly top 10 in the caller's tier |
| WS     | `/ws/generations/{material_id}`           | Generation progress + replay     |

## Sessions

Bearer tokens expire after `BOLINGO_TOKEN_TTL_SECONDS` (30 days by default).
Expired tokens are rejected with `401` and deleted on first use.
`POST /api/auth/logout` revokes every token for the caller, so signing out on
one device signs out all of them.

## Gamification rules

- **XP**: 10 per correct answer; a passed non-perfect lesson adds +10, a
  perfect lesson +20 (`BOLINGO_XP_PER_CORRECT`, `BOLINGO_XP_PERFECT_BONUS`).
- **Hearts**: 5 max, one refills every 30 min (`BOLINGO_HEARTS_MAX`,
  `BOLINGO_HEART_REFILL_SECONDS`); a failed attempt costs one, and attempts
  are blocked at 0.
- **Streak**: passing a lesson on consecutive days increments it. If a whole
  day is skipped, the next `GET /api/me` resets the streak to 0 so the loss is
  visible immediately; the following pass restarts it at 1.
- **Daily quest**: "Earn 20 XP today", recomputed from today's scored lesson
  attempts and speaking practice, and reset at local midnight.
- **Leagues**: weekly seasons run Monday–Sunday in the server's timezone.
  Your first tier is seeded from lifetime XP (0 / 4,000 / 6,000 / 9,000 /
  11,000 → bronze → silver → gold → diamond → master), then only seasons move
  you. Standings rank XP earned that week. When a tier has at least 7 ranked
  learners, the top 3 promote and the bottom 3 demote at the next Monday read;
  master cannot promote, bronze cannot demote, and a learner who earned no XP
  that week is never demoted. Rollover runs in an in-process scheduler (and
  lazily on the first league read as a fallback); a `league_seasons` row makes
  it idempotent across workers and restarts.
  `GET /api/me` exposes `league_tier`, `league_points` (this week),
  `league_rank`, `league_zone`, `league_next_in` (weekly XP to the promotion
  zone), `daily_quest`, and `activity_days` (the last 7 days with a scored
  attempt or speaking exercise).
- **Pass threshold**: 80 % correct (`BOLINGO_PASS_THRESHOLD`).

The web app renders the daily quest, the 7-day activity strip, and the league
summary on the home page; `/leaderboard` shows the weekly standings, your
rank, the promotion/demotion zones, and the tier ladder.

## Tests

```bash
.venv/Scripts/python -m pytest -q     # backend
cd web && npm test                    # dashboard
```

74 backend tests cover the JSON contract, extraction (including a hand-built
PDF), chunking, the offline generator, the full API flow, WebSocket streaming
+ restart recovery, speech endpoints, sessions, Alembic migrations, and the
gamification engine (quests, weekly seasons over two HTTP weeks,
promotion/demotion, leaderboard isolation, activity days, streak rules), the
scheduled rollover job, and both storage backends. Three Vitest suites cover
the home-page quest/streak/league cards and the league page.

## Production notes

- **Database**: point `BOLINGO_DATABASE_URL` at Postgres and apply migrations
  with `alembic upgrade head`. Zero-config development still creates tables at
  startup; after one startup, adopt migrations with `alembic stamp head`.
  See `migrations/README`.
- **Storage**: mount `BOLINGO_UPLOAD_DIR` on a persistent volume for uploaded
  materials. Configuring `SUPABASE_*` additionally uploads generated TTS audio
  to Supabase Storage and returns its public URL; the API never serves uploaded
  materials itself.
- **CORS**: set `BOLINGO_CORS_ORIGINS` to the dashboard origin(s); the
  default `*` is for local development only.
- **Secrets**: pass provider keys as environment variables and never commit
  `.env` (only `.env.example` belongs in the repository).
- **Serving**: run `uvicorn app.main:app --host 0.0.0.0 --port 8000` (without
  `--reload`) behind TLS, serve `web/dist` for the dashboard, and use
  `GET /health` for liveness checks.
- **League rollover**: every worker runs a 5-minute check (configure with
  `BOLINGO_LEAGUE_ROLLOVER_CHECK_SECONDS`); the database marker makes duplicate
  runs harmless. To schedule it externally instead, set
  `BOLINGO_SCHEDULER_ENABLED=0` and run `python -m app.jobs` from cron or a
  systemd timer.
- **Time**: streaks, daily quests, and activity days use the server's local
  calendar, so run the backend in the timezone your learners expect.

## Repository layout

```
app/
  main.py           FastAPI app, WebSocket endpoint, restart recovery
  config.py         env-driven settings (zero-config defaults)
  db.py models.py   SQLAlchemy 2.0 models (SQLite → Postgres via env)
  schemas.py        strict lesson JSON contract (Pydantic v2)
  ingest/           PDF/text extraction + sentence-aware chunking
  ai/               provider protocol, offline generator, GPT-4o, speech
  services/         generation pipeline, gamification, storage
  routers/          auth, gamification, materials, lessons, speech
tests/              backend suite (pytest)
migrations/         Alembic schema migrations
web/                React dashboard (Vite, TypeScript, Vitest)
```
