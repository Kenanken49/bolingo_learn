import { useState, type ReactNode } from 'react';
import { Pressable, Text, type GestureResponderEvent } from 'react-native';

/**
 * Duo-style tactile button: chunky rounded shape, bold rounded type, and a
 * darker bottom "3D" edge that compresses on press (edge vanishes + the face
 * drops a few px), giving the physical dopamine click of the real app.
 * NOTE: skin class names are full static literals so NativeWind extracts them.
 */
export type DuoColor = 'green' | 'blue' | 'red' | 'amber' | 'violet' | 'slate' | 'grey';

const SKINS: Record<DuoColor, { face: string; edge: string }> = {
  green: { face: 'bg-green-500', edge: 'border-green-700' },
  blue: { face: 'bg-sky-500', edge: 'border-sky-700' },
  red: { face: 'bg-red-500', edge: 'border-red-700' },
  amber: { face: 'bg-amber-400', edge: 'border-amber-600' },
  violet: { face: 'bg-violet-600', edge: 'border-violet-800' },
  slate: { face: 'bg-slate-800', edge: 'border-slate-950' },
  grey: { face: 'bg-slate-200', edge: 'border-slate-300' },
};

interface Props {
  title?: string;
  children?: ReactNode;
  color?: DuoColor;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  label: string;
  small?: boolean;
}

export default function DuoButton({
  title,
  children,
  color = 'green',
  onPress,
  disabled = false,
  label,
  small = false,
}: Props) {
  const [pressed, setPressed] = useState(false);
  const skin = SKINS[color];
  const down = pressed && !disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`items-center rounded-2xl border-b-4 shadow-sm ${small ? 'px-4 py-2.5' : 'px-6 py-4'} ${skin.face} ${
        down ? 'border-b-0' : skin.edge
      } ${disabled ? 'opacity-40' : ''}`}
      style={down ? { transform: [{ translateY: 3 }] } : undefined}
    >
      {children ?? (
        <Text className={`font-duo font-extrabold uppercase tracking-wide text-white ${small ? 'text-sm' : 'text-lg'}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
