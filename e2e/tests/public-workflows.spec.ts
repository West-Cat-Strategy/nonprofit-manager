import { test, expect } from '../fixtures/auth.fixture';
import { createRequire } from 'node:module';
import path from 'node:path';
import { getAuthHeaders } from '../helpers/database';
import {
  createTemplate,
  createWebsiteSite,
  deleteTemplate,
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
  user: process.env.E2E_DB_ADMIN_USER || process.env.TEST_DB_ADMIN_USER || 'postgres',
  password: process.env.E2E_DB_ADMIN_PASSWORD || process.env.TEST_DB_ADMIN_PASSWORD || 'postgres',
});

const unwrapBody = <T>(body: unknown): T =>
  ((body as { data?: T } | undefined)?.data ?? body) as T;

type PublicActionType = 'petition_signature' | 'donation_pledge' | 'support_letter_request';

type PublicActionRecord = {
  id: string;
  action_type: PublicActionType;
  review_status: string;
  contact_id: string | null;
  amount: string | null;
  pledge_id: string | null;
  support_letter_id: string | null;
  letter_title: string | null;
};

type DonationRecord = {
  id: string;
  contact_id: string | null;
  payment_provider: string | null;
  amount: string;
  is_recurring: boolean;
};

type ContactRecord = {
  id: string;
};

