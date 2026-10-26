/** Web stub — rewarded ads are native-only. */
export function useRewardedHeart(_onEarn: () => void) {
  void _onEarn;
  return {
    loaded: false,
    showing: false,
    available: false,
    show: async () => false,
  };
}
