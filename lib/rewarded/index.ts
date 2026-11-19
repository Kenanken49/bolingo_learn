/** Web/desktop stub — rewarded video is native-only. */
import type { RewardHook } from './types';

export function useRewardedDiamond(_onEarn: () => void): RewardHook {
  void _onEarn;
  return {
    loaded: false,
    showing: false,
    available: false,
    status: 'unavailable',
    error: null,
    testAd: false,
    show: async () => false,
  };
}
