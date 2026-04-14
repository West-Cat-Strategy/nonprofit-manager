import { test, expect } from '../fixtures/auth.fixture';
import { createRequire } from 'node:module';
import path from 'node:path';
import { getAuthHeaders } from '../helpers/database';
import {
  createTemplate,
  createWebsiteEntry,
  createWebsiteSite,
  deleteTemplate,
  deleteWebsiteEntry,
  deleteWebsiteSite,
  publishWebsiteSite,
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
  user: process.env.DB_USER || process.env.E2E_DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.E2E_DB_PASSWORD || 'postgres',
});

const unwrapBody = <T>(body: unknown): T =>
  ((body as { data?: T } | undefined)?.data ?? body) as T;

async function getSystemTemplateId(page: import('@playwright/test').Page, authToken: string): Promise<string> {
  const headers = await getAuthHeaders(page, authToken);
  const response = await page.request.get(`${API_URL}/api/v2/templates/system`, { headers });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const templates = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  const starter = templates.find((template: { name?: string }) => template?.name === 'Community Nonprofit Hub');
  if (!starter?.id) {
    throw new Error(`Unable to find Community Nonprofit Hub template: ${JSON.stringify(body)}`);
  }
  return starter.id as string;
}

async function configureDonationHomepage(
  templateId: string
): Promise<void> {
  const client = new PgClient(getDatabaseConfig());
  try {
    await client.connect();
    const sections = [
      {
        id: 'section-donation',
        name: 'Donate',
        components: [
          {
            id: 'donation-heading-1',
            type: 'heading',
            content: 'Support the work',
            level: 2,
            align: 'center',
          },
          {
            id: 'donation-form-1',
            type: 'donation-form',
            description: 'Back the programs with a public donation.',
            successMessage: 'Donation started.',
            suggestedAmounts: [25, 50, 100],
            submitText: 'Donate now',
          },
        ],
      },
    ];

    const result = await client.query<{ id: string }>(
      `
        UPDATE template_pages
        SET sections = $1::jsonb,
            updated_at = NOW()
        WHERE template_id = $2
          AND is_homepage = TRUE
        RETURNING id
      `,
      [JSON.stringify(sections), templateId]
    );

    expect(result.rows[0]?.id).toBeTruthy();
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function deleteDonationFlowArtifacts(
  donationIds: string[],
  contactIds: string[]
): Promise<void> {
  if (donationIds.length === 0 && contactIds.length === 0) {
    return;
  }

  const client = new PgClient(getDatabaseConfig());
  try {
    await client.connect();
    if (donationIds.length > 0) {
      await client.query('DELETE FROM donations WHERE id = ANY($1::uuid[])', [donationIds]);
    }
    if (contactIds.length > 0) {
      await client.query('DELETE FROM contacts WHERE id = ANY($1::uuid[])', [contactIds]);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

test.describe('Public website starter', () => {
  test('renders the nonprofit starter, tracks CTAs, and submits the referral form', async ({
    authenticatedPage,
    authToken,
  }) => {
    const templateId = await getSystemTemplateId(authenticatedPage, authToken);
    const uniqueDomain = `community-hub-${Date.now().toString(36)}.localhost`;
    const siteName = `Community Hub ${Date.now()}`;
    let newsletterEntryId = '';
    const siteId = await createWebsiteSite(authenticatedPage, authToken, templateId, {
      name: siteName,
      customDomain: uniqueDomain,
    });
    const newsletterTitle = `Community Update ${Date.now()}`;
    const newsletterExcerpt = 'A community update about programs, events, and support.';

    try {
      newsletterEntryId = await createWebsiteEntry(authenticatedPage, authToken, siteId, {
        title: newsletterTitle,
        excerpt: newsletterExcerpt,
        bodyHtml: `<p>${newsletterExcerpt}</p><p>Registration and referral pathways are open this week.</p>`,
        status: 'published',
        slug: `community-update-${Date.now().toString(36)}`,
      });

      await publishWebsiteSite(authenticatedPage, authToken, {
        siteId,
        templateId,
      });

      const publicBase = `http://${uniqueDomain}:${getPublicSitePort()}`;
      await authenticatedPage.goto(`${publicBase}/`, { waitUntil: 'domcontentloaded' });

      await expect(
        authenticatedPage.getByRole('heading', { name: /a community hub built for care/i })
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole('main').getByRole('link', { name: "What's Happening" })
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole('main').getByRole('link', { name: 'Client Portal' })
      ).toHaveAttribute(
        'data-track-click',
        'true'
      );

      const getInvolvedLink = authenticatedPage.getByRole('main').getByRole('link', { name: /get involved/i });
      await expect(getInvolvedLink).toHaveAttribute('data-track-click', 'true');
      await getInvolvedLink.click();

      await authenticatedPage.goto(`${publicBase}/whats-happening`, { waitUntil: 'domcontentloaded' });
      await expect(authenticatedPage.getByRole('heading', { name: /what's happening/i })).toBeVisible();
      await expect(authenticatedPage.getByText(/subscribe once and stay connected/i)).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: newsletterTitle })).toBeVisible();
      await expect(authenticatedPage.getByText(newsletterExcerpt)).toBeVisible();

      await authenticatedPage.goto(`${publicBase}/contact`, { waitUntil: 'domcontentloaded' });
      await expect(authenticatedPage.getByRole('heading', { name: /contact and referral/i })).toBeVisible();
      const contactTextboxes = authenticatedPage.getByRole('main').getByRole('textbox');
      await expect(contactTextboxes.nth(0)).toBeVisible();
      await expect(contactTextboxes.nth(1)).toBeVisible();
      await expect(contactTextboxes.nth(2)).toBeVisible();
      await expect(contactTextboxes.nth(3)).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /send message/i })).toBeVisible();
      await authenticatedPage.getByRole('button', { name: /send message/i }).click();

      await authenticatedPage.goto(`${publicBase}/?preview=true`, { waitUntil: 'domcontentloaded' });
      await expect(
        authenticatedPage.getByRole('heading', { name: /a community hub built for care/i })
      ).toBeVisible();
      const hasOverflow = await authenticatedPage.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(hasOverflow).toBe(false);
    } finally {
      if (newsletterEntryId) {
        void deleteWebsiteEntry(authenticatedPage, authToken, siteId, newsletterEntryId).catch(() => undefined);
      }
      void deleteWebsiteSite(authenticatedPage, authToken, siteId).catch(() => undefined);
    }
  });

  test('submits a public donation form with the configured site payment provider', async ({
    authenticatedPage,
    authToken,
  }) => {
    const templateId = await createTemplate(authenticatedPage, authToken);
    const uniqueDomain = `donation-site-${Date.now().toString(36)}.localhost`;
    const siteName = `Donation Site ${Date.now()}`;
    const createdDonationIds: string[] = [];
    const createdContactIds: string[] = [];
    await configureDonationHomepage(templateId);
    const siteId = await createWebsiteSite(authenticatedPage, authToken, templateId, {
      name: siteName,
      customDomain: uniqueDomain,
    });

    try {
      const headers = await getAuthHeaders(authenticatedPage, authToken);
      const integrationResponse = await authenticatedPage.request.put(
        `${API_URL}/api/v2/sites/${siteId}/integrations/stripe`,
        {
          headers,
          data: {
            accountId: headers['X-Organization-Id'],
            provider: 'paypal',
            currency: 'cad',
            suggestedAmounts: [25, 50, 100],
            recurringDefault: false,
          },
        }
      );
      expect(integrationResponse.ok()).toBeTruthy();

      await publishWebsiteSite(authenticatedPage, authToken, {
        siteId,
        templateId,
      });

      const publicBase = `http://${uniqueDomain}:${getPublicSitePort()}`;
      await authenticatedPage.goto(`${publicBase}/`, { waitUntil: 'domcontentloaded' });

      await expect(authenticatedPage.getByRole('heading', { name: /support the work/i })).toBeVisible();
      const donorEmail = `donor-${Date.now()}@example.com`;
      const submitResponse = await authenticatedPage.request.post(
        `${API_URL}/api/v2/public/forms/${siteId}/donation-form-1/submit`,
        {
          headers: {
            Referer: `${publicBase}/`,
          },
          data: {
            first_name: 'Grace',
            last_name: 'Hopper',
            email: donorEmail,
            amount: 50,
          },
        }
      );
      const submitRawBody = await submitResponse.text();
      expect(
        submitResponse.ok(),
        `Public donation submit failed (${submitResponse.status()}): ${submitRawBody}`
      ).toBeTruthy();
      const submitBody = unwrapBody<{ donationId?: string; contactId?: string; message?: string }>(
        JSON.parse(submitRawBody)
      );
      expect(submitBody.message).toBe('Donation started.');
      expect(submitBody.donationId).toBeTruthy();
      expect(submitBody.contactId).toBeTruthy();

      if (submitBody.donationId) {
        createdDonationIds.push(submitBody.donationId);
      }
      if (submitBody.contactId) {
        createdContactIds.push(submitBody.contactId);
      }

      const client = new PgClient(getDatabaseConfig());
      try {
        await client.connect();
        const result = await client.query<{
          payment_provider: string | null;
          is_recurring: boolean;
        }>('SELECT payment_provider, is_recurring FROM donations WHERE id = $1', [submitBody.donationId]);

        expect(result.rows[0]).toMatchObject({
          payment_provider: 'paypal',
          is_recurring: false,
        });
      } finally {
        await client.end().catch(() => undefined);
      }
    } finally {
      await deleteDonationFlowArtifacts(createdDonationIds, createdContactIds);
      await deleteWebsiteSite(authenticatedPage, authToken, siteId).catch(() => undefined);
      await deleteTemplate(authenticatedPage, authToken, templateId).catch(() => undefined);
    }
  });
});
