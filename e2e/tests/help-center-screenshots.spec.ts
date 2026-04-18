import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { expect, test, type Page } from '@playwright/test';
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
import { createSavedReport } from '../helpers/domainFixtures';
import { waitForPageReady } from '../helpers/routeHelpers';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const DOCS_ROOT = path.resolve(__dirname, '..', '..', 'docs', 'help-center', 'staff');
const SCREENSHOT_ROOT = path.join(DOCS_ROOT, 'assets', 'screenshots');

type ScheduledReportSeed = {
  id: string;
  savedReportId: string;
  name: string;
};

type SeedState = {
  accountId: string;
  contacts: Array<{ id: string; name: string }>;
  volunteers: Array<{ id: string; name: string }>;
  events: Array<{ id: string; name: string }>;
  donations: Array<{ id: string; label: string }>;
  savedReportId: string;
  savedReportName?: string;
  scheduledReport: ScheduledReportSeed;
};

const buildWorkspaceModuleSettings = (overrides: Partial<Record<string, boolean>> = {}) => ({
  contacts: true,
  accounts: true,
  volunteers: true,
  events: true,
  tasks: true,
  cases: true,
  followUps: true,
  opportunities: true,
  externalServiceProviders: true,
  teamChat: true,
  donations: true,
  recurringDonations: true,
  reconciliation: true,
  analytics: true,
  reports: true,
  scheduledReports: true,
  alerts: true,
  ...overrides,
});

const docsFileUrl = (filename: string): string =>
  pathToFileURL(path.join(DOCS_ROOT, filename)).href;

const ensureParentDir = (filePath: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const getScreenshotPath = (relativePath: string): string => path.join(SCREENSHOT_ROOT, relativePath);

const writeShot = async (
  page: Page,
  relativePath: string,
  options: { fullPage?: boolean } = {}
): Promise<string> => {
  const absolutePath = getScreenshotPath(relativePath);
  ensureParentDir(absolutePath);
  await page.screenshot({
    path: absolutePath,
    fullPage: options.fullPage ?? false,
    animations: 'disabled',
    caret: 'hide',
  });
  return absolutePath;
};

const writeElementShot = async (
  page: Page,
  selector: string,
  relativePath: string
): Promise<string> => {
  const absolutePath = getScreenshotPath(relativePath);
  ensureParentDir(absolutePath);
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: absolutePath,
    animations: 'disabled',
  });
  return absolutePath;
};

const blurActiveElement = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  });
};

const gotoApp = async (page: Page, route: string): Promise<void> => {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.scrollTo(0, 0));
};

const gotoDocs = async (page: Page, filename: string): Promise<void> => {
  await page.goto(docsFileUrl(filename), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.scrollTo(0, 0));
};

