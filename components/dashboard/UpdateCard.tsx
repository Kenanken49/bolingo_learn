import { View, Pressable } from 'react-native';
import Text from '../ui/Text';
import AppIcon from '../AppIcon';
import { releaseSizeLabel, type LatestRelease } from '../../lib/releaseManifest';

/**
 * The in-app offer for a newer Android build published on bolingo.co.ke.
 *
 * A sideloaded install cannot update itself — Android only lets an app write to
 * its own files, so the honest action is "open the download in the browser and
 * install the file". The card only ever renders for a release the app judged
 * genuinely newer (lib/releaseManifest.ts), and "Not now" lasts the session, so
 * the next launch raises it again rather than going quiet forever.
 */
export default function UpdateCard({
  release,
  installed,
  onDismiss,
  onDownload,
}: {
  release: LatestRelease;
  installed: string;
  onDismiss: () => void;
  onDownload: () => void;
}) {
  const size = releaseSizeLabel(release);
  const body = `Version ${release.version} is on bolingo.co.ke. You are on v${installed}. ${
    size ? `The download is about ${size}. ` : ''
  }Open it to install this update over your app — your lessons and progress stay.`;

  return (
    <View
      className="mb-3 rounded-2xl border border-dash-line bg-dash-card p-4 dark:border-dash-dline dark:bg-dash-dcard"
      accessibilityRole="summary"
      accessibilityLabel={`Update available. ${body}`}
    >
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-cyan-50 dark:bg-cyan-950">
          <AppIcon name="rocket" size={16} color="#0891B2" />
        </View>
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-dash-faint">
          New build available
        </Text>
      </View>
      <Text className="mt-2 text-[15px] font-extrabold text-dash-ink dark:text-dash-dink">
        Bolingo {release.version} is ready
      </Text>
      <Text className="mt-1 text-[12.5px] leading-[18px] text-dash-muted dark:text-dash-dmuted">{body}</Text>
      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          onPress={onDownload}
          accessibilityRole="button"
          accessibilityLabel={`Download Bolingo ${release.version}`}
          className="flex-1 items-center rounded-xl bg-cyan-600 py-3 dark:bg-cyan-500"
        >
          <Text className="text-[13.5px] font-extrabold text-white dark:text-slate-950">Update now</Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Not now — ask again next time you open the app"
          hitSlop={8}
          className="items-center rounded-xl border border-dash-line px-4 py-3 dark:border-dash-dline"
        >
          <Text className="text-[13.5px] font-bold text-dash-muted dark:text-dash-dmuted">Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}
