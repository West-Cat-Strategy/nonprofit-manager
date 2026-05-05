import { test as base, expect, type Locator, type Page } from '@playwright/test';
import '../helpers/testEnv';
import { test as authTest } from '../fixtures/auth.fixture';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';
import { unwrapSuccess } from '../helpers/apiEnvelope';
import { getAuthHeaders } from '../helpers/database';
import {
  loginPortalUserUI,
  provisionApprovedPortalUser,
  type ProvisionedPortalUser,
} from '../helpers/portal';
import {
  getRouteCatalogEntryById,
  matchRouteCatalogEntry,
  normalizeRouteLocation,
} from '../../frontend/src/routes/routeCatalog';
import {
  hasVisibleAppErrorBoundary,
  hasVisibleRouteContent as hasMountedRouteContent,
  trackModuleImportConsoleBurst,
} from '../helpers/moduleImportRecovery';

const HTTP_SCHEME = ['http', '://'].join('');
const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
const baseURL = process.env.BASE_URL || `${HTTP_SCHEME}127.0.0.1:5173`;
const APP_LOADING_LABEL = '[aria-label="Loading application"]';

type RouteAuditConfig = {
  name: string;
  route: string;
  surface: 'public' | 'staff' | 'portal' | 'demo';
  expectedEntryId?: string;
  heading?: RegExp;
  primaryAction?: RegExp;
  requiredTabs?: RegExp[];
  interaction?: {
    revealAction?: RegExp;
    keyFields?: RegExp[];
    keyControls?: RegExp[];
    expectedStatesAnyOf?: RegExp[];
  };
};

type ClickthroughAuditLink = {
  label: string;
  href: string;
  surface: 'staff' | 'portal';
  scope?: 'primary-navigation' | 'more-navigation' | 'more-button' | 'alerts-shortcut';
};

type LinkAuditRow = {
  text: string;
  accessibleName: string;
  href: string | null;
  absoluteHref: string | null;
  protocol: string;
  pathnameWithSearch: string | null;
  isVisible: boolean;
  isDownload: boolean;
};

type VisibilityAuditIssue = {
  kind: 'control' | 'link';
  name: string;
  issue: string;
};

type ModuleImportRecoveryOptions = {
  recoverModuleImportErrors?: boolean;
};

type CaseTypeRow = {
  id?: string;
};

type ProvisionedPortalCase = {
  user: ProvisionedPortalUser;
  caseId: string;
  caseTitle: string;
};

const publicRouteAudits: RouteAuditConfig[] = [
  {
    name: 'workspace redirect',
    route: '/',
    surface: 'public',
    heading: /welcome back to nonprofit manager|build your nonprofit workspace in minutes/i,
    primaryAction: /sign in|create admin account/i,
  },
  {
    name: 'login',
    route: '/login',
    surface: 'public',
    expectedEntryId: 'login',
    heading: /welcome back to nonprofit manager/i,
    primaryAction: /sign in/i,
  },
  {
    name: 'setup',
    route: '/setup',
    surface: 'public',
    heading: /build your nonprofit workspace in minutes|welcome back to nonprofit manager/i,
    primaryAction: /create admin account|sign in/i,
  },
  {
    name: 'accept invitation',
    route: '/accept-invitation/test-token',
    surface: 'public',
    expectedEntryId: 'accept-invitation',
    heading: /complete your registration|invalid invitation/i,
    primaryAction: /create account|go to login/i,
  },
  {
    name: 'forgot password',
    route: '/forgot-password',
    surface: 'public',
    expectedEntryId: 'forgot-password',
    heading: /forgot your password/i,
    primaryAction: /send reset link/i,
  },
  {
    name: 'reset password',
    route: '/reset-password/test-token',
    surface: 'public',
    expectedEntryId: 'reset-password',
    heading: /reset your password|invalid or has expired/i,
    primaryAction: /^reset password$|request a new reset link/i,
  },
  {
    name: 'portal login',
    route: '/portal/login',
    surface: 'public',
    expectedEntryId: 'portal-login',
    heading: /client portal login/i,
    primaryAction: /sign in/i,
  },
  {
    name: 'portal signup',
    route: '/portal/signup',
    surface: 'public',
    expectedEntryId: 'portal-signup',
    heading: /request portal access/i,
    primaryAction: /submit request/i,
  },
  {
    name: 'portal forgot password',
    route: '/portal/forgot-password',
    surface: 'public',
    expectedEntryId: 'portal-forgot-password',
    heading: /reset your portal password/i,
    primaryAction: /send reset link/i,
  },
  {
    name: 'portal reset password',
    route: '/portal/reset-password/test-token',
    surface: 'public',
    expectedEntryId: 'portal-reset-password',
    heading: /choose a new portal password|invalid or has expired/i,
    primaryAction: /^reset password$|request a new reset link/i,
  },
  {
    name: 'portal invitation',
    route: '/portal/accept-invitation/test-token',
    surface: 'public',
    expectedEntryId: 'portal-accept-invitation',
    heading: /accept portal invitation|invitation is invalid or expired/i,
    primaryAction: /return to portal sign in/i,
  },
  {
    name: 'demo dashboard',
    route: '/demo/dashboard',
    surface: 'demo',
    heading: /workbench|dashboard/i,
  },
  {
    name: 'demo audit',
    route: '/demo/audit',
    surface: 'demo',
    heading: /visual qa workbench for theme identity/i,
  },
];

