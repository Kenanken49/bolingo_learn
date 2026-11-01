--
-- Captured production baseline — 22 tables and 2 views that no other file in
-- supabase/ defines. Generated from the live project with:
--
--   PGOPTIONS='--search_path=public' pg_dump "$BOLINGO_DATABASE_URL" \
--     --schema-only --no-owner -t public.users -t public.courses ... (see git log)
--
-- Captured 2026-11-01 from database 17.11. Purpose: a fresh environment can be
-- rebuilt to match production. Apply schema.sql and the migrations first, then
-- this file; it is NOT idempotent (plain CREATE, no IF NOT EXISTS).
--
-- These objects are legacy. RLS is off and no client role holds SELECT/INSERT/
-- UPDATE/DELETE on them — anon and authenticated have only REFERENCES, TRIGGER
-- and TRUNCATE — so the app never reads them. Keep them until a teardown
-- confirms nothing depends on them; do not widen their grants.
--
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_daily_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_daily_usage (
    user_id integer NOT NULL,
    usage_date date NOT NULL,
    calls integer DEFAULT 0 NOT NULL
);


--
-- Name: ai_explanation_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_explanation_cache (
    user_id integer NOT NULL,
    cache_key character varying(64) NOT NULL,
    language character varying(40),
    explanation text NOT NULL,
    source character varying(20) NOT NULL,
    model character varying(100),
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    estimated_cost_usd numeric(12,6) DEFAULT 0 NOT NULL,
    hit_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: ai_explanations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_explanations (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    language character varying(40),
    source character varying(20) NOT NULL,
    model character varying(100),
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    estimated_cost_usd numeric(12,6) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cache_key character varying(64),
    cache_hit boolean DEFAULT false NOT NULL
);


--
-- Name: ai_explanations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_explanations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_explanations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_explanations_id_seq OWNED BY public.ai_explanations.id;


--
-- Name: ai_shared_explanation_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_shared_explanation_cache (
    cache_key character varying(64) NOT NULL,
    language character varying(40),
    explanation text NOT NULL,
    source character varying(20) NOT NULL,
    model character varying(100),
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    estimated_cost_usd numeric(12,6) DEFAULT 0 NOT NULL,
    hit_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    lesson_id integer NOT NULL,
    correct integer NOT NULL,
    total integer NOT NULL,
    passed integer NOT NULL,
    xp_awarded integer NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attempts_id_seq OWNED BY public.attempts.id;


--
-- Name: auth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: auth_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_tokens_id_seq OWNED BY public.auth_tokens.id;


--
-- Name: concept_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concept_reviews (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    concept_id integer NOT NULL,
    quality integer NOT NULL,
    response_ms integer,
    ease_factor_before double precision NOT NULL,
    ease_factor_after double precision NOT NULL,
    interval_before double precision NOT NULL,
    interval_after double precision NOT NULL,
    repetitions_before integer NOT NULL,
    repetitions_after integer NOT NULL,
    difficulty_before double precision NOT NULL,
    difficulty_after double precision NOT NULL,
    reviewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT concept_reviews_quality_check CHECK (((quality >= 0) AND (quality <= 5)))
);


--
-- Name: concept_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.concept_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: concept_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.concept_reviews_id_seq OWNED BY public.concept_reviews.id;


--
-- Name: concepts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concepts (
    id integer NOT NULL,
    slug character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: concepts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.concepts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: concepts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.concepts_id_seq OWNED BY public.concepts.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id integer NOT NULL,
    user_id integer NOT NULL,
    material_id integer NOT NULL,
    title character varying(255) NOT NULL,
    language character varying(64),
    created_at timestamp without time zone NOT NULL
);


--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: learning_path_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_path_steps (
    id integer NOT NULL,
    path_id integer NOT NULL,
    concept_id integer,
    lesson_id integer,
    "position" integer NOT NULL,
    required boolean DEFAULT true NOT NULL
);


--
-- Name: learning_path_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.learning_path_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: learning_path_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.learning_path_steps_id_seq OWNED BY public.learning_path_steps.id;


--
-- Name: learning_paths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_paths (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    audience character varying(40) DEFAULT 'onboarding'::character varying NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT learning_paths_audience_check CHECK (((audience)::text = ANY ((ARRAY['onboarding'::character varying, 'assessment'::character varying, 'upskilling'::character varying])::text[])))
);


--
-- Name: learning_paths_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.learning_paths_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: learning_paths_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.learning_paths_id_seq OWNED BY public.learning_paths.id;


--
-- Name: lesson_concepts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_concepts (
    lesson_id integer NOT NULL,
    concept_id integer NOT NULL,
    weight double precision DEFAULT 1.0 NOT NULL
);


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id integer NOT NULL,
    user_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    kind character varying(16) NOT NULL,
    language character varying(64),
    storage_path character varying(512) NOT NULL,
    text text NOT NULL,
    char_count integer NOT NULL,
    status character varying(16) NOT NULL,
    error text,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materials_id_seq OWNED BY public.materials.id;


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT organization_members_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'applicant'::character varying])::text[]))),
    CONSTRAINT organization_members_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'invited'::character varying, 'removed'::character varying])::text[])))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    owner_user_id integer,
    plan character varying(20) DEFAULT 'team'::character varying NOT NULL,
    seats integer DEFAULT 5 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT organizations_plan_check CHECK (((plan)::text = ANY ((ARRAY['team'::character varying, 'enterprise'::character varying])::text[])))
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: phrases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phrases (
    id integer NOT NULL,
    lesson_id integer,
    source_text text NOT NULL,
    target_text text NOT NULL,
    hint text,
    order_index integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: phrases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.phrases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: phrases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.phrases_id_seq OWNED BY public.phrases.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    slug character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    difficulty character varying(20) DEFAULT 'beginner'::character varying NOT NULL,
    premium_only boolean DEFAULT false NOT NULL,
    estimated_minutes integer DEFAULT 30 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT projects_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying])::text[])))
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    user_id integer NOT NULL,
    tier character varying(20) DEFAULT 'free'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    provider character varying(40),
    provider_customer_id character varying(255),
    provider_subscription_id character varying(255),
    current_period_end timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT subscriptions_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'trialing'::character varying, 'past_due'::character varying, 'canceled'::character varying])::text[]))),
    CONSTRAINT subscriptions_tier_check CHECK (((tier)::text = ANY ((ARRAY['free'::character varying, 'pro'::character varying])::text[])))
);


