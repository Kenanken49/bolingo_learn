import { Image, View } from 'react-native';
import AppIcon from './AppIcon';
import { useTheme } from '../lib/theme';

/**
 * Learner avatar — one place for "who is this learner".
 *
 * A signed-in account shows its OAuth photo. With no photo it falls back to a
 * neutral silhouette, never to a named character: the illustrated portrait in
 * this app belongs to Livia, the mentor. `premium` adds the crown badge.
 */
export default function LearnerAvatar({
  uri,
  size = 40,
  premium = false,
}: {
  uri?: string | null;
  size?: number;
  premium?: boolean;
}) {
  const ring = Math.max(2, Math.round(size * 0.06));
  const [theme] = useTheme();
  const dark = theme === 'dark';
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={uri ? 'Your profile photo' : 'Default avatar'}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: dark ? '#12000C' : '#EDE9FE',
          borderWidth: dark ? 1 : 0,
          borderColor: '#FF2DAA',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <AppIcon name="user" size={size * 0.52} color={dark ? '#00E5FF' : '#7C3AED'} />
        )}
      </View>
      {premium ? (
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: size * 0.25,
            backgroundColor: '#FBBF24',
            borderWidth: ring,
            borderColor: dark ? '#000000' : '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="crown" size={size * 0.28} color="#78350F" />
        </View>
      ) : null}
    </View>
  );
}
