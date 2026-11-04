/**
 * Local orchestration layer — decides where each tutor question runs.
 *
 *            question
 *               │
 *        ┌──────┴───────┐
 *     online          offline / budget spent
 *        │                  │
 *   cloud tutor     edge SLM (if a runtime is registered)
 *  (ask-bingo fn)   └─ else lesson retrieval (local vector index)
 *
 * Pure decision function so the routing rules are tested under Node.
 */

export type TutorRoute = 'cloud' | 'edge-model' | 'edge-retrieval';

export interface RouteInput {
  online: boolean;
  isPremium: boolean;
  /** Free learner has run out of today's AI tokens. */
  budgetExhausted: boolean;
  /** A native SLM runtime is registered. */
  edgeModelReady: boolean;
  /** Learner switched on "always use offline AI". */
  preferOffline?: boolean;
}

export interface RouteDecision {
  route: TutorRoute;
  /** Why this route was chosen — shown in the tutor sheet. */
  reason: 'online' | 'offline' | 'budget' | 'preference' | 'cloud-error';
}

export function chooseRoute(input: RouteInput): RouteDecision {
  const local: TutorRoute = input.edgeModelReady ? 'edge-model' : 'edge-retrieval';
  if (input.preferOffline) return { route: local, reason: 'preference' };
  if (!input.online) return { route: local, reason: 'offline' };
  if (!input.isPremium && input.budgetExhausted) return { route: local, reason: 'budget' };
  return { route: 'cloud', reason: 'online' };
}

/** The cloud tutor failed mid-request: answer on the device instead of erroring. */
export function fallbackRoute(edgeModelReady: boolean, networkDown: boolean): RouteDecision {
  return { route: edgeModelReady ? 'edge-model' : 'edge-retrieval', reason: networkDown ? 'offline' : 'cloud-error' };
}

/** Short line shown under an answer so the learner knows where it came from. */
export function routeLabel(decision: RouteDecision): string {
  const where =
    decision.route === 'cloud'
      ? 'Cloud tutor'
      : decision.route === 'edge-model'
        ? 'On-device model'
        : 'Offline lesson search';
  const why =
    decision.reason === 'offline'
      ? ' · you are offline'
      : decision.reason === 'budget'
        ? " · today's free AI allowance is used up"
        : decision.reason === 'preference'
          ? ' · offline mode is on'
          : decision.reason === 'cloud-error'
            ? ' · the cloud tutor did not answer'
            : '';
  return `${where}${why}`;
}
