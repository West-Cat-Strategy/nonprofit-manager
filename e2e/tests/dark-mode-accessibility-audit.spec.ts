import { test, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import '../helpers/testEnv';
import { routeCatalog, type RouteCatalogEntry } from '../../frontend/src/routes/routeCatalog';
import { ensureEffectiveAdminLoginViaAPI } from '../helpers/auth';
import {
  clearDatabase,
  createTestAccount,
  createTestContact,
  createTestDonation,
  createTestEvent,
  createTestVolunteer,
  createTestVolunteerAssignment,
  getAuthHeaders,
} from '../helpers/database';
import {
  createPublicReportLink,
  createTemplate,
  publishWebsiteSite,
  createWebsiteSite,
  deleteSavedReport,
  deleteTemplate,
  deleteWebsiteSite,
} from '../helpers/domainFixtures';
import { provisionApprovedPortalUser, loginPortalUserUI, type ProvisionedPortalUser } from '../helpers/portal';
import { unwrapSuccess } from '../helpers/apiEnvelope';
import {
  assertDarkModeApplied,
  blockedFinding,
  buildFindingsFromProbe,
  captureRouteScreenshot,
  collectFocusIssues,
  collectPageProbe,
  ensureDarkMode,
  getAuditReportPath,
  getAuditScreenshotDir,
  requiresManualReview,
  runtimeFinding,
  waitForSettledPage,
  writeAuditReport,
  type AuditFinding,
  type RouteAuditRecord,
} from '../helpers/darkModeAudit';

const apiURL = process.env.API_URL || 'http://127.0.0.1:3001';

type TaskResponse = { id?: string; data?: { id?: string } };
type CaseTypeRow = { id?: string };

type StaffFixtureState = {
  accountId?: string;
  contactId?: string;
  volunteerId?: string;
  volunteerContactId?: string;
  volunteerAssignmentId?: string;
  eventId?: string;
  publicEventId?: string;
  taskId?: string;
  caseId?: string;
  donationId?: string;
  templateId?: string;
  siteId?: string;
  publishedSiteKey?: string;
  publicReportId?: string;
  publicReportToken?: string;
};

type PortalFixtureState = {
  portalUser?: ProvisionedPortalUser;
  portalCaseId?: string;
  portalCaseTitle?: string;
};

type ResolvedAuditRoute =
  | { kind: 'ready'; path: string; fixtureState?: string }
  | { kind: 'skip'; message: string; fixtureState?: string }
  | { kind: 'blocked'; message: string; recommendation: string; fixtureState?: string };

async function createTestTask(
  page: Page,
  token: string,
  subject: string
): Promise<string> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${apiURL}/api/v2/tasks`, {
    headers,
    data: {
      subject,
      status: 'in_progress',
      priority: 'normal',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test task (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<TaskResponse>(await response.json());
  const id = payload.id || payload.data?.id;
  if (!id) {
    throw new Error(`Task id missing in response: ${JSON.stringify(payload)}`);
  }

  return id;
}

async function getCaseTypeId(page: Page, token: string): Promise<string> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.get(`${apiURL}/api/v2/cases/types`, { headers });
  if (!response.ok()) {
    throw new Error(`Failed to fetch case types (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<Array<CaseTypeRow> | { types?: Array<CaseTypeRow> }>(await response.json());
  const caseTypes = Array.isArray(payload) ? payload : payload.types || [];
  const id = caseTypes.find((row) => typeof row.id === 'string' && row.id.length > 0)?.id;
  if (!id) {
    throw new Error('No case type id available for audit fixtures.');
  }
  return id;
}

async function createTestCase(
  page: Page,
  token: string,
  title: string,
  contactId?: string
): Promise<string> {
  const ensuredContactId =
    contactId ||
    (
      await createTestContact(page, token, {
        firstName: 'Dark',
        lastName: 'Mode Case',
        email: `dark-mode-case-${Date.now()}@example.com`,
      })
    ).id;
  const caseTypeId = await getCaseTypeId(page, token);
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${apiURL}/api/v2/cases`, {
    headers,
    data: {
      contact_id: ensuredContactId,
      case_type_id: caseTypeId,
      title,
      description: 'Dark mode accessibility audit fixture',
      priority: 'medium',
      is_urgent: false,
      client_viewable: true,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test case (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapSuccess<TaskResponse>(await response.json());
  const id = payload.id || payload.data?.id;
  if (!id) {
    throw new Error(`Case id missing in response: ${JSON.stringify(payload)}`);
  }
  return id;
}

async function provisionPortalCaseFixture(
  adminPage: Page,
  token: string,
  state: PortalFixtureState
): Promise<PortalFixtureState> {
  if (state.portalUser && state.portalCaseId && state.portalCaseTitle) {
    return state;
  }

  const portalUser = state.portalUser || (await provisionApprovedPortalUser(adminPage, {
    firstName: 'Dark',
    lastName: 'Portal',
    email: `dark-mode-portal-${Date.now()}@example.com`,
    password: 'Portal123!@#',
  }));

  const caseTypeId = await getCaseTypeId(adminPage, token);
  const headers = await getAuthHeaders(adminPage, token);
  const caseTitle = `Dark Mode Portal Case ${Date.now()}`;
  const createCaseResponse = await adminPage.request.post(`${apiURL}/api/v2/cases`, {
    headers,
    data: {
      contact_id: portalUser.contactId,
      case_type_id: caseTypeId,
      title: caseTitle,
      description: 'Dark mode portal case fixture',
      client_viewable: true,
    },
  });

  if (!createCaseResponse.ok()) {
    throw new Error(`Failed to create portal case fixture (${createCaseResponse.status()}): ${await createCaseResponse.text()}`);
  }

  const casePayload = unwrapSuccess<TaskResponse>(await createCaseResponse.json());
  const caseId = casePayload.id || casePayload.data?.id;
  if (!caseId) {
    throw new Error(`Portal case id missing in response: ${JSON.stringify(casePayload)}`);
  }

  const shareResponse = await adminPage.request.put(`${apiURL}/api/v2/cases/${caseId}/client-viewable`, {
    headers,
    data: { client_viewable: true },
  });
  if (!shareResponse.ok()) {
    throw new Error(`Failed to mark portal case fixture client-viewable (${shareResponse.status()}): ${await shareResponse.text()}`);
  }

  return {
    portalUser,
    portalCaseId: caseId,
    portalCaseTitle: caseTitle,
  };
}

async function resolveRoute(
  entry: RouteCatalogEntry,
  adminPage: Page,
  authToken: string,
  staffState: StaffFixtureState,
  portalState: PortalFixtureState
): Promise<ResolvedAuditRoute> {
  if (entry.featureFlagEnv) {
    const featureFlagValue = process.env[entry.featureFlagEnv];
    if (!['1', 'true', 'yes', 'on'].includes(String(featureFlagValue || '').toLowerCase())) {
      return {
        kind: 'skip',
        message: `Skipped because feature flag ${entry.featureFlagEnv} is disabled in the current environment.`,
        fixtureState: `feature flag ${entry.featureFlagEnv}=off`,
      };
    }
  }

  const href = entry.href ?? entry.path;
  switch (entry.auditFixtureKey) {
    case 'placeholder-token':
      return {
        kind: 'ready',
        path: href.replace(/:token\b/g, 'test-token'),
        fixtureState: 'placeholder token',
      };
    case 'public-report-snapshot':
      if (!staffState.publicReportId || !staffState.publicReportToken) {
        const link = await createPublicReportLink(adminPage, authToken);
        staffState.publicReportId = link.reportId;
        staffState.publicReportToken = link.publicToken;
      }
      return {
        kind: 'ready',
        path: href.replace(/:token\b/g, staffState.publicReportToken),
        fixtureState: `public report ${staffState.publicReportId}`,
      };
    case 'public-events': {
      if (!staffState.templateId) {
        staffState.templateId = await createTemplate(adminPage, authToken);
      }
      if (!staffState.publishedSiteKey) {
        staffState.publishedSiteKey = `dark-audit-${Date.now().toString(36)}`;
      }
      if (!staffState.siteId) {
        staffState.siteId = await createWebsiteSite(adminPage, authToken, staffState.templateId, {
          subdomain: staffState.publishedSiteKey,
        });
      }
      await publishWebsiteSite(adminPage, authToken, {
        siteId: staffState.siteId,
        templateId: staffState.templateId,
      });
      if (!staffState.publicEventId) {
        staffState.publicEventId = (await createTestEvent(adminPage, authToken, {
          name: `Dark Mode Public Event ${Date.now()}`,
          isPublic: true,
        })).id;
      }
      return {
        kind: 'ready',
        path: href.replace(/:site\b/g, staffState.publishedSiteKey),
        fixtureState: `published site ${staffState.publishedSiteKey}, event ${staffState.publicEventId}`,
      };
    }
    default:
      break;
  }

  switch (entry.id) {
    case 'public-event-check-in': {
      if (!staffState.eventId) {
        staffState.eventId = (await createTestEvent(adminPage, authToken, {
          name: `Dark Mode Public Check-In ${Date.now()}`,
        })).id;
      }
      return {
        kind: 'ready',
        path: href.replace(/:id\b/g, staffState.eventId),
        fixtureState: `event ${staffState.eventId}`,
      };
    }
    case 'account-detail':
    case 'account-edit':
      if (!staffState.accountId) {
        staffState.accountId = (await createTestAccount(adminPage, authToken, {
          name: `Dark Mode Account ${Date.now()}`,
          email: `dark-mode-account-${Date.now()}@example.com`,
        })).id;
      }
      return {
        kind: 'ready',
        path: href.replace(/:id\b/g, staffState.accountId),
        fixtureState: `account ${staffState.accountId}`,
      };
    case 'contact-detail':
    case 'contact-edit':
      if (!staffState.contactId) {
        staffState.contactId = (await createTestContact(adminPage, authToken, {
          firstName: 'Dark',
          lastName: 'Mode Person',
          email: `dark-mode-contact-${Date.now()}@example.com`,
          accountId: staffState.accountId,
        })).id;
      }
      return {
        kind: 'ready',
        path: href.replace(/:id\b/g, staffState.contactId),
        fixtureState: `contact ${staffState.contactId}`,
      };
    case 'volunteer-detail':
    case 'volunteer-edit':
      if (!staffState.volunteerId) {
        const volunteer = await createTestVolunteer(adminPage, authToken, {
          firstName: 'Dark',
          lastName: 'Mode Volunteer',
          email: `dark-mode-volunteer-${Date.now()}@example.com`,
        });
        staffState.volunteerId = volunteer.id;
        staffState.volunteerContactId = volunteer.contactId;
      }
      return {
        kind: 'ready',
        path: href.replace(/:id\b/g, staffState.volunteerId),
        fixtureState: `volunteer ${staffState.volunteerId}`,
      };
    case 'volunteer-assignment-create':
      if (!staffState.volunteerId) {
        const volunteer = await createTestVolunteer(adminPage, authToken, {
          firstName: 'Dark',
          lastName: 'Mode Volunteer',
          email: `dark-mode-volunteer-${Date.now()}@example.com`,
        });
        staffState.volunteerId = volunteer.id;
        staffState.volunteerContactId = volunteer.contactId;
      }
      return {
        kind: 'ready',
        path: href.replace(/:volunteerId\b/g, staffState.volunteerId),
        fixtureState: `volunteer ${staffState.volunteerId}`,
      };
    case 'volunteer-assignment-edit':
      if (!staffState.volunteerId) {
        const volunteer = await createTestVolunteer(adminPage, authToken, {
          firstName: 'Dark',
          lastName: 'Mode Volunteer',
          email: `dark-mode-volunteer-${Date.now()}@example.com`,
        });
        staffState.volunteerId = volunteer.id;
        staffState.volunteerContactId = volunteer.contactId;
      }
      if (!staffState.eventId) {
        staffState.eventId = (await createTestEvent(adminPage, authToken, {
          name: `Dark Mode Volunteer Event ${Date.now()}`,
        })).id;
      }
      if (!staffState.volunteerAssignmentId) {
        staffState.volunteerAssignmentId = (await createTestVolunteerAssignment(adminPage, authToken, {
          volunteerId: staffState.volunteerId,
          eventId: staffState.eventId,
          assignmentType: 'event',
        })).id;
      }
      return {
        kind: 'ready',
        path: href
          .replace(/:volunteerId\b/g, staffState.volunteerId)
          .replace(/:assignmentId\b/g, staffState.volunteerAssignmentId),
        fixtureState: `volunteer ${staffState.volunteerId}, assignment ${staffState.volunteerAssignmentId}`,
      };
    case 'event-detail':
    case 'event-edit':
      if (!staffState.eventId) {
        staffState.eventId = (await createTestEvent(adminPage, authToken, {
          name: `Dark Mode Event ${Date.now()}`,
        })).id;
      }
      return {
        kind: 'ready',
        path: href.replace(/:id\b/g, staffState.eventId),
        fixtureState: `event ${staffState.eventId}`,
      };
    case 'task-detail':
    case 'task-edit':
      if (!staffState.taskId) {
        staffState.taskId = await createTestTask(adminPage, authToken, `Dark Mode Task ${Date.now()}`);
      }
      return {
        kind: 'ready',
        path: href.replace(/:id\b/g, staffState.taskId),
        fixtureState: `task ${staffState.taskId}`,
      };
    case 'case-detail':
    case 'case-edit':
      if (!staffState.caseId) {
        staffState.caseId = await createTestCase(adminPage, authToken, `Dark Mode Case ${Date.now()}`, staffState.contactId);
      }
      return {
        kind: 'ready',
        path: href.replace(/:id\b/g, staffState.caseId),
        fixtureState: `case ${staffState.caseId}`,
      };
    case 'donation-detail':
    case 'donation-edit':
      if (!staffState.accountId) {
        staffState.accountId = (await createTestAccount(adminPage, authToken, {
          name: `Dark Mode Account ${Date.now()}`,
          email: `dark-mode-account-${Date.now()}@example.com`,
        })).id;
      }
      if (!staffState.donationId) {
        staffState.donationId = (await createTestDonation(adminPage, authToken, {
          accountId: staffState.accountId,
          amount: 75,
        })).id;
      }
      return {
        kind: 'ready',
        path: href.replace(/:id\b/g, staffState.donationId),
        fixtureState: `donation ${staffState.donationId}`,
      };
    case 'website-console-redirect':
    case 'website-console-overview':
    case 'website-console-content':
    case 'website-console-forms':
    case 'website-console-integrations':
    case 'website-console-publishing':
    case 'website-console-builder':
      if (!staffState.templateId) {
        staffState.templateId = await createTemplate(adminPage, authToken);
      }
      if (!staffState.siteId) {
        staffState.publishedSiteKey = staffState.publishedSiteKey || `dark-audit-${Date.now().toString(36)}`;
        staffState.siteId = await createWebsiteSite(adminPage, authToken, staffState.templateId, {
          subdomain: staffState.publishedSiteKey,
        });
      }
      return {
        kind: 'ready',
        path: href.replace(/:siteId\b/g, staffState.siteId),
        fixtureState: `site ${staffState.siteId}`,
      };
    case 'website-builder-preview':
    case 'website-builder-editor':
      if (!staffState.templateId) {
        staffState.templateId = await createTemplate(adminPage, authToken);
      }
      return {
        kind: 'ready',
        path: href.replace(/:templateId\b/g, staffState.templateId),
        fixtureState: `template ${staffState.templateId}`,
      };
    case 'portal-case-detail': {
      const fixture = await provisionPortalCaseFixture(adminPage, authToken, portalState);
      portalState.portalUser = fixture.portalUser;
      portalState.portalCaseId = fixture.portalCaseId;
      portalState.portalCaseTitle = fixture.portalCaseTitle;
      return {
        kind: 'ready',
        path: href.replace(/:id\b/g, portalState.portalCaseId),
        fixtureState: `portal case ${portalState.portalCaseId}`,
      };
    }
    default:
      if (/:([A-Za-z0-9_]+)/.test(href)) {
        return {
          kind: 'blocked',
          message: `No dynamic fixture resolver is defined for ${entry.id}.`,
          recommendation: 'Add a deterministic fixture resolver for this parameterized route before treating the audit as complete.',
        };
      }
      return {
        kind: 'ready',
        path: href,
      };
  }
}

async function auditRoute(input: {
  page: Page;
  entry: RouteCatalogEntry;
  resolvedPath: string;
  fixtureState?: string;
}): Promise<RouteAuditRecord> {
  const { page, entry, resolvedPath, fixtureState } = input;
  let screenshot: string | undefined;

  try {
    await ensureDarkMode(page);
    await page.goto(resolvedPath, { waitUntil: 'domcontentloaded' });
    await waitForSettledPage(page);

    const darkModeApplied = await assertDarkModeApplied(page);
    const pageProbe = await collectPageProbe(page);
    const focusIssues = await collectFocusIssues(page);
    let findings = buildFindingsFromProbe({
      routeId: entry.id,
      routePath: resolvedPath,
      routeTitle: entry.title,
      surface: entry.surface,
      fixtureState,
      darkModeApplied,
      pageProbe,
      focusIssues,
    });

    if (findings.length > 0 || requiresManualReview(entry.id)) {
      screenshot = await captureRouteScreenshot(page, entry.id, resolvedPath);
      findings = buildFindingsFromProbe({
        routeId: entry.id,
        routePath: resolvedPath,
        routeTitle: entry.title,
        surface: entry.surface,
        fixtureState,
        screenshot,
        darkModeApplied,
        pageProbe,
        focusIssues,
      });
    }

    return {
      routeId: entry.id,
      routePath: resolvedPath,
      routeTitle: entry.title,
      surface: entry.surface,
      fixtureState,
      screenshot,
      findings,
    };
  } catch (error) {
    screenshot = await captureRouteScreenshot(page, entry.id, resolvedPath).catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    return {
      routeId: entry.id,
      routePath: resolvedPath,
      routeTitle: entry.title,
      surface: entry.surface,
      fixtureState,
      screenshot,
      findings: [
        runtimeFinding({
          routeId: entry.id,
          routePath: resolvedPath,
          routeTitle: entry.title,
          surface: entry.surface,
          screenshot,
          fixtureState,
          message: `Audit runtime error: ${message}`,
          recommendation: 'Stabilize the route render or fixture setup so the dark-mode audit can complete on this page.',
        }),
      ],
    };
  }
}

function pageForSurface(surface: RouteCatalogEntry['surface'], pages: {
  publicPage: Page;
  staffPage: Page;
  portalPage: Page;
}): Page {
  if (surface === 'staff') {
    return pages.staffPage;
  }
  if (surface === 'portal') {
    return pages.portalPage;
  }
  return pages.publicPage;
}

async function closeContext(context: BrowserContext | null): Promise<void> {
  if (context) {
    await context.close();
  }
}

test.describe('Dark Mode Accessibility Audit', () => {
  test('audits all cataloged routes and writes a findings report', async ({ browser }) => {
    test.setTimeout(20 * 60 * 1000);

    let publicContext: BrowserContext | null = null;
    let staffContext: BrowserContext | null = null;
    let portalContext: BrowserContext | null = null;

    const records: RouteAuditRecord[] = [];
    const staffFixtureState: StaffFixtureState = {};
    const portalFixtureState: PortalFixtureState = {};

    try {
      publicContext = await browser.newContext();
      staffContext = await browser.newContext();
      portalContext = await browser.newContext();

      const publicPage = await publicContext.newPage();
      const staffPage = await staffContext.newPage();
      const portalPage = await portalContext.newPage();

      await ensureDarkMode(publicPage);
      await ensureDarkMode(staffPage);
      await ensureDarkMode(portalPage);

      const adminSession = await ensureEffectiveAdminLoginViaAPI(staffPage, {
        firstName: 'Dark',
        lastName: 'Audit',
        organizationName: 'Dark Mode Audit Org',
      });

      await clearDatabase(staffPage, adminSession.token);
      const portalProvision = await provisionPortalCaseFixture(staffPage, adminSession.token, portalFixtureState);
      portalFixtureState.portalUser = portalProvision.portalUser;
      portalFixtureState.portalCaseId = portalProvision.portalCaseId;
      portalFixtureState.portalCaseTitle = portalProvision.portalCaseTitle;

      await loginPortalUserUI(portalPage, portalFixtureState.portalUser);

      const pages = { publicPage, staffPage, portalPage };
      const entries = routeCatalog.filter((entry) => entry.surface !== 'demo' || entry.featureStatus !== 'broken');

      for (const entry of entries) {
        const resolved = await resolveRoute(entry, staffPage, adminSession.token, staffFixtureState, portalFixtureState);
        if (resolved.kind === 'skip') {
          records.push({
            routeId: entry.id,
            routePath: entry.href ?? entry.path,
            routeTitle: entry.title,
            surface: entry.surface,
            fixtureState: resolved.fixtureState,
            skippedReason: resolved.message,
            findings: [],
          });
          continue;
        }
        if (resolved.kind === 'blocked') {
          records.push({
            routeId: entry.id,
            routePath: entry.href ?? entry.path,
            routeTitle: entry.title,
            surface: entry.surface,
            fixtureState: resolved.fixtureState,
            findings: [
              blockedFinding({
                routeId: entry.id,
                routePath: entry.href ?? entry.path,
                routeTitle: entry.title,
                surface: entry.surface,
                fixtureState: resolved.fixtureState,
                message: resolved.message,
                recommendation: resolved.recommendation,
              }),
            ],
          });
          continue;
        }

        const page = pageForSurface(entry.surface, pages);
        const record = await auditRoute({
          page,
          entry,
          resolvedPath: resolved.path,
          fixtureState: resolved.fixtureState,
        });
        records.push(record);
      }

      writeAuditReport({
        generatedAt: new Date().toISOString(),
        reportPath: getAuditReportPath(),
        screenshotRoot: getAuditScreenshotDir(),
        records,
      });
    } finally {
      if (staffFixtureState.siteId && staffFixtureState.templateId && staffContext) {
        const cleanupPage = staffContext.pages()[0];
        if (cleanupPage) {
          const authSession = await ensureEffectiveAdminLoginViaAPI(cleanupPage, {
            firstName: 'Dark',
            lastName: 'Audit',
            organizationName: 'Dark Mode Audit Org',
          });
          await deleteWebsiteSite(cleanupPage, authSession.token, staffFixtureState.siteId).catch(() => undefined);
          await deleteTemplate(cleanupPage, authSession.token, staffFixtureState.templateId).catch(() => undefined);
        }
      }
      if (staffFixtureState.publicReportId && staffContext) {
        const cleanupPage = staffContext.pages()[0];
        if (cleanupPage) {
          const authSession = await ensureEffectiveAdminLoginViaAPI(cleanupPage, {
            firstName: 'Dark',
            lastName: 'Audit',
            organizationName: 'Dark Mode Audit Org',
          });
          await deleteSavedReport(cleanupPage, authSession.token, staffFixtureState.publicReportId).catch(() => undefined);
        }
      }

      await closeContext(publicContext);
      await closeContext(staffContext);
      await closeContext(portalContext);
    }

    const findings = records.flatMap((record) => record.findings);
    const blockingFindings = findings.filter(
      (finding) =>
        !requiresManualReview(finding.routeId) &&
        ['critical', 'serious', 'blocked'].includes(finding.severity)
    );

    expect(
      blockingFindings,
      `Dark-mode audit recorded blocking findings. Review ${getAuditReportPath()} for details.`
    ).toEqual([]);
  });
});
