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

async function deletePublicSubmissionArtifacts(input: {
  caseIds?: string[];
  donationIds?: string[];
  contactIds?: string[];
}): Promise<void> {
  const caseIds = input.caseIds || [];
  const donationIds = input.donationIds || [];
  const contactIds = input.contactIds || [];

  if (caseIds.length === 0 && donationIds.length === 0 && contactIds.length === 0) {
    return;
  }

  const client = new PgClient(getDatabaseConfig());
  try {
    await client.connect();
    if (donationIds.length > 0) {
      await client.query('DELETE FROM donations WHERE id = ANY($1::uuid[])', [donationIds]);
    }
    if (caseIds.length > 0) {
      await client.query('DELETE FROM cases WHERE id = ANY($1::uuid[])', [caseIds]);
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
    const createdCaseIds: string[] = [];
    const createdContactIds: string[] = [];
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
      await expect(authenticatedPage.getByRole('button', { name: /send message/i })).toBeVisible();
      const referralForm = authenticatedPage
        .locator('form[data-public-site-form="true"]')
        .filter({ has: authenticatedPage.locator('input[name="subject"]') });
      await expect(referralForm).toHaveCount(1);
      await expect(referralForm.getByRole('button', { name: /submit referral/i })).toBeVisible();

      const referralEmail = `referral-${Date.now()}@example.com`;
      const referralPhone = `(604) 555-${Date.now().toString().slice(-4)}`;
      await referralForm.locator('input[name="first_name"]').fill('Grace');
      await referralForm.locator('input[name="last_name"]').fill('Hopper');
      await referralForm.locator('input[name="email"]').fill(referralEmail);
      await referralForm.locator('input[name="phone"]').fill(referralPhone);
      await referralForm.locator('input[name="subject"]').fill('Housing referral');
      await referralForm.locator('input[name="referral_source"]').fill('Community Partner');
      await referralForm.locator('textarea[name="notes"]').fill('Needs support this week.');
      await referralForm.locator('input[name="urgent"]').check();

      const submitResponsePromise = authenticatedPage.waitForResponse((response) => {
        return (
          response.request().method() === 'POST' &&
          response.url().includes(`/api/v2/public/forms/${siteId}/referral-form-block/submit`)
        );
      });
      await referralForm.getByRole('button', { name: /submit referral/i }).click();

      const submitResponse = await submitResponsePromise;
      const submitRawBody = await submitResponse.text();
      expect(
        submitResponse.ok(),
        `Public referral submit failed (${submitResponse.status()}): ${submitRawBody}`
      ).toBeTruthy();
      const submitBody = unwrapBody<{ caseId?: string; contactId?: string; message?: string }>(
        JSON.parse(submitRawBody)
      );
      expect(submitBody.message).toBe(
        'Thanks. The referral has been recorded and routed for follow-up.'
      );
      expect(submitBody.caseId).toBeTruthy();
      expect(submitBody.contactId).toBeTruthy();

      if (submitBody.caseId) {
        createdCaseIds.push(submitBody.caseId);
      }
      if (submitBody.contactId) {
        createdContactIds.push(submitBody.contactId);
      }

      await expect(referralForm.locator('[data-form-status]')).toHaveText(
        'Thanks. The referral has been recorded and routed for follow-up.'
      );

      const client = new PgClient(getDatabaseConfig());
      try {
        await client.connect();
        const result = await client.query<{
          contact_id: string;
          title: string;
          source: string | null;
          referral_source: string | null;
          is_urgent: boolean;
        }>(
          `SELECT contact_id, title, source, referral_source, is_urgent
           FROM cases
           WHERE id = $1`,
          [submitBody.caseId]
        );

        expect(result.rows[0]).toMatchObject({
          contact_id: submitBody.contactId,
          title: 'Housing referral',
          source: 'referral',
          referral_source: 'Community Partner',
          is_urgent: true,
        });
      } finally {
        await client.end().catch(() => undefined);
      }

      await authenticatedPage.goto(`${publicBase}/?preview=true`, { waitUntil: 'domcontentloaded' });
      await expect(
        authenticatedPage.getByRole('heading', { name: /a community hub built for care/i })
      ).toBeVisible();
      const hasOverflow = await authenticatedPage.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(hasOverflow).toBe(false);
    } finally {
      await deletePublicSubmissionArtifacts({
        caseIds: createdCaseIds,
        contactIds: createdContactIds,
      });
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
      await deletePublicSubmissionArtifacts({
        donationIds: createdDonationIds,
        contactIds: createdContactIds,
      });
      await deleteWebsiteSite(authenticatedPage, authToken, siteId).catch(() => undefined);
      await deleteTemplate(authenticatedPage, authToken, templateId).catch(() => undefined);
    }
  });
});
