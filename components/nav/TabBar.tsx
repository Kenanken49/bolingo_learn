import { Pressable, View } from 'react-native';
import { Link, usePathname, type Href } from 'expo-router';
import Text from '../ui/Text';
import AppIcon, { type AppIconName } from '../AppIcon';
import { useNatural } from '../../lib/natural';
import { useTierStyle } from '../../lib/tierStyle';
import { useLifeStageSnapshot } from '../../lib/lifeStageStore';
import { DEFAULT_TABS, isTabActive, tabsFor, type MenuTab } from '../../lib/tierMenu';

/** The original four destinations, kept for callers that need a stage-free list. */
export const TABS: MenuTab[] = DEFAULT_TABS;

/** The current learner's menu: different destinations per life stage (lib/tierMenu.ts). */
export function useTabs(): MenuTab[] {
  return tabsFor(useLifeStageSnapshot());
}

/**
 * Bottom tab bar shared by the core screens. Both the destinations and the
 * look follow the life stage: Explorers get labelled chunky tabs with an
 * accent outline, Launchers clean labelled tabs, Climbers quiet icons only.
 */
export default function TabBar() {
  const p = useNatural();
  const t = useTierStyle();
  const path = usePathname();
  const tabs = useTabs();
  const tight = tabs.length > 4;
  return (
    <View
      className="md:hidden"
      accessibilityRole="tablist"
      style={{
        borderTopWidth: 1,
        borderTopColor: p.line,
        backgroundColor: p.surface,
        paddingHorizontal: tight ? 8 : 18,
        paddingTop: 7,
        paddingBottom: 6,
        flexDirection: 'row',
        justifyContent: 'space-around',
      }}
    >
      {tabs.map((n) => {
        const on = isTabActive(n, path);
        return (
          <Link key={n.href} href={n.href as Href} replace asChild>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={n.label}
              style={{
                alignItems: 'center',
                minWidth: tight ? 50 : 56,
                borderRadius: t.stage === 'climber' ? 10 : 14,
                borderWidth: on && t.playful ? 1.5 : 0,
                borderColor: t.accent,
                backgroundColor: on ? p.surfaceAlt : 'transparent',
                paddingHorizontal: tight ? 6 : 12,
                paddingVertical: t.tabLabels ? 5 : 9,
              }}
            >
              <AppIcon name={n.icon as AppIconName} size={t.tabLabels ? 21 : 22} color={on ? t.accent : p.stone} />
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
