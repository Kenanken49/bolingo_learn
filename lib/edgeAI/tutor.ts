import AsyncStorage from '@react-native-async-storage/async-storage';
import { askBingo, type BingoContext, type BingoMessage } from '../askBingo';
import { getAiBudget, recordAiSpend } from '../aiBudget';
import { estimateTokens, type AiBudgetView } from '../entitlements';
import { isOnline, markOffline } from '../network';
import { isNetworkError } from '../sync/syncQueue';
import { getEdgeEngine } from './edgeEngine';
import { searchKnowledge } from './knowledge';
import { ragPrompt, type SearchHit } from './retrieval';
import { chooseRoute, fallbackRoute, routeLabel, type RouteDecision } from './router';

/**
 * The tutor entry point the UI calls. It asks the orchestration router
 * where to run, then:
 *  - cloud: the `ask-bingo` edge function (free learners spend tokens);
 *  - edge-model: retrieval-augmented prompt into the on-device SLM;
 *  - edge-retrieval: the best lesson paragraph, quoted with its source.
 * A cloud call that fails for network reasons drops to the local route
 * instead of showing an error.
 */
const K_PREFER_OFFLINE = 'bolingo.tutor.preferOffline';

export async function getPreferOffline(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(K_PREFER_OFFLINE)) === '1';
  } catch {
    return false;
  }
}

export async function setPreferOffline(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(K_PREFER_OFFLINE, on ? '1' : '0');
  } catch {}
}

export interface TutorAnswer {
  text: string;
  decision: RouteDecision;
  label: string;
  sources: string[];
  budget: AiBudgetView;
}

/** Offline answer without a model: quote the lessons, never invent. */
export function retrievalAnswer(hits: SearchHit[]): string {
  if (hits.length === 0) {
    return "I couldn't find this in your lessons on this device. Try rephrasing with a key word from the lesson, check the Kamusi, or ask again when you're online.";
  }
  const [best, ...rest] = hits;
  const lines = [`From “${best.passage.source}”: ${best.passage.text}`];
  const also = rest.filter((h) => h.passage.source !== best.passage.source).slice(0, 1);
  if (also.length) lines.push(`Also see “${also[0].passage.source}”.`);
  return lines.join('\n\n');
}

async function answerLocally(
  question: string,
  context: BingoContext,
  decision: RouteDecision
): Promise<{ text: string; decision: RouteDecision; sources: string[] }> {
  const hits = await searchKnowledge(`${question} ${context.lessonTitle ?? ''}`, 3);
  const sources = Array.from(new Set(hits.map((h) => h.passage.source)));
  const engine = getEdgeEngine();
  // Grounding rule: the small on-device model only answers when there is
  // lesson text to answer from. Tested with Qwen2.5 1.5B: given no extracts it
  // ignores "answer only from the extracts" and answers from memory, which is
  // where small models invent facts. With nothing to ground it, say so instead.
  const grounded = hits.length > 0 || !!context.theory?.trim();
  if (decision.route === 'edge-model' && engine && grounded) {
    try {
      const lessonExtract: SearchHit[] = context.theory
        ? [{ passage: { id: 'current', source: context.lessonTitle ?? 'This lesson', text: context.theory.slice(0, 900) }, score: 1 }]
        : [];
      const text = await engine.generate(ragPrompt(question, [...lessonExtract, ...hits].slice(0, 4)), { maxTokens: 220 });
      return { text, decision, sources };
    } catch {
      // Model failed to load or answer — fall through to quoting the lessons.
      decision = { route: 'edge-retrieval', reason: decision.reason };
    }
  }
  return { text: retrievalAnswer(hits), decision: { route: 'edge-retrieval', reason: decision.reason }, sources };
}

export async function askTutor(
  question: string,
  context: BingoContext,
  history: BingoMessage[],
  isPremium: boolean
): Promise<TutorAnswer> {
  const q = question.trim();
  if (!q) throw new Error('Type your question first — Bingo is listening.');
  const [online, budget, preferOffline] = await Promise.all([isOnline(), getAiBudget(isPremium), getPreferOffline()]);
  const decision = chooseRoute({
    online,
    isPremium,
    budgetExhausted: budget.exhausted,
    edgeModelReady: getEdgeEngine() != null,
    preferOffline,
  });

  if (decision.route === 'cloud') {
    try {
      const text = await askBingo(q, context, history);
      const spent = estimateTokens(q) + estimateTokens(context.theory?.slice(0, 900) ?? '') + estimateTokens(text);
      const after = await recordAiSpend(spent, isPremium);
      return { text, decision, label: routeLabel(decision), sources: [], budget: after };
    } catch (e) {
      const networkDown = isNetworkError(e);
      if (networkDown) markOffline();
      const local = await answerLocally(q, context, fallbackRoute(getEdgeEngine() != null, networkDown));
      return { ...local, label: routeLabel(local.decision), budget };
    }
  }

  const local = await answerLocally(q, context, decision);
  return { ...local, label: routeLabel(local.decision), budget };
}
