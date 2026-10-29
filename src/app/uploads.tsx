import { useCallback, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Text from '../../components/ui/Text';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { getProfile, type Profile } from '../../lib/progress';
import AppIcon from '../../components/AppIcon';

interface Upload {
  id: string;
  file_name: string;
  file_url: string | null;
  status: 'processing' | 'ready' | 'failed';
  error: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<Upload['status'], { dot: string; label: string; text: string }> = {
  processing: { dot: 'bg-amber-400', label: 'generating…', text: 'text-amber-600 dark:text-amber-400' },
  ready: { dot: 'bg-green-500', label: 'ready', text: 'text-green-600 dark:text-green-400' },
  failed: { dot: 'bg-red-500', label: 'failed', text: 'text-red-500 dark:text-red-400' },
};

export default function Uploads() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      if (!p) {
        setUploads([]);
        return;
      }
      const { data, error } = await supabase
        .from('user_uploads')
        .select('id,file_name,file_url,status,error,created_at')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      setUploads((data as Upload[] | null) ?? []);
    } catch (e) {
      console.warn('Uploads refresh failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refresh();
    }, [refresh])
  );

  const retry = async (id: string) => {
    setRetrying(id);
    try {
      const { error } = await supabase.functions.invoke('process-upload', { body: { upload_id: id } });
      if (error) throw error;
      Alert.alert('Re-queued', 'Generation restarted — the status will flip when it finishes.');
      refresh();
    } catch (e) {
      Alert.alert('Retry failed', String(e instanceof Error ? e.message : e));
    } finally {
      setRetrying(null);
    }
  };

  // Remove the raw file plus any generated lesson audio (the lesson +
  // questions rows cascade away with the upload row via the FK, but their
  // MP3s would otherwise orphan in the bucket). Best-effort throughout —
  // a missing file must never block the row delete.
  const purgeUploadFiles = async (userId: string, u: Pick<Upload, 'id' | 'file_name' | 'file_url'>) => {
    const paths = [u.file_url ?? `${userId}/${u.file_name}`];
    try {
      const { data: linked } = await supabase.from('lessons').select('id').eq('upload_source_id', u.id);
      for (const row of ((linked as Array<{ id: number }> | null) ?? [])) {
        paths.push(`${userId}/audio/${row.id}.mp3`);
        const { data: segs } = await supabase.storage.from('user-materials').list(`${userId}/audio/${row.id}`);
        for (const f of segs ?? []) paths.push(`${userId}/audio/${row.id}/${f.name}`);
      }
    } catch (e) {
      console.warn('Audio inventory skipped:', e);
    }
    const { error } = await supabase.storage.from('user-materials').remove(paths);
    if (error) console.warn('Storage cleanup skipped:', error.message);
  };

  const deleteUpload = async (u: Upload) => {
    if (!profile) return;
    Alert.alert('Delete upload?', `"${u.file_name}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(u.id);
          try {
            await purgeUploadFiles(profile.id, u);
            const { error } = await supabase.from('user_uploads').delete().eq('id', u.id);
            if (error) throw error;
            setUploads((prev) => prev.filter((x) => x.id !== u.id));
          } catch (e) {
            Alert.alert('Delete failed', String(e instanceof Error ? e.message : e));
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const clearFailed = async () => {
    if (!profile) return;
    const failed = uploads.filter((x) => x.status === 'failed');
    if (failed.length === 0) return;
    Alert.alert(`Delete ${failed.length} failed upload${failed.length === 1 ? '' : 's'}?`, 'Raw files and their queue rows will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all',
        style: 'destructive',
        onPress: async () => {
          setClearing(true);
          try {
            await Promise.all(failed.map((f) => purgeUploadFiles(profile.id, f)));
            const { error } = await supabase.from('user_uploads').delete().in(
              'id',
              failed.map((x) => x.id)
            );
            if (error) throw error;
            setUploads((prev) => prev.filter((x) => x.status !== 'failed'));
          } catch (e) {
            Alert.alert('Clear failed', String(e instanceof Error ? e.message : e));
          } finally {
            setClearing(false);
          }
        },
      },
    ]);
  };

  const openLesson = async (uploadId: string) => {
    const { data } = await supabase.from('lessons').select('id,title').eq('upload_source_id', uploadId).limit(1).maybeSingle();
    const lesson = data as { id: number; title: string } | null;
    if (lesson) {
      router.push({ pathname: '/quiz/[lessonId]', params: { lessonId: String(lesson.id), title: lesson.title } });
    } else {
      Alert.alert('Not ready yet', 'The lesson is still generating — check back soon.');
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md flex-grow items-center self-center px-4 py-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <View className="flex-row items-center gap-2">
        <AppIcon name="book" size={26} color="#0F172A" />
        <Text className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">My uploads</Text>
      </View>
      <Text className="text-base text-slate-500 dark:text-slate-400">Every file you've sent to the AI Sandbox.</Text>
      {uploads.some((x) => x.status === 'failed') && (
        <Pressable onPress={clearFailed} disabled={clearing} className="mt-3 rounded-2xl bg-red-50 dark:bg-red-950 px-4 py-2">
          <View className="flex-row items-center justify-center gap-1.5">
            <AppIcon name="trash" size={16} color="#DC2626" />
            <Text className="font-bold text-red-600 dark:text-red-400">{clearing ? 'Clearing…' : `Clear failed (${uploads.filter((x) => x.status === 'failed').length})`}</Text>
          </View>
        </Pressable>
      )}

      {loading ? (
        <ActivityIndicator color="#7c3aed" size="large" />
      ) : !profile ? (
        <View className="mt-6 w-full max-w-sm items-center rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
          <Text className="text-base text-slate-600 dark:text-slate-400">Sign in to see your upload history.</Text>
          <Pressable onPress={() => router.push('/auth')} className="mt-3 rounded-2xl bg-slate-900 px-6 py-3">
            <Text className="font-bold text-white">Sign in</Text>
          </Pressable>
        </View>
      ) : uploads.length === 0 ? (
        <View className="mt-6 w-full max-w-sm items-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6">
          <AppIcon name="upload" size={40} color="#94A3B8" />
          <View className="mt-2 flex-row items-center justify-center gap-1">
            <Text className="text-center text-base text-slate-600 dark:text-slate-400">Nothing here yet — drop your first file in the</Text>
            <AppIcon name="brain" size={16} color="#7C3AED" />
            <Text className="text-center text-base text-slate-600 dark:text-slate-400">AI Sandbox.</Text>
          </View>
        </View>
      ) : (
        <View className="mt-4 w-full max-w-sm">
          {uploads.map((u) => {
            const s = STATUS_STYLE[u.status];
            return (
              <View key={u.id} className="mb-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <View className="flex-row items-center">
                  <View className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                  <Text className="ml-2 flex-1 text-base font-bold text-slate-800 dark:text-slate-200" numberOfLines={1}>
                    {u.file_name}
                  </Text>
                  <Text className={`text-xs font-bold ${s.text}`}>● {s.label}</Text>
                </View>
                <Text className="mt-1 text-xs text-slate-400 dark:text-slate-500">{new Date(u.created_at).toLocaleString()}</Text>
                {u.status === 'failed' && u.error ? (                  <View className="mt-1 flex-row items-start gap-1">
                    <AppIcon name="alert" size={13} color="#EF4444" />
                    <Text className="flex-1 text-xs leading-4 text-red-500 dark:text-red-400" numberOfLines={3}>
                      {u.error}
                    </Text>
                  </View>
                ) : null}
                <View className="mt-2 flex-row gap-2">
                  {u.status === 'ready' && (
                    <Pressable onPress={() => openLesson(u.id)} className="flex-1 items-center rounded-xl bg-purple-600 py-2">
                      <Text className="font-bold text-white">Open lesson</Text>
                    </Pressable>
                  )}
                  {u.status === 'failed' && (
                    <>
                      <Pressable
                        onPress={() => retry(u.id)}
                        disabled={retrying === u.id}
                        className="flex-1 items-center rounded-xl bg-slate-800 py-2"
                      >
                        <Text className="font-bold text-white">{retrying === u.id ? 'Retrying…' : 'Retry'}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => deleteUpload(u)}
                        disabled={deleting === u.id}
                        className="items-center justify-center rounded-xl bg-red-100 dark:bg-red-950 px-4 py-2"
                      >
                        {deleting === u.id ? <Text className="font-bold text-red-600 dark:text-red-400">…</Text> : <AppIcon name="trash" size={18} color="#DC2626" />}
                      </Pressable>
                    </>
                  )}
                  {u.status === 'processing' && (
                    <View className="flex-1 items-center rounded-xl bg-slate-100 dark:bg-slate-800 py-2">
                      <Text className="text-sm font-bold text-slate-400 dark:text-slate-500">AI is working…</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Pressable onPress={() => router.replace('/')} className="mt-4 items-center">
        <Text className="font-bold text-slate-400 dark:text-slate-500">Back to Path</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
