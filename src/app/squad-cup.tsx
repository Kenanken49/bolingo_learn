import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { RealtimeChannel } from '@supabase/supabase-js';
import Text from '../../components/ui/Text';
import TextInput from '../../components/ui/TextInput';
import AppIcon from '../../components/AppIcon';
import Mascot from '../../components/AfricanMascots';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/progress';
import { COURSES } from '../../lib/courses';
import { LANGUAGE_COURSES } from '../../lib/languages';
import { playCelebration, playQuizCorrect, playWrong } from '../../lib/sfx';
import {
  CUP_QUESTIONS,
  QUESTION_MS,
  TEAMS,
  cupClock,
  cupHost,
  isCupCode,
  makeCupCode,
  normalizeCupCode,
  pickCupQuestions,
  scoreAnswer,
  teamTotals,
  type CupPlayer,
  type TeamId,
} from '../../lib/squadCup';

/**
 * Squad Cup: a live team quiz battle for a private squad code. Presence
 * carries each player's team and score; the host's presence carries the
 * round (seed + start time), so late joiners and every device see the same
 * eight questions on the same clock. No chat, no strangers, nothing stored.
 */
const POOL = [...Object.values(COURSES), ...Object.values(LANGUAGE_COURSES)].flatMap((l) => l.questions);

interface Round {
  seed: number;
  startAt: number;
}