const staffRouteAudits: RouteAuditConfig[] = [
  {
    name: 'dashboard',
    route: '/dashboard',
    surface: 'staff',
    expectedEntryId: 'dashboard',
    heading: /workbench|dashboard/i,
    primaryAction: /create intake/i,
  },
  {
    name: 'contacts',
    route: '/contacts',
    surface: 'staff',
    expectedEntryId: 'contacts',
    heading: /people/i,
    primaryAction: /new person/i,
  },
  {
    name: 'events',
    route: '/events',
    surface: 'staff',
    expectedEntryId: 'events',
    heading: /events/i,
    primaryAction: /create event/i,
  },
  {
    name: 'tasks',
    route: '/tasks',
    surface: 'staff',
    expectedEntryId: 'tasks',
    heading: /tasks/i,
    primaryAction: /new task/i,
  },
  {
    name: 'cases',
    route: '/cases',
    surface: 'staff',
    expectedEntryId: 'cases',
    heading: /cases/i,
    primaryAction: /new case/i,
  },
  {
    name: 'donations',
    route: '/donations',
    surface: 'staff',
    expectedEntryId: 'donations',
    heading: /donations/i,
    primaryAction: /record donation|new donation/i,
  },
  {
    name: 'analytics',
    route: '/analytics',
    surface: 'staff',
    expectedEntryId: 'analytics',
    heading: /analytics/i,
    primaryAction: /apply filters/i,
    interaction: {
      keyFields: [/start date/i, /end date/i],
      keyControls: [/apply filters/i, /^clear$/i],
      expectedStatesAnyOf: [
        /key performance indicators/i,
        /no analytics data available/i,
        /retry analytics/i,
      ],
    },
  },
  {
    name: 'alerts',
    route: '/alerts',
    surface: 'staff',
    expectedEntryId: 'alerts-overview',
    heading: /alert rules/i,
    primaryAction: /create alert rule/i,
    interaction: {
      expectedStatesAnyOf: [
        /no alert rules yet/i,
        /create your first alert rule/i,
        /alert rules/i,
      ],
      revealAction: /create alert rule/i,
      keyFields: [/alert rule name/i, /metric/i, /condition/i, /threshold/i],
      keyControls: [/test alert rule/i, /create alert rule/i],
    },
  },
  {
    name: 'alerts instances',
    route: '/alerts/instances',
    surface: 'staff',
    expectedEntryId: 'alerts-instances',
    heading: /active alerts/i,
  },
  {
    name: 'alerts history',
    route: '/alerts/history',
    surface: 'staff',
    expectedEntryId: 'alerts-history',
    heading: /history/i,
  },
  {
    name: 'reports',
    route: '/reports/builder',
    surface: 'staff',
    expectedEntryId: 'reports-builder',
    heading: /report builder|reports/i,
    primaryAction: /generate report/i,
  },
  {
    name: 'user settings',
    route: '/settings/user',
    surface: 'staff',
    expectedEntryId: 'user-settings',
  },
  {
    name: 'admin settings dashboard',
    route: '/settings/admin',
    surface: 'staff',
    expectedEntryId: 'admin-settings',
    heading: /admin hub|admin settings/i,
    primaryAction: /organization/i,
    interaction: {
      keyControls: [/organization/i, /roles & permissions/i],
      expectedStatesAnyOf: [/all admin sections visible/i, /high-impact tools stay labeled/i],
    },
  },
  {
    name: 'admin settings users',
    route: '/settings/admin/users',
    surface: 'staff',
    expectedEntryId: 'admin-settings-users',
    heading: /admin hub|account lookup|users & security|admin settings/i,
  },
  {
    name: 'admin settings audit logs',
    route: '/settings/admin/audit_logs',
    surface: 'staff',
    expectedEntryId: 'admin-settings-audit-logs',
    heading: /admin hub|audit logs|admin settings/i,
  },
  {
    name: 'portal admin access',
    route: '/settings/admin/portal/access',
    surface: 'staff',
    expectedEntryId: 'portal-admin-access',
    heading: /portal ops|portal access|client portal access|portal settings|admin settings/i,
  },
  {
    name: 'api settings',
    route: '/settings/api',
    surface: 'staff',
    expectedEntryId: 'api-settings',
    heading: /api settings|api & webhooks/i,
    primaryAction: /add webhook/i,
    interaction: {
      revealAction: /add webhook/i,
      keyFields: [/https:\/\/your-server\.com\/webhook/i, /optional description/i],
      keyControls: [/create webhook/i],
    },
  },
  {
    name: 'navigation settings',
    route: '/settings/navigation',
    surface: 'staff',
    expectedEntryId: 'navigation-settings',
    heading: /navigation settings|navigation/i,
    primaryAction: /reset to defaults/i,
    interaction: {
      keyControls: [/reset to defaults/i],
      expectedStatesAnyOf: [/synced/i, /offline fallback/i, /saving/i],
    },
  },
  {
    name: 'backup settings',
    route: '/settings/backup',
    surface: 'staff',
    expectedEntryId: 'backup-settings',
    heading: /data backup/i,
    primaryAction: /download backup/i,
    interaction: {
      keyFields: [/include secrets/i],
      keyControls: [/download backup/i],
    },
  },
  {
    name: 'email marketing',
    route: '/settings/email-marketing',
    surface: 'staff',
    expectedEntryId: 'email-marketing',
    heading: /communications|newsletter campaigns|email marketing/i,
  },
  {
    name: 'website builder',
    route: '/website-builder',
    surface: 'staff',
    expectedEntryId: 'website-builder',
    heading: /website builder/i,
    primaryAction: /new website/i,
    interaction: {
      keyFields: [/search templates/i],
      keyControls: [/starter templates/i, /my templates/i],
    },
  },
];

