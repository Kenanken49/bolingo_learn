import { useCallback, useEffect, useRef } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Text from './ui/Text';
import AppIcon from './AppIcon';
import DuoButton from './DuoButton';
import { useRewardedHeart } from '../lib/rewarded';
import { track } from '../lib/telemetry';

/**
 * The moment the heart loop earns its keep: a learner just spent their fifth
 * heart, the lesson is paused, and the only way forward inside this session is
 * a rewarded video, a wait, or Premium.
 *
 * The sheet is deliberately a dead end for everything except those three: the
 * lesson cannot continue at zero hearts, so there is no dismiss-and-keep-going
 * path that would make the ad pointless.
 *
 * The reward itself is granted by the caller (`onEarned`) so hearts keep being
 * persisted in exactly one place — `lib/progress.ts`.
 */
export default function OutOfHeartsSheet({
  visible,
  hearts,
  isPremium,
  onEarned,
  onClose,
  onOpenAllOptions,
  onOpenPremium,
}: {
  visible: boolean;
  hearts: number;
  isPremium: boolean;
  /** Add the rewarded heart (persist + update state). */
  onEarned: () => void;
  /** Leave the sheet — the learner stays out of hearts and can end the session. */
  onClose: () => void;
  /** The full refill screen (wait timer, Premium, emergency refill). */
  onOpenAllOptions: () => void;
  onOpenPremium: () => void;
}) {
  const earnedRef = useRef(onEarned);
  useEffect(() => {
    earnedRef.current = onEarned;
  }, [onEarned]);

  // Stable earn handler: the hook owns the ad instance, so its callback must
  // not be recreated (and must not read `reward` before it exists).
  const rewardRef = useRef<ReturnType<typeof useRewardedHeart> | null>(null);
  const handleEarned = useCallback(() => {
    track('ad_rewarded_completed', { placement: 'hearts_depleted', testAd: rewardRef.current?.testAd ?? false });
    earnedRef.current();
  }, []);

  const reward = useRewardedHeart(handleEarned);
  useEffect(() => {
    rewardRef.current = reward;
  }, [reward]);

  // An impression is only worth logging once the video is actually on screen.
  const lastStatus = useRef(reward.status);
  useEffect(() => {
    if (lastStatus.current !== reward.status) {
      if (reward.status === 'showing') track('ad_impression', { placement: 'hearts_depleted', testAd: reward.testAd });
      if (reward.status === 'error' || reward.status === 'no-fill') {
        track('ad_failed', { placement: 'hearts_depleted', reason: reward.status });
      }
      lastStatus.current = reward.status;
    }
  }, [reward.status, reward.testAd]);

  const watch = async () => {
    track('ad_tapped', { placement: 'hearts_depleted', loaded: reward.loaded, testAd: reward.testAd });
    await reward.show();
  };

  const unavailable = !reward.available;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-3xl bg-white px-6 pb-8 pt-5 dark:bg-slate-900">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                <AppIcon name="heart" size={20} color="#EF4444" />
              </View>
              <Text className="font-duo text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {isPremium ? 'Unlimited hearts' : 'Out of hearts'}
              </Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" className="p-2">
              <AppIcon name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <Text className="text-base text-slate-600 dark:text-slate-400">
            {isPremium
              ? 'Premium means this never happens again — keep going as long as you like.'
              : `You have ${hearts} of 5 hearts. Every wrong answer costs one, and the lesson waits until you have another.`}
          </Text>

          {/* Primary: rewarded video. Hidden in every state that cannot play one. */}
          <View className="mt-5">
            {unavailable ? (
              <Text className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Rewarded videos need the mobile app. Use the free refill timer or Premium to keep learning here.
              </Text>
            ) : (
              <>
                <DuoButton
                  color="green"
                  label="Watch a short video · +1 heart"
                  onPress={watch}
                  disabled={!reward.loaded || reward.showing}
                  title="Watch ad for a heart"
                />
                <Text className="mt-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {reward.showing
                    ? 'Playing…'
                    : reward.loaded
                      ? reward.testAd
                        ? 'Test ad — Google sample unit, no revenue'
                        : 'Sponsored · about 30 seconds'
                      : reward.status === 'error' || reward.status === 'no-fill'
                        ? 'No ad available right now — the free refill still works'
                        : 'Loading video…'}
                </Text>
              </>
            )}
          </View>

          {/* Secondary: the two honest non-ad paths. */}
          <Pressable
            onPress={onOpenAllOptions}
            accessibilityRole="button"
            className="mt-5 rounded-2xl border-2 border-slate-200 py-3 dark:border-slate-700"
          >
            <Text className="text-center font-extrabold text-slate-700 dark:text-slate-200">
              Wait for a free heart · 4 hours
            </Text>
          </Pressable>

          <Pressable onPress={onOpenPremium} accessibilityRole="button" className="mt-3 flex-row items-center justify-center gap-1.5 py-2">
            <AppIcon name="crown" size={18} color="#D97706" />
            <Text className="font-extrabold text-amber-600 dark:text-amber-400">Go Premium · unlimited hearts</Text>
          </Pressable>

          <Pressable onPress={onClose} accessibilityRole="button" className="mt-1 items-center py-2">
            <Text className="text-sm font-semibold text-slate-400">End the session — your progress is saved</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
