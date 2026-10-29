import { Pressable, View } from 'react-native';
import Text from '../ui/Text';
import AppIcon from '../AppIcon';
import { useNatural } from '../../lib/natural';
import { JUNGLE } from '../../lib/jungle';

/**
 * The seven-leaf expedition trail. It turns the abstract streak number into a
 * visible chain: every completed day lights a leaf, and the empty leaves ahead
 * are the reason to come back tomorrow. Purely presentational — the streak
 * itself stays in the profile.
 */
export default function StreakTrail({
  streak,
  doneToday,
  minutes,
  onPress,
}: {
  streak: number;
  doneToday: boolean;
  minutes: number;
  onPress?: () => void;
}) {
  const p = useNatural();
  const theme = JUNGLE.trail;
  const accent = p.isDark ? theme.accent : '#4E7A0B';
  // The trail is a seven-day cycle, so a 12-day streak starts a fresh week.
  const lit = streak <= 0 ? 0 : streak % 7 === 0 ? 7 : streak % 7;
  const fullWeek = lit === 7;
  const remaining = fullWeek ? 0 : 7 - lit;
  const trailDone = doneToday || streak > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`Canopy expedition, ${streak} day streak, ${lit} of 7 leaves lit`}
      style={({ pressed }) => ({
        width: '100%',
        maxWidth: 384,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: p.isDark ? 'rgba(182,255,0,0.18)' : '#D5E4C8',
        backgroundColor: p.isDark ? 'rgba(5,16,8,0.92)' : 'rgba(255,255,255,0.94)',
        paddingHorizontal: 14,
        paddingVertical: 12,
        overflow: 'hidden',
        opacity: pressed ? 0.96 : 1,
      })}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -34,
          top: -44,
          width: 118,
          height: 118,
          borderRadius: 59,
          backgroundColor: accent,
          opacity: p.isDark ? 0.1 : 0.08,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: p.isDark ? 'rgba(182,255,0,0.1)' : '#ECF6DF',
            borderWidth: 1,
            borderColor: p.isDark ? 'rgba(182,255,0,0.24)' : '#CDE0BA',
          }}
        >
          <Text style={{ fontSize: 17 }}>{theme.bird}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', color: accent }}>
            Canopy expedition
          </Text>
          <Text
            numberOfLines={1}
            style={{ marginTop: 1, fontSize: 14.5, fontWeight: '800', color: p.ink }}
          >
            {fullWeek ? 'Full feather trail' : streak === 0 ? "Kea's trail starts here" : `Day ${streak} · ${theme.habitat}`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <AppIcon name="flame" size={14} color={p.honey} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: p.honey }}>{streak}</Text>
        </View>
      </View>

      <View style={{ marginTop: 11, paddingHorizontal: 2 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 15,
            right: 15,
            top: 7,
            height: 2,
            borderRadius: 1,
            backgroundColor: p.line,
          }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const isLit = i < lit;
            const isToday = i === lit - 1 && doneToday;
            return (
              <View key={i} style={{ alignItems: 'center', width: 32 }}>
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isLit ? accent : p.surfaceAlt,
                    borderWidth: isLit ? 0 : 1.5,
                    borderColor: isToday ? p.honey : p.line,
                  }}
                >
                  {isLit ? (
                    <AppIcon name="check" size={9} color="#142008" />
                  ) : (
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: p.isDark ? '#2C3A28' : '#C6D6BD',
                      }}
                    />
                  )}
                </View>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 8,
                    fontWeight: '800',
                    letterSpacing: 0.4,
                    color: isLit ? p.ink : p.stone,
                  }}
                >
                  D{i + 1}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <AppIcon name="leaf" size={11} color={accent} />
        <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: p.muted }} numberOfLines={1}>
          {fullWeek
            ? 'Seven straight days. The canopy is yours.'
            : streak === 0
              ? `A ${minutes}-minute lesson lights the first leaf.`
              : `${remaining} more ${remaining === 1 ? 'day' : 'days'} to fill the trail.`}
        </Text>
        {onPress ? <AppIcon name="chevRight" size={13} color={accent} /> : null}
      </View>
      {trailDone && !doneToday ? (
        <Text style={{ marginTop: 3, fontSize: 9.5, fontWeight: '700', color: p.honey }}>
          Today is still unlit — one lesson protects the chain.
        </Text>
      ) : null}
    </Pressable>
  );
}
