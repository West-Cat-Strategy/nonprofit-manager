import { resolveSafeNavigationTarget } from '../../../utils/safeUrl';

const EVENT_WORKSPACE_PATHS = new Set(['/events', '/events/calendar']);

const isLocalAppTarget = (target: string | null | undefined): target is string => {
  const safeTarget = resolveSafeNavigationTarget(target);
  return typeof safeTarget === 'string' && safeTarget.startsWith('/');
};

const toPathWithSearch = (pathname: string, searchParams: URLSearchParams): string => {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export const buildCurrentEventRouteTarget = (pathname: string, search: string): string =>
  `${pathname}${search || ''}`;

export const isEventWorkspaceTarget = (target: string | null | undefined): boolean => {
  if (!isLocalAppTarget(target)) {
    return false;
  }

  const url = new URL(target, window.location.origin);
  return EVENT_WORKSPACE_PATHS.has(url.pathname);
};

export const isEventDetailTarget = (
  target: string | null | undefined,
  eventId: string | null | undefined
): boolean => {
  if (!eventId || !isLocalAppTarget(target)) {
    return false;
  }

  const url = new URL(target, window.location.origin);
  return url.pathname === `/events/${eventId}`;
};

export const resolveEventReturnTarget = (
  target: string | null | undefined,
  fallback = '/events'
): string => (isLocalAppTarget(target) ? target : fallback);

export const resolveEventWorkspaceTarget = (
  target: string | null | undefined,
  fallback = '/events/calendar'
): string => {
  let currentTarget = isLocalAppTarget(target) ? target : null;
  const seenTargets = new Set<string>();

  while (currentTarget && !seenTargets.has(currentTarget)) {
    seenTargets.add(currentTarget);
    const url = new URL(currentTarget, window.location.origin);

    if (EVENT_WORKSPACE_PATHS.has(url.pathname)) {
      return toPathWithSearch(url.pathname, url.searchParams);
    }

    const nestedReturnTo = url.searchParams.get('return_to');
    currentTarget = isLocalAppTarget(nestedReturnTo) ? nestedReturnTo : null;
  }

  return fallback;
};

interface EventDetailTargetOptions {
  tab?: 'overview' | 'schedule' | 'registrations' | null;
  occurrenceId?: string | null;
  returnTo?: string | null;
}

interface EventEditTargetOptions {
  occurrenceId?: string | null;
  returnTo?: string | null;
}

const buildEventTarget = (
  pathname: string,
  query: Record<string, string | null | undefined>
): string => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }

  return toPathWithSearch(pathname, params);
};

export const createEventCreateTarget = (returnTo?: string | null): string =>
  buildEventTarget('/events/new', { return_to: returnTo });

export const createEventDetailTarget = (
  eventId: string,
  { tab, occurrenceId, returnTo }: EventDetailTargetOptions = {}
): string =>
  buildEventTarget(`/events/${eventId}`, {
    tab: tab && tab !== 'overview' ? tab : null,
    occurrence: occurrenceId,
    return_to: returnTo,
  });

export const createEventEditTarget = (
  eventId: string,
  { occurrenceId, returnTo }: EventEditTargetOptions = {}
): string =>
  buildEventTarget(`/events/${eventId}/edit`, {
    occurrence: occurrenceId,
    return_to: returnTo,
  });
