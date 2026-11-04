import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import Text from '../../components/ui/Text';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { getProfile, type Profile } from '../../lib/progress';
import { isMediaUpload } from '../../lib/contentRights';
import AppIcon from '../../components/AppIcon';

interface Upload {
  id: string;
  file_name: string;
  file_url: string | null;
  status: 'processing' | 'ready' | 'failed';
  /** Set by the pipeline's detector: book | notes | article | transcript. */
  material_kind?: string | null;
  error: string | null;
  created_at: string;
}

/**
 * Ask before destroying something, on every platform. `Alert.alert` takes a
 * button array that react-native-web ignores, so on the web build the confirm
 * callback never fired and the trash button looked dead. Same pattern as
 * src/app/admin.tsx.
 */
function confirmThen(title: string, message: string, action: () => void, confirmLabel = 'Delete'): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) action();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: action },
  ]);
}

/**
 * How long a removed row stays recoverable. The row leaves the list the moment
 * the trash is pressed; the files and the database row are only touched once
 * this window closes, so an accidental tap costs nothing to take back.
 */
const UNDO_MS = 7000;

interface PendingDelete {
  upload: Upload;
  userId: string;
  timer: ReturnType<typeof setTimeout>;
}

const STATUS_STYLE: Record<Upload['status'], { dot: string; label: string; text: string }> = {
  processing: { dot: 'bg-amber-400', label: 'generating…', text: 'text-amber-600 dark:text-amber-400' },
  ready: { dot: 'bg-green-500', label: 'ready', text: 'text-green-600 dark:text-green-400' },
  failed: { dot: 'bg-red-500', label: 'failed', text: 'text-red-500 dark:text-red-400' },
};

/** Per-row trash control: same affordance on every status. */
function DeleteButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="items-center justify-center rounded-xl bg-red-100 px-4 py-2 dark:bg-red-950"
    >
      <AppIcon name="trash" size={18} color="#DC2626" />
    </Pressable>
  );
}