--
-- Name: user_concept_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_concept_progress (
    user_id integer NOT NULL,
    concept_id integer NOT NULL,
    ease_factor double precision DEFAULT 2.5 NOT NULL,
    interval_days double precision DEFAULT 0 NOT NULL,
    repetitions integer DEFAULT 0 NOT NULL,
    lapses integer DEFAULT 0 NOT NULL,
    difficulty_rating double precision DEFAULT 3 NOT NULL,
    last_quality integer,
    last_reviewed_at timestamp without time zone,
    next_review_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_concept_progress_difficulty_rating_check CHECK (((difficulty_rating >= (1)::double precision) AND (difficulty_rating <= (5)::double precision))),
    CONSTRAINT user_concept_progress_last_quality_check CHECK (((last_quality >= 0) AND (last_quality <= 5)))
);


--
-- Name: user_concept_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_concept_summary AS
 SELECT p.user_id,
    c.id AS concept_id,
    c.slug,
    c.name,
    c.category,
    p.ease_factor,
    p.interval_days,
    p.repetitions,
    p.lapses,
    p.difficulty_rating,
    p.last_quality,
    p.last_reviewed_at,
    p.next_review_at
   FROM (public.user_concept_progress p
     JOIN public.concepts c ON ((c.id = p.concept_id)));


