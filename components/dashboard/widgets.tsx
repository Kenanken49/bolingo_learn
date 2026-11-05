import { View, Pressable } from 'react-native';
import Text from '../ui/Text';
import AppIcon, { type AppIconName } from '../AppIcon';
import { useTheme } from '../../lib/theme';
import { SPACES, type LearningSpace } from '../../lib/learningSpace';
import type { DashTrack, DayCount, ScheduleItem } from '../../lib/dashboard';

/** Small section header: eyebrow + bold title + optional action. */
export function SectionHeader({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-2 mt-5 flex-row items-end justify-between">
      <View>
        {eyebrow ? (
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-dash-faint">
            {eyebrow}
          </Text>
        ) : null}
        <Text className="mt-0.5 text-[17px] font-extrabold tracking-tight text-dash-ink dark:text-dash-dink">
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text className="text-[12.5px] font-bold text-dash-pillink">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Thin progress bar in dashboard cyan. */
export function DashBar({ value, height = 6 }: { value: number; height?: number }) {
  const [theme] = useTheme();
  return (
    <View
      className="w-full overflow-hidden rounded-full bg-dash-line dark:bg-dash-dline"
      style={{ height }}
    >
      <View
        className="rounded-full"
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height,
          backgroundColor: theme === 'dark' ? '#22D3EE' : '#06B6D4',
        }}
      />
    </View>
  );
}

/**
 * Hero: dark adaptive-experience card. Resume target, course label and
 * progress are all real; the mode tabs from the mock carry no backend and
 * are intentionally not rendered.
 */
