// The Bolingo engineer agent ("Kito").
//
// Role: staff engineer + learning-quality auditor. It observes the platform,
// explains what is failing, proposes the smallest reversible fix, and records
// every change that needs the owner's approval. It can only execute the
// allowlisted actions in actions.ts — never source edits.
//
// The deterministic health score is computed here, not by the model. The model
// receives a bounded snapshot and must return strict JSON; if it is offline or
// malformed, a rules-based report still runs so monitoring never goes dark.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { computePlatformHealth } from '../../../lib/qualityMath.ts';
import { sanitizeAction, type ApprovedAction } from './actions.ts';
import { sendOwnerEmail, type OwnerEmail } from './notify.ts';

const MAX_FINDINGS = 8;

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
  action: ApprovedAction | null;
}

export interface Snapshot {
  overview: Record<string, any>;
  latestRun: Record<string, any> | null;
  flags: Record<string, any>[];
  settings: Record<string, any>;
  recentReports: Record<string, any>[];
  rejectedApprovals: Record<string, any>[];
  errorClusters: { message: string; count: number }[];
}

interface ModelReport {
  summary: string;
  findings: EngineerFinding[];
  experiments: Record<string, unknown>[];
  metrics_to_watch: string[];
}

function text(value: unknown, max: number, fallback = ''): string {
  const raw = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return (raw || fallback).slice(0, max);
}

function numeric(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function collectSnapshot(admin: SupabaseClient): Promise<Snapshot> {
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const [overviewResult, runResult, flagsResult, settingsResult, reportsResult, rejectedResult, errorsResult] =
    await Promise.all([
      admin.rpc('quality_overview'),
      admin
        .from('quality_runs')
        .select('status,created_at,commit_sha,branch,duration_ms,summary,gates')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('feature_flags')
        .select('key,name,type,enabled,rollout_pct,variants,metric,hypothesis')
        .order('key'),
      admin.from('quality_settings').select('*').eq('id', 'default').maybeSingle(),
      admin
        .from('engineering_reports')
        .select('created_at,summary,status,health_score,findings')
        .order('created_at', { ascending: false })
        .limit(3),
      admin
        .from('engineering_approvals')
        .select('title,decision_note,decided_at,severity')
        .eq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(5),
      admin
        .from('telemetry_events')
        .select('properties,created_at')
        .eq('event', 'error')
        .gte('created_at', since)
        .limit(500),
    ]);

  let overview = isRecord(overviewResult.data) ? overviewResult.data : null;
  if (!overview) {
    // Migration or telemetry unavailable: keep the audit running with the
    // counts we can still read, and let the report say the signal is missing.
    const [learners, completions] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('lesson_completions').select('*', { count: 'exact', head: true }),
    ]);
    overview = {
      generated_at: new Date().toISOString(),
      learners: { total: learners.count ?? 0, premium: 0, new_7d: 0, active_7d: 0 },
      engagement: { lessons_completed_7d: completions.count ?? 0 },
      reliability: { sessions_7d: 0, error_sessions_7d: 0, crash_free_pct: null, p95_latency_ms: null },
      revenue: { premium_active: 0, mrr_estimate_usd: 0 },
      content: { db_lessons: 0, db_questions: 0, telemetry_events_7d: 0 },
      experiments: [],
      latest_run: null,
      approvals_pending: 0,
      degraded: true,
    };
  }

  const clusters = new Map<string, number>();
  for (const row of (errorsResult.data ?? []) as Record<string, any>[]) {
    const message = text(row?.properties?.message, 160);
    if (!message) continue;
    clusters.set(message, (clusters.get(message) ?? 0) + 1);
  }
  const errorClusters = [...clusters.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([message, count]) => ({ message, count }));

  return {
    overview,
    latestRun: (runResult.data as Record<string, any> | null) ?? null,
    flags: (flagsResult.data ?? []) as Record<string, any>[],
    settings: (settingsResult.data as Record<string, any> | null) ?? {},
    recentReports: (reportsResult.data ?? []) as Record<string, any>[],
    rejectedApprovals: (rejectedResult.data ?? []) as Record<string, any>[],
    errorClusters,
  };
}

