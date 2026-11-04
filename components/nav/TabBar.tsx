import { Pressable, View } from 'react-native';
import { Link, usePathname, type Href } from 'expo-router';
import Text from '../ui/Text';
import AppIcon, { type AppIconName } from '../AppIcon';
import { useNatural } from '../../lib/natural';
import { useTierStyle } from '../../lib/tierStyle';

/** The four primary destinations. Everything else is one tap from one of them. */
export const TABS: { label: string; icon: AppIconName; href: string }[] = [
  { label: 'Learn', icon: 'home', href: '/' },
  { label: 'Leagues', icon: 'trophy', href: '/leaderboard' },
  { label: 'Shop', icon: 'crown', href: '/paywall' },
  { label: 'Profile', icon: 'user', href: '/settings' },
];

/** Bottom tab bar shared by the core screens; restyled per life stage. */
export default function TabBar() {
  const p = useNatural();
  const t = useTierStyle();
  const path = usePathname();
  return (
    <View
      className="md:hidden"
      style={{
        borderTopWidth: 1,
        borderTopColor: p.line,
        backgroundColor: p.surface,
        paddingHorizontal: 18,
        paddingTop: 7,
        paddingBottom: 6,
        flexDirection: 'row',
        justifyContent: 'space-around',
      }}
    >
      {TABS.map((n) => {
        const on = n.href === '/' ? path === '/' : path.startsWith(n.href);
        return (
          <Link key={n.label} href={n.href as Href} replace asChild>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={n.label}
              style={{
                alignItems: 'center',
                minWidth: 56,
                borderRadius: t.stage === 'climber' ? 10 : 14,
                borderWidth: on && t.playful ? 1.5 : 0,
                borderColor: t.accent,
                backgroundColor: on ? p.surfaceAlt : 'transparent',
                paddingHorizontal: 12,
                paddingVertical: t.tabLabels ? 5 : 9,
              }}
            >
              <AppIcon name={n.icon} size={t.tabLabels ? 21 : 22} color={on ? t.accent : p.stone} />
              {t.tabLabels ? (
                <Text style={{ fontSize: 8.5, fontWeight: '800', letterSpacing: 0.7, marginTop: 1, color: on ? t.accent : p.stone }}>
                  {n.label.toUpperCase()}
                </Text>
              ) : null}
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}