export function HeroCard({
  eyebrow,
  title,
  sub,
  progress,
  progressLabel,
  onResume,
  space,
  onSpace,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  progress: number;
  progressLabel: string;
  onResume: () => void;
  /** Wireframe learning-mode tabs — every mode resolves a real target. */
  space: LearningSpace;
  onSpace: (s: LearningSpace) => void;
}) {
  return (
    <View className="overflow-hidden rounded-3xl bg-dash-hero p-5">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full bg-emerald-400" />
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-emerald-300">
            Adaptive experience
          </Text>
        </View>
        <View className="flex-row gap-1">
          {SPACES.map((s) => {
            const on = s.id === space;
            return (
              <Pressable
                key={s.id}
                onPress={() => onSpace(s.id)}
                accessibilityRole="button"
                accessibilityLabel={`${s.label}, ${s.ages}`}
                className={`rounded-full px-2 py-1 ${on ? 'bg-dash-cyan' : 'bg-white/10'}`}
              >
                <Text className={`text-[9px] font-extrabold ${on ? 'text-[#062A33]' : 'text-slate-300'}`}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text className="mt-3 text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-slate-400">
        {eyebrow}
      </Text>
      <Text className="mt-1 text-[22px] font-extrabold leading-[27px] tracking-tight text-white" numberOfLines={2}>
        {title}
      </Text>
      <Text className="mt-1 text-[12.5px] font-semibold text-slate-300" numberOfLines={1}>
        {sub}
      </Text>
      <Pressable
        onPress={onResume}
        accessibilityRole="button"
        accessibilityLabel={`Resume ${title}`}
        className="mt-4 flex-row items-center justify-center gap-2 rounded-full bg-dash-cyan py-3"
      >
        <AppIcon name="play" size={14} color="#062A33" />
        <Text className="text-[13.5px] font-extrabold text-[#062A33]">Resume lesson</Text>
      </Pressable>
      <View className="mt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[10.5px] font-bold text-slate-300">Course progress</Text>
          <Text className="text-[10.5px] font-bold text-slate-300">{progressLabel}</Text>
        </View>
        <View className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <View className="h-1.5 rounded-full bg-dash-cyan" style={{ width: `${Math.round(progress * 100)}%` }} />
        </View>
      </View>
    </View>
  );
}

/** Level badge + XP + task pills + gems card. All values real. */
export function StatsStrip({
  level,
  xp,
  xpInto,
  xpNeeded,
  tasks,
  gems,
}: {
  level: number;
  xp: number;
  xpInto: number;
  xpNeeded: number;
  tasks: { id: string; label: string; done: boolean; frac: string; icon: AppIconName }[];
  gems: number;
}) {
  const [theme] = useTheme();
  return (
    <View className="mt-3 flex-row items-stretch gap-2">
      <View className="flex-1 rounded-2xl border border-dash-line bg-dash-card p-3 dark:border-dash-dline dark:bg-dash-dcard">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-dash-hero">
            <AppIcon name="flame" size={17} color="#F59E0B" />
          </View>
          <View>
            <Text className="text-[15px] font-extrabold text-dash-ink dark:text-dash-dink">{level}</Text>
            <Text className="text-[9px] font-extrabold uppercase tracking-[1.2px] text-dash-faint">Level</Text>
          </View>
          <View className="ml-1 flex-1">
            <Text className="text-[13px] font-extrabold text-dash-ink dark:text-dash-dink">
              {xp.toLocaleString()} XP
            </Text>
            <View className="mt-1">
              <DashBar value={xpNeeded ? xpInto / xpNeeded : 0} height={5} />
            </View>
            <Text className="mt-0.5 text-[9.5px] font-semibold text-dash-muted dark:text-dash-dmuted">
              {xpNeeded} XP to level {level + 1}
            </Text>
          </View>
        </View>
        <View className="mt-2.5 flex-row gap-1.5">
          {tasks.map((t) => (
            <View
              key={t.id}
              className={`flex-1 flex-row items-center gap-1 rounded-xl px-2 py-1.5 ${
                t.done ? 'bg-emerald-500/15' : 'bg-dash-bg dark:bg-dash-dbg'
              }`}
            >
              <AppIcon
                name={t.done ? 'checkCircle' : t.icon}
                size={14}
                color={t.done ? '#10B981' : theme === 'dark' ? '#94A3B8' : '#64748B'}
              />
              <View className="flex-1">
                <Text
                  className="text-[9px] font-bold leading-[12px] text-dash-ink dark:text-dash-dink"
                  numberOfLines={2}
                >
                  {t.label}
                </Text>
                <Text className="text-[9px] font-extrabold text-dash-muted dark:text-dash-dmuted">{t.frac}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View className="w-[86px] items-center justify-center rounded-2xl bg-dash-hero p-2">
        <AppIcon name="gem" size={20} color="#FBBF24" />
        <Text className="mt-1 text-[14px] font-extrabold text-amber-300">{gems}</Text>
        <Text className="text-[9px] font-bold uppercase tracking-wide text-slate-300">Gems</Text>
      </View>
    </View>
  );
}

/** "Find your next move" — horizontal track cards with real lesson counts. */
export function TrackRow({ tracks, onOpen }: { tracks: DashTrack[]; onOpen: (t: DashTrack) => void }) {
  const [theme] = useTheme();
  return (
    <View className="flex-row gap-2">
      {tracks.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onOpen(t)}
          accessibilityRole="button"
          accessibilityLabel={`${t.title}, ${t.lessonLabel}`}
          className="min-w-0 flex-1 rounded-2xl border border-dash-line bg-dash-card p-3 dark:border-dash-dline dark:bg-dash-dcard"
        >
          <View className="flex-row items-center justify-between">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-dash-pill dark:bg-dash-dbg">
              <AppIcon name={t.kind === 'cert' ? 'medal' : 'gradCap'} size={18} color="#0284C7" />
            </View>
            <AppIcon name="chevRight" size={15} color={theme === 'dark' ? '#64748B' : '#94A3B8'} />
          </View>
          <Text className="mt-2 text-[13px] font-extrabold text-dash-ink dark:text-dash-dink" numberOfLines={1}>
            {t.title}
          </Text>
          <Text className="mt-0.5 text-[10.5px] font-semibold text-dash-muted dark:text-dash-dmuted">
            {t.lessonLabel}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const RING: Record<number, string> = { 0: '#8B5CFF', 1: '#22D3EE', 2: '#A3E635' };

/** "Curated for you" — numbered dark course cards with real progress. */
export function CuratedRow({ tracks, onOpen }: { tracks: (DashTrack & { level: string; number: string })[]; onOpen: (t: DashTrack) => void }) {
  return (
    <View className="gap-2">
      {tracks.map((t, i) => {
        const ring = RING[i % 3];
        const pct = t.total ? t.progress / t.total : 0;
        return (
          <Pressable
            key={t.id}
            onPress={() => onOpen(t)}
            accessibilityRole="button"
            accessibilityLabel={`${t.title}, ${Math.round(pct * 100)} percent complete`}
            className="overflow-hidden rounded-2xl bg-dash-hero"
          >
            <View className="flex-row items-center px-3 pt-2.5">
              <View className="rounded-md bg-white/10 px-1.5 py-0.5">
                <Text className="text-[9px] font-extrabold tracking-[1px] text-slate-200">{t.level}</Text>
              </View>
              <View className="flex-1" />
              <Text className="text-[10px] font-bold text-slate-400">
                {t.progress}/{t.total}
              </Text>
            </View>
            <View className="flex-row items-center px-4 pb-3 pt-1">
              <View
                className="h-14 w-14 items-center justify-center rounded-full"
                style={{ borderWidth: 3, borderColor: ring, shadowColor: ring, shadowRadius: 10, shadowOpacity: 0.7, elevation: 6 }}
              >
                <Text className="text-[17px] font-extrabold text-white">{t.number}</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[14.5px] font-extrabold text-white" numberOfLines={1}>
                  {t.title}
                </Text>
                <Text className="mt-0.5 text-[11px] font-semibold text-slate-300" numberOfLines={1}>
                  {t.blurb}
                </Text>
                <View className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/15">
                  <View className="h-1 rounded-full" style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: ring }} />
                </View>
              </View>
              <AppIcon name="chevRight" size={18} color="#94A3B8" />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "Your momentum" — real last-7-day completions; hides when there is no data. */
export function MomentumCard({ days, total, deltaPct }: { days: DayCount[]; total: number; deltaPct: number | null }) {
  const [theme] = useTheme();
  if (!days.length || total === 0) return null;
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <View className="rounded-2xl border border-dash-line bg-dash-card p-4 dark:border-dash-dline dark:bg-dash-dcard">
      <Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-dash-faint">Performance</Text>
      <Text className="mt-0.5 text-[15px] font-extrabold text-dash-ink dark:text-dash-dink">Your momentum</Text>
      <View className="mt-3 h-[110px] flex-row items-end justify-between gap-1.5">
        {days.map((d, i) => {
          const hot = d.count === max && max > 0;
          return (
            <View key={i} className="flex-1 items-center justify-end">
              <View
                className="w-full rounded-t-md"
                style={{
                  height: `${Math.max(8, (d.count / max) * 100)}%`,
                  backgroundColor: hot ? '#06B6D4' : theme === 'dark' ? '#334155' : '#CBD5E1',
                  shadowColor: hot ? '#06B6D4' : 'transparent',
                  shadowRadius: hot ? 8 : 0,
                  shadowOpacity: hot ? 0.8 : 0,
                }}
              />
              <Text className="mt-1 text-[9px] font-bold text-dash-faint">{d.label}</Text>
            </View>
          );
        })}
      </View>
      <View className="mt-2 flex-row">
        <View className="flex-1">
          <Text className="text-[16px] font-extrabold text-dash-ink dark:text-dash-dink">{total}</Text>
          <Text className="text-[10px] font-semibold text-dash-muted dark:text-dash-dmuted">Lessons this week</Text>
        </View>
        <View className="flex-1 items-end">
          <Text className={`text-[16px] font-extrabold ${deltaPct !== null && deltaPct < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {deltaPct === null ? '—' : `${deltaPct >= 0 ? '+' : ''}${deltaPct}%`}
          </Text>
          <Text className="text-[10px] font-semibold text-dash-muted dark:text-dash-dmuted">vs last week</Text>
        </View>
      </View>
    </View>
  );
}

/** "Your schedule" — only real items (next lesson, due reviews). */
export function ScheduleCard({ items, onOpen, onFull }: { items: ScheduleItem[]; onOpen: (s: ScheduleItem) => void; onFull: () => void }) {
  if (!items.length) return null;
  return (
    <View className="mt-3 rounded-2xl border border-dash-line bg-dash-card p-4 dark:border-dash-dline dark:bg-dash-dcard">
      <Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-dash-faint">By track</Text>
      <Text className="mt-0.5 text-[15px] font-extrabold text-dash-ink dark:text-dash-dink">Your schedule</Text>
      <View className="mt-2 gap-2">
        {items.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onOpen(s)}
            accessibilityRole="button"
            accessibilityLabel={s.title}
            className="flex-row items-center gap-3"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-dash-pill dark:bg-dash-dbg">
              <Text className="text-[14px] font-extrabold text-dash-pillink">{s.dateLabel}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[9.5px] font-extrabold uppercase tracking-[1px] text-dash-pillink">
                {s.kindLabel}
              </Text>
              <Text className="text-[13px] font-extrabold text-dash-ink dark:text-dash-dink" numberOfLines={1}>
                {s.title}
              </Text>
              <Text className="text-[10.5px] font-semibold text-dash-muted dark:text-dash-dmuted" numberOfLines={1}>
                {s.sub}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={onFull}
        accessibilityRole="button"
        accessibilityLabel="View full schedule"
        className="mt-3 items-center rounded-xl border border-dash-line py-2.5 dark:border-dash-dline"
      >
        <Text className="text-[12px] font-extrabold text-dash-pillink">View full schedule →</Text>
      </Pressable>
    </View>
  );
}

/** Coach quote — editorial content from the wireframe, not learner data. */
export function CoachCard() {
  return (
    <View className="mt-3 rounded-2xl bg-dash-lav p-4 dark:bg-dash-dcard">
      <AppIcon name="sparkles" size={18} color="#8B5CFF" />
      <Text className="mt-2 text-[13.5px] font-semibold italic leading-[19px] text-dash-ink dark:text-dash-dink">
        “Small progress is still progress. Show up for just 20 minutes today.”
      </Text>
      <Text className="mt-1.5 text-[11px] font-bold text-dash-muted dark:text-dash-dmuted">
        — Your learning coach
      </Text>
    </View>
  );
}