export function platformHealth(snapshot: Snapshot) {
  const reliability = isRecord(snapshot.overview.reliability) ? snapshot.overview.reliability : {};
  const sessions = numeric(reliability.sessions_7d) ?? 0;
  return computePlatformHealth({
    crashFreePct: numeric(reliability.crash_free_pct),
    p95LatencyMs: numeric(reliability.p95_latency_ms),
    latestGateStatus: snapshot.latestRun?.status ?? null,
    pendingApprovals: numeric(snapshot.overview.approvals_pending) ?? 0,
    hasTelemetry: sessions > 0 || Boolean(snapshot.latestRun),
  });
}

function buildPrompt(snapshot: Snapshot, health: ReturnType<typeof platformHealth>): string {
  const compact = {
    health,
    overview: snapshot.overview,
    latest_quality_run: snapshot.latestRun
      ? {
          status: snapshot.latestRun.status,
          branch: snapshot.latestRun.branch,
          commit: snapshot.latestRun.commit_sha,
          duration_ms: snapshot.latestRun.duration_ms,
          summary: snapshot.latestRun.summary,
          failed_gates: Array.isArray(snapshot.latestRun.gates)
            ? snapshot.latestRun.gates.filter((gate: Record<string, any>) => gate?.status === 'failed')
            : [],
        }
      : null,
    flags: snapshot.flags.map((flag) => ({
      key: flag.key,
      type: flag.type,
      enabled: flag.enabled,
      rollout_pct: flag.rollout_pct,
      metric: flag.metric,
      hypothesis: flag.hypothesis,
    })),
    error_clusters_48h: snapshot.errorClusters,
    rejected_approvals: snapshot.rejectedApprovals.map((row) => ({
      title: row.title,
      note: row.decision_note,
      at: row.decided_at,
    })),
    previous_report_summaries: snapshot.recentReports.map((row) => row.summary).slice(0, 3),
  };

  return [
    'You are Kito, the staff engineer and learning-quality auditor for Bolingo Learn, a mobile-first language and coding platform.',
    'Mission: monitor, diagnose, propose the smallest reversible fix, and improve learner outcomes and platform reliability.',
    '',
    'Operating rules:',
    '1. Evidence only. Every finding must cite a number or named gate from the snapshot. Never invent metrics.',
    '2. If the snapshot is insufficient, say what instrumentation is missing and propose it instead of guessing.',
    '3. Learning-quality rubric: retrieval practice, spaced review, interleaving, worked examples, mastery gates, specific feedback, cognitive load, accessibility, motivation and retention.',
    '4. Engineering rubric: required CI gates, crash-free sessions, p95 latency, error clusters, experiment integrity, paywall conversion and refund risk.',
    '5. Autonomy is limited to reversible configuration. You may propose actions of type flag_rollout, flag_enabled or quality_setting. Source-code changes are proposals for a human and must say which file or system to change and how to verify it.',
    '6. Do not repeat a rejected proposal unless the evidence has materially changed. Acknowledge the rejection in the rationale.',
    '7. Approvals are for the owner (bolingolearn@pm.me). Critical and high findings always need approval.',
    '8. Prefer one high-leverage fix over many cosmetic ones. Do not propose more than 5 approvals.',
    '',
    'Return ONLY valid JSON (no markdown fences) with this shape:',
    '{"summary":"2-4 sentences","findings":[{"title":"...","severity":"critical|high|medium|low","area":"quality|learning|growth|reliability|content|accessibility","evidence":"...","root_cause":"...","proposed_change":"...","expected_impact":"...","confidence":0.0,"requires_approval":true,"action":{"type":"flag_rollout","key":"paywall_value_badge","rollout_pct":0}}],"experiments":[{"key":"...","hypothesis":"...","metric":"...","variants":["control","variant"],"min_sample":200}],"metrics_to_watch":["..."]}',
    '',
    `Deterministic health score: ${health.score}/100 (${health.status}). Reasons: ${health.reasons.join(' | ')}`,
    '',
    'Snapshot:',
    JSON.stringify(compact).slice(0, 12_000),
  ].join('\n');
}

