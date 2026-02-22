let unauthorizedEventDispatched = false;
let sessionValidationInFlight: Promise<boolean> | null = null;

const shouldIgnoreUnauthorized = (pathname: string, requestUrl?: string): boolean => {
  const isSetupCheck = requestUrl?.includes('/auth/setup-status');
  const isAuthMe = requestUrl?.includes('/auth/me');
  const isSetupPage = pathname === '/setup';
  const isLoginPage = pathname === '/login';
  const isPortalPage = pathname.startsWith('/portal');

  return Boolean(isSetupCheck || isAuthMe || isSetupPage || isLoginPage || isPortalPage);
};

const validateSessionStillInvalid = async (fetchFn: typeof fetch): Promise<boolean> => {
  if (sessionValidationInFlight) {
    return sessionValidationInFlight;
  }

  const baseURL = import.meta.env.VITE_API_URL || 'HTTP://localhost:3000/api';
  const authMeUrl = `${baseURL.replace(/\/$/, '')}/auth/me`;

  sessionValidationInFlight = fetchFn(authMeUrl, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })
    .then((response) => response.status === 401)
    .catch(() => true)
    .finally(() => {
      sessionValidationInFlight = null;
    });

  return sessionValidationInFlight;
};

type UnauthorizedHandlerError = {
  config?: {
    url?: string;
  };
};

export const createUnauthorizedHandler = (dependencies?: {
  fetchFn?: typeof fetch;
  getPathname?: () => string;
  dispatchUnauthorizedEvent?: () => void;
  scheduleReset?: (callback: () => void, delayMs: number) => void;
}) => {
  const fetchFn = dependencies?.fetchFn ?? fetch;
  const getPathname = dependencies?.getPathname ?? (() => window.location.pathname);
  const dispatchUnauthorizedEvent =
    dependencies?.dispatchUnauthorizedEvent ??
    (() => window.dispatchEvent(new CustomEvent('app:unauthorized')));
  const scheduleReset =
    dependencies?.scheduleReset ?? ((callback, delayMs) => window.setTimeout(callback, delayMs));

  return async (error: UnauthorizedHandlerError): Promise<void> => {
    if (shouldIgnoreUnauthorized(getPathname(), error.config?.url)) {
      return;
    }

    if (unauthorizedEventDispatched) {
      return;
    }

    const sessionStillInvalid = await validateSessionStillInvalid(fetchFn);
    if (!sessionStillInvalid || unauthorizedEventDispatched) {
      return;
    }

    unauthorizedEventDispatched = true;
    dispatchUnauthorizedEvent();

    // Allow future auth failures to be surfaced after the current redirect cycle.
    scheduleReset(() => {
      unauthorizedEventDispatched = false;
    }, 1500);
  };
};

export const resetUnauthorizedHandlerStateForTests = (): void => {
  unauthorizedEventDispatched = false;
  sessionValidationInFlight = null;
};
