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

const HTTP_SCHEME = ['http', '://'].join('');
const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
const baseURL = process.env.BASE_URL || `${HTTP_SCHEME}127.0.0.1:5173`;

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
  scope?: 'primary-navigation' | 'more-navigation' | 'more-button' | 'alerts-shortcut' | 'utilities-menu';
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
    heading: /invalid invitation|accept invitation/i,
    primaryAction: /go to login/i,
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
    primaryAction: /request a new reset link/i,
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
    name: 'portal invitation',
    route: '/portal/accept-invitation/test-token',
    surface: 'public',
    expectedEntryId: 'portal-accept-invitation',
    heading: /invitation|portal/i,
    primaryAction: /portal login/i,
  },
  {
    name: 'demo dashboard',
    route: '/demo/dashboard',
    surface: 'demo',
    heading: /workbench overview|dashboard/i,
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
    heading: /workbench overview|dashboard/i,
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
    heading: /alerts/i,
    primaryAction: /create alert|edit alert rules/i,
    interaction: {
      expectedStatesAnyOf: [
        /no alert configurations yet/i,
        /create your first alert/i,
        /alert configurations/i,
      ],
      revealAction: /create alert/i,
      keyFields: [/alert name/i, /metric/i, /condition/i, /threshold/i],
      keyControls: [/test alert/i, /create alert/i],
    },
  },
  {
    name: 'alerts instances',
    route: '/alerts/instances',
    surface: 'staff',
    expectedEntryId: 'alerts-instances',
    heading: /triggered alerts/i,
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
    expectedEntryId: 'reports',
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
    heading: /admin settings/i,
    primaryAction: /show advanced|hide advanced/i,
    interaction: {
      keyControls: [/show advanced|hide advanced/i],
      expectedStatesAnyOf: [/dashboard/i, /organization/i, /branding/i],
    },
  },
  {
    name: 'admin settings users',
    route: '/settings/admin/users',
    surface: 'staff',
    expectedEntryId: 'admin-settings-users',
    heading: /admin settings/i,
  },
  {
    name: 'admin settings audit logs',
    route: '/settings/admin/audit_logs',
    surface: 'staff',
    expectedEntryId: 'admin-settings-audit-logs',
    heading: /admin settings/i,
  },
  {
    name: 'portal admin access',
    route: '/settings/admin/portal/access',
    surface: 'staff',
    expectedEntryId: 'portal-admin-access',
    heading: /portal access|portal settings|admin settings/i,
  },
  {
    name: 'api settings',
    route: '/settings/api',
    surface: 'staff',
    expectedEntryId: 'api-settings',
    heading: /api settings/i,
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
    heading: /navigation settings/i,
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
    heading: /email marketing/i,
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
    heading: /your case workspace/i,
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
  { label: 'Home', href: '/dashboard', surface: 'staff', scope: 'primary-navigation' },
  { label: 'People', href: '/contacts', surface: 'staff', scope: 'primary-navigation' },
  { label: 'Accounts', href: '/accounts?status=active', surface: 'staff', scope: 'primary-navigation' },
  { label: 'Volunteers', href: '/volunteers', surface: 'staff', scope: 'primary-navigation' },
  { label: 'More', href: '#topnav-more-menu', surface: 'staff', scope: 'more-button' },
  { label: 'Analytics', href: '/analytics', surface: 'staff', scope: 'utilities-menu' },
  { label: 'Reports', href: '/reports/builder', surface: 'staff', scope: 'utilities-menu' },
  { label: 'Alerts', href: '/alerts', surface: 'staff', scope: 'alerts-shortcut' },
];

