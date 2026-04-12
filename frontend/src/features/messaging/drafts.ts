import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  MessagingSurface,
  PersistedMessageDraft,
} from './types';

const STORAGE_KEY = 'messaging_drafts_v1';

const canUseStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.sessionStorage);

const clearLegacyDraftStorage = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  if (window.localStorage.getItem(STORAGE_KEY) !== null) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

const readDraftMap = (): Record<string, PersistedMessageDraft> => {
  if (!canUseStorage()) {
    return {};
  }

  clearLegacyDraftStorage();

  try {
    const rawValue = window.sessionStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    return JSON.parse(rawValue) as Record<string, PersistedMessageDraft>;
  } catch {
    return {};
  }
};

const writeDraftMap = (drafts: Record<string, PersistedMessageDraft>): void => {
  if (!canUseStorage()) {
    return;
  }

  clearLegacyDraftStorage();
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
};

export const buildMessagingDraftKey = (
  surface: MessagingSurface,
  threadId: string
): string => `${surface}:${threadId}`;

export const readPersistedDraft = (
  surface: MessagingSurface,
  threadId: string
): string => {
  const key = buildMessagingDraftKey(surface, threadId);
  return readDraftMap()[key]?.value || '';
};

export const writePersistedDraft = (
  surface: MessagingSurface,
  threadId: string,
  value: string
): void => {
  const key = buildMessagingDraftKey(surface, threadId);
  const drafts = readDraftMap();

  if (!value.trim()) {
    delete drafts[key];
    writeDraftMap(drafts);
    return;
  }

  drafts[key] = {
    key,
    surface,
    threadId,
    value,
    updatedAt: new Date().toISOString(),
  };
  writeDraftMap(drafts);
};

export const clearPersistedDraft = (
  surface: MessagingSurface,
  threadId: string
): void => {
  writePersistedDraft(surface, threadId, '');
};

export const usePersistedMessageDraft = (
  surface: MessagingSurface,
  threadId: string | null
): {
  draft: string;
  setDraft: (value: string) => void;
  clearDraft: () => void;
  draftKey: string | null;
} => {
  const draftKey = useMemo(
    () => (threadId ? buildMessagingDraftKey(surface, threadId) : null),
    [surface, threadId]
  );
  const [draft, setDraftState] = useState<string>(() =>
    threadId ? readPersistedDraft(surface, threadId) : ''
  );

  useEffect(() => {
    if (!threadId) {
      setDraftState('');
      return;
    }

    setDraftState(readPersistedDraft(surface, threadId));
  }, [surface, threadId]);

  useEffect(() => {
    if (!threadId) {
      return;
    }

    writePersistedDraft(surface, threadId, draft);
  }, [draft, surface, threadId]);

  const setDraft = useCallback((value: string) => {
    setDraftState(value);
  }, []);

  const clearDraft = useCallback(() => {
    if (!threadId) {
      setDraftState('');
      return;
    }

    clearPersistedDraft(surface, threadId);
    setDraftState('');
  }, [surface, threadId]);

  return {
    draft,
    setDraft,
    clearDraft,
    draftKey,
  };
};
