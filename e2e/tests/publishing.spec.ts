import { test, expect } from '../fixtures/auth.fixture';
import { createRequire } from 'node:module';
import path from 'node:path';
import { getAuthHeaders } from '../helpers/database';
import {
  createWebsiteSite,
  deleteWebsiteSite,
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

const getPublicSitePort = (): string => {
  const configuredPort = process.env.E2E_PUBLIC_SITE_PORT?.trim();
  if (configuredPort) {
    return configuredPort;
  }

  const configuredEnvPort = process.env.PUBLIC_SITE_PORT?.trim();
  if (configuredEnvPort) {
    return configuredEnvPort;
  }

  return '3001';
};

const getDatabaseConfig = (): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} => ({
  host: process.env.DB_HOST || process.env.E2E_DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.E2E_DB_PORT || '8012'),
  database: process.env.DB_NAME || process.env.E2E_DB_NAME || 'nonprofit_manager_test',
  user: process.env.E2E_DB_ADMIN_USER || process.env.TEST_DB_ADMIN_USER || 'postgres',
  password: process.env.E2E_DB_ADMIN_PASSWORD || process.env.TEST_DB_ADMIN_PASSWORD || 'postgres',
});

const unwrapBody = <T>(body: unknown): T =>
  ((body as { data?: T } | undefined)?.data ?? body) as T;

const unwrapCollection = <T>(body: unknown): T[] => {
  const payload = unwrapBody<unknown>(body);

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: unknown[] }).data)
  ) {
    return (payload as { data: T[] }).data;
  }

  return [];
};

