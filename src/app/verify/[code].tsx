import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Text from '../../../components/ui/Text';
import AppIcon from '../../../components/AppIcon';
import BrandMark from '../../../components/BrandMark';
import { CREDENTIAL_CODE, verifyCredential, type Credential } from '../../../lib/credentials';
import { credentialUrl } from '../../../lib/api';

/**
 * Public credential verification: bolingo.co.ke/verify/ABC-DEF-GHJ.
 * Anyone (an employer, a teacher) can open it without an account. The
 * record comes from the server, which only issued it after re-checking that
 * every project in the track was passed.
 */
type State = { kind: 'loading' } | { kind: 'ok'; cred: Credential } | { kind: 'error'; message: string };

export default function VerifyCredential() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').toUpperCase();
  const valid = CREDENTIAL_CODE.test(code);
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!valid) return;
    let alive = true;
    verifyCredential(code)
      .then((cred) => alive && setState({ kind: 'ok', cred }))
      .catch((e) => alive && setState({ kind: 'error', message: e instanceof Error ? e.message : 'Could not check this credential.' }));
    return () => {
      alive = false;
    };
  }, [code, valid]);

  const view: State = valid ? state : { kind: 'error', message: 'That is not a valid credential code. Codes look like ABC-DEF-GHJ.' };

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerClassName="mx-auto w-full max-w-md items-center self-center px-5 py-10"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <StatusBar style="auto" />
      <BrandMark />
      <Text className="mt-2 text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        Credential verification
      </Text>

      {view.kind === 'loading' ? (
        <View className="mt-10 items-center">
          <ActivityIndicator />
          <Text className="mt-3 text-sm text-slate-500 dark:text-slate-400">Checking {code}…</Text>
        </View>
      ) : view.kind === 'error' ? (
        <View className="mt-8 w-full rounded-3xl border-2 border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950">
          <View className="flex-row items-center gap-2">
            <AppIcon name="xCircle" size={22} color="#DC2626" />
            <Text className="text-lg font-extrabold text-red-800 dark:text-red-200">Not verified</Text>
          </View>
          <Text className="mt-2 text-sm leading-5 text-red-700 dark:text-red-300">{view.message}</Text>
        </View>
      ) : (
        <View
          className={`mt-8 w-full rounded-3xl border-2 p-6 ${
            view.cred.revoked
              ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
              : 'border-emerald-300 bg-white dark:border-emerald-800 dark:bg-slate-900'
          }`}
        >
          <View className="flex-row items-center gap-2">
            <AppIcon
              name={view.cred.revoked ? 'xCircle' : 'checkCircle'}
              size={24}
              color={view.cred.revoked ? '#DC2626' : '#059669'}
            />
            <Text
              className={`text-base font-extrabold ${
                view.cred.revoked ? 'text-red-800 dark:text-red-200' : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {view.cred.revoked ? 'This credential was revoked' : 'Verified by Bolingo Learn'}
            </Text>
          </View>
          <Text className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Awarded to</Text>
          <Text className="font-duo text-2xl font-extrabold text-slate-900 dark:text-slate-100">{view.cred.holderName}</Text>
          <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">Certification</Text>
          <Text className="font-duo text-xl font-extrabold text-slate-900 dark:text-slate-100">{view.cred.trackTitle}</Text>
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
              <Text className="text-xs text-slate-500 dark:text-slate-400">Projects passed</Text>
              <Text className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{view.cred.projectsPassed}</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
              <Text className="text-xs text-slate-500 dark:text-slate-400">Issued</Text>
              <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {new Date(view.cred.issuedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
          <Text className="mt-4 text-xs leading-4 text-slate-500 dark:text-slate-400">
            Issued only after every project in this track passed its automated checks in the learner&apos;s Bolingo account.
          </Text>
          <Text className="mt-2 text-xs font-bold text-slate-400">{credentialUrl(view.cred.code).replace(/^https?:\/\//, '')}</Text>
        </View>
      )}

      <Pressable onPress={() => router.replace('/')} accessibilityRole="button" className="mt-8">
        <Text className="font-bold text-sky-600 dark:text-sky-400">Learn on Bolingo →</Text>
      </Pressable>
    </ScrollView>
  );
}
