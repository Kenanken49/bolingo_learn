import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getLessonResult } from '../../lib/quizResults';

export default function Results() {
  const result = getLessonResult();

  if (!result) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-4xl">🗺️</Text>
        <Text className="mt-2 text-lg text-slate-600">No results yet — finish a lesson first.</Text>
        <Pressable onPress={() => router.replace('/')} className="mt-4 rounded-2xl bg-green-500 px-6 py-3">
          <Text className="font-bold text-white">Back to Path</Text>
        </Pressable>
        <StatusBar style="auto" />
      </View>
    );
  }

  const pct = result.total > 0 ? Math.round((result.correctCount / result.total) * 100) : 0;

  return (
    <ScrollView contentContainerClassName="items-center bg-white px-6 py-12">
      <Text className="text-5xl">{pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : '💪'}</Text>
      <Text className="mt-2 text-2xl font-extrabold text-slate-900">Lesson complete!</Text>
      <Text className="text-base text-slate-500">{result.title}</Text>

      <View className="mt-4 w-full max-w-sm flex-row justify-between rounded-3xl bg-slate-900 px-5 py-4">
        <View className="items-center">
          <Text className="text-2xl font-extrabold text-white">+{result.xpEarned}</Text>
          <Text className="text-xs font-bold text-slate-400">XP</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-extrabold text-white">
            {result.correctCount}/{result.total}
          </Text>
          <Text className="text-xs font-bold text-slate-400">CORRECT</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-extrabold text-orange-400">🔥{result.streak}</Text>
          <Text className="text-xs font-bold text-slate-400">STREAK</Text>
        </View>
      </View>

      <View className="mt-3 h-3 w-full max-w-sm overflow-hidden rounded-full bg-slate-200">
        <View className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
      </View>
      <Text className="mt-1 text-sm font-bold text-slate-400">{pct}% mastery</Text>

      <Text className="mt-6 self-start text-lg font-extrabold text-slate-900">Review</Text>
      {result.results.map((r, i) => (
        <View
          key={i}
          className={`mt-2 w-full max-w-sm rounded-2xl border-2 p-4 ${r.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
        >
          <Text className="text-sm font-bold text-slate-500">
            Q{i + 1} {r.correct ? '✅' : '❌'}
          </Text>
          <Text className="mt-1 text-base font-bold text-slate-900">{r.prompt}</Text>
          <Text className={`mt-1 font-mono text-sm ${r.correct ? 'text-green-700' : 'text-red-600'}`}>
            You: {r.yourAnswer || '—'}
          </Text>
          {!r.correct && <Text className="mt-1 font-mono text-sm text-slate-700">Answer: {r.correctAnswer}</Text>}
        </View>
      ))}

      <View className="mt-6 w-full max-w-sm flex-row gap-2">
        <Pressable
          onPress={() => router.replace({ pathname: '/quiz/[lessonId]', params: { lessonId: result.lessonId, title: result.title } })}
          className="flex-1 items-center rounded-2xl bg-slate-800 py-4"
        >
          <Text className="text-lg font-extrabold text-white">Retry 🔁</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/')} className="flex-1 items-center rounded-2xl bg-green-500 py-4">
          <Text className="text-lg font-extrabold text-white">Path 🗺️</Text>
        </Pressable>
      </View>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
