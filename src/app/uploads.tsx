import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import Text from '../../components/ui/Text';
import { router, useFocusEffect } from 'expo-router';
import Shell from '../../components/dashboard/Shell';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { getProfile, type Profile } from '../../lib/progress';
import { uploadRawFile, waitForUploadReady } from '../../lib/uploads';
import {
  CONTENT_RIGHTS_ITEMS,
  CONTENT_RIGHTS_REQUIRED_MESSAGE,
  buildContentRightsAttestation,
  isMediaUpload,
  type ContentRightsChecks,
  type ContentRightsItemId,
} from '../../lib/contentRights';
import { FREE_WORD_LIMIT, PREMIUM_PRICE_LABEL } from '../../lib/tiers';
import AppIcon from '../../components/AppIcon';
import WebCameraCapture from '../../components/WebCameraCapture';

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
  // AI Sandbox creator: picking, scanning and uploading live here now — the
  // Library hub owns the whole upload journey, list included.
  const [picked, setPicked] = useState<{ uri: string; name: string; mime: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rightsChecks, setRightsChecks] = useState<ContentRightsChecks>({});
  const [sandboxMsg, setSandboxMsg] = useState<string | null>(null);
  const [webCameraOpen, setWebCameraOpen] = useState(false);

  const isPremium = profile?.is_premium === true;
  const pickedIsMedia = picked ? isMediaUpload(picked.name, picked.mime) : false;
  const rightsComplete =
    !pickedIsMedia || CONTENT_RIGHTS_ITEMS.every((item) => rightsChecks[item.id] === true);

  const toggleRightsItem = (id: ContentRightsItemId) => {
    setRightsChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        // Free tier: raw text only. Premium unlocks PDF, text, CSV, photo Scan
        // and consented audio/video transcription.
        type: isPremium
          ? ['application/pdf', 'text/*', 'image/*', 'audio/*', 'video/*']
          : ['text/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const a = res.assets[0];
      setPicked({ uri: a.uri, name: a.name ?? 'upload', mime: a.mimeType ?? 'application/octet-stream' });
      setRightsChecks({});
      setSandboxMsg(null);
    } catch (e) {
      setSandboxMsg(String(e instanceof Error ? e.message : e));
    }
  };

  // Scan names its captures after the minute they were taken so a learner's
  // history stays readable.
  const scannedName = () => {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
    return `Scanned-notes-${stamp}.jpg`;
  };

  // Premium Scan: snap notes with the camera (or pick a gallery photo) and
  // Bingo OCRs + curates a revision node through the normal pipeline — the
  // picked photo flows into uploadPicked() unchanged.
  const scanNotes = async (source: 'camera' | 'library') => {
    if (!isPremium) {
      setSandboxMsg(`Scan is a Premium perk (${PREMIUM_PRICE_LABEL}) — snap your notes and Bingo builds the revision node.`);
      return;
    }
    // A desktop browser has no camera through the picker module (it hands back
    // a file dialog), so open the real webcam stream instead.
    if (source === 'camera' && Platform.OS === 'web') {
      setWebCameraOpen(true);
      return;
    }
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setSandboxMsg('Photo permission denied — allow access in system settings, then try again.');
        return;
      }
      const launcher = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const res = await launcher({ mediaTypes: ['images'], quality: 0.7, exif: false });
      if (res.canceled) return;
      const a = res.assets[0];
      setPicked({ uri: a.uri, name: scannedName(), mime: 'image/jpeg' });
      setSandboxMsg(null);
    } catch (e) {
      setSandboxMsg(String(e instanceof Error ? e.message : e));
    }
  };

  const uploadPicked = async () => {
    if (!profile) {
      setSandboxMsg('Sign in first — uploads are tagged to your account.');
      return;
    }
    if (!picked) {
      setSandboxMsg('Pick a file first — PDF, text, photo, audio or video.');
      return;
    }
    const media = isMediaUpload(picked.name, picked.mime);
    const attestation = media ? buildContentRightsAttestation(rightsChecks) : null;
    if (media && !attestation) {
      setSandboxMsg(CONTENT_RIGHTS_REQUIRED_MESSAGE);
      return;
    }
    setUploading(true);
    setSandboxMsg(null);
    try {
      // expo-file-system has no web implementation — read blob: URIs with fetch instead.
      let bytes: Uint8Array;
      if (Platform.OS === 'web') {
        const buf = await (await fetch(picked.uri)).arrayBuffer();
        bytes = new Uint8Array(buf);
      } else {
        const b64 = await readAsStringAsync(picked.uri, { encoding: EncodingType.Base64 });
        bytes = new Uint8Array(decode(b64));
      }
      // Some cloud-backed picker URIs copy across as 0 bytes (Google Drive and
      // Downloads are the usual offenders). Say so before creating a row that
      // can only fail server-side.
      if (bytes.byteLength === 0) {
        setSandboxMsg(
          'That file came through empty (0 bytes). Open it once in another app, then share/save it to the device and pick it again.'
        );
        return;
      }
      const upload = await uploadRawFile(bytes, picked.name, picked.mime, {
        rightsAttestation: attestation,
      });
      setPicked(null);
      setRightsChecks({});
      setSandboxMsg('Uploaded! The AI is generating your custom path node…');
      refresh();
      // Wait for the pipeline, then surface the finished node.
      waitForUploadReady(upload.id)
        .then((finished) => {
          setSandboxMsg(
            finished.status === 'failed'
              ? finished.error ?? 'Generation hit an error — check the node status below.'
              : 'Your custom revision node is ready!'
          );
          refresh();
        })
        .catch(() => setSandboxMsg('Generation hit an error — check the node status below.'));
    } catch (e) {
      setSandboxMsg(String(e instanceof Error ? e.message : e));
    } finally {
      setUploading(false);
    }
  };
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
    <Shell active="/library" eyebrow="Library" greeting="My uploads" profile={profile}>
      <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md flex-grow items-center self-center px-4 py-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-2">
          <AppIcon name="book" size={26} color="#0F172A" />
          <Text className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">My uploads</Text>
        </View>
        <Text onPhoto className="text-base text-slate-600 dark:text-slate-200">Every file you’ve sent to the AI Sandbox.</Text>

        {/* AI Sandbox creator: pick, scan, confirm rights, generate. */}
        <View className="mt-4 w-full max-w-sm rounded-3xl border border-dash-line bg-dash-card p-4 dark:border-dash-dline dark:bg-dash-dcard">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-dash-pill dark:bg-dash-dbg">
              <AppIcon name="brain" size={19} color="#0284C7" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-extrabold text-dash-ink dark:text-dash-dink">New upload</Text>
              <Text className="text-[10.5px] font-semibold text-dash-muted dark:text-dash-dmuted">
                {isPremium
                  ? `PDF · text · photo · audio · video — Bingo builds a revision node.`
                  : `Free tier: text files up to ${FREE_WORD_LIMIT} words. Premium (${PREMIUM_PRICE_LABEL}) adds PDFs, scans, audio/video.`}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => void pickFile()}
            accessibilityRole="button"
            accessibilityLabel="Pick a file to upload"
            className="mt-3 items-center rounded-2xl border-2 border-dashed border-dash-line bg-dash-bg py-4 dark:border-dash-dline dark:bg-dash-dbg"
          >
            <AppIcon name="upload" size={26} color="#94A3B8" />
            <Text className="mt-1 text-[13px] font-extrabold text-dash-ink dark:text-dash-dink">Tap to pick a file</Text>
            <Text className="text-[10.5px] font-semibold text-dash-muted dark:text-dash-dmuted">
              {isPremium ? 'PDF · TXT · Photo · Audio · Video' : 'TXT · MD · CSV (Free)'}
            </Text>
          </Pressable>
          {isPremium ? (
            <View className="mt-2 flex-row gap-2">
              <Pressable
                onPress={() => void scanNotes('camera')}
                accessibilityRole="button"
                accessibilityLabel="Scan notes with camera"
                className="flex-1 items-center rounded-xl bg-dash-cyan py-2.5"
              >
                <Text className="text-[12px] font-extrabold text-[#062A33]">Take photo</Text>
              </Pressable>
              <Pressable
                onPress={() => void scanNotes('library')}
                accessibilityRole="button"
                accessibilityLabel="Pick a photo from gallery"
                className="flex-1 items-center rounded-xl border border-dash-line py-2.5 dark:border-dash-dline"
              >
                <Text className="text-[12px] font-extrabold text-dash-pillink">From gallery</Text>
              </Pressable>
            </View>
          ) : null}
          {picked ? (
            <View className="mt-2 rounded-xl border border-dash-line bg-dash-bg p-2.5 dark:border-dash-dline dark:bg-dash-dbg">
              <Text numberOfLines={1} className="text-[12px] font-bold text-dash-ink dark:text-dash-dink">
                {picked.name}
              </Text>
              <Text className="text-[10px] font-semibold text-dash-muted dark:text-dash-dmuted">{picked.mime}</Text>
            </View>
          ) : null}
          {pickedIsMedia ? (
            <View className="mt-2 rounded-2xl border border-dash-line bg-dash-bg p-3 dark:border-dash-dline dark:bg-dash-dbg">
              <View className="flex-row items-center gap-2">
                <AppIcon name="shield" size={16} color="#B45309" />
                <Text className="flex-1 text-[12px] font-extrabold text-dash-ink dark:text-dash-dink">
                  Content rights
                </Text>
                <Text className={`text-[9.5px] font-extrabold ${rightsComplete ? 'text-emerald-500' : 'text-red-500'}`}>
                  {rightsComplete ? 'CONFIRMED' : 'REQUIRED'}
                </Text>
              </View>
              <Text className="mt-1 text-[10.5px] font-semibold leading-[15px] text-dash-muted dark:text-dash-dmuted">
                Audio and video need confirmed rights before the AI can transcribe and narrate them.
              </Text>
              {CONTENT_RIGHTS_ITEMS.map((item) => {
                const checked = rightsChecks[item.id] === true;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleRightsItem(item.id)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={item.label}
                    accessibilityState={{ checked }}
                    className="mt-2 flex-row items-start gap-2"
                  >
                    <View
                      className={`mt-0.5 h-[18px] w-[18px] items-center justify-center rounded-[5px] border ${checked ? 'border-dash-pillink bg-dash-pillink' : 'border-dash-line bg-transparent dark:border-dash-dline'}`}
                    >
                      {checked ? <AppIcon name="check" size={12} color="#FFFFFF" /> : null}
                    </View>
                    <Text className="flex-1 text-[10.8px] font-semibold leading-[15px] text-dash-ink dark:text-dash-dink">
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
              {!rightsComplete ? (
                <Text className="mt-2 text-[10px] font-bold text-red-500">
                  Confirm every item to unlock upload.
                </Text>
              ) : null}
            </View>
          ) : null}
          <Pressable
            onPress={() => void uploadPicked()}
            disabled={uploading || (pickedIsMedia && !rightsComplete)}
            accessibilityRole="button"
            accessibilityLabel={pickedIsMedia && !rightsComplete ? 'Confirm rights to upload' : 'Generate my node'}
            className="mt-3 items-center rounded-2xl bg-dash-cyan py-3"
            style={{ opacity: uploading ? 0.5 : pickedIsMedia && !rightsComplete ? 0.45 : 1 }}
          >
            {uploading ? (
              <ActivityIndicator color="#062A33" />
            ) : (
              <Text className="text-[13.5px] font-extrabold text-[#062A33]">
                {pickedIsMedia && !rightsComplete ? 'Confirm rights to upload' : 'Generate my node'}
              </Text>
            )}
          </Pressable>
          {sandboxMsg ? (
            <Text className="mt-2 text-center text-[11.5px] font-semibold text-dash-muted dark:text-dash-dmuted">
              {sandboxMsg}
            </Text>
          ) : null}
        </View>
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

        <Pressable onPress={() => router.replace('/library')} className="mt-4 items-center">
          <Text onPhoto className="font-bold text-slate-600 dark:text-slate-200">Back to Library</Text>
        </Pressable>
      </ScrollView>
      <WebCameraCapture
        visible={webCameraOpen}
        onClose={() => setWebCameraOpen(false)}
        onCaptured={(dataUrl) => {
          setPicked({ uri: dataUrl, name: scannedName(), mime: 'image/jpeg' });
          setRightsChecks({});
          setSandboxMsg(null);
          setWebCameraOpen(false);
        }}
        onChooseFile={() => {
          setWebCameraOpen(false);
          void scanNotes('library');
        }}
      />
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
    </Shell>
  );
}
