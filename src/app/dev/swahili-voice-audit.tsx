import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Text from '../../../components/ui/Text';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AppIcon from '../../../components/AppIcon';
import { useNatural } from '../../../lib/natural';
import { getLanguageLesson } from '../../../lib/languages';
import {
  SWAHILI_SPEECH,
  phraseForQuestion,
  speakAs,
  stopSpeaking,
  type PronounceResult,
} from '../../../lib/pronunciation';

/**
 * The three Swahili lessons added after the original course bank. This audit
 * speaks each question's model phrase through the real Livia path, so a device
 * check covers every phrase rather than one sample line from Settings.
 */
const LESSON_IDS = ['swahili-questions', 'swahili-adjectives', 'swahili-health'] as const;

interface AuditItem {
  key: string;
  lesson: string;
  question: number;
  prompt: string;
  phrase: string;
}

const ITEMS: AuditItem[] = LESSON_IDS.flatMap((lessonId) => {
  const lesson = getLanguageLesson(lessonId);
  if (!lesson) return [];
  return lesson.questions
    .map((question, index) => ({
      key: `${lessonId}:${index}`,
      lesson: lesson.title,
      question: index + 1,
      prompt: question.prompt,
      phrase: phraseForQuestion(question, SWAHILI_SPEECH),
    }))
    // A match board pairs phrases; it has no phrase of its own to speak.
    .filter((item) => item.phrase.trim().length > 0);
});

type AuditState =
  | { status: 'pending' }
  | { status: 'speaking' }
  | { status: 'done'; result: PronounceResult };

