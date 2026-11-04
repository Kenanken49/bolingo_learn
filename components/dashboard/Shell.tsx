import { useState } from 'react';
import { View, Pressable, ScrollView, Platform, useWindowDimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Text from '../ui/Text';
import TextInput from '../ui/TextInput';
import AppIcon from '../AppIcon';
import LearnerAvatar from '../LearnerAvatar';
import { useTheme } from '../../lib/theme';
import type { Profile } from '../../lib/progress';
import Sidebar, { type DashRoute } from './Sidebar';

/**
 * Dashboard shell: permanent sidebar on wide web, hamburger + slide-over
 * drawer everywhere else ("dashboard everywhere"). Every dashboard screen
 * renders inside this with its own greeting eyebrow + search.
 */
export default function Shell({
  active,
  eyebrow,
  greeting,
  profile,
  attention,
  initialQuery,
  onSearch,
  children,
}: {
  active: DashRoute;
  eyebrow: string;
  greeting: string;
  profile: Profile | null;
  /** Real signal for the bell dot (due reviews / streak at risk). */
  attention?: boolean;
  initialQuery?: string;
  /** Home passes through to Explore; Explore owns its own field. */
  onSearch?: (q: string) => void;
  children: React.ReactNode;
}) {
  const [theme] = useTheme();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 1024;
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState(initialQuery ?? '');

  const go = (href: DashRoute) => {
    setDrawer(false);
    if (href !== active) router.replace(href as never);
  };

  const submitSearch = () => {
    if (onSearch) onSearch(q.trim());
    else if (q.trim()) router.push({ pathname: '/explore', params: { q: q.trim() } } as never);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme === 'dark' ? '#0B0F1A' : '#F8F9FC' }} edges={['top', 'bottom']}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <View className="mx-auto w-full max-w-[1400px] flex-1 flex-row bg-dash-bg dark:bg-dash-dbg">
        {wide ? <Sidebar active={active} profile={profile} onNavigate={go} /> : null}

        <View className="min-w-0 flex-1">
          {/* Top bar */}
          <View className="flex-row items-center gap-3 px-4 pb-2 pt-3 md:px-8">
            {!wide ? (
              <Pressable
                onPress={() => setDrawer(true)}
                accessibilityRole="button"
                accessibilityLabel="Open navigation"
                className="h-10 w-10 items-center justify-center rounded-full border border-dash-line bg-dash-card dark:border-dash-dline dark:bg-dash-dcard"
              >
                <AppIcon name="menu" size={20} color={theme === 'dark' ? '#F1F5F9' : '#0F172A'} />
              </Pressable>
            ) : null}
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-dash-faint">
                {eyebrow}
              </Text>
              <Text
                className="text-[21px] font-extrabold tracking-tight text-dash-ink dark:text-dash-dink md:text-[26px]"
                numberOfLines={1}
              >
                {greeting}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Notifications and settings"
              className="relative h-10 w-10 items-center justify-center rounded-full border border-dash-line bg-dash-card dark:border-dash-dline dark:bg-dash-dcard"
            >
              <AppIcon name="bell" size={19} color={theme === 'dark' ? '#F1F5F9' : '#0F172A'} />
              {attention ? (
                <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => router.push('/auth')}
              accessibilityRole="button"
              accessibilityLabel={profile ? 'Account' : 'Sign in'}
            >
              {profile ? (
                <LearnerAvatar uri={profile.avatar_url} size={38} premium={profile.is_premium} />
              ) : (
                <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-dash-pillink">
                  <Text className="text-[14px] font-extrabold text-white">?</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Search */}
          <View className="px-4 pb-1 md:px-8">
            <View className="flex-row items-center rounded-full border border-dash-line bg-dash-card px-3 py-1 dark:border-dash-dline dark:bg-dash-dcard">
              <AppIcon name="search" size={17} color={theme === 'dark' ? '#94A3B8' : '#94A3B8'} />
              <TextInput
                value={q}
                onChangeText={setQ}
                onSubmitEditing={submitSearch}
                placeholder="Search courses, mentors, tracks..."
                returnKeyType="search"
                className="ml-2 flex-1 text-[13.5px] text-dash-ink dark:text-dash-dink"
              />
              <View className="rounded-md border border-dash-line px-1.5 py-0.5 dark:border-dash-dline">
                <Text className="text-[10px] font-bold text-dash-faint">⌘K</Text>
              </View>
            </View>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pb-16 pt-2 md:px-8"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>

      {/* Narrow-screen drawer */}
      <Modal visible={drawer} transparent animationType="fade" onRequestClose={() => setDrawer(false)}>
        <Pressable className="flex-1 flex-row bg-black/40" onPress={() => setDrawer(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="h-full">
            <Sidebar active={active} profile={profile} onNavigate={go} />
          </Pressable>
          <View className="flex-1" />
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
