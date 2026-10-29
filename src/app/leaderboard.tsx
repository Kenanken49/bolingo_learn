import { useCallback, useState } from 'react';
import { View, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import Text from '../../components/ui/Text';
import TextInput from '../../components/ui/TextInput';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getProfile } from '../../lib/progress';
import AppIcon from '../../components/AppIcon';
import { getWeeklyBoard, leagueMates, leagueName, type BoardRow } from '../../lib/leagues';
import { searchUsers, addFriend, removeFriend, sendKudos, getFriendsBoard, type FriendRow, type UserSearchHit } from '../../lib/friends';

export default function Leaderboard() {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Community (Duolingo social pattern): league competition + friends board.
  const [tab, setTab] = useState<'leagues' | 'friends'>('leagues');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<UserSearchHit[]>([]);
  const [friends, setFriends] = useState<FriendRow[] | null>(null);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [busyFriend, setBusyFriend] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    try {
      const p = await getProfile().catch(() => null);
      setUserId(p?.id ?? null);
      // Guests have no league: skip the (authenticated-only) RPC and show
      // the friendly seed prompt instead of a "Board unavailable" error.
      if (!p) {
        setRows([]);
        setError(null);
        return;
      }
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

  const loadFriends = useCallback(async () => {
    try {
      const p = await getProfile().catch(() => null);
      if (!p) {
        setFriends(null);
        return;
      }
      setFriends(await getFriendsBoard(p.id));
      setFriendsError(null);
    } catch (e) {
      setFriendsError(e instanceof Error ? e.message : 'Friends unavailable.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      loadFriends();
    }, [load, loadFriends])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    await loadFriends();
    setRefreshing(false);
  };

  const doSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setHits([]);
      return;
    }
    setHits(await searchUsers(text));
  };

  const doAdd = async (username: string) => {
    try {
      const p = await getProfile();
      if (!p) {
        router.push('/auth');
        return;
      }
      setBusyFriend(username);
      await addFriend(p.id, username);
      setQuery('');
      setHits([]);
      await loadFriends();
    } catch (e) {
      Alert.alert('Add friend', e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusyFriend(null);
    }
  };

  const doRemove = async (friendId: string, username: string) => {
    try {
      const p = await getProfile();
      if (!p) return;
      await removeFriend(p.id, friendId);
      await loadFriends();
    } catch {
      Alert.alert('Remove friend', `Could not remove ${username}.`);
    }
  };

  const doKudos = async (friendId: string) => {
    try {
      const p = await getProfile();
      if (!p) {
        router.push('/auth');
        return;
      }
      setBusyFriend(friendId);
      await sendKudos(p.id, friendId);
      await loadFriends();
    } finally {
      setBusyFriend(null);
    }
  };

  const mates = leagueMates(rows ?? [], userId);
  const me = (rows ?? []).find((r) => r.user_id === userId) ?? null;

  return (
    <ScrollView
      className="flex-1" contentContainerClassName="mx-auto w-full max-w-md flex-grow items-center self-center px-4 py-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Weekly Leagues</Text>
      <Text className="text-base text-slate-500 dark:text-slate-400">Top 30 per league — resets Monday</Text>

      {/* Leagues | Friends tabs — Duolingo social pattern. */}
      <View className="mt-4 w-full max-w-sm flex-row gap-2">
        {(['leagues', 'friends'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              setTab(t);
              if (t === 'friends') void loadFriends();
            }}
            accessibilityRole="button"
            className={`flex-1 items-center rounded-2xl border-2 py-2 ${tab === t ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
          >
            <View className="flex-row items-center gap-1.5">
              <AppIcon name={t === 'leagues' ? 'trophy' : 'users'} size={16} color={tab === t ? '#15803D' : '#94A3B8'} />
              <Text className={`text-sm font-extrabold ${tab === t ? 'text-green-700 dark:text-green-300' : 'text-slate-400 dark:text-slate-500'}`}>
                {t === 'leagues' ? 'LEAGUES' : 'FRIENDS'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {tab === 'friends' ? (
        <View className="mt-6 w-full max-w-sm">
          {!userId ? (
            <View className="items-center rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <AppIcon name="users" size={30} color="#94A3B8" />
              </View>
              <Text className="mt-2 text-center text-base text-slate-600 dark:text-slate-400">Sign in to follow friends and trade high-fives.</Text>
              <Pressable onPress={() => router.replace('/auth')} className="mt-3 rounded-2xl bg-green-500 px-6 py-3">
                <Text className="font-extrabold text-white">Sign in</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                value={query}
                onChangeText={(t) => void doSearch(t)}
                placeholder="Search username…"
                autoCapitalize="none"
                className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-base text-slate-800 dark:text-slate-200"
              />
              {hits.map((h) => (
                <View key={h.user_id} className="mt-2 flex-row items-center rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <Text className="flex-1 text-base font-bold text-slate-800 dark:text-slate-200">{h.username}</Text>
                  <Pressable
                    onPress={() => void doAdd(h.username)}
                    disabled={busyFriend === h.username}
                    className="rounded-xl bg-green-500 px-4 py-2"
                  >
                    <Text className="font-extrabold text-white">{busyFriend === h.username ? '…' : '+ Add'}</Text>
                  </Pressable>
                </View>
              ))}
              {friends === null ? (
                <ActivityIndicator color="#10b981" size="large" style={{ marginTop: 24 }} />
              ) : friends.length === 0 ? (
                <View className="mt-4 items-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-5">
                  <Text className="text-center text-base text-slate-500 dark:text-slate-400">No friends yet — search a username above to compete on weekly XP.</Text>
                </View>
              ) : (
                friends.map((f) => (
                  <View key={f.user_id} className="mt-2 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                    <View className="flex-row items-center">
                      <View className="ml-1 flex-1">
                        <Text className="text-base font-bold text-slate-800 dark:text-slate-200">{f.username}</Text>
                        <View className="flex-row items-center gap-1">
                          <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{f.weekly_xp} XP this week ·</Text>
                          <AppIcon name="thumbUp" size={13} color="#059669" />
                          <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{f.kudos_count}</Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => void doKudos(f.user_id)}
                        disabled={busyFriend === f.user_id}
                        accessibilityLabel={`High-five ${f.username}`}
                        className="rounded-xl bg-amber-400 px-4 py-2"
                      >
                        {busyFriend === f.user_id ? <Text className="font-extrabold text-white">…</Text> : <AppIcon name="thumbUp" size={18} color="#FFFFFF" />}
                      </Pressable>
                      <Pressable onPress={() => void doRemove(f.user_id, f.username)} accessibilityLabel={`Remove ${f.username}`} className="ml-2 px-2 py-2">
                        <AppIcon name="close" size={20} color="#CBD5E1" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
              {friendsError ? <Text className="mt-2 text-center text-sm text-red-500 dark:text-red-400">{friendsError}</Text> : null}
              <Text className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">Weekly XP resets Monday · pull to refresh</Text>
            </>
          )}
        </View>
      ) : !rows && !error ? (
        <ActivityIndicator color="#10b981" size="large" style={{ marginTop: 32 }} />
      ) : error && !rows ? (
        <View className="mt-8 w-full max-w-sm items-center rounded-2xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-5">
          <Text className="text-base font-bold text-red-600 dark:text-red-400">Board unavailable</Text>
          <Text className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">{error}</Text>
          <Pressable onPress={() => load(true)} className="mt-3 rounded-2xl bg-slate-800 px-6 py-3">
            <Text className="font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : mates.length === 0 ? (
        <View className="mt-8 w-full max-w-sm items-center rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
          <Text className="text-4xl">Seed league</Text>
          <Text className="mt-2 text-center text-base text-slate-600 dark:text-slate-400">
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
              <Text className="text-sm font-bold text-slate-400 dark:text-slate-500">
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
                  isMe ? 'border-green-400 bg-green-50 dark:bg-green-950' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <Text className="w-10 text-lg font-extrabold text-slate-500 dark:text-slate-400">#{r.rank}</Text>
                <View className="ml-2 flex-1">
                  <Text className="text-base font-bold text-slate-800 dark:text-slate-200">
                    {r.username}
                    {isMe ? ' (you)' : ''}
                  </Text>
                </View>
                <Text className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">+{r.weekly_xp}</Text>
              </View>
            );
          })}
          <Text className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
            Cached hourly · pull to refresh
          </Text>
        </View>
      )}

      <Pressable onPress={() => router.replace('/')} className="mt-6 items-center">
        <Text className="font-bold text-slate-400 dark:text-slate-500">Back to Path</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