--
-- Name: user_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_progress (
    id integer NOT NULL,
    user_id integer,
    lesson_id integer,
    completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    score integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_streaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_streaks (
    user_id integer NOT NULL,
    streak integer DEFAULT 0,
    last_activity date DEFAULT CURRENT_DATE,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    streak integer DEFAULT 0 NOT NULL,
    last_active_day date,
    hearts integer DEFAULT 5 NOT NULL,
    hearts_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    display_name character varying(255)
);


--
-- Name: user_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_dashboard AS
 SELECT u.id AS user_id,
    u.display_name,
    u.email,
    COALESCE(us.streak, 0) AS current_streak,
    COALESCE(bool_or(up.completed), false) AS has_completed_lessons,
    count(DISTINCT up.lesson_id) FILTER (WHERE up.completed) AS lessons_completed_count
   FROM ((public.users u
     LEFT JOIN public.user_streaks us ON ((u.id = us.user_id)))
     LEFT JOIN public.user_progress up ON (((u.id = up.user_id) AND (up.completed = true))))
  GROUP BY u.id, u.display_name, u.email, us.streak;


--
-- Name: user_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_progress_id_seq OWNED BY public.user_progress.id;


--
-- Name: user_repetitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_repetitions (
    id integer NOT NULL,
    user_id integer,
    phrase_id integer,
    "interval" double precision DEFAULT 1.0,
    repetitions integer DEFAULT 0,
    next_review timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_reviewed timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_repetitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_repetitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_repetitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_repetitions_id_seq OWNED BY public.user_repetitions.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ai_explanations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_explanations ALTER COLUMN id SET DEFAULT nextval('public.ai_explanations_id_seq'::regclass);


--
-- Name: attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts ALTER COLUMN id SET DEFAULT nextval('public.attempts_id_seq'::regclass);


--
-- Name: auth_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens ALTER COLUMN id SET DEFAULT nextval('public.auth_tokens_id_seq'::regclass);


--
-- Name: concept_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concept_reviews ALTER COLUMN id SET DEFAULT nextval('public.concept_reviews_id_seq'::regclass);


--
-- Name: concepts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepts ALTER COLUMN id SET DEFAULT nextval('public.concepts_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: learning_path_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_steps ALTER COLUMN id SET DEFAULT nextval('public.learning_path_steps_id_seq'::regclass);


--
-- Name: learning_paths id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_paths ALTER COLUMN id SET DEFAULT nextval('public.learning_paths_id_seq'::regclass);


--
-- Name: materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials ALTER COLUMN id SET DEFAULT nextval('public.materials_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: phrases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrases ALTER COLUMN id SET DEFAULT nextval('public.phrases_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: user_progress id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress ALTER COLUMN id SET DEFAULT nextval('public.user_progress_id_seq'::regclass);


--
-- Name: user_repetitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_repetitions ALTER COLUMN id SET DEFAULT nextval('public.user_repetitions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: ai_daily_usage ai_daily_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_daily_usage
    ADD CONSTRAINT ai_daily_usage_pkey PRIMARY KEY (user_id, usage_date);


--
-- Name: ai_explanation_cache ai_explanation_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_explanation_cache
    ADD CONSTRAINT ai_explanation_cache_pkey PRIMARY KEY (user_id, cache_key);


--
-- Name: ai_explanations ai_explanations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_explanations
    ADD CONSTRAINT ai_explanations_pkey PRIMARY KEY (id);


--
-- Name: ai_shared_explanation_cache ai_shared_explanation_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_shared_explanation_cache
    ADD CONSTRAINT ai_shared_explanation_cache_pkey PRIMARY KEY (cache_key);


--
-- Name: attempts attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_pkey PRIMARY KEY (id);


--
-- Name: auth_tokens auth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_pkey PRIMARY KEY (id);


--
-- Name: concept_reviews concept_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concept_reviews
    ADD CONSTRAINT concept_reviews_pkey PRIMARY KEY (id);


--
-- Name: concepts concepts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepts
    ADD CONSTRAINT concepts_pkey PRIMARY KEY (id);


--
-- Name: concepts concepts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepts
    ADD CONSTRAINT concepts_slug_key UNIQUE (slug);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: learning_path_steps learning_path_steps_path_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_steps
    ADD CONSTRAINT learning_path_steps_path_id_position_key UNIQUE (path_id, "position");


--
-- Name: learning_path_steps learning_path_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_steps
    ADD CONSTRAINT learning_path_steps_pkey PRIMARY KEY (id);


--
-- Name: learning_paths learning_paths_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_paths
    ADD CONSTRAINT learning_paths_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: learning_paths learning_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_paths
    ADD CONSTRAINT learning_paths_pkey PRIMARY KEY (id);


--
-- Name: lesson_concepts lesson_concepts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_concepts
    ADD CONSTRAINT lesson_concepts_pkey PRIMARY KEY (lesson_id, concept_id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (organization_id, user_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: phrases phrases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrases
    ADD CONSTRAINT phrases_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_slug_key UNIQUE (slug);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (user_id);


--
-- Name: user_concept_progress user_concept_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_concept_progress
    ADD CONSTRAINT user_concept_progress_pkey PRIMARY KEY (user_id, concept_id);


--
-- Name: user_progress user_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_pkey PRIMARY KEY (id);


--
-- Name: user_progress user_progress_user_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);


--
-- Name: user_repetitions user_repetitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_repetitions
    ADD CONSTRAINT user_repetitions_pkey PRIMARY KEY (id);


--
-- Name: user_repetitions user_repetitions_user_id_phrase_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_repetitions
    ADD CONSTRAINT user_repetitions_user_id_phrase_id_key UNIQUE (user_id, phrase_id);


--
-- Name: user_streaks user_streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_streaks
    ADD CONSTRAINT user_streaks_pkey PRIMARY KEY (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_explanation_cache_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_explanation_cache_expiry ON public.ai_explanation_cache USING btree (expires_at);


--
-- Name: idx_ai_explanations_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_explanations_user_time ON public.ai_explanations USING btree (user_id, created_at DESC);


--
-- Name: idx_ai_shared_explanation_cache_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_shared_explanation_cache_expiry ON public.ai_shared_explanation_cache USING btree (expires_at);


--
-- Name: idx_attempts_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attempts_lesson_id ON public.attempts USING btree (lesson_id);


--
-- Name: idx_attempts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attempts_user_id ON public.attempts USING btree (user_id);


--
-- Name: idx_auth_tokens_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_tokens_hash ON public.auth_tokens USING btree (token_hash);


--
-- Name: idx_auth_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_tokens_user_id ON public.auth_tokens USING btree (user_id);


--
-- Name: idx_concept_reviews_concept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concept_reviews_concept ON public.concept_reviews USING btree (concept_id);


--
-- Name: idx_concept_reviews_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concept_reviews_user_time ON public.concept_reviews USING btree (user_id, reviewed_at DESC);


--
-- Name: idx_concepts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concepts_category ON public.concepts USING btree (category);


--
-- Name: idx_courses_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_material_id ON public.courses USING btree (material_id);


--
-- Name: idx_courses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_user_id ON public.courses USING btree (user_id);


--
-- Name: idx_learning_path_steps_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_path_steps_path ON public.learning_path_steps USING btree (path_id, "position");


--
-- Name: idx_learning_paths_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_paths_org ON public.learning_paths USING btree (organization_id);


--
-- Name: idx_lesson_concepts_concept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_concepts_concept ON public.lesson_concepts USING btree (concept_id);


--
-- Name: idx_materials_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_user_id ON public.materials USING btree (user_id);


--
-- Name: idx_org_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_members_user ON public.organization_members USING btree (user_id);


--
-- Name: idx_phrases_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phrases_lesson ON public.phrases USING btree (lesson_id);


--
-- Name: idx_phrases_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phrases_order ON public.phrases USING btree (order_index);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status, current_period_end);


--
-- Name: idx_user_concept_progress_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_concept_progress_due ON public.user_concept_progress USING btree (user_id, next_review_at);


--
-- Name: idx_user_progress_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_progress_lesson ON public.user_progress USING btree (lesson_id);


--
-- Name: idx_user_progress_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_progress_user ON public.user_progress USING btree (user_id);


--
-- Name: idx_user_repetitions_phrase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_repetitions_phrase ON public.user_repetitions USING btree (phrase_id);


--
-- Name: idx_user_repetitions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_repetitions_user ON public.user_repetitions USING btree (user_id);


--
-- Name: idx_user_streaks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_streaks_user ON public.user_streaks USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: ix_attempts_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attempts_lesson_id ON public.attempts USING btree (lesson_id);


--
-- Name: ix_attempts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attempts_user_id ON public.attempts USING btree (user_id);


--
-- Name: ix_auth_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_auth_tokens_token_hash ON public.auth_tokens USING btree (token_hash);


--
-- Name: ix_auth_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_auth_tokens_user_id ON public.auth_tokens USING btree (user_id);


--
-- Name: ix_courses_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_courses_material_id ON public.courses USING btree (material_id);


--
-- Name: ix_courses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_courses_user_id ON public.courses USING btree (user_id);


--
-- Name: ix_materials_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_materials_user_id ON public.materials USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ai_daily_usage ai_daily_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_daily_usage
    ADD CONSTRAINT ai_daily_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ai_explanation_cache ai_explanation_cache_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_explanation_cache
    ADD CONSTRAINT ai_explanation_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ai_explanations ai_explanations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_explanations
    ADD CONSTRAINT ai_explanations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: attempts attempts_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id);


--
-- Name: attempts attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: auth_tokens auth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: concept_reviews concept_reviews_concept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concept_reviews
    ADD CONSTRAINT concept_reviews_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES public.concepts(id) ON DELETE CASCADE;


--
-- Name: concept_reviews concept_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concept_reviews
    ADD CONSTRAINT concept_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: courses courses_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: courses courses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: learning_path_steps learning_path_steps_concept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_steps
    ADD CONSTRAINT learning_path_steps_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES public.concepts(id) ON DELETE SET NULL;


--
-- Name: learning_path_steps learning_path_steps_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_steps
    ADD CONSTRAINT learning_path_steps_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;


--
-- Name: learning_path_steps learning_path_steps_path_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_path_steps
    ADD CONSTRAINT learning_path_steps_path_id_fkey FOREIGN KEY (path_id) REFERENCES public.learning_paths(id) ON DELETE CASCADE;


--
-- Name: learning_paths learning_paths_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_paths
    ADD CONSTRAINT learning_paths_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: learning_paths learning_paths_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_paths
    ADD CONSTRAINT learning_paths_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: lesson_concepts lesson_concepts_concept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_concepts
    ADD CONSTRAINT lesson_concepts_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES public.concepts(id) ON DELETE CASCADE;


--
-- Name: lesson_concepts lesson_concepts_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_concepts
    ADD CONSTRAINT lesson_concepts_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: materials materials_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: phrases phrases_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrases
    ADD CONSTRAINT phrases_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_concept_progress user_concept_progress_concept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_concept_progress
    ADD CONSTRAINT user_concept_progress_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES public.concepts(id) ON DELETE CASCADE;


--
-- Name: user_concept_progress user_concept_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_concept_progress
    ADD CONSTRAINT user_concept_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_progress user_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id);


--
-- Name: user_progress user_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_repetitions user_repetitions_phrase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_repetitions
    ADD CONSTRAINT user_repetitions_phrase_id_fkey FOREIGN KEY (phrase_id) REFERENCES public.phrases(id) ON DELETE CASCADE;


--
-- Name: user_repetitions user_repetitions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_repetitions
    ADD CONSTRAINT user_repetitions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_streaks user_streaks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_streaks
    ADD CONSTRAINT user_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: TABLE ai_daily_usage; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_daily_usage TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_daily_usage TO authenticated;
GRANT ALL ON TABLE public.ai_daily_usage TO service_role;


--
-- Name: TABLE ai_explanation_cache; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_explanation_cache TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_explanation_cache TO authenticated;
GRANT ALL ON TABLE public.ai_explanation_cache TO service_role;


--
-- Name: TABLE ai_explanations; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_explanations TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_explanations TO authenticated;
GRANT ALL ON TABLE public.ai_explanations TO service_role;


--
-- Name: SEQUENCE ai_explanations_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.ai_explanations_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.ai_explanations_id_seq TO service_role;


--
-- Name: TABLE ai_shared_explanation_cache; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_shared_explanation_cache TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_shared_explanation_cache TO authenticated;
GRANT ALL ON TABLE public.ai_shared_explanation_cache TO service_role;


--
-- Name: TABLE attempts; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.attempts TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.attempts TO authenticated;
GRANT ALL ON TABLE public.attempts TO service_role;


--
-- Name: SEQUENCE attempts_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.attempts_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.attempts_id_seq TO service_role;


--
-- Name: TABLE auth_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.auth_tokens TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.auth_tokens TO authenticated;
GRANT ALL ON TABLE public.auth_tokens TO service_role;


--
-- Name: SEQUENCE auth_tokens_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.auth_tokens_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.auth_tokens_id_seq TO service_role;


--
-- Name: TABLE concept_reviews; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.concept_reviews TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.concept_reviews TO authenticated;
GRANT ALL ON TABLE public.concept_reviews TO service_role;


--
-- Name: SEQUENCE concept_reviews_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.concept_reviews_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.concept_reviews_id_seq TO service_role;


--
-- Name: TABLE concepts; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.concepts TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.concepts TO authenticated;
GRANT ALL ON TABLE public.concepts TO service_role;


--
-- Name: SEQUENCE concepts_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.concepts_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.concepts_id_seq TO service_role;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.courses TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.courses TO authenticated;
GRANT ALL ON TABLE public.courses TO service_role;


--
-- Name: SEQUENCE courses_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.courses_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.courses_id_seq TO service_role;


--
-- Name: TABLE learning_path_steps; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.learning_path_steps TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.learning_path_steps TO authenticated;
GRANT ALL ON TABLE public.learning_path_steps TO service_role;


--
-- Name: SEQUENCE learning_path_steps_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.learning_path_steps_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.learning_path_steps_id_seq TO service_role;


--
-- Name: TABLE learning_paths; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.learning_paths TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.learning_paths TO authenticated;
GRANT ALL ON TABLE public.learning_paths TO service_role;


--
-- Name: SEQUENCE learning_paths_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.learning_paths_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.learning_paths_id_seq TO service_role;


--
-- Name: TABLE lesson_concepts; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.lesson_concepts TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.lesson_concepts TO authenticated;
GRANT ALL ON TABLE public.lesson_concepts TO service_role;


--
-- Name: TABLE materials; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.materials TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.materials TO authenticated;
GRANT ALL ON TABLE public.materials TO service_role;


--
-- Name: SEQUENCE materials_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.materials_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.materials_id_seq TO service_role;


--
-- Name: TABLE organization_members; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.organization_members TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.organization_members TO authenticated;
GRANT ALL ON TABLE public.organization_members TO service_role;


--
-- Name: TABLE organizations; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.organizations TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.organizations TO service_role;


--
-- Name: SEQUENCE organizations_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.organizations_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.organizations_id_seq TO service_role;


--
-- Name: TABLE phrases; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.phrases TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.phrases TO authenticated;
GRANT ALL ON TABLE public.phrases TO service_role;


--
-- Name: SEQUENCE phrases_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.phrases_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.phrases_id_seq TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.projects TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;


--
-- Name: SEQUENCE projects_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.projects_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.projects_id_seq TO service_role;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.subscriptions TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;


--
-- Name: TABLE user_concept_progress; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_concept_progress TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_concept_progress TO authenticated;
GRANT ALL ON TABLE public.user_concept_progress TO service_role;


--
-- Name: TABLE user_concept_summary; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_concept_summary TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_concept_summary TO authenticated;
GRANT ALL ON TABLE public.user_concept_summary TO service_role;


--
-- Name: TABLE user_progress; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_progress TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_progress TO authenticated;
GRANT ALL ON TABLE public.user_progress TO service_role;


--
-- Name: TABLE user_streaks; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_streaks TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_streaks TO authenticated;
GRANT ALL ON TABLE public.user_streaks TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.users TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: TABLE user_dashboard; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_dashboard TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_dashboard TO authenticated;
GRANT ALL ON TABLE public.user_dashboard TO service_role;


--
-- Name: SEQUENCE user_progress_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.user_progress_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.user_progress_id_seq TO service_role;


--
-- Name: TABLE user_repetitions; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_repetitions TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_repetitions TO authenticated;
GRANT ALL ON TABLE public.user_repetitions TO service_role;


--
-- Name: SEQUENCE user_repetitions_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.user_repetitions_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.user_repetitions_id_seq TO service_role;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.users_id_seq TO authenticated;
GRANT SELECT,USAGE ON SEQUENCE public.users_id_seq TO service_role;


--
-- PostgreSQL database dump complete
--