export default function SquadCup() {
  const [me, setMe] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [codeDraft, setCodeDraft] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamId>('A');
  const [players, setPlayers] = useState<CupPlayer[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  // Answers are kept per round seed, so a new round starts clean without an effect.
  const [answers, setAnswers] = useState<{ seed: number; picks: Record<number, { option: string; points: number }> }>({ seed: -1, picks: {} });
  const [now, setNow] = useState(() => Date.now());
  const [connected, setConnected] = useState(false);
  const channel = useRef<RealtimeChannel | null>(null);
  const joinedAt = useRef(0);
  const celebrated = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      void getProfile()
        .then((p) => setMe(p ? { id: p.id, name: p.username?.trim() || 'Learner' } : null))
        .catch(() => setMe(null));
    }, [])
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Join the squad's channel.
  useEffect(() => {
    if (!me || !code) return;
    joinedAt.current = Date.now();
    const ch = supabase.channel(`squad-cup:${code}`, { config: { presence: { key: me.id } } });
    ch.on('presence', { event: 'sync' }, () => {
      const list: CupPlayer[] = [];
      let hostRound: Round | null = null;
      const state = ch.presenceState() as Record<string, Record<string, unknown>[]>;
      for (const [key, metas] of Object.entries(state)) {
        const m = metas[0] ?? {};
        const t = m.team === 'B' ? 'B' : 'A';
        const name = typeof m.name === 'string' ? m.name.replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 24) : 'Player';
        list.push({ key, name, team: t, joinedAt: Number(m.joinedAt) || 0, score: Math.max(0, Number(m.score) || 0) });
      }
      const host = cupHost(list);
      const hostMeta = host ? state[host]?.[0] : undefined;
      const r = hostMeta?.round as Round | undefined;
      if (r && Number.isFinite(r.seed) && Number.isFinite(r.startAt)) hostRound = { seed: r.seed, startAt: r.startAt };
      setPlayers(list);
      // The host owns the round; everyone else mirrors the host's presence.
      if (host !== me.id) setRound((prev) => (hostRound ? (prev?.seed === hostRound.seed ? prev : hostRound) : null));
    });
    ch.subscribe((s) => setConnected(s === 'SUBSCRIBED'));
    channel.current = ch;
    return () => {
      channel.current = null;
      setConnected(false);
      void supabase.removeChannel(ch);
    };
  }, [me, code]);

  const host = cupHost(players);
  const amHost = !!me && host === me.id;

  const picks = round && answers.seed === round.seed ? answers.picks : {};
  const picked: Record<number, string> = Object.fromEntries(Object.entries(picks).map(([k, v]) => [k, v.option]));
  const score = Object.values(picks).reduce((sum, v) => sum + v.points, 0);

  // Publish my state (the host also publishes the round).
  useEffect(() => {
    const ch = channel.current;
    if (!ch || !connected || !me) return;
    void ch.track({ name: me.name, team, joinedAt: joinedAt.current, score, ...(amHost && round ? { round } : {}) });
  }, [connected, me, team, score, amHost, round]);


  const questions = useMemo(() => (round ? pickCupQuestions(POOL, round.seed, CUP_QUESTIONS) : []), [round]);
  const clock = round ? cupClock(round.startAt, now) : null;
  const totals = teamTotals(players);
  const winner = totals.A.average === totals.B.average ? null : totals.A.average > totals.B.average ? 'A' : 'B';

  useEffect(() => {
    if (round && clock?.done && celebrated.current !== round.seed) {
      celebrated.current = round.seed;
      const mine = players.find((p) => p.key === me?.id);
      if (mine && winner === mine.team) void playCelebration();
    }
  }, [clock?.done, players, me, winner, round]);

  const start = () => {
    if (!amHost) return;
    setRound({ seed: Math.floor(Math.random() * 2 ** 31), startAt: Date.now() + 5000 });
  };

  const answer = (option: string) => {
    if (!round || !clock || clock.index < 0 || clock.done || picked[clock.index] !== undefined) return;
    const q = questions[clock.index];
    const right = option === q.answer;
    const points = scoreAnswer(right, clock.msLeft);
    const index = clock.index;
    setAnswers((a) => ({ seed: round.seed, picks: { ...(a.seed === round.seed ? a.picks : {}), [index]: { option, points } } }));
    void (right ? playQuizCorrect() : playWrong());
  };

  const leave = () => {
    setCode(null);
    setRound(null);
    setPlayers([]);
  };

  // ---------- UI ----------
  return (
    <ScrollView className="flex-1 bg-[#24134C]" contentContainerClassName="mx-auto w-full max-w-xl self-center px-4 pb-24 pt-8" contentContainerStyle={{ flexGrow: 1 }}>
      <StatusBar style="light" />
      <Pressable onPress={() => (code ? leave() : router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button">
        <View className="flex-row items-center gap-0.5">
          <AppIcon name="chevBack" size={16} color="#FFC94D" />
          <Text className="font-bold text-[#FFC94D]">{code ? 'Leave squad' : 'Back'}</Text>
        </View>
      </Pressable>
      <Text className="mt-3 text-xs font-extrabold uppercase tracking-widest text-[#FFC94D]">Squad Cup</Text>
      <Text className="font-duo text-3xl font-extrabold text-white">Team quiz battle</Text>

      {me === null ? (
        <>
          <Text className="mt-2 text-sm text-white/75">Sign in so your squad knows who you are.</Text>
          <Pressable onPress={() => router.push('/auth')} className="mt-4 items-center rounded-2xl bg-[#38C6A0] py-3.5">
            <Text className="font-extrabold text-white">Sign in</Text>
          </Pressable>
        </>
      ) : !code ? (
        <View className="mt-4">
          <Text className="text-sm leading-5 text-white/80">
            Squads are private: share the six-letter code with classmates or friends. Two teams, {CUP_QUESTIONS} questions, {QUESTION_MS / 1000} seconds each. Team score is the average per player, so small teams can win.
          </Text>
          <Pressable
            onPress={() => setCode(makeCupCode())}
            disabled={!me}
            className="mt-4 items-center rounded-2xl bg-[#FFC94D] py-4"
            accessibilityRole="button"
          >
            <Text className="font-duo text-lg font-extrabold text-[#3A2300]">Create a squad</Text>
          </Pressable>
          <Text className="mt-5 text-xs font-extrabold uppercase tracking-widest text-white/60">Or join with a code</Text>
          <View className="mt-2 flex-row gap-2">
            <TextInput
              value={codeDraft}
              onChangeText={(t) => setCodeDraft(normalizeCupCode(t))}
              placeholder="ABC123"
              autoCapitalize="characters"
              accessibilityLabel="Squad code"
              className="flex-1 rounded-2xl bg-white/10 px-4 py-3 font-duo text-xl font-extrabold tracking-widest text-white"
            />
            <Pressable
              onPress={() => isCupCode(codeDraft) && setCode(codeDraft)}
              disabled={!isCupCode(codeDraft)}
              className={`justify-center rounded-2xl px-5 ${isCupCode(codeDraft) ? 'bg-[#38C6A0]' : 'bg-white/10'}`}
              accessibilityRole="button"
            >
              <Text className="font-extrabold text-white">Join</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
            <View>
              <Text className="text-xs text-white/60">Squad code</Text>
              <Text className="font-duo text-2xl font-extrabold tracking-widest text-white" selectable>
                {code}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-white/30'}`} />
              <Text className="text-xs text-white/70">{players.length} here</Text>
            </View>
          </View>

          {/* Team scoreboard */}
          <View className="mt-3 flex-row gap-2">
            {TEAMS.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => !round && setTeam(t.id)}
                disabled={!!round && !clock?.done}
                accessibilityRole="radio"
                accessibilityState={{ selected: team === t.id }}
                className="flex-1 rounded-2xl p-3"
                style={{ backgroundColor: team === t.id ? t.color : 'rgba(255,255,255,0.08)' }}
              >
                <Text className="text-xs font-bold text-white/80">{team === t.id ? 'Your team' : 'Tap to switch'}</Text>
                <Text className="font-duo text-base font-extrabold text-white" numberOfLines={1}>
                  {t.name}
                </Text>
                <Text className="font-duo text-2xl font-extrabold text-white">{totals[t.id].average}</Text>
                <Text className="text-[10px] text-white/70">{totals[t.id].players} players · avg score</Text>
              </Pressable>
            ))}
          </View>

          {/* Lobby */}
          {!round ? (
            <View className="mt-4">
              {players
                .slice()
                .sort((a, b) => a.joinedAt - b.joinedAt)
                .map((p) => (
                  <View key={p.key} className="mt-1.5 flex-row items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                    <View className="h-3 w-3 rounded-full" style={{ backgroundColor: TEAMS.find((t) => t.id === p.team)!.color }} />
                    <Text className="flex-1 font-bold text-white">{p.key === me?.id ? `${p.name} (you)` : p.name}</Text>
                    {p.key === host ? <Text className="text-xs font-bold text-[#FFC94D]">Host</Text> : null}
                  </View>
                ))}
              {amHost ? (
                <Pressable onPress={start} className="mt-4 items-center rounded-2xl bg-[#38C6A0] py-4" accessibilityRole="button">
                  <Text className="font-duo text-lg font-extrabold text-white">Start the cup</Text>
                </Pressable>
              ) : (
                <Text className="mt-4 text-center text-sm text-white/70">Waiting for the host to start…</Text>
              )}
            </View>
          ) : null}

          {/* Countdown */}
          {round && clock && clock.index === -1 ? (
            <View className="mt-8 items-center">
              <Text className="text-sm font-bold uppercase tracking-widest text-white/70">Get ready</Text>
              <Text className="font-duo text-7xl font-extrabold text-[#FFC94D]">{Math.ceil(clock.msLeft / 1000)}</Text>
            </View>
          ) : null}

          {/* Question */}
          {round && clock && clock.index >= 0 && !clock.done && questions[clock.index] ? (
            <View className="mt-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-extrabold uppercase tracking-widest text-white/70">
                  Question {clock.index + 1} / {questions.length}
                </Text>
                <Text className="font-duo text-xl font-extrabold text-[#FFC94D]">{Math.ceil(clock.msLeft / 1000)}s</Text>
              </View>
              <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                <View className="h-full rounded-full bg-[#FFC94D]" style={{ width: `${(clock.msLeft / QUESTION_MS) * 100}%` }} />
              </View>
              <Text className="mt-4 font-duo text-xl font-extrabold leading-7 text-white">{questions[clock.index].prompt}</Text>
              <View className="mt-4 gap-2.5">
                {questions[clock.index].options.map((o) => {
                  const mine = picked[clock.index];
                  const isPicked = mine === o;
                  const reveal = mine !== undefined;
                  const right = o === questions[clock.index].answer;
                  return (
                    <Pressable
                      key={o}
                      onPress={() => answer(o)}
                      disabled={reveal}
                      accessibilityRole="button"
                      className="rounded-2xl border-b-4 px-4 py-3.5"
                      style={{
                        backgroundColor: reveal && right ? '#38C6A0' : isPicked ? '#FF4F7B' : '#FFFFFF',
                        borderBottomColor: reveal && right ? '#1C7A60' : isPicked ? '#9C2343' : '#B7A9E3',
                      }}
                    >
                      <Text className={`font-duo text-base font-extrabold ${reveal && (right || isPicked) ? 'text-white' : 'text-[#2A1A5C]'}`}>{o}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text className="mt-3 text-center text-sm font-bold text-white/80">Your score: {score}</Text>
            </View>
          ) : null}

          {/* Results */}
          {round && clock?.done ? (
            <View className="mt-6 items-center">
              <Mascot character="bingo" mood={winner && winner === team ? 'party' : 'happy'} size={110} />
              <Text className="mt-2 font-duo text-3xl font-extrabold text-white">
                {winner ? `${TEAMS.find((t) => t.id === winner)!.name} win!` : "It's a draw!"}
              </Text>
              <Text className="mt-1 text-sm text-white/75">
                You scored {score} with {Object.keys(picked).filter((i) => picked[+i] === questions[+i]?.answer).length} of {questions.length} right.
              </Text>
              <View className="mt-4 w-full gap-1.5">
                {players
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((p, i) => (
                    <View key={p.key} className="flex-row items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                      <Text className="w-6 font-extrabold text-[#FFC94D]">{i + 1}</Text>
                      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: TEAMS.find((t) => t.id === p.team)!.color }} />
                      <Text className="flex-1 font-bold text-white">{p.key === me?.id ? 'You' : p.name}</Text>
                      <Text className="font-extrabold text-white">{p.score}</Text>
                    </View>
                  ))}
              </View>
              {amHost ? (
                <Pressable onPress={start} className="mt-4 w-full items-center rounded-2xl bg-[#FFC94D] py-4" accessibilityRole="button">
                  <Text className="font-duo text-lg font-extrabold text-[#3A2300]">Rematch</Text>
                </Pressable>
              ) : (
                <Text className="mt-4 text-sm text-white/70">The host can start a rematch.</Text>
              )}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
