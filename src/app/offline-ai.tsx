import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Text from '../../components/ui/Text';
import AppIcon from '../../components/AppIcon';
import BrandMark from '../../components/BrandMark';
import { currentPremium, offlineLeaseUntil } from '../../lib/edgeAI/edgeBoot';
import { edgeEngineStatus } from '../../lib/edgeAI/edgeEngine';
import { knowledgeStats } from '../../lib/edgeAI/knowledge';
import { llamaUnavailableReason } from '../../lib/edgeAI/llamaRuntime';
import {
  deleteModel,
  listModels,
  modelDownloadsSupported,
  setActiveModel,
  startModelDownload,
  useModelStoreVersion,
  type DownloadHandle,
  type ModelRow,
} from '../../lib/edgeAI/modelStore';
import { getPreferOffline, setPreferOffline } from '../../lib/edgeAI/tutor';
import { isOnline } from '../../lib/network';
import { courseUpdateState, type CourseUpdateState } from '../../lib/sync/courseUpdates';
import { flushSyncQueue, usePendingSyncCount, type SyncResult } from '../../lib/sync/syncStore';

/**
 * Offline AI & sync — the control room for the offline-first stack:
 *  - connection, on-device engine and lesson-pack status;
 *  - "Always use offline AI" (route every tutor question on the device);
 *  - Smart Sync: pending results, course updates, and "Sync now";
 *  - Premium: download, switch, update or delete on-device models.
 */
function timeAgo(ms: number): string {
  if (!ms) return 'never';
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="mt-4 w-full rounded-3xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {children}
    </View>
  );
}

function CardTitle({ icon, title }: { icon: 'download' | 'refresh' | 'phone' | 'book'; title: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <AppIcon name={icon} size={18} color="#0284C7" />
      <Text className="text-base font-extrabold text-slate-800 dark:text-slate-200">{title}</Text>
    </View>
  );
}

