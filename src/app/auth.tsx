import { useCallback, useEffect, useState } from 'react';
import { View, Pressable, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import Text from '../../components/ui/Text';
import TextInput from '../../components/ui/TextInput';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../../lib/supabase';
import { getProfile, type Profile } from '../../lib/progress';
import { claimPendingGuestResult } from '../../lib/onboarding';
import BrandMark from '../../components/BrandMark';
import AppIcon from '../../components/AppIcon';
import LearnerAvatar from '../../components/LearnerAvatar';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({ scheme: 'bolingo-learn', path: 'auth' });

export default function Auth() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      // Google (or email) identity for the account card — name/photo already
      // land in `profiles` via getProfile's OAuth backfill; email lives on
      // the auth user, so read it here.
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setAccountEmail(user?.email ?? null);
      } catch {
        setAccountEmail(null);
      }
      // Profile-second payoff: rescue any guest XP earned before signup.
      // Runs on every auth resume (email, Google web/native) — the claim is
      // one-shot (cleared after success) so repeats are harmless.
      if (p) {
        const claimed = await claimPendingGuestResult(p.id);
        if (claimed) setMsg(`Welcome! Your +${claimed.xpEarned} guest XP was saved to this account.`);
      }
    } catch {
      setProfile(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Web OAuth return: supabase-js init can miss the implicit-flow fragment
  // (client created before redirect / init race), so consume it explicitly —
  // same setSession logic as the native popup path — and stay subscribed.
  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !cancelled) refresh();
    });
    (async () => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') return;
      if (!window.location.hash.includes('access_token')) return;
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token) return;
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error || cancelled) return;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      await refresh();
    })();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  // Password-recovery return: the reset email links back with a ?code=…
  // PKCE grant — exchange it for a session so the user lands signed in
  // and can set a new password in the card below (no extra screen).
  useEffect(() => {
    let cancelled = false;
    const handle = async (url: string | null) => {
      if (!url || !url.includes('code=')) return;
      try {
        const m = url.match(/[?&]code=([^&]+)/);
        if (!m) return;
        const { error } = await supabase.auth.exchangeCodeForSession(decodeURIComponent(m[1]));
        if (error || cancelled) return;
        await refresh();
      } catch {
        /* ignore malformed links */
      }
    };
    void Linking.getInitialURL().then((u) => {
      if (!cancelled) void handle(u);
    });
    const sub = Linking.addEventListener('url', ({ url }) => void handle(url));
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [refresh]);

  const submit = async () => {
    if (!email.includes('@') || password.length < 6) {
      setMsg('Enter a valid email and a 6+ character password.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { error } =
        mode === 'in'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      await refresh();
      const p = await getProfile();
      setProfile(p);
      if (p) {
        router.replace('/');
      } else {
        setMsg('Check your inbox to confirm your email, then sign in.');
      }
    } catch (e) {
      setMsg(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!email.includes('@')) {
      setMsg('Enter your email above first, then tap Forgot password.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const redirect = Platform.OS === 'web' ? makeRedirectUri({ path: 'auth' }) : redirectTo;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect });
      if (error) throw error;
      setMsg('Reset link sent — check your inbox (and spam), open it, then set a new password.');
    } catch (e) {
      setMsg(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const changePw = async () => {
    if (newPw.length < 6) {
      setPwMsg('New password must be 6+ characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg('Passwords do not match.');
      return;
    }
    setPwBusy(true);
    setPwMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setNewPw('');
      setConfirmPw('');
      setPwMsg('Password updated.');
    } catch (e) {
      setPwMsg(String(e instanceof Error ? e.message : e));
    } finally {
      setPwBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    setMsg(null);
    try {
      // Web has no popup/custom-scheme to return to: use a full-page redirect
      // and let supabase-js (detectSessionInUrl) resume the session on return.
      if (Platform.OS === 'web') {
        const webRedirect = makeRedirectUri({ path: 'auth' });
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: webRedirect },
        });
        if (error) throw error;
        return; // browser is navigating to Google; session resumes on return
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) throw error ?? new Error('Could not start Google sign-in.');
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success' || !res.url) {
        if (res.type !== 'cancel' && res.type !== 'dismiss') setMsg('Google sign-in did not complete.');
        return;
      }
      // Newer Supabase returns a PKCE ?code=… grant; older setups return
      // tokens in the #access_token fragment — accept either.
      const codeMatch = res.url.match(/[?&]code=([^&]+)/);
      if (codeMatch) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(decodeURIComponent(codeMatch[1]));
        if (codeError) throw codeError;
      } else {
        const hash = res.url.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (!access_token || !refresh_token) throw new Error('Google returned no session — is the provider enabled in Supabase? (Dashboard → Authentication → Providers → Google)');
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
        if (sessionError) throw sessionError;
      }
      const p = await getProfile();
      setProfile(p);
      if (p) router.replace('/');
    } catch (e) {
      setMsg(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setEmail('');
    setPassword('');
    Alert.alert('Signed out', 'You are now playing as a guest.');
  };

  if (profile) {
    return (
      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md flex-grow items-center self-center px-4 py-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <BrandMark />
        <View className="mt-2" />
        <LearnerAvatar uri={profile.avatar_url} size={80} />
        <Text className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{profile.username ?? 'Your account'}</Text>
        {accountEmail ? <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{accountEmail}</Text> : null}
        <View className="mt-6 w-full max-w-sm rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
          <View className="mt-2 flex-row items-center justify-center gap-3">
            <View className="flex-row items-center gap-1">
              <AppIcon name="zap" size={15} color="#F59E0B" />
              <Text className="text-base font-bold text-slate-600 dark:text-slate-400">{profile.xp} XP</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <AppIcon name="flame" size={15} color="#F97316" />
              <Text className="text-base font-bold text-slate-600 dark:text-slate-400">{profile.streak_count}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <AppIcon name="heart" size={15} color="#EF4444" />
              <Text className="text-base font-bold text-slate-600 dark:text-slate-400">{profile.hearts}</Text>
            </View>
          </View>
          <View className="mt-1 flex-row items-center justify-center gap-1">
            {profile.is_premium ? <AppIcon name="crown" size={16} color="#D97706" /> : null}
            <Text className="text-base text-slate-600 dark:text-slate-400">{profile.is_premium ? 'Premium active' : 'Free tier'}</Text>
          </View>
        </View>
        <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="key" size={18} color="#0F172A" />
            <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">Reset password</Text>
          </View>
          <TextInput
            value={newPw}
            onChangeText={setNewPw}
            placeholder="New password (6+ characters)"
            secureTextEntry
            className="mt-3 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-base text-slate-900 dark:text-slate-100"
          />
          <TextInput
            value={confirmPw}
            onChangeText={setConfirmPw}
            placeholder="Confirm new password"
            secureTextEntry
            className="mt-2 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-base text-slate-900 dark:text-slate-100"
          />
          <Pressable
            onPress={changePw}
            disabled={pwBusy}
            className={`mt-3 items-center rounded-2xl py-3 ${pwBusy ? 'bg-slate-300' : 'bg-slate-900'}`}
          >
            {pwBusy ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Update password</Text>}
          </Pressable>
          {pwMsg ? <Text className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">{pwMsg}</Text> : null}
        </View>
        <Pressable onPress={signOut} className="mt-4 w-full max-w-sm items-center rounded-2xl bg-slate-800 py-3">
          <Text className="font-bold text-white">Sign out</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/')} className="mt-2 items-center">
          <Text className="font-bold text-slate-400 dark:text-slate-500">Back to Path</Text>
        </Pressable>
        <StatusBar style="auto" />
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md flex-grow items-center self-center px-4 py-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <BrandMark />
      <View className="mt-2 h-16 w-16 items-center justify-center rounded-full bg-slate-900">
        <AppIcon name="lock" size={30} color="#FFFFFF" />
      </View>
      <Text className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{mode === 'in' ? 'Welcome back' : 'Create account'}</Text>
      <Text className="mt-1 text-center text-base text-slate-500 dark:text-slate-400">
        Sign in to sync XP, upload study material, and keep your streak on every device.
      </Text>

      <View className="mt-6 w-full max-w-sm flex-row rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
        {(['in', 'up'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m);
              setMsg(null);
            }}
            className={`flex-1 items-center rounded-xl py-2 ${mode === m ? 'bg-white dark:bg-slate-900 shadow' : ''}`}
          >
            <Text className={`font-bold ${mode === m ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
              {m === 'in' ? 'Sign in' : 'Sign up'}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        className="mt-4 w-full max-w-sm rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-base text-slate-900 dark:text-slate-100"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password (6+ characters)"
        secureTextEntry
        className="mt-3 w-full max-w-sm rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-base text-slate-900 dark:text-slate-100"
      />

      <Pressable
        onPress={submit}
        disabled={busy}
        className={`mt-4 w-full max-w-sm items-center rounded-2xl py-4 ${busy ? 'bg-slate-300' : 'bg-green-500'}`}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-lg font-extrabold text-white">{mode === 'in' ? 'Sign in' : 'Create account'}</Text>}
      </Pressable>
      {msg ? <Text className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">{msg}</Text> : null}

      <Pressable onPress={sendReset} disabled={busy} className="mt-2 items-center">
        <Text className="font-bold text-sky-600 dark:text-sky-400">Forgot password?</Text>
      </Pressable>

      <View className="mt-4 w-full max-w-sm flex-row items-center gap-2">
        <View className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">OR</Text>
        <View className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </View>

      <Pressable
        onPress={signInWithGoogle}
        disabled={busy}
        className="mt-4 w-full max-w-sm flex-row items-center justify-center rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3.5"
      >
        <View className="mr-2"><AppIcon name="google" size={20} color="#4285F4" /></View>
        <Text className="text-base font-bold text-slate-800 dark:text-slate-200">Continue with Google</Text>
      </Pressable>

      <Pressable onPress={() => router.replace('/')} className="mt-4 items-center">
        <Text className="font-bold text-slate-400 dark:text-slate-500">Continue as guest →</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
