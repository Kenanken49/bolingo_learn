import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Text from '../../components/ui/Text';
import AppIcon, { type AppIconName } from '../../components/AppIcon';
import { computePlatformHealth } from '../../lib/qualityMath';
import { track } from '../../lib/telemetry';
import {
  contentInventory,
  loadOwnerDashboard,
  reviewApproval,
  runEngineerAudit,
  updateFeatureFlag,
  updateQualitySettings,
  type AdminDashboard,
  type EngineeringApproval,
  type EngineerFinding,
  type QualityGateRun,
} from '../../lib/qualityOps';
import type { FlagDefinition } from '../../lib/featureFlags';

const CYAN = '#00E5FF';
const AMBER = '#F59E0B';
const GREEN = '#10B981';
const ROSE = '#F43F5E';
const MUTED = '#64748B';
const VIOLET = '#8B5CF6';

type Tab = 'overview' | 'quality' | 'growth' | 'engineer';

const TABS: { key: Tab; label: string; icon: AppIconName }[] = [
  { key: 'overview', label: 'Overview', icon: 'target' },
  { key: 'quality', label: 'Quality', icon: 'shield' },
  { key: 'growth', label: 'Growth', icon: 'zap' },
  { key: 'engineer', label: 'Engineer', icon: 'robot' },
];

function when(value?: string | null): string {
  if (!value) return 'never';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'unknown';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(value).toLocaleDateString();
}

function num(value?: number | null, suffix = ''): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function pct(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

function toneFor(status?: string | null): string {
  if (['passed', 'applied', 'sent', 'healthy', 'approved'].includes(String(status))) return GREEN;
  if (['failed', 'critical', 'rejected'].includes(String(status))) return ROSE;
  if (['warn', 'pending', 'watch', 'skipped', 'auto_applied'].includes(String(status))) return AMBER;
  return MUTED;
}

function severityTone(severity?: string): string {
  if (severity === 'critical') return ROSE;
  if (severity === 'high') return '#FB7185';
  if (severity === 'medium') return AMBER;
  return MUTED;
}

function confirmThen(title: string, message: string, action: () => void): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) action();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Confirm', style: 'destructive', onPress: action },
  ]);
}

