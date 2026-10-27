import { RefillView, useRefillState } from '../../components/RefillContent';
import { useRewardedHeart } from '../../lib/rewarded';

export default function Refill() {
  const { profile, reward } = useRefillState(useRewardedHeart);
  return <RefillView profile={profile} reward={reward} />;
}
