import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { RealtimeChannel } from '@supabase/supabase-js';
import Text from '../../components/ui/Text';
import AppIcon from '../../components/AppIcon';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/progress';
import {
  REACTIONS,
  STATUSES,
  STUDY_ROOMS,
  formatClock,
  pomodoro,
  roomCounts,
  sanitizeMember,
  type Reaction,
  type RoomMember,
  type RoomStatus,
} from '../../lib/studyRooms';

/**
 * Live study rooms: drop into a topic room and focus alongside other
 * learners. One Realtime channel carries presence (who is in which room,
 * with a status from a fixed list) and fixed reactions. Nothing is stored,
 * and there is no free text anywhere, so nobody can be messaged.
 */
const PALETTE = ['#3B6CF6', '#0F9D7A', '#E0663A', '#8B5CF6', '#D9A400', '#DB2777', '#0891B2'];
const colorFor = (key: string) => PALETTE[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const initials = (name: string) =>
  name
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

interface Bubble {
  id: number;
  from: string;
  reaction: Reaction;
}

export default function StudyRooms() {
  const [me, setMe] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [room, setRoom] = useState<string | null>(null);
  const [status, setStatus] = useState<RoomStatus>('Focusing');
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const channel = useRef<RealtimeChannel | null>(null);
  const bubbleId = useRef(0);

  useFocusEffect(
    useCallback(() => {
      void getProfile()
        .then((p) => setMe(p ? { id: p.id, name: p.username?.trim() || 'Learner' } : null))
        .catch(() => setMe(null));
    }, [])
  );

  // One lobby channel: presence for counts + members, broadcast for reactions.
  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel('study-rooms', { config: { presence: { key: me.id } } });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const list: RoomMember[] = [];
      for (const [key, metas] of Object.entries(state)) {
        const m = sanitizeMember(key, (metas as unknown[])[0]);
        if (m) list.push(m);
      }
      setMembers(list);
    });
    ch.on('broadcast', { event: 'react' }, ({ payload }) => {
      const reaction = REACTIONS.find((r) => r === payload?.reaction);
      const from = typeof payload?.from === 'string' ? payload.from : '';
      if (!reaction || !from) return;
      const id = ++bubbleId.current;
      setBubbles((b) => [...b, { id, from, reaction }]);
      setTimeout(() => setBubbles((b) => b.filter((x) => x.id !== id)), 2500);
    });
    ch.subscribe((s) => setConnected(s === 'SUBSCRIBED'));
    channel.current = ch;
    return () => {
      channel.current = null;
      void supabase.removeChannel(ch);
    };
  }, [me]);

  // Publish where I am (or untrack when I leave a room).
  useEffect(() => {
    const ch = channel.current;
    if (!ch || !connected || !me) return;
    if (room) void ch.track({ name: me.name, room, status });
    else void ch.untrack();
  }, [room, status, connected, me]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const react = (reaction: Reaction) => {
    if (!me || !channel.current) return;
    const payload = { from: me.id, reaction, room };
    void channel.current.send({ type: 'broadcast', event: 'react', payload });
    const id = ++bubbleId.current;
    setBubbles((b) => [...b, { id, from: me.id, reaction }]);
    setTimeout(() => setBubbles((b) => b.filter((x) => x.id !== id)), 2500);
  };

  const counts = roomCounts(members);
  const timer = pomodoro(now);
  const active = STUDY_ROOMS.find((r) => r.id === room);
  const inRoom = members.filter((m) => m.room === room);

  return (
    <ScrollView className="flex-1 bg-[#161A22]" contentContainerClassName="mx-auto w-full max-w-xl self-center px-4 pb-24 pt-8" contentContainerStyle={{ flexGrow: 1 }}>
      <StatusBar style="light" />
      <Pressable
        onPress={() => (room ? setRoom(null) : router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel={room ? 'Leave room' : 'Back'}
      >
        <View className="flex-row items-center gap-0.5">
          <AppIcon name="chevBack" size={16} color="#93C5FD" />
          <Text className="font-bold text-sky-300">{room ? 'Leave room' : 'Back'}</Text>
        </View>
      </Pressable>

      <View className="mt-3 flex-row items-center gap-2">
        <View className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
        <Text className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          {connected ? `${members.length} studying live` : me === null ? 'Sign in to join' : 'Connecting…'}
        </Text>
      </View>
      <Text className="font-duo text-3xl font-extrabold text-white">{active ? active.title : 'Live study rooms'}</Text>
      <Text className="mt-1 text-sm text-slate-400">
        {active
          ? 'Everyone shares one focus timer. Pick what you are doing; there is no chat.'
          : 'Focus alongside other learners. Cameras and chat are never needed: just a shared timer and quick reactions.'}
      </Text>

      {/* Shared wall-clock focus timer */}
      <View className="mt-4 items-center rounded-3xl bg-[#1F2532] py-5">
        <Text className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          {timer.phase === 'focus' ? 'Focus block' : 'Break'}
        </Text>
        <Text className="font-duo text-6xl font-extrabold text-white" style={{ fontVariant: ['tabular-nums'] }}>
          {formatClock(timer.remainingSec)}
        </Text>
        <Text className="text-xs text-slate-400">Starts on the hour and half hour for everyone</Text>
      </View>

      {me === null ? (
        <Pressable onPress={() => router.push('/auth')} className="mt-4 items-center rounded-2xl bg-sky-500 py-3.5">
          <Text className="font-extrabold text-white">Sign in to join a room</Text>
        </Pressable>
      ) : null}

      {!room && me ? (
        <View className="mt-4 gap-2.5">
          {STUDY_ROOMS.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setRoom(r.id)}
              disabled={!connected}
              accessibilityRole="button"
              accessibilityLabel={`Join ${r.title}, ${counts[r.id] ?? 0} studying`}
              className="flex-row items-center rounded-2xl border border-[#2C3342] bg-[#1A1F29] p-4"
            >
              <View className="flex-1">
                <Text className="text-base font-extrabold text-white">{r.title}</Text>
                <Text className="text-xs text-slate-400">{r.blurb}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                {(counts[r.id] ?? 0) > 0 ? <View className="h-2 w-2 rounded-full bg-emerald-400" /> : null}
                <Text className="text-sm font-bold text-slate-300">{counts[r.id] ?? 0}</Text>
                <AppIcon name="chevRight" size={16} color="#64748B" />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {room ? (
        <>
          <View className="mt-4 flex-row flex-wrap gap-2.5">
            {inRoom.map((m) => {
              const bubble = bubbles.filter((b) => b.from === m.key).at(-1);
              return (
                <View
                  key={m.key}
                  className={`w-[31%] items-center rounded-2xl p-3 ${m.key === me?.id ? 'border-2 border-white' : ''}`}
                  style={{ backgroundColor: colorFor(m.key) }}
                  accessibilityLabel={`${m.name}: ${m.status}`}
                >
                  {bubble ? (
                    <View className="absolute -top-2 right-1 rounded-lg bg-white px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-slate-900">{bubble.reaction}</Text>
                    </View>
                  ) : null}
                  <Text className="text-lg font-extrabold text-white">{initials(m.name)}</Text>
                  <Text className="text-center text-[10px] font-semibold text-white/90" numberOfLines={1}>
                    {m.key === me?.id ? 'You' : m.name}
                  </Text>
                  <Text className="text-center text-[9px] text-white/80" numberOfLines={1}>
                    {m.status}
                  </Text>
                </View>
              );
            })}
          </View>
          {inRoom.length <= 1 ? (
            <Text className="mt-3 text-center text-xs text-slate-400">
              You are the first one here. Others will see you the moment they join.
            </Text>
          ) : null}

          <Text className="mt-5 text-xs font-extrabold uppercase tracking-widest text-slate-400">I am</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                accessibilityRole="radio"
                accessibilityState={{ selected: status === s }}
                className={`rounded-xl border px-3 py-2 ${status === s ? 'border-sky-400 bg-sky-500/20' : 'border-[#3A4357]'}`}
              >
                <Text className={`text-xs font-bold ${status === s ? 'text-sky-200' : 'text-slate-300'}`}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="mt-5 text-xs font-extrabold uppercase tracking-widest text-slate-400">Send a reaction</Text>
          <View className="mt-2 flex-row gap-2">
            {REACTIONS.map((r) => (
              <Pressable key={r} onPress={() => react(r)} accessibilityRole="button" className="flex-1 items-center rounded-xl border border-[#3A4357] py-2.5">
                <Text className="text-xs font-bold text-slate-200">{r}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