function Card({
  title,
  icon,
  right,
  children,
  accent,
}: {
  title: string;
  icon: AppIconName;
  right?: ReactNode;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <View className="mt-4 w-full rounded-3xl border-2 border-cyan-100 bg-white p-4 dark:border-[#1E1E2C] dark:bg-[#06060A]">
      <View className="flex-row items-center gap-2">
        <View
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accent ?? CYAN}1A` }}
        >
          <AppIcon name={icon} size={17} color={accent ?? CYAN} />
        </View>
        <Text className="flex-1 text-base font-extrabold text-slate-900 dark:text-slate-50">{title}</Text>
        {right}
      </View>
      <View className="mt-3">{children}</View>
    </View>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[#1E1E2C] dark:bg-[#0E0E16]">
      <Text className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </Text>
      <Text className="mt-1 text-xl font-extrabold" style={{ color: tone }}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{sub}</Text>
    </View>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-xs text-slate-500 dark:text-slate-400">{label}</Text>
      <Text className="text-xs font-extrabold text-slate-800 dark:text-slate-100" style={tone ? { color: tone } : undefined}>
        {value}
      </Text>
    </View>
  );
}

function GateRow({
  gate,
  expanded,
  onPress,
}: {
  gate: QualityGateRun;
  expanded: boolean;
  onPress: () => void;
}) {
  const tone = toneFor(gate.status);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${gate.label}: ${gate.status}`}
      className="mb-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[#1E1E2C] dark:bg-[#0E0E16]"
    >
      <View className="flex-row items-center gap-2">
        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone }} />
        <Text className="flex-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">{gate.label}</Text>
        <Text className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: tone }}>
          {String(gate.status).replace('_', ' ')}
        </Text>
        {gate.durationMs != null ? (
          <Text className="text-[10px] text-slate-400">{(gate.durationMs / 1000).toFixed(1)}s</Text>
        ) : null}
      </View>
      <View className="mt-1 flex-row items-center gap-2">
        <Text className="text-[10px] uppercase tracking-widest text-slate-400">{gate.category}</Text>
        {gate.required === false ? (
          <Text className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-slate-500 dark:bg-slate-800">
            advisory
          </Text>
        ) : null}
      </View>
      {expanded ? (
        <View className="mt-2 rounded-xl bg-slate-900 p-2.5 dark:bg-black">
          {gate.command ? (
            <Text className="text-[10px] text-cyan-300">$ {gate.command}</Text>
          ) : null}
          <Text className="mt-1 text-[10px] leading-4 text-slate-300">
            {gate.outputTail?.trim() || 'No output captured for this gate.'}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function FindingCard({ finding }: { finding: EngineerFinding }) {
  const tone = severityTone(finding.severity);
  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[#1E1E2C] dark:bg-[#0E0E16]">
      <View className="flex-row items-center gap-2">
        <Text
          className="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest"
          style={{ backgroundColor: `${tone}22`, color: tone }}
        >
          {finding.severity}
        </Text>
        <Text className="flex-1 text-xs font-extrabold uppercase tracking-widest text-slate-400">
          {finding.area}
        </Text>
      </View>
      <Text className="mt-1.5 text-sm font-extrabold text-slate-800 dark:text-slate-100">{finding.title}</Text>
      <Text className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{finding.evidence}</Text>
      {finding.proposed_change ? (
        <View className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 p-2 dark:border-cyan-900 dark:bg-[#001A22]">
          <Text className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            Proposed change
          </Text>
          <Text className="mt-0.5 text-xs leading-5 text-slate-700 dark:text-slate-300">
            {finding.proposed_change}
          </Text>
        </View>
      ) : null}
      <Text className="mt-1.5 text-[10px] text-slate-400">
        Confidence {Math.round((finding.confidence || 0) * 100)}%
        {finding.expected_impact ? ` · ${finding.expected_impact}` : ''}
      </Text>
    </View>
  );
}

function ApprovalCard({
  approval,
  busy,
  onDecision,
}: {
  approval: EngineeringApproval;
  busy: boolean;
  onDecision: (decision: 'approve' | 'reject') => void;
}) {
  const tone = severityTone(approval.severity);
  const action = approval.action as { type?: string; key?: string; rollout_pct?: number; enabled?: boolean; value?: unknown } | null;
  return (
    <View className="mb-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-[#1A1200]">
      <View className="flex-row items-center gap-2">
        <Text
          className="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest"
          style={{ backgroundColor: `${tone}22`, color: tone }}
        >
          {approval.severity}
        </Text>
        <Text className="flex-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">
          {approval.area}
        </Text>
        <Text className="text-[10px] text-slate-400">{when(approval.created_at)}</Text>
      </View>
      <Text className="mt-1.5 text-sm font-extrabold text-slate-900 dark:text-slate-50">{approval.title}</Text>
      <Text className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{approval.rationale}</Text>
      <View className="mt-2 rounded-xl bg-white p-2 dark:bg-[#0E0E16]">
        <Text className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Proposed change</Text>
        <Text className="mt-0.5 text-xs leading-5 text-slate-700 dark:text-slate-300">{approval.proposed_change}</Text>
        <Text className="mt-1 text-[10px] font-extrabold text-cyan-700 dark:text-cyan-300">
          {action
            ? `Automatic action: ${String(action.type)} ${String(action.key ?? '')} ${
                action.rollout_pct != null
                  ? `→ ${action.rollout_pct}%`
                  : action.enabled != null
                    ? `→ ${action.enabled ? 'on' : 'off'}`
                    : action.value != null
                      ? `→ ${String(action.value)}`
                      : ''
              }`
            : 'Manual implementation through CI (code or content)'}
        </Text>
      </View>
      <View className="mt-2 flex-row gap-2">
        <Pressable
          onPress={() => onDecision('approve')}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Approve ${approval.title}`}
          className={`flex-1 items-center rounded-xl py-2.5 ${busy ? 'bg-slate-300' : 'bg-emerald-600'}`}
        >
          <Text className="text-xs font-extrabold text-white">{busy ? 'Working…' : 'Approve'}</Text>
        </Pressable>
        <Pressable
          onPress={() => onDecision('reject')}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Reject ${approval.title}`}
          className="flex-1 items-center rounded-xl border-2 border-rose-300 bg-white py-2 dark:border-rose-900 dark:bg-[#0E0E16]"
        >
          <Text className="text-xs font-extrabold text-rose-500">Reject</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function OwnerConsole() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedGate, setExpandedGate] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    try {
      const data = await loadOwnerDashboard();
      setDashboard(data);
      setError(data.error ?? null);
      if (data.isAdmin) track('admin_console_opened', { connected: data.connected });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the owner console.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load])
  );

  const refresh = useCallback(async () => {
    const data = await loadOwnerDashboard();
    setDashboard(data);
    setError(data.error ?? null);
  }, []);

  const toggleFlag = async (flag: FlagDefinition, enabled: boolean) => {
    setBusy(`flag:${flag.key}`);
    try {
      await updateFeatureFlag(flag.key, { enabled });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the flag.');
    } finally {
      setBusy(null);
    }
  };

  const setRollout = async (flag: FlagDefinition, rollout: number) => {
    setBusy(`rollout:${flag.key}`);
    try {
      await updateFeatureFlag(flag.key, { rollout_pct: rollout });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the rollout.');
    } finally {
      setBusy(null);
    }
  };

  const changeSetting = async (patch: Parameters<typeof updateQualitySettings>[0]) => {
    setBusy('settings');
    try {
      await updateQualitySettings(patch);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update settings.');
    } finally {
      setBusy(null);
    }
  };

  const audit = async () => {
    setBusy('audit');
    try {
      const result = await runEngineerAudit();
      await refresh();
      const message =
        result.health?.score != null
          ? `Health ${result.health.score}/100 · ${result.approvals ?? 0} approval(s) waiting.`
          : 'Audit complete.';
      if (Platform.OS === 'web') setError(message);
      else Alert.alert('Engineer audit complete', message);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'The audit could not run.';
      if (Platform.OS === 'web') setError(message);
      else Alert.alert('Audit failed', message);
    } finally {
      setBusy(null);
    }
  };

  const decide = (approval: EngineeringApproval, decision: 'approve' | 'reject') => {
    confirmThen(
      decision === 'approve' ? 'Approve this change?' : 'Reject this change?',
      `${approval.title}\n\n${approval.proposed_change}`,
      () => {
        void (async () => {
          setBusy(`approval:${approval.id}`);
          try {
            const result = await reviewApproval(approval.id, decision);
            await refresh();
            const message = result.detail ?? (decision === 'approve' ? 'Approved.' : 'Rejected.');
            if (Platform.OS !== 'web') Alert.alert('Decision recorded', message);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not record the decision.');
          } finally {
            setBusy(null);
          }
        })();
      }
    );
  };

  const overview = dashboard?.overview ?? null;
  const run = dashboard?.run ?? null;
  const settings = dashboard?.settings ?? null;
  const report = dashboard?.report ?? null;
  const pending = (dashboard?.approvals ?? []).filter((approval) => approval.status === 'pending');
  const decided = (dashboard?.approvals ?? []).filter((approval) => approval.status !== 'pending').slice(0, 6);
  const health = overview
    ? computePlatformHealth({
        crashFreePct: overview.reliability.crash_free_pct,
        p95LatencyMs: overview.reliability.p95_latency_ms,
        latestGateStatus: run?.status ?? overview.latest_run?.status ?? null,
        pendingApprovals: overview.approvals_pending,
        hasTelemetry: overview.reliability.sessions_7d > 0 || Boolean(run),
      })
    : {
        score: report?.health_score ?? 60,
        status: report?.status ?? ('unknown' as const),
        reasons: report ? [] : ['No published run or telemetry yet.'],
      };
  const healthTone =
    health.status === 'healthy' ? GREEN : health.status === 'critical' ? ROSE : health.status === 'watch' ? AMBER : MUTED;
  const gateRows: QualityGateRun[] =
    run && Array.isArray(run.gates) && run.gates.length > 0
      ? [...run.gates].sort((a, b) => Number(b.status === 'failed') - Number(a.status === 'failed'))
      : (dashboard?.gates ?? []).map((gate) => ({ ...gate, status: 'not_run' }));
  const content = dashboard?.content ?? contentInventory();

  if (loading && !dashboard) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F4F5FA] dark:bg-black">
        <ActivityIndicator color={CYAN} size="large" />
        <Text className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">Opening the owner console…</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  const accessBlocked = dashboard && (!dashboard.signedIn || !dashboard.isAdmin);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="mx-auto w-full max-w-md flex-grow items-center self-center px-4 py-6"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} tintColor={CYAN} />}
    >
      <View className="w-full flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="mr-2 h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]"
        >
          <AppIcon name="chevBack" size={18} color={MUTED} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-slate-900 dark:text-slate-50">Quality & Operations</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">Owner console · live platform signal</Text>
        </View>
        <View className="rounded-full border border-cyan-300 bg-cyan-50 px-2 py-1 dark:border-cyan-800 dark:bg-[#00232E]">
          <Text className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">Owner</Text>
        </View>
      </View>

      {error ? (
        <View className="mt-4 w-full rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-[#1A1200]">
          <Text className="text-xs font-bold text-amber-800 dark:text-amber-200">{error}</Text>
        </View>
      ) : null}

      {accessBlocked ? (
        <View className="mt-6 w-full rounded-3xl border-2 border-cyan-200 bg-white p-5 dark:border-[#1E1E2C] dark:bg-[#06060A]">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-[#00232E]">
            <AppIcon name="lock" size={24} color={CYAN} />
          </View>
          <Text className="mt-3 text-lg font-extrabold text-slate-900 dark:text-slate-50">
            {dashboard?.migrationRequired
              ? 'Finish the owner setup'
              : dashboard?.signedIn
                ? 'Owner access only'
                : 'Sign in to continue'}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
            {dashboard?.migrationRequired
              ? 'The quality-operations schema is not installed yet. Run the migration once, then reopen this screen.'
              : dashboard?.signedIn
                ? 'This console is restricted to the verified bolingolearn@pm.me account. Sign in with that account to claim ownership.'
                : 'The console reads admin-only telemetry and approvals. Sign in with the owner account to open it.'}
          </Text>
          {dashboard?.migrationRequired ? (
            <View className="mt-3 rounded-xl bg-slate-900 p-3 dark:bg-black">
              <Text className="text-[10px] leading-5 text-cyan-300">
                supabase/migrations_quality_ops.sql{'\n'}
                Then deploy: engineer-agent, review-approval
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => (dashboard?.signedIn ? void load('refresh') : router.push('/auth'))}
            className="mt-4 items-center rounded-2xl bg-cyan-500 py-3"
          >
            <Text className="text-sm font-extrabold text-white">
              {dashboard?.signedIn ? 'Check access again' : 'Sign in'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {dashboard?.connected ? (
        <>
          <View className="mt-5 w-full flex-row gap-2">
            {TABS.map((item) => {
              const active = tab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} tab`}
                  className={`flex-1 items-center rounded-2xl border-2 py-2 ${
                    active
                      ? 'border-cyan-400 bg-cyan-50 dark:border-cyan-700 dark:bg-[#00232E]'
                      : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                  }`}
                >
                  <AppIcon name={item.icon} size={15} color={active ? CYAN : MUTED} />
                  <Text className={`mt-0.5 text-[9px] font-extrabold uppercase tracking-widest ${active ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400'}`}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'overview' ? (
            <>
              <View className="mt-4 w-full overflow-hidden rounded-3xl bg-slate-900 p-5 dark:bg-[#00131A]">
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                      Platform health
                    </Text>
                    <Text className="mt-1 text-5xl font-extrabold text-white">
                      {health.status === 'unknown' ? '—' : health.score}
                    </Text>
                    <Text className="text-xs font-bold text-slate-400">out of 100</Text>
                  </View>
                  <View className="items-end">
                    <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${healthTone}22` }}>
                      <Text className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: healthTone }}>
                        {health.status}
                      </Text>
                    </View>
                    <Text className="mt-2 text-[10px] text-slate-400">Updated {when(overview?.generated_at)}</Text>
                  </View>
                </View>
                <View className="mt-3 rounded-2xl bg-white/5 p-3">
                  {health.reasons.slice(0, 3).map((reason) => (
                    <Text key={reason} className="mb-1 text-[11px] leading-4 text-slate-300">
                      • {reason}
                    </Text>
                  ))}
                </View>
              </View>

              <View className="mt-4 w-full flex-row gap-3">
                <Kpi
                  label="Crash-free"
                  value={pct(overview?.reliability.crash_free_pct)}
                  sub="7-day sessions"
                  tone={(overview?.reliability.crash_free_pct ?? 100) < 99 ? ROSE : GREEN}
                />
                <Kpi
                  label="p95 latency"
                  value={num(overview?.reliability.p95_latency_ms, ' ms')}
                  sub="interaction budget"
                  tone={(overview?.reliability.p95_latency_ms ?? 0) > 2500 ? AMBER : GREEN}
                />
              </View>
              <View className="mt-2 w-full flex-row gap-3">
                <Kpi
                  label="Active learners"
                  value={num(overview?.learners.active_7d)}
                  sub="7-day window"
                  tone={CYAN}
                />
                <Kpi
                  label="Lessons done"
                  value={num(overview?.engagement.lessons_completed_7d)}
                  sub={`${pct(overview?.engagement.completion_rate_pct)} completion`}
                  tone={VIOLET}
                />
              </View>

              <Card title="Release gate" icon="shield" right={<Text className="text-[10px] text-slate-400">{when(run?.created_at)}</Text>}>
                <View className="flex-row items-center gap-2">
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: `${toneFor(run?.status)}22` }}
                  >
                    <Text className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: toneFor(run?.status) }}>
                      {run?.status ?? 'not run'}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {run ? `${run.summary?.passed ?? 0}/${run.summary?.total ?? gateRows.length} gates` : `${gateRows.length} required gates`}
                  </Text>
                  <Text className="ml-auto text-[10px] text-slate-400">{run?.branch ?? 'local'}</Text>
                </View>
                <Text className="mt-1 text-[10px] text-slate-400">
                  {run?.commit_sha ? `Commit ${run.commit_sha.slice(0, 8)}` : 'No published run yet — run npm run gate'}
                </Text>
                <Pressable onPress={() => setTab('quality')} className="mt-2 flex-row items-center gap-1">
                  <Text className="text-xs font-extrabold text-cyan-700 dark:text-cyan-300">Inspect gates</Text>
                  <AppIcon name="chevRight" size={14} color={CYAN} />
                </Pressable>
              </Card>

              <Card title="Platform ledger" icon="globe" accent={VIOLET}>
                <Stat label="Learners" value={num(overview?.learners.total)} />
                <Stat label="Premium" value={num(overview?.learners.premium)} tone={AMBER} />
                <Stat label="Estimated MRR" value={`$${num(overview?.revenue.mrr_estimate_usd)}`} tone={GREEN} />
                <Stat label="Course library" value={`${content.courses} courses · ${content.lessons} lessons`} />
                <Stat label="Practice modes" value={`${content.workshops} workshops · ${content.labs} labs · ${content.quizzes} quizzes`} />
                <Stat label="Applied projects" value={String(content.projects)} />
                <Stat label="Question bank" value={`${content.questions} items`} />
              </Card>

              <Card
                title="Engineer"
                icon="robot"
                right={
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${toneFor(report?.status)}22` }}>
                    <Text className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: toneFor(report?.status) }}>
                      {report?.status ?? 'idle'}
                    </Text>
                  </View>
                }
              >
                <Text className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {report?.summary ?? 'No audit yet. Kito observes telemetry, quality runs, error clusters and experiment integrity.'}
                </Text>
                <View className="mt-2 flex-row items-center gap-2">
                  <Text className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    {pending.length} approval{pending.length === 1 ? '' : 's'} waiting
                  </Text>
                  <Text className="ml-auto text-[10px] text-slate-400">{when(report?.created_at)}</Text>
                </View>
                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    onPress={() => void audit()}
                    disabled={busy === 'audit'}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${busy === 'audit' ? 'bg-slate-300' : 'bg-slate-900 dark:bg-[#00232E]'}`}
                  >
                    <AppIcon name="refresh" size={14} color={CYAN} />
                    <Text className="text-xs font-extrabold text-cyan-300">{busy === 'audit' ? 'Auditing…' : 'Run audit'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setTab('engineer')} className="flex-1 items-center justify-center rounded-xl border border-slate-200 py-2.5 dark:border-[#1E1E2C]">
                    <Text className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Open report</Text>
                  </Pressable>
                </View>
              </Card>

              <Card title="Approvals & email" icon="mail" accent={AMBER}>
                <Stat label="Recipient" value={settings?.notify_email ?? 'bolingolearn@pm.me'} />
                <Stat label="Last delivery" value={dashboard.notifications[0]?.status ?? 'none'} tone={toneFor(dashboard.notifications[0]?.status)} />
                <Stat label="Last subject" value={dashboard.notifications[0]?.subject?.slice(0, 42) ?? '—'} />
                <Text className="mt-1 text-[10px] leading-4 text-slate-400">
                  Email requires NOTIFY_EMAIL_WEBHOOK_URL or RESEND_API_KEY in Supabase secrets. The outbox records every attempt.
                </Text>
              </Card>
            </>
          ) : null}

          {tab === 'quality' ? (
            <>
              <Card
                title="Latest required run"
                icon="shield"
                right={
                  <Text className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: toneFor(run?.status) }}>
                    {run?.status ?? 'not run'}
                  </Text>
                }
              >
                <Text className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {run
                    ? `${run.summary?.passed ?? 0}/${run.summary?.total ?? gateRows.length} gates passed in ${((run.duration_ms ?? 0) / 1000).toFixed(1)}s on ${run.branch ?? 'unknown'}.`
                    : 'Publish a run from CI or locally: npm run gate -- --publish. Until then only the catalog is visible.'}
                </Text>
                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-[#1E1E2C] dark:bg-[#0E0E16]">
                    <Text className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Commit</Text>
                    <Text className="mt-0.5 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                      {run?.commit_sha?.slice(0, 10) ?? '—'}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-[#1E1E2C] dark:bg-[#0E0E16]">
                    <Text className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">When</Text>
                    <Text className="mt-0.5 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                      {when(run?.created_at)}
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 text-[10px] leading-4 text-slate-400">
                  CI blocks every required gate on pull requests and main. Tap a gate to inspect its captured output.
                </Text>
              </Card>

              <View className="mt-4 w-full">
                <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                  {gateRows.length} gates · failed first
                </Text>
                {gateRows.map((gate) => (
                  <GateRow
                    key={gate.id}
                    gate={gate}
                    expanded={expandedGate === gate.id}
                    onPress={() => setExpandedGate((current) => (current === gate.id ? null : gate.id))}
                  />
                ))}
              </View>

              <Card title="How the bar works" icon="target" accent={VIOLET}>
                <Text className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  content/quality/gates.json is the single source for the app, the runner and CI. A required failure fails the
                  workflow and lowers platform health until a green run is published.
                </Text>
                <View className="mt-2 rounded-xl bg-slate-900 p-3 dark:bg-black">
                  <Text className="text-[10px] leading-5 text-cyan-300">
                    npm run gate{'\n'}
                    npm run gate -- --publish{'\n'}
                    .github/workflows/quality-gate.yml
                  </Text>
                </View>
              </Card>
            </>
          ) : null}

          {tab === 'growth' ? (
            <>
              <Card title="Feature flags" icon="zap" right={<Text className="text-[10px] text-slate-400">{dashboard.flags.length} live</Text>}>
                {dashboard.flags.map((flag) => (
                  <View key={flag.key} className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[#1E1E2C] dark:bg-[#0E0E16]">
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1">
                        <Text className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{flag.name}</Text>
                        <Text className="text-[10px] uppercase tracking-widest text-slate-400">
                          {flag.type} · {flag.key}
                        </Text>
                      </View>
                      <Switch
                        value={flag.enabled}
                        onValueChange={(next) => void toggleFlag(flag, next)}
                        disabled={busy === `flag:${flag.key}`}
                        trackColor={{ true: CYAN, false: '#CBD5E1' }}
                      />
                    </View>
                    <Text className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{flag.description}</Text>
                    <View className="mt-2 flex-row items-center gap-1.5">
                      <Text className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Rollout</Text>
                      {[0, 25, 50, 100].map((percent) => (
                        <Pressable
                          key={percent}
                          onPress={() => void setRollout(flag, percent)}
                          disabled={busy === `rollout:${flag.key}`}
                          className={`rounded-lg border px-2 py-1 ${
                            flag.rolloutPct === percent
                              ? 'border-cyan-400 bg-cyan-50 dark:bg-[#00232E]'
                              : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#06060A]'
                          }`}
                        >
                          <Text className={`text-[9px] font-extrabold ${flag.rolloutPct === percent ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-400'}`}>
                            {percent}%
                          </Text>
                        </Pressable>
                      ))}
                      <Text className="ml-auto text-[9px] text-slate-400">{flag.metric ?? 'no metric'}</Text>
                    </View>
                  </View>
                ))}
                <Text className="text-[10px] leading-4 text-slate-400">
                  Assignment is sticky and deterministic (FNV-1a of flag + learner), never random per launch.
                </Text>
              </Card>

              <Card title="Experiment results" icon="flask" accent={AMBER}>
                {(overview?.experiments ?? []).length === 0 ? (
                  <Text className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    No exposures in the last 90 days. Open the paywall on a device to enroll; the first exposure is logged once
                    per session.
                  </Text>
                ) : (
                  (overview?.experiments ?? []).map((experiment) => (
                    <View key={`${experiment.experiment}:${experiment.variant}`} className="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#1E1E2C] dark:bg-[#0E0E16]">
                      <View className="flex-row items-center">
                        <Text className="flex-1 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                          {experiment.experiment}
                        </Text>
                        <Text className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-300">
                          {experiment.variant}
                        </Text>
                      </View>
                      <View className="mt-1 flex-row items-center">
                        <Text className="text-[10px] text-slate-500 dark:text-slate-400">
                          {experiment.exposures} exposed · {experiment.conversions} converted
                        </Text>
                        <Text className="ml-auto text-xs font-extrabold" style={{ color: AMBER }}>
                          {experiment.conversion_pct.toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </Card>

              <Card title="Learning funnel" icon="brain" accent={VIOLET}>
                <Stat label="Lesson starts (7d)" value={num(overview?.engagement.lesson_starts_7d)} />
                <Stat label="Lesson completions (7d)" value={num(overview?.engagement.lessons_completed_7d)} tone={GREEN} />
                <Stat label="Completion rate" value={pct(overview?.engagement.completion_rate_pct)} tone={CYAN} />
                <Stat label="Quiz submissions (7d)" value={num(overview?.engagement.quiz_submissions_7d)} />
                <Stat label="Active learners (7d)" value={num(overview?.engagement.active_learners_7d)} />
                <Text className="mt-1 text-[10px] leading-4 text-slate-400">
                  Every metric is computed from the same anonymous event schema, so experiments and the funnel never disagree.
                </Text>
              </Card>
            </>
          ) : null}

          {tab === 'engineer' ? (
            <>
              <View className="mt-4 w-full rounded-3xl bg-slate-900 p-5 dark:bg-[#00131A]">
                <View className="flex-row items-center gap-2">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${CYAN}22` }}>
                    <AppIcon name="robot" size={22} color={CYAN} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-extrabold text-white">Kito · engineer agent</Text>
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                      {settings?.agent_enabled === false ? 'paused' : 'on duty'} · {report?.via ?? 'rules'} · {report?.model ?? 'local'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void audit()}
                    disabled={busy === 'audit'}
                    accessibilityRole="button"
                    accessibilityLabel="Run an engineer audit"
                    className="rounded-xl bg-cyan-500 px-3 py-2"
                  >
                    <Text className="text-[10px] font-extrabold text-black">{busy === 'audit' ? 'AUDITING…' : 'RUN AUDIT'}</Text>
                  </Pressable>
                </View>
                <Text className="mt-3 text-xs leading-5 text-slate-300">
                  Monitors quality runs, telemetry, error clusters and experiment integrity. Proposes reversible changes; source
                  edits still ship through CI. Last audit {when(report?.created_at)} · {report?.duration_ms ?? 0} ms.
                </Text>
              </View>

              <Card title="Latest report" icon="doc" right={<Text className="text-[10px] text-slate-400">{when(report?.created_at)}</Text>}>
                {report ? (
                  <>
                    <Text className="text-sm font-extrabold leading-5 text-slate-800 dark:text-slate-100">{report.summary}</Text>
                    <View className="mt-2 flex-row items-center gap-2">
                      <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${toneFor(report.status)}22` }}>
                        <Text className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: toneFor(report.status) }}>
                          {report.status} · {report.health_score ?? health.score}/100
                        </Text>
                      </View>
                      <Text className="text-[10px] text-slate-400">{report.findings.length} findings</Text>
                    </View>
                  </>
                ) : (
                  <Text className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    No report yet. Run an audit to let Kito inspect the platform and queue approvals.
                  </Text>
                )}
              </Card>

              <View className="mt-4 w-full">
                <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                  Findings
                </Text>
                {(report?.findings ?? []).map((finding) => (
                  <FindingCard key={finding.id} finding={finding} />
                ))}
                {!report ? (
                  <Text className="text-xs text-slate-500 dark:text-slate-400">Nothing to review yet.</Text>
                ) : null}
              </View>

              <Card
                title="Approvals"
                icon="checkCircle"
                accent={AMBER}
                right={<Text className="text-[10px] font-extrabold text-amber-600 dark:text-amber-300">{pending.length} pending</Text>}
              >
                {pending.length === 0 ? (
                  <Text className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    No approvals waiting. High-impact findings become approvals automatically; you are emailed at bolingolearn@pm.me.
                  </Text>
                ) : (
                  pending.map((approval) => (
                    <ApprovalCard
                      key={approval.id}
                      approval={approval}
                      busy={busy === `approval:${approval.id}`}
                      onDecision={(decision) => decide(approval, decision)}
                    />
                  ))
                )}
                {decided.length > 0 ? (
                  <View className="mt-1 border-t border-slate-200 pt-2 dark:border-[#1E1E2C]">
                    <Text className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Recently decided</Text>
                    {decided.map((approval) => (
                      <View key={approval.id} className="flex-row items-center gap-2 py-1">
                        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: toneFor(approval.status) }} />
                        <Text className="flex-1 text-[11px] text-slate-600 dark:text-slate-300" numberOfLines={1}>
                          {approval.title}
                        </Text>
                        <Text className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: toneFor(approval.status) }}>
                          {approval.status.replace('_', ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>

              <Card title="Notifications" icon="mail" accent={AMBER}>
                {dashboard.notifications.length === 0 ? (
                  <Text className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    No email attempts yet. Configure a provider secret; approvals still appear here without email.
                  </Text>
                ) : (
                  dashboard.notifications.map((notification) => (
                    <View key={notification.id} className="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#1E1E2C] dark:bg-[#0E0E16]">
                      <View className="flex-row items-center gap-2">
                        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: toneFor(notification.status) }} />
                        <Text className="flex-1 text-[11px] font-bold text-slate-700 dark:text-slate-200" numberOfLines={1}>
                          {notification.subject}
                        </Text>
                        <Text className="text-[9px] font-extrabold uppercase" style={{ color: toneFor(notification.status) }}>
                          {notification.status}
                        </Text>
                      </View>
                      <Text className="mt-0.5 text-[9px] text-slate-400">
                        {notification.recipient} · {notification.provider ?? 'no provider'} · {when(notification.created_at)}
                        {notification.error ? ` · ${notification.error.slice(0, 80)}` : ''}
                      </Text>
                    </View>
                  ))
                )}
              </Card>

              <Card title="Guardrails" icon="key" accent={ROSE}>
                <View className="flex-row items-center justify-between py-1.5">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Engineer enabled</Text>
                    <Text className="text-[10px] text-slate-400">Scheduled + manual audits</Text>
                  </View>
                  <Switch
                    value={settings?.agent_enabled !== false}
                    onValueChange={(value) => void changeSetting({ agent_enabled: value })}
                    disabled={busy === 'settings'}
                    trackColor={{ true: CYAN, false: '#CBD5E1' }}
                  />
                </View>
                <View className="flex-row items-center justify-between py-1.5">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Auto-guardrails</Text>
                    <Text className="text-[10px] text-slate-400">Pause experiments on a breach</Text>
                  </View>
                  <Switch
                    value={settings?.auto_guardrails !== false}
                    onValueChange={(value) => void changeSetting({ auto_guardrails: value })}
                    disabled={busy === 'settings'}
                    trackColor={{ true: ROSE, false: '#CBD5E1' }}
                  />
                </View>
                <View className="flex-row items-center justify-between py-1.5">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Release freeze</Text>
                    <Text className="text-[10px] text-slate-400">Advisory banner for operators</Text>
                  </View>
                  <Switch
                    value={settings?.release_freeze === true}
                    onValueChange={(value) => void changeSetting({ release_freeze: value })}
                    disabled={busy === 'settings'}
                    trackColor={{ true: ROSE, false: '#CBD5E1' }}
                  />
                </View>
                <Text className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Crash-free floor</Text>
                <View className="mt-1 flex-row gap-2">
                  {[98, 99, 99.5].map((floor) => (
                    <Pressable
                      key={floor}
                      onPress={() => void changeSetting({ crash_free_floor: floor })}
                      disabled={busy === 'settings'}
                      className={`flex-1 items-center rounded-xl border py-1.5 ${
                        settings?.crash_free_floor === floor
                          ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-[#1A0008]'
                          : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                      }`}
                    >
                      <Text className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300">{floor}%</Text>
                    </Pressable>
                  ))}
                </View>
                <Text className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">p95 ceiling</Text>
                <View className="mt-1 flex-row gap-2">
                  {[1500, 2500, 4000].map((ceiling) => (
                    <Pressable
                      key={ceiling}
                      onPress={() => void changeSetting({ p95_latency_ceiling_ms: ceiling })}
                      disabled={busy === 'settings'}
                      className={`flex-1 items-center rounded-xl border py-1.5 ${
                        settings?.p95_latency_ceiling_ms === ceiling
                          ? 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-[#1A1200]'
                          : 'border-slate-200 bg-white dark:border-[#1E1E2C] dark:bg-[#0E0E16]'
                      }`}
                    >
                      <Text className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300">{ceiling} ms</Text>
                    </Pressable>
                  ))}
                </View>
                <Text className="mt-2 text-[10px] leading-4 text-slate-400">
                  Thresholds only act after {settings?.min_sessions_for_guardrail ?? 50} sessions in 7 days, so a quiet week
                  never triggers a false pause.
                </Text>
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      <View className="mt-6 items-center">
        <Text className="text-[10px] text-slate-400">Private operator surface · data never leaves the owner console</Text>
      </View>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
