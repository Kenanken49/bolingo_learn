import { Pressable } from 'react-native';
import AppIcon from '../AppIcon';
import { useNatural } from '../../lib/natural';

/** HUD speaker: one tap mutes/unmutes the ambient grove loop. */
export default function SoundToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const p = useNatural();
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={on ? 'Mute ambient tune' : 'Play ambient tune'}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: on ? p.surfaceAlt : p.surface,
        borderWidth: 1,
        borderColor: on ? p.moss : p.line,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <AppIcon name={on ? 'volume' : 'volumeOff'} size={16} color={on ? p.moss : p.muted} />
    </Pressable>
  );
}
