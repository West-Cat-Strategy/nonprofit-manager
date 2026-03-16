import type { MessageSendState } from './types';

const rankSendState = (state?: MessageSendState): number => {
  if (state === 'sent') {
    return 3;
  }

  if (state === 'sending') {
    return 2;
  }

  if (state === 'failed') {
    return 1;
  }

  return 0;
};

export const pickPreferredMessageVersion = <
  T extends {
    send_state?: MessageSendState;
    optimistic?: boolean;
  },
>(
  existing: T,
  incoming: T
): T => {
  const existingRank = rankSendState(existing.send_state);
  const incomingRank = rankSendState(incoming.send_state);

  if (incomingRank !== existingRank) {
    return incomingRank > existingRank ? incoming : existing;
  }

  if (Boolean(existing.optimistic) !== Boolean(incoming.optimistic)) {
    return existing.optimistic ? incoming : existing;
  }

  return incoming;
};