const portalRouteAudits: RouteAuditConfig[] = [
  {
    name: 'portal dashboard',
    route: '/portal',
    surface: 'portal',
    expectedEntryId: 'portal-dashboard',
    heading: /your portal home/i,
  },
  { name: 'portal profile', route: '/portal/profile', surface: 'portal', expectedEntryId: 'portal-profile', heading: /profile|account/i },
  { name: 'portal people', route: '/portal/people', surface: 'portal', expectedEntryId: 'portal-people', heading: /people/i },
  { name: 'portal events', route: '/portal/events', surface: 'portal', expectedEntryId: 'portal-events', heading: /events/i },
  { name: 'portal messages', route: '/portal/messages', surface: 'portal', expectedEntryId: 'portal-messages', heading: /messages/i },
  { name: 'portal cases', route: '/portal/cases', surface: 'portal', expectedEntryId: 'portal-cases', heading: /cases/i },
  { name: 'portal appointments', route: '/portal/appointments', surface: 'portal', expectedEntryId: 'portal-appointments', heading: /appointments/i },
  { name: 'portal documents', route: '/portal/documents', surface: 'portal', expectedEntryId: 'portal-documents', heading: /documents/i },
  { name: 'portal notes', route: '/portal/notes', surface: 'portal', expectedEntryId: 'portal-notes', heading: /notes/i },
  { name: 'portal forms', route: '/portal/forms', surface: 'portal', expectedEntryId: 'portal-forms', heading: /forms/i },
  { name: 'portal reminders', route: '/portal/reminders', surface: 'portal', expectedEntryId: 'portal-reminders', heading: /reminders/i },
];

const staffNavigationLinks: ClickthroughAuditLink[] = [
  { label: 'Workbench', href: '/dashboard', surface: 'staff', scope: 'primary-navigation' },
  { label: 'People', href: '/contacts', surface: 'staff', scope: 'primary-navigation' },
  { label: 'Cases', href: '/cases', surface: 'staff', scope: 'primary-navigation' },
  { label: 'More', href: '#topnav-more-menu', surface: 'staff', scope: 'more-button' },
  { label: 'Tasks', href: '/tasks', surface: 'staff', scope: 'more-navigation' },
  { label: 'Accounts', href: '/accounts', surface: 'staff', scope: 'more-navigation' },
  { label: 'Volunteers', href: '/volunteers', surface: 'staff', scope: 'more-navigation' },
  { label: 'Analytics', href: '/analytics', surface: 'staff', scope: 'more-navigation' },
  { label: 'Reports', href: '/reports', surface: 'staff', scope: 'more-navigation' },
  { label: 'Alert rules', href: '/alerts', surface: 'staff', scope: 'alerts-shortcut' },
];

const portalNavigationLinks = (portalCaseId?: string): ClickthroughAuditLink[] => [
  {
    label: portalCaseId ? 'Open Case' : 'View Shared Cases',
    href: portalCaseId ? `/portal/cases/${portalCaseId}` : '/portal/cases',
    surface: 'portal',
  },
  { label: 'Message Staff', href: '/portal/messages', surface: 'portal' },
  { label: 'Manage Appointments', href: '/portal/appointments', surface: 'portal' },
  { label: 'Shared Documents', href: '/portal/documents', surface: 'portal' },
  { label: 'Account Settings', href: '/portal/profile', surface: 'portal' },
];

const ignoredHrefProtocols = new Set(['mailto:', 'tel:', 'blob:', 'data:']);
const localSystemOrigins = new Set([
  new URL(baseURL).origin,
  new URL(apiURL).origin,
]);

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toNamePattern = (value: string): RegExp =>
  new RegExp(`^${escapeRegex(value).replace(/\s+/g, '\\s+')}$`, 'i');

