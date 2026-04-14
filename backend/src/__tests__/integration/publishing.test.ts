import request, { type Test } from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';

type ApiEnvelope<T> = { data?: T } | T;

const unwrap = <T>(body: ApiEnvelope<T>): T =>
  (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const withSiteConsoleAuth = (req: Test, authToken: string, organizationId: string): Test =>
  req
    .set('Authorization', `Bearer ${authToken}`)
    .set('X-Organization-Id', organizationId);

const buildTemplateTheme = () => ({
  colors: {
    primary: '#1f4d3b',
    secondary: '#264f46',
    accent: '#c7683c',
    background: '#f6f5ef',
    surface: '#ffffff',
    text: '#163126',
    textMuted: '#60716a',
    border: '#d8e1dc',
    error: '#b42318',
    success: '#027a48',
    warning: '#b54708',
  },
  typography: {
    fontFamily: 'system-ui',
    headingFontFamily: 'system-ui',
    baseFontSize: '16px',
    lineHeight: '1.6',
    headingLineHeight: '1.2',
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '18px',
    full: '999px',
  },
  shadows: {
    sm: 'none',
    md: 'none',
    lg: 'none',
  },
});

const buildTemplatePageSections = (formSuccessMessage: string) => [
  {
    id: 'section-hero',
    name: 'Hero',
    components: [
      {
        id: 'contact-form-1',
        type: 'contact-form',
        heading: 'Stay connected',
        successMessage: formSuccessMessage,
        includePhone: true,
        includeMessage: true,
      },
      {
        id: 'newsletter-1',
        type: 'newsletter-signup',
        heading: 'Newsletter',
        successMessage: 'Subscribed.',
        mailchimpListId: 'default-list',
      },
      {
        id: 'donation-form-1',
        type: 'donation-form',
        heading: 'Support the work',
        successMessage: 'Donation started.',
        suggestedAmounts: [25, 50, 100],
      },
    ],
  },
];

const buildPublishedContent = (templateId: string, templateName: string, formSuccessMessage: string) => ({
  templateId,
  templateName,
  theme: buildTemplateTheme(),
  pages: [
    {
      id: 'page-home',
      slug: 'home',
      name: 'Home',
      isHomepage: true,
      pageType: 'static',
      routePattern: '/',
      sections: buildTemplatePageSections(formSuccessMessage),
      seo: {
        title: 'Home',
        description: 'Homepage',
      },
    },
  ],
  navigation: {
    items: [{ id: 'nav-home', label: 'Home', url: '/' }],
    style: 'horizontal',
    sticky: false,
    transparent: false,
  },
  footer: {
    columns: [],
    copyright: 'Copyright',
  },
  seoDefaults: {
    title: templateName,
    description: 'Website console test',
  },
  publishedAt: '2026-03-06T00:00:00.000Z',
  version: 'v1',
});

describe('Publishing API Integration', () => {
  let authToken: string;
  let adminUserId: string;
  let accountId: string;
  let templateId: string;
  let activeSiteId: string;
  let blockedSiteId: string;
  let analyticsSiteId: string;
  const createdContactIds: string[] = [];
  const createdDonationIds: string[] = [];

  beforeAll(async () => {
    const suffix = unique();
    const userResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, 'Publishing', 'Tester', 'admin', NOW(), NOW())
       RETURNING id`,
      [
        `publishing-admin-${suffix}@example.com`,
        '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG',
      ]
    );
    adminUserId = userResult.rows[0].id;
    authToken = jwt.sign(
      { id: adminUserId, email: `publishing-admin-${suffix}@example.com`, role: 'admin' },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    const accountResult = await pool.query<{ id: string }>(
      `INSERT INTO accounts (
         account_name,
         account_type,
         email,
         is_active,
         created_at,
         updated_at,
         created_by,
         modified_by
       ) VALUES ($1, 'organization', $2, TRUE, NOW(), NOW(), $3, $3)
       RETURNING id`,
      [`Publishing Org ${suffix}`, `publishing-org-${suffix}@example.com`, adminUserId]
    );
    accountId = accountResult.rows[0].id;

    await pool.query(
      `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
       VALUES ($1, $2, 'admin', $1, TRUE)
       ON CONFLICT (user_id, account_id)
       DO UPDATE SET access_level = 'admin', is_active = TRUE`,
      [adminUserId, accountId]
    );

    const templateResult = await pool.query<{ id: string }>(
      `INSERT INTO templates (
         user_id,
         owner_user_id,
         organization_id,
         migration_status,
         name,
         description,
         category,
         status,
         theme,
         global_settings,
         created_at,
         updated_at
       ) VALUES ($1, $1, $2, 'complete', $3, 'Publishing integration test template', 'multi-page', 'draft', $4, $5, NOW(), NOW())
       RETURNING id`,
      [
        adminUserId,
        accountId,
        `Publishing Template ${suffix}`,
        JSON.stringify(buildTemplateTheme()),
        JSON.stringify({}),
      ]
    );
    templateId = templateResult.rows[0].id;

    await pool.query(
      `INSERT INTO template_pages (
         template_id,
         name,
         slug,
         is_homepage,
         page_type,
         route_pattern,
         seo,
         sections,
         sort_order,
         created_at,
         updated_at
       ) VALUES ($1, 'Home', 'home', TRUE, 'static', '/', $2, $3, 0, NOW(), NOW())`,
      [
        templateId,
        JSON.stringify({ title: 'Home', description: 'Homepage' }),
        JSON.stringify(buildTemplatePageSections('Original live message')),
      ]
    );

    const activeSiteResult = await pool.query<{ id: string }>(
      `INSERT INTO published_sites (
         user_id,
         owner_user_id,
         organization_id,
         site_kind,
         migration_status,
         template_id,
         name,
         subdomain,
         status,
         published_version,
         published_at,
         published_content,
         analytics_enabled,
         created_at,
         updated_at
       ) VALUES ($1, $1, $2, 'organization', 'complete', $3, $4, $5, 'published', 'v1', NOW(), $6, TRUE, NOW(), NOW())
       RETURNING id`,
      [
        adminUserId,
        accountId,
        templateId,
        `Active Site ${suffix}`,
        `publishing-active-${suffix}`.slice(0, 63),
        JSON.stringify(buildPublishedContent(templateId, `Publishing Template ${suffix}`, 'Original live message')),
      ]
    );
    activeSiteId = activeSiteResult.rows[0].id;

    const blockedSiteResult = await pool.query<{ id: string }>(
      `INSERT INTO published_sites (
         user_id,
         owner_user_id,
         organization_id,
         site_kind,
         migration_status,
         template_id,
         name,
         subdomain,
         status,
         published_content,
         analytics_enabled,
         created_at,
         updated_at
       ) VALUES ($1, $1, NULL, 'organization', 'needs_assignment', $2, $3, $4, 'draft', $5, TRUE, NOW(), NOW())
       RETURNING id`,
      [
        adminUserId,
        templateId,
        `Blocked Site ${suffix}`,
        `publishing-blocked-${suffix}`.slice(0, 63),
        JSON.stringify(buildPublishedContent(templateId, `Publishing Template ${suffix}`, 'Blocked site message')),
      ]
    );
    blockedSiteId = blockedSiteResult.rows[0].id;

    const analyticsSiteResult = await pool.query<{ id: string }>(
      `INSERT INTO published_sites (
         user_id,
         owner_user_id,
         organization_id,
         site_kind,
         migration_status,
         template_id,
         name,
         subdomain,
         status,
         published_version,
         published_at,
         published_content,
         analytics_enabled,
         created_at,
         updated_at
       ) VALUES ($1, $1, $2, 'organization', 'complete', $3, $4, $5, 'published', 'v2', NOW(), $6, TRUE, NOW(), NOW())
       RETURNING id`,
      [
        adminUserId,
        accountId,
        templateId,
        `Analytics Site ${suffix}`,
        `publishing-analytics-${suffix}`.slice(0, 63),
        JSON.stringify(buildPublishedContent(templateId, `Publishing Template ${suffix}`, 'Analytics message')),
      ]
    );
    analyticsSiteId = analyticsSiteResult.rows[0].id;

    await pool.query(
      `INSERT INTO site_analytics (site_id, page_path, visitor_id, event_type, event_data, created_at)
       VALUES
         ($1, '/', 'visitor-1', 'pageview', '{}'::jsonb, NOW()),
         ($1, '/', 'visitor-2', 'pageview', '{}'::jsonb, NOW()),
         ($1, '/contact', 'visitor-1', 'form_submit', '{"formKey":"contact-form-1"}'::jsonb, NOW()),
         ($1, '/events/spring-gala', 'visitor-3', 'event_register', '{"eventId":"event-1"}'::jsonb, NOW()),
         ($1, '/donate', 'visitor-4', 'donation', '{"amount":50}'::jsonb, NOW())`,
      [analyticsSiteId]
    );
  });

  afterAll(async () => {
    if (createdDonationIds.length > 0) {
      await pool.query('DELETE FROM donations WHERE id = ANY($1::uuid[])', [createdDonationIds]);
    }

    if (createdContactIds.length > 0) {
      await pool.query('DELETE FROM contacts WHERE id = ANY($1::uuid[])', [createdContactIds]);
    }

    if (analyticsSiteId || activeSiteId || blockedSiteId) {
      await pool.query(
        'DELETE FROM site_analytics WHERE site_id = ANY($1::uuid[])',
        [[activeSiteId, blockedSiteId, analyticsSiteId].filter(Boolean)]
      );
      await pool.query(
        'DELETE FROM website_site_settings WHERE site_id = ANY($1::uuid[])',
        [[activeSiteId, blockedSiteId, analyticsSiteId].filter(Boolean)]
      );
      await pool.query(
        'DELETE FROM published_sites WHERE id = ANY($1::uuid[])',
        [[activeSiteId, blockedSiteId, analyticsSiteId].filter(Boolean)]
      );
    }

    if (templateId) {
      await pool.query('DELETE FROM template_pages WHERE template_id = $1', [templateId]);
      await pool.query('DELETE FROM templates WHERE id = $1', [templateId]);
    }

    if (adminUserId && accountId) {
      await pool.query('DELETE FROM user_account_access WHERE user_id = $1 AND account_id = $2', [
        adminUserId,
        accountId,
      ]);
    }

    if (accountId) {
      await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
    }

    if (adminUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    }
  });

  it('requires authentication for site search', async () => {
    await request(app).get('/api/v2/sites').expect(401);
  });

  it('requires authentication for site creation', async () => {
    await request(app)
      .post('/api/v2/sites')
      .send({ templateId: 'bad-uuid', name: '' })
      .expect(401);
  });

  it('lists sites for the console and includes blocked state', async () => {
    const response = await withSiteConsoleAuth(request(app).get('/api/v2/sites'), authToken, accountId)
      .expect(200);

    const payload = unwrap<{
      sites: Array<{ id: string; blocked: boolean; migrationStatus: string }>;
      total: number;
    }>(response.body);

    expect(payload.total).toBeGreaterThanOrEqual(3);
    expect(payload.sites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: activeSiteId, blocked: false, migrationStatus: 'complete' }),
        expect.objectContaining({
          id: blockedSiteId,
          blocked: true,
          migrationStatus: 'needs_assignment',
        }),
      ])
    );
  });

  it('returns site overview with live routes and discovered forms', async () => {
    const response = await withSiteConsoleAuth(
      request(app).get(`/api/v2/sites/${activeSiteId}/overview?period=30`),
      authToken,
      accountId
    ).expect(200);

    const payload = unwrap<{
      site: { id: string; blocked: boolean };
      liveRoutes: Array<{ path: string }>;
      forms: Array<{ formKey: string; formType: string }>;
    }>(response.body);

    expect(payload.site).toMatchObject({ id: activeSiteId, blocked: false });
    expect(payload.liveRoutes).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/' })]));
    expect(payload.forms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ formKey: 'contact-form-1', formType: 'contact-form' }),
        expect.objectContaining({ formKey: 'newsletter-1', formType: 'newsletter-signup' }),
      ])
    );
  });

  it('rejects unknown form keys without persisting orphan overrides', async () => {
    const missingKey = `missing-form-${unique()}`;
    const beforeResult = await pool.query<{ form_overrides: Record<string, unknown> | null }>(
      'SELECT form_overrides FROM website_site_settings WHERE site_id = $1',
      [activeSiteId]
    );
    const beforeOverrides = (beforeResult.rows[0]?.form_overrides || {}) as Record<string, unknown>;

    await withSiteConsoleAuth(
      request(app).put(`/api/v2/sites/${activeSiteId}/forms/${missingKey}`),
      authToken,
      accountId
    )
      .send({
        successMessage: 'Should never persist',
        defaultTags: ['orphaned'],
      })
      .expect(404);

    const afterResult = await pool.query<{ form_overrides: Record<string, unknown> | null }>(
      'SELECT form_overrides FROM website_site_settings WHERE site_id = $1',
      [activeSiteId]
    );
    const afterOverrides = (afterResult.rows[0]?.form_overrides || {}) as Record<string, unknown>;

    expect(afterOverrides).toEqual(beforeOverrides);
    expect(afterOverrides[missingKey]).toBeUndefined();
  });

  it('reads and updates form settings, and the public form uses the override without republish', async () => {
    const formsResponse = await withSiteConsoleAuth(
      request(app).get(`/api/v2/sites/${activeSiteId}/forms`),
      authToken,
      accountId
    ).expect(200);

    const forms = unwrap<
      Array<{ formKey: string; operationalSettings: { successMessage?: string | undefined } }>
    >(formsResponse.body);
    expect(forms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          formKey: 'contact-form-1',
          operationalSettings: expect.objectContaining({
            successMessage: 'Original live message',
          }),
        }),
      ])
    );

    const updateResponse = await withSiteConsoleAuth(
      request(app).put(`/api/v2/sites/${activeSiteId}/forms/contact-form-1`),
      authToken,
      accountId
    )
      .send({
        successMessage: 'Updated by site console',
        defaultTags: ['console-updated'],
      })
      .expect(200);

    const updated = unwrap<{
      formKey: string;
      operationalSettings: { successMessage?: string; defaultTags?: string[] };
    }>(updateResponse.body);
    expect(updated).toMatchObject({
      formKey: 'contact-form-1',
      operationalSettings: {
        successMessage: 'Updated by site console',
        defaultTags: ['console-updated'],
      },
    });

    const publicSubmitResponse = await request(app)
      .post(`/api/v2/public/forms/${activeSiteId}/contact-form-1/submit`)
      .send({
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: `publishing-form-${unique()}@example.com`,
        message: 'Please keep me posted.',
      })
      .expect(201);

    const publicResult = unwrap<{ message: string; contactId?: string }>(publicSubmitResponse.body);
    expect(publicResult.message).toBe('Updated by site console');
    expect(publicResult.contactId).toBeTruthy();
    if (publicResult.contactId) {
      createdContactIds.push(publicResult.contactId);
    }
  });

  it('submits public donation forms with the configured payment provider', async () => {
    await withSiteConsoleAuth(
      request(app).put(`/api/v2/sites/${activeSiteId}/integrations/stripe`),
      authToken,
      accountId
    )
      .send({
        provider: 'paypal',
        accountId,
        currency: 'cad',
        suggestedAmounts: [25, 50, 100],
        recurringDefault: false,
      })
      .expect(200);

    const publicSubmitResponse = await request(app)
      .post(`/api/v2/public/forms/${activeSiteId}/donation-form-1/submit`)
      .send({
        first_name: 'Grace',
        last_name: 'Hopper',
        email: `publishing-donation-${unique()}@example.com`,
        amount: 50,
      })
      .expect(201);

    const publicResult = unwrap<{ donationId?: string; contactId?: string; message: string }>(
      publicSubmitResponse.body
    );
    expect(publicResult.message).toBe('Donation started.');
    expect(publicResult.donationId).toBeTruthy();
    expect(publicResult.contactId).toBeTruthy();

    if (publicResult.contactId) {
      createdContactIds.push(publicResult.contactId);
    }

    if (publicResult.donationId) {
      createdDonationIds.push(publicResult.donationId);
      const donationResult = await pool.query<{
        payment_provider: string | null;
        is_recurring: boolean;
      }>('SELECT payment_provider, is_recurring FROM donations WHERE id = $1', [publicResult.donationId]);

      expect(donationResult.rows[0]).toMatchObject({
        payment_provider: 'paypal',
        is_recurring: false,
      });
    }
  });

  it('reads and updates integration settings through the site console APIs', async () => {
    const initialResponse = await withSiteConsoleAuth(
      request(app).get(`/api/v2/sites/${activeSiteId}/integrations`),
      authToken,
      accountId
    ).expect(200);

    const initial = unwrap<{
      blocked: boolean;
      newsletter: { provider: string; configured: boolean; lastSyncAt: string | null };
      mailchimp: { configured: boolean };
      mautic: { configured: boolean };
      stripe: { configured: boolean };
    }>(initialResponse.body);
    expect(initial.blocked).toBe(false);
    expect(typeof initial.newsletter.provider).toBe('string');
    expect(typeof initial.mailchimp.configured).toBe('boolean');
    expect(typeof initial.mautic.configured).toBe('boolean');
    expect(typeof initial.stripe.configured).toBe('boolean');

    const newsletterResponse = await withSiteConsoleAuth(
      request(app).put(`/api/v2/sites/${activeSiteId}/integrations/newsletter`),
      authToken,
      accountId
    )
      .send({
        provider: 'mautic',
        mautic: {
          baseUrl: 'https://mautic.example.org',
          segmentId: 'seg-123',
          username: 'api-user',
          password: 'secret',
          defaultTags: ['members', 'website'],
          syncEnabled: true,
        },
      })
      .expect(200);

    const newsletter = unwrap<{
      newsletter: {
        provider?: string;
        configured?: boolean;
        lastSyncAt?: string | null;
      };
      mautic: {
        baseUrl?: string | null;
        segmentId?: string | null;
        username?: string | null;
        defaultTags?: string[];
        syncEnabled?: boolean;
        configured?: boolean;
      };
    }>(newsletterResponse.body);
    expect(newsletter.newsletter.provider).toBe('mautic');
    expect(newsletter.mautic.baseUrl).toBe('https://mautic.example.org');
    expect(newsletter.mautic.segmentId).toBe('seg-123');
    expect(newsletter.mautic.defaultTags).toEqual(['members', 'website']);
    expect(newsletter.mautic.syncEnabled).toBe(true);

    const mailchimpResponse = await withSiteConsoleAuth(
      request(app).put(`/api/v2/sites/${activeSiteId}/integrations/mailchimp`),
      authToken,
      accountId
    )
      .send({
        audienceId: 'audience-123',
        audienceMode: 'both',
        defaultTags: ['members', 'website'],
        syncEnabled: true,
      })
      .expect(200);

    const mailchimp = unwrap<{
      mailchimp: {
        audienceId?: string | null;
        audienceMode?: string;
        defaultTags?: string[];
        syncEnabled?: boolean;
      };
    }>(mailchimpResponse.body);
    expect(mailchimp.mailchimp).toMatchObject({
      audienceId: 'audience-123',
      audienceMode: 'both',
      defaultTags: ['members', 'website'],
      syncEnabled: true,
    });

    const stripeResponse = await withSiteConsoleAuth(
      request(app).put(`/api/v2/sites/${activeSiteId}/integrations/stripe`),
      authToken,
      accountId
    )
      .send({
        accountId,
        currency: 'cad',
        suggestedAmounts: [20, 40, 80],
        recurringDefault: true,
        campaignId: 'spring-drive',
      })
      .expect(200);

    const stripe = unwrap<{
      stripe: {
        accountId?: string | null;
        currency?: string;
        suggestedAmounts?: number[];
        recurringDefault?: boolean;
        campaignId?: string | null;
      };
    }>(stripeResponse.body);
    expect(stripe.stripe).toMatchObject({
      accountId,
      currency: 'cad',
      suggestedAmounts: [20, 40, 80],
      recurringDefault: true,
      campaignId: 'spring-drive',
    });
  });

  it('returns conversion analytics summary for a site', async () => {
    const response = await withSiteConsoleAuth(
      request(app).get(`/api/v2/sites/${analyticsSiteId}/analytics/summary?period=30`),
      authToken,
      accountId
    ).expect(200);

    const payload = unwrap<{
      totalPageviews: number;
      uniqueVisitors: number;
      formSubmissions: number;
      eventRegistrations: number;
      donations: number;
      totalConversions: number;
      recentConversions: Array<{ eventType: string }>;
    }>(response.body);

    expect(payload).toMatchObject({
      totalPageviews: 2,
      uniqueVisitors: 4,
      formSubmissions: 1,
      eventRegistrations: 1,
      donations: 1,
      totalConversions: 3,
    });
    expect(payload.recentConversions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'form_submit' }),
        expect.objectContaining({ eventType: 'event_register' }),
        expect.objectContaining({ eventType: 'donation' }),
      ])
    );
  });

  it('keeps blocked sites readable but rejects form, integration, domain, and publish mutations', async () => {
    const blockedFormsResponse = await withSiteConsoleAuth(
      request(app).get(`/api/v2/sites/${blockedSiteId}/forms`),
      authToken,
      accountId
    ).expect(200);

    const blockedForms = unwrap<Array<{ formKey: string; blocked: boolean }>>(blockedFormsResponse.body);
    expect(blockedForms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ formKey: 'contact-form-1', blocked: true }),
      ])
    );

    await withSiteConsoleAuth(
      request(app).put(`/api/v2/sites/${blockedSiteId}/forms/contact-form-1`),
      authToken,
      accountId
    )
      .send({ successMessage: 'Blocked write' })
      .expect(400);

    await withSiteConsoleAuth(
      request(app).put(`/api/v2/sites/${blockedSiteId}/integrations/mailchimp`),
      authToken,
      accountId
    )
      .send({ audienceId: 'blocked-list', audienceMode: 'crm' })
      .expect(400);

    await withSiteConsoleAuth(
      request(app).put(`/api/v2/sites/${blockedSiteId}/integrations/stripe`),
      authToken,
      accountId
    )
      .send({ accountId, currency: 'usd' })
      .expect(400);

    await withSiteConsoleAuth(request(app).put(`/api/v2/sites/${blockedSiteId}`), authToken, accountId)
      .send({ subdomain: `blocked-updated-${unique()}`.slice(0, 40) })
      .expect(400);

    await withSiteConsoleAuth(request(app).post('/api/v2/sites/publish'), authToken, accountId)
      .send({ templateId, siteId: blockedSiteId })
      .expect(400);

    await withSiteConsoleAuth(
      request(app).post(`/api/v2/sites/${blockedSiteId}/unpublish`),
      authToken,
      accountId
    ).expect(400);
  });
});
