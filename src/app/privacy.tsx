import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Text from '../../components/ui/Text';
import AppIcon from '../../components/AppIcon';
import BrandMark from '../../components/BrandMark';

/**
 * Public privacy policy: bolingo.co.ke/privacy.
 * Anyone can open it without an account — both stores require a live
 * privacy URL. Mirrors privacy-policy.md; update both together.
 */
const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Data we collect',
    body: 'Account data (email + sign-in identifiers via Supabase auth) to sync your XP, streaks, diamonds, lesson completions and premium status. Your uploads (text, PDF, scans, audio, video) are stored privately in your account and processed into lessons and audiobook narration — never published, shared or sold. Purchases: subscription status via RevenueCat; we never see card details. Ads: rewarded AdMob videos only, using Google\u2019s advertising identifier and standard ad-serving data, and only after you choose to watch one. On your device only: quiz answers, playback position, free-tier device-voice narration. We collect no analytics SDK data, no crash reports, no location, no contacts.',
  },
  {
    title: '2. Consent & control',
    body: 'Before any ad is requested we ask Google\u2019s consent management platform whether you consented — in regions where it applies you see a consent form, and declining means no ad is ever requested. Revisit the choice any time in Settings \u2192 Ad privacy options. Choosing \u201cwait for a free refill\u201d or Premium never contacts an ad server at all. Anonymous diagnostics are opt-out in Settings and clearing the toggle wipes the queue.',
  },
  {
    title: '3. Sharing',
    body: 'Supabase (database, auth, storage, edge functions), Google AdMob (ads), RevenueCat + Apple/Google (subscriptions). We do not sell personal data and never share uploads with advertisers.',
  },
  {
    title: '4. Retention & your rights',
    body: 'Account and content data persist until you delete your account (uploads and generated lessons are cascade-deleted with it). Server logs \u226430 days. Access, correct, export or delete your data from in-app account controls or by emailing support@bolingo.co.ke.',
  },
  {
    title: '5. Children & security',
    body: 'A general-education app not directed at children under 13 (16 in the EEA). Transport encryption (TLS), Supabase row-level security and per-user private buckets; service keys stay server-side. No method is 100% secure — report issues to support@bolingo.co.ke.',
  },
];

export default function PrivacyPolicy() {
  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      contentContainerClassName="mx-auto w-full max-w-md self-center px-5 py-10"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <StatusBar style="auto" />
      <View className="items-center">
        <BrandMark />
        <Text className="mt-2 text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Privacy policy
        </Text>
        <Text className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Effective 6 Nov 2026 · support@bolingo.co.ke
        </Text>
      </View>

      {SECTIONS.map((s) => (
        <View key={s.title} className="mt-6">
          <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">{s.title}</Text>
          <Text className="mt-1.5 text-sm leading-5 text-slate-600 dark:text-slate-300">{s.body}</Text>
        </View>
      ))}

      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="mt-8 flex-row items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 dark:bg-slate-100"
      >
        <AppIcon name="chevBack" size={18} color="#FFFFFF" />
        <Text className="text-base font-extrabold text-white dark:text-slate-900">Back</Text>
      </Pressable>
    </ScrollView>
  );
}
