import { test, expect } from '../fixtures/auth.fixture';
import { expectCriticalSection, waitForPageReady } from '../helpers/routeHelpers';

const EXTERNAL_SERVICE_PROVIDERS_ROUTE = '/external-service-providers';

const buildUniqueName = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readResponsePayload = async (response: {
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}): Promise<Record<string, unknown> | null> => {
  try {
    const responseJson = await response.json();
    if (responseJson && typeof responseJson === 'object') {
      return responseJson as Record<string, unknown>;
    }
  } catch {
    // Some browser engines intermittently fail response.json() for Playwright network responses.
    // Fallback to text parsing to avoid flaky failures on valid JSON payloads.
  }

  try {
    const responseText = await response.text();
    if (!responseText) {
      return null;
    }
    const responseJson = JSON.parse(responseText);
    if (responseJson && typeof responseJson === 'object') {
      return responseJson as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
};

test('external service providers route requires authentication', async ({ page }) => {
  await page.goto(EXTERNAL_SERVICE_PROVIDERS_ROUTE, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test('allows creating and finding a provider record', async ({ authenticatedPage }) => {
  const providerName = buildUniqueName('E2E Provider');

  await authenticatedPage.goto(EXTERNAL_SERVICE_PROVIDERS_ROUTE, { waitUntil: 'domcontentloaded' });
  await waitForPageReady(authenticatedPage, {
    url: /\/external-service-providers(?:\?|$)/,
    selectors: [
      'h1:has-text("External Service Providers")',
      '#provider-name',
      '#provider-type',
      'button:has-text("Create Provider")',
    ],
    timeoutMs: 25000,
  });

  await expectCriticalSection(authenticatedPage, [
    'input#provider-name',
    'button:has-text("Create Provider")',
  ]);

  const providerNameInput = authenticatedPage.getByLabel('Provider Name *');
  const createProviderButton = authenticatedPage.getByRole('button', { name: 'Create Provider' });
  const providerResponsePromise = authenticatedPage.waitForResponse(
    (response) =>
      response.url().includes('/external-service-providers') &&
      response.request().method() === 'POST',
    { timeout: 15000 }
  );
  await expect(createProviderButton).toBeDisabled();
  await providerNameInput.fill(providerName);
  await expect(createProviderButton).toBeEnabled();
  await authenticatedPage.selectOption('#provider-type', 'social_worker');
  await authenticatedPage.fill('#provider-notes', 'E2E integration smoke check provider.');
  await createProviderButton.click();
  const providerResponse = await providerResponsePromise;
  expect(providerResponse.status()).toBeLessThan(300);
  await expect(providerResponse.ok()).toBeTruthy();
  const createPayload = await readResponsePayload(providerResponse);
  const createdProviderName =
    (createPayload as { provider_name?: string } | null)?.provider_name ??
    (createPayload as { data?: { provider_name?: string } } | null)?.data?.provider_name;
  expect(
    typeof createdProviderName === 'string' &&
      createdProviderName.toLowerCase().trim() === providerName.toLowerCase().trim()
  ).toBeTruthy();

  const searchProviderResponsePromise = authenticatedPage.waitForResponse(
    (response) =>
      response.url().includes('/external-service-providers') &&
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname.includes('/api/v2/external-service-providers'),
    { timeout: 15000 }
  );

  const providerSearchInput = authenticatedPage.locator('#provider-search');
  await providerSearchInput.fill(providerName);
  const providerSearchSection = providerSearchInput.locator('xpath=../..');
  const searchButton = providerSearchSection.getByRole('button', { name: /Search/i });
  if (await searchButton.first().isVisible()) {
    await searchButton.first().click();
  } else {
    await providerSearchInput.press('Enter');
  }

  const searchResponse = await searchProviderResponsePromise;
  expect(searchResponse.status()).toBeLessThan(300);
  const searchPayload = await readResponsePayload(searchResponse);
  const searchProviders =
    (searchPayload as { providers?: Array<{ provider_name?: string }> } | null)?.providers ??
    (searchPayload as { data?: { providers?: Array<{ provider_name?: string }> } | null })?.data
      ?.providers;

  if (Array.isArray(searchProviders)) {
    const matchingProvider = searchProviders?.some(
      (provider) =>
        typeof provider?.provider_name === 'string' &&
        provider.provider_name.toLowerCase().trim() === providerName.toLowerCase().trim()
    );
    expect(matchingProvider).toBeTruthy();
    return;
  }

  await expect(authenticatedPage.getByText(providerName)).toBeVisible();
});