function cleanModelText(data: Record<string, any>): string {
  const message = data?.choices?.[0]?.message ?? {};
  const raw = typeof message.content === 'string' ? message.content : '';
  return raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/<think[\s\S]*?<\/think>/gi, '')
    .trim();
}

async function callModel(prompt: string): Promise<{ text: string; via: string; model: string } | null> {
  const primaryUrl = Deno.env.get('LLM_BASE_URL') ?? 'https://api.deepseek.com/chat/completions';
  const primaryKey = Deno.env.get('LLM_API_KEY') ?? '';
  const primaryModel = Deno.env.get('LLM_MODEL') ?? 'deepseek-chat';
  const fallbackUrl = Deno.env.get('LLM_FALLBACK_URL') ?? '';
  const fallbackKey = Deno.env.get('LLM_FALLBACK_KEY') ?? '';
  const fallbackModel = Deno.env.get('LLM_FALLBACK_MODEL') ?? primaryModel;

  const attempts: { url: string; key: string; model: string; via: string; timeout: number }[] = [];
  if (primaryKey) {
    attempts.push({ url: primaryUrl, key: primaryKey, model: primaryModel, via: 'primary', timeout: 60_000 });
  }
  if (fallbackUrl && fallbackKey) {
    attempts.push({ url: fallbackUrl, key: fallbackKey, model: fallbackModel, via: 'fallback', timeout: 30_000 });
  }
  if (attempts.length === 0) return null;

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${attempt.key}`,
        },
        body: JSON.stringify({
          model: attempt.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a principal engineer and learning scientist. You answer with strict JSON only, grounded in the supplied evidence.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1800,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(attempt.timeout),
      });
      if (!response.ok) throw new Error(`Model responded ${response.status}.`);
      const data = await response.json();
      const text = cleanModelText(data);
      if (!text) throw new Error('Model returned an empty answer.');
      return { text, via: attempt.via, model: attempt.model };
    } catch (error) {
      console.error('engineer model attempt failed:', (error as Error).message.slice(0, 200));
    }
  }
  return null;
}

function sanitizeFinding(raw: unknown, index: number, flagKeys: string[]): EngineerFinding | null {
  if (!isRecord(raw)) return null;
  const title = text(raw.title, 140);
  if (!title) return null;
  const severity = ['critical', 'high', 'medium', 'low'].includes(String(raw.severity))
    ? (raw.severity as EngineerFinding['severity'])
    : 'medium';
  const confidenceRaw = numeric(raw.confidence);
  return {
    id: `f${index + 1}`,
    title,
    severity,
    area: text(raw.area, 60, 'platform'),
    evidence: text(raw.evidence, 700),
    root_cause: text(raw.root_cause, 700),
    proposed_change: text(raw.proposed_change, 1200),
    expected_impact: text(raw.expected_impact, 400),
    confidence: confidenceRaw == null ? 0.6 : Math.max(0, Math.min(1, confidenceRaw)),
    requires_approval:
      Boolean(raw.requires_approval) || severity === 'critical' || severity === 'high',
    action: sanitizeAction(raw.action, flagKeys),
  };
}

function parseModelReport(text: string, flagKeys: string[]): ModelReport | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, any>;
    const findings = (Array.isArray(parsed.findings) ? parsed.findings : [])
      .map((finding, index) => sanitizeFinding(finding, index, flagKeys))
      .filter((finding): finding is EngineerFinding => Boolean(finding))
      .slice(0, MAX_FINDINGS);
    const summary = text(parsed.summary, 1200);
    if (!summary) return null;
    const experiments = (Array.isArray(parsed.experiments) ? parsed.experiments : [])
      .filter(isRecord)
      .slice(0, 3)
      .map((experiment) => ({
        key: text(experiment.key, 60),
        hypothesis: text(experiment.hypothesis, 400),
        metric: text(experiment.metric, 80),
        variants: Array.isArray(experiment.variants)
          ? experiment.variants.slice(0, 4).map((variant) => text(variant, 40))
          : [],
        min_sample: numeric(experiment.min_sample) ?? 200,
      }))
      .filter((experiment) => experiment.key && experiment.hypothesis && experiment.metric);
    const metricsToWatch = (Array.isArray(parsed.metrics_to_watch) ? parsed.metrics_to_watch : [])
      .slice(0, 8)
      .map((metric) => text(metric, 120))
      .filter(Boolean);
    return { summary, findings, experiments, metrics_to_watch: metricsToWatch };
  } catch {
    return null;
  }
}

function fallbackFindings(snapshot: Snapshot): EngineerFinding[] {
  const findings: EngineerFinding[] = [];
  const overview = snapshot.overview;
  const reliability = isRecord(overview.reliability) ? overview.reliability : {};
  const engagement = isRecord(overview.engagement) ? overview.engagement : {};
  const failedGates = Array.isArray(snapshot.latestRun?.gates)
    ? snapshot.latestRun!.gates.filter((gate: Record<string, any>) => gate?.status === 'failed')
    : [];

  if (failedGates.length > 0 || snapshot.latestRun?.status === 'failed') {
    const names = failedGates.map((gate: Record<string, any>) => gate.label ?? gate.id).join(', ');
    findings.push({
      id: 'f1',
      title: 'Unblock the release gate',
      severity: 'high',
      area: 'quality',
      evidence: snapshot.latestRun
        ? `Latest run on ${snapshot.latestRun.branch ?? 'unknown'} failed${names ? `: ${names}` : ''}.`
        : 'No quality run is published.',
      root_cause: 'A required check is red, so the build cannot be trusted as a release candidate.',
      proposed_change:
        'Reproduce the failing gate locally with npm run gate -- --only=<id>, fix the cause, and publish a green run before shipping.',
      expected_impact: 'Restores a trustworthy release signal and prevents a regression reaching learners.',
      confidence: 0.95,
      requires_approval: true,
      action: null,
    });
  }

  const crash = numeric(reliability.crash_free_pct);
  if (crash != null && crash < 99) {
    findings.push({
      id: `f${findings.length + 1}`,
      title: 'Raise crash-free sessions above 99%',
      severity: crash < 95 ? 'critical' : 'high',
      area: 'reliability',
      evidence: `${crash.toFixed(1)}% crash-free across ${numeric(reliability.sessions_7d) ?? 0} sessions in the last 7 days.`,
      root_cause: snapshot.errorClusters[0]
        ? `Most frequent error cluster: ${snapshot.errorClusters[0].message}`
        : 'Error clusters are not yet attributed to a screen or release.',
      proposed_change:
        'Fix the top error cluster first, add a regression check for that path, and keep experiments paused until crash-free recovers.',
      expected_impact: 'Fewer abandoned lessons and refund requests; protects subscription renewals.',
      confidence: 0.8,
      requires_approval: true,
      action: null,
    });
  }

  const p95 = numeric(reliability.p95_latency_ms);
  if (p95 != null && p95 > 2500) {
    findings.push({
      id: `f${findings.length + 1}`,
      title: 'Bring p95 interaction latency under 2.5s',
      severity: p95 > 4000 ? 'high' : 'medium',
      area: 'reliability',
      evidence: `p95 is ${Math.round(p95)} ms over the last 7 days.`,
      root_cause: 'The slowest interaction path is exceeding the mobile frame and network budget.',
      proposed_change:
        'Measure the slowest screen with the existing benchmark route, defer non-critical work off the interaction path, and re-check p95 after one release.',
      expected_impact: 'Higher lesson completion and fewer rage-quits on low-end Android devices.',
      confidence: 0.7,
      requires_approval: false,
      action: null,
    });
  }

  if (snapshot.errorClusters.length > 0 && findings.length < MAX_FINDINGS) {
    const top = snapshot.errorClusters[0];
    findings.push({
      id: `f${findings.length + 1}`,
      title: 'Resolve the top error cluster',
      severity: top.count >= 10 ? 'high' : 'medium',
      area: 'reliability',
      evidence: `${top.count} occurrences in 48 hours: ${top.message}`,
      root_cause: 'The same failure is recurring across sessions instead of being a one-off.',
      proposed_change:
        'Reproduce the message, add a guard or fallback at the call site, and extend the relevant quality check so it cannot regress.',
      expected_impact: 'Removes a recurring interruption from the learning loop.',
      confidence: 0.75,
      requires_approval: top.count >= 10,
      action: null,
    });
  }

  const sessions = numeric(reliability.sessions_7d) ?? 0;
  if (sessions === 0) {
    findings.push({
      id: `f${findings.length + 1}`,
      title: 'Publish the first trustworthy telemetry window',
      severity: 'high',
      area: 'quality',
      evidence: 'No session_start events have been recorded in the last 7 days.',
      root_cause:
        'Either the migration is not applied, the client cannot reach telemetry_events, or the opt-out is enabled for every tester.',
      proposed_change:
        'Apply supabase/migrations_quality_ops.sql, run a release build with diagnostics on, and confirm session_start, lesson_completed and error rows arrive in the owner console.',
      expected_impact: 'Makes every later decision evidence-based instead of anecdotal.',
      confidence: 0.9,
      requires_approval: true,
      action: null,
    });
  } else if (findings.length === 0) {
    findings.push({
      id: 'f1',
      title: 'Keep the bar and widen the experiment',
      severity: 'low',
      area: 'growth',
      evidence: `Health ${platformHealth(snapshot).score}/100 with ${sessions} sessions and ${numeric(engagement.lessons_completed_7d) ?? 0} lessons completed in 7 days.`,
      root_cause: 'No regression is visible in the current window; the risk is complacency.',
      proposed_change:
        'Keep every required gate blocking, then run one controlled experiment on the activation funnel with a pre-registered metric and minimum sample.',
      expected_impact: 'Compounds a healthy baseline without trading reliability for growth.',
      confidence: 0.6,
      requires_approval: false,
      action: null,
    });
  }

  return findings.slice(0, MAX_FINDINGS);
}

function fallbackReport(snapshot: Snapshot, health: ReturnType<typeof platformHealth>): ModelReport {
  return {
    summary:
      health.status === 'unknown'
        ? 'The platform has no trustworthy telemetry or published gate run yet, so the audit is limited to instrumentation and release hygiene.'
        : `Platform health is ${health.score}/100 (${health.status}). ${health.reasons.join(' ')}`,
    findings: fallbackFindings(snapshot),
    experiments: [
      {
        key: 'activation_first_lesson',
        hypothesis:
          'A guided first-lesson goal increases the share of new learners who finish a lesson on day one.',
        metric: 'lesson_completed',
        variants: ['control', 'guided_first_lesson'],
        min_sample: 200,
      },
    ],
    metrics_to_watch: ['crash_free_pct', 'p95_latency_ms', 'lesson_completion_rate', 'premium_checkout_started'],
  };
}

interface GuardrailResult {
  reasons: string[];
  paused: { key: string; previous_rollout: number }[];
}

async function applyGuardrails(
  admin: SupabaseClient,
  snapshot: Snapshot
): Promise<GuardrailResult> {
  const result: GuardrailResult = { reasons: [], paused: [] };
  const settings = snapshot.settings;
  const guardrailFlag = snapshot.flags.find((flag) => flag.key === 'engineer_auto_guardrails');
  if (settings.auto_guardrails === false || guardrailFlag?.enabled === false) return result;

  const reliability = isRecord(snapshot.overview.reliability) ? snapshot.overview.reliability : {};
  const sessions = numeric(reliability.sessions_7d) ?? 0;
  const minimum = numeric(settings.min_sessions_for_guardrail) ?? 50;
  if (sessions < minimum) return result;

  const crashFloor = numeric(settings.crash_free_floor) ?? 99;
  const latencyCeiling = numeric(settings.p95_latency_ceiling_ms) ?? 2500;
  const crash = numeric(reliability.crash_free_pct);
  const p95 = numeric(reliability.p95_latency_ms);
  if (crash != null && crash < crashFloor) {
    result.reasons.push(`Crash-free ${crash.toFixed(1)}% is below the ${crashFloor}% floor.`);
  }
  if (p95 != null && p95 > latencyCeiling) {
    result.reasons.push(`p95 ${Math.round(p95)} ms exceeds the ${latencyCeiling} ms ceiling.`);
  }
  if (result.reasons.length === 0) return result;

  const experiments = snapshot.flags.filter(
    (flag) => flag.type === 'experiment' && flag.enabled && Number(flag.rollout_pct) > 0
  );
  for (const flag of experiments) {
    const { error } = await admin
      .from('feature_flags')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('key', flag.key);
    if (!error) {
      result.paused.push({ key: flag.key, previous_rollout: Number(flag.rollout_pct) || 0 });
    }
  }
  return result;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDigest(
  report: Record<string, any>,
  approvals: Record<string, any>[],
  health: ReturnType<typeof platformHealth>,
  settings: Record<string, any>
): OwnerEmail {
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const lines = [
    `Bolingo Learn engineer audit — ${health.status.toUpperCase()} (${health.score}/100)`,
    '',
    report.summary,
    '',
    'Findings:',
    ...findings.map(
      (finding: Record<string, any>, index: number) =>
        `${index + 1}. [${String(finding.severity).toUpperCase()}] ${finding.title}\n   Evidence: ${finding.evidence}\n   Proposed: ${finding.proposed_change}`
    ),
    '',
    approvals.length > 0
      ? `Approvals waiting in Settings → Quality & Operations (${approvals.length}):\n${approvals
          .map((approval) => `- ${approval.title} — ${approval.risk_summary ?? approval.proposed_change}`)
          .join('\n')}`
      : 'No approvals are waiting. The full report is on the owner dashboard.',
    '',
    'Open the app → Settings → Quality & Operations to approve, reject or inspect the raw run.',
  ];
  const html = [
    `<h2>Bolingo Learn engineer audit — ${escapeHtml(health.status)} (${health.score}/100)</h2>`,
    `<p>${escapeHtml(report.summary)}</p>`,
    '<h3>Findings</h3><ol>',
    ...findings.map(
      (finding: Record<string, any>) =>
        `<li><strong>[${escapeHtml(String(finding.severity))}] ${escapeHtml(finding.title)}</strong><br/>` +
        `<em>Evidence:</em> ${escapeHtml(finding.evidence)}<br/>` +
        `<em>Proposed:</em> ${escapeHtml(finding.proposed_change)}</li>`
    ),
    '</ol>',
    approvals.length > 0
      ? `<h3>Approvals waiting (${approvals.length})</h3><ul>${approvals
          .map((approval) => `<li>${escapeHtml(approval.title)}</li>`)
          .join('')}</ul>`
      : '<p>No approvals are waiting.</p>',
    '<p>Approve or reject from <strong>Settings → Quality & Operations</strong>.</p>',
  ].join('');
  return {
    kind: 'engineer_report',
    to: settings.notify_email,
    subject: `[Bolingo Learn] Engineer audit: ${health.status}, ${approvals.length} approval${approvals.length === 1 ? '' : 's'} waiting`,
    text: lines.join('\n'),
    html,
    reportId: report.id,
  };
}

export interface EngineerRunResult {
  ok: boolean;
  skipped?: string;
  reportId?: string;
  health?: ReturnType<typeof platformHealth>;
  findings?: number;
  approvals?: number;
  email?: string;
  via?: string;
}

export async function runEngineer(
  admin: SupabaseClient,
  options: { trigger: 'manual' | 'schedule' | 'guardrail'; userId: string | null }
): Promise<EngineerRunResult> {
  const started = Date.now();
  const snapshot = await collectSnapshot(admin);
  if (snapshot.settings.agent_enabled === false) {
    return { ok: true, skipped: 'The engineer is disabled in Quality settings.' };
  }

  const health = platformHealth(snapshot);
  const flagKeys = snapshot.flags.map((flag) => flag.key);
  const prompt = buildPrompt(snapshot, health);
  const modelResult = await callModel(prompt);
  const parsed = modelResult ? parseModelReport(modelResult.text, flagKeys) : null;
  const generated = parsed ?? fallbackReport(snapshot, health);
  const via = parsed && modelResult ? modelResult.via : 'rules';
  const model = parsed && modelResult ? modelResult.model : 'rules';

  const guardrail = await applyGuardrails(admin, snapshot);
  const findings = [...generated.findings];
  if (guardrail.reasons.length > 0) {
    findings.unshift({
      id: 'guardrail',
      title: 'Reliability floor breached — experiments paused',
      severity: 'critical',
      area: 'reliability',
      evidence: guardrail.reasons.join(' '),
      root_cause: 'Observed reliability fell below the owner-defined threshold with enough sessions to be actionable.',
      proposed_change:
        'Review the error clusters and the latest release, fix the cause, then re-enable experiments one at a time.',
      expected_impact: 'Limits learner exposure while preserving the experiment definitions for a clean restart.',
      confidence: 0.95,
      requires_approval: false,
      action: null,
    });
  }

  const metrics = {
    ...snapshot.overview,
    health,
    guardrail,
    error_clusters_48h: snapshot.errorClusters,
    generated_at: new Date().toISOString(),
  };

  const { data: inserted, error: reportError } = await admin
    .from('engineering_reports')
    .insert({
      trigger: options.trigger,
      model,
      via,
      status: health.status,
      health_score: health.score,
      summary: generated.summary,
      findings,
      experiments: generated.experiments,
      metrics,
      duration_ms: Date.now() - started,
      created_by: options.userId,
    })
    .select('id,created_at,summary,findings')
    .single();
  if (reportError || !inserted) {
    throw new Error(`Could not store the engineering report: ${reportError?.message ?? 'unknown'}`);
  }

  const recentTitles = new Set(
    snapshot.recentReports
      .flatMap((report) => (Array.isArray(report.findings) ? report.findings : []))
      .map((finding: Record<string, any>) => String(finding?.title ?? '').toLowerCase())
      .filter(Boolean)
  );
  const approvalRows = findings
    .filter(
      (finding) =>
        finding.id !== 'guardrail' &&
        finding.requires_approval &&
        finding.proposed_change &&
        !recentTitles.has(finding.title.toLowerCase())
    )
    .slice(0, 5)
    .map((finding) => ({
      report_id: inserted.id,
      title: finding.title,
      severity: finding.severity,
      area: finding.area,
      rationale: [finding.evidence, finding.root_cause].filter(Boolean).join(' '),
      proposed_change: finding.proposed_change,
      action: finding.action,
      status: 'pending',
    }));

  if (guardrail.reasons.length > 0) {
    approvalRows.unshift({
      report_id: inserted.id,
      title: 'Guardrail paused active experiments',
      severity: 'critical',
      area: 'reliability',
      rationale: guardrail.reasons.join(' '),
      proposed_change:
        'Confirm the pause, review the error clusters, and re-enable one experiment only after crash-free and latency return inside their floors.',
      action: null,
      status: 'auto_applied',
    });
  }

  let approvals: Record<string, any>[] = [];
  if (approvalRows.length > 0) {
    const { data, error } = await admin
      .from('engineering_approvals')
      .insert(approvalRows)
      .select('id,title,severity,proposed_change,status');
    if (error) {
      console.error('engineering approval insert failed:', error.message.slice(0, 200));
    } else if (Array.isArray(data)) {
      approvals = data as Record<string, any>[];
    }
  }

  let emailStatus = 'not_sent';
  if (approvals.length > 0 || health.status === 'critical') {
    const digest = buildDigest(inserted as Record<string, any>, approvals, health, snapshot.settings);
    const delivery = await sendOwnerEmail(admin, digest);
    emailStatus = delivery.status;
    if (approvals.length > 0) {
      await admin
        .from('engineering_approvals')
        .update({ email_status: delivery.status })
        .in(
          'id',
          approvals.map((approval) => approval.id)
        );
    }
  }

  return {
    ok: true,
    reportId: inserted.id,
    health,
    findings: findings.length,
    approvals: approvals.length,
    email: emailStatus,
    via,
  };
}
