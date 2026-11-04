import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import Text from '../../components/ui/Text';
import TextInput from '../../components/ui/TextInput';
import AppIcon from '../../components/AppIcon';
import { CERTIFICATIONS, isTrackCertified } from '../../lib/certifications';
import { getCompletedLessonIds, getProfile } from '../../lib/progress';
import { deleteJob, listJobs, postJob, type JobListing } from '../../lib/jobs';
import { rankJobs } from '../../lib/jobMatch';

/**
 * Job marketplace. Listings are posted by Bolingo admins (no invented
 * employers). Each one names the certifications it needs, and the match
 * score counts only certifications the learner has actually earned, so the
 * gap is always one concrete certification away.
 */
const trackName = (id: string) => CERTIFICATIONS.find((t) => t.id === id)?.name ?? id;

export default function Jobs() {
  const [jobs, setJobs] = useState<JobListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certified, setCertified] = useState<Set<string>>(new Set());
  const [signedIn, setSignedIn] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [matchesOnly, setMatchesOnly] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const p = await getProfile().catch(() => null);
      setSignedIn(!!p);
      setAdmin(p?.is_admin === true);
      if (p) {
        const done = await getCompletedLessonIds(p.id);
        setCertified(new Set(CERTIFICATIONS.filter((t) => isTrackCertified(t, done)).map((t) => t.id)));
      }
      setJobs(await listJobs());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load jobs.');
      setJobs((j) => j ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const ranked = useMemo(() => {
    const all = rankJobs(jobs ?? [], certified);
    return matchesOnly ? all.filter((j) => j.match.score > 0) : all;
  }, [jobs, certified, matchesOnly]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerClassName="mx-auto w-full max-w-xl self-center px-4 pb-24 pt-8"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <StatusBar style="auto" />
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Back">
        <View className="flex-row items-center gap-0.5">
          <AppIcon name="chevBack" size={16} color="#0284C7" />
          <Text className="font-bold text-sky-600 dark:text-sky-400">Back</Text>
        </View>
      </Pressable>
      <Text className="mt-3 text-xs font-extrabold uppercase tracking-widest text-sky-600 dark:text-sky-400">Job marketplace</Text>
      <Text className="font-duo text-3xl font-extrabold text-slate-900 dark:text-slate-100">Roles that fit what you&apos;ve proven</Text>
      <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {signedIn
          ? certified.size > 0
            ? `You hold ${certified.size} certification${certified.size === 1 ? '' : 's'}. Matches count only skills you've proven.`
            : "Earn a certification to start matching. Matches count only skills you've proven."
          : 'Sign in to see how well each role matches your certifications.'}
      </Text>

      <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-slate-100 px-4 py-2.5 dark:bg-slate-800">
        <Text className="text-sm font-bold text-slate-700 dark:text-slate-200">Only roles I partly match</Text>
        <Switch value={matchesOnly} onValueChange={setMatchesOnly} accessibilityLabel="Only roles I partly match" />
      </View>

      {admin ? <PostJobForm onPosted={load} /> : null}

      {jobs === null ? (
        <View className="mt-10 items-center">
          <ActivityIndicator />
        </View>
      ) : null}
      {error ? (
        <View className="mt-4 rounded-2xl bg-red-50 p-4 dark:bg-red-950">
          <Text className="text-sm font-bold text-red-700 dark:text-red-300">{error}</Text>
          <Pressable onPress={() => void load()} className="mt-2">
            <Text className="font-bold text-sky-600 dark:text-sky-400">Try again</Text>
          </Pressable>
        </View>
      ) : null}
      {jobs !== null && !error && ranked.length === 0 ? (
        <View className="mt-6 items-center rounded-3xl border-2 border-dashed border-slate-300 p-6 dark:border-slate-700">
          <AppIcon name="briefcase" size={28} color="#94A3B8" />
          <Text className="mt-2 text-base font-extrabold text-slate-700 dark:text-slate-200">
            {matchesOnly ? 'No partial matches yet' : 'No openings posted yet'}
          </Text>
          <Text className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            {matchesOnly
              ? 'Turn the filter off to see every role, or earn a certification it asks for.'
              : 'New entry-level roles appear here as partner employers post them. Keep building certifications in the meantime.'}
          </Text>
          <Pressable onPress={() => router.push('/certifications')} className="mt-3">
            <Text className="font-bold text-sky-600 dark:text-sky-400">Go to certifications →</Text>
          </Pressable>
        </View>
      ) : null}

      {ranked.map((job) => {
        const pct = Math.round(job.match.score * 100);
        return (
          <View key={job.id} className="mt-4 rounded-3xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <View className="flex-row items-start gap-3">
              <View className="flex-1">
                <Text className="font-duo text-lg font-extrabold text-slate-900 dark:text-slate-100">{job.title}</Text>
                <Text className="text-sm text-slate-600 dark:text-slate-300">
                  {job.employer} · {job.location} · {job.workMode}
                </Text>
                {job.salaryLabel ? (
                  <Text className="mt-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">{job.salaryLabel}</Text>
                ) : null}
              </View>
              <View
                className={`h-16 w-16 items-center justify-center rounded-full border-4 ${
                  pct === 100 ? 'border-emerald-500' : pct > 0 ? 'border-sky-500' : 'border-slate-300 dark:border-slate-700'
                }`}
                accessibilityLabel={`${pct} percent match`}
              >
                <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">{pct}%</Text>
                <Text className="text-[9px] text-slate-500">match</Text>
              </View>
            </View>
            <Text className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300" numberOfLines={4}>
              {job.description}
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {job.match.have.map((t) => (
                <Text key={t} className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  ✓ {trackName(t)}
                </Text>
              ))}
              {job.match.missing.map((t) => (
                <Pressable key={t} onPress={() => router.push('/certifications')} accessibilityRole="link">
                  <Text className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Needs {trackName(t)} →
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => void WebBrowser.openBrowserAsync(job.applyUrl)}
                accessibilityRole="link"
                accessibilityLabel={`Apply to ${job.title} at ${job.employer}`}
                className="flex-1 items-center rounded-2xl bg-sky-500 py-3"
              >
                <Text className="font-extrabold text-white">Apply on employer site</Text>
              </Pressable>
              {admin ? (
                <Pressable
                  onPress={() => void deleteJob(job.id).then(load)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${job.title}`}
                  className="items-center justify-center rounded-2xl border-2 border-slate-200 px-4 dark:border-slate-700"
                >
                  <AppIcon name="trash" size={16} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function PostJobForm({ onPosted }: { onPosted: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', employer: '', location: '', salaryLabel: '', description: '', applyUrl: '' });
  const [mode, setMode] = useState<JobListing['workMode']>('hybrid');
  const [tracks, setTracks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await postJob({ ...f, salaryLabel: f.salaryLabel || null, workMode: mode, requiredTracks: tracks, closesAt: null });
      setF({ title: '', employer: '', location: '', salaryLabel: '', description: '', applyUrl: '' });
      setTracks([]);
      setOpen(false);
      onPosted();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not post the role.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} className="mt-3 flex-row items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-sky-400 py-3">
        <AppIcon name="plus" size={16} color="#0284C7" />
        <Text className="font-bold text-sky-600 dark:text-sky-400">Post a role (admin)</Text>
      </Pressable>
    );
  }
  const field = (key: keyof typeof f, label: string, multiline = false) => (
    <TextInput
      value={f[key]}
      onChangeText={(v) => setF((s) => ({ ...s, [key]: v }))}
      placeholder={label}
      accessibilityLabel={label}
      multiline={multiline}
      className={`mt-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${multiline ? 'min-h-[80px]' : ''}`}
    />
  );
  return (
    <View className="mt-3 rounded-3xl border-2 border-sky-300 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950">
      <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">Post a role</Text>
      {field('title', 'Role title')}
      {field('employer', 'Employer')}
      {field('location', 'Location (e.g. Nairobi)')}
      {field('salaryLabel', 'Salary (optional, e.g. KSh 68,500 / mo)')}
      {field('description', 'What the role involves', true)}
      {field('applyUrl', 'Apply link (https://…)')}
      <View className="mt-2 flex-row gap-2">
        {(['onsite', 'hybrid', 'remote'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            className={`flex-1 items-center rounded-xl border-2 py-2 ${mode === m ? 'border-sky-500 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-700'}`}
          >
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">{m}</Text>
          </Pressable>
        ))}
      </View>
      <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Required certifications</Text>
      <View className="mt-1 flex-row flex-wrap gap-1.5">
        {CERTIFICATIONS.map((t) => {
          const on = tracks.includes(t.id);
          return (
            <Pressable
              key={t.id}
              onPress={() => setTracks((s) => (on ? s.filter((x) => x !== t.id) : [...s, t.id]))}
              className={`rounded-lg border-2 px-2 py-1 ${on ? 'border-sky-500 bg-sky-100 dark:bg-sky-900' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {msg ? <Text className="mt-2 text-xs font-bold text-red-600">{msg}</Text> : null}
      <View className="mt-3 flex-row gap-2">
        <Pressable onPress={() => setOpen(false)} className="flex-1 items-center rounded-2xl border-2 border-slate-300 py-3 dark:border-slate-700">
          <Text className="font-bold text-slate-600 dark:text-slate-300">Cancel</Text>
        </Pressable>
        <Pressable onPress={() => void submit()} disabled={busy} className="flex-1 items-center rounded-2xl bg-sky-500 py-3">
          {busy ? <ActivityIndicator color="#fff" /> : <Text className="font-extrabold text-white">Post role</Text>}
        </Pressable>
      </View>
    </View>
  );
}
