import { Pressable, View } from 'react-native';
import Text from './ui/Text';
import AppIcon from './AppIcon';
import Mascot from './AfricanMascots';
import { useNatural } from '../lib/natural';
import { useTierStyle } from '../lib/tierStyle';
import { CURRICULUM, KIND_META, type CurriculumBlock } from '../lib/curriculum';
import { goalLabel, nextUpBlock, type GoalId } from '../lib/onboarding';
import { consistencyLine, monthConsistency, weekBars } from '../lib/tierProgress';

/**
 * The top of the Learn tab, rebuilt per life stage from the adaptive
 * wireframes (WF-T1-01, WF-T2-01, WF-T3-01). Everything shown is real
 * progress: the current unit, the blocks left, the next few items.
 *   Explorer — chapter card with a progress bar and "N to the chest".
 *   Launcher — goal headline with the unit path (done / now / next).
 *   Climber  — "Your five minutes": today's date and the next three items.
 */
export default function TierHomeHeader({
  completed,
  goal,
  onOpen,
  activity = null,
}: {
  completed: Set<string>;
  goal: GoalId | null;
  onOpen: (b: CurriculumBlock) => void;
  /** Real activity timestamps; null for guests (no chart or ratio shown). */
  activity?: Date[] | null;
}) {
  const p = useNatural();
  const tier = useTierStyle();
  const next = nextUpBlock(completed);
  if (!next) return null;
  const done = (b: CurriculumBlock) => completed.has(b.lessonId) || completed.has(b.id);
  const unitIdx = CURRICULUM.findIndex((u) => u.blocks.some((b) => b.id === next.id));
  const unit = CURRICULUM[unitIdx];
  if (!unit) return null;
  const doneCount = unit.blocks.filter(done).length;
  const left = unit.blocks.length - doneCount;
  const card = { width: '100%' as const, maxWidth: 384, marginBottom: 12, borderRadius: 22, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, padding: 14 };

  if (tier.stage === 'climber') {
    const queue: CurriculumBlock[] = [];
    for (const u of CURRICULUM.slice(unitIdx)) for (const b of u.blocks) if (!done(b) && queue.length < 3) queue.push(b);
    const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    return (
      <View style={{ ...card, borderRadius: 16, backgroundColor: 'transparent', borderWidth: 0, padding: 2 }}>
        <Text style={{ fontSize: 12, color: p.muted }}>{today}</Text>
        <Text style={{ marginTop: 2, fontSize: 30, fontWeight: '700', color: p.ink }}>Your five minutes.</Text>
        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: p.line }}>
          {queue.map((b, i) => (
            <Pressable
              key={b.id}
              onPress={() => onOpen(b)}
              accessibilityRole="button"
              accessibilityLabel={`${b.title}, ${b.minutes} minutes`}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: p.line, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: i === 0 ? p.ink : p.muted }}>{b.title}</Text>
                <Text style={{ fontSize: 12, color: p.muted }}>{KIND_META[b.kind].label} · {b.minutes} min</Text>
              </View>
              <AppIcon name="chevRight" size={16} color={p.stone} />
            </Pressable>
          ))}
        </View>
        {activity ? <ClimberFooter activity={activity} /> : null}
      </View>
    );
  }

  if (tier.stage === 'launcher') {
    const path = CURRICULUM.filter((u) => u.course === unit.course).slice(0, 4);
    return (
      <View style={card}>
        <Text style={{ fontSize: 12, color: p.muted }}>{goal ? `Goal · ${goalLabel(goal)}` : 'Your path'}</Text>
        <Text numberOfLines={2} style={{ marginTop: 2, fontSize: 22, fontWeight: '800', color: p.ink }}>{unit.goal || unit.title}</Text>
        <View style={{ marginTop: 10, marginLeft: 6, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: p.line, gap: 2 }}>
          {path.map((u) => {
            const d = u.blocks.filter(done).length;
            const state = d === u.blocks.length ? 'done' : u.id === unit.id ? 'now' : 'next';
            const dot = state === 'done' ? p.moss : state === 'now' ? tier.accent : p.surface;
            return (
              <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <View style={{ position: 'absolute', left: -22, width: 14, height: 14, borderRadius: 7, backgroundColor: dot, borderWidth: 2, borderColor: state === 'next' ? p.stone : dot }} />
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: '600', color: p.ink }}>{u.title}</Text>
                <Text style={{ fontSize: 12, color: p.muted }}>
                  {state === 'done' ? 'Done' : `${Math.round((d / Math.max(1, u.blocks.length)) * 100)}%`}
                </Text>
              </View>
            );
          })}
        </View>
        {activity ? <WeekChart activity={activity} accent={tier.accent} /> : null}
      </View>
    );
  }

  return (
    <View style={{ ...card, flexDirection: 'row', alignItems: 'center', backgroundColor: p.surfaceAlt, borderRadius: 24 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11, color: p.muted }}>{unit.section}</Text>
        <Text numberOfLines={2} style={{ fontSize: 19, fontWeight: '800', color: p.ink }}>{unit.title}</Text>
        <View style={{ marginTop: 6, height: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: p.line }}>
          <View style={{ height: '100%', width: `${(doneCount / Math.max(1, unit.blocks.length)) * 100}%`, backgroundColor: p.honey }} />
        </View>
        <Text style={{ marginTop: 6, fontSize: 12, fontWeight: '700', color: p.ink }}>
          {left === 1 ? 'One more node and the chest opens.' : `${left} more nodes to the unit chest.`}
        </Text>
      </View>
      <Mascot character="bingo" mood="happy" size={58} />
    </View>
  );
}

/** WF-T3-01 footer: consistency as a monthly weekday ratio, never a fragile streak. */
function ClimberFooter({ activity }: { activity: Date[] }) {
  const p = useNatural();
  const now = new Date();
  const c = monthConsistency(activity, now);
  const month = now.toLocaleDateString(undefined, { month: 'long' });
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString(undefined, { month: 'long' });
  return (
    <Text style={{ marginTop: 10, fontSize: 12.5, lineHeight: 18, color: p.muted }}>
      <Text style={{ fontWeight: '700', color: p.ink }}>{c.active} of {c.soFar}</Text> weekdays this month. {consistencyLine(c, month, last)}
    </Text>
  );
}

/** WF-T2-01 "This week": lessons and XP events per day, Monday first. */
function WeekChart({ activity, accent }: { activity: Date[]; accent: string }) {
  const p = useNatural();
  const bars = weekBars(activity);
  const max = Math.max(1, ...bars.map((b) => b.count));
  const total = bars.reduce((n, b) => n + b.count, 0);
  const days = bars.filter((b) => b.count > 0).length;
  return (
    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, color: p.muted }}>This week</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: p.ink }}>
          {total} {total === 1 ? 'session' : 'sessions'} <Text style={{ fontSize: 11, color: p.muted }}>· {days} of 7 days</Text>
        </Text>
      </View>
      <View
        accessibilityLabel={`Sessions this week: ${bars.map((b) => b.count).join(', ')}`}
        style={{ marginTop: 8, height: 48, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}
      >
        {bars.map((b, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View
              style={{
                width: '100%',
                height: Math.max(3, (b.count / max) * 36),
                borderRadius: 4,
                backgroundColor: b.count > 0 ? accent : p.line,
                opacity: b.future ? 0.4 : 1,
                borderWidth: b.today ? 1.5 : 0,
                borderColor: p.ink,
              }}
            />
            <Text style={{ marginTop: 2, fontSize: 9.5, color: b.today ? p.ink : p.muted }}>{b.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
