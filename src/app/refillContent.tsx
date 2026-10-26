import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getProfile, grantHearts, refillWaitRemaining, MAX_HEARTS, type Profile } from '../../lib/progress';
import { isTestAd } from '../../lib/ads';

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
  const waitMs = profile ? refillWaitRemaining(profile) : 0;
  const waitH = Math.floor(waitMs / 3600000);
  const waitM = Math.floor((waitMs % 3600000) / 60000);
  const waitS = Math.floor((waitMs % 60000) / 1000);

  return (
    <ScrollView contentContainerClassName="flex-grow items-center bg-white px-6 py-12">
      <Text className="text-5xl">💔</Text>
      <Text className="mt-2 text-2xl font-extrabold text-slate-900">Out of hearts!</Text>
      <Text className="mt-1 text-center text-base text-slate-500">
        Mistakes cost hearts. Refill to keep your streak alive.
      </Text>

      <Text className="mt-4 text-xl font-extrabold text-slate-800">
        ❤ {hearts}/{MAX_HEARTS}
      </Text>

      {/* Option 1: rewarded ad → +1 heart on EARNED_REWARD */}
      <View className="mt-6 w-full max-w-sm rounded-3xl border-2 border-slate-200 bg-slate-50 p-5">
        <Text className="text-lg font-bold text-slate-800">📺 Watch an ad → +1 heart</Text>
        <Text className="mt-1 text-xs text-slate-400">
          {!available
            ? 'Needs a native dev build (unavailable in Expo Go / web).'
            : isTestAd
              ? 'Test ad mode — swap in your AdMob unit id before release.'
              : 'Sponsored'}
        </Text>
        <Pressable
          onPress={watchAd}
          disabled={showing || (available && !loaded)}
          className={`mt-3 items-center rounded-2xl py-3 ${showing || (available && !loaded) ? 'bg-slate-300' : 'bg-blue-500'}`}
        >
          <Text className="font-extrabold text-white">
            {!available ? 'Ads need dev build' : showing ? 'Ad playing…' : loaded ? 'Watch ad' : 'Loading ad…'}
          </Text>
        </Pressable>
      </View>

      {/* Option 2: wait */}
      <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-slate-200 bg-slate-50 p-5">
        <Text className="text-lg font-bold text-slate-800">⏳ Wait for free refill</Text>
        <Text className="mt-2 text-base text-slate-600">
          {waitMs > 0
            ? `Full hearts in ${waitH}h ${waitM}m ${waitS}s`
            : 'Your wait is over — hearts refill on your next lesson.'}
        </Text>
      </View>

      {/* Option 3: premium */}
      <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-amber-300 bg-amber-50 p-5">
        <Text className="text-lg font-bold text-slate-800">👑 Go Premium</Text>
        <Text className="mt-1 text-base text-slate-600">Unlimited hearts, offline audiobooks, no ads.</Text>
        <Pressable onPress={() => router.push('/paywall')} className="mt-3 items-center rounded-2xl bg-amber-500 py-3">
          <Text className="font-extrabold text-white">Upgrade</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.back()} className="mt-6 items-center rounded-2xl bg-green-500 px-8 py-4">
        <Text className="text-lg font-extrabold text-white">{hearts > 0 ? 'Back to lesson ❤' : 'Back'}</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
