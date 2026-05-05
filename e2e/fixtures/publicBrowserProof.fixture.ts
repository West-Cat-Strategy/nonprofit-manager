import { createRequire } from 'node:module';
import path from 'node:path';
import { test as base, expect } from './auth.fixture';
import { createTestEvent, getAuthHeaders } from '../helpers/database';
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

type PublicBrowserProofSite = {
  publicBase: string;
  siteId: string;
  templateId: string;
  eventId: string;
  eventSlug: string;
  actionSlugs: {
    petition: string;
    pledge: string;
    supportLetter: string;
  };
};

type PublicBrowserProofFixtures = {
  publicBrowserProofSite: PublicBrowserProofSite;
};

const getPublicSitePort = (): string =>
  process.env.E2E_PUBLIC_SITE_PORT?.trim() ||
  process.env.PUBLIC_SITE_PORT?.trim() ||
  '3001';

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

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const unwrapBody = <T>(body: unknown): T =>
  ((body as { data?: T } | undefined)?.data ?? body) as T;

async function configurePublicBrowserProofTemplate(templateId: string): Promise<void> {
  const client = new PgClient(getDatabaseConfig());
  const homepageSections = [
    {
      id: 'proof-intro',
      name: 'Public browser proof',
      components: [
        {
          id: 'proof-heading',
          type: 'heading',
          content: 'Public browser proof',
          level: 1,
          align: 'center',
        },
      ],
    },
    {
      id: 'proof-managed-forms',
      name: 'Managed public forms',
      components: [
        {
          id: 'managed-contact-proof',
          type: 'contact-form',
          description: 'Public managed form proof.',
          submitText: 'Send proof message',
          successMessage: 'Managed form proof recorded.',
        },
        {
          id: 'donation-checkout-proof',
          type: 'donation-form',
          description: 'Public donation checkout proof.',
          submitText: 'Start browser donation',
          successMessage: 'Donation checkout proof recorded.',
          suggestedAmounts: [25, 50, 100],
        },
      ],
    },
    {
      id: 'proof-public-actions',
      name: 'Public action blocks',
      components: [
        {
          id: 'petition-proof',
          type: 'petition-form',
          actionSlug: 'protect-services',
          petitionStatement: 'Protect essential community services.',
          submitText: 'Add my public support',
          includePhone: true,
        },
        {
          id: 'pledge-proof',
          type: 'donation-pledge-form',
          actionSlug: 'pledge-community-support',
          description: 'Promise future support for community programs.',
          submitText: 'Record my pledge',
          pledgeSchedule: 'monthly',
        },
        {
          id: 'support-letter-proof',
          type: 'support-letter-request',
          actionSlug: 'request-community-letter',
          description: 'Request a public support letter.',
          submitText: 'Request support letter',
        },
      ],
    },
  ];

  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(
      `UPDATE template_pages
          SET sections = $1::jsonb,
              seo = $2::jsonb,
              updated_at = NOW()
        WHERE template_id = $3
          AND is_homepage = TRUE`,
      [
        JSON.stringify(homepageSections),
        JSON.stringify({
          title: 'Public browser proof',
          description: 'Focused browser proof for managed public website forms.',
        }),
        templateId,
      ]
    );

    await client.query(
      `INSERT INTO template_pages (
         template_id, name, slug, is_homepage, page_type, collection, route_pattern, seo, sections, sort_order
       )
       VALUES
         ($1, 'Events', 'events', false, 'collectionIndex', 'events', '/events', $2::jsonb, '[]'::jsonb, 1),
         ($1, 'Event Detail', 'events-detail', false, 'collectionDetail', 'events', '/events/:slug', $3::jsonb, '[]'::jsonb, 2)
       ON CONFLICT (template_id, slug)
       DO UPDATE SET
         page_type = EXCLUDED.page_type,
         collection = EXCLUDED.collection,
         route_pattern = EXCLUDED.route_pattern,
         seo = EXCLUDED.seo,
         sections = EXCLUDED.sections,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()`,
      [
        templateId,
        JSON.stringify({ title: 'Events', description: 'Public event browser proof.' }),
        JSON.stringify({ title: 'Event detail', description: 'Public event registration browser proof.' }),
      ]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function createPublishedPublicAction(
  page: import('@playwright/test').Page,
  authToken: string,
  siteId: string,
  payload: {
    actionType: 'petition_signature' | 'donation_pledge' | 'support_letter_request';
    slug: string;
    title: string;
    description: string;
  }
): Promise<string> {
  const headers = await getAuthHeaders(page, authToken);
  const response = await page.request.post(`${API_URL}/api/v2/sites/${siteId}/actions`, {
    headers,
    data: {
      actionType: payload.actionType,
      status: 'published',
      slug: payload.slug,
      title: payload.title,
      description: payload.description,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create public action (${response.status()}): ${await response.text()}`);
  }

  const body = unwrapBody<{ id?: string }>(await response.json());
  if (!body.id) {
    throw new Error(`Public action created without an id: ${JSON.stringify(body)}`);
  }
  return body.id;
}

async function deletePublicBrowserProofArtifacts(input: {
  contactIds: string[];
  donationIds: string[];
  eventIds: string[];
}): Promise<void> {
  const client = new PgClient(getDatabaseConfig());
  try {
    await client.connect();
    if (input.eventIds.length > 0) {
      await client.query('DELETE FROM events WHERE id = ANY($1::uuid[])', [input.eventIds]);
    }
    if (input.donationIds.length > 0) {
      await client.query('DELETE FROM donations WHERE id = ANY($1::uuid[])', [input.donationIds]);
    }
    if (input.contactIds.length > 0) {
      await client.query('DELETE FROM contacts WHERE id = ANY($1::uuid[])', [input.contactIds]);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

export const publicBrowserProofArtifacts = {
  contactIds: [] as string[],
  donationIds: [] as string[],
  eventIds: [] as string[],
};

export const test = base.extend<PublicBrowserProofFixtures>({
  publicBrowserProofSite: async ({ authenticatedPage, authToken }, use) => {
    const suffix = `${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;
    const templateId = await createTemplate(authenticatedPage, authToken);
    await configurePublicBrowserProofTemplate(templateId);

    const siteId = await createWebsiteSite(authenticatedPage, authToken, templateId, {
      name: `Public Browser Proof ${suffix}`,
      customDomain: `public-proof-${suffix}.localhost`,
    });

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

    const eventName = `Public Browser Event ${suffix}`;
    const eventStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const eventEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
    const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
      name: eventName,
      eventType: 'community',
      startDate: eventStart.toISOString(),
      endDate: eventEnd.toISOString(),
      location: 'Community Hall',
      capacity: 20,
      isPublic: true,
    });
    publicBrowserProofArtifacts.eventIds.push(eventId);

    await createPublishedPublicAction(authenticatedPage, authToken, siteId, {
      actionType: 'petition_signature',
      slug: 'protect-services',
      title: 'Protect services',
      description: 'Protect essential community services.',
    });
    await createPublishedPublicAction(authenticatedPage, authToken, siteId, {
      actionType: 'donation_pledge',
      slug: 'pledge-community-support',
      title: 'Pledge community support',
      description: 'Promise future support.',
    });
    await createPublishedPublicAction(authenticatedPage, authToken, siteId, {
      actionType: 'support_letter_request',
      slug: 'request-community-letter',
      title: 'Request community letter',
      description: 'Request a support letter.',
    });

    await publishWebsiteSite(authenticatedPage, authToken, {
      siteId,
      templateId,
    });

    try {
      await use({
        publicBase: `http://public-proof-${suffix}.localhost:${getPublicSitePort()}`,
        siteId,
        templateId,
        eventId,
        eventSlug: slugify(eventName),
        actionSlugs: {
          petition: 'protect-services',
          pledge: 'pledge-community-support',
          supportLetter: 'request-community-letter',
        },
      });
    } finally {
      await deleteWebsiteSite(authenticatedPage, authToken, siteId).catch(() => undefined);
      await deleteTemplate(authenticatedPage, authToken, templateId).catch(() => undefined);
      await deletePublicBrowserProofArtifacts(publicBrowserProofArtifacts).catch(() => undefined);
      publicBrowserProofArtifacts.contactIds.length = 0;
      publicBrowserProofArtifacts.donationIds.length = 0;
      publicBrowserProofArtifacts.eventIds.length = 0;
    }
  },
});

export { expect };
