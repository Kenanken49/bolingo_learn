import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Text from './ui/Text';
import TextInput from './ui/TextInput';
import AppIcon, { type AppIconName } from './AppIcon';
import { useNatural } from '../lib/natural';
import { LIFE_STAGE_ORDER, LIFE_STAGES, stageForAgeInput, type LifeStageId } from '../lib/lifeStage';
import { useLifeStage } from '../lib/lifeStageStore';
import { usePendingSyncCount } from '../lib/sync/syncStore';

/**
 * Home-screen entry point of the adaptive UI engine.
 *
 * - No stage yet: a picker (type an age, or tap a stage).
 * - Stage chosen: that stage's hub. Explorers get big, colourful tiles;
 *   Launchers a balanced two-column grid; Climbers a compact list that puts
 *   commute (audio) mode first. Unbuilt ideas show as "Soon" and can't be
 *   opened.
 */
export default function LifeStageHub() {
  const p = useNatural();
  const { stage, ready, setStage } = useLifeStage();
  const pending = usePendingSyncCount();
  if (!ready) return null;
  if (!stage) return <StagePicker onPick={setStage} />;

  const s = LIFE_STAGES[stage];
  const compact = s.ux.density === 'compact';
  const roomy = s.ux.density === 'roomy';

  return (
    <View
      style={{
        width: '100%',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: p.line,
        backgroundColor: p.surface,
        padding: compact ? 12 : 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 8, height: 34, borderRadius: 4, backgroundColor: s.ux.accent, marginRight: 10 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: s.ux.accent }}>
            Tier {s.tier} · ages {s.ages[0]}–{s.ages[1]}
          </Text>
          <Text style={{ fontSize: compact ? 15 : 17, fontWeight: '800', color: p.ink }}>{s.name}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Change life stage"
          hitSlop={8}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: p.moss }}>Change</Text>
        </Pressable>
      </View>
      {!compact ? (
        <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 17, fontWeight: '600', color: p.muted }}>{s.tagline}</Text>
      ) : null}

      <View
        style={{
          marginTop: 10,
          flexDirection: compact ? 'column' : 'row',
          flexWrap: compact ? 'nowrap' : 'wrap',
          gap: compact ? 6 : 8,
        }}
      >
        {s.hub.map((item) => {
          const live = item.status === 'live' && !!item.href;
          return (
            <Pressable
              key={item.id}
              disabled={!live}
              onPress={() => live && router.push(item.href as Href)}
              accessibilityRole="button"
              accessibilityState={{ disabled: !live }}
              accessibilityLabel={`${item.title}${live ? '' : ', coming soon'}: ${item.blurb}`}
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: compact ? undefined : roomy ? '47%' : '47%',
                minWidth: compact ? undefined : 140,
                flexDirection: compact ? 'row' : 'column',
                alignItems: compact ? 'center' : 'flex-start',
                gap: compact ? 10 : 6,
                borderRadius: roomy ? 20 : 14,
                borderWidth: 1,
                borderColor: live ? p.line : p.sand,
                backgroundColor: live ? (roomy ? p.surfaceAlt : p.surface) : p.bg,
                padding: compact ? 9 : roomy ? 14 : 11,
                opacity: !live ? 0.6 : pressed ? 0.9 : 1,
              })}
            >
              <View
                style={{
                  width: roomy ? 38 : 28,
                  height: roomy ? 38 : 28,
                  borderRadius: roomy ? 13 : 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: live ? s.ux.accent : p.stone,
                }}
              >
                <AppIcon name={item.icon as AppIconName} size={roomy ? 20 : 15} color="#FFFFFF" />
              </View>
              <View style={{ flex: compact ? 1 : undefined, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: roomy ? 14 : 13, fontWeight: '800', color: p.ink }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!live ? (
                    <Text style={{ fontSize: 8.5, fontWeight: '800', letterSpacing: 0.6, color: p.honey, textTransform: 'uppercase' }}>
                      Soon
                    </Text>
                  ) : null}
                </View>
                <Text style={{ marginTop: 1, fontSize: 10.5, fontWeight: '600', color: p.muted }} numberOfLines={compact ? 1 : 2}>
                  {item.blurb}
                </Text>
              </View>
              {compact && live ? <AppIcon name="chevRight" size={14} color={p.stone} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push('/offline-ai')}
        accessibilityRole="button"
        accessibilityLabel="Open Offline AI"
        style={({ pressed }) => ({
          marginTop: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: 12,
          backgroundColor: p.surfaceAlt,
          paddingHorizontal: 10,
          paddingVertical: 8,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <AppIcon name="download" size={15} color={p.moss} />
        <Text style={{ flex: 1, fontSize: 11.5, fontWeight: '700', color: p.ink }}>
          Offline AI{pending > 0 ? ` · ${pending} result${pending === 1 ? '' : 's'} waiting to sync` : ' · study without a connection'}
        </Text>
        <AppIcon name="chevRight" size={14} color={p.stone} />
      </Pressable>
    </View>
  );
}

export function StagePicker({ onPick, compact = false }: { onPick: (stage: LifeStageId) => void; compact?: boolean }) {
  const p = useNatural();
  const [age, setAge] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submitAge = () => {
    const stage = stageForAgeInput(age);
    if (!stage) {
      setError('Enter your age as a number, for example 16.');
      return;
    }
    setError(null);
    onPick(stage);
  };

  return (
    <View
      style={{
        width: '100%',
        borderRadius: 24,
        borderWidth: compact ? 0 : 1,
        borderColor: p.line,
        backgroundColor: compact ? 'transparent' : p.surface,
        padding: compact ? 0 : 14,
      }}
    >
      {!compact ? (
        <>
          <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: p.moss }}>
            Make Bolingo yours
          </Text>
          <Text style={{ marginTop: 2, fontSize: 17, fontWeight: '800', color: p.ink }}>How old are you?</Text>
          <Text style={{ marginTop: 3, fontSize: 12, lineHeight: 17, fontWeight: '600', color: p.muted }}>
            Bolingo adapts its look, pace and suggestions to your stage of life. It stays on this device.
          </Text>
          <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={age}
              onChangeText={(t) => setAge(t.replace(/[^0-9]/g, '').slice(0, 3))}
              onSubmitEditing={submitAge}
              keyboardType="number-pad"
              returnKeyType="done"
              placeholder="Your age"
              accessibilityLabel="Your age"
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: p.line,
                backgroundColor: p.bg,
                paddingHorizontal: 14,
                fontSize: 15,
                color: p.ink,
              }}
            />
            <Pressable
              onPress={submitAge}
              accessibilityRole="button"
              accessibilityLabel="Set my stage from my age"
              style={({ pressed }) => ({
                justifyContent: 'center',
                borderRadius: 14,
                backgroundColor: p.moss,
                paddingHorizontal: 16,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Continue</Text>
            </Pressable>
          </View>
          {error ? <Text style={{ marginTop: 6, fontSize: 11.5, fontWeight: '700', color: p.berry }}>{error}</Text> : null}
          <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 10.5, fontWeight: '700', color: p.stone }}>Or pick a stage</Text>
        </>
      ) : null}
      <View style={{ gap: 8 }}>
        {LIFE_STAGE_ORDER.map((id) => {
          const s = LIFE_STAGES[id];
          return (
            <Pressable
              key={id}
              onPress={() => onPick(id)}
              accessibilityRole="button"
              accessibilityLabel={`${s.name}, ages ${s.ages[0]} to ${s.ages[1]}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: p.line,
                backgroundColor: p.surface,
                padding: 10,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: s.ux.accent }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: p.ink }}>
                  {s.name} <Text style={{ fontSize: 11, fontWeight: '700', color: p.muted }}>· {s.ages[0]}–{s.ages[1]}</Text>
                </Text>
                <Text style={{ marginTop: 1, fontSize: 11, fontWeight: '600', color: p.muted }} numberOfLines={2}>
                  {s.focus.join(' · ')}
                </Text>
              </View>
              <AppIcon name="chevRight" size={14} color={p.stone} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