export default function Uploads() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  /** Upload ids whose lesson is flagged audiobook-only (nodes deleted). */
  const [audiobookOnlyIds, setAudiobookOnlyIds] = useState<Set<string>>(new Set());
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const pendingRef = useRef<PendingDelete | null>(null);
  const commitRef = useRef<(u: Upload, userId: string) => void>(() => {});

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      if (!p) {
        setUploads([]);
        setAudiobookOnlyIds(new Set());
        return;
      }
      const { data, error } = await supabase
        .from('user_uploads')
        .select('id,file_name,file_url,status,error,created_at,material_kind')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      const rows = (data as Upload[] | null) ?? [];
      // A row inside the undo window is already gone from the user's point of
      // view; refetching must not resurrect it.
      const pendingId = pendingRef.current?.upload.id;
      setUploads(pendingId ? rows.filter((r) => r.id !== pendingId) : rows);
      // Which uploads already play as one audiobook (their quiz nodes were
      // deleted by the convert action below).
      const { data: linked } = await supabase
        .from('lessons')
        .select('upload_source_id,audiobook_only:content->>audiobook_only')
        .eq('user_id', p.id)
        .eq('is_user_generated', true)
        .not('upload_source_id', 'is', null);
      const only = new Set(
        (((linked as { upload_source_id: string; audiobook_only?: string | null }[] | null) ?? []))
          .filter((l) => l.audiobook_only === 'true')
          .map((l) => l.upload_source_id)
      );
      setAudiobookOnlyIds(only);
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
      // Clear the previous reason and show `generating…` first, so the row
      // reflects this attempt instead of the one that failed. If the invoke
      // never lands, put the row back to failed with the retry's own reason.
      await supabase.from('user_uploads').update({ status: 'processing', error: null }).eq('id', id);
      const { error } = await supabase.functions.invoke('process-upload', { body: { upload_id: id } });
      if (error) {
        await supabase
          .from('user_uploads')
          .update({ status: 'failed', error: `Retry could not reach the AI pipeline (${error.message}).` })
          .eq('id', id);
        throw error;
      }
      Alert.alert('Re-queued', 'Generation restarted — the status will flip when it finishes.');
      refresh();
    } catch (e) {
      Alert.alert('Retry failed', String(e instanceof Error ? e.message : e));
      refresh();
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
      for (const row of ((linked as { id: number }[] | null) ?? [])) {
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

  // The real delete: raw file, generated audio, then the row. If it fails the
  // row comes back, because by then the undo window is closed and there is no
  // other way for the learner to see that the file survived.
  const commitUpload = async (u: Upload, userId: string) => {
    try {
      await purgeUploadFiles(userId, u);
      const { error } = await supabase.from('user_uploads').delete().eq('id', u.id);
      if (error) throw error;
    } catch (e) {
      setUploads((prev) =>
        prev.some((x) => x.id === u.id)
          ? prev
          : [...prev, u].sort((a, b) => b.created_at.localeCompare(a.created_at))
      );
      Alert.alert(
        'Delete failed',
        `"${u.file_name}" is still in your list. ${String(e instanceof Error ? e.message : e)}`
      );
    }
  };

  useEffect(() => {
    commitRef.current = (u, userId) => {
      void commitUpload(u, userId);
    };
  });

  // Close the open undo window and let the delete through. A second tap, or
  // leaving the screen, must finish the first delete instead of dropping it.
  const settlePending = () => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingRef.current = null;
    setPendingName(null);
    commitRef.current(p.upload, p.userId);
  };

  useEffect(() => {
    return () => {
      const p = pendingRef.current;
      if (!p) return;
      clearTimeout(p.timer);
      pendingRef.current = null;
      commitRef.current(p.upload, p.userId);
    };
  }, []);

  // Pressing the trash hides the row and starts the undo window. Nothing is
  // destroyed until UNDO_MS passes, so the accidental tap has no cost.
  const deleteUpload = (u: Upload) => {
    if (!profile) return;
    settlePending();
    setUploads((prev) => prev.filter((x) => x.id !== u.id));
    setPendingName(u.file_name);
    const timer = setTimeout(() => {
      pendingRef.current = null;
      setPendingName(null);
      commitRef.current(u, profile.id);
    }, UNDO_MS);
    pendingRef.current = { upload: u, userId: profile.id, timer };
  };

  const undoDelete = () => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingRef.current = null;
    setPendingName(null);
    setUploads((prev) =>
      [...prev, p.upload].sort((a, b) => b.created_at.localeCompare(a.created_at))
    );
  };

  const clearFailed = async () => {
    if (!profile) return;
    const failed = uploads.filter((x) => x.status === 'failed');
    if (failed.length === 0) return;
    confirmThen(
      `Delete ${failed.length} failed upload${failed.length === 1 ? '' : 's'}?`,
      'Raw files and their queue rows will be removed.',
      () => {
        void (async () => {
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
        })();
      },
      'Delete all'
    );
  };

  // Turn a generated lesson into precisely one audiobook: the full narration
  // keeps playing part by part under Your Audiobooks, while every quiz node
  // (questions rows + revision pack) is permanently deleted. Requires the
  // pipeline to have narrated the whole text — without audio_chunks there is
  // nothing to listen to, so the action refuses rather than stranding a
  // nodeless, voiceless lesson. Needs the "Users convert own generated
  // lessons" UPDATE policy (migrations_audiobook_only_convert.sql).
  const convertToAudiobookOnly = async (u: Upload) => {
    if (!profile) return;
    confirmThen(
      'Make this an audiobook only?',
      `"${u.file_name}" keeps its full narration as one audiobook. Its quiz nodes are permanently deleted from the learning path.`,
      () => {
        void (async () => {
          setConverting(u.id);
          try {
            const { data: linked, error: linkError } = await supabase
              .from('lessons')
              .select('id,content')
              .eq('upload_source_id', u.id);
            if (linkError) throw linkError;
            const lessons = (linked as { id: number; content: Record<string, unknown> | null }[] | null) ?? [];
            if (lessons.length === 0) throw new Error('No generated lesson found for this upload yet.');
            for (const lesson of lessons) {
              const content = (lesson.content ?? {}) as { audio_chunks?: unknown[]; audio_url?: string | null };
              const hasFull =
                (Array.isArray(content.audio_chunks) && content.audio_chunks.length > 0) || !!content.audio_url;
              if (!hasFull) {
                throw new Error('The full narration is not ready yet — wait for generation to finish, then try again.');
              }
            }
            for (const lesson of lessons) {
              const { error: qError } = await supabase.from('questions').delete().eq('lesson_id', lesson.id);
              if (qError) throw qError;
              const { error: rError } = await supabase.from('revision_packs').delete().eq('upload_id', u.id);
              if (rError) console.warn('Revision pack cleanup skipped:', rError.message);
              const prev = (lesson.content ?? {}) as Record<string, unknown>;
              // The per-question clips belonged to the deleted nodes; the
              // chapters (full narration parts) stay, so Listen plays one book.
              const { error: lError } = await supabase
                .from('lessons')
                .update({ content: { ...prev, audiobook_only: true, segments: [] } })
                .eq('id', lesson.id);
              if (lError) throw lError;
            }
            Alert.alert('Done', `"${u.file_name}" is now one audiobook — play it under Your Audiobooks on the path.`);
            refresh();
          } catch (e) {
            Alert.alert('Could not convert', String(e instanceof Error ? e.message : e));
          } finally {
            setConverting(null);
          }
        })();
      },
      'Make audiobook only'
    );
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
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md flex-grow items-center self-center px-4 py-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-2">
          <AppIcon name="book" size={26} color="#0F172A" />
          <Text className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">My uploads</Text>
        </View>
        <Text onPhoto className="text-base text-slate-600 dark:text-slate-200">Every file you’ve sent to the AI Sandbox.</Text>
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
            <Pressable onPress={() => router.push('/auth')} className="mt-3 rounded-2xl bg-green-500 px-6 py-3">
              <Text className="font-bold text-[#03130A]">Sign in</Text>
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
              const statusLabel =
                u.status === 'processing' && isMediaUpload(u.file_name) ? 'transcribing…' : s.label;
              return (
                <View key={u.id} className="mb-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <View className="flex-row items-center">
                    <View className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    <Text className="ml-2 flex-1 text-base font-bold text-slate-800 dark:text-slate-200" numberOfLines={1}>
                      {u.file_name}
                    </Text>
                    <Text className={`text-xs font-bold ${s.text}`}>● {statusLabel}</Text>
                  </View>
                  <Text className="mt-1 text-xs text-slate-400 dark:text-slate-500">{new Date(u.created_at).toLocaleString()}</Text>
                  {u.status === 'ready' && audiobookOnlyIds.has(u.id) ? (
                    <Text className="mt-1 text-xs font-bold text-green-600 dark:text-green-400">
                      🎧 Audiobook only · plays as one book under Your Audiobooks
                    </Text>
                  ) : u.status === 'ready' && u.material_kind ? (
                    <Text className="mt-1 text-xs font-bold text-violet-500 dark:text-violet-300">
                      {u.material_kind === 'book'
                        ? 'Book · audiobook ready'
                        : u.material_kind === 'notes'
                          ? 'Notes · revision pack ready'
                          : u.material_kind === 'transcript'
                            ? 'Transcript · revision pack ready'
                            : 'Article · revision pack ready'}
                    </Text>
                  ) : null}
                  {u.status === 'failed' && u.error ? (
                    <View className="mt-1 flex-row items-start gap-1">
                      <AppIcon name="alert" size={13} color="#EF4444" />
                      <Text className="flex-1 text-xs leading-4 text-red-500 dark:text-red-400" numberOfLines={3}>
                        {u.error}
                      </Text>
                    </View>
                  ) : null}
                  <View className="mt-2 flex-row gap-2">
                    {u.status === 'ready' && !audiobookOnlyIds.has(u.id) && (
                      <Pressable onPress={() => openLesson(u.id)} className="flex-1 items-center rounded-xl bg-purple-600 py-2">
                        <Text className="font-bold text-white">Open lesson</Text>
                      </Pressable>
                    )}
                    {u.status === 'ready' && !audiobookOnlyIds.has(u.id) && u.material_kind && u.material_kind !== 'book' && (
                      <Pressable
                        onPress={() => router.push({ pathname: '/revision/[uploadId]', params: { uploadId: u.id } })}
                        className="flex-1 items-center rounded-xl bg-violet-500 py-2"
                      >
                        <Text className="font-bold text-white">Revision</Text>
                      </Pressable>
                    )}
                    {u.status === 'failed' && (
                      <Pressable
                        onPress={() => retry(u.id)}
                        disabled={retrying === u.id}
                        className="flex-1 items-center rounded-xl bg-slate-800 py-2"
                      >
                        <Text className="font-bold text-white">{retrying === u.id ? 'Retrying…' : 'Retry'}</Text>
                      </Pressable>
                    )}
                    {u.status === 'processing' && (
                      <View className="flex-1 items-center rounded-xl bg-slate-100 dark:bg-slate-800 py-2">
                        <Text className="text-sm font-bold text-slate-400 dark:text-slate-500">AI is working…</Text>
                      </View>
                    )}
                    <DeleteButton onPress={() => deleteUpload(u)} label={`Delete ${u.file_name}`} />
                  </View>
                  {u.status === 'ready' && !audiobookOnlyIds.has(u.id) && (
                    <Pressable
                      onPress={() => convertToAudiobookOnly(u)}
                      disabled={converting === u.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Make ${u.file_name} an audiobook only, deleting its quiz nodes`}
                      className="mt-2 items-center rounded-xl bg-green-600 py-2"
                    >
                      <Text className="font-bold text-white">
                        {converting === u.id ? 'Converting…' : '🎧 Audiobook only (delete quiz nodes)'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Pressable onPress={() => router.replace('/')} className="mt-4 items-center">
          <Text onPhoto className="font-bold text-slate-600 dark:text-slate-200">Back to Path</Text>
        </Pressable>
        <StatusBar style="auto" />
      </ScrollView>
      {pendingName ? (
        <View className="absolute bottom-6 left-0 right-0 items-center px-4">
          <View className="w-full max-w-md flex-row items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 dark:bg-slate-100">
            <AppIcon name="trash" size={16} color="#F87171" />
            <Text className="flex-1 text-sm font-bold text-white dark:text-slate-900" numberOfLines={1}>
              Deleted “{pendingName}”
            </Text>
            <Pressable
              onPress={undoDelete}
              accessibilityRole="button"
              accessibilityLabel={`Undo delete of ${pendingName}`}
              className="rounded-xl bg-purple-600 px-4 py-2"
            >
              <Text className="font-bold text-white">UNDO</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