const getNamedControlCandidates = (page: Page, name: RegExp): Locator[] => [
  page.getByRole('button', { name }).first(),
  page.getByRole('link', { name }).first(),
  page.getByRole('tab', { name }).first(),
  page.getByRole('menuitem', { name }).first(),
];

const getNamedFieldCandidates = (page: Page, name: RegExp): Locator[] => [
  page.getByLabel(name).first(),
  page.getByPlaceholder(name).first(),
  page.getByRole('textbox', { name }).first(),
  page.getByRole('combobox', { name }).first(),
  page.getByRole('spinbutton', { name }).first(),
];

const resolvePreferredVisibleLocator = async (candidates: Locator[]): Promise<Locator> => {
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }

  return candidates[0];
};

const getNamedControlLocator = async (page: Page, name: RegExp): Promise<Locator> =>
  resolvePreferredVisibleLocator(getNamedControlCandidates(page, name));

const getNamedFieldLocator = async (page: Page, name: RegExp): Promise<Locator> =>
  resolvePreferredVisibleLocator(getNamedFieldCandidates(page, name));

const getRoutePrimaryActionPattern = (
  config: RouteAuditConfig
): RegExp | undefined => {
  const catalogPrimaryActionLabel = config.expectedEntryId
    ? getRouteCatalogEntryById(config.expectedEntryId)?.primaryAction?.label
    : undefined;

  return config.primaryAction || (
    catalogPrimaryActionLabel ? toNamePattern(catalogPrimaryActionLabel) : undefined
  );
};

const getRouteReadinessLocators = (
  page: Page,
  config?: RouteAuditConfig
): Locator[] => {
  const locators: Locator[] = [
    page.locator('main').first(),
    page.getByRole('main').first(),
    page.getByRole('navigation').first(),
    page.getByRole('heading').first(),
  ];

  if (!config) {
    return locators;
  }

  if (config.heading) {
    locators.unshift(page.getByRole('heading', { name: config.heading }).first());
  }

  const primaryAction = getRoutePrimaryActionPattern(config);
  if (primaryAction) {
    locators.unshift(...getNamedControlCandidates(page, primaryAction));
  }

  for (const tabName of config.requiredTabs ?? []) {
    locators.push(page.getByRole('tab', { name: tabName }).first());
  }

  return locators;
};

const hasVisibleRouteContent = async (
  page: Page,
  readinessLocators: Locator[]
): Promise<boolean> => {
  for (const locator of readinessLocators) {
    if (await locator.isVisible().catch(() => false)) {
      return true;
    }
  }

  return hasMountedRouteContent(page);
};

const waitForAppRoute = async (
  page: Page,
  options: {
    readinessLocators?: Locator[];
    timeoutMs?: number;
  } = {}
) => {
  const {
    readinessLocators = [],
    timeoutMs = 30_000,
  } = options;
  const loadingIndicators = [
    page.locator(APP_LOADING_LABEL).first(),
    page.getByText('Loading...').first(),
  ];

  await page.waitForLoadState('domcontentloaded').catch(() => undefined);

  for (const indicator of loadingIndicators) {
    if (await indicator.isVisible().catch(() => false)) {
      await indicator.waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => undefined);
    }
  }

  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

  await expect
    .poll(
      async () => {
        for (const indicator of loadingIndicators) {
          if (await indicator.isVisible().catch(() => false)) {
            return false;
          }
        }

        return hasVisibleRouteContent(page, readinessLocators);
      },
      { timeout: timeoutMs, intervals: [250, 500, 1_000, 1_500] }
    )
    .toBeTruthy();
};

const isPatternVisible = async (page: Page, pattern: RegExp): Promise<boolean> => {
  const locators = [
    page.getByRole('heading', { name: pattern }).first(),
    page.getByRole('button', { name: pattern }).first(),
    page.getByRole('link', { name: pattern }).first(),
    page.getByRole('tab', { name: pattern }).first(),
    page.getByText(pattern).first(),
  ];

  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return true;
    }
  }

  return false;
};

const formatAuditIssues = (route: string, issues: VisibilityAuditIssue[]): string =>
  issues.map((issue) => `${route} :: ${issue.kind} "${issue.name}" -> ${issue.issue}`).join('\n');

const findRouteAuditConfig = (
  surface: RouteAuditConfig['surface'],
  route: string
): RouteAuditConfig | undefined => {
  const normalizedRoute = normalizeRouteLocation(route);
  const routeAudits =
    surface === 'staff'
      ? staffRouteAudits
      : surface === 'portal'
        ? portalRouteAudits
        : surface === 'public'
          ? publicRouteAudits
          : publicRouteAudits;

  return routeAudits.find(
    (config) =>
      config.surface === surface &&
      normalizeRouteLocation(config.route) === normalizedRoute
  );
};

