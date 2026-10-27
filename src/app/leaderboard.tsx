import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getProfile } from '../../lib/progress';
import { getWeeklyBoard, leagueMates, leagueName, type BoardRow } from '../../lib/leagues';

export default function Leaderboard() {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      const p = await getProfile().catch(() => null);
      setUserId(p?.id ?? null);
      setRows(await getWeeklyBoard(force));
      setError(null);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : JSON.stringify(e);
      setError(msg);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const mates = leagueMates(rows ?? [], userId);
  const me = (rows ?? []).find((r) => r.user_id === userId) ?? null;

  return (
    <ScrollView
      contentContainerClassName="flex-grow items-center bg-white px-6 py-12"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text className="text-2xl font-extrabold text-slate-900">Weekly Leagues</Text>
      <Text className="text-base text-slate-500">Top 30 per league — resets Monday</Text>

      {!rows && !error ? (
        <ActivityIndicator color="#10b981" size="large" style={{ marginTop: 32 }} />
      ) : error && !rows ? (
        <View className="mt-8 w-full max-w-sm items-center rounded-2xl border-2 border-red-200 bg-red-50 p-5">
          <Text className="text-base font-bold text-red-600">Board unavailable</Text>
          <Text className="mt-1 text-center text-sm text-slate-500">{error}</Text>
          <Pressable onPress={() => load(true)} className="mt-3 rounded-2xl bg-slate-800 px-6 py-3">
            <Text className="font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : mates.length === 0 ? (
        <View className="mt-8 w-full max-w-sm items-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-5">
          <Text className="text-4xl">Seed league</Text>
          <Text className="mt-2 text-center text-base text-slate-600">
            {userId
              ? 'Finish a lesson to earn weekly XP and join a league of 30.'
              : 'Sign in and finish a lesson to join a league of 30.'}
          </Text>
          <Pressable onPress={() => router.replace('/')} className="mt-3 rounded-2xl bg-green-500 px-6 py-3">
            <Text className="font-extrabold text-white">Earn XP</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-6 w-full max-w-sm">
          {me ? (
            <View className="mb-4 items-center rounded-3xl bg-slate-900 px-5 py-4">
              <Text className="text-sm font-bold text-slate-400">
                {leagueName(me.league)} LEAGUE · RANK #{me.rank}
              </Text>
              <Text className="text-2xl font-extrabold text-white">+{me.weekly_xp} XP this week</Text>
            </View>
          ) : null}
          {mates.map((r) => {
            const isMe = r.user_id === userId;
            return (
              <View
                key={r.user_id}
                className={`mt-2 flex-row items-center rounded-2xl border-2 p-3 ${
                  isMe ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'
                }`}
              >
                <Text className="w-10 text-lg font-extrabold text-slate-500">#{r.rank}</Text>
                <View className="ml-2 flex-1">
                  <Text className="text-base font-bold text-slate-800">
                    {r.username}
                    {isMe ? ' (you)' : ''}
                  </Text>
                </View>
                <Text className="text-base font-extrabold text-emerald-600">+{r.weekly_xp}</Text>
              </View>
            );
          })}
          <Text className="mt-3 text-center text-xs text-slate-400">
            Cached hourly · pull to refresh
          </Text>
        </View>
      )}

      <Pressable onPress={() => router.replace('/')} className="mt-6 items-center">
        <Text className="font-bold text-slate-400">Back to Path</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
