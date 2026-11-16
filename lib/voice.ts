import * as Speech from 'expo-speech';

/**
 * Free-tier narration: the phone's built-in robot voice, $0 cost to us.
 * Speaks prompts one at a time so the player can highlight each block.
 */
export function speakFree(
  prompts: string[],
  onBlock: (index: number) => void,
  onDone?: () => void,
  volume = 1
): void {
  Speech.stop();
  let i = 0;
  const step = () => {
    if (i >= prompts.length) {
      onDone?.();
      return;
    }
    const idx = i;
    i += 1;
    onBlock(idx);
    Speech.speak(prompts[idx].slice(0, 1000), {
      volume: Math.min(1, Math.max(0, volume)),
      onDone: step,
      onStopped: () => {},
      onError: step,
    });
  };
  step();
}

export function stopFree(): void {
  Speech.stop();
}
