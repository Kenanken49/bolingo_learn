import { useCallback, useEffect, useState } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';
import Text from './ui/Text';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getProfile, grantHearts, nextHeartIn, refillWaitRemaining, MAX_HEARTS, type Profile } from '../lib/progress';
import AppIcon from './AppIcon';
import { isTestAd } from '../lib/ads';

export interface RewardHook {
  loaded: boolean;
  showing: boolean;
  available: boolean;
  show: () => Promise<boolean>;
}

export function useRefillState(useRewardedHeart: (onEarn: () => void) => RewardHook) {
  const [profile, setProfile] = useState<Profile | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProfile(await getProfile());
    } catch (e) {
      console.warn('Refill refresh failed:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    const t = setInterval(() => refresh(), 1000);
    return () => clearInterval(t);
  }, [refresh]);

  const grantOne = useCallback(() => {
    const id = profile?.id;
    if (id) {
      grantHearts(id, 1)
        .then(setProfile)
        .catch(() => Alert.alert('Hearts', 'Could not save the heart — try again.'));
    } else {
      setProfile((p) => (p ? { ...p, hearts: Math.min(MAX_HEARTS, p.hearts + 1) } : p));
    }
  }, [profile?.id]);

  return { profile, reward: useRewardedHeart(grantOne) };
}

export function RefillView({
  profile,
  reward,
}: {
  profile: Profile | null;
  reward: RewardHook;
}) {
  const { loaded, showing, available, show } = reward;

  const watchAd = async () => {
    const ok = await show();
    if (!ok) {
      Alert.alert(
        'Ad unavailable',
        available
          ? 'No ad loaded yet — check your connection and try again in a moment.'
          : 'Rewarded ads need a native dev build (they do not run in Expo Go or on web).'
      );
    }
  };

  const hearts = profile?.hearts ?? 0;
  const isPremium = profile?.is_premium ?? false;
  // getProfile() auto-applies timed regen on each refresh tick, so these
  // countdowns hit zero right as the +1 heart lands.
  const nextMs = profile ? nextHeartIn(profile) : 0;
  const waitMs = profile ? refillWaitRemaining(profile) : 0;
  const fmt = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <ScrollView contentContainerClassName="flex-grow items-center px-6 py-12">
      {isPremium ? (
        <View className="mt-2 w-full max-w-sm items-center rounded-3xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
          <View className="flex-row items-center justify-center gap-1.5">
            <AppIcon name="crown" size={22} color="#B45309" />
            <Text className="text-lg font-extrabold text-amber-700 dark:text-amber-300">Premium active — unlimited hearts</Text>
          </View>
          <Text className="mt-1 text-center text-sm text-amber-800/80">Wrong answers never stop you. Keep the streak alive.</Text>
        </View>
      ) : (
        <>
          <View className="h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
            <AppIcon name="heart" size={30} color="#EF4444" />
          </View>
          <Text className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">Out of hearts!</Text>
          <Text className="mt-1 text-center text-base text-slate-500 dark:text-slate-400">
            Mistakes cost hearts. Refill to keep your streak alive.
          </Text>
        </>
      )}

      <View className="mt-4 flex-row items-center gap-1.5">
        <AppIcon name="heart" size={22} color="#EF4444" />
        <Text className="text-xl font-extrabold text-slate-800 dark:text-slate-200">
          {hearts}/{MAX_HEARTS}
        </Text>
      </View>

      {/* Option 1: rewarded ad → +1 heart on EARNED_REWARD */}
      <View className="mt-6 w-full max-w-sm rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
        <View className="flex-row items-center gap-1.5">
          <AppIcon name="play" size={20} color="#0F172A" />
          <Text className="text-lg font-bold text-slate-800 dark:text-slate-200">Watch an ad · +1 heart</Text>
        </View>
        <Text className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {!available
            ? 'Needs a native dev build (unavailable in Expo Go / web).'
            : isTestAd
              ? 'Test ad mode — swap in your AdMob unit id before release.'
              : 'Sponsored'}
        </Text>
        <Pressable
          onPress={watchAd}
          disabled={showing || (available && !loaded)}
          className={`mt-3 items-center rounded-2xl py-3 ${showing || (available && !loaded) ? 'bg-slate-300 dark:bg-slate-700' : 'bg-blue-500'}`}
        >
          <Text className="font-extrabold text-white">
            {!available ? 'Ads need dev build' : showing ? 'Ad playing…' : loaded ? 'Watch ad' : 'Loading ad…'}
          </Text>
        </Pressable>
      </View>

      {/* Option 2: wait */}
      <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
        <View className="flex-row items-center gap-1.5">
          <AppIcon name="time" size={20} color="#0F172A" />
          <Text className="text-lg font-bold text-slate-800 dark:text-slate-200">Wait for free refill</Text>
        </View>
        <Text className="mt-2 text-base text-slate-600 dark:text-slate-400">
          {isPremium
            ? 'Premium: your hearts never run out.'
            : nextMs > 0
              ? `Next heart in ${fmt(nextMs)} (1 heart every 4h${waitMs > nextMs ? ` — full in ${fmt(waitMs)}` : ''}).`
              : hearts >= MAX_HEARTS
                ? 'Hearts are full — back to the Path!'
                : 'Your wait is over — a heart landed on the last refresh.'}
        </Text>
      </View>

      {/* Option 3: premium */}
      <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-5">
        <View className="flex-row items-center gap-1.5">
          <AppIcon name="crown" size={20} color="#0F172A" />
          <Text className="text-lg font-bold text-slate-800 dark:text-slate-200">Go Premium</Text>
        </View>
        <Text className="mt-1 text-base text-slate-600 dark:text-slate-400">Unlimited hearts, offline audiobooks, no ads.</Text>
        <Pressable onPress={() => router.push('/paywall')} className="mt-3 items-center rounded-2xl bg-amber-500 py-3">
          <Text className="font-extrabold text-white">Upgrade</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.replace('/')} className="mt-6 items-center rounded-2xl bg-green-500 px-8 py-4">
        <Text className="text-lg font-extrabold text-white">{hearts > 0 ? 'Back to lesson' : 'Back'}</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