const gotoAuditedRoute = async (
  page: Page,
  route: string,
  config?: RouteAuditConfig,
  options: ModuleImportRecoveryOptions = {}
) => {
  const readinessLocators = getRouteReadinessLocators(page, config);

  const navigateAndSettle = async (
    retry = false
  ): Promise<{ settled: boolean; sawRecoverableBurst: boolean; failure?: string }> => {
    const moduleImportTracker = options.recoverModuleImportErrors
      ? trackModuleImportConsoleBurst(page)
      : undefined;

    try {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      if (!response) {
        return {
          settled: false,
          sawRecoverableBurst: moduleImportTracker?.hasRecoverableBurst() ?? false,
          failure: `no response for ${route}${retry ? ' during retry' : ''}`,
        };
      }

      if (response) {
        const status = response.status();
        if (status >= 400) {
          return {
            settled: false,
            sawRecoverableBurst: moduleImportTracker?.hasRecoverableBurst() ?? false,
            failure: `bad status for ${route}${retry ? ' during retry' : ''}: ${status}`,
          };
        }
      }

      await waitForAppRoute(page, { readinessLocators });
      if (await hasVisibleAppErrorBoundary(page)) {
        return {
          settled: false,
          sawRecoverableBurst: moduleImportTracker?.hasRecoverableBurst() ?? false,
          failure: `route ${route}${retry ? ' retry' : ''} stayed on the generic error boundary`,
        };
      }

      if (!(await hasVisibleRouteContent(page, readinessLocators))) {
        return {
          settled: false,
          sawRecoverableBurst: moduleImportTracker?.hasRecoverableBurst() ?? false,
          failure: `route ${route}${retry ? ' retry' : ''} rendered no visible route content`,
        };
      }

      return {
        settled: true,
        sawRecoverableBurst: moduleImportTracker?.hasRecoverableBurst() ?? false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        settled: false,
        sawRecoverableBurst: moduleImportTracker?.hasRecoverableBurst() ?? false,
        failure: `route ${route}${retry ? ' retry' : ''} did not settle: ${message}`,
      };
    } finally {
      moduleImportTracker?.detach();
    }
  };

  const firstNavigation = await navigateAndSettle();

  // WebKit can occasionally land on the app's generic error boundary or a blank partially
  // mounted shell during a lazy route-module import burst. Retry only when that exact burst
  // was observed, then keep the audit strict on any remaining boundary or blank-shell state.
  if (
    !firstNavigation.settled &&
    options.recoverModuleImportErrors &&
    firstNavigation.sawRecoverableBurst
  ) {
    const retryNavigation = await navigateAndSettle(true);
    expect(
      retryNavigation.failure,
      `route ${route} did not settle after retry`
    ).toBeUndefined();
    return;
  }

  expect(firstNavigation.failure, `route ${route} did not settle`).toBeUndefined();
};

const waitForCanonicalNavigation = async (
  page: Page,
  targetHref: string,
  surface: ClickthroughAuditLink['surface'],
  options: ModuleImportRecoveryOptions = {}
) => {
  const normalizedTargetHref = normalizeRouteLocation(targetHref);
  const targetConfig = findRouteAuditConfig(surface, normalizedTargetHref);
  const readinessLocators = getRouteReadinessLocators(page, targetConfig);

  await expect
    .poll(
      async () => normalizeRouteLocation(page.url()),
      { timeout: 15_000, intervals: [250, 500, 1_000] }
    )
    .toBe(normalizedTargetHref);

  const clickedRouteSettled = await (async (): Promise<boolean> => {
    try {
      await waitForAppRoute(page, { readinessLocators });
      return (
        !(await hasVisibleAppErrorBoundary(page)) &&
        await hasVisibleRouteContent(page, readinessLocators)
      );
    } catch {
      return false;
    }
  })();

  // Once the click has proved it reached the expected URL, keep the direct-route
  // recovery for blank or error-boundary mounts without masking broken hrefs.
  if (!clickedRouteSettled) {
    expect(normalizeRouteLocation(page.url())).toBe(normalizedTargetHref);
    expect(
      options.recoverModuleImportErrors,
      `route ${normalizedTargetHref} reached the expected URL but did not render visible content`
    ).toBeTruthy();
    await gotoAuditedRoute(page, normalizedTargetHref, targetConfig, options);
  }
};

const collectVisibilityAuditIssues = async (page: Page): Promise<VisibilityAuditIssue[]> =>
  page.locator('h1, h2, h3, h4, h5, h6, button, a[href], [role="button"], [role="link"], [role="tab"], label, input[type="button"], input[type="submit"]').evaluateAll((elements) => {
    const getReferencedText = (element: Element, attr: string): string => {
      const ids = (element.getAttribute(attr) || '').split(/\s+/).filter(Boolean);
      return ids
        .map((id) => document.getElementById(id)?.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ');
    };

    const getDisplayName = (element: Element): string => {
      if (element instanceof HTMLInputElement) {
        return (
          element.getAttribute('aria-label') ||
          getReferencedText(element, 'aria-labelledby') ||
          element.value ||
          element.getAttribute('title') ||
          ''
        ).trim();
      }

      return (
        element.getAttribute('aria-label') ||
        getReferencedText(element, 'aria-labelledby') ||
        element.textContent ||
        element.getAttribute('title') ||
        ''
      ).trim();
    };

    const isVisible = (element: Element): boolean => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    };

    return elements.flatMap((element) => {
      if (!isVisible(element)) {
        return [];
      }

      const name = getDisplayName(element);
      const role = element.getAttribute('role') || element.tagName.toLowerCase();
      const style = window.getComputedStyle(element);
      const issues: VisibilityAuditIssue[] = [];

      if (!name) {
        issues.push({
          kind: 'control',
          name: role,
          issue: 'visible element has no readable text or accessible label',
        });
      }

      if (style.color === 'rgba(0, 0, 0, 0)' || style.webkitTextFillColor === 'transparent') {
        issues.push({
          kind: 'control',
          name: name || role,
          issue: 'text appears fully transparent',
        });
      }

      return issues;
    });
  });

