/** Shared shape for the rewarded-ad hook, so the screen and the UI agree. */
export type RewardStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'showing'
  | 'closed'
  | 'no-fill'
  | 'error'
  | 'unavailable';

export interface RewardHook {
  /** A loaded ad is ready: `show()` will play it. */
  loaded: boolean;
  /** A video is on screen right now. */
  showing: boolean;
  /** Rewarded ads can exist on this platform (native builds only). */
  available: boolean;
  status: RewardStatus;
  /** Plain-language reason the last load failed, for the UI. */
  error: string | null;
  /** True when this build is serving Google's sample unit (no revenue). */
  testAd: boolean;
  /** Plays the loaded ad. False means "nothing to play yet". */
  show: () => Promise<boolean>;
}
