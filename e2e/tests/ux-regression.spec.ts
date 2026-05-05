import { test, expect } from "../fixtures/auth.fixture";
import {
  loginPortalUserUI,
  provisionApprovedPortalUser,
} from "../helpers/portal";
import { ensureEffectiveAdminLoginViaAPI } from "../helpers/auth";
import {
  createTestAccount,
  createTestContact,
  createTestDonation,
  createTestEvent,
  getAuthHeaders,
  resolveAuthenticatedFixtureScope,
} from "../helpers/database";
import { unwrapSuccess } from "../helpers/apiEnvelope";
import {
  collectRouteRenderBlockers,
  isOpaqueReactBoundaryCompanionConsoleBurst,
  isRecoverableModuleImportConsoleBurst,
} from "../helpers/moduleImportRecovery";
import type { ConsoleMessage, Locator, Page } from "@playwright/test";

const apiURL = process.env.API_URL || "http://localhost:3001";

const uniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

async function getFirstCaseTypeId(page: Page, token: string): Promise<string> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.get(`${apiURL}/api/v2/cases/types`, {
    headers,
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to fetch case types (${response.status()}): ${await response.text()}`,
    );
  }

  const payload = unwrapSuccess<{
    types?: Array<{ id?: string; case_type_id?: string }>;
    data?: Array<{ id?: string; case_type_id?: string }>;
    items?: Array<{ id?: string; case_type_id?: string }>;
  }>(await response.json());

  const typeEntries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.types)
      ? payload.types
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : [];
  const firstType = typeEntries.find((entry) => Boolean(entry?.id || entry?.case_type_id));
  const firstTypeId = firstType?.id || firstType?.case_type_id;

  if (!firstTypeId) {
    throw new Error(`No case types available. Payload: ${JSON.stringify(payload)}`);
  }

  return firstTypeId;
}

async function createTaskRecord(
  page: Page,
  token: string,
  subject: string,
): Promise<void> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${apiURL}/api/v2/tasks`, {
    headers,
    data: {
      subject,
      status: "not_started",
      priority: "normal",
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create mobile task fixture (${response.status()}): ${await response.text()}`,
    );
  }
}

async function createCaseRecord(
  page: Page,
  token: string,
  title: string,
  contactId: string,
): Promise<void> {
  const fixtureScope = await resolveAuthenticatedFixtureScope(page, token);
  const caseAccountId = fixtureScope.accountId || fixtureScope.organizationId;
  if (!caseAccountId) {
    throw new Error("Unable to resolve organization context for mobile case fixture");
  }

  const caseTypeId = await getFirstCaseTypeId(page, token);
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${apiURL}/api/v2/cases`, {
    headers,
    data: {
      contact_id: contactId,
      account_id: caseAccountId,
      case_type_id: caseTypeId,
      title,
      description: "Mobile UX regression fixture",
      priority: "medium",
      is_urgent: false,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create mobile case fixture (${response.status()}): ${await response.text()}`,
    );
  }

  await expect
    .poll(
      async () => {
        const readHeaders = await getAuthHeaders(page, token);
        const listResponse = await page.request.get(
          `${apiURL}/api/v2/cases?limit=25&search=${encodeURIComponent(title)}`,
          { headers: readHeaders },
        );
        if (!listResponse.ok()) {
          return false;
        }

        const payload = unwrapSuccess<{
          cases?: Array<{ title?: string }>;
          data?: { cases?: Array<{ title?: string }> };
        }>(await listResponse.json());
        const cases = Array.isArray(payload?.cases)
          ? payload.cases
          : Array.isArray(payload?.data?.cases)
            ? payload.data.cases
            : [];
        return cases.some((entry) => entry?.title === title);
      },
      { timeout: 15000, intervals: [500, 1000, 1500] },
    )
    .toBe(true);
}

async function seedMobileCardFixtures(page: Page, token: string): Promise<void> {
  const suffix = uniqueSuffix();
  const fixtureScope = await resolveAuthenticatedFixtureScope(page, token);
  const account = await createTestAccount(page, token, {
    name: `Mobile Account ${suffix}`,
    accountType: "organization",
    category: "other",
  });
  const contact = await createTestContact(page, token, {
    firstName: "Mobile",
    lastName: `Contact ${suffix}`,
    email: `mobile.contact.${suffix}@example.com`,
    accountId: fixtureScope.accountId || account.id,
  });

  await Promise.all([
    createTaskRecord(page, token, `Mobile Task ${suffix}`),
    createCaseRecord(page, token, `Mobile Case ${suffix}`, contact.id),
    createTestEvent(page, token, {
      name: `Mobile Event ${suffix}`,
    }),
    createTestDonation(page, token, {
      accountId: account.id,
      amount: 25,
    }),
  ]);
}

const benignConsolePatterns = [
  /favicon\.ico/i,
  /ResizeObserver loop limit exceeded/i,
  /downloadable font: download failed/i,
  /Failed to load resource: the server responded with a status of 404/i,
  /Failed to load resource: the server responded with a status of (401|403|404|410|500)/i,
  /Failed to fetch CSRF token:/i,
  /Firefox can’t establish a connection to the server at .*\/api\/v2\/team-chat\/messenger\/stream/i,
  /The connection to .*\/api\/v2\/team-chat\/messenger\/stream.*was interrupted while the page was loading/i,
];

const benignPageErrorPatterns = [
  /api\/v2\/auth\/registration-status.*access control checks/i,
  /api\/v2\/auth\/preferences.*access control checks/i,
  /api\/v2\/auth\/bootstrap.*access control checks/i,
  /api\/v2\/admin\/branding.*access control checks/i,
  /api\/v2\/admin\/roles.*access control checks/i,
  /api\/v2\/team-chat\/.*access control checks/i,
  /error loading dynamically imported module: .*\/src\/components\/dashboard\/useQuickLookup\.tsx/i,
  /error loading dynamically imported module: .*\/src\/features\/contacts\/pages\/ContactListPage\.tsx/i,
  /error loading dynamically imported module: .*@heroicons_react_24_outline\.js/i,
  /Importing a module script failed/i,
  /access control checks/i,
];

const recoverableConsolePatterns = [
  /Importing a module script failed/i,
  /Error boundary caught: TypeError: Importing a module script failed/i,
];

const trackRuntimeIssues = (page: Page) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  const onPageError = (error: Error) => {
    const text = error.message;
    if (benignPageErrorPatterns.some((pattern) => pattern.test(text))) {
      return;
    }
    pageErrors.push(text);
  };

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() !== "error") {
      return;
    }
    const text = message.text();
    if (benignConsolePatterns.some((pattern) => pattern.test(text))) {
      return;
    }
    consoleErrors.push(text);
  };

  page.on("pageerror", onPageError);
  page.on("console", onConsole);

  return {
    pageErrors,
    consoleErrors,
    clear: () => {
      pageErrors.length = 0;
      consoleErrors.length = 0;
    },
    detach: () => {
      page.off("pageerror", onPageError);
      page.off("console", onConsole);
    },
  };
};

const expectNoRuntimeIssues = (
  routeLabel: string,
  issues: { pageErrors: string[]; consoleErrors: string[] },
): void => {
  expect(
    issues.pageErrors,
    `${routeLabel} threw page errors:\\n${issues.pageErrors.join("\\n")}`,
  ).toEqual([]);
  expect(
    issues.consoleErrors,
    `${routeLabel} emitted console errors:\\n${issues.consoleErrors.join("\\n")}`,
  ).toEqual([]);
};

const expectNoRuntimeIssuesAfterRouteRecovery = async (
  page: Page,
  routeLabel: string,
  issues: { pageErrors: string[]; consoleErrors: string[] },
  expectedPath: string,
  heading: RegExp,
  expectedVisibleLocators: Locator[] = [],
): Promise<void> => {
  if (
    issues.pageErrors.length === 0 &&
    isRecoverableModuleImportConsoleBurst(issues.consoleErrors)
  ) {
    await expect(
      page.getByRole("heading", { name: heading }).first(),
    ).toBeVisible();
    for (const locator of expectedVisibleLocators) {
      await expect(locator).toBeVisible();
    }

    const currentPathname = normalizePathname(page.url());
    const expectedPathnames = resolveExpectedAdminPathnames(expectedPath);
    expect(
      expectedPathnames.has(currentPathname),
      `${routeLabel} recovered from a module import burst on ${currentPathname}, expected one of ${[
        ...expectedPathnames,
      ].join(", ")}`,
    ).toBe(true);

    const routeBlockers = await collectRouteRenderBlockers(page);
    expect(
      routeBlockers,
      `${routeLabel} had recoverable module import console errors, but route render checks failed`,
    ).toEqual([]);
    return;
  }

  expectNoRuntimeIssues(routeLabel, issues);
};

const expectNoRuntimeIssuesAfterOpaqueFirefoxBoundaryRecovery = async (
  page: Page,
  browserName: string,
  routeLabel: string,
  issues: { pageErrors: string[]; consoleErrors: string[] },
  expectedPath: string,
  heading: RegExp,
  expectedVisibleLocators: Locator[] = [],
): Promise<void> => {
  if (
    browserName === "firefox" &&
    issues.pageErrors.length === 0 &&
    isOpaqueReactBoundaryCompanionConsoleBurst(issues.consoleErrors)
  ) {
    const currentPathname = normalizePathname(page.url());
    const expectedPathname = normalizePathname(expectedPath);
    expect(
      currentPathname,
      `${routeLabel} recovered from Firefox opaque React boundary console text on ${currentPathname}`,
    ).toBe(expectedPathname);

    await expect(
      page.getByRole("heading", { name: heading }).first(),
    ).toBeVisible();
    for (const locator of expectedVisibleLocators) {
      await expect(locator).toBeVisible();
    }

    const routeBlockers = await collectRouteRenderBlockers(page);
    expect(
      routeBlockers,
      `${routeLabel} had Firefox opaque React boundary console text, but route render checks failed`,
    ).toEqual([]);
    return;
  }

  expectNoRuntimeIssues(routeLabel, issues);
};

const hasOnlyRecoverableConsoleErrors = (issues: {
  pageErrors: string[];
  consoleErrors: string[];
}): boolean =>
  issues.pageErrors.length === 0 &&
  issues.consoleErrors.length > 0 &&
  issues.consoleErrors.every((entry) =>
    recoverableConsolePatterns.some((pattern) => pattern.test(entry)),
  );

const navigateWithRuntimeRecovery = async (
  page: Page,
  issues: { pageErrors: string[]; consoleErrors: string[]; clear: () => void },
  path: string,
  heading: RegExp,
): Promise<void> => {
  const headingLocator = page.getByRole("heading", { name: heading }).first();
  await page.goto(path, { waitUntil: "domcontentloaded" });

  const recover = async (): Promise<void> => {
    issues.clear();
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(headingLocator).toBeVisible();
  };

  try {
    await expect(headingLocator).toBeVisible();
  } catch (error) {
    if (!hasOnlyRecoverableConsoleErrors(issues)) {
      throw error;
    }
    await recover();
    return;
  }

  if (hasOnlyRecoverableConsoleErrors(issues)) {
    await recover();
  }
};

const normalizePathname = (value: string): string => {
  try {
    return new URL(value, "http://localhost").pathname;
  } catch {
    return value.split("?")[0] || value;
  }
};

const normalizePathWithQuery = (value: string): string => {
  try {
    const url = new URL(value, "http://localhost");
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
};

const expectNoHorizontalOverflow = async (
  page: Page,
  routeLabel: string,
): Promise<void> => {
  const overflowDelta = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(
    overflowDelta,
    `${routeLabel} overflowed horizontally by ${overflowDelta}px`,
  ).toBeLessThanOrEqual(1);
};

const waitForAnyVisibleLocator = async (
  page: Page,
  locators: Locator[],
  timeoutMs = 5000,
) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const locator of locators) {
      if (await locator.isVisible().catch(() => false)) {
        return locator;
      }
    }
    await page.waitForTimeout(100);
  }

  return locators[0];
};

const ADMIN_ROUTE_REDIRECT_PATHS = new Set([
  "/dashboard",
  "/login",
  "/settings/user",
  "/settings/admin",
]);

const resolveExpectedAdminPathnames = (expectedPath: string): Set<string> => {
  const expectedPathname = normalizePathname(expectedPath);

  if (expectedPathname === "/settings/admin") {
    return new Set(["/settings/admin", "/settings/admin/dashboard"]);
  }

  return new Set([expectedPathname]);
};

const resolveAdminRouteState = async (
  page: Page,
  expectedPath: string,
  heading: RegExp,
): Promise<"accessible" | "redirected"> => {
  const expectedPathnames = resolveExpectedAdminPathnames(expectedPath);
  const headingLocator = page.getByRole("heading", { name: heading }).first();

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const currentPathname = normalizePathname(page.url());
    const headingVisible = await headingLocator.isVisible().catch(() => false);

    if (expectedPathnames.has(currentPathname) && headingVisible) {
      return "accessible";
    }

    if (
      !expectedPathnames.has(currentPathname) &&
      ADMIN_ROUTE_REDIRECT_PATHS.has(currentPathname)
    ) {
      return "redirected";
    }

    await page.waitForTimeout(250);
  }

  return expectedPathnames.has(normalizePathname(page.url()))
    ? "accessible"
    : "redirected";
};

const gotoAdminRouteWithFallback = async (
  page: Page,
  expectedPath: string,
  heading: RegExp,
): Promise<"accessible" | "redirected"> => {
  await page.goto(expectedPath);
  await page.waitForLoadState("domcontentloaded");

  const expectedPathnames = resolveExpectedAdminPathnames(expectedPath);
  const routeState = await resolveAdminRouteState(page, expectedPath, heading);
  if (routeState === "redirected") {
    const currentPathname = normalizePathname(page.url());
    expect(
      ADMIN_ROUTE_REDIRECT_PATHS.has(currentPathname),
      `Expected admin route ${expectedPath} to stay on route or redirect to one of ${[
        ...expectedPathnames,
        ...ADMIN_ROUTE_REDIRECT_PATHS,
      ].join(", ")}, got ${currentPathname}`,
    ).toBe(true);
  }

  return routeState;
};

test.describe("UI/UX regression flows", () => {
  test("global navigation stays compact below lg and expands at lg", async ({
    authenticatedPage,
  }) => {
    const runtimeIssues = trackRuntimeIssues(authenticatedPage);
    const globalNav = authenticatedPage
      .getByRole("navigation", { name: /global navigation/i })
      .first();
    const primaryNav = authenticatedPage
      .locator('[aria-label="Primary navigation"]')
      .first();
    const moreButton = authenticatedPage.locator(
      'button[aria-label="More navigation"]',
    );
    const userMenuButton = authenticatedPage.locator(
      'button[aria-label="User menu"]',
    );
    const mainMenuButton = authenticatedPage.locator(
      'button[aria-label="Main menu"]',
    );
    const searchButton = authenticatedPage.locator(
      'button[aria-label="Search"]',
    );
    const alertsLink = authenticatedPage.getByRole("link", { name: /alert rules/i }).first();

    await authenticatedPage.setViewportSize({ width: 900, height: 900 });
    await authenticatedPage.goto("/dashboard");
    await expect(globalNav).toBeVisible({ timeout: 10000 });
    await expect(primaryNav).toBeHidden();
    await expect(moreButton).toBeHidden();
    await expect(userMenuButton).toBeHidden();
    await expect(mainMenuButton).toBeVisible();
    await expect(searchButton).toBeVisible();
    await expect(alertsLink).toBeVisible();

    await mainMenuButton.click();
    await expect(
      authenticatedPage.getByText(/^primary$/i).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(/^more modules$/i).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(/^utilities$/i).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(/^account$/i).first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(
      authenticatedPage,
      "dashboard shell at 1024px",
    );
    const compactNavHeight = await globalNav.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    );
    expect(compactNavHeight).toBeLessThanOrEqual(72);
    await expectNoRuntimeIssuesAfterRouteRecovery(
      authenticatedPage,
      "dashboard compact navigation",
      runtimeIssues,
      "/dashboard",
      /^workbench$/i,
      [globalNav, mainMenuButton, searchButton, alertsLink],
    );
    runtimeIssues.clear();

    await authenticatedPage.setViewportSize({ width: 1280, height: 900 });
    await authenticatedPage.goto("/dashboard");
    await expect(globalNav).toBeVisible({ timeout: 10000 });
    await expect(primaryNav).toBeVisible();
    await expect(
      primaryNav.getByRole("link", { name: /^workbench$/i }).first(),
    ).toBeVisible();
    await expect(
      primaryNav.getByRole("link", { name: /^people$/i }).first(),
    ).toBeVisible();
    await expect(
      primaryNav.getByRole("link", { name: /^cases$/i }).first(),
    ).toBeVisible();
    await expect(moreButton).toBeVisible();
    await expect(userMenuButton).toBeVisible({ timeout: 10000 });
    await expect(mainMenuButton).toBeHidden();
    await expect(
      authenticatedPage.getByRole("heading", { name: /^workbench$/i }).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: /create intake/i }).first(),
    ).toBeVisible();

    await moreButton.click();
    await expect(
      authenticatedPage.getByRole("link", { name: /^tasks$/i }).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: /^analytics$/i }).first(),
    ).toBeVisible();

    await userMenuButton.click();
    await expect(
      authenticatedPage.getByRole("link", { name: /admin settings/i }).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage
        .getByRole("button", { name: /switch to (light|dark)/i })
        .first(),
    ).toBeVisible();

    await searchButton.click();
    await expect(
      authenticatedPage.getByRole("dialog", { name: /search people/i }),
    ).toBeVisible();
    await authenticatedPage
      .getByRole("button", { name: /close search dialog/i })
      .click();
    await expect(searchButton).toBeFocused();
    await expectNoHorizontalOverflow(
      authenticatedPage,
      "dashboard shell at 1280px",
    );

    const fullNavHeight = await globalNav.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    );
    expect(fullNavHeight).toBeLessThanOrEqual(72);

    await expectNoRuntimeIssuesAfterRouteRecovery(
      authenticatedPage,
      "dashboard expanded navigation",
      runtimeIssues,
      "/dashboard",
      /^workbench$/i,
      [
        globalNav,
        primaryNav,
        userMenuButton,
        searchButton,
        authenticatedPage.getByRole("link", { name: /create intake/i }).first(),
      ],
    );
    runtimeIssues.detach();
  });

  test("short desktop viewport keeps admin settings reachable from the user menu", async ({
    authenticatedPage,
  }, testInfo) => {
    test.skip(
      /^Mobile /.test(testInfo.project.name) || testInfo.project.name === "Tablet",
      "Desktop-only coverage",
    );

    const runtimeIssues = trackRuntimeIssues(authenticatedPage);
    const viewportHeight = 640;

    await authenticatedPage.setViewportSize({ width: 1280, height: viewportHeight });
    await authenticatedPage.goto("/dashboard");

    const userMenuButton = authenticatedPage
      .getByRole("button", { name: /user menu/i })
      .first();
    await expect(userMenuButton).toBeVisible({ timeout: 10000 });
    await userMenuButton.click();

    const adminSettingsLink = authenticatedPage
      .getByRole("link", { name: /admin settings/i })
      .first();
    await expect(adminSettingsLink).toBeVisible({ timeout: 10000 });

    const linkBounds = await adminSettingsLink.boundingBox();
    expect(
      (linkBounds?.y ?? Number.POSITIVE_INFINITY) +
        (linkBounds?.height ?? Number.POSITIVE_INFINITY),
    ).toBeLessThanOrEqual(viewportHeight);

    await adminSettingsLink.click();

    const routeState = await resolveAdminRouteState(
      authenticatedPage,
      "/settings/admin",
      /admin hub|admin settings/i,
    );
    expect(routeState).toBe("accessible");
    await expect(
      authenticatedPage
        .getByRole("heading", { name: /admin hub|admin settings/i })
        .first(),
    ).toBeVisible();

    await expectNoRuntimeIssuesAfterRouteRecovery(
      authenticatedPage,
      "short desktop user menu",
      runtimeIssues,
      "/settings/admin",
      /admin hub|admin settings/i,
    );
    runtimeIssues.detach();
  });

  test("mobile navigation drawer keeps the compact section layout", async ({
    authenticatedPage,
  }, testInfo) => {
    test.skip(
      !(/^Mobile /.test(testInfo.project.name) || testInfo.project.name === "Tablet"),
      "Mobile and tablet coverage",
    );

    const runtimeIssues = trackRuntimeIssues(authenticatedPage);

    await authenticatedPage.setViewportSize({ width: 390, height: 844 });
    await authenticatedPage.goto("/dashboard");

    await expect(
      authenticatedPage.getByRole("button", { name: /^search$/i }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: /alert rules/i }).first(),
    ).toBeVisible();

    await authenticatedPage.getByRole("button", { name: /main menu/i }).click();

    await expect(
      authenticatedPage
        .locator("p")
        .filter({ hasText: /^primary$/i })
        .first(),
    ).toBeVisible();
    await expect(
      authenticatedPage
        .locator("p")
        .filter({ hasText: /^more modules$/i })
        .first(),
    ).toBeVisible();
    await expect(
      authenticatedPage
        .locator("p")
        .filter({ hasText: /^utilities$/i })
        .first(),
    ).toBeVisible();
    await expect(
      authenticatedPage
        .locator("p")
        .filter({ hasText: /^account$/i })
        .first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: /people/i }).first(),
    ).toBeVisible();
    await expect(authenticatedPage.getByText(/search workspace/i)).toHaveCount(
      0,
    );
    await expectNoHorizontalOverflow(
      authenticatedPage,
      "mobile dashboard navigation drawer",
    );

    expectNoRuntimeIssues("mobile dashboard navigation drawer", runtimeIssues);
    runtimeIssues.detach();
  });

  test("mobile auth entry routes keep forms above the fold", async ({
    page,
  }, testInfo) => {
    test.skip(
      !(/^Mobile /.test(testInfo.project.name) || testInfo.project.name === "Tablet"),
      "Mobile and tablet coverage",
    );

    const runtimeIssues = trackRuntimeIssues(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const checks: Array<{
      path: string;
      inputName: RegExp;
      submitNames: RegExp[];
    }> = [
      {
        path: "/login",
        inputName: /email address/i,
        submitNames: [/^sign in$/i],
      },
      {
        path: "/setup",
        inputName: /email/i,
        submitNames: [/create admin account/i, /^sign in$/i],
      },
      {
        path: "/portal/login",
        inputName: /email/i,
        submitNames: [/^sign in$/i],
      },
    ];

    for (const check of checks) {
      await page.goto(check.path, { waitUntil: "domcontentloaded" });

      const input = page.getByLabel(check.inputName).first();
      const submitCandidates = check.submitNames.map((name) =>
        page.getByRole("button", { name }).first(),
      );
      const submit =
        (await waitForAnyVisibleLocator(page, submitCandidates)) ??
        submitCandidates[0];

      await expect(input).toBeVisible();
      await expect(submit).toBeVisible();

      const inputBox = await input.boundingBox();
      const submitBox = await submit.boundingBox();

      expect(inputBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(540);
      expect(
        (submitBox?.y ?? Number.POSITIVE_INFINITY) +
          (submitBox?.height ?? Number.POSITIVE_INFINITY),
      ).toBeLessThanOrEqual(844);
      await expectNoHorizontalOverflow(page, check.path);
    }

    expectNoRuntimeIssues("mobile auth entry routes", runtimeIssues);
    runtimeIssues.detach();
  });

  test("mobile staff routes use compact cards and avoid horizontal overflow", async ({
    authenticatedPage,
    authToken,
  }, testInfo) => {
    test.skip(
      !(/^Mobile /.test(testInfo.project.name) || testInfo.project.name === "Tablet"),
      "Mobile and tablet coverage",
    );

    const runtimeIssues = trackRuntimeIssues(authenticatedPage);
    await authenticatedPage.setViewportSize({ width: 390, height: 844 });
    await seedMobileCardFixtures(authenticatedPage, authToken);

    await authenticatedPage.goto("/dashboard");

    const mainContentBox = await authenticatedPage
      .locator("#main-content")
      .boundingBox();
    const headingBox = await authenticatedPage
      .locator("main h1")
      .first()
      .boundingBox();
    expect(mainContentBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      200,
    );
    expect(headingBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(260);
    await expectNoHorizontalOverflow(authenticatedPage, "/dashboard");

    const cardChecks: Array<{
      path: string;
      heading: RegExp;
      cardTestId: string;
    }> = [
      {
        path: "/contacts",
        heading: /people/i,
        cardTestId: "mobile-contact-card",
      },
      { path: "/tasks", heading: /tasks/i, cardTestId: "mobile-task-card" },
      { path: "/cases", heading: /cases/i, cardTestId: "mobile-case-card" },
      { path: "/events", heading: /events/i, cardTestId: "mobile-event-card" },
      {
        path: "/donations",
        heading: /donations/i,
        cardTestId: "mobile-donation-card",
      },
    ];

    for (const check of cardChecks) {
      await authenticatedPage.goto(check.path);
      await expect(
        authenticatedPage.getByRole("heading", { name: check.heading }).first(),
      ).toBeVisible();
      await expect(
        authenticatedPage.getByTestId(check.cardTestId).first(),
      ).toBeVisible({ timeout: 15000 });
      await expectNoHorizontalOverflow(authenticatedPage, check.path);
    }

    await authenticatedPage.goto("/settings/navigation");
    await expect(
      authenticatedPage
        .getByRole("heading", { name: /navigation settings|navigation/i })
        .first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(authenticatedPage, "/settings/navigation");

    await ensureEffectiveAdminLoginViaAPI(authenticatedPage);
    const adminResponsiveChecks: Array<{
      path: string;
      heading: RegExp;
      action: RegExp;
      expectPortalTriage?: boolean;
    }> = [
      {
        path: "/settings/admin/dashboard",
        heading: /admin hub|admin settings/i,
        action: /invite user|refresh status/i,
      },
      {
        path: "/settings/admin/portal/access",
        heading: /portal ops|client portal access/i,
        action: /refresh/i,
        expectPortalTriage: true,
      },
      {
        path: "/settings/admin/portal/users",
        heading: /portal ops|portal users/i,
        action: /refresh/i,
        expectPortalTriage: true,
      },
      {
        path: "/settings/admin/portal/conversations",
        heading: /portal ops|portal conversations/i,
        action: /refresh conversations/i,
        expectPortalTriage: true,
      },
      {
        path: "/settings/admin/portal/appointments",
        heading: /portal ops|appointment inbox/i,
        action: /refresh inbox/i,
        expectPortalTriage: true,
      },
      {
        path: "/settings/admin/portal/slots",
        heading: /portal ops|appointment slots/i,
        action: /refresh slots/i,
        expectPortalTriage: true,
      },
      {
        path: "/settings/api",
        heading: /api settings|api & webhooks/i,
        action: /add webhook/i,
      },
      {
        path: "/settings/backup",
        heading: /data backup/i,
        action: /download backup/i,
      },
    ];

    for (const check of adminResponsiveChecks) {
      const routeState = await gotoAdminRouteWithFallback(
        authenticatedPage,
        check.path,
        check.heading,
      );
      if (routeState === "redirected") {
        continue;
      }

      await expect(
        authenticatedPage.getByRole("heading", { name: check.heading }).first(),
      ).toBeVisible();
      await expect(
        authenticatedPage
          .getByRole("combobox", { name: /admin workspaces|portal ops/i })
          .first(),
      ).toBeVisible();
      if (check.expectPortalTriage) {
        await expect(
          authenticatedPage.getByRole("heading", { name: /portal triage/i }),
        ).toBeVisible();
      }
      const actionButtons = authenticatedPage.getByRole("button", {
        name: check.action,
      });
      const actionLinks = authenticatedPage.getByRole("link", {
        name: check.action,
      });
      expect(
        (await actionButtons.count()) + (await actionLinks.count()),
        `Expected ${check.action.toString()} on ${check.path}`,
      ).toBeGreaterThan(0);
      await expectNoHorizontalOverflow(authenticatedPage, check.path);
    }

    expectNoRuntimeIssues("mobile staff route coverage", runtimeIssues);
    runtimeIssues.detach();
  });

  test("core app route headings and primary actions remain available", async ({
    authenticatedPage,
  }) => {
    const runtimeIssues = trackRuntimeIssues(authenticatedPage);

    const checks: Array<{
      path: string;
      heading: RegExp;
      action: RegExp;
      actionRole: "button" | "link";
    }> = [
      { path: "/contacts", heading: /people/i, action: /new person/i, actionRole: "button" },
      { path: "/cases", heading: /cases/i, action: /new case/i, actionRole: "button" },
      { path: "/donations", heading: /donations/i, action: /record donation/i, actionRole: "link" },
      {
        path: "/reports/templates",
        heading: /report templates/i,
        action: /create custom report/i,
        actionRole: "button",
      },
      {
        path: "/settings/navigation",
        heading: /navigation settings|navigation/i,
        action: /reset to defaults/i,
        actionRole: "button",
      },
    ];

    for (const check of checks) {
      runtimeIssues.clear();
      await authenticatedPage.goto(check.path);
      const headingLocator = authenticatedPage
        .getByRole("heading", { name: check.heading })
        .first();
      const actionLocator = authenticatedPage
        .getByRole(check.actionRole, { name: check.action })
        .first();
      await expect(headingLocator).toBeVisible();
      await expect(actionLocator).toBeVisible();
      await expectNoRuntimeIssuesAfterRouteRecovery(
        authenticatedPage,
        `core app headings/actions on ${check.path}`,
        runtimeIssues,
        check.path,
        check.heading,
        [headingLocator, actionLocator],
      );
    }

    runtimeIssues.detach();
  });

  test("portal high-traffic routes remain navigable with headings", async ({
    page,
  }, testInfo) => {
    test.skip(
      /^Mobile /.test(testInfo.project.name),
      "Dedicated mobile UX coverage handles phone-specific assertions separately.",
    );
    const runtimeIssues = trackRuntimeIssues(page);

    const portalUser = await provisionApprovedPortalUser(page);
    await loginPortalUserUI(page, portalUser);

    await navigateWithRuntimeRecovery(
      page,
      runtimeIssues,
      "/portal",
      /your portal home/i,
    );

    await navigateWithRuntimeRecovery(
      page,
      runtimeIssues,
      "/portal/events",
      /events/i,
    );

    await navigateWithRuntimeRecovery(
      page,
      runtimeIssues,
      "/portal/profile",
      /your profile/i,
    );

    expectNoRuntimeIssues("portal high-traffic routes", runtimeIssues);
    runtimeIssues.detach();
  });

  test("admin settings and portal routes keep headings/actions and redirect contracts", async ({
    browserName,
    page,
  }, testInfo) => {
    test.skip(
      /^Mobile /.test(testInfo.project.name),
      "Dedicated mobile UX coverage handles phone-specific assertions separately.",
    );
    const runtimeIssues = trackRuntimeIssues(page);
    await ensureEffectiveAdminLoginViaAPI(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    const adminHubState = await gotoAdminRouteWithFallback(
      page,
      "/settings/admin",
      /admin hub|admin settings/i,
    );
    if (adminHubState === "redirected") {
      test.skip(
        true,
        "Admin routes are not accessible with the current seeded account.",
      );
    }
    await expect(
      page.getByRole("heading", { name: /admin hub|admin settings/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /quick actions/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /invite users/i }).first(),
    ).toBeVisible();

    const topNavUserMenuButton = page
      .getByRole("button", { name: /user menu/i })
      .first();
    const topNavUserButtonVisible = await topNavUserMenuButton
      .isVisible()
      .catch(() => false);
    expect(topNavUserButtonVisible).toBe(true);
    await topNavUserMenuButton.click();
    await expect(
      page
        .locator("#topnav-user-menu")
        .getByRole("link", { name: /invite users/i })
        .first(),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(page.getByText(/all admin sections visible/i)).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /roles & permissions/i }),
    ).toBeVisible();

    const adminChecks: Array<{
      path: string;
      heading: RegExp;
      action: RegExp;
    }> = [
      {
        path: "/settings/admin/portal/access",
        heading: /portal ops|client portal access|portal admin - access/i,
        action: /refresh/i,
      },
      {
        path: "/settings/admin/portal/users",
        heading: /portal ops|users|portal admin - users/i,
        action: /refresh/i,
      },
      {
        path: "/settings/admin/portal/conversations",
        heading: /portal ops|conversations|portal admin - conversations/i,
        action: /refresh conversations/i,
      },
      {
        path: "/settings/admin/portal/appointments",
        heading: /portal ops|appointments|portal admin - appointments/i,
        action: /refresh inbox/i,
      },
      {
        path: "/settings/admin/portal/slots",
        heading: /portal ops|slots|portal admin - slots/i,
        action: /refresh slots/i,
      },
      {
        path: "/settings/email-marketing",
        heading: /communications|newsletter campaigns|email marketing/i,
        action: /new campaign|admin\.mailchimp\.com/i,
      },
      {
        path: "/settings/api",
        heading: /api settings|api & webhooks/i,
        action: /add webhook/i,
      },
      {
        path: "/settings/navigation",
        heading: /navigation settings|navigation/i,
        action: /reset to defaults/i,
      },
      {
        path: "/settings/backup",
        heading: /data backup/i,
        action: /download backup/i,
      },
    ];

    for (const check of adminChecks) {
      const routeState = await gotoAdminRouteWithFallback(
        page,
        check.path,
        check.heading,
      );
      if (routeState === "redirected") {
        continue;
      }

      await expect(
        page.getByRole("heading", { name: check.heading }).first(),
      ).toBeVisible();
      const buttonAction = page.getByRole("button", { name: check.action });
      const linkAction = page.getByRole("link", { name: check.action });
      const buttonCount = await buttonAction.count();
      const linkCount = await linkAction.count();
      expect(
        buttonCount + linkCount,
        `Expected an action matching ${check.action.toString()} on ${check.path}`,
      ).toBeGreaterThan(0);
    }

    const removedCompatibilityRoutes = [
      { legacy: "/email-marketing", canonical: "/settings/communications" },
      { legacy: "/admin/audit-logs", canonical: "/settings/admin/audit_logs" },
      {
        legacy: "/settings/organization",
        canonical: "/settings/admin/organization",
      },
    ];

    for (const { legacy, canonical } of removedCompatibilityRoutes) {
      await page.goto(legacy);
      await page.waitForLoadState("domcontentloaded");

      const currentPath = normalizePathname(page.url());
      expect(
        currentPath,
        `Legacy route ${legacy} should redirect to ${canonical}`,
      ).toBe(normalizePathname(canonical));
    }

    await expectNoRuntimeIssuesAfterOpaqueFirefoxBoundaryRecovery(
      page,
      browserName,
      "admin settings and portal routes",
      runtimeIssues,
      "/settings/admin/organization",
      /organization profile/i,
      [
        page
          .getByRole("button", { name: /save changes/i })
          .first(),
      ],
    );
    runtimeIssues.detach();
  });
});