const collectVisibleLinks = async (page: Page): Promise<LinkAuditRow[]> =>
  page.locator('a[href]').evaluateAll((elements, currentBaseUrl) => {
    const isVisible = (element: Element): boolean => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    };

    const base = new URL(String(currentBaseUrl));

    return elements.map((element) => {
      const anchor = element as HTMLAnchorElement;
      const rawHref = anchor.getAttribute('href');
      const absolute = rawHref ? new URL(rawHref, base).toString() : null;
      const absoluteUrl = absolute ? new URL(absolute) : null;
      const accessibleName = (
        anchor.getAttribute('aria-label') ||
        anchor.textContent ||
        anchor.getAttribute('title') ||
        ''
      ).trim();

      return {
        text: (anchor.textContent || '').trim(),
        accessibleName,
        href: rawHref,
        absoluteHref: absolute,
        protocol: absoluteUrl?.protocol || '',
        pathnameWithSearch: absoluteUrl ? `${absoluteUrl.pathname}${absoluteUrl.search}` : null,
        isVisible: isVisible(anchor),
        isDownload: anchor.hasAttribute('download'),
      };
    });
  }, baseURL);

const assertCatalogRouteMatch = async (
  page: Page,
  expectedSurface: RouteAuditConfig['surface'],
  expectedEntryId?: string
) => {
  const currentMatch = matchRouteCatalogEntry(page.url());
  expect(currentMatch, `missing route catalog match for ${page.url()}`).not.toBeNull();
  expect(currentMatch?.surface).toBe(expectedSurface);
  if (expectedEntryId) {
    expect(currentMatch?.id).toBe(expectedEntryId);
  }
};

