import { RefillView, useRefillState } from '../../components/RefillContent';
import { useRewardedDiamond } from '../../lib/rewarded';

export default function Refill() {
  const { profile, reward } = useRefillState(useRewardedDiamond);
  return <RefillView profile={profile} reward={reward} />;
}
