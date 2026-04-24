import type { ConsoleMessage, Page } from '@playwright/test';

const moduleImportSignalPatterns = [
  /^%o[\s\S]*Importing a module script failed/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
];

const moduleImportBoundaryCompanionPatterns = [
  /The above error occurred in one of your React components\./i,
  /React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundary\./i,
  /^Error boundary caught: Error JSHandle@object$/i,
  /Error boundary caught: TypeError: Importing a module script failed/i,
];

const opaqueReactBoundaryCompanionPattern =
  /^Error\s+The above error occurred in one of your React components\.\s+React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundary\.\s*$/i;

const opaqueReactBoundaryCaughtPattern = /^Error boundary caught: Error JSHandle@object$/i;

export const isRecoverableModuleImportConsoleMessage = (message: string): boolean =>
  moduleImportSignalPatterns.some((pattern) => pattern.test(message)) ||
  moduleImportBoundaryCompanionPatterns.some((pattern) => pattern.test(message));

export const isRecoverableModuleImportConsoleBurst = (messages: string[]): boolean =>
  messages.length > 0 &&
  messages.some((message) => moduleImportSignalPatterns.some((pattern) => pattern.test(message))) &&
  messages.every(isRecoverableModuleImportConsoleMessage);

export const isOpaqueReactBoundaryCompanionConsoleBurst = (messages: string[]): boolean =>
  messages.length === 2 &&
  opaqueReactBoundaryCompanionPattern.test(messages[0]) &&
  opaqueReactBoundaryCaughtPattern.test(messages[1]);

export const hasVisibleAppErrorBoundary = async (page: Page): Promise<boolean> =>
  page
    .getByRole('alert')
    .filter({ hasText: /something went wrong/i })
    .first()
    .isVisible()
    .catch(() => false);

export const hasVisibleRouteContent = async (page: Page): Promise<boolean> =>
  page
    .evaluate(() => {
      const root = document.querySelector('#root') ?? document.body;
      if (!root) {
        return false;
      }

      const visibleText = root.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      if (!visibleText) {
        return false;
      }

      const routeContentRoot = document.querySelector('main') ?? root;
      const visibleElements = Array.from(routeContentRoot.querySelectorAll<HTMLElement>('*')).filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0'
        );
      });

      return visibleElements.length > 0;
    })
    .catch(() => false);

const waitForRouteRenderSignal = async (
  page: Page,
  timeoutMs = 5_000
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const loadingIndicatorVisible = await page
      .locator('[aria-label="Loading application"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (!loadingIndicatorVisible) {
      if ((await hasVisibleAppErrorBoundary(page)) || (await hasVisibleRouteContent(page))) {
        return;
      }
    }

    await page.waitForTimeout(150);
  }
};

export const collectRouteRenderBlockers = async (page: Page): Promise<string[]> => {
  await waitForRouteRenderSignal(page);

  const blockers: string[] = [];
  const loadingIndicatorVisible = await page
    .locator('[aria-label="Loading application"]')
    .first()
    .isVisible()
    .catch(() => false);

  if (loadingIndicatorVisible) {
    blockers.push('The application loading shell remained visible after route settle.');
  }

  if (await hasVisibleAppErrorBoundary(page)) {
    blockers.push('The generic application error boundary remained visible after route settle.');
  }

  if (!(await hasVisibleRouteContent(page))) {
    blockers.push('No visible route content was rendered after route settle.');
  }

  return blockers;
};

export const trackModuleImportConsoleBurst = (page: Page) => {
  const consoleErrors: string[] = [];

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  };

  page.on('console', onConsole);

  return {
    consoleErrors,
    hasRecoverableBurst: () => isRecoverableModuleImportConsoleBurst(consoleErrors),
    detach: () => {
      page.off('console', onConsole);
    },
  };
};
