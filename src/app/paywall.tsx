import { useCallback, useEffect, useState } from 'react';
import { View, Pressable, ScrollView, Alert, ActivityIndicator, Platform, Linking } from 'react-native';
import Text from '../../components/ui/Text';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import {
  refreshPremiumStatus,
  setDebugPremium,
  getOfferingsSafe,
  purchasePackageSafe,
  restorePurchasesSafe,
  purchasesAvailable,
  DEBUG_PREMIUM_UNLOCK,
  PREMIUM_ENTITLEMENT,
  PREMIUM_PRICE_LABEL,
  PREMIUM_PRODUCT_IDS,
  PREMIUM_OFFERING_ID,
} from '../../lib/purchases';
import BrandMark from '../../components/BrandMark';
import AppIcon, { type AppIconName } from '../../components/AppIcon';

const isWebBilling = Platform.OS === 'web';
const WEB_BILLING_KEY = process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY ?? '';

// RevenueCat *Web Billing* (Stripe) — website only, never loads on native.
let webInstance: any = null;
let webConfiguredFor: string | null = null;
async function webPurchases(appUserId: string): Promise<any> {
  const mod: any = await import('@revenuecat/purchases-js');
  const P = mod.Purchases ?? mod.default?.Purchases ?? mod.default;
  if (!webInstance) {
    P.configure(WEB_BILLING_KEY, appUserId);
    webInstance = typeof P.getSharedInstance === 'function' ? P.getSharedInstance() : P.getInstance();
    webConfiguredFor = appUserId;
  } else if (webConfiguredFor !== appUserId && typeof webInstance.changeUser === 'function') {
    await webInstance.changeUser(appUserId);
    webConfiguredFor = appUserId;
  }
  return webInstance;
}
function webEntitled(info: any): boolean {
  return info?.entitlements?.active?.[PREMIUM_ENTITLEMENT] != null;
}

