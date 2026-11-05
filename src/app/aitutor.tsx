import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import Shell from '../../components/dashboard/Shell';
import Text from '../../components/ui/Text';
import AppIcon from '../../components/AppIcon';
import AskBingo from '../../components/AskBingo';
import { getProfile, type Profile } from '../../lib/progress';
import '../../lib/dashboard';

/** AI Tutor — the wireframe's tutor surface, powered by the real Bingo brain. */
export default function AITutor() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProfile(await getProfile());
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <Shell active="/aitutor" eyebrow="AI Tutor" greeting="Ask Bingo" profile={profile}>
      <View className="rounded-2xl border border-dash-line bg-dash-card p-4 dark:border-dash-dline dark:bg-dash-dcard">
        <View className="flex-row items-center gap-2">
          <AppIcon name="robot" size={22} color="#0284C7" />
          <Text className="flex-1 text-[14px] font-extrabold text-dash-ink dark:text-dash-dink">
            Stuck on anything? Bingo explains it.
          </Text>
        </View>
        <Text className="mt-1 text-[12px] font-semibold leading-[17px] text-dash-muted dark:text-dash-dmuted">
          Grounded in your current course — ask about a lesson, a project, or words you keep missing.
        </Text>
        <View className="mt-3">
          <AskBingo lessonTitle="AI Tutor" userId={profile?.id ?? null} />
        </View>
        <Link href="/offline-ai" asChild>
          <View className="mt-3 flex-row items-center rounded-xl border border-dash-line bg-dash-bg p-3 dark:border-dash-dline dark:bg-dash-dbg">
            <AppIcon name="download" size={20} color="#0284C7" />
            <View className="ml-2 flex-1">
              <Text className="text-[13px] font-extrabold text-dash-ink dark:text-dash-dink">
                Offline AI & sync
              </Text>
              <Text className="text-[11px] font-semibold text-dash-muted dark:text-dash-dmuted">
                On-device models, offline mode, pending uploads.
              </Text>
            </View>
            <AppIcon name="chevRight" size={18} color="#0284C7" />
          </View>
        </Link>
        <Link href="/roleplay" asChild>
          <View className="mt-3 flex-row items-center rounded-xl bg-dash-lav p-3 dark:bg-dash-dbg">
            <AppIcon name="chat" size={20} color="#8B5CFF" />
            <View className="ml-2 flex-1">
              <Text className="text-[13px] font-extrabold text-dash-ink dark:text-dash-dink">
                Practise speaking instead
              </Text>
              <Text className="text-[11px] font-semibold text-dash-muted dark:text-dash-dmuted">
                Roleplay conversations with Livia, Bingo and Zora.
              </Text>
            </View>
            <AppIcon name="chevRight" size={18} color="#8B5CFF" />
          </View>
        </Link>
      </View>
    </Shell>
  );
}
