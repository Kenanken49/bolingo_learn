import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Text from '../../components/ui/Text';
import TextInput from '../../components/ui/TextInput';
import AppIcon from '../../components/AppIcon';
import BrandMark from '../../components/BrandMark';
import { sendFeedback } from '../../lib/api';
import { FEEDBACK_TOPICS, FEEDBACK_INBOX, SUPPORT_EMAIL, SUPPORT_PHONES } from '../../lib/support';

/**
 * Contact & feedback — bolingo.co.ke/contact on web, the same screen in the app.
 *
 * Two ways to reach a human: the published address and phone numbers, which
 * need nothing from this screen, and a form that POSTs to /api/feedback, which
 * stores the message in Postgres before attempting to email bolingolearn@pm.me.
 * So a learner is never told "sent" when it was only queued.
 */
const MIN_MESSAGE = 10;

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; delivery: string } | { kind: 'error'; message: string };

const mono = Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, monospace', default: 'monospace' });

function open(url: string) {
  Linking.openURL(url).catch(() => {});
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</Text>
      <View className="mt-1.5">{children}</View>
    </View>
  );
}

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('other');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const canSend = message.trim().length >= MIN_MESSAGE && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = useCallback(async () => {
    if (!canSend || status.kind === 'sending') return;
    setStatus({ kind: 'sending' });
    try {
      const result = await sendFeedback({
        name: name.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        topic,
        message: message.trim(),
        page: Platform.OS === 'web' ? '/contact' : 'app',
      });
      setStatus({ kind: 'done', delivery: result.delivery });
      setMessage('');
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Could not send that. Please email us instead.' });
    }
  }, [canSend, email, message, name, phone, status.kind, topic]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerClassName="mx-auto w-full max-w-xl self-center px-5 py-10"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style="auto" />
      <View className="items-center">
        <BrandMark />
        <Text className="mt-2 text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Contact & feedback
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-slate-500 dark:text-slate-400">
          Real people read every message. Tell us what broke, what confused you, or what you want next.
        </Text>
      </View>

      <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">Talk to support</Text>

        <Pressable
          onPress={() => open(`mailto:${SUPPORT_EMAIL}`)}
          accessibilityRole="link"
          accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
          className="mt-3 flex-row items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950"
        >
          <AppIcon name="mail" size={20} color="#0284C7" />
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{SUPPORT_EMAIL}</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">Email · replies within one working day</Text>
          </View>
          <AppIcon name="chevRight" size={16} color="#94A3B8" />
        </Pressable>

        {SUPPORT_PHONES.map((phoneEntry) => (
          <Pressable
            key={phoneEntry.dial}
            onPress={() => open(`tel:${phoneEntry.dial}`)}
            accessibilityRole="link"
            accessibilityLabel={`Call ${phoneEntry.label}`}
            className="mt-2 flex-row items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950"
          >
            <AppIcon name="phone" size={20} color="#0284C7" />
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-slate-900 dark:text-slate-100" style={{ fontFamily: mono }}>
                {phoneEntry.label}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">{phoneEntry.note}</Text>
            </View>
            <AppIcon name="chevRight" size={16} color="#94A3B8" />
          </Pressable>
        ))}

        <Text className="mt-3 text-xs leading-4 text-slate-400 dark:text-slate-500">
          Messages sent from this form are delivered to our support desk at {FEEDBACK_INBOX}. You do not need an account to write to us.
        </Text>
      </View>

      <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">Send a message</Text>

        <Field label="Your name (optional)">
          <TextInput value={name} onChangeText={setName} placeholder="Amina" autoCapitalize="words" maxLength={80} />
        </Field>
        <Field label="Email — so we can reply">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            maxLength={160}
          />
        </Field>
        <Field label="Phone (optional)">
          <TextInput value={phone} onChangeText={setPhone} placeholder="07…" keyboardType="phone-pad" maxLength={24} />
        </Field>

        <Field label="What is it about?">
          <View className="flex-row flex-wrap gap-2">
            {FEEDBACK_TOPICS.map((option) => {
              const active = option.id === topic;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setTopic(option.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`rounded-full px-3 py-1.5 ${active ? 'bg-sky-700' : 'bg-slate-100 dark:bg-slate-800'}`}
                >
                  <Text className={`text-xs font-extrabold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Message">
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="What happened, and what were you trying to do?"
            multiline
            numberOfLines={5}
            maxLength={4000}
            style={{ minHeight: 110, textAlignVertical: 'top' }}
          />
        </Field>

        <Pressable
          onPress={() => void submit()}
          disabled={!canSend || status.kind === 'sending'}
          accessibilityRole="button"
          accessibilityLabel="Send feedback"
          className={`mt-4 flex-row items-center justify-center gap-2 rounded-2xl py-3.5 ${
            canSend && status.kind !== 'sending' ? 'bg-sky-700' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <AppIcon name="mail" size={18} color="#FFFFFF" />
          <Text className="text-base font-extrabold text-white">
            {status.kind === 'sending' ? 'Sending…' : 'Send to support'}
          </Text>
        </Pressable>

        {status.kind === 'done' ? (
          <View className="mt-3 rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950">
            <Text className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">Message received.</Text>
            <Text className="mt-1 text-xs leading-4 text-emerald-700 dark:text-emerald-200">
              {status.delivery === 'stored'
                ? 'It is saved for the support team. Email us directly if it is urgent.'
                : 'It is on its way to the support team. We reply within one working day.'}
            </Text>
          </View>
        ) : null}

        {status.kind === 'error' ? (
          <View className="mt-3 rounded-2xl bg-rose-50 p-3 dark:bg-rose-950">
            <Text className="text-sm font-extrabold text-rose-800 dark:text-rose-300">That did not go through.</Text>
            <Text className="mt-1 text-xs leading-4 text-rose-700 dark:text-rose-200">{status.message}</Text>
            <Pressable onPress={() => open(`mailto:${SUPPORT_EMAIL}`)} accessibilityRole="link" className="mt-2">
              <Text className="text-xs font-extrabold text-rose-800 underline dark:text-rose-200">Email {SUPPORT_EMAIL}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View className="mt-6 flex-row items-center justify-center gap-4">
        <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
          <Text className="text-sm font-bold text-sky-700 dark:text-sky-400">Privacy policy</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/install')} accessibilityRole="link">
          <Text className="text-sm font-bold text-sky-700 dark:text-sky-400">Install the app</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