async function deletePublicSubmissionArtifacts(input: {
  contactIds?: string[];
}): Promise<void> {
  const contactIds = input.contactIds || [];

  if (contactIds.length === 0) {
    return;
  }

  const client = new PgClient(getDatabaseConfig());
  try {
    await client.connect();
    await client.query('DELETE FROM contacts WHERE id = ANY($1::uuid[])', [contactIds]);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function getSystemTemplateId(
  page: import('@playwright/test').Page,
  authToken: string
): Promise<string> {
  const headers = await getAuthHeaders(page, authToken);
  const response = await page.request.get(`${API_URL}/api/v2/templates/system`, { headers });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const templates = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  const starter = templates.find(
    (template: { name?: string }) => template?.name === 'Community Nonprofit Hub'
  );

  if (!starter?.id) {
    throw new Error(`Unable to find Community Nonprofit Hub template: ${JSON.stringify(body)}`);
  }

  return starter.id as string;
}

test.describe('Publishing Workflows', () => {
  test('publishing API validates payload and publishing UI loads', async ({
    authenticatedPage,
    authToken,
  }) => {
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    const createSite = await authenticatedPage.request.post(`${API_URL}/api/v2/sites`, {
      headers,
      data: { templateId: 'bad-uuid', name: '' },
    });
    expect(createSite.status()).toBe(400);

    await authenticatedPage.goto('/website-builder');
    await expect(authenticatedPage).toHaveURL(/\/website-builder$/);
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Website Builder' })
    ).toBeVisible();
  });

  test('site-aware website surfaces expose the managed-form verification loop', async ({
    authenticatedPage,
    authToken,
  }) => {
    test.setTimeout(180000);

    const templateId = await getSystemTemplateId(authenticatedPage, authToken);
    const siteName = `P5 Website ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const customDomain = `p5-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}.localhost`;
    const createdContactIds: string[] = [];
    const siteId = await createWebsiteSite(authenticatedPage, authToken, templateId, {
      name: siteName,
      customDomain,
    });
    const headers = await getAuthHeaders(authenticatedPage, authToken);

    try {
      const formsResponse = await authenticatedPage.request.get(`${API_URL}/api/v2/sites/${siteId}/forms`, {
        headers,
      });
      expect(formsResponse.ok()).toBeTruthy();
      const formsBody = await formsResponse.json();
      const forms = unwrapBody<
        Array<{
          formKey: string;
          formType: string;
          title: string;
          path: string;
          operationalSettings?: {
            submitText?: string;
            successMessage?: string;
          };
          publicRuntime?: {
            publicPath?: string | null;
          };
        }>
      >(formsBody);
      const contactForm = forms.find((form) => form.formType === 'contact-form');
      expect(contactForm).toBeTruthy();
      if (!contactForm) {
        throw new Error(`Expected contact form in website forms payload: ${JSON.stringify(formsBody)}`);
      }

      const submitTextOverride = `Send support request ${Date.now()}`;
      const successMessageOverride = `Thanks from ${siteName}. We'll be in touch soon.`;
      const publicPath = contactForm.publicRuntime?.publicPath || contactForm.path || '/contact';
      const publicBase = `http://${customDomain}:${getPublicSitePort()}`;

      await authenticatedPage.goto(`/websites/${siteId}/overview`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/overview$`));
      await expect(
        authenticatedPage
          .locator('#main-content')
          .getByRole('heading', { level: 1, name: siteName })
      ).toBeVisible();
      await expect(authenticatedPage.getByText('Managed form spotlight')).toBeVisible();
      await expect(
        authenticatedPage.getByText('Submission endpoint', { exact: true })
      ).toBeVisible();
      await expect(authenticatedPage.getByText(new RegExp(`/api/v2/public/forms/${siteId}/`))).toBeVisible();

      await authenticatedPage.goto(`/websites/${siteId}/forms`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/forms$`));
      await expect(authenticatedPage.getByText('Managed form launch verification')).toBeVisible();
      await expect(
        authenticatedPage.getByText('Submission endpoint', { exact: true })
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole('link', { name: 'Open builder' })
      ).toHaveAttribute('href', `/websites/${siteId}/builder`);

      const contactCard = authenticatedPage
        .locator('article')
        .filter({ has: authenticatedPage.getByText(contactForm.title, { exact: true }) })
        .first();
      await expect(contactCard).toBeVisible();

      await contactCard.getByPlaceholder('Primary button text').fill(submitTextOverride);
      await contactCard.getByPlaceholder('Success message').fill(successMessageOverride);

      const saveResponsePromise = authenticatedPage.waitForResponse((response) => {
        return (
          response.request().method() === 'PUT' &&
          response.url().includes(`/api/v2/sites/${siteId}/forms/${contactForm.formKey}`)
        );
      });
      await contactCard.getByRole('button', { name: 'Save form settings' }).click();

      const saveResponse = await saveResponsePromise;
      expect(
        saveResponse.ok(),
        `Saving managed form settings failed (${saveResponse.status()})`
      ).toBeTruthy();
      await expect(authenticatedPage.getByText('Form settings saved.')).toBeVisible();

      await expect
        .poll(
          async () => {
            const refreshedFormsResponse = await authenticatedPage.request.get(
              `${API_URL}/api/v2/sites/${siteId}/forms`,
              { headers }
            );
            if (!refreshedFormsResponse.ok()) {
              return null;
            }

            const refreshedForms = unwrapBody<
              Array<{
                formKey: string;
                operationalSettings?: {
                  submitText?: string;
                  successMessage?: string;
                };
              }>
            >(await refreshedFormsResponse.json());
            const refreshedContactForm = refreshedForms.find(
              (form) => form.formKey === contactForm.formKey
            );

            return refreshedContactForm?.operationalSettings ?? null;
          },
          {
            message: `Expected managed form overrides for ${contactForm.formKey} to persist`,
            timeout: 15_000,
          }
        )
        .toMatchObject({
          submitText: submitTextOverride,
          successMessage: successMessageOverride,
        });

      await authenticatedPage.goto(`/websites/${siteId}/publishing`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/publishing$`));
      await expect(authenticatedPage.getByText('Managed form publish verification')).toBeVisible();
      await expect(authenticatedPage.getByText('Publishing controls')).toBeVisible();

      await authenticatedPage.goto(`/websites/${siteId}/builder`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/builder$`));
      await expect(authenticatedPage.getByText(/Site: /)).toBeVisible();
      await expect(authenticatedPage.getByText(/Publish status: /)).toBeVisible();
      await expect(authenticatedPage.getByText(/Managed forms: /)).toBeVisible();

      await authenticatedPage
        .getByRole('button', { name: 'Back to website console' })
        .click();
      await expect(authenticatedPage).toHaveURL(new RegExp(`/websites/${siteId}/overview$`));

      await authenticatedPage.goto(`/websites/${siteId}/publishing`, {
        waitUntil: 'domcontentloaded',
      });
      const publishResponsePromise = authenticatedPage.waitForResponse((response) => {
        return response.request().method() === 'POST' && response.url().endsWith('/api/v2/sites/publish');
      });
      await authenticatedPage.getByRole('button', { name: 'Publish live' }).click();

      const publishResponse = await publishResponsePromise;
      expect(publishResponse.ok()).toBeTruthy();
      await expect(authenticatedPage.getByText('Latest template published.')).toBeVisible();

      await authenticatedPage.goto(`${publicBase}${publicPath}`, {
        waitUntil: 'domcontentloaded',
      });
      const publicContactForm = authenticatedPage
        .locator('form[data-public-site-form="true"]')
        .filter({ has: authenticatedPage.locator('textarea[name="message"]') });
      await expect(publicContactForm).toHaveCount(1);
      await expect(
        publicContactForm.getByRole('button', { name: submitTextOverride })
      ).toBeVisible();

      const contactEmail = `p5-contact-${Date.now()}@example.com`;
      await publicContactForm.locator('input[name="first_name"]').fill('Casey');
      await publicContactForm.locator('input[name="last_name"]').fill('Jordan');
      await publicContactForm.locator('input[name="email"]').fill(contactEmail);
      await publicContactForm.locator('textarea[name="message"]').fill('Need help getting connected.');

      const publicSubmitResponsePromise = authenticatedPage.waitForResponse((response) => {
        return (
          response.request().method() === 'POST' &&
          response.url().includes(`/api/v2/public/forms/${siteId}/${contactForm.formKey}/submit`)
        );
      });
      await publicContactForm.getByRole('button', { name: submitTextOverride }).click();

      const publicSubmitResponse = await publicSubmitResponsePromise;
      expect(
        publicSubmitResponse.ok(),
        `Public contact submit failed (${publicSubmitResponse.status()})`
      ).toBeTruthy();

      await expect(publicContactForm.locator('[data-form-status]')).toHaveText(
        successMessageOverride
      );

      let createdContactId: string | null = null;
      await expect
        .poll(
          async () => {
            const lookupResponse = await authenticatedPage.request.get(
              `${API_URL}/api/v2/contacts?search=${encodeURIComponent(contactEmail)}`,
              { headers }
            );
            if (!lookupResponse.ok()) {
              return null;
            }

            const contacts = unwrapCollection<{ contact_id?: string; email?: string | null }>(
              await lookupResponse.json()
            );
            const matchingContact =
              contacts.find((contact) => contact.email === contactEmail) ?? contacts[0];

            createdContactId = matchingContact?.contact_id ?? null;
            return createdContactId;
          },
          {
            message: `Expected public contact submission for ${contactEmail} to be queryable`,
            timeout: 15_000,
          }
        )
        .not.toBeNull();

      if (createdContactId) {
        createdContactIds.push(createdContactId);
      }
    } finally {
      await deletePublicSubmissionArtifacts({ contactIds: createdContactIds });
      await deleteWebsiteSite(authenticatedPage, authToken, siteId);
    }
  });
});
