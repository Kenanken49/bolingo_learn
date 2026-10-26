import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { getProfile, type Profile } from '../../lib/progress';

interface Upload {
  id: string;
  file_name: string;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
}

const STATUS_STYLE: Record<Upload['status'], { dot: string; label: string; text: string }> = {
  processing: { dot: 'bg-amber-400', label: 'generating…', text: 'text-amber-600' },
  ready: { dot: 'bg-green-500', label: 'ready', text: 'text-green-600' },
  failed: { dot: 'bg-red-500', label: 'failed', text: 'text-red-500' },
};

export default function Uploads() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

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
        .select('id,file_name,status,created_at')
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
    <ScrollView contentContainerClassName="flex-grow items-center bg-white px-6 py-12">
      <Text className="text-2xl font-extrabold text-slate-900">📚 My uploads</Text>
      <Text className="text-base text-slate-500">Every file you've sent to the AI Sandbox.</Text>

      {loading ? (
        <ActivityIndicator color="#7c3aed" size="large" />
      ) : !profile ? (
        <View className="mt-6 w-full max-w-sm items-center rounded-3xl border-2 border-slate-200 bg-slate-50 p-5">
          <Text className="text-base text-slate-600">Sign in to see your upload history.</Text>
          <Pressable onPress={() => router.push('/auth')} className="mt-3 rounded-2xl bg-slate-900 px-6 py-3">
            <Text className="font-bold text-white">Sign in</Text>
          </Pressable>
        </View>
      ) : uploads.length === 0 ? (
        <View className="mt-6 w-full max-w-sm items-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">
          <Text className="text-4xl">📥</Text>
          <Text className="mt-2 text-center text-base text-slate-600">Nothing here yet — drop your first file in the 🧠 AI Sandbox.</Text>
        </View>
      ) : (
        <View className="mt-4 w-full max-w-sm">
          {uploads.map((u) => {
            const s = STATUS_STYLE[u.status];
            return (
              <View key={u.id} className="mb-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
                <View className="flex-row items-center">
                  <View className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                  <Text className="ml-2 flex-1 text-base font-bold text-slate-800" numberOfLines={1}>
                    {u.file_name}
                  </Text>
                  <Text className={`text-xs font-bold ${s.text}`}>● {s.label}</Text>
                </View>
                <Text className="mt-1 text-xs text-slate-400">{new Date(u.created_at).toLocaleString()}</Text>
                <View className="mt-2 flex-row gap-2">
                  {u.status === 'ready' && (
                    <Pressable onPress={() => openLesson(u.id)} className="flex-1 items-center rounded-xl bg-purple-600 py-2">
                      <Text className="font-bold text-white">Open lesson</Text>
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
                    <View className="flex-1 items-center rounded-xl bg-slate-100 py-2">
                      <Text className="text-sm font-bold text-slate-400">AI is working…</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Pressable onPress={() => router.back()} className="mt-4 items-center">
        <Text className="font-bold text-slate-400">Back to Path</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