const createScheduledReport = async (
  page: Page,
  token: string,
  savedReportId: string
): Promise<ScheduledReportSeed> => {
  const headers = await getAuthHeaders(page, token);
  const name = 'Weekly Contact Summary';
  const response = await page.request.post(`${API_URL}/api/v2/scheduled-reports`, {
    headers,
    data: {
      saved_report_id: savedReportId,
      name,
      recipients: ['ops@example.org'],
      format: 'csv',
      frequency: 'weekly',
      timezone: TIMEZONE,
      hour: 9,
      minute: 0,
      day_of_week: 1,
      is_active: true,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create scheduled report (${response.status()}): ${await response.text()}`
    );
  }

  const body = await response.json();
  const id = body.id || body.data?.id;
  if (!id || typeof id !== 'string') {
    throw new Error(`Scheduled report created but id missing in response: ${JSON.stringify(body)}`);
  }

  return { id, savedReportId, name };
};

const resolveSavedReportName = async (
  page: Page,
  token: string,
  savedReportId: string
): Promise<string | undefined> => {
  const headers = await getAuthHeaders(page, token);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await page.request.get(`${API_URL}/api/v2/saved-reports`, { headers });
    if (response.ok()) {
      const payload = await response.json();
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data?.items)
              ? payload.data.items
              : [];
      const match = list.find((report: { id?: string; saved_report_id?: string }) => {
        const id = report.id || report.saved_report_id;
        return id === savedReportId;
      });
      if (match?.name && typeof match.name === 'string') {
        return match.name;
      }
    }
    await page.waitForTimeout(350 * (attempt + 1));
  }

  return undefined;
};

test.describe.serial('help center screenshot refresh', () => {
  test.setTimeout(30 * 60 * 1000);

  test('capture screenshot set for the staff help center docs', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1440, height: 1200 });

    const adminSession = await ensureEffectiveAdminLoginViaAPI(page);
    const token = adminSession.token;

    await clearDatabase(page, token);

    const screenshotManifest: string[] = [];
    const recordShot = (relativePath: string, absolutePath: string): void => {
      screenshotManifest.push(path.relative(process.cwd(), absolutePath));
      console.log(`[help-center] wrote ${relativePath}`);
    };

    await gotoApp(page, '/contacts?search=__no_results__');
    await waitForPageReady(page, {
      selectors: ['text=No contacts found'],
      timeoutMs: 30_000,
    });
    recordShot(
      'faq/empty-state.png',
      await writeShot(page, 'faq/empty-state.png')
    );

    const supportAccount = await createTestAccount(page, token, {
      name: 'Harbor Support Fund',
      accountType: 'organization',
      category: 'donor',
      industry: 'nonprofit',
      email: 'support@example.org',
      phone: '604-555-0100',
    });

    const personA = await createTestContact(page, token, {
      firstName: 'Maya',
      lastName: 'Chen',
      email: 'maya.chen@example.org',
      phone: '604-555-0101',
      contactType: 'donor',
      accountId: supportAccount.id,
    });

    const personB = await createTestContact(page, token, {
      firstName: 'Jordan',
      lastName: 'Lee',
      email: 'jordan.lee@example.org',
      phone: '604-555-0102',
      contactType: 'volunteer',
      accountId: supportAccount.id,
    });

    const volunteerA = await createTestVolunteer(page, token, {
      firstName: 'Riley',
      lastName: 'Adams',
      email: 'riley.adams@example.org',
      availabilityStatus: 'available',
      backgroundCheckStatus: 'approved',
    });

    const volunteerB = await createTestVolunteer(page, token, {
      firstName: 'Sam',
      lastName: 'Brooks',
      email: 'sam.brooks@example.org',
      availabilityStatus: 'limited',
      backgroundCheckStatus: 'pending',
    });

    const eventA = await createTestEvent(page, token, {
      name: 'Spring Benefit',
      eventType: 'fundraiser',
      location: 'River Hall',
      capacity: 120,
      isPublic: true,
    });

    const eventB = await createTestEvent(page, token, {
      name: 'Volunteer Orientation',
      eventType: 'training',
      location: 'North Room',
      capacity: 40,
      isPublic: false,
    });

    const volunteerAssignment = await createTestVolunteerAssignment(page, token, {
      volunteerId: volunteerA.id,
      eventId: eventA.id,
      assignmentType: 'event',
      role: 'Greeter',
      status: 'scheduled',
      notes: 'Front desk support',
      hoursLogged: 0,
    });

    const donationA = await createTestDonation(page, token, {
      accountId: supportAccount.id,
      amount: 250,
      paymentMethod: 'credit_card',
      paymentStatus: 'completed',
    });

    const donationB = await createTestDonation(page, token, {
      accountId: supportAccount.id,
      amount: 75,
      paymentMethod: 'check',
      paymentStatus: 'pending',
    });

    const savedReportId = await createSavedReport(page, token);
    const scheduledReport = await createScheduledReport(page, token, savedReportId);
    const savedReportName = await resolveSavedReportName(page, token, savedReportId);

    const seeded: SeedState = {
      accountId: supportAccount.id,
      contacts: [
        { id: personA.id, name: 'Maya Chen' },
        { id: personB.id, name: 'Jordan Lee' },
      ],
      volunteers: [
        { id: volunteerA.id, name: 'Riley Adams' },
        { id: volunteerB.id, name: 'Sam Brooks' },
      ],
      events: [
        { id: eventA.id, name: 'Spring Benefit' },
        { id: eventB.id, name: 'Volunteer Orientation' },
      ],
      donations: [
        { id: donationA.id, label: 'Completed credit card gift' },
        { id: donationB.id, label: 'Pending check gift' },
      ],
      savedReportId,
      savedReportName,
      scheduledReport,
    };
    console.log(
      `[help-center] seeded account=${seeded.accountId} volunteerAssignment=${volunteerAssignment.id} scheduledReport=${seeded.scheduledReport.id}`
    );

    await gotoApp(page, '/dashboard');
    await waitForPageReady(page, {
      selectors: [
        'button:has-text("Customize View")',
        'a:has-text("Customize Layout"):visible',
        'h2:has-text("Focus Queue")',
        'h2:has-text("Pinned Shortcuts")',
      ],
      timeoutMs: 30_000,
    });
    recordShot(
      'quick-start/dashboard-entry-point.png',
      await writeShot(page, 'quick-start/dashboard-entry-point.png')
    );
    await blurActiveElement(page);
    recordShot(
      'dashboard/dashboard-overview.png',
      await writeShot(page, 'dashboard/dashboard-overview.png', { fullPage: true })
    );

    await gotoApp(page, '/dashboard/custom');
    await waitForPageReady(page, {
      selectors: [
        'a:has-text("Back to Workbench"):visible',
        'a:has-text("View Settings"):visible',
        'button:has-text("Edit Layout")',
      ],
      timeoutMs: 30_000,
    });
    await page.getByRole('button', { name: 'Edit Layout' }).click();
    await waitForPageReady(page, {
      selectors: [
        'button:has-text("Add Widget")',
        'button:has-text("Reset to Default")',
        'button:has-text("Save Layout")',
      ],
      timeoutMs: 30_000,
    });
    await blurActiveElement(page);
    recordShot(
      'dashboard/custom-dashboard-editor.png',
      await writeShot(page, 'dashboard/custom-dashboard-editor.png')
    );

    await gotoApp(page, '/contacts');
    await waitForPageReady(page, {
      selectors: ['h1:has-text("People")', 'button:has-text("New Person")', 'table'],
      timeoutMs: 30_000,
    });
    recordShot(
      'workspace-basics/list-filter-bar.png',
      await writeShot(page, 'workspace-basics/list-filter-bar.png')
    );
    recordShot('people-accounts/people-list.png', await writeShot(page, 'people-accounts/people-list.png'));

    await gotoApp(page, `/contacts/${seeded.contacts[0].id}`);
    await waitForPageReady(page, {
      selectors: [
        `h1:has-text("${seeded.contacts[0].name}")`,
        '[role="tablist"]',
        'text=Snapshot',
      ],
      timeoutMs: 30_000,
    });
    recordShot('people-accounts/person-detail.png', await writeShot(page, 'people-accounts/person-detail.png'));

    await gotoApp(page, `/accounts/${seeded.accountId}`);
    await waitForPageReady(page, {
      selectors: ['text=Account Information', 'text=Payment History'],
      timeoutMs: 30_000,
    });
    recordShot('people-accounts/account-detail.png', await writeShot(page, 'people-accounts/account-detail.png'));

    await gotoApp(page, '/volunteers');
    await waitForPageReady(page, {
      selectors: ['h1:has-text("Volunteers")', 'button:has-text("New Volunteer")', 'table'],
      timeoutMs: 30_000,
    });
    recordShot('volunteers/volunteer-list.png', await writeShot(page, 'volunteers/volunteer-list.png'));

    await gotoApp(page, `/volunteers/${seeded.volunteers[0].id}`);
    await waitForPageReady(page, {
      selectors: ['text=Contact Information', 'text=Assignments (1)'],
      timeoutMs: 30_000,
    });
    recordShot(
      'volunteers/volunteer-detail.png',
      await writeShot(page, 'volunteers/volunteer-detail.png')
    );

    await page.goto(`${BASE_URL}/volunteers/${volunteerA.id}/assignments/new`, {
      waitUntil: 'domcontentloaded',
    });
    await waitForPageReady(page, {
      selectors: ['h1:has-text("Create Assignment")'],
      timeoutMs: 30_000,
    });
    recordShot(
      'volunteers/volunteer-assignment.png',
      await writeShot(page, 'volunteers/volunteer-assignment.png')
    );

    await gotoApp(page, '/events');
    await waitForPageReady(page, {
      selectors: ['h1:has-text("Events")', 'button:has-text("Today")', 'text=Calendar'],
      timeoutMs: 30_000,
    });
    recordShot('events/event-list.png', await writeShot(page, 'events/event-list.png'));

    await gotoApp(page, `/events/${seeded.events[0].id}`);
    await waitForPageReady(page, {
      selectors: [`h1:has-text("${seeded.events[0].name}")`, 'button:has-text("Overview")'],
      timeoutMs: 30_000,
    });
    recordShot('events/event-detail.png', await writeShot(page, 'events/event-detail.png'));

    await gotoApp(page, '/events/check-in');
    await waitForPageReady(page, {
      selectors: ['text=Event Check-In Desk', 'text=Global QR Scan'],
      timeoutMs: 30_000,
    });
    recordShot('events/event-check-in.png', await writeShot(page, 'events/event-check-in.png'));

    await gotoApp(page, '/donations');
    await waitForPageReady(page, {
      selectors: ['h1:has-text("Donations")', 'input[aria-label="Search donations"]', 'table'],
      timeoutMs: 30_000,
    });
    recordShot('donations/donations-list.png', await writeShot(page, 'donations/donations-list.png'));

    await gotoApp(page, `/donations/${donationA.id}`);
    await waitForPageReady(page, {
      selectors: ['text=Donation Information', 'text=Receipt Information'],
      timeoutMs: 30_000,
    });
    recordShot('donations/donation-detail.png', await writeShot(page, 'donations/donation-detail.png'));

    await gotoApp(page, '/reports/builder');
    await waitForPageReady(page, {
      selectors: [
        'text=Report Builder',
        'button:has-text("Generate Report")',
        'text=1. Select Entity',
      ],
      timeoutMs: 30_000,
    });
    recordShot('reports/report-builder.png', await writeShot(page, 'reports/report-builder.png'));

    const nowIso = new Date().toISOString();
    const nextRunIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduledReportsSnapshot = [
      {
        id: seeded.scheduledReport.id,
        organization_id: 'org-help-center',
        saved_report_id: seeded.savedReportId,
        name: seeded.scheduledReport.name,
        recipients: ['ops@example.org'],
        format: 'csv',
        frequency: 'weekly',
        timezone: TIMEZONE,
        hour: 9,
        minute: 0,
        day_of_week: 1,
        day_of_month: null,
        is_active: true,
        last_run_at: null,
        next_run_at: nextRunIso,
        processing_started_at: null,
        last_error: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ];
    const savedReportsSnapshot = {
      items: [
        {
          id: seeded.savedReportId,
          name: seeded.savedReportName || 'Weekly Contact Summary',
          entity: 'contacts',
          created_at: nowIso,
          updated_at: nowIso,
          is_public: false,
        },
      ],
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        total_pages: 1,
      },
    };

    await page.route('**/api/**/scheduled-reports**', async (route) => {
      const request = route.request();
      const url = request.url();
      if (request.method() !== 'GET' || !/\/scheduled-reports(\?|$)/.test(url)) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scheduledReportsSnapshot),
      });
    });

    await page.route('**/api/**/saved-reports**', async (route) => {
      const request = route.request();
      const url = request.url();
      if (request.method() !== 'GET' || !/\/saved-reports(\?|$)/.test(url)) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(savedReportsSnapshot),
      });
    });

    await gotoApp(page, '/reports/saved');
    const savedReportSelectors = ['h1:has-text("Saved Reports")'];
    if (seeded.savedReportName) {
      savedReportSelectors.push(`text=${seeded.savedReportName}`);
    } else {
      savedReportSelectors.push('table');
    }
    await waitForPageReady(page, {
      selectors: savedReportSelectors,
      timeoutMs: 60_000,
    });
    recordShot('reports/saved-reports.png', await writeShot(page, 'reports/saved-reports.png'));
    await gotoApp(page, '/reports/scheduled');
    await waitForPageReady(page, {
      selectors: ['h1:has-text("Scheduled Reports")', `text=${seeded.scheduledReport.name}`],
      timeoutMs: 60_000,
    });
    recordShot('reports/scheduled-reports.png', await writeShot(page, 'reports/scheduled-reports.png'));
    await page.unroute('**/api/**/scheduled-reports**');
    await page.unroute('**/api/**/saved-reports**');

    await gotoDocs(page, 'index.html');
    await waitForPageReady(page, {
      selectors: ['.guide-grid'],
      timeoutMs: 30_000,
    });
    recordShot(
      'index/landing-guide-cards.png',
      await writeElementShot(page, '.guide-grid', 'index/landing-guide-cards.png')
    );

    await gotoDocs(page, 'beta-appendix.html');
    await waitForPageReady(page, {
      selectors: ['.article-header'],
      timeoutMs: 30_000,
    });
    recordShot(
      'beta-appendix/changing-areas-warning.png',
      await writeElementShot(page, '.article-header', 'beta-appendix/changing-areas-warning.png')
    );
    recordShot(
      'beta-appendix/deferred-area-grid.png',
      await writeElementShot(page, '.deferred-grid', 'beta-appendix/deferred-area-grid.png')
    );

    await page.route('**/api/**/analytics/summary**', async (route) => {
      const request = route.request();
      if (request.resourceType() === 'document') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Unable to load analytics summary right now.',
          },
        }),
      });
    });
    await gotoApp(page, '/analytics');
    await waitForPageReady(page, {
      selectors: ['h1:has-text("Analytics & Reports")', 'button:has-text("Retry analytics")'],
      timeoutMs: 30_000,
    });
    recordShot('faq/retry-state.png', await writeShot(page, 'faq/retry-state.png'));
    await page.unroute('**/api/**/analytics/summary**');

    const moduleUnavailableSettings = buildWorkspaceModuleSettings({ analytics: false });
    await page.route('**/auth/bootstrap**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'help-center-admin',
              email: 'admin@example.org',
              firstName: 'Admin',
              lastName: 'User',
              role: 'admin',
              profilePicture: null,
              organizationId: null,
            },
            organizationId: null,
            workspaceModules: moduleUnavailableSettings,
          },
        }),
      });
    });
    await gotoApp(page, '/analytics');
    await waitForPageReady(page, {
      selectors: ['text=Module unavailable'],
      timeoutMs: 30_000,
    });
    recordShot('faq/module-unavailable.png', await writeShot(page, 'faq/module-unavailable.png'));
    await page.unroute('**/auth/bootstrap**');

    expect(screenshotManifest.length).toBe(24);
  });
});
