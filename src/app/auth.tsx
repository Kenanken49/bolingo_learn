import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../../lib/supabase';
import { getProfile, type Profile } from '../../lib/progress';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({ scheme: 'bolingo-learn', path: 'auth' });

export default function Auth() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProfile(await getProfile());
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
      // Supabase returns tokens in the URL fragment: #access_token=…&refresh_token=…
      const hash = res.url.split('#')[1] ?? '';
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token) throw new Error('Google returned no session — is the provider enabled in Supabase?');
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sessionError) throw sessionError;
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
      <ScrollView contentContainerClassName="flex-grow items-center bg-white px-6 py-12">
        <Text className="text-5xl">👤</Text>
        <Text className="mt-2 text-2xl font-extrabold text-slate-900">Your account</Text>
        <View className="mt-6 w-full max-w-sm rounded-3xl border-2 border-slate-200 bg-slate-50 p-5">
          <Text className="text-base text-slate-600">Signed in</Text>
          <Text className="text-lg font-bold text-slate-900">{profile.id.slice(0, 8)}…</Text>
          <Text className="mt-2 text-base text-slate-600">
            ⚡ {profile.xp} XP • 🔥 {profile.streak_count} • ❤ {profile.hearts}
          </Text>
          <Text className="text-base text-slate-600">{profile.is_premium ? '👑 Premium active' : 'Free tier'}</Text>
        </View>
        <Pressable onPress={signOut} className="mt-4 w-full max-w-sm items-center rounded-2xl bg-slate-800 py-3">
          <Text className="font-bold text-white">Sign out</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/')} className="mt-2 items-center">
          <Text className="font-bold text-slate-400">Back to Path</Text>
        </Pressable>
        <StatusBar style="auto" />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerClassName="flex-grow items-center bg-white px-6 py-12">
      <Text className="text-5xl">🔐</Text>
      <Text className="mt-2 text-2xl font-extrabold text-slate-900">{mode === 'in' ? 'Welcome back' : 'Create account'}</Text>
      <Text className="mt-1 text-center text-base text-slate-500">
        Sign in to sync XP, upload study material, and keep your streak on every device.
      </Text>

      <View className="mt-6 w-full max-w-sm flex-row rounded-2xl bg-slate-100 p-1">
        {(['in', 'up'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m);
              setMsg(null);
            }}
            className={`flex-1 items-center rounded-xl py-2 ${mode === m ? 'bg-white shadow' : ''}`}
          >
            <Text className={`font-bold ${mode === m ? 'text-slate-900' : 'text-slate-400'}`}>
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
        className="mt-4 w-full max-w-sm rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password (6+ characters)"
        secureTextEntry
        className="mt-3 w-full max-w-sm rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
      />

      <Pressable
        onPress={submit}
        disabled={busy}
        className={`mt-4 w-full max-w-sm items-center rounded-2xl py-4 ${busy ? 'bg-slate-300' : 'bg-green-500'}`}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-lg font-extrabold text-white">{mode === 'in' ? 'Sign in' : 'Create account'}</Text>}
      </Pressable>
      {msg ? <Text className="mt-2 text-center text-sm text-slate-500">{msg}</Text> : null}

      <View className="mt-4 w-full max-w-sm flex-row items-center gap-2">
        <View className="h-px flex-1 bg-slate-200" />
        <Text className="text-xs font-bold text-slate-400">OR</Text>
        <View className="h-px flex-1 bg-slate-200" />
      </View>

      <Pressable
        onPress={signInWithGoogle}
        disabled={busy}
        className="mt-4 w-full max-w-sm flex-row items-center justify-center rounded-2xl border-2 border-slate-200 bg-white py-3.5"
      >
        <Text className="mr-2 text-lg font-extrabold text-slate-700">G</Text>
        <Text className="text-base font-bold text-slate-800">Continue with Google</Text>
      </Pressable>

      <Pressable onPress={() => router.replace('/')} className="mt-4 items-center">
        <Text className="font-bold text-slate-400">Continue as guest →</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
