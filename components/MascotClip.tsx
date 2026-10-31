import { useEffect, useState } from 'react';
import { Image } from 'react-native';

/**
 * Plays one Synfig PNG sequence (transparent frames) at the manifest fps.
 *
 * Mount it with `key={mood}` so a mood change restarts at frame 0 instead of
 * resetting state from inside an effect. Renders nothing callers can't fall
 * back from: pass empty `uris` and they should render their still portrait.
 */
export default function MascotClip({
  uris,
  fps,
  width,
  height,
  label,
}: {
  uris: string[];
  fps: number;
  width: number;
  height: number;
  label: string;
}) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (uris.length < 2) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % uris.length), Math.round(1000 / Math.max(1, fps)));
    return () => clearInterval(id);
  }, [uris.length, fps]);

  return (
    <Image
      source={{ uri: uris[frame % uris.length] }}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width, height }}
      resizeMode="contain"
    />
  );
}
