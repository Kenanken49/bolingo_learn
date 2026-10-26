import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { supabase } from '../../lib/supabase';
import {
  configurePurchases,
  refreshPremiumStatus,
  setDebugPremium,
  DEBUG_PREMIUM_UNLOCK,
  PREMIUM_PRICE_LABEL,
  PREMIUM_PRODUCT_IDS,
  PREMIUM_OFFERING_ID,
} from '../../lib/purchases';

export default function Paywall() {
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [price, setPrice] = useState(PREMIUM_PRICE_LABEL);
  const [busy, setBusy] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [debugOn, setDebugOn] = useState(false);

  const sync = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    configurePurchases();
    try {
      const offerings = await Purchases.getOfferings();
      const offering = offerings.all[PREMIUM_OFFERING_ID] ?? offerings.current;
      const platformProductId =
        Platform.OS === 'android' ? PREMIUM_PRODUCT_IDS.android : PREMIUM_PRODUCT_IDS.ios;
      const monthly =
        offering?.availablePackages.find((p) => p.product.identifier === platformProductId) ??
        offering?.monthly ??
        offering?.availablePackages.find((p) => p.identifier.includes('monthly')) ??
        offering?.availablePackages[0] ??
        null;
      if (monthly) {
        setPkg(monthly);
        setPrice(monthly.product.priceString);
      }
    } catch (e) {
      console.warn('Offerings failed (store not configured?):', e);
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
    if (!pkg) {
      Alert.alert('Store not ready', 'Connect RevenueCat + store products first (see README), or use the debug unlock below.');
      return;
    }
    setBusy(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['premium']) {
        await afterChange();
        Alert.alert('Welcome to Premium 👑', 'PDF/audio uploads, elite voices, and unlimited hearts are yours.');
        router.back();
      }
    } catch (e: unknown) {
      if ((e as { userCancelled?: boolean }).userCancelled) return;
      Alert.alert('Purchase failed', String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      await Purchases.restorePurchases();
      await afterChange();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } catch (e) {
      Alert.alert('Restore failed', String((e as Error).message ?? e));
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
    <ScrollView contentContainerClassName="flex-grow items-center bg-white px-6 py-12">
      <Text className="text-5xl">👑</Text>
      <Text className="mt-2 text-2xl font-extrabold text-slate-900">Go Premium</Text>
      <Text className="mt-1 text-center text-base text-slate-500">
        PDF & audio uploads, ultra-smart AI lessons, soothing human-like audiobooks.
      </Text>

      {isPremium ? (
        <View className="mt-6 w-full max-w-sm items-center rounded-3xl bg-amber-100 p-5">
          <Text className="text-lg font-extrabold text-amber-700">✅ Premium active</Text>
          <Pressable onPress={() => router.back()} className="mt-3 w-full items-center rounded-2xl bg-slate-900 py-3">
            <Text className="font-bold text-white">Back to learning</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-6 w-full max-w-sm rounded-3xl border-2 border-amber-300 bg-amber-50 p-5">
          <Text className="text-lg font-bold text-slate-800">Premium Monthly</Text>
          <Text className="mt-1 text-3xl font-extrabold text-slate-900">{price}</Text>
          <Text className="mt-2 text-sm text-slate-600">
            • PDF & audio uploads{'\n'}• Elite ElevenLabs/OpenAI voices{'\n'}• 100k AI words/month{'\n'}• Unlimited hearts
          </Text>
          <Pressable
            onPress={buy}
            disabled={busy}
            className={`mt-4 items-center rounded-2xl py-4 ${busy ? 'bg-slate-300' : 'bg-amber-500'}`}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-lg font-extrabold text-white">Subscribe</Text>}
          </Pressable>
          <Pressable onPress={restore} disabled={busy} className="mt-2 items-center">
            <Text className="font-bold text-slate-500">Restore purchases</Text>
          </Pressable>
        </View>
      )}

      {__DEV__ && (
        <View className="mt-4 w-full max-w-sm rounded-3xl border-2 border-dashed border-slate-300 p-4">
          <Text className="text-sm font-bold text-slate-500">
            Device-test backdoor {DEBUG_PREMIUM_UNLOCK ? '(env enabled)' : '(env off — toggle below is local only)'}
          </Text>
          <Pressable onPress={toggleDebug} className="mt-2 items-center rounded-2xl bg-slate-800 py-3">
            <Text className="font-bold text-white">{debugOn ? 'Disable debug premium' : 'Enable debug premium'}</Text>
          </Pressable>
        </View>
      )}

      <Pressable onPress={() => router.back()} className="mt-4 items-center">
        <Text className="font-bold text-slate-400">Not now</Text>
      </Pressable>
      <StatusBar style="auto" />
    </ScrollView>
  );
}
