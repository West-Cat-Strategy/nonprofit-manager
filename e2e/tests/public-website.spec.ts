import { test, expect } from '../fixtures/auth.fixture';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createTestEvent, getAuthHeaders } from '../helpers/database';
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
  user: process.env.E2E_DB_ADMIN_USER || process.env.TEST_DB_ADMIN_USER || 'postgres',
  password: process.env.E2E_DB_ADMIN_PASSWORD || process.env.TEST_DB_ADMIN_PASSWORD || 'postgres',
});

const unwrapBody = <T>(body: unknown): T =>
  ((body as { data?: T } | undefined)?.data ?? body) as T;

type ReferralSubmissionRecord = {
  case_id: string;
  contact_id: string;
  title: string;
  source: string | null;
  referral_source: string | null;
  is_urgent: boolean;
};

type EventRegistrationRecord = {
  registration_id: string;
  contact_id: string;
  event_id: string;
  notes: string | null;
};

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

type PublicActionTransitionResult = {
  submission?: {
    reviewStatus?: string;
  };
  contactId?: string;
  pledgeId?: string;
  supportLetterId?: string;
};

const slugifyPublicEventName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

async function waitForReferralSubmissionRecord(input: {
  email: string;
  title: string;
  timeoutMs?: number;
}): Promise<ReferralSubmissionRecord> {
  const client = new PgClient(getDatabaseConfig());
  const timeoutMs = input.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;

  try {
    await client.connect();

    while (Date.now() < deadline) {
      const result = await client.query<ReferralSubmissionRecord>(
        `SELECT cases.id AS case_id,
                cases.contact_id,
                cases.title,
                cases.source,
                cases.referral_source,
                cases.is_urgent
           FROM cases
           JOIN contacts ON contacts.id = cases.contact_id
          WHERE LOWER(contacts.email) = LOWER($1)
            AND cases.title = $2
          ORDER BY cases.created_at DESC
          LIMIT 1`,
        [input.email, input.title]
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
    `Timed out waiting for referral submission record for ${input.email} (${input.title})`
  );
}

async function waitForEventRegistrationRecord(input: {
  email: string;
  eventId: string;
  timeoutMs?: number;
}): Promise<EventRegistrationRecord> {
  const client = new PgClient(getDatabaseConfig());
  const timeoutMs = input.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;

  try {
    await client.connect();

    while (Date.now() < deadline) {
      const result = await client.query<EventRegistrationRecord>(
        `SELECT er.id AS registration_id,
                er.contact_id,
                er.event_id,
                er.notes
           FROM event_registrations er
           JOIN contacts ON contacts.id = er.contact_id
          WHERE LOWER(contacts.email) = LOWER($1)
            AND er.event_id = $2
          ORDER BY er.created_at DESC
          LIMIT 1`,
        [input.email, input.eventId]
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
    `Timed out waiting for event registration record for ${input.email} (${input.eventId})`
  );
}

async function waitForEventRegistrationTelemetry(input: {
  siteId: string;
  eventId: string;
  registrationId: string;
  timeoutMs?: number;
}): Promise<void> {
  const client = new PgClient(getDatabaseConfig());
  const timeoutMs = input.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;
  let lastCounts = {
    analytics: 0,
    conversionSubmit: 0,
    conversionConfirm: 0,
  };

  try {
    await client.connect();

    while (Date.now() < deadline) {
      const result = await client.query<{
        analytics_count: string;
        conversion_submit_count: string;
        conversion_confirm_count: string;
      }>(
        `SELECT
           (
             SELECT COUNT(*)::text
                FROM site_analytics
              WHERE site_id = $1
                AND event_type = 'event_register'
                AND event_data->>'eventId' = $2
                AND event_data->>'registrationId' = $3
                AND visitor_id IS NOT NULL
                AND session_id IS NOT NULL
           ) AS analytics_count,
           (
             SELECT COUNT(*)::text
               FROM conversion_events
              WHERE site_id = $1
                AND conversion_type = 'event_register'
                AND conversion_step = 'submit'
                AND source_entity_type = 'event'
                AND source_entity_id = $2::uuid
                AND event_data->>'registrationId' = $3
                AND visitor_id IS NOT NULL
                AND session_id IS NOT NULL
           ) AS conversion_submit_count,
           (
             SELECT COUNT(*)::text
               FROM conversion_events
              WHERE site_id = $1
                AND conversion_type = 'event_register'
                AND conversion_step = 'confirm'
                AND source_entity_type = 'event'
                AND source_entity_id = $2::uuid
                AND event_data->>'registrationId' = $3
                AND visitor_id IS NOT NULL
                AND session_id IS NOT NULL
           ) AS conversion_confirm_count`,
        [input.siteId, input.eventId, input.registrationId]
      );
      const row = result.rows[0];
      lastCounts = {
        analytics: Number(row?.analytics_count ?? 0),
        conversionSubmit: Number(row?.conversion_submit_count ?? 0),
        conversionConfirm: Number(row?.conversion_confirm_count ?? 0),
      };

      if (
        lastCounts.analytics > 0 &&
        lastCounts.conversionSubmit > 0 &&
        lastCounts.conversionConfirm > 0
      ) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    await client.end().catch(() => undefined);
  }

  throw new Error(
    `Timed out waiting for event registration telemetry for ${input.registrationId}: ${JSON.stringify(
      lastCounts
    )}`
  );
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
            allowCustomAmount: true,
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

async function configurePublicActionHomepage(input: {
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
        id: 'section-public-actions',
        name: 'Public actions',
        components: [
          {
            id: 'public-action-heading',
            type: 'heading',
            content: 'Public action proof',
            level: 1,
            align: 'center',
          },
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

async function transitionPublicActionSubmission(input: {
  page: import('@playwright/test').Page;
  authToken: string;
  siteId: string;
  actionId: string;
  submissionId: string;
  transition: 'accept' | 'fulfill';
}): Promise<PublicActionTransitionResult> {
  const headers = await getAuthHeaders(input.page, input.authToken);
  const response = await input.page.request.post(
    `${API_URL}/api/v2/sites/${input.siteId}/actions/${input.actionId}/submissions/${input.submissionId}/${input.transition}`,
    {
      headers,
      data: {},
    }
  );

  expect(
    response.ok(),
    `Failed to ${input.transition} public action submission (${response.status()}): ${await response.text()}`
  ).toBeTruthy();
  return unwrapBody<PublicActionTransitionResult>(await response.json());
}

async function readSuccessBody<T>(
  response: import('@playwright/test').Response,
  label: string
): Promise<T> {
  const raw = await response.text();
  expect(
    response.ok(),
    `${label} failed (${response.status()}): ${raw}`
  ).toBeTruthy();
  return unwrapBody<T>(JSON.parse(raw));
}

async function submitNamedPublicForm(input: {
  page: import('@playwright/test').Page;
  buttonName: RegExp;
  expectedUrlPart: string;
  fill: (form: import('@playwright/test').Locator) => Promise<void>;
}): Promise<import('@playwright/test').Response> {
  const form = input.page
    .locator('form[data-public-site-form="true"]')
    .filter({ has: input.page.getByRole('button', { name: input.buttonName }) });
  await expect(form).toHaveCount(1);
  await input.fill(form);

  const responsePromise = input.page.waitForResponse((response) => {
    return (
      response.request().method() === 'POST' &&
      response.url().includes(input.expectedUrlPart)
    );
  });
  await form.getByRole('button', { name: input.buttonName }).click();
  return responsePromise;
}

async function deletePublicSubmissionArtifacts(input: {
  caseIds?: string[];
  donationIds?: string[];
  eventIds?: string[];
  contactIds?: string[];
}): Promise<void> {
  const caseIds = input.caseIds || [];
  const donationIds = input.donationIds || [];
  const eventIds = input.eventIds || [];
  const contactIds = input.contactIds || [];

  if (
    caseIds.length === 0 &&
    donationIds.length === 0 &&
    eventIds.length === 0 &&
    contactIds.length === 0
  ) {
    return;
  }

  const client = new PgClient(getDatabaseConfig());
  try {
    await client.connect();
    if (eventIds.length > 0) {
      await client.query('DELETE FROM events WHERE id = ANY($1::uuid[])', [eventIds]);
    }
    if (donationIds.length > 0) {
      await client.query('DELETE FROM donations WHERE id = ANY($1::uuid[])', [donationIds]);
    }
    if (caseIds.length > 0 || contactIds.length > 0) {
      await client.query(
        `
          DELETE FROM cases
          WHERE id = ANY($1::uuid[])
             OR contact_id = ANY($2::uuid[])
        `,
        [caseIds, contactIds],
      );
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
    const createdEventIds: string[] = [];
    const createdContactIds: string[] = [];
    let newsletterEntryId = '';
    const siteId = await createWebsiteSite(authenticatedPage, authToken, templateId, {
      name: siteName,
      customDomain: uniqueDomain,
    });
    const newsletterTitle = `Community Update ${Date.now()}`;
    const newsletterExcerpt = 'A community update about programs, events, and support.';
    const publicEventName = `Registration Proof ${Date.now()}`;
    const publicEventSlug = slugifyPublicEventName(publicEventName);

    try {
      newsletterEntryId = await createWebsiteEntry(authenticatedPage, authToken, siteId, {
        title: newsletterTitle,
        excerpt: newsletterExcerpt,
        bodyHtml: `<p>${newsletterExcerpt}</p><p>Registration and referral pathways are open this week.</p>`,
        status: 'published',
        slug: `community-update-${Date.now().toString(36)}`,
      });
      const eventStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const eventEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
      const { id: publicEventId } = await createTestEvent(authenticatedPage, authToken, {
        name: publicEventName,
        eventType: 'community',
        startDate: eventStart.toISOString(),
        endDate: eventEnd.toISOString(),
        location: 'Community Hall',
        capacity: 25,
        isPublic: true,
      });
      createdEventIds.push(publicEventId);

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

      await authenticatedPage.goto(`${publicBase}/events`, { waitUntil: 'domcontentloaded' });
      await expect(authenticatedPage.getByRole('heading', { name: /upcoming events/i })).toBeVisible();
      const eventLink = authenticatedPage
        .getByRole('main')
        .getByRole('link', { name: publicEventName });
      await expect(eventLink).toHaveAttribute('href', `/events/${publicEventSlug}`);
      await eventLink.click();
      await expect(authenticatedPage).toHaveURL(new RegExp(`/events/${publicEventSlug}$`));
      await expect(authenticatedPage.getByRole('heading', { name: publicEventName })).toBeVisible();

      const eventRegistrationForm = authenticatedPage
        .locator('form[data-public-site-form="true"]')
        .filter({ has: authenticatedPage.getByRole('button', { name: /^register$/i }) });
      await expect(eventRegistrationForm).toHaveCount(1);
      const eventRegistrantEmail = `event-registrant-${Date.now()}@example.com`;
      await eventRegistrationForm.locator('input[name="first_name"]').fill('Ada');
      await eventRegistrationForm.locator('input[name="last_name"]').fill('Lovelace');
      await eventRegistrationForm.locator('input[name="email"]').fill(eventRegistrantEmail);
      await eventRegistrationForm.locator('input[name="phone"]').fill('(604) 555-0100');
      await eventRegistrationForm.locator('textarea[name="notes"]').fill('Please hold one seat.');

      const eventSubmitResponsePromise = authenticatedPage.waitForResponse((response) => {
        return (
          response.request().method() === 'POST' &&
          response.url().includes(`/api/v2/public/events/${publicEventId}/registrations`) &&
          response.url().includes(`site=${siteId}`)
        );
      });
      await eventRegistrationForm.getByRole('button', { name: /^register$/i }).click();

      const eventSubmitResponse = await eventSubmitResponsePromise;
      const eventSubmitBodyText = eventSubmitResponse.ok()
        ? ''
        : await eventSubmitResponse.text().catch(() => '<unreadable response body>');
      expect(
        eventSubmitResponse.ok(),
        `Public event registration failed (${eventSubmitResponse.status()}): ${eventSubmitBodyText}`
      ).toBeTruthy();
      await expect(eventRegistrationForm.locator('[data-form-status]')).toHaveText(
        'Submitted successfully.'
      );

      const eventRegistration = await waitForEventRegistrationRecord({
        email: eventRegistrantEmail,
        eventId: publicEventId,
      });
      createdContactIds.push(eventRegistration.contact_id);
      expect(eventRegistration).toMatchObject({
        event_id: publicEventId,
        notes: 'Please hold one seat.',
      });
      await waitForEventRegistrationTelemetry({
        siteId,
        eventId: publicEventId,
        registrationId: eventRegistration.registration_id,
      });

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

      await referralForm.getByRole('button', { name: /submit referral/i }).click();

      await expect(referralForm.locator('[data-form-status]')).toHaveText(
        'Thanks. The referral has been recorded and routed for follow-up.'
      );

      const createdReferral = await waitForReferralSubmissionRecord({
        email: referralEmail,
        title: 'Housing referral',
      });
      createdCaseIds.push(createdReferral.case_id);
      createdContactIds.push(createdReferral.contact_id);

      expect(createdReferral).toMatchObject({
        title: 'Housing referral',
        source: 'referral',
        referral_source: 'Community Partner',
        is_urgent: true,
      });

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
        eventIds: createdEventIds,
        contactIds: createdContactIds,
      });
      if (newsletterEntryId) {
        void deleteWebsiteEntry(authenticatedPage, authToken, siteId, newsletterEntryId).catch(() => undefined);
      }
      void deleteWebsiteSite(authenticatedPage, authToken, siteId).catch(() => undefined);
    }
  });

  test('submits public action blocks and completes review transitions', async ({
    authenticatedPage,
    authToken,
  }) => {
    test.setTimeout(180000);

    const runId = `${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;
    const templateId = await createTemplate(authenticatedPage, authToken);
    const customDomain = `public-actions-${runId}.localhost`;
    const slugs = {
      petition: `petition-${runId}`,
      pledge: `pledge-${runId}`,
      supportLetter: `support-letter-${runId}`,
    };
    const createdContactIds: string[] = [];
    let siteId = '';

    try {
      await configurePublicActionHomepage({
        templateId,
        slugs,
      });

      siteId = await createWebsiteSite(authenticatedPage, authToken, templateId, {
        name: `Public Action Proof ${runId}`,
        customDomain,
      });

      const actionIds = {
        petition: await createPublicAction({
          page: authenticatedPage,
          authToken,
          siteId,
          actionType: 'petition_signature',
          slug: slugs.petition,
          title: 'Protect community hours',
          confirmationMessage: 'Signature received.',
        }),
        pledge: await createPublicAction({
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
        }),
        supportLetter: await createPublicAction({
          page: authenticatedPage,
          authToken,
          siteId,
          actionType: 'support_letter_request',
          slug: slugs.supportLetter,
          title: 'Support letter desk',
          confirmationMessage: 'Letter request received.',
          settings: {
            letterTitle: 'Public support letter',
            templateVersion: 'p5-t142',
          },
        }),
      };

      await publishWebsiteSite(authenticatedPage, authToken, {
        siteId,
        templateId,
      });

      const publicBase = `http://${customDomain}:${getPublicSitePort()}`;
      await authenticatedPage.goto(`${publicBase}/`, { waitUntil: 'domcontentloaded' });
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Public action proof' })
      ).toBeVisible();

      const signerEmail = `p5-t142-signer-${runId}@example.com`;
      const petitionResponse = await submitNamedPublicForm({
        page: authenticatedPage,
        buttonName: /^sign petition$/i,
        expectedUrlPart: `/api/v2/public/actions/${siteId}/${slugs.petition}/submissions`,
        fill: async (form) => {
          await form.locator('input[name="first_name"]').fill('Pat');
          await form.locator('input[name="last_name"]').fill('Petition');
          await form.locator('input[name="email"]').fill(signerEmail);
          await form.locator('input[name="phone"]').fill('(604) 555-7102');
          await form.locator('textarea[name="message"]').fill('Please keep hours open.');
          await form.locator('input[name="consent"]').check();
        },
      });
      const petitionBody = await readSuccessBody<{
        actionType?: string;
        contactId?: string;
        submissionId?: string;
      }>(petitionResponse, 'Petition action block');
      expect(petitionBody.actionType).toBe('petition_signature');
      expect(petitionBody.submissionId).toBeTruthy();
      expect(petitionBody.contactId).toBeFalsy();
      await expect(
        authenticatedPage
          .locator('form[data-public-site-form="true"]')
          .filter({ has: authenticatedPage.getByRole('button', { name: /^sign petition$/i }) })
          .locator('[data-form-status]')
      ).toHaveText('Signature received.');
      const petition = await waitForPublicActionSubmission({
        siteId,
        actionType: 'petition_signature',
        email: signerEmail,
      });
      expect(petition).toMatchObject({
        action_type: 'petition_signature',
        review_status: 'new',
      });
      expect(petition.contact_id).toBeNull();
      const acceptedPetition = await transitionPublicActionSubmission({
        page: authenticatedPage,
        authToken,
        siteId,
        actionId: actionIds.petition,
        submissionId: petition.id,
        transition: 'accept',
      });
      expect(acceptedPetition.submission?.reviewStatus).toBe('accepted');
      expect(acceptedPetition.contactId).toBeTruthy();
      if (acceptedPetition.contactId) {
        createdContactIds.push(acceptedPetition.contactId);
      }

      const pledgeEmail = `p5-t142-pledge-${runId}@example.com`;
      const pledgeResponse = await submitNamedPublicForm({
        page: authenticatedPage,
        buttonName: /^send pledge$/i,
        expectedUrlPart: `/api/v2/public/actions/${siteId}/${slugs.pledge}/submissions`,
        fill: async (form) => {
          await form.locator('input[name="first_name"]').fill('Morgan');
          await form.locator('input[name="last_name"]').fill('Pledge');
          await form.locator('input[name="email"]').fill(pledgeEmail);
          await form.locator('input[name="phone"]').fill('(604) 555-7103');
          await form.locator('input[name="amount"]').fill('75');
          await form.locator('select[name="schedule"]').selectOption('monthly');
          await form.locator('textarea[name="message"]').fill('Monthly public pledge proof.');
          await form.locator('input[name="consent"]').check();
        },
      });
      const pledgeBody = await readSuccessBody<{
        actionType?: string;
        contactId?: string;
        pledgeId?: string;
        reviewStatus?: string;
        submissionId?: string;
      }>(pledgeResponse, 'Pledge action block');
      expect(pledgeBody.actionType).toBe('donation_pledge');
      expect(pledgeBody.reviewStatus).toBe('new');
      expect(pledgeBody.submissionId).toBeTruthy();
      expect(pledgeBody.pledgeId).toBeUndefined();
      expect(pledgeBody.contactId).toBeFalsy();
      await expect(
        authenticatedPage
          .locator('form[data-public-site-form="true"]')
          .filter({ has: authenticatedPage.getByRole('button', { name: /^send pledge$/i }) })
          .locator('[data-form-status]')
      ).toHaveText('Pledge received.');
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
      expect(pledge.pledge_id).toBeNull();
      expect(pledge.contact_id).toBeNull();
      const acceptedPledge = await transitionPublicActionSubmission({
        page: authenticatedPage,
        authToken,
        siteId,
        actionId: actionIds.pledge,
        submissionId: pledge.id,
        transition: 'accept',
      });
      expect(acceptedPledge.submission?.reviewStatus).toBe('accepted');
      expect(acceptedPledge.pledgeId).toBeTruthy();
      expect(acceptedPledge.contactId).toBeTruthy();
      if (acceptedPledge.contactId) {
        createdContactIds.push(acceptedPledge.contactId);
      }

      const letterEmail = `p5-t142-letter-${runId}@example.com`;
      const letterResponse = await submitNamedPublicForm({
        page: authenticatedPage,
        buttonName: /^request letter$/i,
        expectedUrlPart: `/api/v2/public/actions/${siteId}/${slugs.supportLetter}/submissions`,
        fill: async (form) => {
          await form.locator('input[name="first_name"]').fill('Riley');
          await form.locator('input[name="last_name"]').fill('Letter');
          await form.locator('input[name="email"]').fill(letterEmail);
          await form.locator('input[name="phone"]').fill('(604) 555-7104');
          await form.locator('input[name="purpose"]').fill('Housing application');
          await form.locator('textarea[name="message"]').fill('Please include program history.');
          await form.locator('input[name="consent"]').check();
        },
      });
      const letterBody = await readSuccessBody<{
        actionType?: string;
        contactId?: string;
        reviewStatus?: string;
        submissionId?: string;
        supportLetterId?: string;
      }>(letterResponse, 'Support-letter action block');
      expect(letterBody.actionType).toBe('support_letter_request');
      expect(letterBody.reviewStatus).toBe('needs_review');
      expect(letterBody.submissionId).toBeTruthy();
      expect(letterBody.supportLetterId).toBeUndefined();
      expect(letterBody.contactId).toBeFalsy();
      await expect(
        authenticatedPage
          .locator('form[data-public-site-form="true"]')
          .filter({ has: authenticatedPage.getByRole('button', { name: /^request letter$/i }) })
          .locator('[data-form-status]')
      ).toHaveText('Letter request received.');
      const supportLetter = await waitForPublicActionSubmission({
        siteId,
        actionType: 'support_letter_request',
        email: letterEmail,
      });
      expect(supportLetter).toMatchObject({
        action_type: 'support_letter_request',
        review_status: 'needs_review',
      });
      expect(supportLetter.letter_title).toBeNull();
      expect(supportLetter.support_letter_id).toBeNull();
      expect(supportLetter.contact_id).toBeNull();
      const fulfilledSupportLetter = await transitionPublicActionSubmission({
        page: authenticatedPage,
        authToken,
        siteId,
        actionId: actionIds.supportLetter,
        submissionId: supportLetter.id,
        transition: 'fulfill',
      });
      expect(fulfilledSupportLetter.submission?.reviewStatus).toBe('fulfilled');
      expect(fulfilledSupportLetter.supportLetterId).toBeTruthy();
      expect(fulfilledSupportLetter.contactId).toBeTruthy();
      if (fulfilledSupportLetter.contactId) {
        createdContactIds.push(fulfilledSupportLetter.contactId);
      }
    } finally {
      if (siteId) {
        await deleteWebsiteSite(authenticatedPage, authToken, siteId).catch(() => undefined);
      }
      await deletePublicSubmissionArtifacts({
        contactIds: Array.from(new Set(createdContactIds)),
      });
      await deleteTemplate(authenticatedPage, authToken, templateId).catch(() => undefined);
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
      const submitResponse = await submitNamedPublicForm({
        page: authenticatedPage,
        buttonName: /^donate now$/i,
        expectedUrlPart: `/api/v2/public/forms/${siteId}/donation-form-1/submit`,
        fill: async (form) => {
          await form.locator('input[name="first_name"]').fill('Grace');
          await form.locator('input[name="last_name"]').fill('Hopper');
          await form.locator('input[name="email"]').fill(donorEmail);
          await form.locator('input[name="amount"]').fill('50');
        },
      });
      const submitBody = await readSuccessBody<{
        donationId?: string;
        contactId?: string;
        message?: string;
      }>(submitResponse, 'Public donation submit');
      expect(submitBody.message).toBe('Donation started.');
      expect(submitBody.donationId).toBeTruthy();
      expect(submitBody.contactId).toBeTruthy();
      await expect(
        authenticatedPage
          .locator('form[data-public-site-form="true"]')
          .filter({ has: authenticatedPage.getByRole('button', { name: /^donate now$/i }) })
          .locator('[data-form-status]')
      ).toHaveText('Donation started.');

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