function AuditContent() {
  const p = useNatural();
  const [rows, setRows] = useState<Record<string, AuditState>>({});
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const runToken = useRef(0);

  const run = async () => {
    const token = runToken.current + 1;
    runToken.current = token;
    setRunning(true);
    setFinished(false);
    setRows(Object.fromEntries(ITEMS.map((item) => [item.key, { status: 'pending' as const }])));

    for (const item of ITEMS) {
      if (token !== runToken.current) return;
      setRows((current) => ({ ...current, [item.key]: { status: 'speaking' } }));
      const result = await speakAs({
        character: 'livia',
        text: item.phrase,
        language: SWAHILI_SPEECH,
      });
      if (token !== runToken.current) return;
      setRows((current) => ({ ...current, [item.key]: { status: 'done', result } }));
      // One line per phrase so a device run can be verified from `adb logcat`
      // without transcribing the screen.
      console.log(
        `[SwahiliVoiceAudit] ${item.key} | ${result.matchedVoice ? 'native-sw' : result.approximate ? 'approximate' : 'no-voice'} | ${result.locale} | ${result.voiceName ?? 'engine-default'} | ${item.phrase}`
      );
    }

    if (token === runToken.current) {
      setRunning(false);
      setFinished(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void run();
    }, 900);
    return () => {
      clearTimeout(timer);
      runToken.current += 1;
      void stopSpeaking();
    };
    // Run exactly once per mount; `run` only touches refs and setters.
  }, []);

  const results = Object.values(rows)
    .filter((row): row is Extract<AuditState, { status: 'done' }> => row.status === 'done')
    .map((row) => row.result);
  const native = results.filter((result) => result.matchedVoice).length;
  const fallback = results.filter((result) => !result.matchedVoice && result.approximate).length;
  const missing = results.filter((result) => !result.matchedVoice && !result.approximate).length;
  const voiceNames = [...new Set(results.map((result) => result.voiceName).filter(Boolean))];
  const locales = [...new Set(results.map((result) => result.locale))];

  const summary = JSON.stringify({
    phrases: ITEMS.length,
    native,
    fallback,
    missing,
    voiceNames,
    locales,
  });

  useEffect(() => {
    if (!finished) return;
    console.log(`[SwahiliVoiceAudit] ${summary}`);
  }, [finished, summary]);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        contentContainerStyle={{
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
          paddingHorizontal: 20,
          paddingTop: 52,
          paddingBottom: 48,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.replace('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Back to Settings"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <AppIcon name="chevBack" size={16} color={p.moss} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: p.moss }}>Settings</Text>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}>
          <View
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: p.honey,
              backgroundColor: p.isDark ? '#241A00' : '#FFF6D8',
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: p.honey }}>
              DEV ONLY
            </Text>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: p.muted }}>
            DEVICE AUDIT
          </Text>
        </View>

        <Text style={{ marginTop: 10, fontSize: 30, fontWeight: '800', color: p.ink }}>
          Swahili voice audit
        </Text>
        <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 21, fontWeight: '600', color: p.muted }}>
          Speaks every phrase in the new Swahili lessons as Livia and records the installed voice
          the device actually used. A native result needs a <Text style={{ fontWeight: '800' }}>sw</Text>{' '}
          locale; a related-language voice is reported as approximate.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          {[
            { label: 'PHRASES', value: `${results.length}/${ITEMS.length}`, color: p.ink },
            { label: 'NATIVE SW', value: String(native), color: p.moss },
            { label: 'APPROX', value: String(fallback), color: p.honey },
            { label: 'NO VOICE', value: String(missing), color: p.berry },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                minWidth: 128,
                flex: 1,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: p.line,
                backgroundColor: p.surface,
                padding: 12,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: p.muted }}>
                {stat.label}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 24, fontWeight: '800', color: stat.color }}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{
            marginTop: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: p.line,
            backgroundColor: p.surfaceAlt,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 11, lineHeight: 17, fontWeight: '700', color: p.muted }}>
            Locales: {locales.length > 0 ? locales.join(', ') : '—'}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 17, fontWeight: '700', color: p.muted }}>
            Voices: {voiceNames.length > 0 ? voiceNames.join(', ') : '—'}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 17, fontWeight: '700', color: p.stone }}>
            Runs once on open · {running ? 'auditing…' : finished ? 'complete' : 'starting…'}
          </Text>
        </View>

        <Pressable
          onPress={() => void run()}
          disabled={running}
          accessibilityRole="button"
          accessibilityLabel={running ? 'Auditing Swahili voices' : 'Run Swahili voice audit'}
          style={{
            marginTop: 16,
            alignItems: 'center',
            borderRadius: 16,
            backgroundColor: running ? p.line : p.moss,
            paddingVertical: 14,
            opacity: running ? 0.65 : 1,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 0.8, color: p.isDark ? '#04120A' : '#FFFFFF' }}>
            {running ? 'AUDITING…' : 'RUN AGAIN'}
          </Text>
        </Pressable>

        <View style={{ marginTop: 18, gap: 10 }}>
          {ITEMS.map((item) => {
            const row = rows[item.key] ?? { status: 'pending' as const };
            const result = row.status === 'done' ? row.result : null;
            const ok = result?.matchedVoice === true;
            const approximate = result ? !result.matchedVoice && result.approximate : false;
            const color = ok ? p.moss : approximate ? p.honey : result ? p.berry : p.stone;
            return (
              <View
                key={item.key}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: p.line,
                  backgroundColor: p.surface,
                  padding: 13,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ flex: 1, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: p.stone }}>
                    {item.lesson.toUpperCase()} · Q{item.question}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color }}>
                    {row.status === 'speaking'
                      ? 'SPEAKING'
                      : row.status === 'done'
                        ? ok
                          ? 'NATIVE SW'
                          : approximate
                            ? 'APPROXIMATE'
                            : 'NO VOICE'
                        : row.status === 'pending'
                          ? 'WAITING'
                          : 'IDLE'}
                  </Text>
                </View>
                <Text style={{ marginTop: 5, fontSize: 15, lineHeight: 21, fontWeight: '800', color: p.ink }}>
                  {item.phrase}
                </Text>
                {result ? (
                  <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 16, fontWeight: '700', color: p.muted }}>
                    {result.locale} · {result.voiceName ?? 'engine default'}
                    {result.spoken ? '' : ' · speech did not start'}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <Text style={{ marginTop: 14, fontSize: 10, fontWeight: '700', color: p.stone }}>
          /dev/swahili-voice-audit · hidden outside development builds
        </Text>
      </ScrollView>
      <StatusBar style={p.isDark ? 'light' : 'dark'} />
    </View>
  );
}

export default function SwahiliVoiceAuditRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <AuditContent />;
}
