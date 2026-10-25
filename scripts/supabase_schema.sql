-- ---------------------------------------------------------------------
-- Bolingo  Supabase schema
--
-- The FastAPI backend uses SQLAlchemy 2.0 with:
--   JSON_COL = JSON().with_variant(JSONB(), "postgresql")
-- so `payload` is stored as JSONB on Postgres and plain JSON on SQLite.
-- This file assumes Postgres + JSONB data types.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- users : profiles, XP, streaks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,

    xp              INTEGER NOT NULL DEFAULT 0,
    streak          INTEGER NOT NULL DEFAULT 0,
    last_active_day DATE,
    hearts          INTEGER NOT NULL DEFAULT 5,
    hearts_updated_at TIMESTAMP,

    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ---------------------------------------------------------------------------
-- auth_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_tokens (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens (token_hash);

-- ---------------------------------------------------------------------------
-- materials : uploaded file metadata
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename      VARCHAR(255) NOT NULL,
    kind          VARCHAR(16) NOT NULL,          -- pdf | text | audio
    language      VARCHAR(64),
    storage_path  VARCHAR(512) NOT NULL,
    text          TEXT NOT NULL DEFAULT '',
    char_count    INTEGER NOT NULL DEFAULT 0,

    status        VARCHAR(16) NOT NULL DEFAULT 'uploaded',  -- uploaded | processing | ready | failed
    error         TEXT,

    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials (user_id);

-- ---------------------------------------------------------------------------
-- courses : one course per material
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    language    VARCHAR(64),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses (user_id);
CREATE INDEX IF NOT EXISTS idx_courses_material_id ON courses (material_id);

-- ---------------------------------------------------------------------------
-- lessons : AI-generated lesson JSON stored as JSONB
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
    id          SERIAL PRIMARY KEY,
    course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    ord         INTEGER NOT NULL DEFAULT 0,
    title       VARCHAR(255) NOT NULL,
    generator   VARCHAR(32) NOT NULL DEFAULT 'offline',
    payload     JSONB NOT NULL DEFAULT '{}',   -- strict lesson JSON (Pydantic-validated)
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons (course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_material_id ON lessons (material_id);

-- Index over the JSONB column speeds up lookups of question-type fields and
-- any future JSONB path queries.  The JSON contract is fixed by the Pydantic
-- schema, so a GIN index on the whole document is the useful generic option.
CREATE INDEX IF NOT EXISTS idx_lessons_payload ON lessons USING GIN (payload);

-- ---------------------------------------------------------------------------
-- attempts : scored lesson runs (XP, streak, hearts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attempts (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id    INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    correct      INTEGER NOT NULL DEFAULT 0,
    total        INTEGER NOT NULL DEFAULT 0,
    passed       INTEGER NOT NULL DEFAULT 0,   -- 0/1
    xp_awarded   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_lesson_id ON attempts (lesson_id);

-- ---------------------------------------------------------------------------
-- Storage bucket (managed in Supabase Dashboard > Storage instead)
--   supabase storage add-bucket bolingo
--   supabase storage link-bucket bolingo public /bolingo
-- -------------------------------------------------------------------------
