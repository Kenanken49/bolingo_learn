import Text from './ui/Text';

/**
 * Bolingo Learn wordmark — title case, wide-tracked, Duolingo-style.
 * Use for brand moments (auth, paywall, settings footer), not mid-sentence.
 */
export default function BrandMark({
  size = 12,
  color = '#94a3b8',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Text
      accessibilityRole="header"
      accessibilityLabel="Bolingo Learn"
      style={{ fontSize: size, fontWeight: '900', letterSpacing: 3, color }}
    >
      Bolingo Learn
    </Text>
  );
}
