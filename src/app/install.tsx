import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Text from '../../components/ui/Text';
import AppIcon from '../../components/AppIcon';
import BrandMark from '../../components/BrandMark';
import { PUBLIC_SITE } from '../../lib/api';

/**
 * Direct install from the web: bolingo.co.ke/install.
 *
 * The app is not on the Play Store or the App Store yet, so this page is the
 * only sanctioned download point. It reads the build metadata that
 * `scripts/publish-android-apk.cjs` writes when a release APK is published and
 * links to the stable same-origin `/download/android` route, which redirects to
 * the binary. Nothing here is hard-coded: if no build is published the page
 * says so instead of offering a dead link.
 */

type AndroidBuild = {
  version: string;
  packageName: string;
  sizeBytes: number;
  sha256: string;
  url: string;
  publishedAt: string;
  minAndroid?: string;
};

const MONO = Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, monospace', default: 'monospace' });

/** Relative on web (same origin), absolute for a native build that opens this page. */
function buildUrl(path: string): string {
  return Platform.OS === 'web' ? path : `${PUBLIC_SITE}${path}`;
}

function megabytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function publishedOn(iso: string): string {
  const day = new Date(iso);
  if (Number.isNaN(day.getTime())) return '';
  return day.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">{title}</Text>
      {children}
    </View>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View className="mt-3 flex-row gap-3">
      <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Text className="text-xs font-extrabold text-slate-600 dark:text-slate-300">{n}</Text>
      </View>
      <Text className="flex-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{children}</Text>
    </View>
  );
}

export default function Install() {
  const [build, setBuild] = useState<AndroidBuild | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(buildUrl('/downloads/latest.json'), { cache: 'no-cache' });
        if (res.ok) {
          const data = (await res.json()) as AndroidBuild;
          // A build without a checksum is not a build we will offer.
          if (alive && data && typeof data.sha256 === 'string' && data.sha256.length === 64) setBuild(data);
        }
      } catch {
        // Offline or not published yet — the page states that plainly below.
      } finally {
        if (alive) setChecked(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const download = () => {
    Linking.openURL(buildUrl('/download/android')).catch(() => {});
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerClassName="mx-auto w-full max-w-xl self-center px-5 py-10"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <StatusBar style="auto" />
      <View className="items-center">
        <BrandMark />
        <Text className="mt-2 text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Install Bolingo Learn
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-slate-500 dark:text-slate-400">
          Bolingo is not in the Play Store or the App Store yet. This page is the official download —
          if a file came from anywhere else, do not install it.
        </Text>
      </View>

      <Card title="Android">
        {build ? (
          <>
            <Text className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Version {build.version} · {megabytes(build.sizeBytes)}
              {publishedOn(build.publishedAt) ? ` · ${publishedOn(build.publishedAt)}` : ''}
            </Text>
            <Pressable
              onPress={download}
              accessibilityRole="link"
              accessibilityLabel={`Download Bolingo Learn ${build.version} for Android`}
              className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5"
            >
              <AppIcon name="download" size={18} color="#FFFFFF" />
              <Text className="text-base font-extrabold text-white">Download the APK</Text>
            </Pressable>
            <View className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
              <Text className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                SHA-256 of this build
              </Text>
              <Text
                className="mt-1 text-[11px] leading-4 text-slate-600 dark:text-slate-300"
                style={{ fontFamily: MONO }}
                selectable
              >
                {build.sha256}
              </Text>
            </View>
          </>
        ) : (
          <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {checked
              ? 'No signed Android build is published yet. Nothing is offered for download until a release APK is built and its checksum is listed here — check back soon.'
              : 'Checking for the latest build…'}
          </Text>
        )}

        {build ? (
          <>
            <Step n={1}>Tap the download button above. The file lands in your Downloads folder.</Step>
            <Step n={2}>
              Open it. Android asks once to allow installs from your browser — allow it, then tap Install.
            </Step>
            <Step n={3}>
              Play Protect may warn that the app is unknown. That is expected for any app not distributed by the
              Play Store. Tap “Install anyway” <Text className="font-extrabold">only if</Text> the SHA-256 above
              matches the file you downloaded.
            </Step>
            <Step n={4}>
              Open Bolingo Learn and sign in. New versions are posted on this page; installing over the old one
              keeps your progress.
            </Step>
          </>
        ) : (
          <Text className="mt-3 text-sm leading-5 text-slate-600 dark:text-slate-300">
            When a build is published, this page shows its version, size and SHA-256 and the two-minute install
            steps. Installing over an older copy keeps your progress.
          </Text>
        )}
      </Card>

      <Card title="iPhone & iPad">
        <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
          Apple does not allow installing apps from a website, so there is no iPhone download on this page. Add
          Bolingo to your Home Screen instead — it opens full screen with its own icon and updates itself.
        </Text>
        <Step n={1}>Open bolingo.co.ke in Safari (not another browser).</Step>
        <Step n={2}>Tap the Share button, then “Add to Home Screen”.</Step>
        <Step n={3}>Tap Add. Bolingo opens from your Home Screen like any other app.</Step>
      </Card>

      <Card title="How we keep this download safe">
        <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
          {[
            'One source: bolingo.co.ke/install. We never send installers over WhatsApp, Telegram or email, and we never publish “modded” or cracked copies.',
            'A signed release: every APK is signed with our release key. An altered file is rejected by Android when it tries to update an existing install.',
            'A published checksum: the SHA-256 above is generated from the exact file we uploaded. If your download does not match it, delete the file and tell us.',
            'HTTPS only: the page, the metadata and the download all require a valid certificate for bolingo.co.ke.',
          ]
            .map((line) => `• ${line}`)
            .join('\n\n')}
        </Text>
      </Card>

      <View className="mt-6 flex-row items-center justify-center gap-4">
        <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
          <Text className="text-sm font-bold text-sky-700 dark:text-sky-400">Privacy policy</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(buildUrl('/')).catch(() => {})} accessibilityRole="link">
          <Text className="text-sm font-bold text-sky-700 dark:text-sky-400">Open Bolingo on the web</Text>
        </Pressable>
      </View>
      <Text className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
        Something looks wrong? support@bolingo.co.ke
      </Text>
    </ScrollView>
  );
}