export default function Paywall() {
  const [pkg, setPkg] = useState<any>(null);
  const [price, setPrice] = useState(PREMIUM_PRICE_LABEL);
  const [busy, setBusy] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [debugOn, setDebugOn] = useState(false);

  const sync = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (isWebBilling && WEB_BILLING_KEY) {
      try {
        const inst = await webPurchases(user.id);
        const offerings = await inst.getOfferings();
        const offering = offerings.all?.[PREMIUM_OFFERING_ID] ?? offerings.current;
        const pkgs: any[] = offering?.availablePackages ?? [];
        const monthly =
          pkgs.find((p) => String(p.identifier ?? '').toLowerCase().includes('monthly')) ??
          pkgs[0] ??
          null;
        if (monthly) {
          setPkg(monthly);
          setPrice(
            monthly?.product?.priceString ??
              monthly?.product?.price?.formatted ??
              PREMIUM_PRICE_LABEL
          );
        }
        const info = await inst.getCustomerInfo();
        const entitled = webEntitled(info);
        if (entitled) {
          await supabase.from('profiles').update({ is_premium: true }).eq('id', user.id);
          setIsPremium(true);
        } else {
          setIsPremium(await refreshPremiumStatus(user.id).catch(() => false));
        }
      } catch (e) {
        console.warn('Web offerings failed (Web Billing not configured?):', e);
        setIsPremium(await refreshPremiumStatus(user.id).catch(() => false));
      }
      return;
    }
    if (!purchasesAvailable()) {
      setStoreError('Store billing is not available in this build (Expo Go / web preview / emulator without Play Store). Install the dev build (npx expo run:android) or use the debug unlock below — real subscriptions need a store build + RevenueCat keys.');
      setIsPremium(await refreshPremiumStatus(user.id).catch(() => false));
      return;
    }
    const { offering, error } = await getOfferingsSafe();
    if (error) {
      setStoreError(error);
    } else if (offering) {
      const platformProductId =
        Platform.OS === 'android' ? PREMIUM_PRODUCT_IDS.android : PREMIUM_PRODUCT_IDS.ios;
      const monthly =
        offering?.availablePackages?.find((p: any) => p.product.identifier === platformProductId) ??
        offering?.monthly ??
        offering?.availablePackages?.find((p: any) => p.identifier.includes('monthly')) ??
        offering?.availablePackages?.[0] ??
        null;
      if (monthly) {
        setPkg(monthly);
        setPrice(monthly.product.priceString);
        setStoreError(null);
      } else {
        setStoreError('Offering loaded but no monthly package found — attach `bolingo_premium_monthly` to the `default` offering in RevenueCat.');
      }
    }
    setIsPremium(await refreshPremiumStatus(user.id).catch(() => false));
  }, []);

  useEffect(() => {
    sync();
  }, [sync]);

  useFocusEffect(
    useCallback(() => {
      sync();
    }, [sync])
  );

  const afterChange = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setIsPremium(await refreshPremiumStatus(user.id).catch(() => false));
  };

  const buy = async () => {
    if (isWebBilling && WEB_BILLING_KEY) {
      if (!pkg) {
        Alert.alert('Store not ready', 'Connect RevenueCat Web Billing first (see README), or use the debug unlock below.');
        return;
      }
      setBusy(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const inst = await webPurchases(user.id);
        const { customerInfo } = await inst.purchase({
          rcPackage: pkg,
          customerEmail: user.email ?? undefined,
        });
        if (webEntitled(customerInfo)) {
          await supabase.from('profiles').update({ is_premium: true }).eq('id', user.id);
          setIsPremium(true);
          Alert.alert('Welcome to Premium', 'PDF/audio uploads, elite voices, and unlimited hearts are yours.');
          router.replace('/');
        }
      } catch (e: unknown) {
        const msg = String((e as Error)?.message ?? e);
        if (/cancel/i.test(msg)) return;
        Alert.alert('Purchase failed', msg);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!pkg) {
      Alert.alert('Store not ready', storeError ?? 'Connect RevenueCat + store products first (see docs/paywall-setup.md), or use the debug unlock below.');
      return;
    }
    setBusy(true);
    try {
      const res = await purchasePackageSafe(pkg);
      if (res.cancelled) return;
      if (res.error) {
        Alert.alert('Purchase failed', res.error);
        return;
      }
      if (res.entitled) {
        await afterChange();Alert.alert('Welcome to Premium', 'PDF/audio uploads, elite voices, and unlimited hearts are yours.');
          router.replace('/');
      } else {
        Alert.alert('Purchase finished', 'The store finished but Premium is not active yet — tap Restore purchases.');
      }
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (isWebBilling && WEB_BILLING_KEY) {
      setBusy(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const inst = await webPurchases(user.id);
        const info = await inst.getCustomerInfo();
        const entitled = webEntitled(info);
        await supabase.from('profiles').update({ is_premium: entitled }).eq('id', user.id);
        setIsPremium(entitled);
        Alert.alert(
          entitled ? 'Restored' : 'No subscription found',
          entitled
            ? 'Premium restored on this account.'
            : 'No Premium subscription found for this account yet.'
        );
      } catch (e) {
        Alert.alert('Restore failed', String((e as Error).message ?? e));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert('Native only', 'Purchases restore from the App Store / Play Store inside the mobile app.');
      return;
    }
    setBusy(true);
    try {
      const res = await restorePurchasesSafe();
      if (res.error) {
        Alert.alert('Restore failed', res.error);
        return;
      }
      await afterChange();
      const entitled = res.entitled === true || (await refreshPremiumStatus((await supabase.auth.getUser()).data.user?.id ?? '').catch(() => false));
      setIsPremium(entitled);
      Alert.alert(
        entitled ? 'Restored' : 'No subscription found',
        entitled
          ? 'Premium restored on this account.'
          : 'No Premium subscription found for this account yet. If you paid on another account/store, sign into that one first.'
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleDebug = async () => {
    const next = !debugOn;
    setDebugOn(next);
    setDebugPremium(next);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ is_premium: next }).eq('id', user.id);
      setIsPremium(next);
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md flex-grow items-center self-center px-4 py-8" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <BrandMark />
      <View className="mt-2 h-20 w-20 items-center justify-center rounded-full bg-amber-400">
        <AppIcon name="crown" size={40} color="#FFFFFF" />
      </View>
      <Text className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">Go Premium</Text>
      <Text className="mt-1 text-center text-base text-slate-500 dark:text-slate-400">
        PDF & audio uploads, ultra-smart AI lessons, soothing human-like audiobooks.
      </Text>

      {/* Free vs Premium — the Duolingo Super-comparison pattern. */}
      <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <View className="flex-row">
          <Text className="flex-1" />
          <Text className="w-16 text-center text-xs font-extrabold text-slate-400 dark:text-slate-500">FREE</Text>
          <View className="w-16 flex-row items-center justify-center gap-0.5">
            <AppIcon name="crown" size={13} color="#D97706" />
            <Text className="text-xs font-extrabold text-amber-600 dark:text-amber-400">PRO</Text>
          </View>
        </View>        {(
          [
            ['heart', 'Hearts', '5 / day', 'Unlimited'],
            ['doc', 'Uploads', 'Text files', 'PDF + audio'],
            ['camera', 'Scan notes', '—', 'Included'],
            ['volume', 'Voices', 'Device voice', 'Elite voices'],
            ['robot', 'AI words', '1k / day', '100k / month'],
            ['chat', 'Roleplay', 'Locked', 'Included'],
          ] as Array<[AppIconName, string, string, string]>
        ).map(([icon, label, free, pro]) => (
          <View key={label} className="mt-1.5 flex-row items-center border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <AppIcon name={icon} size={16} color="#64748B" />
            <Text className="ml-1.5 flex-1 text-sm font-bold text-slate-700 dark:text-slate-300">{label}</Text>
            <Text className="w-16 text-center text-xs text-slate-400 dark:text-slate-500">{free}</Text>
            <Text className="w-16 text-center text-xs font-extrabold text-slate-800 dark:text-slate-200">{pro}</Text>
          </View>
        ))}
      </View>

      {storeError && !isPremium ? (
        <View className="mt-4 w-full max-w-sm rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
          <View className="flex-row items-start gap-1.5">
            <AppIcon name="alert" size={16} color="#64748B" />
            <Text className="flex-1 text-sm font-bold text-slate-600 dark:text-slate-400">{storeError}</Text>
          </View>
        </View>
      ) : null}

      {isPremium ? (
        <View className="mt-6 w-full max-w-sm items-center rounded-3xl bg-amber-100 dark:bg-amber-950 p-5">
          <View className="flex-row items-center justify-center gap-1.5">
            <AppIcon name="checkCircle" size={22} color="#B45309" />
            <Text className="text-lg font-extrabold text-amber-700 dark:text-amber-300">Premium active</Text>
          </View>
          <Text className="mt-1 text-center text-sm text-amber-800/80">
            Cancel anytime in your store subscriptions — you keep Premium until the period ends.
          </Text>
          <Pressable
            onPress={() =>
              Linking.openURL(
                Platform.OS === 'ios'
                  ? 'https://apps.apple.com/account/subscriptions'
                  : 'https://play.google.com/store/account/subscriptions'
              ).catch(() => Alert.alert('Open your store', 'App Store → Account → Subscriptions (iOS) or Play Store → Payments → Subscriptions (Android).'))
            }
            className="mt-3 w-full items-center rounded-2xl bg-white dark:bg-slate-900 py-3"
          >
            <Text className="font-bold text-slate-800 dark:text-slate-200">Manage subscription</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/')} className="mt-2 w-full items-center rounded-2xl bg-slate-900 py-3">
            <Text className="font-bold text-white">Back to learning</Text>
          </Pressable>
        </View>
      ) : isWebBilling && !WEB_BILLING_KEY ? (
        <View className="mt-6 w-full max-w-sm items-center rounded-3xl bg-slate-900 p-5">
          <View className="flex-row items-center justify-center gap-2">
            <AppIcon name="phone" size={22} color="#FFFFFF" />
            <Text className="text-center text-lg font-extrabold text-white">Subscribe in the mobile app</Text>
          </View>
          <Text className="mt-2 text-center text-sm text-slate-300 dark:text-slate-200">
            Web checkout isn't enabled yet (no RevenueCat Web Billing key). The App Store / Play Store handle
            billing — open Bolingo in the Android/iOS app or dev build to subscribe.
          </Text>
        </View>
      ) : (
        <View className="mt-6 w-full max-w-sm rounded-3xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-5">
          <Text className="text-lg font-bold text-slate-800 dark:text-slate-200">Premium Monthly</Text>
          <Text className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{price}</Text>
          <Text className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            • PDF & audio uploads{'\n'}• Scan notes — Bingo curates revision nodes{'\n'}• Elite ElevenLabs/OpenAI voices{'\n'}• 100k AI words/month{'\n'}• Unlimited hearts
          </Text>
          <Pressable
            onPress={buy}
            disabled={busy}
            className={`mt-4 items-center rounded-2xl py-4 ${busy ? 'bg-slate-300' : 'bg-amber-500'}`}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-lg font-extrabold text-white">{pkg ? `Subscribe — ${price}` : 'Subscribe'}</Text>}
          </Pressable>
          <Pressable onPress={restore} disabled={busy} className="mt-2 items-center">
            <Text className="font-bold text-slate-500 dark:text-slate-400">Restore purchases</Text>
          </Pressable>
        </View>
      )}

      {__DEV__ && (
        <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-4">
          <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Device-test backdoor {DEBUG_PREMIUM_UNLOCK ? '(env enabled)' : '(env off — toggle below is local only)'}
          </Text>
          <Pressable onPress={toggleDebug} className="mt-2 items-center rounded-2xl bg-slate-800 py-3">
            <Text className="font-bold text-white">{debugOn ? 'Disable debug premium' : 'Enable debug premium'}</Text>
          </Pressable>
        </View>
      )}

      <Pressable onPress={() => router.replace('/')} className="mt-4 items-center">
        <Text className="font-bold text-slate-400 dark:text-slate-500">Not now</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