export default function OfflineAiScreen() {
  const version = useModelStoreVersion();
  const pending = usePendingSyncCount();
  const [online, setOnline] = useState<boolean | null>(null);
  const [premium, setPremium] = useState<boolean | null>(null);
  const [leaseUntil, setLeaseUntil] = useState<number | null>(null);
  const [preferOffline, setPreferOfflineState] = useState(false);
  const [passages, setPassages] = useState<number | null>(null);
  const [rows, setRows] = useState<ModelRow[]>([]);
  const [courses, setCourses] = useState<CourseUpdateState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [modelError, setModelError] = useState<string | null>(null);
  const downloads = useRef<Record<string, DownloadHandle>>({});
  const [engine, setEngine] = useState(edgeEngineStatus());
  const supported = modelDownloadsSupported();

  const refresh = useCallback(async () => {
    const [on, plan, pref, stats, models, courseState] = await Promise.all([
      isOnline(true),
      currentPremium(),
      getPreferOffline(),
      knowledgeStats().catch(() => null),
      listModels().catch(() => [] as ModelRow[]),
      courseUpdateState(),
    ]);
    setOnline(on);
    setPremium(plan);
    setLeaseUntil(plan ? offlineLeaseUntil() : null);
    setPreferOfflineState(pref);
    setPassages(stats?.passages ?? null);
    setRows(models);
    setCourses(courseState);
    setEngine(edgeEngineStatus());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  // Re-read the model list when a download finishes or a model is switched.
  useEffect(() => {
    if (version === 0) return;
    void listModels().then((m) => {
      setRows(m);
      setEngine(edgeEngineStatus());
    });
  }, [version]);

  // Stop in-flight downloads if the learner leaves the screen.
  useEffect(() => {
    const active = downloads.current;
    return () => {
      Object.values(active).forEach((d) => void d.cancel());
    };
  }, []);

  const togglePreferOffline = (on: boolean) => {
    setPreferOfflineState(on);
    void setPreferOffline(on);
  };

  const syncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncNote(null);
    try {
      const r: SyncResult = await flushSyncQueue(true);
      if (r.offline) {
        setSyncNote(`You're offline. ${r.pending} result${r.pending === 1 ? '' : 's'} will sync when you're back online.`);
      } else {
        const parts = [
          r.synced > 0 ? `Uploaded ${r.synced} lesson result${r.synced === 1 ? '' : 's'}.` : 'No lesson results were waiting.',
          r.courseLessons != null ? `Course updates refreshed (${r.courseLessons} lessons).` : 'Course updates are already current.',
        ];
        if (r.pending > 0) parts.push(`${r.pending} will retry shortly.`);
        setSyncNote(parts.join(' '));
      }
      setOnline(!r.offline);
      setCourses(await courseUpdateState());
    } catch (e) {
      setSyncNote(e instanceof Error ? e.message : 'Sync failed. Try again in a moment.');
    } finally {
      setSyncing(false);
    }
  };

  const download = (row: ModelRow) => {
    if (downloads.current[row.spec.id]) return;
    setModelError(null);
    const go = () => {
      const handle = startModelDownload(row.spec, premium === true, (f) =>
        setProgress((prev) => ({ ...prev, [row.spec.id]: f }))
      );
      downloads.current[row.spec.id] = handle;
      setProgress((prev) => ({ ...prev, [row.spec.id]: 0 }));
      handle.promise
        .catch((e) => setModelError(e instanceof Error ? e.message : 'Download failed.'))
        .finally(() => {
          delete downloads.current[row.spec.id];
          setProgress((prev) => {
            const next = { ...prev };
            delete next[row.spec.id];
            return next;
          });
          void listModels().then((m) => {
            setRows(m);
            setEngine(edgeEngineStatus());
          });
        });
    };
    const size = `${(row.spec.sizeMb / 1000).toFixed(1)} GB`;
    if (Platform.OS === 'web') {
      go();
      return;
    }
    Alert.alert(
      `Download ${row.spec.name}?`,
      `This is a ${size} download. Use Wi-Fi if you can, and keep the app open until it finishes.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Download', onPress: go },
      ]
    );
  };

  const cancel = (id: string) => {
    void downloads.current[id]?.cancel();
  };

  const remove = (row: ModelRow) => {
    const run = () => void deleteModel(row.spec.id, premium === true).then(refresh);
    if (Platform.OS === 'web') {
      run();
      return;
    }
    Alert.alert(`Delete ${row.spec.name}?`, `This frees about ${(row.spec.sizeMb / 1000).toFixed(1)} GB. You can download it again later.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const use = (row: ModelRow) => void setActiveModel(row.spec.id, premium === true).then(refresh);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="mx-auto w-full max-w-md self-center px-4 pb-24 pt-8"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="auto" />
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Back">
        <View className="flex-row items-center gap-0.5">
          <AppIcon name="chevBack" size={16} color="#0284C7" />
          <Text className="font-bold text-sky-600 dark:text-sky-400">Back</Text>
        </View>
      </Pressable>
      <View className="mt-2 items-center">
        <BrandMark />
        <Text className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">Offline AI & sync</Text>
        <Text className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          {"Keep learning without a connection. Bingo answers on your device, and your progress syncs when you're back online."}
        </Text>
      </View>

      {/* Status strip */}
      <View className="mt-4 w-full flex-row gap-2">
        <View className="flex-1 items-center rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
          <View className={`h-2.5 w-2.5 rounded-full ${online == null ? 'bg-slate-300' : online ? 'bg-emerald-500' : 'bg-red-400'}`} />
          <Text className="mt-1 text-xs font-extrabold text-slate-700 dark:text-slate-200">
            {online == null ? 'Checking…' : online ? 'Online' : 'Offline'}
          </Text>
        </View>
        <View className="flex-1 items-center rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
          <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100">{passages ?? '—'}</Text>
          <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">lesson passages</Text>
        </View>
        <View className="flex-1 items-center rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
          <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100">{pending}</Text>
          <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">to sync</Text>
        </View>
      </View>

      <Card>
        <CardTitle icon="book" title="Offline tutor" />
        <Text className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
          {engine.ready
            ? `${engine.label}. Offline questions are answered by this model, grounded in your lessons.`
            : engine.label}
        </Text>
        <View className="mt-3 flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Always use offline AI</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              Answer every question on this device, even when online. Uses no AI allowance.
            </Text>
          </View>
          <Switch
            value={preferOffline}
            onValueChange={togglePreferOffline}
            accessibilityLabel="Always use offline AI"
            trackColor={{ true: '#0EA5E9', false: '#CBD5E1' }}
          />
        </View>
      </Card>

      <Card>
        <CardTitle icon="refresh" title="Smart Sync" />
        <Text className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
          {pending > 0
            ? `${pending} lesson result${pending === 1 ? ' is' : 's are'} saved on this device, waiting to upload.`
            : 'All your lesson results are uploaded.'}{' '}
          Course updates: {courses?.savedAt ? `${courses.lessons} lessons, refreshed ${timeAgo(courses.savedAt)}` : 'none downloaded yet'}.
        </Text>
        <Pressable
          onPress={syncNow}
          disabled={syncing}
          accessibilityRole="button"
          accessibilityLabel="Sync now"
          className={`mt-3 flex-row items-center justify-center gap-2 rounded-2xl border-b-4 py-3 ${
            syncing ? 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-700' : 'border-sky-700 bg-sky-500'
          }`}
        >
          {syncing ? <ActivityIndicator color="#fff" /> : <AppIcon name="refresh" size={16} color="#FFFFFF" />}
          <Text className="font-extrabold text-white">{syncing ? 'Syncing…' : 'Sync now'}</Text>
        </Pressable>
        {syncNote ? <Text className="mt-2 text-xs leading-4 text-slate-600 dark:text-slate-300">{syncNote}</Text> : null}
      </Card>

      <Card>
        <CardTitle icon="phone" title="On-device AI models" />
        <Text className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
          Download a small AI model so Bingo can write real answers with no connection. Models are compressed to 4-bit and run on your phone.
        </Text>

        {!supported ? (
          <View className="mt-3 rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-200">{llamaUnavailableReason()}</Text>
            <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">Offline lesson search still works here.</Text>
          </View>
        ) : premium === false ? (
          <Pressable
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
            className="mt-3 flex-row items-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950"
          >
            <AppIcon name="crown" size={18} color="#D97706" />
            <Text className="flex-1 text-sm font-bold text-amber-900 dark:text-amber-100">
              {online === false
                ? 'Your Premium needs a quick online check before the on-device model runs again. Connect once to renew it.'
                : 'On-device models are a Premium feature. Go Premium to download one.'}
            </Text>
            <AppIcon name="chevRight" size={16} color="#D97706" />
          </Pressable>
        ) : premium === true && leaseUntil != null ? (
          <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Works offline until {new Date(leaseUntil).toLocaleDateString()}. Going online renews this automatically.
          </Text>
        ) : null}

        {modelError ? (
          <View className="mt-3 rounded-2xl bg-red-50 p-3 dark:bg-red-950">
            <Text className="text-sm font-bold text-red-700 dark:text-red-300">{modelError}</Text>
          </View>
        ) : null}

        {rows.map((row) => {
          const p = progress[row.spec.id];
          const downloading = p !== undefined;
          const canDownload = supported && premium === true && online !== false;
          return (
            <View
              key={row.spec.id}
              className={`mt-3 rounded-2xl border-2 p-3 ${
                row.active ? 'border-sky-500 bg-sky-50 dark:bg-sky-950' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    {row.spec.name}
                    {row.active ? <Text className="text-xs font-extrabold text-sky-600 dark:text-sky-400">  · In use</Text> : null}
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {(row.spec.sizeMb / 1000).toFixed(1)} GB · {row.spec.quantization} · needs {row.spec.minRamGb} GB+ RAM · {row.spec.license}
                  </Text>
                  <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{row.spec.note}</Text>
                  {row.updateAvailable ? (
                    <Text className="mt-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">Update available</Text>
                  ) : null}
                </View>
              </View>

              {downloading ? (
                <View className="mt-2">
                  <View className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <View className="h-2 bg-sky-500" style={{ width: `${Math.round(p * 100)}%` }} />
                  </View>
                  <View className="mt-1 flex-row items-center justify-between">
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Downloading… {Math.round(p * 100)}%</Text>
                    <Pressable onPress={() => cancel(row.spec.id)} accessibilityRole="button" accessibilityLabel={`Cancel ${row.spec.name} download`}>
                      <Text className="text-xs font-extrabold text-red-500">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {!row.installed || row.updateAvailable ? (
                    <Pressable
                      onPress={() => download(row)}
                      disabled={!canDownload}
                      accessibilityRole="button"
                      accessibilityLabel={`${row.updateAvailable ? 'Update' : 'Download'} ${row.spec.name}`}
                      className={`rounded-xl px-3 py-2 ${canDownload ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <Text className={`text-xs font-extrabold ${canDownload ? 'text-white' : 'text-slate-400'}`}>
                        {row.updateAvailable ? 'Update' : 'Download'}
                        {online === false && supported && premium ? ' (needs internet)' : ''}
                      </Text>
                    </Pressable>
                  ) : null}
                  {row.installed && !row.active ? (
                    <Pressable
                      onPress={() => use(row)}
                      disabled={premium !== true}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${row.spec.name}`}
                      className="rounded-xl border-2 border-sky-500 px-3 py-1.5"
                    >
                      <Text className="text-xs font-extrabold text-sky-600 dark:text-sky-400">Use this model</Text>
                    </Pressable>
                  ) : null}
                  {row.installed ? (
                    <Pressable
                      onPress={() => remove(row)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${row.spec.name}`}
                      className="rounded-xl border-2 border-slate-200 px-3 py-1.5 dark:border-slate-700"
                    >
                      <Text className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}
        <Text className="mt-3 text-xs leading-4 text-slate-400 dark:text-slate-500">
          Models download from Hugging Face at a fixed version and are checked for size before use. Your lessons stay on this device; nothing you ask the on-device model leaves your phone.
        </Text>
      </Card>
    </ScrollView>
  );
}
