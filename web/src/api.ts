/**
 * Typed Bolingo API client. Auth is a bearer token kept in localStorage;
 * every request attaches it automatically.
 */

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";

export type QuestionType =
  | "multiple_choice"
  | "fill_in_blank"
  | "translate"
  | "listening"
  | "speak";

export interface User {
  id: number;
  email: string;
  xp: number;
  streak: number;
  hearts: number;
  hearts_refill_seconds: number;
  gems: number;
  lessons_completed: number;
  daily_quest: DailyQuest | null;
  /** ISO dates in the last 7 days with at least one scored attempt. */
  activity_days: string[];
  league_tier: LeagueTier;
  /** XP earned in the current weekly season. */
  league_points: number;
  /** Weekly XP still required to reach the promotion zone. */
  league_next_in: number;
  league_rank: number | null;
  league_zone: LeagueZone;
  created_at: string;
}

export type LeagueTier = "bronze" | "silver" | "gold" | "diamond" | "master";
export type LeagueZone = "promotion" | "safe" | "demotion";

export interface DailyQuest {
  id: number;
  quest_type: string;
  target: number;
  current: number;
  progress_percent: number;
  completed: boolean;
}

export interface LeaderboardEntry {
  user_id: number;
  name: string;
  /** XP earned in the current weekly season. */
  xp: number;
  streak: number;
  zone: LeagueZone;
}

export interface Leaderboard {
  tier: LeagueTier;
  /** Monday this season started (ISO date). */
  week_start: string;
  entries: LeaderboardEntry[];
  me: LeaderboardEntry;
}

export interface Material {
  id: number;
  filename: string;
  kind: string;
  language: string | null;
  status: "uploaded" | "processing" | "ready" | "failed";
  error: string | null;
  char_count: number;
  created_at: string;
}

export interface GenerateResult {
  course_id: number | null;
  material_id: number;
  status: string;
  lesson_ids: number[];
}

export interface LessonSummary {
  id: number;
  ord: number;
  title: string;
  item_count: number;
  best_correct: number | null;
  passed: boolean;
}

export interface Course {
  id: number;
  title: string;
  language: string | null;
  material_id: number;
  lessons: LessonSummary[];
}

/** One row of the learner's course list (no lesson payloads). */
export interface LibraryCourseSummary {
  slug: string;
  title: string;
  description: string;
  source: string;
  source_url: string | null;
  lesson_count: number;
}

export interface LibraryLesson {
  slug: string;
  title: string;
  body: string;
}

export interface LibraryCourse extends LibraryCourseSummary {
  lessons: LibraryLesson[];
}

export interface CourseSummary {
  id: number;
  title: string;
  language: string | null;
  material_id: number;
  lesson_count: number;
}

export interface CatalogLessonProgress {
  index: number;
  completed: boolean;
}

export interface CatalogLevelProgress {
  number: number;
  unlocked: boolean;
  unlock_cost: number;
  lessons: CatalogLessonProgress[];
}

export interface CatalogTrackProgress {
  slug: string;
  levels: CatalogLevelProgress[];
}

export interface CatalogProgress {
  gems: number;
  gems_per_lesson: number;
  gems_per_unlock: number;
  tracks: CatalogTrackProgress[];
}

export interface CompleteLessonResult {
  gems_awarded: number;
  gems: number;
  already_completed: boolean;
}

/** Outline lesson from the built-in curriculum catalog. */
export interface CatalogLesson {
  title: string;
  kind: string;
  instruction: string;
  difficulty: number;
}

export interface CatalogLevel {
  number: number;
  lessons: CatalogLesson[];
}

export interface CatalogTrack {
  slug: string;
  name: string;
  description: string;
  levels: CatalogLevel[];
}

export interface LessonItem {
  question_type: QuestionType;
  prompt: string;
  options?: string[] | null;
  accepted_answers?: string[] | null;
  explanation?: string | null;
}

export interface LessonDetail {
  id: number;
  course_id: number;
  ord: number;
  title: string;
  language: string | null;
  /** Course difficulty score, 1-5. */
  difficulty: number;
  /** Birdbrain level, 1-10, mapped from the difficulty score by the server. */
  birdbrain_level: number;
  items: LessonItem[];
}

export interface BirdbrainProfile {
  levels: { level: number; accuracy: number }[];
  current_difficulty: number;
  next_difficulty: number;
}

export interface CheckResult {
  index: number;
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
}

