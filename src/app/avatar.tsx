import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Text from '../../components/ui/Text';
import AppIcon from '../../components/AppIcon';
import Avatar3D from '../../components/Avatar3D';
import { AVATAR_ITEMS, DEFAULT_LOOK, isUnlocked, requirementLabel, resolveLook, type AvatarLook, type LearnerStats, type Slot } from '../../lib/avatar';
import { CERTIFICATIONS, isTrackCertified } from '../../lib/certifications';
import { getCompletedLessonIds, getProfile } from '../../lib/progress';
import { levelForXp } from '../../lib/levels';

/**
 * Avatar studio: dress a 3D-tilt avatar with items earned by learning.
 * Unlocks come from the learner's real level, streak and certifications;
 * nothing can be bought. The look is saved on this device.
 */
const K_LOOK = 'bolingo.avatar.look.v1';
const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'skin', label: 'Skin tone' },
  { slot: 'outfit', label: 'Outfit' },
  { slot: 'hat', label: 'Headwear' },
  { slot: 'eyes', label: 'Eyes' },
  { slot: 'backdrop', label: 'Backdrop' },
];

export default function AvatarStudio() {
  const [stats, setStats] = useState<LearnerStats>({ level: 1, streak: 0, certs: 0 });
  const [look, setLook] = useState<AvatarLook>(DEFAULT_LOOK);
  const [slot, setSlot] = useState<Slot>('outfit');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        let s: LearnerStats = { level: 1, streak: 0, certs: 0 };
        try {
          const p = await getProfile();
          if (p) {
            const done = await getCompletedLessonIds(p.id).catch(() => new Set<string>());
            s = {
              level: levelForXp(p.xp ?? 0),
              streak: p.streak_count ?? 0,
              certs: CERTIFICATIONS.filter((t) => isTrackCertified(t, done)).length,
            };
          }
        } catch {}
        const raw = await AsyncStorage.getItem(K_LOOK).catch(() => null);
        let saved: Record<string, unknown> | null = null;
        try {
          saved = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
        } catch {}
        if (!alive) return;
        setStats(s);
        setLook(resolveLook(saved, s));
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const choose = (id: string) => {
    const next = { ...look, [slot]: id };
    setLook(next);
    void AsyncStorage.setItem(K_LOOK, JSON.stringify(next)).catch(() => {});
  };

  const items = AVATAR_ITEMS.filter((i) => i.slot === slot);
  const unlockedCount = AVATAR_ITEMS.filter((i) => isUnlocked(i, stats)).length;

  return (
    <ScrollView className="flex-1 bg-[#170C33]" contentContainerClassName="mx-auto w-full max-w-xl items-center self-center px-4 pb-24 pt-8" contentContainerStyle={{ flexGrow: 1 }}>
      <StatusBar style="light" />
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" className="self-start">
        <View className="flex-row items-center gap-0.5">
          <AppIcon name="chevBack" size={16} color="#FFC94D" />
          <Text className="font-bold text-[#FFC94D]">Back</Text>
        </View>
      </Pressable>
      <Text className="mt-2 self-start text-xs font-extrabold uppercase tracking-widest text-[#FFC94D]">Avatar studio</Text>
      <Text className="self-start font-duo text-3xl font-extrabold text-white">Wear what you&apos;ve earned</Text>
      <Text className="mb-4 self-start text-sm text-white/70">
        Level {stats.level} · {stats.streak}-day streak · {stats.certs} certification{stats.certs === 1 ? '' : 's'} · {unlockedCount}/{AVATAR_ITEMS.length} items unlocked
      </Text>

      <Avatar3D look={look} size={250} />
      <Text className="mt-2 text-xs text-white/60">Drag the avatar sideways to turn it</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 w-full grow-0" style={{ flexGrow: 0 }} contentContainerClassName="items-center gap-2">
        {SLOTS.map((s) => (
          <Pressable
            key={s.slot}
            onPress={() => setSlot(s.slot)}
            accessibilityRole="tab"
            accessibilityState={{ selected: slot === s.slot }}
            className={`self-start rounded-full px-4 py-2 ${slot === s.slot ? 'bg-[#FFC94D]' : 'bg-white/10'}`}
          >
            <Text className={`text-sm font-extrabold ${slot === s.slot ? 'text-[#3A2300]' : 'text-white'}`}>{s.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View className="mt-3 w-full flex-row flex-wrap gap-2.5">
        {items.map((it) => {
          const open = isUnlocked(it, stats);
          const on = look[slot] === it.id;
          return (
            <Pressable
              key={it.id}
              onPress={() => open && choose(it.id)}
              disabled={!open}
              accessibilityRole="button"
              accessibilityState={{ disabled: !open, selected: on }}
              accessibilityLabel={`${it.label}${open ? '' : `, locked: ${requirementLabel(it.requires)}`}`}
              className={`w-[31%] items-center rounded-2xl p-3 ${on ? 'border-2 border-[#FFC94D] bg-white/15' : 'bg-white/5'}`}
              style={{ opacity: open ? 1 : 0.5 }}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full border border-white/20"
                style={{ backgroundColor: it.color === 'transparent' ? 'transparent' : it.color }}
              >
                {!open ? <AppIcon name="lock" size={16} color="#FFFFFF" /> : null}
              </View>
              <Text className="mt-1.5 text-center text-xs font-extrabold text-white" numberOfLines={1}>
                {it.label}
              </Text>
              <Text className="text-center text-[10px] text-white/60" numberOfLines={1}>
                {open ? (on ? 'Wearing' : 'Unlocked') : requirementLabel(it.requires)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