const assertVisibleTextAndLinks = async (page: Page, route: string) => {
  const issues = await collectVisibilityAuditIssues(page);
  const visibleLinks = await collectVisibleLinks(page);

  for (const link of visibleLinks) {
    if (!link.isVisible) {
      continue;
    }

    const name = link.accessibleName || link.text || link.href || 'link';
    const href = (link.href || '').trim();

    if (!href) {
      issues.push({ kind: 'link', name, issue: 'visible link is missing href' });
      continue;
    }

    if (href === '#') {
      issues.push({ kind: 'link', name, issue: 'visible link points to bare #' });
      continue;
    }

    if (href.startsWith('#')) {
      continue;
    }

    if (href.toLowerCase().startsWith('javascript:')) {
      issues.push({ kind: 'link', name, issue: 'visible link uses javascript: href' });
      continue;
    }

    if (link.isDownload || ignoredHrefProtocols.has(link.protocol)) {
      continue;
    }

    if (!link.absoluteHref) {
      issues.push({ kind: 'link', name, issue: 'visible link could not be resolved' });
      continue;
    }

    const absoluteUrl = new URL(link.absoluteHref);
    if (localSystemOrigins.has(absoluteUrl.origin) && absoluteUrl.pathname.startsWith('/api/')) {
      continue;
    }

    if (localSystemOrigins.has(absoluteUrl.origin)) {
      const matchedRoute = matchRouteCatalogEntry(link.absoluteHref);
      if (!matchedRoute) {
        issues.push({
          kind: 'link',
          name,
          issue: `internal href does not resolve to a known app route (${absoluteUrl.pathname}${absoluteUrl.search})`,
        });
      }
      continue;
    }

    try {
      const response = await page.request.get(link.absoluteHref, {
        failOnStatusCode: false,
        maxRedirects: 5,
        timeout: 10_000,
      });

      if (response.status() >= 500) {
        issues.push({
          kind: 'link',
          name,
          issue: `external href returned ${response.status()} (${link.absoluteHref})`,
        });
      }
    } catch (error) {
      issues.push({
        kind: 'link',
        name,
        issue: `external href request failed (${link.absoluteHref}): ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  expect(issues, formatAuditIssues(route, issues)).toEqual([]);
};

const assertRequiredChrome = async (page: Page, config: RouteAuditConfig) => {
  if (config.heading) {
    await expect(page.getByRole('heading', { name: config.heading }).first()).toBeVisible();
  } else {
    await expect(page.getByRole('heading').first()).toBeVisible();
  }

  const primaryAction = getRoutePrimaryActionPattern(config);

  if (primaryAction) {
    const actionLocator = await getNamedControlLocator(page, primaryAction);
    await expect(actionLocator).toBeVisible();
  }

  for (const tabName of config.requiredTabs ?? []) {
    await expect(page.getByRole('tab', { name: tabName }).first()).toBeVisible();
  }
};

const assertInteractionExpectations = async (page: Page, config: RouteAuditConfig) => {
  const interaction = config.interaction;
  if (!interaction) {
    return;
  }

  if (interaction.expectedStatesAnyOf && interaction.expectedStatesAnyOf.length > 0) {
    await expect
      .poll(
        async () => {
          for (const pattern of interaction.expectedStatesAnyOf ?? []) {
            if (await isPatternVisible(page, pattern)) {
              return true;
            }
          }
          return false;
        },
        { timeout: 15_000, intervals: [500, 1_000, 1_500] }
      )
      .toBeTruthy();
  }

  if (interaction.revealAction) {
    const revealControl = await getNamedControlLocator(page, interaction.revealAction);
    await expect(revealControl).toBeVisible();
    await revealControl.click();
    await waitForAppRoute(page);
  }

  for (const fieldName of interaction.keyFields ?? []) {
    await expect(await getNamedFieldLocator(page, fieldName)).toBeVisible();
  }

  for (const controlName of interaction.keyControls ?? []) {
    await expect(await getNamedControlLocator(page, controlName)).toBeVisible();
  }
};

const auditRoute = async (
  page: Page,
  config: RouteAuditConfig,
  options: ModuleImportRecoveryOptions = {}
) => {
  await gotoAuditedRoute(page, config.route, config, options);
  await assertCatalogRouteMatch(page, config.surface, config.expectedEntryId);
  await assertRequiredChrome(page, config);
  await assertVisibleTextAndLinks(page, normalizeRouteLocation(page.url()));
  await assertInteractionExpectations(page, config);
};

const provisionPortalCaseFixture = async (page: Page): Promise<ProvisionedPortalCase> => {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const portalUser = await provisionApprovedPortalUser(page, {
    firstName: 'Link',
    lastName: 'Visibility',
    email: `portal-visibility-audit-${uniqueSuffix}@example.com`,
    password: 'Portal123!@#',
  });
  const adminSession = await ensureEffectiveAdminLoginViaAPI(page, {
    firstName: 'Route',
    lastName: 'Audit',
    organizationName: 'Visibility Audit Admin Org',
  });
  const headers = await getAuthHeaders(page, adminSession.token);
  const caseTypesResponse = await page.request.get(`${apiURL}/api/v2/cases/types`, {
    headers,
  });
  expect(caseTypesResponse.ok(), `Failed to fetch case types: ${await caseTypesResponse.text()}`).toBeTruthy();
  const caseTypesPayload = unwrapSuccess<Array<CaseTypeRow> | { types?: Array<CaseTypeRow> }>(
    await caseTypesResponse.json()
  );
  const caseTypes = Array.isArray(caseTypesPayload) ? caseTypesPayload : caseTypesPayload?.types || [];
  const caseTypeId = caseTypes.find((row) => typeof row.id === 'string' && row.id.length > 0)?.id;
  expect(caseTypeId, 'No case type id returned while provisioning portal case fixture').toBeTruthy();

  const caseTitle = `Portal Visibility Case ${uniqueSuffix}`;
  const createCaseResponse = await page.request.post(`${apiURL}/api/v2/cases`, {
    headers,
    data: {
      contact_id: portalUser.contactId,
      case_type_id: caseTypeId,
      title: caseTitle,
      description: 'Portal visibility audit fixture',
      client_viewable: true,
    },
  });
  expect(
    createCaseResponse.ok(),
    `Failed to create portal fixture case: ${await createCaseResponse.text()}`
  ).toBeTruthy();
  const casePayload = unwrapSuccess<{ id?: string; data?: { id?: string } }>(
    await createCaseResponse.json()
  );
  const caseId = casePayload.id || casePayload.data?.id;
  expect(caseId, 'Missing case id from fixture case response').toBeTruthy();

  const shareResponse = await page.request.put(`${apiURL}/api/v2/cases/${caseId}/client-viewable`, {
    headers,
    data: {
      client_viewable: true,
    },
  });
  expect(
    shareResponse.ok(),
    `Failed to mark fixture case as client-viewable: ${await shareResponse.text()}`
  ).toBeTruthy();

  return {
    user: portalUser,
    caseId: String(caseId),
    caseTitle,
  };
};

base.describe('Public text visibility and link audit', () => {
  base.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await ensureEffectiveAdminLoginViaAPI(page, {
        firstName: 'Visibility',
        lastName: 'Audit',
        organizationName: 'Visibility Audit Public Org',
      });
    } finally {
      await context.close();
    }
  });

  for (const config of publicRouteAudits) {
    base(`audits ${config.name}`, async ({ page, browserName }) => {
      await auditRoute(page, config, { recoverModuleImportErrors: browserName === 'webkit' });
    });
  }
});

authTest.describe('Staff text visibility and link audit', () => {
  for (const config of staffRouteAudits) {
    authTest(`audits ${config.name}`, async ({ authenticatedPage, browserName }) => {
      await auditRoute(authenticatedPage, config, {
        recoverModuleImportErrors: browserName === 'webkit',
      });
    });
  }

  authTest('staff navigation links stay visible and canonical', async ({
    authenticatedPage,
    browserName,
  }) => {
    const recoveryOptions = { recoverModuleImportErrors: browserName === 'webkit' };
    await gotoAuditedRoute(
      authenticatedPage,
      '/dashboard',
      findRouteAuditConfig('staff', '/dashboard'),
      recoveryOptions
    );
    const primaryNavigation = authenticatedPage.getByRole('navigation', {
      name: /primary navigation/i,
    });
    await expect(primaryNavigation).toBeVisible();
    const moreNavigationButton = authenticatedPage.getByRole('button', {
      name: /more navigation/i,
    });

    for (const linkConfig of staffNavigationLinks) {
      const targetHref = normalizeRouteLocation(linkConfig.href);
      let link;

      if (linkConfig.scope === 'primary-navigation') {
        link = primaryNavigation.getByRole('link', { name: toNamePattern(linkConfig.label) }).first();
      } else if (linkConfig.scope === 'more-button') {
        link = moreNavigationButton.first();
      } else if (linkConfig.scope === 'more-navigation') {
        await expect(moreNavigationButton).toBeVisible();
        await moreNavigationButton.click();
        const moreNavigationMenu = authenticatedPage.getByRole('navigation', {
          name: /more navigation/i,
        });
        await expect(moreNavigationMenu).toBeVisible();
        link = moreNavigationMenu
          .getByRole('link', { name: toNamePattern(linkConfig.label) })
          .first();
      } else {
        link = authenticatedPage.getByRole('link', { name: toNamePattern(linkConfig.label) }).first();
      }

      await expect(link, `missing visible staff nav link for ${linkConfig.label}`).toBeVisible();
      if (linkConfig.scope === 'more-button') {
        continue;
      }
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await waitForCanonicalNavigation(
        authenticatedPage,
        targetHref,
        linkConfig.surface,
        recoveryOptions
      );

      const currentMatch = matchRouteCatalogEntry(authenticatedPage.url());
      expect(currentMatch, `no route match after clicking ${linkConfig.label}`).not.toBeNull();
      expect(currentMatch?.surface).toBe(linkConfig.surface);
      expect(normalizeRouteLocation(authenticatedPage.url())).toBe(targetHref);

      await gotoAuditedRoute(
        authenticatedPage,
        '/dashboard',
        findRouteAuditConfig('staff', '/dashboard'),
        recoveryOptions
      );
    }
  });
});

base.describe('Portal text visibility and link audit', () => {
  let portalFixture: ProvisionedPortalCase;

  base.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    portalFixture = await provisionPortalCaseFixture(page);
    await context.close();
  });

  base.beforeEach(async ({ page }) => {
    await loginPortalUserUI(page, portalFixture.user);
  });

  for (const config of portalRouteAudits) {
    base(`audits ${config.name}`, async ({ page, browserName }) => {
      await auditRoute(page, config, { recoverModuleImportErrors: browserName === 'webkit' });
    });
  }

  base('audits fixture-backed portal case detail', async ({ page, browserName }) => {
    await auditRoute(page, {
      name: 'portal case detail',
      route: `/portal/cases/${portalFixture.caseId}`,
      surface: 'portal',
      expectedEntryId: 'portal-case-detail',
      heading: new RegExp(escapeRegex(portalFixture.caseTitle), 'i'),
    }, {
      recoverModuleImportErrors: browserName === 'webkit',
    });
  });

  base('portal navigation links stay visible and canonical', async ({ page, browserName }) => {
    const recoveryOptions = { recoverModuleImportErrors: browserName === 'webkit' };
    await gotoAuditedRoute(
      page,
      '/portal',
      findRouteAuditConfig('portal', '/portal'),
      recoveryOptions
    );
    await expect(page.getByRole('heading', { name: /quick actions/i })).toBeVisible();

    for (const linkConfig of portalNavigationLinks(portalFixture.caseId)) {
      const targetHref = normalizeRouteLocation(linkConfig.href);
      const link = page.getByRole('link', { name: toNamePattern(linkConfig.label) }).first();

      await expect(link, `missing visible portal nav link for ${linkConfig.label}`).toBeVisible();
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await waitForCanonicalNavigation(page, targetHref, linkConfig.surface, recoveryOptions);

      const currentMatch = matchRouteCatalogEntry(page.url());
      expect(currentMatch, `no route match after clicking ${linkConfig.label}`).not.toBeNull();
      expect(currentMatch?.surface).toBe(linkConfig.surface);
      expect(normalizeRouteLocation(page.url())).toBe(targetHref);

      await gotoAuditedRoute(
        page,
        '/portal',
        findRouteAuditConfig('portal', '/portal'),
        recoveryOptions
      );
    }
  });
});
