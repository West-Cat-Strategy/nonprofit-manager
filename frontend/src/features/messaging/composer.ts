import type { KeyboardEvent } from 'react';

export const createClientMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const shouldSubmitComposer = (
  event: KeyboardEvent<HTMLTextAreaElement>
): boolean => {
  if (event.key !== 'Enter') {
    return false;
  }

  if (event.shiftKey) {
    return false;
  }

  return true;
};
