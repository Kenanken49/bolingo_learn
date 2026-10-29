/* eslint-disable react-hooks/immutability -- Expo AudioPlayer properties control a mutable native handle. */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAudioPlayer } from 'expo-audio';

const SOURCE = require('../assets/audio/ambient-grove.wav');
const TARGET_VOLUME = 0.18;

export function useAmbient(enabled: boolean) {
  const player = useAudioPlayer(SOURCE);
  const [error, setError] = useState<string | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    player.loop = true;
    player.volume = 0;
    const playback = player.addListener('playbackStatusUpdate', (status) => {
      setError(status.error ?? null);
    });
    const lifecycle = AppState.addEventListener('change', (state) => {
      if (state !== 'active') player.pause();
      setAppActive(state === 'active');
    });
    return () => {
      playback.remove();
      lifecycle.remove();
    };
  }, [player]);

  useEffect(() => {
    const playing = enabled && appActive;
    if (playing) player.play();
    const timer = setInterval(() => {
      player.volume = playing
        ? Math.min(TARGET_VOLUME, player.volume + 0.012)
        : Math.max(0, player.volume - 0.02);
      if (playing ? player.volume >= TARGET_VOLUME : player.volume <= 0) {
        clearInterval(timer);
        if (!playing) player.pause();
      }
    }, playing ? 140 : 100);
    return () => clearInterval(timer);
  }, [enabled, appActive, player]);

  const play = () => {
    setError(null);
    player.play();
  };

  return { error, play };
}
