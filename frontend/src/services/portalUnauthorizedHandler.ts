let portalUnauthorizedEventDispatched = false;
let portalSessionValidationInFlight: Promise<boolean> | null = null;

const shouldIgnorePortalUnauthorized = (pathname: string, requestUrl?: string): boolean => {
  const isPortalBootstrap = requestUrl?.includes('/portal/auth/bootstrap');
  const isPortalLogin = pathname.startsWith('/portal/login');
  const isPortalSignup = pathname.startsWith('/portal/signup');
  const isPortalInvitation = pathname.startsWith('/portal/accept-invitation');

  return Boolean(isPortalBootstrap || isPortalLogin || isPortalSignup || isPortalInvitation);
};

const validatePortalSessionStillInvalid = async (fetchFn: typeof fetch): Promise<boolean> => {
  if (portalSessionValidationInFlight) {
    return portalSessionValidationInFlight;
  }

  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const normalizedBase = baseURL.replace(/\/$/, '');
  const portalBootstrapUrl = normalizedBase.endsWith('/api/v2')
    ? `${normalizedBase}/portal/auth/bootstrap`
    : `${normalizedBase}/v2/portal/auth/bootstrap`;

  portalSessionValidationInFlight = fetchFn(portalBootstrapUrl, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })
    .then((response) => response.status === 401)
    .catch(() => true)
    .finally(() => {
      portalSessionValidationInFlight = null;
    });

  return portalSessionValidationInFlight;
};

type PortalUnauthorizedHandlerError = {
  config?: {
    url?: string;
  };
};

export const createPortalUnauthorizedHandler = (dependencies?: {
  fetchFn?: typeof fetch;
  getPathname?: () => string;
  dispatchUnauthorizedEvent?: () => void;
  scheduleReset?: (callback: () => void, delayMs: number) => void;
}) => {
  const fetchFn = dependencies?.fetchFn ?? fetch;
  const getPathname = dependencies?.getPathname ?? (() => window.location.pathname);
  const dispatchUnauthorizedEvent =
    dependencies?.dispatchUnauthorizedEvent ??
    (() => window.dispatchEvent(new CustomEvent('portal:unauthorized')));
  const scheduleReset =
    dependencies?.scheduleReset ?? ((callback, delayMs) => window.setTimeout(callback, delayMs));

  return async (error: PortalUnauthorizedHandlerError): Promise<void> => {
    if (shouldIgnorePortalUnauthorized(getPathname(), error.config?.url)) {
      return;
    }

    if (portalUnauthorizedEventDispatched) {
      return;
    }

    const sessionStillInvalid = await validatePortalSessionStillInvalid(fetchFn);
    if (!sessionStillInvalid || portalUnauthorizedEventDispatched) {
      return;
    }

    portalUnauthorizedEventDispatched = true;
    dispatchUnauthorizedEvent();

    scheduleReset(() => {
      portalUnauthorizedEventDispatched = false;
    }, 1500);
  };
};

export const resetPortalUnauthorizedHandlerStateForTests = (): void => {
  portalUnauthorizedEventDispatched = false;
  portalSessionValidationInFlight = null;
};
