import { View, Pressable } from 'react-native';
import Text from './ui/Text';
import AppIcon from './AppIcon';

interface Props {
  playing: boolean;
  onToggle: () => void | Promise<void>;
  className?: string;
}

/** Stable hooks for the on-device playback test. */
export const PREMIUM_NARRATOR_SAMPLE_TEST_ID = 'premium-narrator-sample';

/**
 * Audition card for the bundled Premium narrator. The caller owns playback so
 * it can stop character speech, reward cues and audiobook previews first. The
 * recording ships with the app, so replaying it never calls TTS or spends
 * provider credits.
 */
export default function PremiumNarratorSample({ playing, onToggle, className = '' }: Props) {
  return (
    <View
      testID={PREMIUM_NARRATOR_SAMPLE_TEST_ID}
      className={`rounded-xl border-2 border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950 ${className}`}
    >
      <View className="flex-row items-center gap-1.5">
        <AppIcon name="headset" size={15} color="#B45309" />
        <Text className="flex-1 text-xs font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-200">
          Premium narrator sample
        </Text>
        <Pressable
          testID={`${PREMIUM_NARRATOR_SAMPLE_TEST_ID}-toggle`}
          onPress={() => void onToggle()}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause the premium narrator sample' : 'Play the premium narrator sample'}
          accessibilityHint="Bundled sample; it uses no TTS credits or network."
          className="flex-row items-center justify-center gap-1 rounded-full bg-amber-500 px-3 py-1.5"
        >
          <AppIcon name={playing ? 'pause' : 'play'} size={12} color="#FFFFFF" />
          <Text className="text-[11px] font-extrabold text-white">{playing ? 'Pause' : 'Play'}</Text>
        </Pressable>
      </View>
      <Text className="mt-1.5 text-[11px] leading-4 text-amber-900/80 dark:text-amber-100/80">
        The licensed audiobook voice Premium uses, bundled on this device. Play it as often as you like — it uses no
        TTS credits.
      </Text>
    </View>
  );
}
