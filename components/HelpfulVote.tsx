import { useState } from 'react';
import { View, Pressable } from 'react-native';
import Text from './ui/Text';
import { voteBingoHelpful } from '../lib/bingoVotes';
import AppIcon from './AppIcon';

interface Props {
  userId: string | null;
  lessonTitle: string;
  /** Current question / mistake context (may be empty for unit screens). */
  prompt?: string;
  /** The exact question text the learner asked (or yourAnswer for Explain). */
  question: string;
  compact?: boolean;
}

/**
 * Thumbs up/down on any tutor answer. One tap logs the vote (signed-in only; guests
 * see a silent thank-you). Aggregates reveal which lesson contexts the
 * small self-hosted model fumbles so those can route elsewhere.
 */
export default function HelpfulVote({ userId, lessonTitle, prompt = '', question, compact }: Props) {
  const [voted, setVoted] = useState<boolean | null>(null);

  const vote = (helpful: boolean) => {
    if (voted !== null) return;
    setVoted(helpful);
    void voteBingoHelpful(userId, lessonTitle, prompt, question, helpful);
  };

  return (
    <View className={`mt-2 flex-row items-center gap-2 ${compact ? '' : 'justify-start'}`}>
      <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">
        {voted === null ? 'Helpful?' : voted ? 'Thanks — logged!' : 'Noted — Bingo will improve'}
      </Text>
      {voted === null ? (
        <>
          <Pressable
            onPress={() => vote(true)}
            accessibilityRole="button"
            accessibilityLabel="This answer was helpful"
          className="rounded-full bg-green-100 dark:bg-green-950 px-2.5 py-1.5"
        >
          <AppIcon name="thumbUp" size={16} color="#15803D" />
        </Pressable>
          <Pressable
            onPress={() => vote(false)}
            accessibilityRole="button"
            accessibilityLabel="This answer was not helpful"
          className="rounded-full bg-red-100 dark:bg-red-950 px-2.5 py-1.5"
        >
          <AppIcon name="thumbDown" size={16} color="#B91C1C" />
        </Pressable>
        </>
      ) : null}
    </View>
  );
}
