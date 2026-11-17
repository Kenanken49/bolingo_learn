import { View } from 'react-native';
import Text from '../ui/Text';
import { defersExecution } from '../../lib/execution';
import type { CurriculumBlock } from '../../lib/curriculum';

/**
 * The learner-visible half of the runs floor.
 *
 * A build block that executes nothing in this build, and whose own title and
 * blurb do not say so, carries this chip. Blocks that honestly call themselves
 * paper exercises get nothing — the copy already told them — and blocks backed
 * by the Git VM, the code sandbox, speech recognition or a live project check
 * get nothing either, because for them the claim would be a lie.
 *
 * The condition lives in lib/execution.ts and is the one the `runs` floor of
 * scripts/score-courses.cjs grades, so a screen can never show what the
 * standard does not know, and the standard tolerates nothing the screen does
 * not say: no ledger, no cap, no exempt course.
 */
export default function NoExecutionBadge({
  block,
  detailed = false,
}: {
  /** Off the path (a dashboard review, a route with no block) means nothing to judge. */
  block?: CurriculumBlock;
  /** Adds the plain sentence about what is graded instead, for the lesson header. */
  detailed?: boolean;
}) {
  if (!block || !defersExecution(block)) return null;

  if (!detailed) {
    return (
      <Text
        accessibilityLabel={`${block.title}: nothing runs in this build`}
        className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      >
        NO EXECUTION
      </Text>
    );
  }

  return (
    <View
      accessibilityLabel={`${block.title}: nothing runs in this build. Your answer is graded as the words you write or tap.`}
      className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <Text className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-300">
        No execution in this build
      </Text>
      <Text className="mt-0.5 text-sm font-semibold text-amber-900 dark:text-amber-200">
        Nothing here runs your work — the answer is graded from the words you write or tap, not from a
        terminal, a sandbox or a live page.
      </Text>
    </View>
  );
}
