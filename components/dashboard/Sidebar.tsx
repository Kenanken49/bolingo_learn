import { View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import Text from '../ui/Text';
import AppIcon, { type AppIconName } from '../AppIcon';
import LearnerAvatar from '../LearnerAvatar';
import { useTheme } from '../../lib/theme';
import { SPACES, useLearningSpace } from '../../lib/learningSpace';
import { levelProgress } from '../../lib/levels';
import type { Profile } from '../../lib/progress';

export type DashRoute = '/' | '/explore' | '/mylearning' | '/aitutor' | '/library' | '/community';

const NAV: { label: string; icon: AppIconName; href: DashRoute }[] = [
  { label: 'Home', icon: 'home', href: '/' },
  { label: 'Explore', icon: 'compass', href: '/explore' },
  { label: 'My learning', icon: 'book', href: '/mylearning' },
  { label: 'AI Tutor', icon: 'robot', href: '/aitutor' },
  { label: 'Library', icon: 'folder', href: '/library' },
  { label: 'Community', icon: 'users', href: '/community' },
];

/**
 * Wireframe sidebar: brand, learning-space pill, nav, theme toggle,
 * streak-shield diamonds (real streak_freezes), streak card (real count),
 * upgrade card (real premium state), profile footer.
 */
export default function Sidebar({
  active,
  profile,
  onNavigate,
}: {
  active: DashRoute;
  profile: Profile | null;
  onNavigate: (href: DashRoute) => void;
}) {
  const [theme, setTheme] = useTheme();
  const [space] = useLearningSpace();
  const dark = theme === 'dark';
  const spaceMeta = SPACES.find((s) => s.id === space) ?? SPACES[1];
  const freezes = Math.max(0, profile?.streak_freezes ?? 0);
  const xp = profile?.xp ?? 0;
  const { needed } = levelProgress(xp);
  const isPremium = profile?.is_premium === true;

  return (
    <View className="w-[248px] shrink-0 border-r border-dash-line bg-white px-4 pb-4 pt-6 dark:border-dash-dline dark:bg-dash-dcard">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Brand */}
        <View className="flex-row items-center gap-2 px-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-dash-pillink">
            <Text className="text-[16px] font-extrabold text-white">b</Text>
          </View>
          <Text className="text-[19px] font-extrabold tracking-tight text-dash-ink dark:text-dash-dink">
            Bolingo
          </Text>
        </View>

        {/* Learning space — the wireframe's mode pill, synced with the hero tabs. */}
        <View className="mt-5 px-2">
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-dash-faint">
            Learning space
          </Text>
          <Pressable
            onPress={() => onNavigate('/')}
            accessibilityRole="button"
            accessibilityLabel={`Learning space: ${spaceMeta.label}, ${spaceMeta.ages}. Open home to switch.`}
            className="mt-2 flex-row items-center rounded-2xl border border-dash-line bg-dash-bg px-3 py-2.5 dark:border-dash-dline dark:bg-dash-dbg"
          >
            <AppIcon name="gradCap" size={18} color={dark ? '#7DD3FC' : '#0284C7'} />
            <View className="ml-2 flex-1">
              <Text className="text-[13px] font-extrabold text-dash-ink dark:text-dash-dink" numberOfLines={1}>
                {spaceMeta.label}
              </Text>
              <Text className="text-[10.5px] font-semibold text-dash-muted dark:text-dash-dmuted">
                {spaceMeta.ages}
              </Text>
            </View>
            <AppIcon name="chevRight" size={15} color={dark ? '#64748B' : '#94A3B8'} />
          </Pressable>
        </View>

        {/* Nav */}
        <View className="mt-4 gap-1">
          {NAV.map((n) => {
            const on = n.href === active;
            return (
              <Pressable
                key={n.href}
                onPress={() => onNavigate(n.href)}
                accessibilityRole="button"
                accessibilityLabel={n.label}
                className={`flex-row items-center rounded-xl px-3 py-2.5 ${
                  on ? 'bg-dash-pill dark:bg-dash-dbg' : ''
                }`}
              >
                <AppIcon name={n.icon} size={19} color={on ? '#0284C7' : dark ? '#94A3B8' : '#64748B'} />
                <Text
                  className={`ml-3 text-[13.5px] ${
                    on
                      ? 'font-extrabold text-dash-pillink'
                      : 'font-semibold text-dash-muted dark:text-dash-dmuted'
                  }`}
                >
                  {n.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Theme toggle */}
        <Pressable
          onPress={() => void setTheme(dark ? 'light' : 'dark')}
          accessibilityRole="button"
          accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="mt-5 flex-row items-center justify-between rounded-2xl border border-dash-line bg-dash-bg px-3 py-2.5 dark:border-dash-dline dark:bg-dash-dbg"
        >
          <View className="flex-row items-center gap-2">
            <AppIcon name={dark ? 'moon' : 'sunny'} size={17} color={dark ? '#7DD3FC' : '#F59E0B'} />
            <Text className="text-[12px] font-bold text-dash-ink dark:text-dash-dink">
              {dark ? 'Dark mode' : 'Light mode'}
            </Text>
          </View>
          <View
            className={`h-6 w-11 rounded-full px-0.5 py-0.5 ${dark ? 'items-end bg-dash-pillink' : 'items-start bg-dash-line'}`}
          >
            <View className="h-5 w-5 rounded-full bg-white" />
          </View>
        </Pressable>

        {/* Streak shield — diamonds are the real freeze balance. */}
        <View className="mt-3 rounded-2xl bg-dash-pill p-3 dark:bg-dash-dbg">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-extrabold text-dash-pillink">Streak shield</Text>
            <Text className="text-[11px] font-extrabold text-dash-pillink">
              {Math.min(freezes, 5)}/5
            </Text>
          </View>
          <View className="mt-2 flex-row gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <AppIcon
                key={i}
                name="gem"
                size={15}
                color={i < Math.min(freezes, 5) ? '#0284C7' : dark ? '#334155' : '#BAE6FD'}
              />
            ))}
          </View>
          <Text className="mt-2 text-[10.5px] font-semibold leading-[15px] text-dash-pillink">
            A wrong answer uses one diamond — freezes save your streak.
          </Text>
        </View>

        {/* Streak card */}
        <View className="mt-3 flex-row items-center rounded-2xl bg-dash-goldbg p-3 dark:bg-dash-dbg">
          <AppIcon name="flame" size={26} color="#F59E0B" />
          <View className="ml-2 flex-1">
            <Text className="text-[13px] font-extrabold text-dash-ink dark:text-dash-dink">
              {profile ? `${profile.streak_count} day streak` : 'Start your streak'}
            </Text>
            <Text className="text-[10.5px] font-semibold text-dash-muted dark:text-dash-dmuted">
              {profile ? 'Keep it going' : 'Sign in to track streaks'}
            </Text>
          </View>
        </View>

        {/* Level progress */}
        <View className="mt-3 rounded-2xl border border-dash-line bg-dash-card p-3 dark:border-dash-dline dark:bg-dash-dbg">
          <View className="flex-row items-center gap-1">
            <AppIcon name="star" size={14} color="#0284C7" />
            <Text className="text-[11px] font-extrabold text-dash-ink dark:text-dash-dink">
              Level up in {needed} XP to unlock rewards
            </Text>
          </View>
        </View>
        {/* Upgrade — free learners get the wireframe's trial banner. */}
        {!isPremium ? (
          <Pressable
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro"
            className="mt-3 rounded-2xl bg-dash-hero p-3"
          >
            <View className="flex-row items-center gap-1.5">
              <AppIcon name="crown" size={15} color="#FBBF24" />
              <Text className="text-[12px] font-extrabold text-white">Go Pro</Text>
            </View>
            <Text className="mt-1 text-[10.5px] font-semibold leading-[15px] text-slate-300">
              Audiobooks, uploads, roleplay — KSh 770/mo.
            </Text>
          </Pressable>
        ) : (
          <View className="mt-3 flex-row items-center gap-1.5 rounded-2xl bg-dash-goldbg p-3 dark:bg-dash-dbg">
            <AppIcon name="crown" size={15} color="#B45309" />
            <Text className="text-[12px] font-extrabold text-dash-gold">Pro plan active</Text>
          </View>
        )}
      </ScrollView>

      {/* Profile footer */}
      <Pressable
        onPress={() => router.push('/auth')}
        accessibilityRole="button"
        accessibilityLabel="Account"
        className="mt-3 flex-row items-center rounded-2xl px-2 py-2"
      >
        {profile ? (
          <LearnerAvatar uri={profile.avatar_url} size={34} premium={profile.is_premium} />
        ) : (
          <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-dash-pillink">
            <Text className="text-[13px] font-extrabold text-white">?</Text>
          </View>
        )}
        <View className="ml-2 flex-1">
          <Text className="text-[12.5px] font-extrabold text-dash-ink dark:text-dash-dink" numberOfLines={1}>
            {profile?.username ?? 'Guest'}
          </Text>
          <Text className="text-[10.5px] font-semibold text-dash-muted dark:text-dash-dmuted">
            {isPremium ? 'Pro plan' : 'Free plan · Upgrade'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
