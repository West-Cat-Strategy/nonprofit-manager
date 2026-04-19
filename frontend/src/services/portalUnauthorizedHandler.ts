let portalUnauthorizedEventDispatched = false;

const shouldIgnorePortalUnauthorized = (pathname: string, requestUrl?: string): boolean => {
  const isPortalBootstrap = requestUrl?.includes('/portal/auth/bootstrap');
  const isPortalLogin = pathname.startsWith('/portal/login');
  const isPortalSignup = pathname.startsWith('/portal/signup');
  const isPortalInvitation = pathname.startsWith('/portal/accept-invitation');

  return Boolean(isPortalBootstrap || isPortalLogin || isPortalSignup || isPortalInvitation);
};

type PortalUnauthorizedHandlerError = {
  config?: {
    url?: string;
  };
};

export const createPortalUnauthorizedHandler = (dependencies?: {
  getPathname?: () => string;
  dispatchUnauthorizedEvent?: () => void;
  scheduleReset?: (callback: () => void, delayMs: number) => void;
}) => {
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

    portalUnauthorizedEventDispatched = true;
    dispatchUnauthorizedEvent();

    scheduleReset(() => {
      portalUnauthorizedEventDispatched = false;
    }, 1500);
  };
};

export const resetPortalUnauthorizedHandlerStateForTests = (): void => {
  portalUnauthorizedEventDispatched = false;
};