const portalNavigationLinks = (portalCaseId?: string): ClickthroughAuditLink[] => [
  {
    label: portalCaseId ? 'Resume Case Workspace' : 'View Shared Cases',
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

const waitForAppRoute = async (page: Page) => {
  const loadingText = page.getByText('Loading...').first();
  if (await loadingText.isVisible().catch(() => false)) {
    await loadingText.waitFor({ state: 'detached', timeout: 30_000 }).catch(() => undefined);
  }
  await page.waitForLoadState('networkidle', { timeout: 2_000 }).catch(() => undefined);
};

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

const gotoAuditedRoute = async (page: Page, route: string) => {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(response, `no response for ${route}`).not.toBeNull();
  if (response) {
    expect(response.status(), `bad status for ${route}`).toBeLessThan(400);
  }
  await waitForAppRoute(page);
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

  const catalogPrimaryActionLabel = config.expectedEntryId
    ? getRouteCatalogEntryById(config.expectedEntryId)?.primaryAction?.label
    : undefined;
  const primaryAction =
    config.primaryAction || (catalogPrimaryActionLabel ? toNamePattern(catalogPrimaryActionLabel) : undefined);

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

const auditRoute = async (page: Page, config: RouteAuditConfig) => {
  await gotoAuditedRoute(page, config.route);
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
  for (const config of publicRouteAudits) {
    base(`audits ${config.name}`, async ({ page }) => {
      await auditRoute(page, config);
    });
  }
});

authTest.describe('Staff text visibility and link audit', () => {
  for (const config of staffRouteAudits) {
    authTest(`audits ${config.name}`, async ({ authenticatedPage }) => {
      await auditRoute(authenticatedPage, config);
    });
  }

  authTest('staff navigation links stay visible and canonical', async ({ authenticatedPage }) => {
    await gotoAuditedRoute(authenticatedPage, '/dashboard');
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
        const moreNavigationMenu = authenticatedPage.getByRole('menu', {
          name: /more navigation/i,
        });
        await expect(moreNavigationMenu).toBeVisible();
        link = moreNavigationMenu
          .getByRole('link', { name: toNamePattern(linkConfig.label) })
          .first();
      } else if (linkConfig.scope === 'utilities-menu') {
        const utilitiesButton = authenticatedPage.getByRole('button', { name: /utilities/i });
        await expect(utilitiesButton).toBeVisible();
        await utilitiesButton.click();

        const utilitiesMenu = authenticatedPage.getByRole('menu', { name: /utilities menu/i });
        await expect(utilitiesMenu).toBeVisible();
        link = utilitiesMenu
          .getByRole('menuitem', { name: toNamePattern(linkConfig.label) })
          .first();
      } else {
        link = authenticatedPage.getByRole('link', { name: toNamePattern(linkConfig.label) }).first();
      }

      await expect(link, `missing visible staff nav link for ${linkConfig.label}`).toBeVisible();
      if (linkConfig.scope === 'more-button') {
        continue;
      }
      await link.click();
      await waitForAppRoute(authenticatedPage);

      const currentMatch = matchRouteCatalogEntry(authenticatedPage.url());
      expect(currentMatch, `no route match after clicking ${linkConfig.label}`).not.toBeNull();
      expect(currentMatch?.surface).toBe(linkConfig.surface);
      expect(normalizeRouteLocation(authenticatedPage.url())).toBe(targetHref);

      await gotoAuditedRoute(authenticatedPage, '/dashboard');
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
    base(`audits ${config.name}`, async ({ page }) => {
      await auditRoute(page, config);
    });
  }

  base('audits fixture-backed portal case detail', async ({ page }) => {
    await auditRoute(page, {
      name: 'portal case detail',
      route: `/portal/cases/${portalFixture.caseId}`,
      surface: 'portal',
      expectedEntryId: 'portal-case-detail',
      heading: new RegExp(escapeRegex(portalFixture.caseTitle), 'i'),
    });
  });

  base('portal navigation links stay visible and canonical', async ({ page }) => {
    await gotoAuditedRoute(page, '/portal');
    await expect(page.getByRole('heading', { name: /quick actions/i })).toBeVisible();

    for (const linkConfig of portalNavigationLinks(portalFixture.caseId)) {
      const targetHref = normalizeRouteLocation(linkConfig.href);
      const link = page.getByRole('link', { name: toNamePattern(linkConfig.label) }).first();

      await expect(link, `missing visible portal nav link for ${linkConfig.label}`).toBeVisible();
      await link.click();
      await waitForAppRoute(page);

      const currentMatch = matchRouteCatalogEntry(page.url());
      expect(currentMatch, `no route match after clicking ${linkConfig.label}`).not.toBeNull();
      expect(currentMatch?.surface).toBe(linkConfig.surface);
      expect(normalizeRouteLocation(page.url())).toBe(targetHref);

      await gotoAuditedRoute(page, '/portal');
    }
  });
});
