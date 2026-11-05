import { useCallback, useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Shell from '../../components/dashboard/Shell';
import { SectionHeader } from '../../components/dashboard/widgets';
import Text from '../../components/ui/Text';
import TextInput from '../../components/ui/TextInput';
import AppIcon from '../../components/AppIcon';
import LearnerAvatar from '../../components/LearnerAvatar';
import { getProfile, type Profile } from '../../lib/progress';
import { getFriendsBoard, addFriend, removeFriend, sendKudos, type FriendRow } from '../../lib/friends';
import { getWeeklyBoard, leagueMates, leagueName, type BoardRow } from '../../lib/leagues';
import { greeting, firstName } from '../../lib/dashboard';

/**
 * Community — friends + weekly league, all real. No invented discussions:
 * what the backend has (follows, weekly XP, kudos) is what the screen shows.
 */
export default function Community() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      if (p) {
        try {
          setFriends(await getFriendsBoard(p.id));
        } catch {
          setFriends([]);
        }
      }
      try {
        setBoard(await getWeeklyBoard());
      } catch {
        setBoard([]);
      }
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const mates = leagueMates(board, profile?.id ?? null);
  const myRow = profile ? board.find((r) => r.user_id === profile.id) : undefined;

  const follow = async () => {
    if (!profile) {
      router.push('/auth');
      return;
    }
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await addFriend(profile.id, name.trim());
      setName('');
      setFriends(await getFriendsBoard(profile.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add friend.');
    } finally {
      setBusy(false);
    }
  };

  const unfollow = async (f: FriendRow) => {
    if (!profile) return;
    try {
      await removeFriend(profile.id, f.user_id);
      setFriends((prev) => prev.filter((x) => x.user_id !== f.user_id));
    } catch {
      Alert.alert('Unfollow failed', 'Check your connection and try again.');
    }
  };

  const kudos = async (f: FriendRow) => {
    if (!profile) return;
    try {
      await sendKudos(profile.id, f.user_id);
      setFriends((prev) => prev.map((x) => (x.user_id === f.user_id ? { ...x, kudos_count: x.kudos_count + 1 } : x)));
    } catch {
      Alert.alert('Kudos failed', 'Check your connection and try again.');
    }
  };

  return (
    <Shell
      active="/community"
      eyebrow="Community"
      greeting={greeting(firstName(profile?.username))}
      profile={profile}
    >
      <SectionHeader
        title={myRow ? `${leagueName(myRow.league)} league` : 'Weekly league'}
        actionLabel="Full board →"
        onAction={() => router.push('/leaderboard')}
      />
      {mates.length ? (
        <View className="gap-1.5">
          {mates.slice(0, 5).map((r) => (
            <View
              key={r.user_id}
              className="flex-row items-center rounded-2xl border border-dash-line bg-dash-card px-3 py-2 dark:border-dash-dline dark:bg-dash-dcard"
            >
              <Text className="w-6 text-[12px] font-extrabold text-dash-faint">#{r.rank}</Text>
              <LearnerAvatar uri={null} size={30} premium={false} />
              <Text className="ml-2 flex-1 text-[13px] font-extrabold text-dash-ink dark:text-dash-dink" numberOfLines={1}>
                {r.user_id === profile?.id ? 'You' : r.username}
              </Text>
              <Text className="text-[12px] font-bold text-dash-pillink">{r.weekly_xp.toLocaleString()} XP</Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="rounded-2xl border border-dash-line bg-dash-card p-4 dark:border-dash-dline dark:bg-dash-dcard">
          <Text className="text-[13px] font-semibold text-dash-muted dark:text-dash-dmuted">
            {profile
              ? 'Earn XP this week to enter a league with learners near your level.'
              : 'Sign in to join a weekly league.'}
          </Text>
        </View>
      )}

      {/* Live together: real-time study rooms and seed-fair Squad Cup tournaments. */}
      <SectionHeader title="Study together" />
      <View className="gap-1.5">
        {(
          [
            { route: '/study-rooms', icon: 'users', title: 'Study rooms', sub: 'Shared pomodoro timers with live presence.' },
            { route: '/squad-cup', icon: 'trophy', title: 'Squad Cup', sub: 'Same seed, same round — fair team tournaments.' },
          ] as const
        ).map((c) => (
          <Pressable
            key={c.route}
            onPress={() => router.push(c.route)}
            accessibilityRole="button"
            accessibilityLabel={c.title}
            className="flex-row items-center rounded-2xl border border-dash-line bg-dash-card p-3 dark:border-dash-dline dark:bg-dash-dcard"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-dash-pill dark:bg-dash-dbg">
              <AppIcon name={c.icon} size={20} color="#0284C7" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-extrabold text-dash-ink dark:text-dash-dink" numberOfLines={1}>
                {c.title}
              </Text>
              <Text className="mt-0.5 text-[11px] font-semibold text-dash-muted dark:text-dash-dmuted" numberOfLines={2}>
                {c.sub}
              </Text>
            </View>
            <AppIcon name="chevRight" size={18} color="#94A3B8" />
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Friends" />
      <View className="flex-row items-center gap-2 rounded-2xl border border-dash-line bg-dash-card p-2 pl-3 dark:border-dash-dline dark:bg-dash-dcard">
        <AppIcon name="search" size={17} color="#94A3B8" />
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={() => void follow()}
          placeholder="Follow by username…"
          autoCapitalize="none"
          className="flex-1 text-[13px] text-dash-ink dark:text-dash-dink"
        />
        <Pressable
          onPress={() => void follow()}
          disabled={busy || !name.trim()}
          accessibilityRole="button"
          accessibilityLabel="Follow learner"
          className="rounded-xl bg-dash-cyan px-3 py-2"
          style={{ opacity: busy || !name.trim() ? 0.5 : 1 }}
        >
          <Text className="text-[12px] font-extrabold text-[#062A33]">{busy ? '…' : 'Follow'}</Text>
        </Pressable>
      </View>
      {err ? <Text className="mt-1.5 text-[12px] font-semibold text-red-500">{err}</Text> : null}
      <View className="mt-2 gap-1.5">
        {friends.map((f) => (
          <View
            key={f.user_id}
            className="flex-row items-center rounded-2xl border border-dash-line bg-dash-card px-3 py-2 dark:border-dash-dline dark:bg-dash-dcard"
          >
            <LearnerAvatar uri={null} size={30} premium={false} />
            <View className="ml-2 flex-1">
              <Text className="text-[13px] font-extrabold text-dash-ink dark:text-dash-dink" numberOfLines={1}>
                {f.username}
              </Text>
              <Text className="text-[10.5px] font-semibold text-dash-muted dark:text-dash-dmuted">
                {f.weekly_xp.toLocaleString()} XP this week
              </Text>
            </View>
            <Pressable
              onPress={() => void kudos(f)}
              accessibilityRole="button"
              accessibilityLabel={`Send kudos to ${f.username}`}
              className="flex-row items-center gap-1 rounded-full bg-dash-goldbg px-2.5 py-1.5 dark:bg-dash-dbg"
            >
              <AppIcon name="party" size={14} color="#B45309" />
              <Text className="text-[11px] font-extrabold text-dash-gold">{f.kudos_count}</Text>
            </Pressable>
            <Pressable
              onPress={() => void unfollow(f)}
              accessibilityRole="button"
              accessibilityLabel={`Unfollow ${f.username}`}
              className="ml-1 p-1.5"
            >
              <AppIcon name="close" size={15} color="#94A3B8" />
            </Pressable>
          </View>
        ))}
        {!friends.length && profile ? (
          <Text className="mt-1 text-[12.5px] font-semibold text-dash-muted dark:text-dash-dmuted">
            No friends yet — follow someone by username to compete on weekly XP.
          </Text>
        ) : null}
      </View>
    </Shell>
  );
}