export interface ItemResult {
  index: number;
  correct: boolean;
  correct_answer: string;
  given: string;
  explanation: string | null;
}

export interface AttemptResult {
  lesson_id: number;
  correct: number;
  total: number;
  passed: boolean;
  xp_awarded: number;
  results: ItemResult[];
  hearts: number;
  streak: number;
  xp: number;
  next_difficulty: number;
}

export interface SpeechResult {
  transcript: string;
  correct: boolean;
  correct_answer: string;
  xp_awarded: number;
  hearts: number;
}

export interface TtsResult {
  text: string;
  provider: string;
  audio_base64: string;
  content_type: string;
}

export interface GenerationEvent {
  stage?: string;
  percent?: number;
  done?: boolean;
  course_id?: number | null;
  lesson_ids?: number[];
  error?: string | null;
  snapshot?: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const TOKEN_KEY = "bolingo_token";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  bucket: string;
  path: string;
}

export const supabaseConfig: SupabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL ?? "",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
  bucket: import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? "bolingo",
  path: (import.meta.env.VITE_SUPABASE_STORAGE_PATH ?? "/lessons").replace(/^\//, ""),
};

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey && supabaseConfig.bucket);
}

let token: string | null = localStorage.getItem(TOKEN_KEY);

export function setToken(next: string | null): void {
  token = next;
  if (next) {
    localStorage.setItem(TOKEN_KEY, next);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getToken(): string | null {
  return token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 401) setToken(null);
  if (!response.ok) {
    let detail = `Request failed (HTTP ${response.status})`;
    try {
      const data = (await response.json()) as { detail?: unknown };
      if (typeof data.detail === "string") detail = data.detail;
      else if (data.detail) detail = JSON.stringify(data.detail);
    } catch {
      /* non-JSON error body: keep the generic message */
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const api = {
  async signup(email: string, password: string): Promise<User> {
    const out = await postJson<{ access_token: string; user_id: number }>(
      "/api/auth/signup",
      { email, password },
    );
    setToken(out.access_token);
    return api.me();
  },

  async login(email: string, password: string): Promise<User> {
    const out = await postJson<{ access_token: string; user_id: number }>(
      "/api/auth/login",
      { email, password },
    );
    setToken(out.access_token);
    return api.me();
  },

  /** Exchange a Supabase (Google) access token for a Bolingo session. */
  async supabaseLogin(accessToken: string): Promise<User> {
    const out = await postJson<{ access_token: string; user_id: number }>(
      "/api/auth/supabase",
      { access_token: accessToken },
    );
    setToken(out.access_token);
    return api.me();
  },

  me(): Promise<User> {
    return request<User>("/api/me");
  },

  async logout(): Promise<void> {
    await request<void>("/api/auth/logout", { method: "POST" });
  },

  listMaterials(): Promise<Material[]> {
    return request<Material[]>("/api/materials");
  },

  getMaterial(id: number): Promise<Material> {
    return request<Material>(`/api/materials/${id}`);
  },

  /** Deletes the material; its courses and lessons are kept. */
  async deleteMaterial(id: number): Promise<void> {
    await request<void>(`/api/materials/${id}`, { method: "DELETE" });
  },

  async uploadMaterial(
    file: File,
    options: { language?: string; transcript?: string } = {},
  ): Promise<Material> {
    const form = new FormData();
    form.append("file", file);
    if (options.language) form.append("language", options.language);
    if (options.transcript) form.append("transcript", options.transcript);
    return request<Material>("/api/materials", { method: "POST", body: form });
  },

  /** Upload audio straight to Supabase Storage (bypasses the backend for large files). */
  async uploadAudioToStorage(
    file: File,
  ): Promise<{ storagePath: string; publicUrl: string }> {
    if (!isSupabaseConfigured()) {
      throw new ApiError(503, "Supabase is not configured on the client");
    }
    const response = await fetch(
      `${supabaseConfig.url}/storage/v1/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseConfig.anonKey}`,
          "x-storage-option-upsert": "true",
          "x-storage-option-destination": supabaseConfig.path,
          "Content-Type": file.type,
        },
        body: file,
      },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(response.status, body.message || "Supabase upload failed");
    }
    const payload = (await response.json()) as {
      path?: string;
      publicUrl?: string;
      downloadUrl?: string;
    };
    const storagePath = payload.path || payload.downloadUrl || payload.publicUrl || "";
    const publicUrl = payload.publicUrl || payload.downloadUrl || "";
    if (!storagePath || !publicUrl) {
      throw new ApiError(
        502,
        "Supabase returned no storage path/public URL. Check your bucket policy and anon key.",
      );
    }
    return { storagePath, publicUrl };
  },

  generateLessons(materialId: number): Promise<GenerateResult> {
    return postJson<GenerateResult>(
      `/api/materials/${materialId}/lessons`,
      {},
    );
  },

  listCourses(): Promise<CourseSummary[]> {
    return request<CourseSummary[]>("/api/courses");
  },

  /** The built-in curriculum tracks (Python, HTML/CSS/JS, C++, …). */
  catalog(): Promise<CatalogTrack[]> {
    return request<CatalogTrack[]>("/api/courses/catalog");
  },

  catalogProgress(): Promise<CatalogProgress> {
    return request<CatalogProgress>("/api/catalog/progress");
  },

  completeCatalogLesson(
    trackSlug: string,
    level: number,
    lessonIndex: number,
  ): Promise<CompleteLessonResult> {
    return postJson<CompleteLessonResult>("/api/catalog/lessons/complete", {
      track_slug: trackSlug,
      level,
      lesson_index: lessonIndex,
    });
  },

  unlockCatalogLevel(trackSlug: string, level: number): Promise<{ gems: number; unlocked: boolean }> {
    return postJson<{ gems: number; unlocked: boolean }>("/api/catalog/levels/unlock", {
      track_slug: trackSlug,
      level,
    });
  },

  courseLessons(courseId: number): Promise<Course> {
    return request<Course>(`/api/courses/${courseId}/lessons`);
  },

  libraryCourses(): Promise<LibraryCourseSummary[]> {
    return request<LibraryCourseSummary[]>("/api/library/courses");
  },

  libraryCourse(slug: string): Promise<LibraryCourse> {
    return request<LibraryCourse>(`/api/library/courses/${encodeURIComponent(slug)}`);
  },

  getLesson(lessonId: number): Promise<LessonDetail> {
    return request<LessonDetail>(`/api/lessons/${lessonId}`);
  },

  birdbrainProfile(level: number): Promise<BirdbrainProfile> {
    return request<BirdbrainProfile>(`/api/birdbrain/profile?level=${level}`);
  },

  checkAnswer(lessonId: number, index: number, answer: string): Promise<CheckResult> {
    return postJson<CheckResult>(`/api/lessons/${lessonId}/check`, {
      index,
      answer,
    });
  },

  submitAttempt(lessonId: number, answers: string[]): Promise<AttemptResult> {
    return postJson<AttemptResult>(`/api/lessons/${lessonId}/attempt`, {
      answers,
    });
  },

  speechAttempt(
    lessonId: number,
    index: number,
    audio: Blob,
  ): Promise<SpeechResult> {
    const form = new FormData();
    form.append("index", String(index));
    form.append("audio", audio, "answer.webm");
    return request<SpeechResult>(`/api/lessons/${lessonId}/speech-attempt`, {
      method: "POST",
      body: form,
    });
  },

  tts(text: string): Promise<TtsResult> {
    return postJson<TtsResult>("/api/tts", { text });
  },

  leaderboard(): Promise<Leaderboard> {
    return request<Leaderboard>("/api/leaderboard");
  },

  pushPublicKey(): Promise<{ public_key: string }> {
    return request<{ public_key: string }>("/api/push/vapid-public-key");
  },

  async pushSubscribe(subscription: PushSubscriptionJSON): Promise<void> {
    await postJson<{ subscribed: boolean }>("/api/push/subscribe", {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys?.p256dh ?? "",
        auth: subscription.keys?.auth ?? "",
      },
    });
  },

  async pushUnsubscribe(endpoint: string): Promise<void> {
    await postJson<void>("/api/push/unsubscribe", { endpoint });
  },
};

/** Open a progress socket for a material's generation run. */
export function generationSocket(
  materialId: number,
  onEvent: (event: GenerationEvent) => void,
): WebSocket {
  const wsBase = API_BASE.replace(/^http/, "ws");
  const socket = new WebSocket(
    `${wsBase}/ws/generations/${materialId}?token=${token ?? ""}`,
  );
  socket.onmessage = (message) => {
    try {
      onEvent(JSON.parse(String(message.data)) as GenerationEvent);
    } catch {
      /* ignore malformed frames */
    }
  };
  return socket;
}

/** Decode a base64 audio payload from /api/tts into an object URL. */
export function base64ToAudioUrl(base64: string, contentType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: contentType }));
}
