import gatesJson from '../content/quality/gates.json';
import { ALL_BLOCKS, COURSES_META } from './curriculum';
import { COURSES } from './courses';
import { PUBLISHED_TRANSCRIPT_LESSONS } from './publishedTranscriptLessons';
import { FLAG_CATALOG, type FlagDefinition } from './featureFlags';
import { variantWeightsValid, type FlagVariant } from './qualityMath';
import { supabase } from './supabase';

/**
 * Owner-console reads. Every table is protected by RLS (is_admin); the client
 * never receives another learner's profile. If the migration is missing or
 * the user is not the owner, the console degrades to the bundled gate catalog
 * with a clear explanation instead of inventing live numbers.
 */

export interface GateDefinition {
  id: string;
  label: string;
  category: string;
  command: string;
  timeoutSeconds: number;
  required: boolean;
}

export interface QualityGateRun {
  id: string;
  label: string;
  category: string;
  command?: string;
  status: 'passed' | 'failed' | 'skipped' | string;
  exitCode?: number | null;
  timedOut?: boolean;
  durationMs?: number;
  outputTail?: string;
  required?: boolean;
}

export interface QualityRun {
  id: number;
  created_at: string;
  commit_sha: string | null;
  branch: string | null;
  environment: string;
  status: 'passed' | 'failed' | 'warn';
  duration_ms: number | null;
  summary: { total?: number; passed?: number; failed?: number; skipped?: number; status?: string };
  gates: QualityGateRun[];
  source?: string | null;
}

export interface QualityOverview {
  generated_at: string;
  learners: { total: number; premium: number; new_7d: number; active_7d: number };
  engagement: {
    lessons_completed_7d: number;
    active_learners_7d: number;
    lesson_starts_7d: number;
    quiz_submissions_7d: number;
    completion_rate_pct: number | null;
  };
  reliability: {
    sessions_7d: number;
    error_sessions_7d: number;
    crash_free_pct: number | null;
    p95_latency_ms: number | null;
  };
  revenue: { premium_active: number; mrr_estimate_usd: number };
  content: { db_lessons: number; db_questions: number; telemetry_events_7d: number };
  experiments: {
    experiment: string;
    variant: string;
    exposures: number;
    conversions: number;
    conversion_pct: number;
  }[];
  latest_run: {
    status: string;
    created_at: string;
    commit_sha: string | null;
    branch: string | null;
    duration_ms: number | null;
    summary: Record<string, unknown>;
  } | null;
  approvals_pending: number;
}

export interface QualitySettings {
  notify_email: string;
  agent_enabled: boolean;
  auto_guardrails: boolean;
  crash_free_floor: number;
  p95_latency_ceiling_ms: number;
  min_sessions_for_guardrail: number;
  retention_days: number;
  release_freeze: boolean;
  premium_price_usd: number;
  updated_at?: string;
}

export interface EngineerFinding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  area: string;
  evidence: string;
  root_cause: string;
  proposed_change: string;
  expected_impact: string;
  confidence: number;
  requires_approval: boolean;
}

export interface EngineerReport {
  id: string;
  created_at: string;
  trigger: string;
  model: string | null;
  via: string | null;
  status: 'healthy' | 'watch' | 'critical' | 'unknown';
  health_score: number | null;
  summary: string;
  findings: EngineerFinding[];
  experiments: Record<string, unknown>[];
  metrics: Record<string, unknown>;
  duration_ms: number | null;
}

export interface EngineeringApproval {
  id: string;
  report_id: string | null;
  created_at: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  area: string;
  rationale: string;
  proposed_change: string;
  action: Record<string, unknown> | null;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'auto_applied' | 'failed';
  decided_at: string | null;
  decision_note: string | null;
  apply_result: Record<string, unknown> | null;
  email_status: string | null;
}

export interface OwnerNotification {
  id: string;
  created_at: string;
  recipient: string;
  subject: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  provider: string | null;
  error: string | null;
  sent_at: string | null;
}

export interface ContentStats {
  courses: number;
  lessons: number;
  questions: number;
  workshops: number;
  labs: number;
  quizzes: number;
  projects: number;
  reviews: number;
}

export interface AdminDashboard {
  signedIn: boolean;
  isAdmin: boolean;
  connected: boolean;
  migrationRequired: boolean;
  error?: string;
  gates: GateDefinition[];
  content: ContentStats;
  overview: QualityOverview | null;
  run: QualityRun | null;
  flags: FlagDefinition[];
  settings: QualitySettings | null;
  report: EngineerReport | null;
  approvals: EngineeringApproval[];
  notifications: OwnerNotification[];
}

export const QUALITY_GATES = (gatesJson as { gates: GateDefinition[] }).gates;

export function contentInventory(): ContentStats {
  const lessons = { ...COURSES, ...PUBLISHED_TRANSCRIPT_LESSONS };
  const counts = { lesson: 0, workshop: 0, lab: 0, quiz: 0, project: 0, review: 0 };
  for (const block of ALL_BLOCKS) {
    if (block.kind in counts) counts[block.kind as keyof typeof counts] += 1;
  }
  return {
    courses: COURSES_META.length,
    lessons: Object.keys(lessons).length,
    questions: Object.values(lessons).reduce(
      (total, lesson) => total + (Array.isArray(lesson.questions) ? lesson.questions.length : 0),
      0
    ),
    workshops: counts.workshop,
    labs: counts.lab,
    quizzes: counts.quiz,
    projects: counts.project,
    reviews: counts.review,
  };
}

