import { expect, type Locator, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from '../fixtures/auth.fixture';
import { createTestContact, getAuthHeaders } from '../helpers/database';
import {
  createTemplate,
  deleteTemplate,
  resolveTestDatabaseConfig,
} from '../helpers/domainFixtures';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const backendRequire = createRequire(path.resolve(__dirname, '..', '..', 'backend', 'package.json'));
const { Client: PgClient } = backendRequire('pg') as {
  Client: new (config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) => {
    connect(): Promise<void>;
    end(): Promise<void>;
    query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[]
    ): Promise<{ rows: T[] }>;
  };
};

const typeSequentiallyAndExpect = async (locator: Locator, value: string) => {
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 10 });
  await expect(locator).toHaveValue(value);
};

const unwrapBody = <T,>(body: unknown): T =>
  ((body as { data?: T } | undefined)?.data ?? body) as T;

async function waitForContactDetailReady(page: Page) {
  await expect(page.getByRole('tablist', { name: /contact sections/i })).toBeVisible({
    timeout: 30_000,
  });
}

async function getTemplateHomePageId(page: Page, authToken: string, templateId: string) {
  const headers = await getAuthHeaders(page, authToken);
  const response = await page.request.get(`${API_URL}/api/v2/templates/${templateId}`, {
    headers,
  });
  expect(response.ok()).toBeTruthy();

  const template = unwrapBody<{ pages?: Array<{ id?: string }> }>(await response.json());
  const pageId = template.pages?.[0]?.id;
  if (!pageId) {
    throw new Error(`Template ${templateId} did not include a page id`);
  }
  return pageId;
}

async function seedDonationPropertyComponent(input: {
  page: Page;
  authToken: string;
  templateId: string;
}) {
  const pageId = await getTemplateHomePageId(input.page, input.authToken, input.templateId);
  const sections = [
    {
      id: 'section-field-stability',
      name: 'Field Stability',
      components: [
        {
          id: 'donation-field-stability',
          type: 'donation-form',
          heading: 'Support this work',
          suggestedAmounts: [25, 50],
          allowCustomAmount: true,
        },
      ],
    },
  ];
  const client = new PgClient(resolveTestDatabaseConfig());

  try {
    await client.connect();
    await client.query(
      'UPDATE template_pages SET sections = $1 WHERE id = $2 AND template_id = $3',
      [JSON.stringify(sections), pageId, input.templateId]
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

test.describe('Firefox field typing stability', () => {
  test('keeps representative controlled fields from losing sequential keystrokes', async ({
    authenticatedPage,
    authToken,
    browserName,
  }) => {
    test.skip(browserName !== 'firefox', 'Focused regression for Firefox keystroke handling');

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Firefox${suffix}`,
      lastName: 'Stability',
      email: `firefox.stability.${suffix}@example.com`,
      phone: '5550204444',
    });

    await authenticatedPage.goto('/contacts');
    await typeSequentiallyAndExpect(
      authenticatedPage.getByLabel('Search contacts'),
      `Firefox Stability ${suffix}`
    );

    await authenticatedPage.goto('/contacts/new');
    await typeSequentiallyAndExpect(
      authenticatedPage.getByLabel(/first name \*/i),
      `Avery${suffix}`
    );
    await typeSequentiallyAndExpect(authenticatedPage.getByLabel(/last name \*/i), 'Keystroke');
    await typeSequentiallyAndExpect(
      authenticatedPage.getByLabel(/^email$/i),
      `avery.${suffix}@example.com`
    );

    await authenticatedPage.goto(`/contacts/${contactId}`);
    await waitForContactDetailReady(authenticatedPage);

    await typeSequentiallyAndExpect(
      authenticatedPage.getByLabel('Add tag'),
      `firefox-field-${suffix}`
    );

    await authenticatedPage.getByRole('button', { name: /edit contact/i }).click();
    await typeSequentiallyAndExpect(
      authenticatedPage.getByLabel(/preferred name/i),
      `Firefox Preferred ${suffix}`
    );
    await authenticatedPage.getByRole('button', { name: /^cancel$/i }).first().click();
    await waitForContactDetailReady(authenticatedPage);

    await authenticatedPage.getByRole('tab', { name: /notes/i }).click();
    const notesPanel = authenticatedPage.locator('#tabpanel-notes');
    await notesPanel.getByRole('button', { name: /\+ add note/i }).click();
    await typeSequentiallyAndExpect(
      notesPanel.getByLabel(/subject/i),
      `Firefox note ${suffix}`
    );
    await typeSequentiallyAndExpect(
      notesPanel.getByLabel(/content/i),
      'Sequential typing stays intact in the note body.'
    );

    await authenticatedPage.getByRole('tab', { name: /tasks/i }).click();
    const tasksPanel = authenticatedPage.locator('#tabpanel-tasks');
    await tasksPanel.getByRole('button', { name: /new task/i }).click();
    await typeSequentiallyAndExpect(
      tasksPanel.getByLabel(/subject/i),
      `Firefox task ${suffix}`
    );
    await typeSequentiallyAndExpect(
      tasksPanel.getByLabel(/details/i),
      'Sequential typing stays intact in the task details.'
    );

    await authenticatedPage.goto('/accounts');
    await typeSequentiallyAndExpect(
      authenticatedPage.getByLabel('Search accounts'),
      `Outside contacts ${suffix}`
    );
  });

  test('keeps website-builder draft property fields stable until blur', async ({
    authenticatedPage,
    authToken,
    browserName,
  }) => {
    test.skip(browserName !== 'firefox', 'Focused regression for Firefox keystroke handling');

    const templateId = await createTemplate(authenticatedPage, authToken);

    try {
      await seedDonationPropertyComponent({
        page: authenticatedPage,
        authToken,
        templateId,
      });

      await authenticatedPage.goto(`/website-builder/${templateId}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(authenticatedPage.getByText('Donation checkout')).toBeVisible({
        timeout: 30_000,
      });

      await authenticatedPage.getByText('Donation checkout').click();
      const suggestedAmounts = authenticatedPage.getByLabel('Suggested Amounts');
      await expect(suggestedAmounts).toBeVisible();

      await suggestedAmounts.fill('');
      await suggestedAmounts.pressSequentially('12,', { delay: 10 });
      await expect(suggestedAmounts).toHaveValue('12,');
    } finally {
      await deleteTemplate(authenticatedPage, authToken, templateId).catch(() => undefined);
    }
  });
});
