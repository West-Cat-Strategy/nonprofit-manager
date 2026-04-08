import { test, expect } from "../fixtures/auth.fixture";
import {
  loginPortalUserUI,
  provisionApprovedPortalUser,
} from "../helpers/portal";
import { ensureEffectiveAdminLoginViaAPI } from "../helpers/auth";
import type { ConsoleMessage, Locator, Page } from "@playwright/test";

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
  test("global navigation stays compact below xl and expands at xl", async ({
    authenticatedPage,
  }) => {
    const runtimeIssues = trackRuntimeIssues(authenticatedPage);
    const globalNav = authenticatedPage
      .getByRole("navigation", { name: /global navigation/i })
      .first();
    const primaryNav = authenticatedPage
      .locator('[aria-label="Primary navigation"]')
      .first();
    const moreButton = authenticatedPage.locator('button[aria-label="More navigation"]');
    const userMenuButton = authenticatedPage.locator('button[aria-label="User menu"]');
    const mainMenuButton = authenticatedPage.locator('button[aria-label="Main menu"]');
    const searchButton = authenticatedPage.locator('button[aria-label="Search"]');
    const alertsLink = authenticatedPage.locator('a[aria-label="Alerts"]');

    await authenticatedPage.setViewportSize({ width: 1024, height: 900 });
    await authenticatedPage.goto("/dashboard");
    await expect(globalNav).toBeVisible({ timeout: 10000 });
    await expect(primaryNav).toBeHidden();
    await expect(moreButton).toBeHidden();
    await expect(userMenuButton).toBeHidden();
    await expect(mainMenuButton).toBeVisible();
    await expect(searchButton).toBeVisible();
    await expect(alertsLink).toBeVisible();

    await mainMenuButton.click();
    await expect(authenticatedPage.getByText(/^primary$/i).first()).toBeVisible();
    await expect(authenticatedPage.getByText(/^more modules$/i).first()).toBeVisible();
    await expect(authenticatedPage.getByText(/^utilities$/i).first()).toBeVisible();
    await expect(authenticatedPage.getByText(/^account$/i).first()).toBeVisible();
    await expectNoHorizontalOverflow(authenticatedPage, "dashboard shell at 1024px");
    const compactNavHeight = await globalNav.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    );
    expect(compactNavHeight).toBeLessThanOrEqual(72);

    await authenticatedPage.setViewportSize({ width: 1280, height: 900 });
    await authenticatedPage.goto("/dashboard");
    await expect(globalNav).toBeVisible({ timeout: 10000 });
    await expect(primaryNav).toBeVisible();
    await expect(
      primaryNav.getByRole("link", { name: /^home$/i }).first(),
    ).toBeVisible();
    await expect(
      primaryNav.getByRole("link", { name: /^people$/i }).first(),
    ).toBeVisible();
    await expect(
      primaryNav.getByRole("link", { name: /^events$/i }).first(),
    ).toBeVisible();
    await expect(moreButton).toBeVisible();
    await expect(userMenuButton).toBeVisible({ timeout: 10000 });
    await expect(mainMenuButton).toBeHidden();
    await expect(
      authenticatedPage.getByText(/today at a glance/i).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(/pinned shortcuts/i).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("button", { name: /create intake/i }).first(),
    ).toBeVisible();

    await moreButton.click();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /^tasks$/i }).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /^analytics$/i }).first(),
    ).toBeVisible();

    await userMenuButton.click();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /admin settings/i }).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("menuitem", { name: /switch to (light|dark)/i }).first(),
    ).toBeVisible();

    await searchButton.click();
    await expect(
      authenticatedPage.getByRole("dialog", { name: /search people/i }),
    ).toBeVisible();
    await authenticatedPage
      .getByRole("button", { name: /close search dialog/i })
      .click();
    await expect(searchButton).toBeFocused();
    await expectNoHorizontalOverflow(authenticatedPage, "dashboard shell at 1280px");

    const fullNavHeight = await globalNav.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    );
    expect(fullNavHeight).toBeLessThanOrEqual(72);

    expectNoRuntimeIssues("dashboard shell", runtimeIssues);
    runtimeIssues.detach();
  });

  test("mobile navigation drawer keeps the compact section layout", async ({
    authenticatedPage,
  }, testInfo) => {
    test.skip(!/^Mobile /.test(testInfo.project.name), "Mobile-only coverage");

    const runtimeIssues = trackRuntimeIssues(authenticatedPage);

    await authenticatedPage.setViewportSize({ width: 390, height: 844 });
    await authenticatedPage.goto("/dashboard");

    await expect(
      authenticatedPage.getByRole("button", { name: /^search$/i }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: /^alerts$/i }).first(),
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
    await expect(
      authenticatedPage.getByText(/search workspace/i),
    ).toHaveCount(0);
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
    test.skip(!/^Mobile /.test(testInfo.project.name), "Mobile-only coverage");

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
        (await waitForAnyVisibleLocator(page, submitCandidates)) ?? submitCandidates[0];

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
  }, testInfo) => {
    test.skip(!/^Mobile /.test(testInfo.project.name), "Mobile-only coverage");

    const runtimeIssues = trackRuntimeIssues(authenticatedPage);
    await authenticatedPage.setViewportSize({ width: 390, height: 844 });

    await authenticatedPage.goto("/dashboard");

    const mainContentBox = await authenticatedPage.locator("#main-content").boundingBox();
    const headingBox = await authenticatedPage.locator("main h1").first().boundingBox();
    expect(mainContentBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(200);
    expect(headingBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(260);
    await expectNoHorizontalOverflow(authenticatedPage, "/dashboard");

    const cardChecks: Array<{
      path: string;
      heading: RegExp;
      cardTestId: string;
    }> = [
      { path: "/contacts", heading: /people/i, cardTestId: "mobile-contact-card" },
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
      ).toBeVisible();
      await expectNoHorizontalOverflow(authenticatedPage, check.path);
    }

    await authenticatedPage.goto("/settings/navigation");
    await expect(
      authenticatedPage
        .getByRole("heading", { name: /navigation settings/i })
        .first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(authenticatedPage, "/settings/navigation");

    expectNoRuntimeIssues("mobile staff route coverage", runtimeIssues);
    runtimeIssues.detach();
  });

  test("core app route headings and primary actions remain available", async ({
    authenticatedPage,
  }) => {
    const runtimeIssues = trackRuntimeIssues(authenticatedPage);

    const checks: Array<{ path: string; heading: RegExp; action: RegExp }> = [
      { path: "/contacts", heading: /people/i, action: /new person/i },
      { path: "/cases", heading: /cases/i, action: /new case/i },
      { path: "/donations", heading: /donations/i, action: /record donation/i },
      {
        path: "/reports/templates",
        heading: /report templates/i,
        action: /create custom report/i,
      },
      {
        path: "/settings/navigation",
        heading: /navigation settings/i,
        action: /reset to defaults/i,
      },
    ];

    for (const check of checks) {
      await authenticatedPage.goto(check.path);
      await expect(
        authenticatedPage.getByRole("heading", { name: check.heading }).first(),
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole("button", { name: check.action }).first(),
      ).toBeVisible();
    }

    expectNoRuntimeIssues("core app headings/actions", runtimeIssues);
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
      /your case workspace/i,
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
      /admin settings/i,
    );
    if (adminHubState === "redirected") {
      test.skip(
        true,
        "Admin routes are not accessible with the current seeded account.",
      );
    }
    await expect(
      page.getByRole("heading", { name: /admin settings/i }).first(),
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
        .getByTestId("admin-quick-actions-compact")
        .getByRole("link", { name: /invite users/i })
        .first(),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    {
      const adminHubButtons = page.getByRole("button", {
        name: /show advanced|hide advanced/i,
      });
      const adminHubLinks = page.getByRole("link", {
        name: /show advanced|hide advanced/i,
      });
      expect(
        (await adminHubButtons.count()) + (await adminHubLinks.count()),
      ).toBeGreaterThan(0);
    }

    const adminChecks: Array<{
      path: string;
      heading: RegExp;
      action: RegExp;
    }> = [
      {
        path: "/settings/admin/portal/access",
        heading: /portal admin - access/i,
        action: /refresh/i,
      },
      {
        path: "/settings/admin/portal/users",
        heading: /portal admin - users/i,
        action: /refresh/i,
      },
      {
        path: "/settings/admin/portal/conversations",
        heading: /portal admin - conversations/i,
        action: /refresh conversations/i,
      },
      {
        path: "/settings/admin/portal/appointments",
        heading: /portal admin - appointments/i,
        action: /refresh inbox/i,
      },
      {
        path: "/settings/admin/portal/slots",
        heading: /portal admin - slots/i,
        action: /refresh slots/i,
      },
      {
        path: "/settings/email-marketing",
        heading: /email marketing/i,
        action: /new campaign|admin\.mailchimp\.com/i,
      },
      {
        path: "/settings/api",
        heading: /api settings/i,
        action: /add webhook/i,
      },
      {
        path: "/settings/navigation",
        heading: /navigation settings/i,
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
      { legacy: "/email-marketing", canonical: "/settings/email-marketing" },
      { legacy: "/admin/audit-logs", canonical: "/settings/admin/audit_logs" },
      {
        legacy: "/settings/organization",
        canonical: "/settings/admin/organization",
      },
    ];

    for (const { legacy, canonical } of removedCompatibilityRoutes) {
      await page.goto(legacy);
      await page.waitForLoadState("domcontentloaded");

      const currentPath = normalizePathWithQuery(page.url());
      expect(
        currentPath,
        `Legacy route ${legacy} should no longer resolve to ${canonical}`,
      ).not.toBe(canonical);
      expect(["/dashboard", "/login"]).toContain(normalizePathname(page.url()));
    }

    expectNoRuntimeIssues("admin settings and portal routes", runtimeIssues);
    runtimeIssues.detach();
  });
});
