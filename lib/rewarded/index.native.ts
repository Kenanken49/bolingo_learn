import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { RewardedAd, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { REWARDED_AD_UNIT_ID } from '../ads';

// Rewarded ads need a native build (dev client / EAS) — not Expo Go.
export function useRewardedHeart(onEarn: () => void) {
  const [loaded, setLoaded] = useState(false);
  const [showing, setShowing] = useState(false);
  const [available] = useState(() => Platform.OS === 'android' || Platform.OS === 'ios');

  useEffect(() => {
    if (!available) return;
    const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);
    const unsubs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true)),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        onEarn();
        setShowing(false);
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        setShowing(false);
        setLoaded(false);
        ad.load(); // preload the next one
      }),
    ];
    ad.load();
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  const show = useCallback(async () => {
    if (!available) return false;
    try {
      const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);
      setShowing(true);
      await ad.show();
      return true;
    } catch {
      setShowing(false);
      return false;
    }
  }, [available]);

  return { loaded, showing, available, show };
}