function withFlagRows(rows: Record<string, unknown>[]): FlagDefinition[] {
  const byKey = new Map(rows.map((row) => [String(row.key), row]));
  return FLAG_CATALOG.map((definition) => {
    const row = byKey.get(definition.key);
    if (!row) return definition;
    const variants = Array.isArray(row.variants) ? (row.variants as FlagVariant[]) : [];
    return {
      ...definition,
      enabled: typeof row.enabled === 'boolean' ? row.enabled : definition.enabled,
      rolloutPct:
        typeof row.rollout_pct === 'number' && row.rollout_pct >= 0 && row.rollout_pct <= 100
          ? row.rollout_pct
          : definition.rolloutPct,
      variants: variantWeightsValid(variants) ? variants : definition.variants,
    };
  });
}

function missingSchema(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (['42P01', '42703', 'PGRST202', 'PGRST204', 'PGRST205', '42883'].includes(String(error.code))) {
    return true;
  }
  return /does not exist|schema cache|could not find the function/i.test(String(error.message ?? ''));
}

function emptyDashboard(partial: Partial<AdminDashboard>): AdminDashboard {
  return {
    signedIn: false,
    isAdmin: false,
    connected: false,
    migrationRequired: false,
    gates: QUALITY_GATES,
    content: contentInventory(),
    overview: null,
    run: null,
    flags: FLAG_CATALOG,
    settings: null,
    report: null,
    approvals: [],
    notifications: [],
    ...partial,
  };
}

export async function loadOwnerDashboard(): Promise<AdminDashboard> {
  let userId: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return emptyDashboard({ signedIn: false });

  const claim = await supabase.rpc('claim_founder_admin');
  if (claim.error && missingSchema(claim.error)) {
    return emptyDashboard({
      signedIn: true,
      migrationRequired: true,
      error: 'Run supabase/migrations_quality_ops.sql to enable the owner console.',
    });
  }

  const profile = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  if (profile.error) {
    return emptyDashboard({
      signedIn: true,
      migrationRequired: missingSchema(profile.error),
      error: missingSchema(profile.error)
        ? 'Run supabase/migrations_quality_ops.sql to enable the owner console.'
        : `Could not verify owner access: ${profile.error.message}`,
    });
  }
  const isAdmin = (profile.data as { is_admin?: boolean } | null)?.is_admin === true;
  if (!isAdmin) {
    return emptyDashboard({
      signedIn: true,
      error: 'Owner access is limited to the verified bolingolearn@pm.me account.',
    });
  }

  const [overviewResult, runResult, flagsResult, settingsResult, reportsResult, approvalsResult, notificationsResult] =
    await Promise.all([
      supabase.rpc('quality_overview'),
      supabase.from('quality_runs').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('feature_flags').select('*').order('key'),
      supabase.from('quality_settings').select('*').eq('id', 'default').maybeSingle(),
      supabase
        .from('engineering_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('engineering_approvals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('notification_outbox')
        .select('id,created_at,recipient,subject,status,provider,error,sent_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

  const firstError =
    overviewResult.error ??
    runResult.error ??
    flagsResult.error ??
    settingsResult.error ??
    reportsResult.error ??
    approvalsResult.error ??
    notificationsResult.error;
  if (firstError) {
    return emptyDashboard({
      signedIn: true,
      isAdmin: true,
      migrationRequired: missingSchema(firstError),
      error: missingSchema(firstError)
        ? 'Run supabase/migrations_quality_ops.sql to enable the owner console.'
        : `Could not load platform metrics: ${firstError.message}`,
    });
  }

  return emptyDashboard({
    signedIn: true,
    isAdmin: true,
    connected: true,
    overview: (overviewResult.data as QualityOverview | null) ?? null,
    run: (runResult.data as QualityRun | null) ?? null,
    flags: withFlagRows((flagsResult.data ?? []) as Record<string, unknown>[]),
    settings: (settingsResult.data as QualitySettings | null) ?? null,
    report: (reportsResult.data as EngineerReport | null) ?? null,
    approvals: (approvalsResult.data ?? []) as EngineeringApproval[],
    notifications: (notificationsResult.data ?? []) as OwnerNotification[],
  });
}

function functionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function runEngineerAudit(): Promise<{ approvals?: number; health?: { score: number } }> {
  const { data, error } = await supabase.functions.invoke('engineer-agent', {
    body: { trigger: 'manual' },
  });
  if (error) throw new Error(functionErrorMessage(error, 'Could not reach the engineer agent.'));
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return (data ?? {}) as { approvals?: number; health?: { score: number } };
}

export async function reviewApproval(
  approvalId: string,
  decision: 'approve' | 'reject',
  note?: string
): Promise<{ applied?: boolean; detail?: string; email?: string }> {
  const { data, error } = await supabase.functions.invoke('review-approval', {
    body: { approvalId, decision, note: note ?? '' },
  });
  if (error) throw new Error(functionErrorMessage(error, 'Could not record the decision.'));
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return (data ?? {}) as { applied?: boolean; detail?: string; email?: string };
}

export async function updateFeatureFlag(
  key: string,
  patch: { enabled?: boolean; rollout_pct?: number }
): Promise<void> {
  const { error } = await supabase
    .from('feature_flags')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) throw new Error(error.message);
}

export async function updateQualitySettings(patch: Partial<QualitySettings>): Promise<void> {
  const { error } = await supabase
    .from('quality_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 'default');
  if (error) throw new Error(error.message);
}