async function configurePublicWorkflowHomepage(input: {
  templateId: string;
  slugs: {
    petition: string;
    pledge: string;
    supportLetter: string;
  };
}): Promise<void> {
  const client = new PgClient(getDatabaseConfig());
  try {
    await client.connect();
    const sections = [
      {
        id: 'section-managed-forms',
        name: 'Managed workflows',
        components: [
          {
            id: 'managed-heading',
            type: 'heading',
            content: 'Public workflow proof',
            level: 1,
            align: 'center',
          },
          {
            id: 'contact-form-proof',
            type: 'contact-form',
            heading: 'Ask for support',
            description: 'Send a public support request.',
            submitText: 'Send support request',
            successMessage: 'Support request received.',
            includePhone: true,
            includeMessage: true,
          },
          {
            id: 'donation-form-proof',
            type: 'donation-form',
            heading: 'Start a donation',
            description: 'Begin a public donation checkout.',
            submitText: 'Start checkout',
            successMessage: 'Donation started.',
            suggestedAmounts: [25, 50, 100],
            allowCustomAmount: true,
            recurringOption: true,
            recurringDefault: false,
            currency: 'CAD',
          },
        ],
      },
      {
        id: 'section-public-actions',
        name: 'Public actions',
        components: [
          {
            id: 'petition-proof',
            type: 'petition-form',
            actionSlug: input.slugs.petition,
            heading: 'Protect community hours',
            description: 'Add your name to the public petition.',
            petitionStatement: 'I support keeping community hours open.',
            submitText: 'Sign petition',
            includePhone: true,
          },
          {
            id: 'pledge-proof',
            type: 'donation-pledge-form',
            actionSlug: input.slugs.pledge,
            heading: 'Make a pledge',
            description: 'Promise future support for the campaign.',
            submitText: 'Send pledge',
            currency: 'CAD',
            pledgeSchedule: 'monthly',
          },
          {
            id: 'support-letter-proof',
            type: 'support-letter-request',
            actionSlug: input.slugs.supportLetter,
            heading: 'Request a support letter',
            description: 'Ask staff to prepare a support letter.',
            submitText: 'Request letter',
            includePhone: true,
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
      [JSON.stringify(sections), input.templateId]
    );

    expect(result.rows[0]?.id).toBeTruthy();
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function createPublicAction(input: {
  page: import('@playwright/test').Page;
  authToken: string;
  siteId: string;
  actionType: PublicActionType;
  slug: string;
  title: string;
  confirmationMessage: string;
  settings?: Record<string, unknown>;
}): Promise<string> {
  const headers = await getAuthHeaders(input.page, input.authToken);
  const response = await input.page.request.post(
    `${API_URL}/api/v2/sites/${input.siteId}/actions`,
    {
      headers,
      data: {
        actionType: input.actionType,
        status: 'published',
        slug: input.slug,
        title: input.title,
        confirmationMessage: input.confirmationMessage,
        settings: input.settings || {},
      },
    }
  );

  expect(
    response.ok(),
    `Failed to create public action ${input.slug} (${response.status()}): ${await response.text()}`
  ).toBeTruthy();
  const body = unwrapBody<{ id?: string }>(await response.json());
  expect(body.id).toBeTruthy();
  return body.id as string;
}

async function configureDonationProvider(input: {
  page: import('@playwright/test').Page;
  authToken: string;
  siteId: string;
}): Promise<void> {
  const headers = await getAuthHeaders(input.page, input.authToken);
  const response = await input.page.request.put(
    `${API_URL}/api/v2/sites/${input.siteId}/integrations/stripe`,
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

  expect(
    response.ok(),
    `Failed to configure donation provider (${response.status()}): ${await response.text()}`
  ).toBeTruthy();
}

async function waitForContact(email: string, timeoutMs = 15_000): Promise<ContactRecord> {
  const client = new PgClient(getDatabaseConfig());
  const deadline = Date.now() + timeoutMs;

  try {
    await client.connect();
    while (Date.now() < deadline) {
      const result = await client.query<ContactRecord>(
        `SELECT id
           FROM contacts
          WHERE LOWER(email) = LOWER($1)
          ORDER BY created_at DESC
          LIMIT 1`,
        [email]
      );
      if (result.rows[0]) {
        return result.rows[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    await client.end().catch(() => undefined);
  }

  throw new Error(`Timed out waiting for contact ${email}`);
}

async function waitForDonation(email: string, timeoutMs = 15_000): Promise<DonationRecord> {
  const client = new PgClient(getDatabaseConfig());
  const deadline = Date.now() + timeoutMs;

  try {
    await client.connect();
    while (Date.now() < deadline) {
      const result = await client.query<DonationRecord>(
        `SELECT donations.id,
                donations.contact_id,
                donations.payment_provider,
                donations.amount::text AS amount,
                donations.is_recurring
           FROM donations
           JOIN contacts ON contacts.id = donations.contact_id
          WHERE LOWER(contacts.email) = LOWER($1)
          ORDER BY donations.created_at DESC
          LIMIT 1`,
        [email]
      );
      if (result.rows[0]) {
        return result.rows[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    await client.end().catch(() => undefined);
  }

  throw new Error(`Timed out waiting for donation ${email}`);
}

async function waitForPublicActionSubmission(input: {
  siteId: string;
  actionType: PublicActionType;
  email: string;
  timeoutMs?: number;
}): Promise<PublicActionRecord> {
  const client = new PgClient(getDatabaseConfig());
  const timeoutMs = input.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;

  try {
    await client.connect();
    while (Date.now() < deadline) {
      const result = await client.query<PublicActionRecord>(
        `SELECT submissions.id,
                submissions.action_type,
                submissions.review_status,
                submissions.contact_id,
                submissions.payload_redacted->>'amount' AS amount,
                pledges.id AS pledge_id,
                support_letters.id AS support_letter_id,
                support_letters.letter_title
           FROM website_public_action_submissions submissions
           LEFT JOIN website_public_pledges pledges
             ON pledges.submission_id = submissions.id
           LEFT JOIN website_support_letters support_letters
             ON support_letters.submission_id = submissions.id
          WHERE submissions.site_id = $1
            AND submissions.action_type = $2
            AND LOWER(submissions.payload_redacted->>'email') = LOWER($3)
          ORDER BY submissions.submitted_at DESC
          LIMIT 1`,
        [input.siteId, input.actionType, input.email]
      );
      if (result.rows[0]) {
        return result.rows[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    await client.end().catch(() => undefined);
  }

  throw new Error(
    `Timed out waiting for ${input.actionType} submission from ${input.email}`
  );
}

async function cleanupPublicWorkflowArtifacts(input: {
  siteId?: string;
  templateId?: string;
  contactIds: string[];
  donationIds: string[];
  eventPage: import('@playwright/test').Page;
  authToken: string;
}): Promise<void> {
  if (input.siteId) {
    await deleteWebsiteSite(input.eventPage, input.authToken, input.siteId).catch(() => undefined);
  }

  const client = new PgClient(getDatabaseConfig());
  try {
    await client.connect();
    if (input.donationIds.length > 0) {
      await client.query('DELETE FROM donations WHERE id = ANY($1::uuid[])', [input.donationIds]);
    }
    if (input.contactIds.length > 0) {
      await client.query('DELETE FROM contacts WHERE id = ANY($1::uuid[])', [input.contactIds]);
    }
  } finally {
    await client.end().catch(() => undefined);
  }

  if (input.templateId) {
    await deleteTemplate(input.eventPage, input.authToken, input.templateId).catch(() => undefined);
  }
}

test.describe('Public workflow browser proof', () => {
  test('drives managed forms, donation checkout, and public action blocks through the public runtime', async ({
    authenticatedPage,
    authToken,
  }) => {
    test.setTimeout(180000);

    const runId = `${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;
    const templateId = await createTemplate(authenticatedPage, authToken);
    const customDomain = `p5-t71-${runId}.localhost`;
    const slugs = {
      petition: `petition-${runId}`,
      pledge: `pledge-${runId}`,
      supportLetter: `support-letter-${runId}`,
    };
    const contactIds: string[] = [];
    const donationIds: string[] = [];
    let siteId = '';

    try {
      await configurePublicWorkflowHomepage({
        templateId,
        slugs,
      });

      siteId = await createWebsiteSite(authenticatedPage, authToken, templateId, {
        name: `P5-T71 Public Proof ${runId}`,
        customDomain,
      });
      await configureDonationProvider({
        page: authenticatedPage,
        authToken,
        siteId,
      });

      await createPublicAction({
        page: authenticatedPage,
        authToken,
        siteId,
        actionType: 'petition_signature',
        slug: slugs.petition,
        title: 'Protect community hours',
        confirmationMessage: 'Signature received.',
      });
      await createPublicAction({
        page: authenticatedPage,
        authToken,
        siteId,
        actionType: 'donation_pledge',
        slug: slugs.pledge,
        title: 'Community pledge',
        confirmationMessage: 'Pledge received.',
        settings: {
          currency: 'CAD',
          pledgeSchedule: 'monthly',
        },
      });
      await createPublicAction({
        page: authenticatedPage,
        authToken,
        siteId,
        actionType: 'support_letter_request',
        slug: slugs.supportLetter,
        title: 'Support letter desk',
        confirmationMessage: 'Letter request received.',
        settings: {
          letterTitle: 'Public support letter',
          templateVersion: 'p5-t71',
        },
      });

      await publishWebsiteSite(authenticatedPage, authToken, {
        siteId,
        templateId,
      });

      const publicBase = `http://${customDomain}:${getPublicSitePort()}`;
      await authenticatedPage.goto(`${publicBase}/`, { waitUntil: 'domcontentloaded' });
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Public workflow proof' })
      ).toBeVisible();

      const contactForm = authenticatedPage
        .locator('form[data-public-site-form="true"]')
        .filter({ has: authenticatedPage.getByRole('button', { name: 'Send support request' }) });
      await expect(contactForm).toHaveCount(1);
      const contactEmail = `p5-t71-contact-${runId}@example.com`;
      await contactForm.locator('input[name="first_name"]').fill('Public');
      await contactForm.locator('input[name="last_name"]').fill('Contact');
      await contactForm.locator('input[name="email"]').fill(contactEmail);
      await contactForm.locator('input[name="phone"]').fill('(604) 555-7100');
      await contactForm.locator('textarea[name="message"]').fill('Browser proof support request.');
      const contactSubmitResponsePromise = authenticatedPage.waitForResponse((response) => {
        return (
          response.request().method() === 'POST' &&
          response.url().includes(`/api/v2/public/forms/${siteId}/contact-form-proof/submit`)
        );
      });
      await contactForm.getByRole('button', { name: 'Send support request' }).click();
      const contactSubmitResponse = await contactSubmitResponsePromise;
      expect(
        contactSubmitResponse.ok(),
        `Managed contact form failed (${contactSubmitResponse.status()}): ${await contactSubmitResponse.text()}`
      ).toBeTruthy();
      await expect(contactForm.locator('[data-form-status]')).toHaveText(
        'Support request received.'
      );
      contactIds.push((await waitForContact(contactEmail)).id);

      const donationForm = authenticatedPage
        .locator('form[data-public-site-form="true"]')
        .filter({ has: authenticatedPage.getByRole('button', { name: 'Start checkout' }) });
      await expect(donationForm).toHaveCount(1);
      const donorEmail = `p5-t71-donor-${runId}@example.com`;
      await donationForm.locator('input[name="first_name"]').fill('Drew');
      await donationForm.locator('input[name="last_name"]').fill('Donor');
      await donationForm.locator('input[name="email"]').fill(donorEmail);
      await donationForm.locator('input[name="phone"]').fill('(604) 555-7101');
      await donationForm.locator('input[name="amount"]').fill('50');
      const donationSubmitResponsePromise = authenticatedPage.waitForResponse((response) => {
        return (
          response.request().method() === 'POST' &&
          response.url().includes(`/api/v2/public/forms/${siteId}/donation-form-proof/submit`)
        );
      });
      await donationForm.getByRole('button', { name: 'Start checkout' }).click();
      const donationSubmitResponse = await donationSubmitResponsePromise;
      const donationRawBody = await donationSubmitResponse.text();
      expect(
        donationSubmitResponse.ok(),
        `Donation checkout form failed (${donationSubmitResponse.status()}): ${donationRawBody}`
      ).toBeTruthy();
      const donationBody = unwrapBody<{ donationId?: string; contactId?: string; message?: string }>(
        JSON.parse(donationRawBody)
      );
      expect(donationBody.message).toBe('Donation started.');
      expect(donationBody.donationId).toBeTruthy();
      expect(donationBody.contactId).toBeTruthy();
      await expect(donationForm.locator('[data-form-status]')).toHaveText('Donation started.');
      const donation = await waitForDonation(donorEmail);
      donationIds.push(donation.id);
      if (donation.contact_id) {
        contactIds.push(donation.contact_id);
      }
      expect(donation).toMatchObject({
        payment_provider: 'paypal',
        amount: '50.00',
        is_recurring: false,
      });

      await authenticatedPage.goto(`${publicBase}/`, { waitUntil: 'domcontentloaded' });
      const petitionForm = authenticatedPage
        .locator('form[data-public-site-form="true"]')
        .filter({ has: authenticatedPage.getByRole('button', { name: 'Sign petition' }) });
      await expect(petitionForm).toHaveCount(1);
      const signerEmail = `p5-t71-signer-${runId}@example.com`;
      await petitionForm.locator('input[name="first_name"]').fill('Pat');
      await petitionForm.locator('input[name="last_name"]').fill('Petition');
      await petitionForm.locator('input[name="email"]').fill(signerEmail);
      await petitionForm.locator('input[name="phone"]').fill('(604) 555-7102');
      await petitionForm.locator('textarea[name="message"]').fill('Please keep hours open.');
      await petitionForm.locator('input[name="consent"]').check();
      const petitionSubmitResponsePromise = authenticatedPage.waitForResponse((response) => {
        return (
          response.request().method() === 'POST' &&
          response.url().includes(`/api/v2/public/actions/${siteId}/${slugs.petition}/submissions`)
        );
      });
      await petitionForm.getByRole('button', { name: 'Sign petition' }).click();
      const petitionSubmitResponse = await petitionSubmitResponsePromise;
      expect(
        petitionSubmitResponse.ok(),
        `Petition action block failed (${petitionSubmitResponse.status()}): ${await petitionSubmitResponse.text()}`
      ).toBeTruthy();
      await expect(petitionForm.locator('[data-form-status]')).toHaveText('Signature received.');
      const petition = await waitForPublicActionSubmission({
        siteId,
        actionType: 'petition_signature',
        email: signerEmail,
      });
      expect(petition).toMatchObject({
        action_type: 'petition_signature',
        review_status: 'new',
      });
      expect(petition.contact_id).toBeTruthy();
      if (petition.contact_id) {
        contactIds.push(petition.contact_id);
      }

      const pledgeForm = authenticatedPage
        .locator('form[data-public-site-form="true"]')
        .filter({ has: authenticatedPage.getByRole('button', { name: 'Send pledge' }) });
      await expect(pledgeForm).toHaveCount(1);
      const pledgeEmail = `p5-t71-pledge-${runId}@example.com`;
      await pledgeForm.locator('input[name="first_name"]').fill('Morgan');
      await pledgeForm.locator('input[name="last_name"]').fill('Pledge');
      await pledgeForm.locator('input[name="email"]').fill(pledgeEmail);
      await pledgeForm.locator('input[name="phone"]').fill('(604) 555-7103');
      await pledgeForm.locator('input[name="amount"]').fill('75');
      await pledgeForm.locator('select[name="schedule"]').selectOption('monthly');
      await pledgeForm.locator('textarea[name="message"]').fill('Monthly public pledge proof.');
      await pledgeForm.locator('input[name="consent"]').check();
      const pledgeSubmitResponsePromise = authenticatedPage.waitForResponse((response) => {
        return (
          response.request().method() === 'POST' &&
          response.url().includes(`/api/v2/public/actions/${siteId}/${slugs.pledge}/submissions`)
        );
      });
      await pledgeForm.getByRole('button', { name: 'Send pledge' }).click();
      const pledgeSubmitResponse = await pledgeSubmitResponsePromise;
      expect(
        pledgeSubmitResponse.ok(),
        `Pledge action block failed (${pledgeSubmitResponse.status()}): ${await pledgeSubmitResponse.text()}`
      ).toBeTruthy();
      await expect(pledgeForm.locator('[data-form-status]')).toHaveText('Pledge received.');
      const pledge = await waitForPublicActionSubmission({
        siteId,
        actionType: 'donation_pledge',
        email: pledgeEmail,
      });
      expect(pledge).toMatchObject({
        action_type: 'donation_pledge',
        review_status: 'new',
        amount: '75',
      });
      expect(pledge.pledge_id).toBeTruthy();
      expect(pledge.contact_id).toBeTruthy();
      if (pledge.contact_id) {
        contactIds.push(pledge.contact_id);
      }

      const supportLetterForm = authenticatedPage
        .locator('form[data-public-site-form="true"]')
        .filter({ has: authenticatedPage.getByRole('button', { name: 'Request letter' }) });
      await expect(supportLetterForm).toHaveCount(1);
      const letterEmail = `p5-t71-letter-${runId}@example.com`;
      await supportLetterForm.locator('input[name="first_name"]').fill('Riley');
      await supportLetterForm.locator('input[name="last_name"]').fill('Letter');
      await supportLetterForm.locator('input[name="email"]').fill(letterEmail);
      await supportLetterForm.locator('input[name="phone"]').fill('(604) 555-7104');
      await supportLetterForm.locator('input[name="purpose"]').fill('Housing application');
      await supportLetterForm.locator('textarea[name="message"]').fill('Please include program history.');
      await supportLetterForm.locator('input[name="consent"]').check();
      const supportLetterSubmitResponsePromise = authenticatedPage.waitForResponse((response) => {
        return (
          response.request().method() === 'POST' &&
          response.url().includes(`/api/v2/public/actions/${siteId}/${slugs.supportLetter}/submissions`)
        );
      });
      await supportLetterForm.getByRole('button', { name: 'Request letter' }).click();
      const supportLetterSubmitResponse = await supportLetterSubmitResponsePromise;
      expect(
        supportLetterSubmitResponse.ok(),
        `Support-letter action block failed (${supportLetterSubmitResponse.status()}): ${await supportLetterSubmitResponse.text()}`
      ).toBeTruthy();
      await expect(supportLetterForm.locator('[data-form-status]')).toHaveText(
        'Letter request received.'
      );
      const supportLetter = await waitForPublicActionSubmission({
        siteId,
        actionType: 'support_letter_request',
        email: letterEmail,
      });
      expect(supportLetter).toMatchObject({
        action_type: 'support_letter_request',
        review_status: 'new',
        letter_title: 'Public support letter',
      });
      expect(supportLetter.support_letter_id).toBeTruthy();
      expect(supportLetter.contact_id).toBeTruthy();
      if (supportLetter.contact_id) {
        contactIds.push(supportLetter.contact_id);
      }
    } finally {
      await cleanupPublicWorkflowArtifacts({
        siteId,
        templateId,
        contactIds: Array.from(new Set(contactIds)),
        donationIds: Array.from(new Set(donationIds)),
        eventPage: authenticatedPage,
        authToken,
      });
    }
  });
});
